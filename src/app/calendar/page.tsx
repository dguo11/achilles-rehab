import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DisclaimerBanner } from "@/components/disclaimer-banner";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const today = new Date();
  const year = params.year ? Number(params.year) : today.getFullYear();
  const month = params.month ? Number(params.month) - 1 : today.getMonth(); // 0-indexed

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay(); // 0 = Sunday

  const rangeStart = isoDate(year, month, 1);
  const rangeEnd = isoDate(year, month, daysInMonth);
  const todayIso = isoDate(today.getFullYear(), today.getMonth(), today.getDate());

  const [{ data: entries }, { data: logs }, { data: notes }] = await Promise.all([
    supabase
      .from("daily_plan_entries")
      .select("id, plan_date")
      .eq("user_id", user.id)
      .gte("plan_date", rangeStart)
      .lte("plan_date", rangeEnd),
    supabase
      .from("session_logs")
      .select("plan_date, daily_plan_entry_id, completed")
      .eq("user_id", user.id)
      .gte("plan_date", rangeStart)
      .lte("plan_date", rangeEnd),
    supabase
      .from("daily_notes")
      .select("note_date, flagged_red_flag")
      .eq("user_id", user.id)
      .gte("note_date", rangeStart)
      .lte("note_date", rangeEnd),
  ]);

  const totalByDate = new Map<string, number>();
  for (const e of entries ?? []) {
    totalByDate.set(e.plan_date, (totalByDate.get(e.plan_date) ?? 0) + 1);
  }
  const completedByDate = new Map<string, number>();
  for (const l of logs ?? []) {
    if (l.daily_plan_entry_id && l.completed) {
      completedByDate.set(l.plan_date, (completedByDate.get(l.plan_date) ?? 0) + 1);
    }
  }
  const flaggedDates = new Set((notes ?? []).filter((n) => n.flagged_red_flag).map((n) => n.note_date));
  const notedDates = new Set((notes ?? []).map((n) => n.note_date));

  const cells: { day: number | null; date: string | null }[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, date: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, date: isoDate(year, month, d) });

  function adherenceClasses(date: string) {
    const total = totalByDate.get(date) ?? 0;
    const completed = completedByDate.get(date) ?? 0;
    if (total === 0) {
      return notedDates.has(date)
        ? "border-neutral-300 bg-white text-neutral-800 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        : "border-neutral-200 bg-neutral-50 text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-600";
    }
    if (completed === total) {
      return "border-teal-600 bg-teal-600 text-white";
    }
    if (completed > 0) {
      return "border-amber-400 bg-amber-100 text-amber-950 dark:border-amber-600 dark:bg-amber-900/50 dark:text-amber-100";
    }
    return "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100";
  }

  const prevMonth = month === 0 ? 12 : month;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 1 : month + 2;
  const nextYear = month === 11 ? year + 1 : year;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-teal-700 dark:text-teal-400">Calendar</p>
          <h1 className="text-2xl font-bold tracking-tight">
            {MONTH_NAMES[month]} {year}
          </h1>
        </div>
        <Link
          href="/history"
          className="text-sm font-semibold text-teal-700 underline underline-offset-2 dark:text-teal-400"
        >
          List view
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <Link
          href={`/calendar?year=${prevYear}&month=${prevMonth}`}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-600 active:bg-neutral-100 dark:text-neutral-300 dark:active:bg-neutral-900"
        >
          ← Prev
        </Link>
        <Link
          href={`/calendar?year=${today.getFullYear()}&month=${today.getMonth() + 1}`}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-600 active:bg-neutral-100 dark:text-neutral-300 dark:active:bg-neutral-900"
        >
          Today
        </Link>
        <Link
          href={`/calendar?year=${nextYear}&month=${nextMonth}`}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-600 active:bg-neutral-100 dark:text-neutral-300 dark:active:bg-neutral-900"
        >
          Next →
        </Link>
      </div>

      <div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-neutral-500 dark:text-neutral-400">
          {WEEKDAY_LABELS.map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell.date) return <div key={i} />;
            const isToday = cell.date === todayIso;
            const flagged = flaggedDates.has(cell.date);
            const hasData = (totalByDate.get(cell.date) ?? 0) > 0 || notedDates.has(cell.date);
            const content = (
              <div
                className={`relative flex aspect-square items-center justify-center rounded-lg border-2 text-sm font-medium ${adherenceClasses(cell.date)} ${isToday ? "ring-2 ring-teal-700 ring-offset-1 dark:ring-teal-400" : ""}`}
              >
                {cell.day}
                {flagged && (
                  <span
                    className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500"
                    title="Flagged note"
                    aria-label="Flagged note"
                  />
                )}
              </div>
            );
            return (
              <div key={i}>
                {hasData ? <Link href={`/history/${cell.date}`}>{content}</Link> : content}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border-2 border-teal-600 bg-teal-600" /> All exercises done
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border-2 border-amber-400 bg-amber-100 dark:bg-amber-900/50" /> Partially done
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border-2 border-red-300 bg-red-50 dark:bg-red-950/40" /> Plan logged, none done
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Flagged health note
        </div>
      </div>

      <DisclaimerBanner />
    </main>
  );
}
