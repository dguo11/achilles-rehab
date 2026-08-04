import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePlanSnapshot } from "@/lib/plan/generate";
import type { PhaseRow } from "@/lib/plan/current-phase";
import type { Database } from "@/lib/supabase/database.types";

const PHASE_COLUMNS =
  "id, order_index, number, name, timeframe_label, timeframe_start_days, timeframe_end_days, goals, weight_bearing, interventions, criteria_to_progress, criteria_to_discharge, continues_from_order_indexes, assistive_devices";

/**
 * Advances a user to the next protocol phase. Distinct from the initial
 * PT-review gate: that one requires a full re-lock; this is the ongoing
 * "phase advancement gated by criteriaToProgress, confirmed by the user"
 * mechanism, which the spec treats as lighter-weight self-certification
 * against criteria the user already reviewed as part of their PT-approved
 * plan. For time_and_criterion protocols, every one of the current phase's
 * criteriaToProgress must be explicitly confirmed — checked server-side,
 * not just trusted from a disabled/enabled button on the client.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: selection } = await supabase
    .from("user_protocol_selections")
    .select("id, protocol_id, anchor_date, current_phase_order_index, user_id")
    .eq("user_id", user.id)
    .neq("status", "discontinued")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!selection || selection.user_id !== user.id) {
    return NextResponse.json({ error: "No active plan found." }, { status: 404 });
  }

  const { data: protocol } = await supabase
    .from("protocols")
    .select("id, name, gating, red_flags")
    .eq("id", selection.protocol_id)
    .single();

  const { data: phases } = await supabase
    .from("protocol_phases")
    .select(PHASE_COLUMNS)
    .eq("protocol_id", selection.protocol_id)
    .order("order_index", { ascending: true });

  if (!protocol || !phases) {
    return NextResponse.json({ error: "Protocol data unavailable." }, { status: 500 });
  }

  const activePhase = (phases as PhaseRow[]).find(
    (p) => p.order_index === selection.current_phase_order_index,
  );
  const nextPhase = (phases as PhaseRow[]).find(
    (p) => p.order_index === selection.current_phase_order_index + 1,
  );

  if (!activePhase || !nextPhase) {
    return NextResponse.json({ error: "No next phase available." }, { status: 400 });
  }

  // For criterion-gated protocols, every criterion on the CURRENT phase
  // must be explicitly confirmed — this is the actual gate, not the
  // client's disabled-button state, which a direct API call could skip.
  if (protocol.gating === "time_and_criterion") {
    const criteria = Array.isArray(activePhase.criteria_to_progress)
      ? (activePhase.criteria_to_progress as string[])
      : [];
    const confirmed: string[] = Array.isArray(body.confirmedCriteria) ? body.confirmedCriteria : [];
    const allConfirmed = criteria.every((c) => confirmed.includes(c));
    if (criteria.length > 0 && !allConfirmed) {
      return NextResponse.json(
        { error: "All criteria to progress must be confirmed before advancing." },
        { status: 400 },
      );
    }
  }

  const reviewerNote =
    typeof body.reviewerNote === "string" ? body.reviewerNote.slice(0, 500) : null;

  const { data: intake } = await supabase
    .from("intake_responses")
    .select("fitness_level, exercise_frequency, recovery_goal, current_weight_bearing_status")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Regenerate the exercise/dosage snapshot for the new phase specifically
  // (not date-derived) — computeCurrentPhase would pick the same phase
  // whenever timeframe_start_days lines up, but we want the phase the user
  // just confirmed, so build the snapshot directly from nextPhase.
  const snapshot = await generatePlanSnapshot({
    protocol: { id: protocol.id, name: protocol.name, red_flags: protocol.red_flags },
    phases: [nextPhase],
    anchorDate: selection.anchor_date,
    intake: {
      fitness_level: intake?.fitness_level ?? null,
      exercise_frequency: intake?.exercise_frequency ?? null,
      recovery_goal: intake?.recovery_goal ?? null,
      current_weight_bearing_status: intake?.current_weight_bearing_status ?? null,
    },
  });

  const admin = createAdminClient();

  const { error: selectionError } = await admin
    .from("user_protocol_selections")
    .update({ current_phase_order_index: nextPhase.order_index })
    .eq("id", selection.id)
    .eq("user_id", user.id);

  if (selectionError) {
    return NextResponse.json({ error: "Failed to advance phase." }, { status: 500 });
  }

  await admin.from("plan_reviews").insert({
    user_id: user.id,
    user_protocol_selection_id: selection.id,
    generated_plan_snapshot: snapshot as unknown as Database["public"]["Tables"]["plan_reviews"]["Insert"]["generated_plan_snapshot"],
    acknowledged: true,
    acknowledged_at: new Date().toISOString(),
    reviewer_note: reviewerNote ?? "Phase advanced via self-certified criteria confirmation.",
  });

  return NextResponse.json({ ok: true, newPhaseOrderIndex: nextPhase.order_index });
}
