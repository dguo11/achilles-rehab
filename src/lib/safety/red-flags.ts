// Intake Section 3A red-flag screen. This mirrors the signs already stored
// per-protocol in the `protocols.red_flags` column (and the shared
// Achilla-baseline list used when a protocol's source has none), kept here
// as UI-facing options rather than fetched from the DB since the intake
// wizard runs before any protocol has necessarily been chosen.
export const RED_FLAG_OPTIONS = [
  "Fever",
  "Spreading redness or drainage from the incision",
  "Numbness or tingling that isn't improving",
  "New calf pain or swelling",
  "Sudden new pain, or a feeling that the tendon \"gave way\"",
] as const;

export const NONE_OF_THESE = "None of these";
