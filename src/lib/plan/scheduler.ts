import type { Database } from "@/lib/supabase/database.types";
import type { DosageSuggestion } from "@/lib/gemini/dosage";

type DailyPlanEntryInsert = Database["public"]["Tables"]["daily_plan_entries"]["Insert"];

// A rolling window, not "every day until the phase ends": MGB's Phase VII
// (6+ months) has no end date at all, and even bounded phases can span
// weeks — generating the full span up front would mean thousands of rows
// for exercises that never change day to day. 14 days is enough for the
// tracker to have something to show well past the PT-review gate, and
// Phase 4's phase-advancement flow re-generates the next window when the
// active phase changes.
const PLAN_WINDOW_DAYS = 14;

export function planWindowEnd(startDate: Date, phaseEndDate: Date | null): Date {
  const windowEnd = new Date(startDate);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + PLAN_WINDOW_DAYS - 1);
  return phaseEndDate && phaseEndDate < windowEnd ? phaseEndDate : windowEnd;
}

/**
 * Deterministically expands a phase's exercise list into one
 * `daily_plan_entries` row per exercise per day, for every day from
 * `startDate` through the earlier of the rolling window or the phase's own
 * end date. Every row is tagged `dosage_source: 'llm-suggested'` — this
 * function only lays out what Gemini already suggested (or left blank), it
 * never invents a dosage itself.
 */
export function buildDailyPlanEntries({
  userId,
  userProtocolSelectionId,
  protocolPhaseId,
  exerciseNames,
  categoryByExerciseName,
  suggestions,
  startDate,
  phaseEndDate,
}: {
  userId: string;
  userProtocolSelectionId: string;
  protocolPhaseId: string;
  exerciseNames: string[];
  categoryByExerciseName: Map<string, string>;
  suggestions: DosageSuggestion[];
  startDate: Date;
  phaseEndDate: Date | null;
}): DailyPlanEntryInsert[] {
  const suggestionByName = new Map(suggestions.map((s) => [s.exerciseName, s]));
  const lastDate = planWindowEnd(startDate, phaseEndDate);
  if (lastDate < startDate || exerciseNames.length === 0) return [];

  const entries: DailyPlanEntryInsert[] = [];
  for (const d = new Date(startDate); d <= lastDate; d.setUTCDate(d.getUTCDate() + 1)) {
    const planDate = toDateString(d);
    exerciseNames.forEach((exerciseName, index) => {
      const suggestion = suggestionByName.get(exerciseName);
      entries.push({
        user_id: userId,
        user_protocol_selection_id: userProtocolSelectionId,
        protocol_phase_id: protocolPhaseId,
        plan_date: planDate,
        exercise_name: exerciseName,
        exercise_category: categoryByExerciseName.get(exerciseName) ?? null,
        suggested_sets: suggestion?.sets ?? null,
        suggested_reps: suggestion?.reps ?? null,
        suggested_frequency: suggestion?.frequency ?? null,
        dosage_source: "llm-suggested",
        notes: suggestion?.rationale || null,
        sort_order: index,
      });
    });
  }
  return entries;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}
