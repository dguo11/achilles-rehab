import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PlanSnapshot } from "@/lib/plan/generate";

/**
 * Ensures today's daily_plan_entries exist for a user, generated from the
 * most recent acknowledged plan_reviews snapshot (never re-derived from the
 * raw protocol — the snapshot is what the user confirmed reviewing with
 * their PT, dosage numbers included). Idempotent: safe to call on every
 * /today load, only inserts what's missing for the given date.
 */
export async function ensureTodayEntries({
  supabase,
  userId,
  userProtocolSelectionId,
  phaseId,
  snapshot,
  planDate,
}: {
  supabase: SupabaseClient<Database>;
  userId: string;
  userProtocolSelectionId: string;
  phaseId: string;
  snapshot: PlanSnapshot;
  planDate: string;
}) {
  const { data: existing } = await supabase
    .from("daily_plan_entries")
    .select("id")
    .eq("user_protocol_selection_id", userProtocolSelectionId)
    .eq("plan_date", planDate)
    .limit(1);

  if (existing && existing.length > 0) return;
  if (snapshot.exercisePlan.length === 0) return;

  const rows = snapshot.exercisePlan.map((ex, index) => ({
    user_id: userId,
    user_protocol_selection_id: userProtocolSelectionId,
    protocol_phase_id: phaseId,
    plan_date: planDate,
    exercise_name: ex.exerciseName,
    exercise_category: ex.category,
    suggested_sets: ex.sets,
    suggested_reps: ex.reps,
    suggested_frequency: ex.frequency,
    dosage_source: ex.dosageSource === "llm-suggested" ? ("llm-suggested" as const) : ("pt-provided" as const),
    sort_order: index,
  }));

  await supabase.from("daily_plan_entries").insert(rows);
}
