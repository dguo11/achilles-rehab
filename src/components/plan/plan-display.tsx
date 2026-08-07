import type { PlanSnapshot } from "@/lib/plan/generate";

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return [];
}

export function GoalsList({ goals }: { goals: unknown }) {
  const list = asStringList(goals);
  if (list.length === 0) return null;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
      {list.map((g) => (
        <li key={g}>{g}</li>
      ))}
    </ul>
  );
}

export function WeightBearingDisplay({ weightBearing }: { weightBearing: unknown }) {
  if (weightBearing == null) return null;

  if (typeof weightBearing === "string") {
    return <p className="text-sm text-neutral-700 dark:text-neutral-300">{weightBearing}</p>;
  }
  if (Array.isArray(weightBearing)) {
    return (
      <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
        {weightBearing.filter((v): v is string => typeof v === "string").map((v) => (
          <li key={v}>{v}</li>
        ))}
      </ul>
    );
  }
  if (typeof weightBearing === "object") {
    const obj = weightBearing as { label?: string; inferred?: boolean; note?: string };
    return (
      <div className="text-sm text-neutral-700 dark:text-neutral-300">
        <p>
          {obj.label}
          {obj.inferred && (
            <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              inferred, not verbatim from the protocol
            </span>
          )}
        </p>
        {obj.note && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{obj.note}</p>}
      </div>
    );
  }
  return null;
}

export function GaitTrainingList({ gaitTraining }: { gaitTraining: unknown }) {
  const list = asStringList(gaitTraining);
  if (list.length === 0) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        No specific gait-training guidance called out for this phase.
      </p>
    );
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
      {list.map((g) => (
        <li key={g}>{g}</li>
      ))}
    </ul>
  );
}

export function AssistiveDevicesList({ devices }: { devices: unknown }) {
  const list = asStringList(devices);
  if (list.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((d) => (
        <span
          key={d}
          className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
        >
          {d}
        </span>
      ))}
    </div>
  );
}

export function RedFlagsCard({ redFlags }: { redFlags: unknown }) {
  if (!redFlags || typeof redFlags !== "object") return null;
  const obj = redFlags as { action?: string; signs?: unknown; note?: string };
  const signs = asStringList(obj.signs);
  if (signs.length === 0) return null;

  return (
    <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 text-red-950 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100">
      <p className="font-semibold">Contact your care team if you notice:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {signs.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      {obj.action && <p className="mt-3 text-sm font-medium">{obj.action}</p>}
      {obj.note && <p className="mt-2 text-xs text-red-800/80 dark:text-red-200/80">{obj.note}</p>}
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  romMobility: "Range of motion / mobility",
  strengthening: "Strengthening",
  cardio: "Cardio",
  proprioception: "Proprioception",
  balanceProprioception: "Balance / proprioception",
  modalities: "Modalities",
  running: "Running",
  plyometrics: "Plyometrics",
  plyometricsAgility: "Plyometrics / agility",
  progression: "Progression",
  other: "Other",
};

export function ExercisePlanList({
  exercisePlan,
  region,
}: {
  exercisePlan: PlanSnapshot["exercisePlan"];
  region: "achilles" | "rest_of_body";
}) {
  const forRegion = exercisePlan.filter((ex) => ex.region === region);

  if (forRegion.length === 0) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {region === "achilles"
          ? "No ankle/Achilles-specific exercises listed for this phase — follow the goals and guidance above, and check in with your PT for a home program."
          : "No Full-Body Fitness exercises listed for this phase."}
      </p>
    );
  }

  const grouped = new Map<string, typeof exercisePlan>();
  for (const ex of forRegion) {
    const list = grouped.get(ex.category) ?? [];
    list.push(ex);
    grouped.set(ex.category, list);
  }

  return (
    <div className="flex flex-col gap-5">
      {[...grouped.entries()].map(([category, items]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
            {CATEGORY_LABELS[category] ?? category}
          </h3>
          <ul className="mt-2 flex flex-col gap-3">
            {items.map((ex) => (
              <li
                key={ex.exerciseName}
                className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
              >
                <p className="font-medium">{ex.exerciseName}</p>
                {ex.dosageSource === "llm-suggested" ? (
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                      {ex.sets} sets × {ex.reps} reps, {ex.frequency}
                      <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                        Suggested — confirm with your PT
                      </span>
                    </p>
                    {ex.rationale && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{ex.rationale}</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    No dosage suggestion available — ask your PT for sets/reps.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
