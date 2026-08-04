import "server-only";
import { Type } from "@google/genai";
import { z } from "zod";
import { createGeminiClient, GEMINI_MODEL } from "@/lib/gemini/client";

const dosageSuggestionSchema = z.object({
  exerciseName: z.string(),
  sets: z.number().int().min(1).max(6),
  reps: z.number().int().min(1).max(30),
  frequency: z.string().max(60),
  rationale: z.string().max(200),
});

const dosageResponseSchema = z.object({
  suggestions: z.array(dosageSuggestionSchema),
});

export type DosageSuggestion = z.infer<typeof dosageSuggestionSchema>;
export type ExerciseInput = { name: string; category: string };
export type DosageProfile = {
  fitnessLevel: string | null;
  exerciseFrequency: string | null;
  recoveryGoal: string | null;
};

// Everything this prompt is allowed to touch: dosage numbers and a one-line
// pacing rationale for exercises that are handed to it verbatim. It never
// sees weight-bearing status, assistive devices, or anything else that
// could tempt it into clinical territory — the guardrail is enforced by
// what we send it, not just by instruction-following.
const SYSTEM_INSTRUCTION = `You are helping personalize the PACING of an already clinician-approved physical therapy exercise list for a patient recovering from an Achilles tendon rupture.

Strict rules:
- You may ONLY suggest sets, reps, and a frequency (e.g. "2x/day", "once daily") for the exact exercises given to you. Do not invent, rename, merge, split, or omit any exercise.
- Do NOT mention weight-bearing status, walking, crutches, boots, or any assistive device.
- Do NOT give medical advice, diagnose anything, or suggest changing/advancing the rehab phase.
- Your rationale must be one short, plain sentence about pacing (e.g. "moderate volume given a very active baseline"), never a clinical justification.
- These are dosage SUGGESTIONS for the user to confirm with their physical therapist — keep them conservative and generic, not aggressive.
Return JSON matching the provided schema, with exactly one entry per exercise given, in the same order.`;

/**
 * Suggests sets/reps/frequency for a fixed list of exercise names that
 * already come from the user's protocol phase. Never asked to choose
 * exercises, never told about weight-bearing rules. On any failure
 * (missing key, API error, malformed response) this returns an empty list
 * rather than throwing — a missing dosage suggestion must never block plan
 * generation, since the exercise list itself is what actually matters and
 * comes straight from the protocol regardless.
 */
export async function suggestDosage(
  exercises: ExerciseInput[],
  profile: DosageProfile,
): Promise<DosageSuggestion[]> {
  if (exercises.length === 0) return [];
  if (!process.env.GEMINI_API_KEY) return [];

  const exerciseListText = exercises.map((e, i) => `${i + 1}. ${e.name} (${e.category})`).join("\n");
  const profileText = [
    profile.fitnessLevel ? `Pre-injury fitness level: ${profile.fitnessLevel}` : null,
    profile.exerciseFrequency ? `Pre-injury exercise frequency: ${profile.exerciseFrequency}` : null,
    profile.recoveryGoal ? `Recovery goal: ${profile.recoveryGoal}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const ai = createGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Exercises (in this exact order):\n${exerciseListText}\n\nPatient context:\n${profileText || "No additional context provided."}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  exerciseName: { type: Type.STRING },
                  sets: { type: Type.INTEGER, minimum: 1, maximum: 6 },
                  reps: { type: Type.INTEGER, minimum: 1, maximum: 30 },
                  frequency: { type: Type.STRING },
                  rationale: { type: Type.STRING },
                },
                required: ["exerciseName", "sets", "reps", "frequency", "rationale"],
              },
            },
          },
          required: ["suggestions"],
        },
      },
    });

    const raw = JSON.parse(response.text ?? "{}");
    const parsed = dosageResponseSchema.safeParse(raw);
    if (!parsed.success) return [];

    // Defense in depth: drop any suggestion that doesn't name a real
    // exercise from the input list, even though the prompt forbids it.
    const validNames = new Set(exercises.map((e) => e.name));
    return parsed.data.suggestions.filter((s) => validNames.has(s.exerciseName));
  } catch {
    return [];
  }
}
