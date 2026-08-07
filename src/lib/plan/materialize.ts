import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PlanSnapshot } from "@/lib/plan/generate";
import {
  generateWholeBodyWorkout,
  type WorkoutFeedbackItem,
} from "@/lib/gemini/generate-workout";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function previousDate(planDate: string): string {
  const d = new Date(planDate + "T00:00:00Z");
  return new Date(d.getTime() - MS_PER_DAY).toISOString().slice(0, 10);
}

function hasContent(value: unknown): boolean {
  return !!value && typeof value === "object" && Object.keys(value).length > 0;
}

async function getYesterdayFeedback({
  supabase,
  userId,
  userProtocolSelectionId,
  planDate,
}: {
  supabase: SupabaseClient<Database>;
  userId: string;
  userProtocolSelectionId: string;
  planDate: string;
}): Promise<WorkoutFeedbackItem[]> {
  const { data: entries } = await supabase
    .from("daily_plan_entries")
    .select("id, exercise_name, workout_type")
    .eq("user_protocol_selection_id", userProtocolSelectionId)
    .eq("plan_date", previousDate(planDate))
    .eq("source", "custom-generated");

  if (!entries || entries.length === 0) return [];

  const { data: logs } = await supabase
    .from("session_logs")
    .select("daily_plan_entry_id, liked, caused_pain")
    .eq("user_id", userId)
    .in(
      "daily_plan_entry_id",
      entries.map((e) => e.id),
    );

  const feedbackByEntryId = new Map((logs ?? []).map((l) => [l.daily_plan_entry_id, l]));

  return entries.map((e) => {
    const feedback = feedbackByEntryId.get(e.id);
    return {
      exerciseName: e.exercise_name,
      workoutType: e.workout_type === "cardio" ? "cardio" : "strength",
      liked: feedback?.liked ?? null,
      causedPain: feedback?.caused_pain ?? null,
    };
  });
}

/**
 * Ensures today's daily_plan_entries exist for a user. Achilles-region
 * exercises are always taken verbatim from the most recent acknowledged
 * plan_reviews snapshot (never re-derived from the raw protocol). The
 * rest-of-body region is instead a whole-body workout generated fresh each
 * day — grounded in the protocol's own rest-of-body suggestions for the
 * current phase, respecting weight-bearing/assistive-device restrictions,
 * and adjusted using yesterday's per-exercise feedback — falling back to
 * the protocol's raw rest-of-body suggestions unchanged if generation is
 * unavailable or fails. Idempotent: safe to call on every /today load, only
 * inserts what's missing for the given date.
 */
export async function ensureTodayEntries({
  supabase,
  userId,
  userProtocolSelectionId,
  phaseId,
  snapshot,
  planDate,
  profile,
}: {
  supabase: SupabaseClient<Database>;
  userId: string;
  userProtocolSelectionId: string;
  phaseId: string;
  snapshot: PlanSnapshot;
  planDate: string;
  profile: {
    fitnessLevel: string | null;
    exerciseFrequency: string | null;
    recoveryGoal: string | null;
    availableEquipment: string[];
  };
}) {
  const { data: existing } = await supabase
    .from("daily_plan_entries")
    .select("id")
    .eq("user_protocol_selection_id", userProtocolSelectionId)
    .eq("plan_date", planDate)
    .limit(1);

  if (existing && existing.length > 0) return;

  const achillesExercises = snapshot.exercisePlan.filter((ex) => ex.region === "achilles");
  const rows: Database["public"]["Tables"]["daily_plan_entries"]["Insert"][] = achillesExercises.map(
    (ex, index) => ({
      user_id: userId,
      user_protocol_selection_id: userProtocolSelectionId,
      protocol_phase_id: phaseId,
      plan_date: planDate,
      exercise_name: ex.exerciseName,
      exercise_category: ex.category,
      suggested_sets: ex.sets,
      suggested_reps: ex.reps,
      suggested_frequency: ex.frequency,
      dosage_source: ex.dosageSource === "llm-suggested" ? "llm-suggested" : "pt-provided",
      region: "achilles",
      source: "protocol",
      sort_order: index,
    }),
  );

  const restOfBodyInterventions = snapshot.phase.restOfBodyInterventions;
  let protocolSuggestionSummary: string | null = null;

  if (hasContent(restOfBodyInterventions)) {
    const yesterdayFeedback = await getYesterdayFeedback({
      supabase,
      userId,
      userProtocolSelectionId,
      planDate,
    });

    const generated = await generateWholeBodyWorkout({
      phaseLabel: `${snapshot.phase.name ?? snapshot.phase.timeframeLabel} (${snapshot.phase.timeframeLabel})`,
      weightBearing: snapshot.phase.weightBearing,
      assistiveDevices: snapshot.phase.assistiveDevices,
      restrictionNotes: snapshot.phase.gaitTraining,
      protocolRestOfBodyInterventions: restOfBodyInterventions,
      profile,
      yesterdayFeedback,
    });

    if (generated) {
      protocolSuggestionSummary = generated.protocolSuggestionSummary;
      let sortOrder = rows.length;
      for (const ex of generated.strength) {
        rows.push({
          user_id: userId,
          user_protocol_selection_id: userProtocolSelectionId,
          protocol_phase_id: phaseId,
          plan_date: planDate,
          exercise_name: ex.name,
          exercise_category: ex.targetArea,
          suggested_sets: ex.sets,
          suggested_reps: ex.reps,
          suggested_frequency: ex.frequency,
          dosage_source: "llm-suggested",
          region: "rest_of_body",
          source: "custom-generated",
          workout_type: "strength",
          sort_order: sortOrder++,
        });
      }
      for (const ex of generated.cardio) {
        rows.push({
          user_id: userId,
          user_protocol_selection_id: userProtocolSelectionId,
          protocol_phase_id: phaseId,
          plan_date: planDate,
          exercise_name: ex.name,
          exercise_category: "cardio",
          suggested_sets: null,
          suggested_reps: null,
          suggested_frequency: ex.dosageLabel,
          dosage_source: "llm-suggested",
          region: "rest_of_body",
          source: "custom-generated",
          workout_type: "cardio",
          sort_order: sortOrder++,
        });
      }
    } else {
      // Generation unavailable/failed — fall back to the protocol's raw
      // rest-of-body suggestions unchanged, same as before this feature.
      const fallback = snapshot.exercisePlan.filter((ex) => ex.region === "rest_of_body");
      let sortOrder = rows.length;
      for (const ex of fallback) {
        rows.push({
          user_id: userId,
          user_protocol_selection_id: userProtocolSelectionId,
          protocol_phase_id: phaseId,
          plan_date: planDate,
          exercise_name: ex.exerciseName,
          exercise_category: ex.category,
          suggested_sets: ex.sets,
          suggested_reps: ex.reps,
          suggested_frequency: ex.frequency,
          dosage_source: ex.dosageSource === "llm-suggested" ? "llm-suggested" : "pt-provided",
          region: "rest_of_body",
          source: "protocol",
          sort_order: sortOrder++,
        });
      }
    }
  }

  if (rows.length > 0) {
    await supabase.from("daily_plan_entries").insert(rows);
  }

  if (protocolSuggestionSummary) {
    await supabase.from("daily_workout_plans").insert({
      user_id: userId,
      user_protocol_selection_id: userProtocolSelectionId,
      protocol_phase_id: phaseId,
      plan_date: planDate,
      protocol_suggestion_summary: protocolSuggestionSummary,
    });
  }
}
