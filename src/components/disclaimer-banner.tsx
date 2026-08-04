export function DisclaimerBanner() {
  return (
    <div
      role="note"
      className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <p className="text-base font-semibold">Not a medical device</p>
      <p className="mt-1 text-sm leading-relaxed">
        Achilla is a rehab support tool. It does not replace advice from your
        surgeon or physical therapist. Always have your care team review your
        generated plan before you start it, and confirm with them before
        moving to a new recovery phase.
      </p>
    </div>
  );
}
