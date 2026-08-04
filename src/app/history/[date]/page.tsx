import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExportFitButton } from "@/components/history/export-fit-button";
import { DisclaimerBanner } from "@/components/disclaimer-banner";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function capitalize(s: string) {
  return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s;
}

export default async function HistoryDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!DATE_RE.test(date)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: entries }, { data: logs }, { data: note }] = await Promise.all([
    supabase
      .from("daily_plan_entries")
      .select("id, exercise_name, suggested_sets, suggested_reps, exercise_category, sort_order")
      .eq("user_id", user.id)
      .eq("plan_date", date)
      .order("sort_order", { ascending: true }),
    supabase
      .from("session_logs")
      .select("id, daily_plan_entry_id, completed, pain_level, effort_level, duration_minutes, notes")
      .eq("user_id", user.id)
      .eq("plan_date", date),
    supabase
      .from("daily_notes")
      .select(
        "pain_level, swelling_level, rom_notes, physical_health_text, red_flag_signs, mood_level, motivation_level, mental_health_text, flagged_red_flag",
      )
      .eq("user_id", user.id)
      .eq("note_date", date)
      .maybeSingle(),
  ]);

  const completedByEntryId = new Map(
    (logs ?? []).filter((l) => l.daily_plan_entry_id).map((l) => [l.daily_plan_entry_id as string, l.completed]),
  );
  const summary = (logs ?? []).find((l) => !l.daily_plan_entry_id) ?? null;

  if ((!entries || entries.length === 0) && !summary && !note) notFound();

  const redFlagSigns = (note?.red_flag_signs as string[] | null) ?? [];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
      <div>
        <Link
          href="/history"
          className="text-sm font-medium text-neutral-500 underline-offset-2 hover:underline dark:text-neutral-400"
        >
          ← History
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{formatDate(date)}</h1>
      </div>

      {entries && entries.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Exercises</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {entries.map((entry) => {
              const done = completedByEntryId.get(entry.id) ?? false;
              return (
                <li
                  key={entry.id}
                  className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-800"
                >
                  <span>{entry.exercise_name}</span>
                  <span
                    className={
                      done
                        ? "text-sm font-semibold text-teal-700 dark:text-teal-400"
                        : "text-sm text-neutral-400 dark:text-neutral-500"
                    }
                  >
                    {done ? "✓ Done" : "Not done"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {summary && (
        <section className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Session summary</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {summary.pain_level !== null && (
              <div>
                <dt className="text-neutral-500 dark:text-neutral-400">Pain</dt>
                <dd className="font-medium">{summary.pain_level}/10</dd>
              </div>
            )}
            {summary.effort_level !== null && (
              <div>
                <dt className="text-neutral-500 dark:text-neutral-400">Effort</dt>
                <dd className="font-medium">{summary.effort_level}/10</dd>
              </div>
            )}
            {summary.duration_minutes !== null && (
              <div>
                <dt className="text-neutral-500 dark:text-neutral-400">Duration</dt>
                <dd className="font-medium">{summary.duration_minutes} min</dd>
              </div>
            )}
          </dl>
          {summary.notes && <p className="text-sm text-neutral-700 dark:text-neutral-200">{summary.notes}</p>}
        </section>
      )}

      {note && (
        <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Health note</h2>
          {redFlagSigns.length > 0 && (
            <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-semibold">Flagged that day:</p>
              <ul className="mt-1 list-inside list-disc">
                {redFlagSigns.map((sign) => (
                  <li key={sign}>{sign}</li>
                ))}
              </ul>
            </div>
          )}
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {note.pain_level !== null && (
              <div>
                <dt className="text-neutral-500 dark:text-neutral-400">Pain</dt>
                <dd className="font-medium">{note.pain_level}/10</dd>
              </div>
            )}
            {note.swelling_level && (
              <div>
                <dt className="text-neutral-500 dark:text-neutral-400">Swelling</dt>
                <dd className="font-medium">{capitalize(note.swelling_level)}</dd>
              </div>
            )}
            {note.mood_level !== null && (
              <div>
                <dt className="text-neutral-500 dark:text-neutral-400">Mood</dt>
                <dd className="font-medium">{note.mood_level}/5</dd>
              </div>
            )}
            {note.motivation_level !== null && (
              <div>
                <dt className="text-neutral-500 dark:text-neutral-400">Motivation</dt>
                <dd className="font-medium">{note.motivation_level}/5</dd>
              </div>
            )}
          </dl>
          {note.rom_notes && <p className="text-sm text-neutral-700 dark:text-neutral-200">{note.rom_notes}</p>}
          {note.physical_health_text && (
            <p className="text-sm text-neutral-700 dark:text-neutral-200">{note.physical_health_text}</p>
          )}
          {note.mental_health_text && (
            <p className="text-sm text-neutral-700 dark:text-neutral-200">{note.mental_health_text}</p>
          )}
        </section>
      )}

      {summary && <ExportFitButton planDate={date} />}

      <DisclaimerBanner />
    </main>
  );
}
