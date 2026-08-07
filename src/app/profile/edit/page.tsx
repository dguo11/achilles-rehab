import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IntakeWizard, type Answers } from "@/components/intake/intake-wizard";
import { updateIntakeAction } from "@/app/profile/actions";
import { PROTOCOL_OPTIONS, type ProtocolId } from "@/lib/intake/schema";

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: intake } = await supabase
    .from("intake_responses")
    .select("*")
    .eq("user_id", user.id)
    .is("superseded_at", null)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!intake) redirect("/onboarding/intake");

  const { data: selection } = await supabase
    .from("user_protocol_selections")
    .select("protocol_id")
    .eq("user_id", user.id)
    .neq("status", "discontinued")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const resolvedProtocolId: ProtocolId | null =
    (PROTOCOL_OPTIONS.find((p) => p.id === selection?.protocol_id)?.id as ProtocolId | undefined) ?? null;

  const initialAnswers: Partial<Answers> = {
    injuryType: intake.injury_type as Answers["injuryType"],
    anchorDate: intake.injury_date,
    side: intake.side as Answers["side"],
    ruptureType: intake.rupture_type,
    tendonAugmentation: intake.tendon_augmentation,
    preExistingTendinosis: intake.pre_existing_tendinosis,
    currentMobilityAids: toStringArray(intake.current_mobility_aids),
    currentBootWedgeCount: intake.current_boot_wedge_count != null ? String(intake.current_boot_wedge_count) : "",
    currentWeightBearingStatus: intake.current_weight_bearing_status,
    careTeamStatus: intake.care_team_status,
    redFlagSigns: toStringArray(intake.red_flag_signs),
    redFlagAcknowledged: intake.red_flag_acknowledged_at != null,
    ageRange: intake.age_range,
    conservativeFactors: toStringArray(intake.conservative_factors),
    protocolPreference: intake.protocol_preference as Answers["protocolPreference"],
    resolvedProtocolId,
    fitnessLevel: intake.fitness_level ?? "",
    priorSports: toStringArray(intake.prior_sports),
    exerciseFrequency: intake.exercise_frequency,
    recoveryGoal: intake.recovery_goal,
    dailyDemand: intake.daily_demand,
    hasStairsAtHome: intake.has_stairs_at_home == null ? null : intake.has_stairs_at_home ? "yes" : "no",
    homeNotes: intake.home_notes ?? "",
    availableEquipment: toStringArray(intake.available_equipment),
    fitnessTracker: intake.fitness_tracker,
    confidenceBaseline: intake.confidence_baseline,
    motivationBaseline: intake.motivation_baseline,
    mentalHealthNote: intake.mental_health_baseline_note ?? "",
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
      <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
        Editing your answers. Page through and change what you need — anything you leave as-is stays
        the same. Changing your protocol, anchor date, or treatment track will re-lock your plan for
        PT review.
      </p>
      <IntakeWizard initialAnswers={initialAnswers} submitAction={updateIntakeAction} submitLabel="Save changes" />
    </main>
  );
}
