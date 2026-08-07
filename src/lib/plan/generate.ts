import "server-only";
import { computeCurrentPhase, type PhaseRow } from "@/lib/plan/current-phase";
import { checkStatusMismatch } from "@/lib/plan/status-check";
import { suggestDosage } from "@/lib/gemini/dosage";

type Interventions = Record<string, unknown>;
export type BodyRegion = "achilles" | "rest_of_body";

export function flattenExercises(
  interventions: unknown,
  region: BodyRegion,
): { name: string; category: string; region: BodyRegion }[] {
  if (!interventions || typeof interventions !== "object") return [];
  const out: { name: string; category: string; region: BodyRegion }[] = [];
  for (const [category, items] of Object.entries(interventions as Interventions)) {
    if (category === "note") continue; // free-text carry-over notes, not exercises
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (typeof item === "string") out.push({ name: item, category, region });
    }
  }
  return out;
}

export function asStringArrayOrNull(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const list = value.filter((v): v is string => typeof v === "string");
  return list.length > 0 ? list : null;
}

type InterventionField = "achilles_interventions" | "rest_of_body_interventions";

function concreteCategories(interventions: unknown): Interventions {
  if (!interventions || typeof interventions !== "object") return {};
  return Object.fromEntries(
    Object.entries(interventions as Interventions).filter(([category]) => category !== "note"),
  );
}

/**
 * Some phases (e.g. Willits' "4-6 weeks": interventions = { note: "Continue
 * the 2-4 week protocol" }) carry no exercises of their own — just a
 * carry-over note plus continuesFromOrderIndexes pointing at the phase that
 * actually lists them. Resolves that: a phase with its own concrete
 * (non-"note") categories is used as-is (this is the common case, and
 * covers protocols like MGB that always spell out each phase's full list
 * directly rather than relying on this field); a phase with none walks
 * continuesFromOrderIndexes to the nearest phase that does, so "note-only"
 * phases still produce a real exercise list instead of an empty one.
 */
function resolveConcreteInterventions(
  phases: PhaseRow[],
  phase: PhaseRow,
  field: InterventionField,
  visited: Set<number> = new Set(),
): Interventions {
  if (visited.has(phase.order_index)) return {};
  visited.add(phase.order_index);

  const own = concreteCategories(phase[field]);
  if (Object.keys(own).length > 0) return own;

  for (const orderIndex of phase.continues_from_order_indexes ?? []) {
    const prior = phases.find((p) => p.order_index === orderIndex);
    if (!prior) continue;
    const resolved = resolveConcreteInterventions(phases, prior, field, visited);
    if (Object.keys(resolved).length > 0) return resolved;
  }
  return {};
}

export async function generatePlanSnapshot({
  protocol,
  phases,
  anchorDate,
  intake,
}: {
  protocol: { id: string; name: string; red_flags: unknown; is_verified: boolean };
  phases: PhaseRow[];
  anchorDate: string;
  intake: {
    fitness_level: string | null;
    exercise_frequency: string | null;
    recovery_goal: string | null;
    current_weight_bearing_status: string | null;
  };
}) {
  const phase = computeCurrentPhase(phases, anchorDate);
  const statusCheck = checkStatusMismatch(phase, intake.current_weight_bearing_status);
  const resolvedAchillesInterventions = resolveConcreteInterventions(phases, phase, "achilles_interventions");
  const resolvedRestOfBodyInterventions = resolveConcreteInterventions(phases, phase, "rest_of_body_interventions");
  const exercises = [
    ...flattenExercises(resolvedAchillesInterventions, "achilles"),
    ...flattenExercises(resolvedRestOfBodyInterventions, "rest_of_body"),
  ];

  const dosageSuggestions = await suggestDosage(exercises, {
    fitnessLevel: intake.fitness_level,
    exerciseFrequency: intake.exercise_frequency,
    recoveryGoal: intake.recovery_goal,
  });
  const dosageByName = new Map(dosageSuggestions.map((d) => [d.exerciseName, d]));

  const exercisePlan = exercises.map((ex) => {
    const suggestion = dosageByName.get(ex.name);
    return {
      exerciseName: ex.name,
      category: ex.category,
      region: ex.region,
      sets: suggestion?.sets ?? null,
      reps: suggestion?.reps ?? null,
      frequency: suggestion?.frequency ?? null,
      rationale: suggestion?.rationale ?? null,
      dosageSource: suggestion ? ("llm-suggested" as const) : ("unavailable" as const),
    };
  });

  return {
    protocolId: protocol.id,
    protocolName: protocol.name,
    protocolIsVerified: protocol.is_verified,
    phaseId: phase.id,
    phaseOrderIndex: phase.order_index,
    phase: {
      number: phase.number,
      name: phase.name,
      timeframeLabel: phase.timeframe_label,
      goals: phase.goals,
      weightBearing: phase.weight_bearing,
      gaitTraining: asStringArrayOrNull(phase.gait_training),
      assistiveDevices: phase.assistive_devices,
      restOfBodyInterventions: resolvedRestOfBodyInterventions,
      criteriaToProgress: phase.criteria_to_progress,
      criteriaToDischarge: phase.criteria_to_discharge,
    },
    exercisePlan,
    statusCheck,
    redFlags: protocol.red_flags,
    generatedAt: new Date().toISOString(),
  };
}

export type PlanSnapshot = Awaited<ReturnType<typeof generatePlanSnapshot>>;
