"use client";

import { useActionState, useState } from "react";
import { acknowledgePlanAction, type AcknowledgeActionState } from "@/app/plan/review/actions";

const initialState: AcknowledgeActionState = {};

export function AcknowledgeForm({ planReviewId }: { planReviewId: string }) {
  const [state, formAction, pending] = useActionState(acknowledgePlanAction, initialState);
  const [confirmed, setConfirmed] = useState(false);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border-2 border-teal-700 p-5 dark:border-teal-500"
    >
      <input type="hidden" name="planReviewId" value={planReviewId} />

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="confirmed"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0"
        />
        <span className="text-sm font-medium">
          I&apos;ve reviewed this plan and confirmed it with my surgeon or physical therapist.
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Notes from your PT (optional)</span>
        <textarea
          name="reviewerNote"
          rows={3}
          className="rounded-xl border-2 border-neutral-300 px-4 py-2 text-base dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={!confirmed || pending}
        className="flex min-h-14 items-center justify-center rounded-xl bg-teal-700 px-6 text-lg font-semibold text-white active:bg-teal-800 disabled:opacity-40"
      >
        {pending ? "Saving…" : "Confirm and unlock my daily tracker"}
      </button>
    </form>
  );
}
