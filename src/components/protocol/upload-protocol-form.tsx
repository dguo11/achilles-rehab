"use client";

import { useActionState } from "react";
import { submitProtocolTextAction, type UploadActionState } from "@/app/protocol/upload/actions";

const initialState: UploadActionState = {};

export function UploadProtocolForm() {
  const [state, formAction, pending] = useActionState(submitProtocolTextAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Protocol document text</span>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          Open the PDF or document your PT gave you and copy/paste its text here.
        </span>
        <textarea
          name="documentText"
          rows={14}
          required
          placeholder="Paste the full text of your protocol here…"
          className="rounded-xl border-2 border-neutral-300 p-3 text-base dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-14 items-center justify-center rounded-xl bg-teal-700 px-6 text-lg font-semibold text-white active:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "Reading your protocol…" : "Extract phases"}
      </button>
    </form>
  );
}
