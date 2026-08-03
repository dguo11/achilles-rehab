"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, type AuthActionState } from "@/lib/auth/actions";

const initialState: AuthActionState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  if (state.checkEmail) {
    return (
      <div className="rounded-2xl border-2 border-teal-300 bg-teal-50 p-5 text-teal-950 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-100">
        <p className="font-semibold">Check your email</p>
        <p className="mt-1 text-sm leading-relaxed">
          We sent you a confirmation link. Tap it to finish setting up your
          account, then come back here to sign in.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
          autoComplete="new-password"
          required
          minLength={8}
          className="min-h-14 rounded-xl border-2 border-neutral-300 px-4 text-lg dark:border-neutral-700 dark:bg-neutral-900"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Confirm password</span>
        <input
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          minLength={8}
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
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-teal-700 dark:text-teal-400">
          Sign in
        </Link>
      </p>
    </form>
  );
}
