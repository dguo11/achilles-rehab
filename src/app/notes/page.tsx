import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotesForm } from "@/components/notes/notes-form";
import { DisclaimerBanner } from "@/components/disclaimer-banner";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function NotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: selection } = await supabase
    .from("user_protocol_selections")
    .select("protocol_id")
    .eq("user_id", user.id)
    .neq("status", "discontinued")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let redFlagOptions: string[] = [];
  if (selection) {
    const { data: protocol } = await supabase
      .from("protocols")
      .select("red_flags")
      .eq("id", selection.protocol_id)
      .single();
    const signs = (protocol?.red_flags as { signs?: unknown } | null)?.signs;
    if (Array.isArray(signs)) {
      redFlagOptions = signs.filter((s): s is string => typeof s === "string");
    }
  }

  const noteDate = todayIso();
  const { data: existing } = await supabase
    .from("daily_notes")
    .select(
      "pain_level, swelling_level, rom_notes, mood_level, motivation_level, physical_health_text, mental_health_text, red_flag_signs",
    )
    .eq("user_id", user.id)
    .eq("note_date", noteDate)
    .maybeSingle();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
      <div>
        <p className="text-sm font-medium text-teal-700 dark:text-teal-400">Today&apos;s note</p>
        <h1 className="text-2xl font-bold tracking-tight">How are you doing today?</h1>
      </div>

      <NotesForm
        noteDate={noteDate}
        redFlagOptions={redFlagOptions}
        initial={{
          painLevel: existing?.pain_level ?? null,
          swellingLevel: existing?.swelling_level ?? null,
          romNotes: existing?.rom_notes ?? null,
          moodLevel: existing?.mood_level ?? null,
          motivationLevel: existing?.motivation_level ?? null,
          physicalHealthText: existing?.physical_health_text ?? null,
          mentalHealthText: existing?.mental_health_text ?? null,
          redFlagSigns: Array.isArray(existing?.red_flag_signs)
            ? (existing.red_flag_signs as string[])
            : [],
        }}
      />

      <DisclaimerBanner />
    </main>
  );
}
