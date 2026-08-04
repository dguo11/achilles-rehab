import { categoryLabel } from "@/lib/plan/format";
import type { PlanSnapshotExercise } from "@/lib/plan/types";

export function ExerciseList({ exercises }: { exercises: PlanSnapshotExercise[] }) {
  const byCategory = new Map<string, PlanSnapshotExercise[]>();
  for (const exercise of exercises) {
    const category = exercise.category ?? "other";
    byCategory.set(category, [...(byCategory.get(category) ?? []), exercise]);
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border-2 border-neutral-200 p-5 dark:border-neutral-800">
      <div>
        <h2 className="text-lg font-bold">Your exercises</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Dosage below is suggested — confirm it with your PT. You&apos;ll be able to adjust sets, reps, and
          frequency once your plan unlocks.
        </p>
      </div>

      {Array.from(byCategory.entries()).map(([category, categoryExercises]) => (
        <div key={category} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {categoryLabel(category)}
          </h3>
          <ul className="flex flex-col gap-2">
            {categoryExercises.map((ex) => (
              <li key={ex.exerciseName} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <p className="font-medium">{ex.exerciseName}</p>
                {ex.suggestedSets || ex.suggestedReps || ex.suggestedFrequency ? (
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                    <span>
                      {[
                        ex.suggestedSets ? `${ex.suggestedSets} sets` : null,
                        ex.suggestedReps ? `${ex.suggestedReps} reps` : null,
                        ex.suggestedFrequency,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                      Suggested
                    </span>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    No dosage suggested yet — set this with your PT.
                  </p>
                )}
                {ex.rationale && (
                  <p className="mt-1 text-xs italic text-neutral-500 dark:text-neutral-400">{ex.rationale}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
