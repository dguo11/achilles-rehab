import type { PhaseRow } from "@/lib/plan/current-phase";

function flattenWeightBearingText(weightBearing: unknown): string {
  if (weightBearing == null) return "";
  if (typeof weightBearing === "string") return weightBearing.toLowerCase();
  if (Array.isArray(weightBearing)) return weightBearing.join(" ").toLowerCase();
  if (typeof weightBearing === "object") {
    const obj = weightBearing as { label?: string; note?: string };
    return `${obj.label ?? ""} ${obj.note ?? ""}`.toLowerCase();
  }
  return "";
}

const KEYWORDS_BY_STATUS: Record<string, string[]> = {
  non_weight_bearing: ["non-weight-bearing", "non weight-bearing", "nwb"],
  partial_weight_bearing: ["protected weight-bearing", "partial weight-bearing", "wedge"],
  weight_bearing_as_tolerated: ["weight-bearing as tolerated", "wbat", "progressive weight-bearing"],
  full_weight_bearing: ["full weight-bearing", "fwb", "without wedges", "without crutches"],
};

export type StatusCheckResult = {
  mismatch: boolean;
  reportedStatus: string;
  phaseWeightBearingText: string | null;
  message?: string;
};

/**
 * Soft, non-blocking sanity check: does the user's self-reported current
 * weight-bearing status (from intake) look consistent with what the
 * computed phase's own weightBearing text describes? This never overrides
 * the protocol or the phase, and it never changes anything on its own — a
 * mismatch just surfaces a "please confirm with your PT" note on the plan
 * review page, per the deferred cross-check noted in Phase 2's intake
 * migration.
 */
export function checkStatusMismatch(
  phase: PhaseRow,
  reportedStatus: string | null,
): StatusCheckResult | null {
  if (!reportedStatus) return null;

  const text = flattenWeightBearingText(phase.weight_bearing);

  // Later phases often stop mentioning weight-bearing at all because it's
  // no longer restricted — treat that as consistent only with "full".
  if (!text) {
    return {
      mismatch: reportedStatus !== "full_weight_bearing",
      reportedStatus,
      phaseWeightBearingText: null,
      message:
        reportedStatus !== "full_weight_bearing"
          ? "This phase of the protocol no longer describes a weight-bearing restriction, but you told us you're not yet at full weight-bearing. Please confirm your current status with your PT."
          : undefined,
    };
  }

  const keywords = KEYWORDS_BY_STATUS[reportedStatus] ?? [];
  const matches = keywords.some((kw) => text.includes(kw));

  return {
    mismatch: !matches,
    reportedStatus,
    phaseWeightBearingText: text,
    message: !matches
      ? "What you told us about your current weight-bearing status doesn't clearly match this phase's protocol description. Please confirm with your PT before starting."
      : undefined,
  };
}
