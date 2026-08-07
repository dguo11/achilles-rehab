import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { PlanAcknowledgeForm } from "@/components/plan/plan-acknowledge-form";
import {
  AssistiveDevicesList,
  ExercisePlanList,
  GaitTrainingList,
  GoalsList,
  RedFlagsCard,
  WeightBearingDisplay,
} from "@/components/plan/plan-display";
import { generatePlanSnapshot, type PlanSnapshot } from "@/lib/plan/generate";
import type { PhaseRow } from "@/lib/plan/current-phase";
import type { Database } from "@/lib/supabase/database.types";
import { UnverifiedProtocolBadge } from "@/components/protocol/unverified-protocol-badge";

const PHASE_COLUMNS =
  "id, order_index, number, name, timeframe_label, timeframe_start_days, timeframe_end_days, goals, weight_bearing, gait_training, achilles_interventions, rest_of_body_interventions, criteria_to_progress, criteria_to_discharge, continues_from_order_indexes, assistive_devices";

export default async function PlanReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: selection } = await supabase
    .from("user_protocol_selections")
    .select("id, protocol_id, anchor_date, status")
    .eq("user_id", user.id)
    .neq("status", "discontinued")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!selection) {
    redirect("/onboarding/intake");
  }

  const { data: protocol } = await supabase
    .from("protocols")
    .select("id, name, red_flags, is_verified")
    .eq("id", selection.protocol_id)
    .single();

  const { data: phases } = await supabase
    .from("protocol_phases")
    .select(PHASE_COLUMNS)
    .eq("protocol_id", selection.protocol_id)
    .order("order_index", { ascending: true });

  if (!protocol || !phases || phases.length === 0) {
    // Data integrity problem, not a user error — surface plainly rather
    // than silently redirecting somewhere confusing.
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-5 py-10">
        <h1 className="text-xl font-bold">Something&apos;s not right</h1>
        <p className="text-neutral-600 dark:text-neutral-300">
          We couldn&apos;t load your protocol data. Please contact support.
        </p>
      </main>
    );
  }

  const { data: intake } = await supabase
    .from("intake_responses")
    .select("fitness_level, exercise_frequency, recovery_goal, current_weight_bearing_status")
    .eq("user_id", user.id)
    .is("superseded_at", null)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let { data: review } = await supabase
    .from("plan_reviews")
    .select("id, acknowledged, acknowledged_at, generated_plan_snapshot")
    .eq("user_protocol_selection_id", selection.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!review) {
    const snapshot = await generatePlanSnapshot({
      protocol,
      phases: phases as PhaseRow[],
      anchorDate: selection.anchor_date,
      intake: {
        fitness_level: intake?.fitness_level ?? null,
        exercise_frequency: intake?.exercise_frequency ?? null,
        recovery_goal: intake?.recovery_goal ?? null,
        current_weight_bearing_status: intake?.current_weight_bearing_status ?? null,
      },
    });

    const { data: inserted, error: insertError } = await supabase
      .from("plan_reviews")
      .insert({
        user_id: user.id,
        user_protocol_selection_id: selection.id,
        generated_plan_snapshot: snapshot as unknown as Database["public"]["Tables"]["plan_reviews"]["Insert"]["generated_plan_snapshot"],
      })
      .select("id, acknowledged, acknowledged_at, generated_plan_snapshot")
      .single();

    if (insertError || !inserted) {
      return (
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-5 py-10">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-neutral-600 dark:text-neutral-300">
            We couldn&apos;t generate your plan just now. Please refresh this page to try again.
          </p>
        </main>
      );
    }
    review = inserted;
  }

  const snapshot = review.generated_plan_snapshot as unknown as PlanSnapshot;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
      <div>
        <p className="text-sm font-medium text-teal-700 dark:text-teal-400">
          {snapshot.protocolName}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          {snapshot.phase.name ?? snapshot.phase.timeframeLabel}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {snapshot.phase.timeframeLabel}
          {snapshot.phase.number ? ` · Phase ${snapshot.phase.number}` : ""}
        </p>
        {snapshot.protocolIsVerified === false && <UnverifiedProtocolBadge />}
      </div>

      {!review.acknowledged && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          This plan is for review with your physical therapist. Your daily tracker stays locked
          until you confirm below.
        </div>
      )}

      {snapshot.statusCheck?.mismatch && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-semibold">Double-check with your PT</p>
          <p className="mt-1">{snapshot.statusCheck.message}</p>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
          0 · Phase summary &amp; goal
        </p>
        <h2 className="text-lg font-semibold">Goals for this phase</h2>
        <GoalsList goals={snapshot.phase.goals} />
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
          1 · Weight-bearing status &amp; gait training
        </p>
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Weight-bearing</h2>
          <WeightBearingDisplay weightBearing={snapshot.phase.weightBearing} />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Assistive devices</h3>
          <AssistiveDevicesList devices={snapshot.phase.assistiveDevices} />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Gait training</h3>
          <GaitTrainingList gaitTraining={snapshot.phase.gaitTraining} />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
          2 · Achilles rehab &amp; exercises
        </p>
        <h2 className="text-lg font-semibold">Ankle / Achilles / calf exercises</h2>
        <ExercisePlanList exercisePlan={snapshot.exercisePlan} region="achilles" />
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
          3 · Rest of body exercises
        </p>
        <h2 className="text-lg font-semibold">Everything else</h2>
        <ExercisePlanList exercisePlan={snapshot.exercisePlan} region="rest_of_body" />
      </section>

      <RedFlagsCard redFlags={snapshot.redFlags} />

      <DisclaimerBanner />

      {review.acknowledged ? (
        <div className="rounded-2xl border-2 border-teal-300 bg-teal-50 p-5 text-teal-950 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-100">
          <p className="font-semibold">Reviewed and unlocked</p>
          <p className="mt-1 text-sm">
            Confirmed{" "}
            {review.acknowledged_at
              ? new Date(review.acknowledged_at).toLocaleString()
              : ""}
            . Your daily tracker is coming in the next phase of this build.
          </p>
        </div>
      ) : (
        <PlanAcknowledgeForm planReviewId={review.id} />
      )}
    </main>
  );
}
