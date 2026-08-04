import "server-only";
import { generateJson } from "@/lib/gemini/client";

export type DosageSuggestion = {
  exerciseName: string;
  sets: number | null;
  reps: number | null;
  frequency: string | null;
  rationale: string;
};

export type DosageUserProfile = {
  fitnessLevel: string | null;
  exerciseFrequency: string | null;
  recoveryGoal: string | null;
  ageRange: string | null;
  priorSports: string[];
  conservativeFactors: string[];
};

type RawSuggestion = {
  exerciseName?: unknown;
  sets?: unknown;
  reps?: unknown;
  frequency?: unknown;
  rationale?: unknown;
};

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          exerciseName: { type: "string" },
          sets: { type: "integer", nullable: true },
          reps: { type: "integer", nullable: true },
          frequency: { type: "string", nullable: true },
          rationale: { type: "string" },
        },
        required: ["exerciseName", "rationale"],
      },
    },
  },
  required: ["suggestions"],
};

/**
 * Suggests starting sets/reps/frequency for the exercises named in a
 * protocol phase. `exerciseNames` is the ONLY vocabulary the model is
 * allowed to suggest dosage for — it comes straight from that phase's own
 * `protocol_phases.interventions`, never generated. Any suggestion whose
 * name doesn't exactly match (case-insensitively) an entry in that list is
 * dropped and logged as an anomaly rather than shown to the user; this is
 * the guardrail that keeps the LLM from ever inventing an exercise.
 *
 * Every suggestion returned here is destined for a `dosage_source =
 * 'llm-suggested'` row — callers must not relabel it.
 */
export async function suggestDosage(
  phaseLabel: string,
  exerciseNames: string[],
  profile: DosageUserProfile,
): Promise<DosageSuggestion[]> {
  if (exerciseNames.length === 0) return [];

  const result = await generateJson<{ suggestions: RawSuggestion[] }>({
    prompt: buildPrompt(phaseLabel, exerciseNames, profile),
    responseSchema: RESPONSE_SCHEMA,
  });

  if (!result || !Array.isArray(result.suggestions)) return [];

  const allowedByKey = new Map(exerciseNames.map((name) => [normalize(name), name]));
  const seen = new Set<string>();
  const validated: DosageSuggestion[] = [];

  for (const raw of result.suggestions) {
    const key = normalize(typeof raw.exerciseName === "string" ? raw.exerciseName : "");
    const canonicalName = allowedByKey.get(key);

    if (!canonicalName) {
      console.warn(
        `[dosage] dropped suggestion for exercise name not in phase's exercise list: ${JSON.stringify(raw.exerciseName)}`,
      );
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);

    validated.push({
      exerciseName: canonicalName,
      sets: toPositiveIntOrNull(raw.sets),
      reps: toPositiveIntOrNull(raw.reps),
      frequency: typeof raw.frequency === "string" ? raw.frequency.trim().slice(0, 80) || null : null,
      rationale: typeof raw.rationale === "string" ? raw.rationale.trim().slice(0, 300) : "",
    });
  }

  return validated;
}

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

function toPositiveIntOrNull(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function buildPrompt(phaseLabel: string, exerciseNames: string[], profile: DosageUserProfile): string {
  return `You are suggesting a conservative starting home-exercise dosage (sets, reps, frequency) for someone recovering from an Achilles tendon injury. This is only a suggestion their physical therapist will review and can change — never phrase it as a clinical instruction or diagnosis.

Current phase: ${phaseLabel}

Exercises — you MUST suggest dosage only for names in this exact list, copied verbatim. Do not invent, rename, merge, or add exercises. Do not add exercises the list doesn't contain:
${exerciseNames.map((name) => `- ${name}`).join("\n")}

User context (for tailoring dosage conservatively, not for changing which exercises apply):
- Fitness level: ${profile.fitnessLevel ?? "unknown"}
- Typical exercise frequency before injury: ${profile.exerciseFrequency ?? "unknown"}
- Recovery goal: ${profile.recoveryGoal ?? "unknown"}
- Age range: ${profile.ageRange ?? "unknown"}
- Prior sports/activities: ${profile.priorSports.join(", ") || "none listed"}
- Conservative-approach factors present (e.g. clinician advised caution, diabetes, smoking, steroid use): ${
    profile.conservativeFactors.join(", ") || "none"
  }

For every exercise in the list, return one suggestion with a one-sentence rationale. If sets/reps genuinely don't apply (e.g. a modality, a stretch held for time, a "continue as indicated" note), you may leave sets/reps null but still include the exercise with a brief rationale and, if relevant, a frequency. When conservative factors are present, bias toward the lower end of a reasonable starting dosage. Respond only with exercises from the provided list — one entry per exercise, no duplicates.`;
}
