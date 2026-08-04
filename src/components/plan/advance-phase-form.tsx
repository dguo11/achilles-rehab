"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdvancePhaseForm({
  criteria,
  nextPhaseName,
}: {
  criteria: string[];
  nextPhaseName: string;
}) {
  const [checked, setChecked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const requiresCriteria = criteria.length > 0;
  const allChecked = !requiresCriteria || criteria.every((c) => checked.includes(c));

  function toggle(criterion: string) {
    setChecked((c) => (c.includes(criterion) ? c.filter((x) => x !== criterion) : [...c, criterion]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allChecked) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/plan/advance-phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmedCriteria: checked, reviewerNote: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      router.push("/today");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {requiresCriteria && (
        <div className="flex flex-col gap-2">
          {criteria.map((criterion) => (
            <label
              key={criterion}
              className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
            >
              <input
                type="checkbox"
                checked={checked.includes(criterion)}
                onChange={() => toggle(criterion)}
                className="mt-1 h-5 w-5 shrink-0"
              />
              <span className="text-sm">{criterion}</span>
            </label>
          ))}
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Note for your records (optional)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="e.g. confirmed with Dr. Smith on 8/4"
          className="rounded-xl border-2 border-neutral-300 p-3 text-base dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!allChecked || pending}
        className="flex min-h-14 items-center justify-center rounded-xl bg-teal-700 px-6 text-lg font-semibold text-white active:bg-teal-800 disabled:opacity-40"
      >
        {pending ? "Advancing…" : `Confirm and move to ${nextPhaseName}`}
      </button>
    </form>
  );
}
