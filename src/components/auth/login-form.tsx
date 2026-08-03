"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, type AuthActionState } from "@/lib/auth/actions";

const initialState: AuthActionState = {};

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          className="min-h-14 rounded-xl border-2 border-neutral-300 px-4 text-lg dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="min-h-14 rounded-xl border-2 border-neutral-300 px-4 text-lg dark:border-neutral-700 dark:bg-neutral-900"
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
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
        No account yet?{" "}
        <Link href="/signup" className="font-semibold text-teal-700 dark:text-teal-400">
          Get started
        </Link>
      </p>
    </form>
  );
}
