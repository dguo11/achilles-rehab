import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkPlanAcknowledged } from "@/lib/plan/gate";

// Proves the PT-review gate holds even when the daily tracker is hit
// directly (no page, no JS) — not just redirected around in the browser.
export async function GET() {
  const gate = await checkPlanAcknowledged();

  if (!gate.ok) {
    const status = gate.reason === "unauthenticated" ? 401 : 403;
    return NextResponse.json({ error: gate.reason }, { status });
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: entries, error } = await supabase
    .from("daily_plan_entries")
    .select("*")
    .eq("user_protocol_selection_id", gate.selectionId)
    .eq("plan_date", today)
    .order("sort_order");

  if (error) {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  return NextResponse.json({ entries: entries ?? [] });
}
