"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AcknowledgeActionState = { error?: string };

/**
 * The only writer of `plan_reviews.acknowledged` / `acknowledged_at`. RLS
 * deliberately has no update policy for `authenticated` on that table (see
 * the user_schema migration), so this has to go through the service-role
 * client — but only after re-checking, with the caller's own RLS-scoped
 * session, that the plan_reviews row actually belongs to them. That
 * ordering is what keeps this from becoming a way to flip any user's
 * acknowledgement by guessing an id.
 */
export async function acknowledgePlanAction(
  _prevState: AcknowledgeActionState,
  formData: FormData,
): Promise<AcknowledgeActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const planReviewId = String(formData.get("planReviewId") ?? "");
  const confirmed = formData.get("confirmed") === "on";
  const reviewerNote = String(formData.get("reviewerNote") ?? "").trim().slice(0, 1000);

  if (!planReviewId) {
    return { error: "Something went wrong. Please refresh and try again." };
  }
  if (!confirmed) {
    return { error: "Please confirm you've reviewed this plan with your PT before continuing." };
  }

  const { data: review } = await supabase
    .from("plan_reviews")
    .select("id, user_id, user_protocol_selection_id, acknowledged")
    .eq("id", planReviewId)
    .maybeSingle();

  if (!review || review.user_id !== user.id) {
    return { error: "Plan not found. Please refresh and try again." };
  }

  if (review.acknowledged) {
    redirect("/today");
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("plan_reviews")
    .update({
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
      reviewer_note: reviewerNote || null,
    })
    .eq("id", planReviewId)
    .eq("user_id", user.id);

  if (updateError) {
    return { error: "Something went wrong saving your confirmation. Please try again." };
  }

  await admin
    .from("user_protocol_selections")
    .update({ status: "active" })
    .eq("id", review.user_protocol_selection_id)
    .eq("user_id", user.id);

  redirect("/today");
}
