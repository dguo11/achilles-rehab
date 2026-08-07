"use server";

import { createClient } from "@/lib/supabase/server";
import { confirmProtocolInputSchema } from "@/lib/protocol/custom-protocol";
import { ACHILLA_BASELINE_RED_FLAGS } from "@/lib/safety/red-flags";
import type { Database } from "@/lib/supabase/database.types";

export type ConfirmActionState = { error?: string; ok?: boolean };

// Merges the two region-tagged intervention groups into the single flat
// legacy `interventions` shape, concatenating rather than overwriting when
// both buckets use the same category name (e.g. "strengthening" split
// across both regions).
function mergeInterventions(
  a: Record<string, string[]>,
  b: Record<string, string[]>,
): Record<string, string[]> {
  const merged: Record<string, string[]> = {};
  for (const [category, items] of [...Object.entries(a), ...Object.entries(b)]) {
    merged[category] = [...(merged[category] ?? []), ...items];
  }
  return merged;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Creates a new is_verified = false protocol + phases from the user's
 * reviewed/edited version of an extraction, then switches their active
 * plan to it. That switch inserts a fresh, unacknowledged
 * user_protocol_selections row (status: draft_pending_review) — the same
 * PT-review gate that governs every protocol applies here too, so the new
 * plan is locked until it's acknowledged again at /plan/review.
 */
export async function confirmProtocolAction(
  uploadId: string,
  rawInput: unknown,
): Promise<ConfirmActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = confirmProtocolInputSchema.safeParse(rawInput);
  if (!parsed.success) return { error: "Please check the form — something's missing or too long." };
  const input = parsed.data;

  const { data: upload } = await supabase
    .from("custom_protocol_uploads")
    .select("id, parsed_json")
    .eq("id", uploadId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!upload) return { error: "Upload not found." };

  const protocolId = `custom-${crypto.randomUUID()}`;
  const redFlags =
    input.redFlagSigns.length > 0
      ? {
          source: "protocol",
          action: "Advise the user to contact their referring physician / care team.",
          signs: input.redFlagSigns,
        }
      : ACHILLA_BASELINE_RED_FLAGS;

  const { error: protocolError } = await supabase.from("protocols").insert({
    id: protocolId,
    name: input.protocolName,
    source: "Self-uploaded — extracted and reviewed by you, not verified by a clinician.",
    applies_to: input.appliesTo,
    gating: input.gating,
    global_notes: [],
    red_flags: redFlags as unknown as Database["public"]["Tables"]["protocols"]["Insert"]["red_flags"],
    supporting_programs: null,
    raw_json: (upload.parsed_json ?? {}) as Database["public"]["Tables"]["protocols"]["Insert"]["raw_json"],
    is_verified: false,
    created_by: user.id,
  });
  if (protocolError) return { error: "Couldn't save the protocol. Please try again." };

  const phaseRows = input.phases.map((p, i) => ({
    protocol_id: protocolId,
    order_index: i,
    name: p.name,
    timeframe_label: p.timeframeLabel,
    timeframe_start_days: p.timeframeStartDays,
    timeframe_end_days: p.timeframeEndDays,
    goals: p.goals,
    weight_bearing: p.weightBearing,
    gait_training: p.gaitTraining,
    achilles_interventions: p.achillesInterventions,
    rest_of_body_interventions: p.restOfBodyInterventions,
    interventions: mergeInterventions(p.achillesInterventions, p.restOfBodyInterventions),
    criteria_to_progress: p.criteriaToProgress,
  }));
  const { error: phasesError } = await supabase.from("protocol_phases").insert(phaseRows);
  if (phasesError) {
    await supabase.from("protocols").delete().eq("id", protocolId).eq("created_by", user.id);
    return { error: "Couldn't save the protocol phases. Please try again." };
  }

  await supabase
    .from("custom_protocol_uploads")
    .update({
      reviewed_and_edited_json: input,
      resulting_protocol_id: protocolId,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", uploadId)
    .eq("user_id", user.id);

  const { data: existingSelection } = await supabase
    .from("user_protocol_selections")
    .select("id, anchor_date")
    .eq("user_id", user.id)
    .neq("status", "discontinued")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingSelection) {
    await supabase
      .from("user_protocol_selections")
      .update({ status: "discontinued" })
      .eq("id", existingSelection.id)
      .eq("user_id", user.id);
  }

  await supabase.from("user_protocol_selections").insert({
    user_id: user.id,
    protocol_id: protocolId,
    anchor_date: existingSelection?.anchor_date ?? todayIso(),
    current_phase_order_index: 0,
    status: "draft_pending_review",
  });

  return { ok: true };
}
