import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// The only place in the app that can flip plan_reviews.acknowledged.
// plan_reviews has no update policy for the authenticated role at all (see
// the user_schema migration), so this route is architecturally the sole
// writer: it re-verifies the request is really from the review's owner
// using the caller's own session, then uses the service-role client — the
// only thing with UPDATE rights on this table — to set both acknowledged
// and a server-generated acknowledged_at together. A client can never set
// its own timestamp or pre-check the box; this endpoint is the checkbox.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || body.acknowledge !== true || typeof body.planReviewId !== "string") {
    return NextResponse.json(
      { error: "This endpoint requires an explicit { acknowledge: true, planReviewId } body." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Ownership check runs through the caller's own RLS-scoped session, not
  // the admin client — a user can only ever see/acknowledge their own row.
  const { data: review, error: fetchError } = await supabase
    .from("plan_reviews")
    .select("id, user_id, acknowledged, user_protocol_selection_id, generated_plan_snapshot")
    .eq("id", body.planReviewId)
    .single();

  if (fetchError || !review || review.user_id !== user.id) {
    return NextResponse.json({ error: "Plan review not found." }, { status: 404 });
  }
  if (review.acknowledged) {
    return NextResponse.json({ ok: true, alreadyAcknowledged: true });
  }

  const reviewerNote =
    typeof body.reviewerNote === "string" ? body.reviewerNote.slice(0, 500) : null;

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("plan_reviews")
    .update({
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
      reviewer_note: reviewerNote,
    })
    .eq("id", review.id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to record acknowledgement." }, { status: 500 });
  }

  // The snapshot's phaseOrderIndex is whatever computeCurrentPhase decided
  // at generation time (could be > 0 for someone starting the app
  // mid-recovery) — sync it here so it becomes the source of truth for
  // the daily tracker and phase-advancement logic, not left at its
  // insert-time default of 0.
  const snapshot = review.generated_plan_snapshot as { phaseOrderIndex?: number } | null;
  const phaseOrderIndex = typeof snapshot?.phaseOrderIndex === "number" ? snapshot.phaseOrderIndex : 0;

  await admin
    .from("user_protocol_selections")
    .update({ status: "active", current_phase_order_index: phaseOrderIndex })
    .eq("id", review.user_protocol_selection_id)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
