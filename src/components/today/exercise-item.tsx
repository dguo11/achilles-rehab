"use client";

import { useActionState } from "react";
import {
  toggleExerciseAction,
  setExerciseFeedbackAction,
  type ActionState,
} from "@/app/today/actions";

const initialState: ActionState = {};

function FeedbackToggle({
  dailyPlanEntryId,
  planDate,
  field,
  value,
  active,
  label,
}: {
  dailyPlanEntryId: string;
  planDate: string;
  field: "liked" | "causedPain";
  value: "true" | "false";
  active: boolean;
  label: string;
}) {
  const [, formAction, pending] = useActionState(setExerciseFeedbackAction, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="dailyPlanEntryId" value={dailyPlanEntryId} />
      <input type="hidden" name="planDate" value={planDate} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="value" value={value} />
      <button
        type="submit"
        disabled={pending}
        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
          active
            ? "border-teal-700 bg-teal-700 text-white"
            : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
        }`}
      >
        {label}
      </button>
    </form>
  );
}

export function ExerciseItem({
  id,
  planDate,
  exerciseName,
  sets,
  reps,
  frequency,
  dosageSource,
  initiallyCompleted,
  isCustomGenerated = false,
  initiallyLiked = null,
  initiallyCausedPain = null,
}: {
  id: string;
  planDate: string;
  exerciseName: string;
  sets: number | null;
  reps: number | null;
  frequency: string | null;
  dosageSource: string;
  initiallyCompleted: boolean;
  isCustomGenerated?: boolean;
  initiallyLiked?: boolean | null;
  initiallyCausedPain?: boolean | null;
}) {
  const [state, formAction, pending] = useActionState(toggleExerciseAction, initialState);

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex items-start gap-3">
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
          ) : frequency ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {frequency}
              {dosageSource === "llm-suggested" && (
                <span className="ml-2 text-xs">(suggested)</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Ask your PT for sets/reps.</p>
          )}
          {state.error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.error}</p>}
        </div>
      </div>

      {isCustomGenerated && (
        <div className="flex flex-wrap items-center gap-2 pl-[3.25rem]">
          <span className="text-xs text-neutral-400 dark:text-neutral-500">How was it?</span>
          <FeedbackToggle
            dailyPlanEntryId={id}
            planDate={planDate}
            field="liked"
            value="true"
            active={initiallyLiked === true}
            label="👍 Liked"
          />
          <FeedbackToggle
            dailyPlanEntryId={id}
            planDate={planDate}
            field="liked"
            value="false"
            active={initiallyLiked === false}
            label="👎 Disliked"
          />
          <FeedbackToggle
            dailyPlanEntryId={id}
            planDate={planDate}
            field="causedPain"
            value="false"
            active={initiallyCausedPain === false}
            label="No pain"
          />
          <FeedbackToggle
            dailyPlanEntryId={id}
            planDate={planDate}
            field="causedPain"
            value="true"
            active={initiallyCausedPain === true}
            label="Caused pain"
          />
        </div>
      )}
    </li>
  );
}
