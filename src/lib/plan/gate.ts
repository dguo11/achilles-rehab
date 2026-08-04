import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AckGateResult =
  | { ok: true; userId: string; selectionId: string }
  | { ok: false; reason: "unauthenticated" | "no_selection" | "not_acknowledged" };

/**
 * The server-side half of the PT-review acknowledgement gate: no route that
 * serves daily-tracker data may return anything until this passes. Used by
 * both the `/today` page (redirect) and its API route (403 JSON) — checking
 * it here rather than trusting a client-side flag is what makes the gate
 * impossible to bypass by calling an endpoint directly or disabling JS.
 *
 * Reads through the normal RLS-scoped client, not the admin client: this is
 * a read of the caller's own rows, which RLS already permits, and using the
 * anon-key client keeps this helper safe to call from anywhere without
 * needing to re-derive authorization.
 */
export async function checkPlanAcknowledged(): Promise<AckGateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, reason: "unauthenticated" };

  const { data: selection } = await supabase
    .from("user_protocol_selections")
    .select("id")
    .eq("user_id", user.id)
    .neq("status", "discontinued")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!selection) return { ok: false, reason: "no_selection" };

  const { data: review } = await supabase
    .from("plan_reviews")
    .select("acknowledged")
    .eq("user_protocol_selection_id", selection.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!review?.acknowledged) return { ok: false, reason: "not_acknowledged" };

  return { ok: true, userId: user.id, selectionId: selection.id };
}
