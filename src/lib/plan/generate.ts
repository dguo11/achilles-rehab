import "server-only";
import { computeCurrentPhase, type PhaseRow } from "@/lib/plan/current-phase";
import { checkStatusMismatch } from "@/lib/plan/status-check";
import { suggestDosage } from "@/lib/gemini/dosage";

type Interventions = Record<string, unknown>;

function flattenExercises(interventions: unknown): { name: string; category: string }[] {
  if (!interventions || typeof interventions !== "object") return [];
  const out: { name: string; category: string }[] = [];
  for (const [category, items] of Object.entries(interventions as Interventions)) {
    if (category === "note") continue; // free-text carry-over notes, not exercises
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (typeof item === "string") out.push({ name: item, category });
    }
  }
  return out;
}

export async function generatePlanSnapshot({
  protocol,
  phases,
  anchorDate,
  intake,
}: {
  protocol: { id: string; name: string; red_flags: unknown };
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
  const exercises = flattenExercises(phase.interventions);

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
    phaseId: phase.id,
    phaseOrderIndex: phase.order_index,
    phase: {
      number: phase.number,
      name: phase.name,
      timeframeLabel: phase.timeframe_label,
      goals: phase.goals,
      weightBearing: phase.weight_bearing,
      assistiveDevices: phase.assistive_devices,
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
