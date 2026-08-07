"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseIntakeFormData, buildIntakeInsertRow } from "@/lib/intake/parse-form";

export type IntakeActionState = {
  error?: string;
};

export async function submitIntakeAction(
  _prevState: IntakeActionState,
  formData: FormData,
): Promise<IntakeActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = parseIntakeFormData(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const { error: intakeError } = await supabase
    .from("intake_responses")
    .insert(buildIntakeInsertRow(user.id, parsed));

  if (intakeError) {
    return { error: "Something went wrong saving your answers. Please try again." };
  }

  if (parsed.mode === "undecided") {
    redirect("/onboarding/confirm-treatment");
  }

  const data = parsed.data;

  // "Upload your own" defers protocol selection to /protocol/upload — no
  // user_protocol_selections row exists until a reviewed/edited custom
  // protocol is confirmed there.
  if (data.protocolPreference === "upload_own" || !data.resolvedProtocolId) {
    redirect("/protocol/upload");
  }

  const { error: selectionError } = await supabase.from("user_protocol_selections").insert({
    user_id: user.id,
    protocol_id: data.resolvedProtocolId,
    anchor_date: data.anchorDate,
    status: "draft_pending_review",
  });

  if (selectionError) {
    return { error: "Something went wrong setting up your plan. Please try again." };
  }

  redirect("/plan/review");
}
