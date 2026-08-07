import "server-only";
import { Type } from "@google/genai";
import { z } from "zod";
import { createGeminiClient, GEMINI_MODEL } from "@/lib/gemini/client";

const strengthItemSchema = z.object({
  name: z.string().max(120),
  targetArea: z.enum(["upper", "core", "lower"]),
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
const SYSTEM_INSTRUCTION = `You are building a whole-body ("rest of the body" — NOT ankle/Achilles/calf) accessory workout for a patient recovering from an Achilles tendon injury, for one specific day. The strength list should cover a genuine mix of upper-body, core, and (where the restrictions below allow) lower-body work — not just whatever body regions the protocol's own rest-of-body suggestions happen to mention. Most Achilles protocols only call out hip/knee/core work because that's what's affected by the injury; they stay silent on the upper body simply because it's unaffected, not because upper-body work should be skipped. Tag every strength exercise's "targetArea" as "upper", "core", or "lower" — include at least one or two "upper" exercises whenever the patient's restrictions and equipment allow any safe option (they almost always do: seated or lying upper-body work is compatible with virtually every weight-bearing status).

Hard safety rules — never violate these:
- NEVER include any exercise that loads, stretches, or otherwise directly involves the ankle, Achilles tendon, or calf. That is handled entirely separately by the patient's clinical protocol. If you are unsure whether an exercise involves the ankle (e.g. most standing balance work, calf raises, lunges with a deep ankle bend, single-leg hops), leave it out.
- Respect the patient's current weight-bearing status exactly as stated — never suggest standing, walking, or loaded lower-body work beyond what that status allows (e.g. non-weight-bearing means no standing exercises on the involved leg at all).
- Respect the patient's current assistive devices (boot, cast, splint, crutches, etc.) — never suggest anything that would require removing a boot/cast, or that assumes the patient can move freely without their stated device.
- Respect any other mobility restrictions given.
- This applies to upper-body and core exercises too, not just lower-body ones: the POSITION each exercise requires (seated, lying, standing, kneeling, half-kneeling, quadruped/all-fours, etc.) must itself be compatible with the patient's weight-bearing status and assistive devices. If standing or balancing on the involved leg isn't currently allowed, prefer seated or lying/supine upper-body and core work over standing versions (e.g. a seated shoulder press or seated row instead of a standing one); avoid kneeling, quadruped, or plank-family positions that load or flex the ankle/foot on the involved side, or that assume the patient can get into/out of that position freely while in a boot or cast.
- The "protocol's own rest-of-body suggestions" given to you are your ceiling for the body regions they actually mention (e.g. hip/knee work) — do not suggest a higher intensity or loading level than what those suggestions imply for those regions. You may pick different specific exercises than what's listed, as long as they match the same general category and intensity. This ceiling does not apply to upper-body work, which the protocol's silence doesn't restrict — choose an upper-body intensity appropriate to the patient's overall profile and current restrictions instead.
- Use the patient's available equipment when given (for any target area, upper included); if none is listed, assume bodyweight/no-equipment only.
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
                  targetArea: { type: Type.STRING, enum: ["upper", "core", "lower"] },
                  sets: { type: Type.INTEGER, minimum: 1, maximum: 6 },
                  reps: { type: Type.INTEGER, minimum: 1, maximum: 30 },
                  frequency: { type: Type.STRING },
                  rationale: { type: Type.STRING },
                },
                required: ["name", "targetArea", "sets", "reps", "frequency", "rationale"],
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
