import { formatWeightBearing } from "@/lib/plan/format";
import type { PlanSnapshot } from "@/lib/plan/types";

export function PhaseSummary({ phase }: { phase: PlanSnapshot["phase"] }) {
  const weightBearing = formatWeightBearing(phase.weightBearing);
  const phaseTitle = [phase.number ? `Phase ${phase.number}` : null, phase.name].filter(Boolean).join(" — ");

  return (
    <section className="flex flex-col gap-4 rounded-2xl border-2 border-neutral-200 p-5 dark:border-neutral-800">
      <div>
        {phaseTitle && <p className="text-sm font-semibold text-teal-700 dark:text-teal-400">{phaseTitle}</p>}
        <h2 className="text-lg font-bold">{phase.timeframeLabel}</h2>
      </div>

      {phase.goals.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Goals
          </h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
            {phase.goals.map((goal) => (
              <li key={goal}>{goal}</li>
            ))}
          </ul>
        </div>
      )}

      {weightBearing.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Weight-bearing
          </h3>
          <ul className="mt-1 space-y-2">
            {weightBearing.map((entry, i) => (
              <li key={i} className="text-sm text-neutral-700 dark:text-neutral-300">
                {entry.text}
                {entry.inferred && (
                  <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    Inferred, not verbatim from source
                  </span>
                )}
                {entry.note && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{entry.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {phase.assistiveDevices && phase.assistiveDevices.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Assistive devices
          </h3>
          <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
            {phase.assistiveDevices.join(", ")}
          </p>
        </div>
      )}

      {phase.criteriaToProgress && phase.criteriaToProgress.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            To progress past this phase
          </h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
            {phase.criteriaToProgress.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Achilla won&apos;t advance you automatically — you&apos;ll confirm each of these with your PT first.
          </p>
        </div>
      )}
    </section>
  );
}
