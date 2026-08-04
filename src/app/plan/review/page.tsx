import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { PhaseSummary } from "@/components/plan/phase-summary";
import { RedFlagsPanel } from "@/components/plan/red-flags-panel";
import { ExerciseList } from "@/components/plan/exercise-list";
import { AcknowledgeForm } from "@/components/plan/acknowledge-form";
import { ensurePlanGenerated } from "@/lib/plan/generate";
import type { PlanSnapshot } from "@/lib/plan/types";

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
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "discontinued")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!selection) {
    redirect("/onboarding/intake");
  }

  const review = await ensurePlanGenerated(supabase, user.id, selection);

  if (review.acknowledged) {
    redirect("/today");
  }

  const snapshot = review.generated_plan_snapshot as unknown as PlanSnapshot;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review your plan</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-300">
          Generated from the <span className="font-semibold">{snapshot.protocol.name}</span> protocol. Nothing here
          replaces your surgeon or physical therapist — review it with them before you start.
        </p>
      </div>

      <DisclaimerBanner />

      <PhaseSummary phase={snapshot.phase} />

      {snapshot.protocol.globalNotes.length > 0 && (
        <section className="rounded-2xl border-2 border-neutral-200 p-5 dark:border-neutral-800">
          <h2 className="text-lg font-bold">Notes on this protocol</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
            {snapshot.protocol.globalNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}

      <RedFlagsPanel protocol={snapshot.protocol} />

      <ExerciseList exercises={snapshot.exercises} />

      <AcknowledgeForm planReviewId={review.id} />
    </main>
  );
}
