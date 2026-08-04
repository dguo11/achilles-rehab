"use client";

import { useActionState, useState } from "react";
import { submitSessionSummaryAction, type ActionState } from "@/app/today/actions";
import { ScalePicker } from "@/components/shared/scale-picker";

const initialState: ActionState = {};

export function SessionSummaryForm({
  planDate,
  initial,
}: {
  planDate: string;
  initial: { painLevel: number | null; effortLevel: number | null; notes: string | null };
}) {
  const [state, formAction, pending] = useActionState(submitSessionSummaryAction, initialState);
  const [pain, setPain] = useState<number | null>(initial.painLevel);
  const [effort, setEffort] = useState<number | null>(initial.effortLevel);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <input type="hidden" name="planDate" value={planDate} />
      <h2 className="text-lg font-semibold">How did today go?</h2>
      <ScalePicker name="painLevel" value={pain} onChange={setPain} label="Pain (0 = none, 10 = worst)" />
      <ScalePicker name="effortLevel" value={effort} onChange={setEffort} label="Effort (0 = none, 10 = max)" />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Notes (optional)</span>
        <textarea
          name="notes"
          defaultValue={initial.notes ?? ""}
          rows={3}
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
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
