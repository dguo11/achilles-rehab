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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
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

  await ensureTodayEntries({
    supabase,
    userId: user.id,
    userProtocolSelectionId: selection.id,
    phaseId: activePhase.id,
    snapshot,
    planDate,
  });

  const { data: entries } = await supabase
    .from("daily_plan_entries")
    .select("id, exercise_name, suggested_sets, suggested_reps, suggested_frequency, dosage_source, sort_order")
    .eq("user_protocol_selection_id", selection.id)
    .eq("plan_date", planDate)
    .order("sort_order", { ascending: true });

  const { data: logs } = await supabase
    .from("session_logs")
    .select("id, daily_plan_entry_id, completed, pain_level, effort_level, notes, duration_minutes")
    .eq("user_id", user.id)
    .eq("plan_date", planDate);

  const completedByEntryId = new Map(
    (logs ?? []).filter((l) => l.daily_plan_entry_id).map((l) => [l.daily_plan_entry_id as string, l.completed]),
  );
  const summaryLog = (logs ?? []).find((l) => !l.daily_plan_entry_id) ?? null;

  const suggestedPhase = computeCurrentPhase(phases as PhaseRow[], selection.anchor_date);
  const canAdvance = suggestedPhase.order_index > activePhase.order_index;

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

      <section>
        <h2 className="text-lg font-semibold">Today&apos;s exercises</h2>
        {entries && entries.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
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
              />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            No specific exercises listed for this phase — follow your PT&apos;s home program.
          </p>
        )}
      </section>

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
