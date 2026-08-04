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

// The general safety list shown on every protocol's plan-review screen,
// regardless of what that protocol's own `red_flags` column says. Mirrors
// the achilla-baseline signs already seeded for Willits (whose source is a
// research-paper timeline table with no red-flag guidance of its own) —
// kept here too so the review screen can show it for every protocol,
// clearly attributed to Achilla rather than to whichever protocol is
// active, alongside that protocol's own list when it has one.
export const BASELINE_RED_FLAGS = {
  title: "Achilla's general safety guidance",
  attribution:
    "Not specific to your protocol — this is Achilla's baseline safety guidance, shown to every user.",
  action: "Contact your surgeon, physical therapist, or care team.",
  signs: [
    "Fever",
    "Uncontrolled pain",
    "Excessive drainage from the incision",
    "Unresolving numbness or tingling",
    "Calf swelling, warmth, or redness (possible DVT)",
    "A sudden \"pop\" or new gap/weakness (possible re-rupture)",
  ],
} as const;
