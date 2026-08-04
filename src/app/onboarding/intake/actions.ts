"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { intakeSchema, undecidedIntakeSchema } from "@/lib/intake/schema";
import { checkForDistressSignals } from "@/lib/safety/distress";
import { NONE_OF_THESE } from "@/lib/safety/red-flags";

export type IntakeActionState = {
  error?: string;
};

function getAll(formData: FormData, key: string): string[] {
  return formData.getAll(key).map(String);
}

function getNumberOrUndefined(formData: FormData, key: string): number | undefined {
  const value = formData.get(key);
  if (value === null || value === "") return undefined;
  return Number(value);
}

export async function submitIntakeAction(
  _prevState: IntakeActionState,
  formData: FormData,
): Promise<IntakeActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const mode = formData.get("mode");
  const redFlagSigns = getAll(formData, "redFlagSigns").filter((s) => s !== NONE_OF_THESE);
  const mentalHealthNote = String(formData.get("mentalHealthNote") ?? "");
  const mentalHealthFlagged = checkForDistressSignals(mentalHealthNote);

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

  const redFlagAcknowledgedAt = redFlagSigns.length > 0 ? new Date().toISOString() : null;

  if (mode === "undecided") {
    const parsed = undecidedIntakeSchema.safeParse({
      injuryType: "not_sure",
      ...sharedFields,
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Please check your answers and try again." };
    }

    const data = parsed.data;
    const { error } = await supabase.from("intake_responses").insert({
      user_id: user.id,
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
    });

    if (error) {
      return { error: "Something went wrong saving your answers. Please try again." };
    }

    redirect("/onboarding/confirm-treatment");
  }

  const injuryType = formData.get("injuryType");
  const parsed = intakeSchema.safeParse({
    injuryType,
    ...sharedFields,
    ruptureType: formData.get("ruptureType"),
    tendonAugmentation: formData.get("tendonAugmentation") || undefined,
    preExistingTendinosis: formData.get("preExistingTendinosis"),
    ageRange: formData.get("ageRange") || undefined,
    conservativeFactors: getAll(formData, "conservativeFactors"),
    protocolPreference: formData.get("protocolPreference"),
    resolvedProtocolId: formData.get("resolvedProtocolId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your answers and try again." };
  }

  const data = parsed.data;
  const isSurgical = data.injuryType === "surgical";

  const { error: intakeError } = await supabase.from("intake_responses").insert({
    user_id: user.id,
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
  });

  if (intakeError) {
    return { error: "Something went wrong saving your answers. Please try again." };
  }

  const { error: selectionError } = await supabase.from("user_protocol_selections").insert({
    user_id: user.id,
    protocol_id: data.resolvedProtocolId,
    anchor_date: data.anchorDate,
    status: "draft_pending_review",
  });

  if (selectionError) {
    return { error: "Something went wrong setting up your plan. Please try again." };
  }

  redirect("/plan/review");
}
