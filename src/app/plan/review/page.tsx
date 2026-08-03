import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DisclaimerBanner } from "@/components/disclaimer-banner";

// Placeholder landing spot after intake. Phase 3 replaces this with the
// real read-only generated plan and the PT-review acknowledgement gate.
export default async function PlanReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: selection } = await supabase
    .from("user_protocol_selections")
    .select("id, anchor_date, protocols(name)")
    .eq("user_id", user.id)
    .neq("status", "discontinued")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!selection) {
    redirect("/onboarding/intake");
  }

  const protocolName = (selection.protocols as { name: string } | null)?.name;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">You&apos;re all set for now</h1>
      <p className="text-neutral-600 dark:text-neutral-300">
        Thanks for completing your intake. You&apos;re on the{" "}
        <span className="font-semibold">{protocolName}</span> track, starting{" "}
        {selection.anchor_date}.
      </p>
      <p className="text-neutral-600 dark:text-neutral-300">
        Your personalized daily plan is being built next — it will show up
        here for you to review with your PT before it unlocks.
      </p>
      <DisclaimerBanner />
    </main>
  );
}
