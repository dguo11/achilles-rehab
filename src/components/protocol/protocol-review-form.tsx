"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmProtocolAction } from "@/app/protocol/upload/[uploadId]/review/actions";
import type { ExtractedProtocol } from "@/lib/gemini/extract-protocol";

type ExtractedPhase = ExtractedProtocol["phases"][number];

type PhaseFormState = {
  name: string;
  timeframeLabel: string;
  timeframeStartDays: string;
  timeframeEndDays: string;
  goalsText: string;
  weightBearing: string;
  interventionsText: string;
  criteriaText: string;
};

function phaseToFormState(p?: ExtractedPhase): PhaseFormState {
  return {
    name: p?.name ?? "",
    timeframeLabel: p?.timeframeLabel ?? "",
    timeframeStartDays: p?.timeframeStartDays != null ? String(p.timeframeStartDays) : "",
    timeframeEndDays: p?.timeframeEndDays != null ? String(p.timeframeEndDays) : "",
    goalsText: (p?.goals ?? []).join("\n"),
    weightBearing: p?.weightBearing ?? "",
    interventionsText: (p?.interventions ?? []).map((c) => `${c.category}: ${c.items.join(", ")}`).join("\n"),
    criteriaText: (p?.criteriaToProgress ?? []).join("\n"),
  };
}

function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseInterventionsText(text: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const line of text.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const category = line.slice(0, idx).trim();
    const items = line
      .slice(idx + 1)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (category && items.length > 0) result[category] = items;
  }
  return result;
}

const inputClass =
  "min-h-12 rounded-xl border-2 border-neutral-300 px-3 text-base dark:border-neutral-700 dark:bg-neutral-900";
const textareaClass =
  "rounded-xl border-2 border-neutral-300 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900";

export function ProtocolReviewForm({
  uploadId,
  initial,
}: {
  uploadId: string;
  initial: ExtractedProtocol | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [protocolName, setProtocolName] = useState(initial?.name ?? "");
  const [appliesTo, setAppliesTo] = useState<string[]>(["surgical"]);
  const [gating, setGating] = useState<"time" | "time_and_criterion">("time");
  const [redFlagsText, setRedFlagsText] = useState((initial?.redFlagSigns ?? []).join("\n"));
  const [phases, setPhases] = useState<PhaseFormState[]>(
    initial && initial.phases.length > 0 ? initial.phases.map(phaseToFormState) : [phaseToFormState()],
  );

  function updatePhase(i: number, patch: Partial<PhaseFormState>) {
    setPhases((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function addPhase() {
    setPhases((prev) => [...prev, phaseToFormState()]);
  }
  function removePhase(i: number) {
    setPhases((prev) => prev.filter((_, idx) => idx !== i));
  }
  function toggleAppliesTo(value: string) {
    setAppliesTo((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function handleSubmit() {
    setError(null);
    if (!protocolName.trim()) {
      setError("Give your protocol a name.");
      return;
    }
    if (appliesTo.length === 0) {
      setError("Pick at least one: surgical or non-surgical.");
      return;
    }
    for (const p of phases) {
      if (!p.timeframeLabel.trim()) {
        setError("Every phase needs a timeframe (e.g. \"0–2 weeks\").");
        return;
      }
    }

    const payload = {
      protocolName: protocolName.trim(),
      appliesTo,
      gating,
      redFlagSigns: linesToArray(redFlagsText),
      phases: phases.map((p) => ({
        name: p.name.trim() || null,
        timeframeLabel: p.timeframeLabel.trim(),
        timeframeStartDays: p.timeframeStartDays.trim() ? Number(p.timeframeStartDays) : null,
        timeframeEndDays: p.timeframeEndDays.trim() ? Number(p.timeframeEndDays) : null,
        goals: linesToArray(p.goalsText),
        weightBearing: p.weightBearing.trim() || null,
        interventions: parseInterventionsText(p.interventionsText),
        criteriaToProgress: linesToArray(p.criteriaText).length > 0 ? linesToArray(p.criteriaText) : null,
      })),
    };

    startTransition(async () => {
      const result = await confirmProtocolAction(uploadId, payload);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push("/plan/review");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Protocol name</span>
          <input
            className={inputClass}
            value={protocolName}
            onChange={(e) => setProtocolName(e.target.value)}
            placeholder="e.g. Dr. Smith's Achilles protocol"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Applies to</span>
          <div className="flex gap-2">
            {[
              { value: "surgical", label: "Surgical" },
              { value: "non_surgical", label: "Non-surgical" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleAppliesTo(opt.value)}
                className={`rounded-full border-2 px-4 py-2 text-sm font-medium ${
                  appliesTo.includes(opt.value)
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">How do phases advance?</span>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="gating"
                checked={gating === "time"}
                onChange={() => setGating("time")}
              />
              By date only
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="gating"
                checked={gating === "time_and_criterion"}
                onChange={() => setGating("time_and_criterion")}
              />
              By date, plus criteria you confirm each time
            </label>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Red-flag / when-to-call-your-doctor signs (optional)</span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            One per line. Leave blank to use Achilla&apos;s standard post-op safety list instead.
          </span>
          <textarea
            className={textareaClass}
            rows={3}
            value={redFlagsText}
            onChange={(e) => setRedFlagsText(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Phases</h2>
        {phases.map((phase, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">Phase {i + 1}</span>
              {phases.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePhase(i)}
                  className="text-sm font-medium text-red-700 dark:text-red-400"
                >
                  Remove
                </button>
              )}
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Name (optional)</span>
              <input
                className={inputClass}
                value={phase.name}
                onChange={(e) => updatePhase(i, { name: e.target.value })}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Timeframe</span>
              <input
                className={inputClass}
                value={phase.timeframeLabel}
                onChange={(e) => updatePhase(i, { timeframeLabel: e.target.value })}
                placeholder="e.g. 0–2 weeks after surgery"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Starts, day (optional)</span>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={phase.timeframeStartDays}
                  onChange={(e) => updatePhase(i, { timeframeStartDays: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Ends, day (optional)</span>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={phase.timeframeEndDays}
                  onChange={(e) => updatePhase(i, { timeframeEndDays: e.target.value })}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Weight-bearing rule</span>
              <textarea
                className={textareaClass}
                rows={2}
                value={phase.weightBearing}
                onChange={(e) => updatePhase(i, { weightBearing: e.target.value })}
                placeholder="e.g. Non-weight-bearing, crutches"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Goals</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">One per line.</span>
              <textarea
                className={textareaClass}
                rows={3}
                value={phase.goalsText}
                onChange={(e) => updatePhase(i, { goalsText: e.target.value })}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Exercises</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                One category per line, as &quot;Category: exercise 1, exercise 2&quot;.
              </span>
              <textarea
                className={textareaClass}
                rows={4}
                value={phase.interventionsText}
                onChange={(e) => updatePhase(i, { interventionsText: e.target.value })}
                placeholder="Range of motion: ankle pumps, alphabet tracing"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Criteria to progress (optional)</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">One per line.</span>
              <textarea
                className={textareaClass}
                rows={2}
                value={phase.criteriaText}
                onChange={(e) => updatePhase(i, { criteriaText: e.target.value })}
              />
            </label>
          </div>
        ))}

        <button
          type="button"
          onClick={addPhase}
          className="flex min-h-12 items-center justify-center rounded-xl border-2 border-neutral-300 px-6 text-sm font-semibold text-neutral-800 active:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:active:bg-neutral-900"
        >
          + Add phase
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="flex min-h-14 items-center justify-center rounded-xl bg-teal-700 px-6 text-lg font-semibold text-white active:bg-teal-800 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Confirm and use this protocol"}
      </button>
    </div>
  );
}
