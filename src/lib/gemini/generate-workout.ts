import "server-only";
import { Type } from "@google/genai";
import { z } from "zod";
import { createGeminiClient, GEMINI_MODEL } from "@/lib/gemini/client";

const strengthItemSchema = z.object({
  name: z.string().max(120),
  sets: z.number().int().min(1).max(6),
  reps: z.number().int().min(1).max(30),
  frequency: z.string().max(60),
  rationale: z.string().max(200),
});

const cardioItemSchema = z.object({
  name: z.string().max(120),
  dosageLabel: z.string().max(80),
  rationale: z.string().max(200),
});

const generatedWorkoutSchema = z.object({
  protocolSuggestionSummary: z.string().max(500),
  strength: z.array(strengthItemSchema).max(8),
  cardio: z.array(cardioItemSchema).max(4),
});

export type GeneratedWorkout = z.infer<typeof generatedWorkoutSchema>;

export type WorkoutFeedbackItem = {
  exerciseName: string;
  workoutType: "strength" | "cardio";
  liked: boolean | null;
  causedPain: boolean | null;
};

export type GenerateWorkoutInput = {
  phaseLabel: string;
  weightBearing: unknown;
  assistiveDevices: unknown;
  restrictionNotes: unknown; // e.g. gaitTraining / criteriaToProgress text that may carry mobility restrictions
  protocolRestOfBodyInterventions: unknown; // Record<category, string[]> for the current phase — the grounding reference
  profile: {
    fitnessLevel: string | null;
    exerciseFrequency: string | null;
    recoveryGoal: string | null;
    availableEquipment: string[];
  };
  yesterdayFeedback: WorkoutFeedbackItem[];
};

function stringify(value: unknown): string {
  if (value == null) return "Not specified.";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

// Everything this prompt is allowed to touch: selecting non-Achilles,
// non-ankle whole-body strength/cardio exercises that stay within the
// phase's own stated restrictions. It never sees red-flag signs, criteria
// to discharge, or anything else that could tempt it into clinical
// territory beyond "pick appropriate whole-body accessory work."
const SYSTEM_INSTRUCTION = `You are building a whole-body ("rest of the body" — NOT ankle/Achilles/calf) accessory workout for a patient recovering from an Achilles tendon injury, for one specific day.

Hard safety rules — never violate these:
- NEVER include any exercise that loads, stretches, or otherwise directly involves the ankle, Achilles tendon, or calf. That is handled entirely separately by the patient's clinical protocol. If you are unsure whether an exercise involves the ankle (e.g. most standing balance work, calf raises, lunges with a deep ankle bend, single-leg hops), leave it out.
- Respect the patient's current weight-bearing status exactly as stated — never suggest standing, walking, or loaded lower-body work beyond what that status allows (e.g. non-weight-bearing means no standing exercises on the involved leg at all).
- Respect the patient's current assistive devices (boot, cast, splint, crutches, etc.) — never suggest anything that would require removing a boot/cast, or that assumes the patient can move freely without their stated device.
- Respect any other mobility restrictions given.
- The "protocol's own rest-of-body suggestions" given to you are your ceiling, not your floor — do not suggest a higher intensity or loading level than what those suggestions imply for this phase. You may pick different specific exercises than what's listed, as long as they match the same general category and intensity (e.g. if the protocol says "knee/hip exercises with no ankle involvement," you can choose your own specific hip/knee exercises, but not add loaded standing work if none is implied).
- Use the patient's available equipment when given; if none is listed, assume bodyweight/no-equipment only.
- Use yesterday's feedback (if given) to adjust: avoid repeating exercises marked "disliked" or that "caused pain" in the same form; you may repeat or progress ones marked "liked" and "no pain."
- Write "protocolSuggestionSummary" as a short (1-3 sentence), plain, factual summary of what the protocol itself suggests for rest-of-body work this phase — grounded only in the text given to you, never inventing clinical claims.
- These are exercise SUGGESTIONS for the patient to confirm with their PT, not a prescription — keep them conservative and generic.
Return JSON matching the provided schema.`;

/**
 * Generates a whole-body (non-Achilles) strength + cardio workout for one
 * day, grounded in the protocol's own rest-of-body suggestions for the
 * current phase and adjusted by the prior day's per-exercise feedback.
 * Never throws — on any failure this returns null, and the caller falls
 * back to showing the protocol's raw rest-of-body suggestions unchanged
 * (today's existing behavior) rather than breaking the page.
 */
export async function generateWholeBodyWorkout(
  input: GenerateWorkoutInput,
): Promise<GeneratedWorkout | null> {
  if (!process.env.GEMINI_API_KEY) return null;

  const feedbackText =
    input.yesterdayFeedback.length === 0
      ? "No feedback from yesterday (first day, or no rest-of-body workout was generated yesterday)."
      : input.yesterdayFeedback
          .map((f) => {
            const bits = [
              f.liked === true ? "liked" : f.liked === false ? "disliked" : null,
              f.causedPain === true ? "caused pain" : f.causedPain === false ? "no pain" : null,
            ].filter(Boolean);
            return `- ${f.exerciseName} (${f.workoutType}): ${bits.length > 0 ? bits.join(", ") : "no feedback given"}`;
          })
          .join("\n");

  const profileText = [
    input.profile.fitnessLevel ? `Pre-injury fitness level: ${input.profile.fitnessLevel}` : null,
    input.profile.exerciseFrequency ? `Pre-injury exercise frequency: ${input.profile.exerciseFrequency}` : null,
    input.profile.recoveryGoal ? `Recovery goal: ${input.profile.recoveryGoal}` : null,
    input.profile.availableEquipment.length > 0
      ? `Available equipment: ${input.profile.availableEquipment.join(", ")}`
      : "Available equipment: none listed (assume bodyweight only).",
  ]
    .filter(Boolean)
    .join("\n");

  const contents = `Current phase: ${input.phaseLabel}
Weight-bearing status: ${stringify(input.weightBearing)}
Assistive devices currently in use: ${stringify(input.assistiveDevices)}
Other restrictions/notes for this phase: ${stringify(input.restrictionNotes)}

The protocol's own rest-of-body suggestions for this phase (your ceiling — do not exceed this loading level):
${stringify(input.protocolRestOfBodyInterventions)}

Patient profile:
${profileText}

Yesterday's rest-of-body workout feedback:
${feedbackText}`;

  try {
    const ai = createGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            protocolSuggestionSummary: { type: Type.STRING },
            strength: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  sets: { type: Type.INTEGER, minimum: 1, maximum: 6 },
                  reps: { type: Type.INTEGER, minimum: 1, maximum: 30 },
                  frequency: { type: Type.STRING },
                  rationale: { type: Type.STRING },
                },
                required: ["name", "sets", "reps", "frequency", "rationale"],
              },
            },
            cardio: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  dosageLabel: { type: Type.STRING },
                  rationale: { type: Type.STRING },
                },
                required: ["name", "dosageLabel", "rationale"],
              },
            },
          },
          required: ["protocolSuggestionSummary", "strength", "cardio"],
        },
      },
    });

    const raw = JSON.parse(response.text ?? "{}");
    const parsed = generatedWorkoutSchema.safeParse(raw);
    if (!parsed.success) return null;
    if (parsed.data.strength.length === 0 && parsed.data.cardio.length === 0) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
