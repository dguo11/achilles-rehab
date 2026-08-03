"use client";

import { useTransition } from "react";
import { signOutAction } from "@/lib/auth/actions";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => signOutAction())}
      className="text-sm font-medium text-neutral-600 underline-offset-2 hover:underline disabled:opacity-60 dark:text-neutral-400"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
