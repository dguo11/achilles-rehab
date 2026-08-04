import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DisclaimerBanner } from "@/components/disclaimer-banner";

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: entries }, { data: logs }, { data: notes }] = await Promise.all([
    supabase.from("daily_plan_entries").select("plan_date").eq("user_id", user.id),
    supabase
      .from("session_logs")
      .select("plan_date, daily_plan_entry_id, completed")
      .eq("user_id", user.id),
    supabase.from("daily_notes").select("note_date, flagged_red_flag").eq("user_id", user.id),
  ]);

  const dateSet = new Set<string>();
  const totalByDate = new Map<string, number>();
  for (const e of entries ?? []) {
    dateSet.add(e.plan_date);
    totalByDate.set(e.plan_date, (totalByDate.get(e.plan_date) ?? 0) + 1);
  }
  const completedByDate = new Map<string, number>();
  for (const l of logs ?? []) {
    dateSet.add(l.plan_date);
    if (l.daily_plan_entry_id && l.completed) {
      completedByDate.set(l.plan_date, (completedByDate.get(l.plan_date) ?? 0) + 1);
    }
  }
  const flaggedDates = new Set<string>();
  for (const n of notes ?? []) {
    dateSet.add(n.note_date);
    if (n.flagged_red_flag) flaggedDates.add(n.note_date);
  }

  const dates = [...dateSet].sort((a, b) => (a < b ? 1 : -1));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-teal-700 dark:text-teal-400">History</p>
          <h1 className="text-2xl font-bold tracking-tight">Your logged days</h1>
        </div>
        <Link
          href="/calendar"
          className="text-sm font-semibold text-teal-700 underline underline-offset-2 dark:text-teal-400"
        >
          Calendar
        </Link>
      </div>

      {dates.length === 0 ? (
        <p className="text-neutral-600 dark:text-neutral-300">
          Nothing logged yet — head to Today to get started.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {dates.map((date) => {
            const total = totalByDate.get(date) ?? 0;
            const completed = completedByDate.get(date) ?? 0;
            const flagged = flaggedDates.has(date);
            return (
              <li key={date}>
                <Link
                  href={`/history/${date}`}
                  className="flex items-center justify-between rounded-xl border-2 border-neutral-200 px-4 py-3 active:bg-neutral-50 dark:border-neutral-800 dark:active:bg-neutral-900"
                >
                  <span className="font-medium">{formatDate(date)}</span>
                  <span className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                    {total > 0 && (
                      <span>
                        {completed}/{total} done
                      </span>
                    )}
                    {flagged && (
                      <span
                        className="h-2 w-2 rounded-full bg-amber-500"
                        title="Flagged note this day"
                        aria-label="Flagged note this day"
                      />
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <DisclaimerBanner />
    </main>
  );
}
