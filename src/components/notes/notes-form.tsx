"use client";

import { useActionState, useState } from "react";
import { submitNoteAction, type NoteActionState } from "@/app/notes/actions";
import { ScalePicker } from "@/components/shared/scale-picker";
import { checkForDistressSignals, SUPPORTIVE_DISTRESS_MESSAGE } from "@/lib/safety/distress";

const initialState: NoteActionState = {};

const SWELLING_LEVELS = [
  { value: "none", label: "None" },
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
];

type Initial = {
  painLevel: number | null;
  swellingLevel: string | null;
  romNotes: string | null;
  moodLevel: number | null;
  motivationLevel: number | null;
  physicalHealthText: string | null;
  mentalHealthText: string | null;
  redFlagSigns: string[];
};

export function NotesForm({
  noteDate,
  redFlagOptions,
  initial,
}: {
  noteDate: string;
  redFlagOptions: string[];
  initial: Initial;
}) {
  const [state, formAction, pending] = useActionState(submitNoteAction, initialState);
  const [pain, setPain] = useState<number | null>(initial.painLevel);
  const [swelling, setSwelling] = useState<string | null>(initial.swellingLevel);
  const [mood, setMood] = useState<number | null>(initial.moodLevel);
  const [motivation, setMotivation] = useState<number | null>(initial.motivationLevel);
  const [redFlags, setRedFlags] = useState<string[]>(initial.redFlagSigns);
  const [mentalHealthText, setMentalHealthText] = useState(initial.mentalHealthText ?? "");

  const liveDistress = checkForDistressSignals(mentalHealthText);

  function toggleFlag(sign: string) {
    setRedFlags((flags) => (flags.includes(sign) ? flags.filter((f) => f !== sign) : [...flags, sign]));
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="noteDate" value={noteDate} />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Physical</h2>
        <ScalePicker name="painLevel" value={pain} onChange={setPain} label="Pain today (0–10)" />
        <div>
          <p className="text-sm font-medium">Swelling</p>
          <div className="mt-1.5 flex gap-2">
            {SWELLING_LEVELS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSwelling(s.value)}
                className={`rounded-full border-2 px-3 py-1.5 text-sm font-medium ${
                  swelling === s.value
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <input type="hidden" name="swellingLevel" value={swelling ?? ""} />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Range of motion notes (optional)</span>
          <textarea
            name="romNotes"
            defaultValue={initial.romNotes ?? ""}
            rows={2}
            className="rounded-xl border-2 border-neutral-300 p-3 text-base dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Anything else physical? (optional)</span>
          <textarea
            name="physicalHealthText"
            defaultValue={initial.physicalHealthText ?? ""}
            rows={2}
            className="rounded-xl border-2 border-neutral-300 p-3 text-base dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
      </section>

      {redFlagOptions.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Any of these today?</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Select any that apply — none is fine.</p>
          <div className="flex flex-wrap gap-2">
            {redFlagOptions.map((sign) => (
              <button
                key={sign}
                type="button"
                onClick={() => toggleFlag(sign)}
                className={`rounded-full border-2 px-3 py-1.5 text-sm font-medium ${
                  redFlags.includes(sign)
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
                }`}
              >
                {sign}
              </button>
            ))}
          </div>
          {redFlags.map((sign) => (
            <input key={sign} type="hidden" name="redFlagSigns" value={sign} />
          ))}
          {redFlags.length > 0 && (
            <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-sm text-red-950 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100">
              What you selected can be a sign of a complication. Please contact your surgeon or
              physical therapist about this — Achilla can&apos;t assess it for you.
            </div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">How you&apos;re doing</h2>
        <ScalePicker name="moodLevel" min={1} max={5} value={mood} onChange={setMood} label="Mood (1–5)" />
        <ScalePicker
          name="motivationLevel"
          min={1}
          max={5}
          value={motivation}
          onChange={setMotivation}
          label="Motivation (1–5)"
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Anything on your mind? (optional)</span>
          <textarea
            name="mentalHealthText"
            value={mentalHealthText}
            onChange={(e) => setMentalHealthText(e.target.value)}
            rows={4}
            className="rounded-xl border-2 border-neutral-300 p-3 text-base dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        {liveDistress && (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-semibold">{SUPPORTIVE_DISTRESS_MESSAGE.title}</p>
            <p className="mt-1 text-sm leading-relaxed">{SUPPORTIVE_DISTRESS_MESSAGE.body}</p>
            <p className="mt-2 text-sm font-medium">{SUPPORTIVE_DISTRESS_MESSAGE.crisisLine}</p>
          </div>
        )}
      </section>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p className="text-sm font-medium text-teal-700 dark:text-teal-400">Saved.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-14 items-center justify-center rounded-xl bg-teal-700 px-6 text-lg font-semibold text-white active:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save today's note"}
      </button>
    </form>
  );
}
