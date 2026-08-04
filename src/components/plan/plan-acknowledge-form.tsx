"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PlanAcknowledgeForm({ planReviewId }: { planReviewId: string }) {
  const [checked, setChecked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!checked) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/plan/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledge: true, planReviewId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border-2 border-teal-300 bg-teal-50 p-5 dark:border-teal-700 dark:bg-teal-950/40"
    >
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-1 h-6 w-6 shrink-0"
        />
        <span className="text-base font-medium text-teal-950 dark:text-teal-100">
          I&apos;ve reviewed this plan with my physical therapist.
        </span>
      </label>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!checked || pending}
        className="flex min-h-14 items-center justify-center rounded-xl bg-teal-700 px-6 text-lg font-semibold text-white active:bg-teal-800 disabled:opacity-40"
      >
        {pending ? "Unlocking…" : "Unlock my daily plan"}
      </button>
    </form>
  );
}
