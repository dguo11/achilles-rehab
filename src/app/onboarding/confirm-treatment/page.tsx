import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DisclaimerBanner } from "@/components/disclaimer-banner";

export default async function ConfirmTreatmentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">
        Let&apos;s confirm your treatment plan first
      </h1>
      <p className="text-neutral-600 dark:text-neutral-300">
        We&apos;ve saved what you told us. Achilla can&apos;t build your daily
        plan until you and your surgeon or physical therapist decide between
        surgical repair and non-surgical (functional) treatment — the two
        clinical protocols follow very different rules from here.
      </p>
      <p className="text-neutral-600 dark:text-neutral-300">
        Once that&apos;s settled, come back and we&apos;ll finish setting up
        your plan.
      </p>
      <DisclaimerBanner />
    </main>
  );
}
