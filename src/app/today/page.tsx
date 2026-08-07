import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeCurrentPhase, type PhaseRow } from "@/lib/plan/current-phase";
import { ensureTodayEntries } from "@/lib/plan/materialize";
import type { PlanSnapshot } from "@/lib/plan/generate";
import { ExerciseItem } from "@/components/today/exercise-item";
import { SessionSummaryForm } from "@/components/today/session-summary-form";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { UnverifiedProtocolBadge } from "@/components/protocol/unverified-protocol-badge";

const PHASE_COLUMNS =
  "id, order_index, number, name, timeframe_label, timeframe_start_days, timeframe_end_days, goals, weight_bearing, gait_training, achilles_interventions, rest_of_body_interventions, criteria_to_progress, criteria_to_discharge, continues_from_order_indexes, assistive_devices";

const ENTRY_COLUMNS =
  "id, exercise_name, suggested_sets, suggested_reps, suggested_frequency, dosage_source, region, source, workout_type, sort_order";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function ExerciseList({
  entries,
  planDate,
  completedByEntryId,
  feedbackByEntryId,
}: {
  entries: {
    id: string;
    exercise_name: string;
    suggested_sets: number | null;
    suggested_reps: number | null;
    suggested_frequency: string | null;
    dosage_source: string;
    source: string;
  }[];
  planDate: string;
  completedByEntryId: Map<string, boolean>;
  feedbackByEntryId: Map<string, { liked: boolean | null; caused_pain: boolean | null }>;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => (
        <ExerciseItem
          key={entry.id}
          id={entry.id}
          planDate={planDate}
          exerciseName={entry.exercise_name}
          sets={entry.suggested_sets}
          reps={entry.suggested_reps}
          frequency={entry.suggested_frequency}
          dosageSource={entry.dosage_source}
          initiallyCompleted={completedByEntryId.get(entry.id) ?? false}
          isCustomGenerated={entry.source === "custom-generated"}
          initiallyLiked={feedbackByEntryId.get(entry.id)?.liked ?? null}
          initiallyCausedPain={feedbackByEntryId.get(entry.id)?.caused_pain ?? null}
        />
      ))}
    </ul>
  );
}

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: selection } = await supabase
    .from("user_protocol_selections")
    .select("id, protocol_id, anchor_date, current_phase_order_index, status")
    .eq("user_id", user.id)
    .neq("status", "discontinued")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!selection) redirect("/onboarding/intake");

  const { data: review } = await supabase
    .from("plan_reviews")
    .select("id, acknowledged, generated_plan_snapshot")
    .eq("user_protocol_selection_id", selection.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // The gate: no daily tracker until the plan has been reviewed with a PT.
  if (!review || !review.acknowledged) redirect("/plan/review");

  const { data: phases } = await supabase
    .from("protocol_phases")
    .select(PHASE_COLUMNS)
    .eq("protocol_id", selection.protocol_id)
    .order("order_index", { ascending: true });

  const activePhase = (phases as PhaseRow[] | null)?.find(
    (p) => p.order_index === selection.current_phase_order_index,
  );

  if (!phases || phases.length === 0 || !activePhase) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-5 py-10">
        <h1 className="text-xl font-bold">Something&apos;s not right</h1>
        <p className="text-neutral-600 dark:text-neutral-300">
          We couldn&apos;t load your current phase. Please contact support.
        </p>
      </main>
    );
  }

  const planDate = todayIso();
  const snapshot = review.generated_plan_snapshot as unknown as PlanSnapshot;

  const { data: intake } = await supabase
    .from("intake_responses")
    .select("fitness_level, exercise_frequency, recovery_goal, available_equipment")
    .eq("user_id", user.id)
    .is("superseded_at", null)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await ensureTodayEntries({
    supabase,
    userId: user.id,
    userProtocolSelectionId: selection.id,
    phaseId: activePhase.id,
    snapshot,
    planDate,
    profile: {
      fitnessLevel: intake?.fitness_level ?? null,
      exerciseFrequency: intake?.exercise_frequency ?? null,
      recoveryGoal: intake?.recovery_goal ?? null,
      availableEquipment: toStringArray(intake?.available_equipment),
    },
  });

  const { data: entries } = await supabase
    .from("daily_plan_entries")
    .select(ENTRY_COLUMNS)
    .eq("user_protocol_selection_id", selection.id)
    .eq("plan_date", planDate)
    .order("sort_order", { ascending: true });

  const { data: workoutPlan } = await supabase
    .from("daily_workout_plans")
    .select("protocol_suggestion_summary")
    .eq("user_protocol_selection_id", selection.id)
    .eq("plan_date", planDate)
    .maybeSingle();

  const { data: logs } = await supabase
    .from("session_logs")
    .select("id, daily_plan_entry_id, completed, liked, caused_pain, pain_level, effort_level, notes, duration_minutes")
    .eq("user_id", user.id)
    .eq("plan_date", planDate);

  const completedByEntryId = new Map(
    (logs ?? []).filter((l) => l.daily_plan_entry_id).map((l) => [l.daily_plan_entry_id as string, l.completed]),
  );
  const feedbackByEntryId = new Map(
    (logs ?? [])
      .filter((l) => l.daily_plan_entry_id)
      .map((l) => [l.daily_plan_entry_id as string, { liked: l.liked, caused_pain: l.caused_pain }]),
  );
  const summaryLog = (logs ?? []).find((l) => !l.daily_plan_entry_id) ?? null;

  const suggestedPhase = computeCurrentPhase(phases as PhaseRow[], selection.anchor_date);
  const canAdvance = suggestedPhase.order_index > activePhase.order_index;

  const allEntries = entries ?? [];
  const achillesEntries = allEntries.filter((e) => e.region === "achilles");
  const restOfBodyEntries = allEntries.filter((e) => e.region === "rest_of_body");
  const otherEntries = allEntries.filter((e) => e.region !== "achilles" && e.region !== "rest_of_body");
  const customEntries = restOfBodyEntries.filter((e) => e.source === "custom-generated");
  const strengthEntries = customEntries.filter((e) => e.workout_type === "strength");
  const cardioEntries = customEntries.filter((e) => e.workout_type === "cardio");
  const protocolFallbackEntries = restOfBodyEntries.filter((e) => e.source !== "custom-generated");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
      <div>
        <p className="text-sm font-medium text-teal-700 dark:text-teal-400">Today</p>
        <h1 className="text-2xl font-bold tracking-tight">
          {activePhase.name ?? activePhase.timeframe_label}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{activePhase.timeframe_label}</p>
        {snapshot.protocolIsVerified === false && <UnverifiedProtocolBadge />}
      </div>

      {canAdvance && (
        <div className="rounded-2xl border-2 border-teal-300 bg-teal-50 p-4 text-sm text-teal-950 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-100">
          <p className="font-semibold">You may be ready for the next phase</p>
          <p className="mt-1">Based on your dates, you&apos;ve reached the next timeframe in your protocol.</p>
          <Link href="/plan/advance" className="mt-2 inline-block font-semibold underline">
            Review and confirm →
          </Link>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Achilles rehab &amp; exercises</h2>
        {achillesEntries.length > 0 ? (
          <ExerciseList
            entries={achillesEntries}
            planDate={planDate}
            completedByEntryId={completedByEntryId}
            feedbackByEntryId={feedbackByEntryId}
          />
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No ankle/Achilles-specific exercises listed for this phase — follow your PT&apos;s home program.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Rest of body</h2>

        {customEntries.length > 0 ? (
          <>
            <div className="rounded-xl bg-neutral-100 p-3 text-sm text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
              <p className="font-medium text-neutral-900 dark:text-neutral-100">
                I created a custom workout plan based on what the protocol suggested.
              </p>
              {workoutPlan?.protocol_suggestion_summary && (
                <p className="mt-1.5 text-neutral-600 dark:text-neutral-400">
                  <span className="font-medium">Protocol suggestion: </span>
                  {workoutPlan.protocol_suggestion_summary}
                </p>
              )}
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
                Suggested — confirm with your PT. Tell us how each one goes below so tomorrow&apos;s plan can adjust.
              </p>
            </div>

            {strengthEntries.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Strength</h3>
                <ExerciseList
                  entries={strengthEntries}
                  planDate={planDate}
                  completedByEntryId={completedByEntryId}
                  feedbackByEntryId={feedbackByEntryId}
                />
              </div>
            )}
            {cardioEntries.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Cardio</h3>
                <ExerciseList
                  entries={cardioEntries}
                  planDate={planDate}
                  completedByEntryId={completedByEntryId}
                  feedbackByEntryId={feedbackByEntryId}
                />
              </div>
            )}
          </>
        ) : protocolFallbackEntries.length > 0 ? (
          <ExerciseList
            entries={protocolFallbackEntries}
            planDate={planDate}
            completedByEntryId={completedByEntryId}
            feedbackByEntryId={feedbackByEntryId}
          />
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No rest-of-body exercises listed for this phase.
          </p>
        )}
      </section>

      {otherEntries.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Other exercises</h2>
          <ExerciseList
            entries={otherEntries}
            planDate={planDate}
            completedByEntryId={completedByEntryId}
            feedbackByEntryId={feedbackByEntryId}
          />
        </section>
      )}

      <SessionSummaryForm
        planDate={planDate}
        initial={{
          painLevel: summaryLog?.pain_level ?? null,
          effortLevel: summaryLog?.effort_level ?? null,
          notes: summaryLog?.notes ?? null,
          durationMinutes: summaryLog?.duration_minutes ?? null,
        }}
      />

      <Link
        href="/notes"
        className="flex min-h-14 items-center justify-center rounded-xl border-2 border-neutral-300 px-6 text-base font-semibold text-neutral-800 active:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:active:bg-neutral-900"
      >
        Add today&apos;s health note
      </Link>

      <Link
        href="/protocol/upload"
        className="text-center text-sm font-medium text-neutral-500 underline-offset-2 hover:underline dark:text-neutral-400"
      >
        Using a different written protocol? Upload it
      </Link>

      <DisclaimerBanner />
    </main>
  );
}
