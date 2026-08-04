export function UnverifiedProtocolBadge() {
  return (
    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border-2 border-amber-400 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
      Self-uploaded, unverified — reviewed by you, not a clinician
    </p>
  );
}
