import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { UnverifiedProtocolBadge } from "@/components/protocol/unverified-protocol-badge";
import { ClearRestartButton } from "@/components/profile/clear-restart-button";
import { computeCurrentPhase, type PhaseRow } from "@/lib/plan/current-phase";
import {
  AGE_RANGES,
  CARE_TEAM_STATUSES,
  DAILY_DEMANDS,
  EXERCISE_FREQUENCIES,
  FITNESS_LEVELS,
  FITNESS_TRACKERS,
  PROTOCOL_OPTIONS,
  RECOVERY_GOALS,
  RUPTURE_TYPES,
  WEIGHT_BEARING_STATUSES,
  YES_NO_NOT_SURE,
} from "@/lib/intake/schema";

function labelFor(options: readonly { value: string; label: string }[], value: string | null | undefined): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-neutral-900 dark:text-neutral-100">{value}</dd>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-sm font-semibold text-teal-700 dark:text-teal-400">{title}</h2>
      <dl className="grid grid-cols-2 gap-3">{children}</dl>
    </section>
  );
}

export default async function ProfilePage() {
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
    .select("id, protocol_id, anchor_date")
    .eq("user_id", user.id)
    .neq("status", "discontinued")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let protocol: { id: string; name: string; is_verified: boolean } | null = null;
  let currentPhaseLabel: string | null = null;

  if (selection) {
    const { data: protocolRow } = await supabase
      .from("protocols")
      .select("id, name, is_verified")
      .eq("id", selection.protocol_id)
      .maybeSingle();
    protocol = protocolRow;

    const { data: phases } = await supabase
      .from("protocol_phases")
      .select(
        "id, order_index, number, name, timeframe_label, timeframe_start_days, timeframe_end_days, goals, weight_bearing, gait_training, achilles_interventions, rest_of_body_interventions, criteria_to_progress, criteria_to_discharge, continues_from_order_indexes, assistive_devices",
      )
      .eq("protocol_id", selection.protocol_id)
      .order("order_index", { ascending: true });

    if (phases && phases.length > 0) {
      const phase = computeCurrentPhase(phases as PhaseRow[], selection.anchor_date);
      currentPhaseLabel = phase.name ?? phase.timeframe_label;
    }
  }

  const priorSports = Array.isArray(intake.prior_sports)
    ? (intake.prior_sports as unknown[]).filter((s): s is string => typeof s === "string")
    : [];

  const injuryTypeLabel =
    intake.injury_type === "surgical" ? "Surgical repair" : intake.injury_type === "non_surgical" ? "Non-surgical" : "Not sure yet";

  const protocolPreferenceLabel =
    intake.protocol_preference === "upload_own"
      ? "Uploaded your own protocol"
      : PROTOCOL_OPTIONS.find((p) => p.id === selection?.protocol_id)?.label ?? labelFor(YES_NO_NOT_SURE, null);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
      <div>
        <p className="text-sm font-medium text-teal-700 dark:text-teal-400">Profile</p>
        <h1 className="text-2xl font-bold tracking-tight">Your intake &amp; protocol</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          What Achilla has on file from your onboarding questionnaire, and the protocol it&apos;s driving.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border-2 border-teal-300 bg-teal-50 p-4 dark:border-teal-700 dark:bg-teal-950/40">
        <h2 className="text-sm font-semibold text-teal-800 dark:text-teal-200">Current protocol</h2>
        {selection && protocol ? (
          <>
            <p className="text-lg font-semibold text-teal-950 dark:text-teal-50">{protocol.name}</p>
            {protocol.is_verified === false && <UnverifiedProtocolBadge />}
            <p className="text-sm text-teal-900 dark:text-teal-100">
              Anchor date {selection.anchor_date}
              {currentPhaseLabel ? ` · Currently: ${currentPhaseLabel}` : ""}
            </p>
            <Link href="/plan/review" className="text-sm font-semibold underline">
              View full plan &amp; phase breakdown →
            </Link>
          </>
        ) : (
          <p className="text-sm text-teal-900 dark:text-teal-100">
            No active protocol yet. {intake.protocol_preference === "upload_own" ? (
              <Link href="/protocol/upload" className="font-semibold underline">
                Finish uploading your protocol →
              </Link>
            ) : (
              <Link href="/onboarding/confirm-treatment" className="font-semibold underline">
                Confirm your treatment track →
              </Link>
            )}
          </p>
        )}
      </section>

      <SectionCard title="Treatment &amp; injury">
        <Field label="Treatment" value={injuryTypeLabel} />
        <Field label="Side" value={intake.side === "left" ? "Left" : intake.side === "right" ? "Right" : null} />
        <Field label="Rupture type" value={labelFor(RUPTURE_TYPES, intake.rupture_type)} />
        <Field label="Prior tendinosis" value={labelFor(YES_NO_NOT_SURE, intake.pre_existing_tendinosis)} />
        <Field label="Protocol" value={protocolPreferenceLabel} />
      </SectionCard>

      <SectionCard title="Current status">
        <Field label="Weight-bearing" value={labelFor(WEIGHT_BEARING_STATUSES, intake.current_weight_bearing_status)} />
        <Field label="Care team" value={labelFor(CARE_TEAM_STATUSES, intake.care_team_status)} />
        <Field
          label="Mobility aids"
          value={
            Array.isArray(intake.current_mobility_aids) && intake.current_mobility_aids.length > 0
              ? (intake.current_mobility_aids as unknown[]).join(", ")
              : "None"
          }
        />
      </SectionCard>

      <SectionCard title="Baseline activity &amp; goals">
        <Field label="Fitness level" value={labelFor(FITNESS_LEVELS as unknown as { value: string; label: string }[], intake.fitness_level)} />
        <Field label="Exercise frequency" value={labelFor(EXERCISE_FREQUENCIES, intake.exercise_frequency)} />
        <Field label="Recovery goal" value={labelFor(RECOVERY_GOALS, intake.recovery_goal)} />
        <Field label="Daily demand" value={labelFor(DAILY_DEMANDS, intake.daily_demand)} />
        <Field label="Fitness tracker" value={labelFor(FITNESS_TRACKERS, intake.fitness_tracker)} />
        <Field label="Age range" value={labelFor(AGE_RANGES, intake.age_range)} />
        {priorSports.length > 0 && <Field label="Prior activities" value={priorSports.join(", ")} />}
      </SectionCard>

      <div className="flex flex-col gap-3">
        <Link
          href="/profile/edit"
          className="flex min-h-14 items-center justify-center rounded-xl bg-teal-700 px-6 text-lg font-semibold text-white active:bg-teal-800"
        >
          Edit my answers
        </Link>
        <ClearRestartButton />
      </div>

      <DisclaimerBanner />
    </main>
  );
}
