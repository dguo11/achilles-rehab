"use client";

import { useActionState } from "react";
import { toggleExerciseAction, type ActionState } from "@/app/today/actions";

const initialState: ActionState = {};

export function ExerciseItem({
  id,
  planDate,
  exerciseName,
  sets,
  reps,
  frequency,
  dosageSource,
  initiallyCompleted,
}: {
  id: string;
  planDate: string;
  exerciseName: string;
  sets: number | null;
  reps: number | null;
  frequency: string | null;
  dosageSource: string;
  initiallyCompleted: boolean;
}) {
  const [state, formAction, pending] = useActionState(toggleExerciseAction, initialState);

  return (
    <li className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <form action={formAction}>
        <input type="hidden" name="dailyPlanEntryId" value={id} />
        <input type="hidden" name="planDate" value={planDate} />
        <input type="hidden" name="completed" value={(!initiallyCompleted).toString()} />
        <button
          type="submit"
          disabled={pending}
          aria-label={initiallyCompleted ? "Mark not done" : "Mark done"}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold transition-colors ${
            initiallyCompleted
              ? "border-teal-700 bg-teal-700 text-white"
              : "border-neutral-300 text-transparent dark:border-neutral-700"
          }`}
        >
          ✓
        </button>
      </form>
      <div className="flex-1">
        <p className={`font-medium ${initiallyCompleted ? "line-through text-neutral-400" : ""}`}>
          {exerciseName}
        </p>
        {sets && reps ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {sets} sets × {reps} reps{frequency ? `, ${frequency}` : ""}
            {dosageSource === "llm-suggested" && (
              <span className="ml-2 text-xs">(suggested)</span>
            )}
          </p>
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Ask your PT for sets/reps.</p>
        )}
        {state.error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.error}</p>}
      </div>
    </li>
  );
}
