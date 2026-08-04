"use server";

import { createClient } from "@/lib/supabase/server";
import { checkForDistressSignals } from "@/lib/safety/distress";

export type NoteActionState = {
  error?: string;
  saved?: boolean;
  redFlagTriggered?: boolean;
  distressTriggered?: boolean;
};

function numberOrNull(value: FormDataEntryValue | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function submitNoteAction(
  _prevState: NoteActionState,
  formData: FormData,
): Promise<NoteActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const noteDate = String(formData.get("noteDate") ?? "");
  if (!noteDate) return { error: "Missing date." };

  const painLevel = numberOrNull(formData.get("painLevel"));
  const swellingLevel = String(formData.get("swellingLevel") ?? "") || null;
  const romNotes = String(formData.get("romNotes") ?? "").trim() || null;
  const moodLevel = numberOrNull(formData.get("moodLevel"));
  const motivationLevel = numberOrNull(formData.get("motivationLevel"));
  const physicalHealthText = String(formData.get("physicalHealthText") ?? "").trim() || null;
  const mentalHealthText = String(formData.get("mentalHealthText") ?? "").trim() || null;
  const redFlagSigns = formData.getAll("redFlagSigns").map(String).filter(Boolean);

  const distressTriggered = checkForDistressSignals(mentalHealthText);
  const redFlagTriggered = redFlagSigns.length > 0;

  const payload = {
    pain_level: painLevel,
    swelling_level: swellingLevel,
    rom_notes: romNotes,
    mood_level: moodLevel,
    motivation_level: motivationLevel,
    physical_health_text: physicalHealthText,
    mental_health_text: mentalHealthText,
    red_flag_signs: redFlagSigns,
    // Covers both physical red-flag signs and a mental-health distress
    // signal — either one means "surface a supportive/contact-care-team
    // prompt," which is what this column drives.
    flagged_red_flag: redFlagTriggered || distressTriggered,
  };

  const { data: existing } = await supabase
    .from("daily_notes")
    .select("id")
    .eq("user_id", user.id)
    .eq("note_date", noteDate)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("daily_notes")
      .update(payload)
      .eq("id", existing.id)
      .eq("user_id", user.id);
    if (error) return { error: "Couldn't save your note. Please try again." };
  } else {
    const { error } = await supabase.from("daily_notes").insert({
      user_id: user.id,
      note_date: noteDate,
      ...payload,
    });
    if (error) return { error: "Couldn't save your note. Please try again." };
  }

  return { saved: true, redFlagTriggered, distressTriggered };
}
