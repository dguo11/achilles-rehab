import { z } from "zod";

export const FITNESS_LEVELS = [
  { value: "sedentary", label: "Mostly sedentary" },
  { value: "light", label: "Lightly active" },
  { value: "regular", label: "Regularly active" },
  { value: "very_active", label: "Very active" },
  { value: "athlete", label: "Competitive athlete" },
] as const;

// Section 4.2 — the base list is Willits Table E-2 ("Activity at Time of
// Injury"), extended with a few common categories the reference intake adds
// (gym/strength training, cycling, swimming, hiking) plus free-text "Other".
export const PRIOR_ACTIVITIES = [
  "Running",
  "Racket sports (tennis, squash, pickleball, badminton)",
  "Basketball",
  "Soccer",
  "Baseball / softball",
  "Volleyball",
  "Football",
  "Martial arts",
  "Gym / strength training",
  "Cycling",
  "Swimming",
  "Hiking / walking",
] as const;

export const EXERCISE_FREQUENCIES = [
  { value: "lt_1x", label: "Less than once a week" },
  { value: "1_2x", label: "1–2× / week" },
  { value: "3_4x", label: "3–4× / week" },
  { value: "5plus_x", label: "5+× / week" },
] as const;

export const RECOVERY_GOALS = [
  { value: "daily_activities", label: "Get back to comfortable daily activities and walking" },
  { value: "recreational", label: "Return to recreational exercise" },
  { value: "competitive", label: "Return to competitive sport" },
] as const;

export const DAILY_DEMANDS = [
  { value: "seated", label: "Mostly seated / desk-based" },
  { value: "on_feet", label: "On my feet a lot" },
  { value: "manual_labor", label: "Physically demanding / manual labor" },
] as const;

export const EQUIPMENT_OPTIONS = [
  "Resistance bands",
  "Stationary bike",
  "Pool",
  "Gym / weight machines",
  "Wobble or balance board",
] as const;

export const FITNESS_TRACKERS = [
  { value: "garmin", label: "Yes — Garmin" },
  { value: "strava", label: "Yes — Strava" },
  { value: "other", label: "Yes — other" },
  { value: "no", label: "No" },
] as const;

export const CARE_TEAM_STATUSES = [
  { value: "pt", label: "I have a physical therapist" },
  { value: "surgeon", label: "I have a surgeon / physician" },
  { value: "both", label: "Both" },
  { value: "neither", label: "Neither yet" },
] as const;

export const MOBILITY_AIDS = [
  "Splint or cast",
  "Walking boot with heel wedges",
  "Walking boot without wedges",
  "Supportive sneaker with a heel lift",
  "Regular shoes",
  "Crutches",
  "Cane",
] as const;
export const NO_MOBILITY_AID = "Nothing / walking unaided";

export const WEIGHT_BEARING_STATUSES = [
  { value: "non_weight_bearing", label: "Non-weight-bearing" },
  { value: "partial_weight_bearing", label: "Partial weight-bearing" },
  { value: "weight_bearing_as_tolerated", label: "Weight-bearing as tolerated" },
  { value: "full_weight_bearing", label: "Full weight-bearing" },
] as const;

export const RUPTURE_TYPES = [
  { value: "first_time", label: "A first-time rupture" },
  { value: "re_rupture", label: "A re-rupture" },
  { value: "revision", label: "A revision surgery" },
] as const;

export const YES_NO_NOT_SURE = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_sure", label: "Not sure" },
] as const;

export const AGE_RANGES = [
  { value: "under_40", label: "Under 40" },
  { value: "40_59", label: "40–59" },
  { value: "60_plus", label: "60+" },
] as const;

// Mirrors MGB's own "consider a more conservative approach" factors.
export const CONSERVATIVE_FACTORS = [
  "A clinician has told me to progress cautiously",
  "Diabetes",
  "I currently smoke or use nicotine",
  "Long-term corticosteroid (steroid) use",
] as const;

export const PROTOCOL_OPTIONS = [
  {
    id: "willits-accelerated",
    label: "Willits (accelerated functional)",
    appliesTo: ["surgical", "non_surgical"],
    description:
      "A simpler, purely time-based protocol used for both surgical and non-surgical recovery.",
  },
  {
    id: "mgb-achilles-repair",
    label: "Mass General Brigham",
    appliesTo: ["surgical"],
    description:
      "A detailed, criterion-and-time-based protocol with numbered phases I–VII, plus structured return-to-running and agility/plyometric programs. Surgical patients only.",
  },
] as const;

export type ProtocolId = (typeof PROTOCOL_OPTIONS)[number]["id"];

export function protocolAppliesToInjuryType(
  protocol: { appliesTo: readonly string[] },
  injuryType: "surgical" | "non_surgical",
): boolean {
  return protocol.appliesTo.includes(injuryType);
}

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

// Full intake, used when the user knows their treatment track (1.1 answered
// surgical or non_surgical). A separate, shorter schema below covers the
// "not sure yet" branch, which skips protocol selection entirely.
export const intakeSchema = z
  .object({
    injuryType: z.enum(["surgical", "non_surgical"]),
    anchorDate: dateString,
    side: z.enum(["left", "right"]),
    ruptureType: z.enum(["first_time", "re_rupture", "revision"]),
    tendonAugmentation: z.enum(["yes", "no", "not_sure"]).optional(),
    preExistingTendinosis: z.enum(["yes", "no", "not_sure"]),

    currentMobilityAids: z.array(z.string()).default([]),
    currentBootWedgeCount: z.coerce.number().int().min(0).max(3).optional(),
    currentWeightBearingStatus: z.enum([
      "non_weight_bearing",
      "partial_weight_bearing",
      "weight_bearing_as_tolerated",
      "full_weight_bearing",
    ]),
    careTeamStatus: z.enum(["pt", "surgeon", "both", "neither"]),

    redFlagSigns: z.array(z.string()).default([]),

    ageRange: z.enum(["under_40", "40_59", "60_plus"]).optional(),
    conservativeFactors: z.array(z.string()).default([]),

    protocolPreference: z.enum(["mgb", "willits", "upload_own", "not_sure"]),
    resolvedProtocolId: z.enum(["mgb-achilles-repair", "willits-accelerated"]).optional(),

    fitnessLevel: z.enum(FITNESS_LEVELS.map((f) => f.value) as [string, ...string[]]),
    priorSports: z.array(z.string()).default([]),
    exerciseFrequency: z.enum(["lt_1x", "1_2x", "3_4x", "5plus_x"]),

    recoveryGoal: z.enum(["daily_activities", "recreational", "competitive"]),
    dailyDemand: z.enum(["seated", "on_feet", "manual_labor"]),
    hasStairsAtHome: z.enum(["yes", "no"]),
    homeNotes: optionalText(500),
    availableEquipment: z.array(z.string()).default([]),
    fitnessTracker: z.enum(["garmin", "strava", "other", "no"]),

    confidenceBaseline: z.coerce.number().int().min(1).max(5),
    motivationBaseline: z.coerce.number().int().min(1).max(5),
    mentalHealthNote: optionalText(1000),
  })
  .refine(
    (data) => {
      // "Upload your own" defers protocol resolution to the separate
      // /protocol/upload review flow — no built-in protocol is chosen here.
      if (data.protocolPreference === "upload_own") return true;
      const protocol = PROTOCOL_OPTIONS.find((p) => p.id === data.resolvedProtocolId);
      return !!protocol && protocolAppliesToInjuryType(protocol, data.injuryType);
    },
    { message: "That protocol doesn't apply to the selected injury type.", path: ["resolvedProtocolId"] },
  );

export type IntakeInput = z.infer<typeof intakeSchema>;

// "Not sure yet" branch — still worth collecting current-status and safety
// data (useful regardless of eventual track), but no protocol is chosen.
export const undecidedIntakeSchema = z.object({
  injuryType: z.literal("not_sure"),
  anchorDate: dateString,
  side: z.enum(["left", "right"]),
  currentMobilityAids: z.array(z.string()).default([]),
  currentBootWedgeCount: z.coerce.number().int().min(0).max(3).optional(),
  currentWeightBearingStatus: z.enum([
    "non_weight_bearing",
    "partial_weight_bearing",
    "weight_bearing_as_tolerated",
    "full_weight_bearing",
  ]),
  careTeamStatus: z.enum(["pt", "surgeon", "both", "neither"]),
  redFlagSigns: z.array(z.string()).default([]),
  fitnessLevel: z.enum(FITNESS_LEVELS.map((f) => f.value) as [string, ...string[]]),
  priorSports: z.array(z.string()).default([]),
  exerciseFrequency: z.enum(["lt_1x", "1_2x", "3_4x", "5plus_x"]),
  recoveryGoal: z.enum(["daily_activities", "recreational", "competitive"]),
  dailyDemand: z.enum(["seated", "on_feet", "manual_labor"]),
  hasStairsAtHome: z.enum(["yes", "no"]),
  homeNotes: optionalText(500),
  availableEquipment: z.array(z.string()).default([]),
  fitnessTracker: z.enum(["garmin", "strava", "other", "no"]),
  confidenceBaseline: z.coerce.number().int().min(1).max(5),
  motivationBaseline: z.coerce.number().int().min(1).max(5),
  mentalHealthNote: optionalText(1000),
});

export type UndecidedIntakeInput = z.infer<typeof undecidedIntakeSchema>;
