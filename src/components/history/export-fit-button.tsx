"use client";

import { useState } from "react";

export function ExportFitButton({ planDate }: { planDate: string }) {
  const [state, setState] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setState("pending");
    setError(null);
    try {
      const res = await fetch("/api/history/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planDate }),
      });
      const data = (await res.json()) as { signedUrl?: string; error?: string };
      if (!res.ok || !data.signedUrl) {
        setError(data.error ?? "Couldn't export. Please try again.");
        setState("error");
        return;
      }
      window.location.href = data.signedUrl;
      setState("idle");
    } catch {
      setError("Couldn't export. Please try again.");
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={state === "pending"}
        className="flex min-h-14 items-center justify-center rounded-xl border-2 border-teal-700 px-6 text-base font-semibold text-teal-700 active:bg-teal-50 disabled:opacity-60 dark:border-teal-400 dark:text-teal-400 dark:active:bg-teal-950/40"
      >
        {state === "pending" ? "Exporting…" : "Export .fit"}
      </button>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
