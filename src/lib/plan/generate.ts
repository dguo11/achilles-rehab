import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { getEffectiveInterventions, flattenExerciseNames, categoryByExerciseName } from "@/lib/plan/phase";
import { suggestDosage } from "@/lib/gemini/dosage";
import { buildDailyPlanEntries } from "@/lib/plan/scheduler";
import type { PlanSnapshot, RedFlagsData } from "@/lib/plan/types";

type TypedClient = SupabaseClient<Database>;
type SelectionRow = Database["public"]["Tables"]["user_protocol_selections"]["Row"];
type PlanReviewRow = Database["public"]["Tables"]["plan_reviews"]["Row"];

/**
 * Generates (once) the initial daily plan + frozen review snapshot for a
 * user's active protocol selection, or returns the existing one.
 *
 * Idempotency is what makes this safe to call from a page's server
 * component on every load: if a `plan_reviews` row already exists for this
 * selection, it's returned as-is (acknowledged or not) rather than
 * regenerated — generation calls Gemini and writes `daily_plan_entries`, and
 * doing that on every page refresh would both re-bill the LLM call and (per
 * the `(phase, profile)` caching requirement) defeat the point of caching.
 */
export async function ensurePlanGenerated(
  supabase: TypedClient,
  userId: string,
  selection: SelectionRow,
): Promise<PlanReviewRow> {
  const { data: existingReview } = await supabase
    .from("plan_reviews")
    .select("*")
    .eq("user_protocol_selection_id", selection.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingReview) return existingReview;

  const { data: phases, error: phasesError } = await supabase
    .from("protocol_phases")
    .select("*")
    .eq("protocol_id", selection.protocol_id)
    .order("order_index");

  if (phasesError) throw phasesError;
  if (!phases || phases.length === 0) {
    throw new Error(`Protocol ${selection.protocol_id} has no phases`);
  }

  const currentPhase = phases.find((p) => p.order_index === selection.current_phase_order_index) ?? phases[0];

  const { data: protocol, error: protocolError } = await supabase
    .from("protocols")
    .select("*")
    .eq("id", selection.protocol_id)
    .single();
  if (protocolError) throw protocolError;

  const { data: intake } = await supabase
    .from("intake_responses")
    .select("*")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const effectiveInterventions = getEffectiveInterventions(currentPhase, phases);
  const exerciseNames = flattenExerciseNames(effectiveInterventions);
  const categoryMap = categoryByExerciseName(effectiveInterventions);

  const suggestions = await suggestDosage(currentPhase.timeframe_label, exerciseNames, {
    fitnessLevel: intake?.fitness_level ?? null,
    exerciseFrequency: intake?.exercise_frequency ?? null,
    recoveryGoal: intake?.recovery_goal ?? null,
    ageRange: intake?.age_range ?? null,
    priorSports: asStringArray(intake?.prior_sports),
    conservativeFactors: asStringArray(intake?.conservative_factors),
  });

  const startDate = todayUTC();
  const phaseEndDate = phaseEndDateFor(selection.anchor_date, currentPhase.timeframe_end_days);

  const entries = buildDailyPlanEntries({
    userId,
    userProtocolSelectionId: selection.id,
    protocolPhaseId: currentPhase.id,
    exerciseNames,
    categoryByExerciseName: categoryMap,
    suggestions,
    startDate,
    phaseEndDate,
  });

  if (entries.length > 0) {
    const { error: insertEntriesError } = await supabase.from("daily_plan_entries").insert(entries);
    if (insertEntriesError) throw insertEntriesError;
  }

  const suggestionByName = new Map(suggestions.map((s) => [s.exerciseName, s]));
  const snapshot: PlanSnapshot = {
    generatedAt: new Date().toISOString(),
    protocol: {
      id: protocol.id,
      name: protocol.name,
      source: protocol.source,
      globalNotes: asStringArray(protocol.global_notes),
      redFlags: protocol.red_flags as RedFlagsData | null,
    },
    phase: {
      orderIndex: currentPhase.order_index,
      number: currentPhase.number,
      name: currentPhase.name,
      timeframeLabel: currentPhase.timeframe_label,
      goals: asStringArray(currentPhase.goals),
      weightBearing: currentPhase.weight_bearing,
      assistiveDevices: currentPhase.assistive_devices as string[] | null,
      interventions: effectiveInterventions,
      criteriaToProgress: currentPhase.criteria_to_progress as string[] | null,
    },
    exercises: exerciseNames.map((exerciseName) => {
      const suggestion = suggestionByName.get(exerciseName);
      return {
        exerciseName,
        category: categoryMap.get(exerciseName) ?? null,
        suggestedSets: suggestion?.sets ?? null,
        suggestedReps: suggestion?.reps ?? null,
        suggestedFrequency: suggestion?.frequency ?? null,
        rationale: suggestion?.rationale || null,
        dosageSource: "llm-suggested",
      };
    }),
  };

  const { data: review, error: reviewError } = await supabase
    .from("plan_reviews")
    .insert({
      user_id: userId,
      user_protocol_selection_id: selection.id,
      generated_plan_snapshot: snapshot as unknown as Json,
    })
    .select()
    .single();

  if (reviewError) throw reviewError;
  return review;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function phaseEndDateFor(anchorDate: string, timeframeEndDays: number | null): Date | null {
  if (timeframeEndDays === null) return null;
  const d = new Date(`${anchorDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + timeframeEndDays);
  return d;
}
