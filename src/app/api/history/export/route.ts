import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSessionFitFile, type FitActivityType } from "@/lib/fit/build";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const planDate = body && typeof body.planDate === "string" ? body.planDate : null;
  if (!planDate || !DATE_RE.test(planDate)) {
    return NextResponse.json({ error: "Invalid or missing date." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: entries } = await supabase
    .from("daily_plan_entries")
    .select("id, exercise_category")
    .eq("user_id", user.id)
    .eq("plan_date", planDate);

  const { data: logs } = await supabase
    .from("session_logs")
    .select("id, daily_plan_entry_id, completed, duration_minutes, logged_at")
    .eq("user_id", user.id)
    .eq("plan_date", planDate);

  if (!logs || logs.length === 0) {
    return NextResponse.json({ error: "Nothing logged for that day yet." }, { status: 404 });
  }

  const summaryLog = logs.find((l) => !l.daily_plan_entry_id) ?? null;
  if (!summaryLog || !summaryLog.duration_minutes) {
    return NextResponse.json(
      { error: "Add a duration to that day's session summary before exporting." },
      { status: 400 },
    );
  }

  const activityType: FitActivityType = (entries ?? []).some((e) => e.exercise_category === "running")
    ? "running"
    : "generic_workout";

  const endTime = new Date(summaryLog.logged_at);
  const startTime = new Date(endTime.getTime() - summaryLog.duration_minutes * 60_000);

  let bytes: Uint8Array;
  try {
    bytes = buildSessionFitFile({ activityType, startTime, endTime });
  } catch {
    return NextResponse.json({ error: "Couldn't generate a valid .fit file. Please try again." }, { status: 500 });
  }

  const filePath = `${user.id}/${planDate}-${activityType}.fit`;
  const { error: uploadError } = await supabase.storage
    .from("fit-exports")
    .upload(filePath, bytes, { contentType: "application/octet-stream", upsert: true });
  if (uploadError) {
    return NextResponse.json({ error: "Couldn't save the export. Please try again." }, { status: 500 });
  }

  const sessionLogIds = logs.map((l) => l.id);
  const { data: existingExport } = await supabase
    .from("fit_exports")
    .select("id")
    .eq("user_id", user.id)
    .eq("file_path", filePath)
    .maybeSingle();

  if (existingExport) {
    await supabase
      .from("fit_exports")
      .update({ session_log_ids: sessionLogIds, export_type: activityType })
      .eq("id", existingExport.id)
      .eq("user_id", user.id);
  } else {
    await supabase.from("fit_exports").insert({
      user_id: user.id,
      session_log_ids: sessionLogIds,
      export_type: activityType,
      file_path: filePath,
    });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("fit-exports")
    .createSignedUrl(filePath, 300, { download: `achilla-${planDate}.fit` });
  if (signError || !signed) {
    return NextResponse.json({ error: "Export saved, but the download link failed. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: signed.signedUrl, activityType });
}
