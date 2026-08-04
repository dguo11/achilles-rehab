import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkPlanAcknowledged } from "@/lib/plan/gate";
import { DisclaimerBanner } from "@/components/disclaimer-banner";

// A minimal read of today's plan entries. This exists in Phase 3 mainly to
// prove the PT-review gate actually blocks the tracker end to end; logging
// completion/pain/effort and the rest of the daily-tracker UI is Phase 4.
export default async function TodayPage() {
  const gate = await checkPlanAcknowledged();

  if (!gate.ok) {
    if (gate.reason === "unauthenticated") redirect("/login");
    if (gate.reason === "no_selection") redirect("/onboarding/intake");
    redirect("/plan/review");
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: entries } = await supabase
    .from("daily_plan_entries")
    .select("*")
    .eq("user_protocol_selection_id", gate.selectionId)
    .eq("plan_date", today)
    .order("sort_order");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Today</h1>

      {!entries || entries.length === 0 ? (
        <p className="text-neutral-600 dark:text-neutral-300">
          Nothing scheduled for today yet. Logging and adjustments are coming in the next update.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <p className="font-semibold">{entry.exercise_name}</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                {[
                  entry.suggested_sets ? `${entry.suggested_sets} sets` : null,
                  entry.suggested_reps ? `${entry.suggested_reps} reps` : null,
                  entry.suggested_frequency,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Dosage not yet set"}
              </p>
            </li>
          ))}
        </ul>
      )}

      <DisclaimerBanner />
    </main>
  );
}
