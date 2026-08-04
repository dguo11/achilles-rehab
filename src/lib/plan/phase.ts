import type { Database } from "@/lib/supabase/database.types";

export type ProtocolPhaseRow = Database["public"]["Tables"]["protocol_phases"]["Row"];

// Categories whose entries are prose ("Continue to progress ROM, strength,
// proprioception") rather than actual exercise names — never surfaced as
// something to name-match against or suggest dosage for.
const NON_EXERCISE_CATEGORIES = new Set(["note"]);

function interventionsAsRecord(interventions: ProtocolPhaseRow["interventions"]): Record<string, string[]> {
  if (!interventions || typeof interventions !== "object" || Array.isArray(interventions)) return {};
  const record: Record<string, string[]> = {};
  for (const [category, value] of Object.entries(interventions)) {
    if (Array.isArray(value)) {
      record[category] = value.filter((v): v is string => typeof v === "string");
    }
  }
  return record;
}

/**
 * Several phases (e.g. MGB's "Transitional" phases, Willits' "Continue the
 * 2-4 week protocol") don't restate exercises that carry forward from
 * earlier phases — they just point back via `continues_from_order_indexes`.
 * This merges a phase's own interventions with those of every phase it
 * points to (the seed data already stores the flattened set of indexes, not
 * just the immediate predecessor, so no recursion is needed) into one
 * category -> exercise-names map.
 */
export function getEffectiveInterventions(
  phase: ProtocolPhaseRow,
  allPhases: ProtocolPhaseRow[],
): Record<string, string[]> {
  const byOrderIndex = new Map(allPhases.map((p) => [p.order_index, p]));
  const sourceIndexes = [...(phase.continues_from_order_indexes ?? []), phase.order_index];

  const merged: Record<string, string[]> = {};
  for (const index of sourceIndexes) {
    const source = byOrderIndex.get(index);
    if (!source) continue;
    for (const [category, names] of Object.entries(interventionsAsRecord(source.interventions))) {
      const existing = merged[category] ?? [];
      merged[category] = Array.from(new Set([...existing, ...names]));
    }
  }
  return merged;
}

/** Flattens an effective-interventions map into the deduped exercise-name vocabulary for a phase. */
export function flattenExerciseNames(interventions: Record<string, string[]>): string[] {
  const names = new Set<string>();
  for (const [category, values] of Object.entries(interventions)) {
    if (NON_EXERCISE_CATEGORIES.has(category)) continue;
    values.forEach((v) => names.add(v));
  }
  return Array.from(names);
}

/** Maps each exercise name to the category it appears under (first match wins), for grouping in the UI. */
export function categoryByExerciseName(interventions: Record<string, string[]>): Map<string, string> {
  const map = new Map<string, string>();
  for (const [category, names] of Object.entries(interventions)) {
    if (NON_EXERCISE_CATEGORIES.has(category)) continue;
    for (const name of names) {
      if (!map.has(name)) map.set(name, category);
    }
  }
  return map;
}
