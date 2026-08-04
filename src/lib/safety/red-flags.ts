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

// Same baseline list seeded onto Willits (which has no red-flag guidance in
// its own source). Applied to a custom-uploaded protocol whenever the
// user's document doesn't itself state warning signs, so nobody ends up
// with no red-flag guidance at all just because their PT's handout skipped
// that section.
export const ACHILLA_BASELINE_RED_FLAGS = {
  source: "achilla-baseline",
  action: "Advise the user to contact their referring physician / care team.",
  signs: [
    "Fever",
    "Uncontrolled pain",
    "Excessive drainage from the incision",
    "Unresolving numbness or tingling",
    "Calf swelling, warmth, or redness (possible DVT)",
    "A sudden \"pop\" or new gap/weakness (possible re-rupture)",
    "Any other symptom of concern",
  ],
} as const;
