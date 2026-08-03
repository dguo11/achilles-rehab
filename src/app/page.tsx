import Link from "next/link";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-5 py-10">
      <div className="space-y-2">
        <p className="text-sm font-medium text-teal-700 dark:text-teal-400">
          Achilla
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Your Achilles recovery, one day at a time.
        </h1>
        <p className="text-base leading-relaxed text-neutral-600 dark:text-neutral-300">
          Achilla turns your surgeon or physical therapist&apos;s Achilles
          rehab protocol into a personalized daily plan you can actually
          follow — built for one-handed, on-crutches use.
        </p>
      </div>

      <DisclaimerBanner />

      <div className="flex flex-col gap-3">
        {user ? (
          <Link
            href="/onboarding/intake"
            className="flex min-h-14 items-center justify-center rounded-xl bg-teal-700 px-6 text-lg font-semibold text-white active:bg-teal-800"
          >
            Continue
          </Link>
        ) : (
          <>
            <Link
              href="/signup"
              className="flex min-h-14 items-center justify-center rounded-xl bg-teal-700 px-6 text-lg font-semibold text-white active:bg-teal-800"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="flex min-h-14 items-center justify-center rounded-xl border-2 border-neutral-300 px-6 text-lg font-semibold text-neutral-800 active:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:active:bg-neutral-900"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
