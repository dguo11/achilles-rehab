"use client";

import { useTransition } from "react";
import { clearProfileAction } from "@/app/profile/actions";

export function ClearRestartButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      "This discontinues your current protocol and sends you back through onboarding from scratch. Your past answers and history stay on file, just no longer active. Continue?",
    );
    if (!confirmed) return;
    startTransition(() => {
      clearProfileAction();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex min-h-14 items-center justify-center rounded-xl border-2 border-red-300 px-6 text-base font-semibold text-red-700 active:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-400 dark:active:bg-red-950/40"
    >
      {isPending ? "Restarting…" : "Clear & restart onboarding"}
    </button>
  );
}
