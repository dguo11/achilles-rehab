import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UploadProtocolForm } from "@/components/protocol/upload-protocol-form";
import { DisclaimerBanner } from "@/components/disclaimer-banner";

export default async function ProtocolUploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existingSelection } = await supabase
    .from("user_protocol_selections")
    .select("id")
    .eq("user_id", user.id)
    .neq("status", "discontinued")
    .limit(1)
    .maybeSingle();

  if (!existingSelection) {
    // Reachable without a selection yet if the user just picked "upload
    // your own protocol" at intake — that path defers protocol creation
    // to this flow instead of resolving a built-in protocol id.
    const { data: latestIntake } = await supabase
      .from("intake_responses")
      .select("protocol_preference")
      .eq("user_id", user.id)
      .is("superseded_at", null)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestIntake?.protocol_preference !== "upload_own") {
      redirect("/onboarding/intake");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
      <div>
        <p className="text-sm font-medium text-teal-700 dark:text-teal-400">Custom protocol</p>
        <h1 className="text-2xl font-bold tracking-tight">Upload your own protocol</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-300">
          If your surgeon or PT gave you a different written protocol, paste its text below. Achilla
          will try to pull out phases and exercises, but you&apos;ll review and edit everything before
          it&apos;s used — this never replaces your care team&apos;s guidance, and always needs their
          review before you start it.
        </p>
      </div>

      <UploadProtocolForm />

      <DisclaimerBanner />
    </main>
  );
}
