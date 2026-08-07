import "server-only";
import {
  intakeSchema,
  undecidedIntakeSchema,
  type IntakeInput,
  type UndecidedIntakeInput,
} from "@/lib/intake/schema";
import { checkForDistressSignals } from "@/lib/safety/distress";
import { NONE_OF_THESE } from "@/lib/safety/red-flags";
import type { TablesInsert } from "@/lib/supabase/database.types";

function getAll(formData: FormData, key: string): string[] {
  return formData.getAll(key).map(String);
}

function getNumberOrUndefined(formData: FormData, key: string): number | undefined {
  const value = formData.get(key);
  if (value === null || value === "") return undefined;
  return Number(value);
}

export type ParsedIntake =
  | {
      ok: true;
      mode: "undecided";
      data: UndecidedIntakeInput;
      mentalHealthFlagged: boolean;
      redFlagAcknowledgedAt: string | null;
    }
  | {
      ok: true;
      mode: "full";
      data: IntakeInput;
      mentalHealthFlagged: boolean;
      redFlagAcknowledgedAt: string | null;
    }
  | { ok: false; error: string };

/**
 * Shared FormData -> validated intake shape, used by both the initial
 * onboarding submission and the Profile "edit" flow so the two never drift
 * on field mapping.
 */
export function parseIntakeFormData(formData: FormData): ParsedIntake {
  const mode = formData.get("mode");
  const redFlagSigns = getAll(formData, "redFlagSigns").filter((s) => s !== NONE_OF_THESE);
  const mentalHealthNote = String(formData.get("mentalHealthNote") ?? "");
  const mentalHealthFlagged = checkForDistressSignals(mentalHealthNote);
  const redFlagAcknowledgedAt = redFlagSigns.length > 0 ? new Date().toISOString() : null;

  const sharedFields = {
    anchorDate: formData.get("anchorDate"),
    side: formData.get("side"),
    currentMobilityAids: getAll(formData, "currentMobilityAids"),
    currentBootWedgeCount: getNumberOrUndefined(formData, "currentBootWedgeCount"),
    currentWeightBearingStatus: formData.get("currentWeightBearingStatus"),
    careTeamStatus: formData.get("careTeamStatus"),
    redFlagSigns,
    fitnessLevel: formData.get("fitnessLevel"),
    priorSports: getAll(formData, "priorSports"),
    exerciseFrequency: formData.get("exerciseFrequency"),
    recoveryGoal: formData.get("recoveryGoal"),
    dailyDemand: formData.get("dailyDemand"),
    hasStairsAtHome: formData.get("hasStairsAtHome"),
    homeNotes: formData.get("homeNotes") ?? "",
    availableEquipment: getAll(formData, "availableEquipment"),
    fitnessTracker: formData.get("fitnessTracker"),
    confidenceBaseline: getNumberOrUndefined(formData, "confidenceBaseline"),
    motivationBaseline: getNumberOrUndefined(formData, "motivationBaseline"),
    mentalHealthNote,
  };

  if (mode === "undecided") {
    const parsed = undecidedIntakeSchema.safeParse({ injuryType: "not_sure", ...sharedFields });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your answers and try again." };
    }
    return { ok: true, mode: "undecided", data: parsed.data, mentalHealthFlagged, redFlagAcknowledgedAt };
  }

  const parsed = intakeSchema.safeParse({
    injuryType: formData.get("injuryType"),
    ...sharedFields,
    ruptureType: formData.get("ruptureType"),
    tendonAugmentation: formData.get("tendonAugmentation") || undefined,
    preExistingTendinosis: formData.get("preExistingTendinosis"),
    ageRange: formData.get("ageRange") || undefined,
    conservativeFactors: getAll(formData, "conservativeFactors"),
    protocolPreference: formData.get("protocolPreference"),
    resolvedProtocolId: formData.get("resolvedProtocolId") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your answers and try again." };
  }
  return { ok: true, mode: "full", data: parsed.data, mentalHealthFlagged, redFlagAcknowledgedAt };
}

/** Builds the intake_responses insert row for a successfully-parsed intake. */
export function buildIntakeInsertRow(
  userId: string,
  parsed: Extract<ParsedIntake, { ok: true }>,
): TablesInsert<"intake_responses"> {
  const { mentalHealthFlagged, redFlagAcknowledgedAt } = parsed;

  if (parsed.mode === "undecided") {
    const data = parsed.data;
    return {
      user_id: userId,
      injury_type: "not_sure",
      injury_date: data.anchorDate,
      side: data.side,
      protocol_preference: "not_sure",
      current_mobility_aids: data.currentMobilityAids,
      current_boot_wedge_count: data.currentBootWedgeCount ?? null,
      current_weight_bearing_status: data.currentWeightBearingStatus,
      care_team_status: data.careTeamStatus,
      red_flag_signs: data.redFlagSigns,
      red_flag_acknowledged_at: redFlagAcknowledgedAt,
      fitness_level: data.fitnessLevel,
      prior_sports: data.priorSports,
      exercise_frequency: data.exerciseFrequency,
      recovery_goal: data.recoveryGoal,
      daily_demand: data.dailyDemand,
      has_stairs_at_home: data.hasStairsAtHome === "yes",
      home_notes: data.homeNotes || null,
      available_equipment: data.availableEquipment,
      fitness_tracker: data.fitnessTracker,
      confidence_baseline: data.confidenceBaseline,
      motivation_baseline: data.motivationBaseline,
      mental_health_baseline_note: data.mentalHealthNote || null,
      mental_health_flagged: mentalHealthFlagged,
    };
  }

  const data = parsed.data;
  const isSurgical = data.injuryType === "surgical";
  return {
    user_id: userId,
    injury_type: data.injuryType,
    injury_date: data.anchorDate,
    surgery_date: isSurgical ? data.anchorDate : null,
    side: data.side,
    rupture_type: data.ruptureType,
    tendon_augmentation: isSurgical ? data.tendonAugmentation ?? null : null,
    pre_existing_tendinosis: data.preExistingTendinosis,
    current_mobility_aids: data.currentMobilityAids,
    current_boot_wedge_count: data.currentBootWedgeCount ?? null,
    current_weight_bearing_status: data.currentWeightBearingStatus,
    care_team_status: data.careTeamStatus,
    red_flag_signs: data.redFlagSigns,
    red_flag_acknowledged_at: redFlagAcknowledgedAt,
    age_range: data.ageRange ?? null,
    conservative_factors: data.conservativeFactors,
    protocol_preference: data.protocolPreference,
    fitness_level: data.fitnessLevel,
    prior_sports: data.priorSports,
    exercise_frequency: data.exerciseFrequency,
    recovery_goal: data.recoveryGoal,
    daily_demand: data.dailyDemand,
    has_stairs_at_home: data.hasStairsAtHome === "yes",
    home_notes: data.homeNotes || null,
    available_equipment: data.availableEquipment,
    fitness_tracker: data.fitnessTracker,
    confidence_baseline: data.confidenceBaseline,
    motivation_baseline: data.motivationBaseline,
    mental_health_baseline_note: data.mentalHealthNote || null,
    mental_health_flagged: mentalHealthFlagged,
  };
}
