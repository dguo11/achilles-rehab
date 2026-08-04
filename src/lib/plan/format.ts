export type WeightBearingEntry = { text: string; inferred: boolean; note?: string };

/**
 * `protocol_phases.weight_bearing` is stored as a raw string, a string[], or
 * (for the one Willits row flagged in the data-verification notes) an
 * `{ label, inferred, note }` object — kept that way in the DB so the
 * "inferred, not verbatim" distinction survives storage. This normalizes all
 * three shapes into a flat list for rendering, without ever dropping the
 * inferred flag.
 */
export function formatWeightBearing(value: unknown): WeightBearingEntry[] {
  if (value == null) return [];
  if (typeof value === "string") return [{ text: value, inferred: false }];
  if (Array.isArray(value)) return value.flatMap((v) => formatWeightBearing(v));
  if (typeof value === "object") {
    const obj = value as { label?: unknown; inferred?: unknown; note?: unknown };
    if (typeof obj.label === "string") {
      return [
        {
          text: obj.label,
          inferred: obj.inferred === true,
          note: typeof obj.note === "string" ? obj.note : undefined,
        },
      ];
    }
  }
  return [];
}

const CATEGORY_LABELS: Record<string, string> = {
  romMobility: "Range of motion / mobility",
  strengthening: "Strengthening",
  cardio: "Cardio",
  proprioception: "Proprioception",
  balanceProprioception: "Balance & proprioception",
  modalities: "Modalities",
  running: "Running",
  plyometrics: "Plyometrics",
  plyometricsAgility: "Plyometrics & agility",
  progression: "Progression",
  other: "Other",
  note: "Notes",
};

export function categoryLabel(category: string): string {
  return (
    CATEGORY_LABELS[category] ??
    category
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase())
      .trim()
  );
}
