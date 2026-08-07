"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseIntakeFormData, buildIntakeInsertRow } from "@/lib/intake/parse-form";
import type { IntakeActionState } from "@/app/onboarding/intake/actions";

/**
 * Profile "edit" submission. Never mutates a previously-submitted intake
 * row — inserts a fresh one and marks the old one superseded, same
 * soft-archive approach as "clear & restart". If anything protocol/timing
 * relevant changed (protocol, anchor date, or no active plan yet), the
 * current user_protocol_selections row is discontinued and a fresh
 * draft_pending_review one takes its place — the same re-lock gate used
 * when switching to a custom protocol, so the user re-confirms on
 * /plan/review before their tracker unlocks again. Answers that don't
 * touch protocol/timing (e.g. home notes, fitness level) don't force a
 * re-lock.
 */
export async function updateIntakeAction(
  _prevState: IntakeActionState,
  formData: FormData,
): Promise<IntakeActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseIntakeFormData(formData);
  if (!parsed.ok) return { error: parsed.error };

  const { data: currentIntake } = await supabase
    .from("intake_responses")
    .select("id")
    .eq("user_id", user.id)
    .is("superseded_at", null)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: currentSelection } = await supabase
    .from("user_protocol_selections")
    .select("id, protocol_id, anchor_date")
    .eq("user_id", user.id)
    .neq("status", "discontinued")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: insertedIntake, error: intakeError } = await supabase
    .from("intake_responses")
    .insert(buildIntakeInsertRow(user.id, parsed))
    .select("id")
    .single();

  if (intakeError || !insertedIntake) {
    return { error: "Something went wrong saving your changes. Please try again." };
  }

  if (currentIntake) {
    await supabase
      .from("intake_responses")
      .update({ superseded_at: new Date().toISOString() })
      .eq("id", currentIntake.id)
      .eq("user_id", user.id);
  }

  async function discontinueCurrentSelection() {
    if (!currentSelection) return;
    await supabase
      .from("user_protocol_selections")
      .update({ status: "discontinued" })
      .eq("id", currentSelection.id)
      .eq("user_id", user!.id);
  }

  if (parsed.mode === "undecided") {
    // Treatment track is no longer settled — no protocol can stay active.
    await discontinueCurrentSelection();
    redirect("/onboarding/confirm-treatment");
  }

  const data = parsed.data;

  if (data.protocolPreference === "upload_own" || !data.resolvedProtocolId) {
    await discontinueCurrentSelection();
    redirect("/protocol/upload");
  }

  const protocolChanged =
    !currentSelection ||
    currentSelection.protocol_id !== data.resolvedProtocolId ||
    currentSelection.anchor_date !== data.anchorDate;

  if (protocolChanged) {
    await discontinueCurrentSelection();
    const { error: selectionError } = await supabase.from("user_protocol_selections").insert({
      user_id: user.id,
      protocol_id: data.resolvedProtocolId,
      anchor_date: data.anchorDate,
      status: "draft_pending_review",
    });
    if (selectionError) {
      return { error: "Something went wrong updating your plan. Please try again." };
    }
  }

  redirect("/plan/review");
}

/**
 * "Clear & restart" — soft-archives the current intake (superseded_at, not
 * deleted) and discontinues the active protocol selection, then sends the
 * user back through onboarding from scratch. Nothing is hard-deleted, so
 * history stays intact for anyone who needs to look back.
 */
export async function clearProfileAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("intake_responses")
    .update({ superseded_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("superseded_at", null);

  await supabase
    .from("user_protocol_selections")
    .update({ status: "discontinued" })
    .eq("user_id", user.id)
    .neq("status", "discontinued");

  redirect("/onboarding/intake");
}
