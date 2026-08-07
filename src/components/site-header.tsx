import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-teal-700 dark:text-teal-400">Achilla</span>
        <nav className="flex items-center gap-3 text-sm font-medium text-neutral-600 dark:text-neutral-300">
          <Link href="/today">Today</Link>
          <Link href="/notes">Notes</Link>
          <Link href="/history">History</Link>
          <Link href="/calendar">Calendar</Link>
          <Link href="/profile">Profile</Link>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-neutral-500 sm:inline dark:text-neutral-400">
          {user.email}
        </span>
        <SignOutButton />
      </div>
    </header>
  );
}
