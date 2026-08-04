export type PhaseRow = {
  id: string;
  order_index: number;
  number: number | null;
  name: string | null;
  timeframe_label: string;
  timeframe_start_days: number | null;
  timeframe_end_days: number | null;
  goals: unknown;
  weight_bearing: unknown;
  interventions: unknown;
  criteria_to_progress: unknown;
  criteria_to_discharge: unknown;
  continues_from_order_indexes: number[] | null;
  assistive_devices: unknown;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Suggests which protocol phase a user is currently in, purely from elapsed
 * days since their anchor date. This is a starting-point suggestion for plan
 * generation, not a phase-advancement mechanism: the source protocols
 * describe phases with non-contiguous week ranges (e.g. MGB's "0-3 weeks"
 * then "4-6 weeks" leaves day 22-27 unmapped), so the rule is "you're in the
 * most recently started phase" — the phase with the greatest
 * timeframe_start_days that is still <= elapsed days. Never used to
 * silently advance a time_and_criterion-gated protocol past explicit
 * criteriaToProgress confirmation.
 */
export function computeCurrentPhase(
  phases: PhaseRow[],
  anchorDate: string,
  today: Date = new Date(),
): PhaseRow {
  if (phases.length === 0) {
    throw new Error("computeCurrentPhase: no phases provided");
  }

  const anchor = new Date(anchorDate + "T00:00:00Z");
  const elapsedDays = Math.max(
    0,
    Math.floor((today.getTime() - anchor.getTime()) / MS_PER_DAY),
  );

  const sorted = [...phases].sort(
    (a, b) => (a.timeframe_start_days ?? 0) - (b.timeframe_start_days ?? 0),
  );

  let current = sorted[0];
  for (const phase of sorted) {
    if ((phase.timeframe_start_days ?? 0) <= elapsedDays) {
      current = phase;
    } else {
      break;
    }
  }
  return current;
}
