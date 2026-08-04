import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProtocolReviewForm } from "@/components/protocol/protocol-review-form";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import type { ExtractedProtocol } from "@/lib/gemini/extract-protocol";

export default async function ProtocolReviewPage({
  params,
}: {
  params: Promise<{ uploadId: string }>;
}) {
  const { uploadId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: upload } = await supabase
    .from("custom_protocol_uploads")
    .select("id, parsed_status, parsed_json, confirmed_at")
    .eq("id", uploadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!upload) notFound();

  if (upload.confirmed_at) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Already confirmed</h1>
        <p className="text-neutral-600 dark:text-neutral-300">
          This document was already reviewed and turned into a protocol.
        </p>
        <a
          href="/plan/review"
          className="flex min-h-14 items-center justify-center rounded-xl bg-teal-700 px-6 text-lg font-semibold text-white active:bg-teal-800"
        >
          Go to plan review
        </a>
      </main>
    );
  }

  const extractionFailed = upload.parsed_status === "failed";
  const initial = upload.parsed_status === "parsed" ? (upload.parsed_json as unknown as ExtractedProtocol) : null;
  const failureMessage =
    extractionFailed && upload.parsed_json && typeof upload.parsed_json === "object"
      ? ((upload.parsed_json as { error?: string }).error ?? null)
      : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
      <div>
        <p className="text-sm font-medium text-teal-700 dark:text-teal-400">Custom protocol</p>
        <h1 className="text-2xl font-bold tracking-tight">Review before you use it</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-300">
          Achilla only pulled out what it could find. Check every phase against your actual document,
          fix anything wrong, and confirm with your PT before you start following it.
        </p>
      </div>

      {extractionFailed && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-semibold">Couldn&apos;t auto-extract that document</p>
          <p className="mt-1">{failureMessage ?? "You can still build the protocol manually below."}</p>
        </div>
      )}

      <ProtocolReviewForm uploadId={upload.id} initial={initial} />

      <DisclaimerBanner />
    </main>
  );
}
