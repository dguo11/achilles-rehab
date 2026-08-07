"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type ActionState = { error?: string };

export async function toggleExerciseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const dailyPlanEntryId = String(formData.get("dailyPlanEntryId") ?? "");
  const planDate = String(formData.get("planDate") ?? "");
  const completed = formData.get("completed") === "true";

  if (!dailyPlanEntryId || !planDate) {
    return { error: "Missing exercise reference." };
  }

  // One session_logs row per (user, daily_plan_entry) — check for an
  // existing one today and update it, otherwise insert.
  const { data: existing } = await supabase
    .from("session_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("daily_plan_entry_id", dailyPlanEntryId)
    .eq("plan_date", planDate)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("session_logs")
      .update({ completed, logged_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("user_id", user.id);
  } else {
    await supabase.from("session_logs").insert({
      user_id: user.id,
      daily_plan_entry_id: dailyPlanEntryId,
      plan_date: planDate,
      completed,
    });
  }

  revalidatePath("/today");
  return {};
}

/**
 * Per-exercise like/dislike and pain/no-pain feedback, collected only for
 * custom-generated whole-body exercises. Feeds the next day's workout
 * generation (see getYesterdayFeedback in lib/plan/materialize.ts) — never
 * touches the protocol-prescribed Achilles side of the plan.
 */
export async function setExerciseFeedbackAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const dailyPlanEntryId = String(formData.get("dailyPlanEntryId") ?? "");
  const planDate = String(formData.get("planDate") ?? "");
  const field = String(formData.get("field") ?? "");
  const value = formData.get("value") === "true";

  if (!dailyPlanEntryId || !planDate || (field !== "liked" && field !== "causedPain")) {
    return { error: "Missing feedback reference." };
  }

  const fieldValue: Database["public"]["Tables"]["session_logs"]["Update"] =
    field === "liked" ? { liked: value } : { caused_pain: value };

  const { data: existing } = await supabase
    .from("session_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("daily_plan_entry_id", dailyPlanEntryId)
    .eq("plan_date", planDate)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("session_logs")
      .update({ ...fieldValue, logged_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("user_id", user.id);
  } else {
    await supabase.from("session_logs").insert({
      user_id: user.id,
      daily_plan_entry_id: dailyPlanEntryId,
      plan_date: planDate,
      ...fieldValue,
    });
  }

  revalidatePath("/today");
  return {};
}

export async function submitSessionSummaryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const planDate = String(formData.get("planDate") ?? "");
  if (!planDate) return { error: "Missing date." };

  const painLevel = formData.get("painLevel") ? Number(formData.get("painLevel")) : null;
  const effortLevel = formData.get("effortLevel") ? Number(formData.get("effortLevel")) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const durationRaw = formData.get("durationMinutes");
  const durationMinutes =
    durationRaw && Number(durationRaw) > 0 ? Math.round(Number(durationRaw)) : null;

  // Session-level summary is stored as a session_logs row with no
  // daily_plan_entry_id — one per user per day.
  const { data: existing } = await supabase
    .from("session_logs")
    .select("id")
    .eq("user_id", user.id)
    .is("daily_plan_entry_id", null)
    .eq("plan_date", planDate)
    .maybeSingle();

  const payload = {
    pain_level: painLevel,
    effort_level: effortLevel,
    notes,
    duration_minutes: durationMinutes,
    completed: true,
    logged_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from("session_logs")
      .update(payload)
      .eq("id", existing.id)
      .eq("user_id", user.id);
    if (error) return { error: "Couldn't save. Please try again." };
  } else {
    const { error } = await supabase.from("session_logs").insert({
      user_id: user.id,
      plan_date: planDate,
      ...payload,
    });
    if (error) return { error: "Couldn't save. Please try again." };
  }

  revalidatePath("/today");
  return {};
}
