"use client";

import { useActionState, useState } from "react";
import {
  AGE_RANGES,
  CARE_TEAM_STATUSES,
  CONSERVATIVE_FACTORS,
  DAILY_DEMANDS,
  EQUIPMENT_OPTIONS,
  EXERCISE_FREQUENCIES,
  FITNESS_LEVELS,
  FITNESS_TRACKERS,
  MOBILITY_AIDS,
  NO_MOBILITY_AID,
  PRIOR_ACTIVITIES,
  PROTOCOL_OPTIONS,
  RECOVERY_GOALS,
  RUPTURE_TYPES,
  WEIGHT_BEARING_STATUSES,
  YES_NO_NOT_SURE,
  protocolAppliesToInjuryType,
  type ProtocolId,
} from "@/lib/intake/schema";
import { NONE_OF_THESE, RED_FLAG_OPTIONS } from "@/lib/safety/red-flags";
import { checkForDistressSignals, SUPPORTIVE_DISTRESS_MESSAGE } from "@/lib/safety/distress";
import { submitIntakeAction, type IntakeActionState } from "@/app/onboarding/intake/actions";

type InjuryType = "surgical" | "non_surgical" | "not_sure";
type ProtocolPreference = "mgb" | "willits" | "not_sure";

type Answers = {
  injuryType: InjuryType | null;
  anchorDate: string;
  side: "left" | "right" | null;
  ruptureType: string | null;
  tendonAugmentation: string | null;
  preExistingTendinosis: string | null;
  currentMobilityAids: string[];
  currentBootWedgeCount: string;
  currentWeightBearingStatus: string | null;
  careTeamStatus: string | null;
  redFlagSigns: string[];
  redFlagAcknowledged: boolean;
  ageRange: string | null;
  conservativeFactors: string[];
  protocolPreference: ProtocolPreference | null;
  resolvedProtocolId: ProtocolId | null;
  fitnessLevel: string;
  priorSports: string[];
  otherSport: string;
  exerciseFrequency: string | null;
  recoveryGoal: string | null;
  dailyDemand: string | null;
  hasStairsAtHome: "yes" | "no" | null;
  homeNotes: string;
  availableEquipment: string[];
  fitnessTracker: string | null;
  confidenceBaseline: number | null;
  motivationBaseline: number | null;
  mentalHealthNote: string;
};

const initialAnswers: Answers = {
  injuryType: null,
  anchorDate: "",
  side: null,
  ruptureType: null,
  tendonAugmentation: null,
  preExistingTendinosis: null,
  currentMobilityAids: [],
  currentBootWedgeCount: "",
  currentWeightBearingStatus: null,
  careTeamStatus: null,
  redFlagSigns: [],
  redFlagAcknowledged: false,
  ageRange: null,
  conservativeFactors: [],
  protocolPreference: null,
  resolvedProtocolId: null,
  fitnessLevel: "",
  priorSports: [],
  otherSport: "",
  exerciseFrequency: null,
  recoveryGoal: null,
  dailyDemand: null,
  hasStairsAtHome: null,
  homeNotes: "",
  availableEquipment: [],
  fitnessTracker: null,
  confidenceBaseline: null,
  motivationBaseline: null,
  mentalHealthNote: "",
};

const initialActionState: IntakeActionState = {};

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-16 w-full items-center justify-center rounded-xl border-2 px-4 text-center text-lg font-semibold transition-colors ${
        selected
          ? "border-teal-700 bg-teal-700 text-white"
          : "border-neutral-300 text-neutral-800 active:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:active:bg-neutral-900"
      }`}
    >
      {children}
    </button>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border-2 px-4 py-2 text-sm font-medium ${
        selected
          ? "border-teal-700 bg-teal-700 text-white"
          : "border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
      }`}
    >
      {children}
    </button>
  );
}

function NextButton({ disabled, onClick, label = "Next" }: { disabled?: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-14 items-center justify-center rounded-xl bg-teal-700 px-6 text-lg font-semibold text-white active:bg-teal-800 disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start text-sm font-medium text-neutral-500 underline-offset-2 hover:underline dark:text-neutral-400"
    >
      ← Back
    </button>
  );
}

function StepShell({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col gap-5">
      {onBack ? <BackLink onClick={onBack} /> : <div className="h-5" />}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
      </div>
      <div className="flex flex-1 flex-col gap-3">{children}</div>
    </div>
  );
}

export function IntakeWizard() {
  const [step, setStep] = useState("injury-type");
  const [, setHistory] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [state, formAction, pending] = useActionState(submitIntakeAction, initialActionState);

  function goTo(next: string) {
    setHistory((h) => [...h, step]);
    setStep(next);
  }

  function goBack() {
    setHistory((h) => {
      const copy = [...h];
      const prev = copy.pop();
      if (prev) setStep(prev);
      return copy;
    });
  }

  function update<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  function toggle(key: "currentMobilityAids" | "priorSports" | "conservativeFactors" | "availableEquipment", value: string) {
    setAnswers((a) => ({
      ...a,
      [key]: a[key].includes(value) ? a[key].filter((v) => v !== value) : [...a[key], value],
    }));
  }

  const isUndecided = answers.injuryType === "not_sure";
  const eligibleProtocols = PROTOCOL_OPTIONS.filter(
    (p) => answers.injuryType === "surgical" || answers.injuryType === "non_surgical"
      ? protocolAppliesToInjuryType(p, answers.injuryType)
      : true,
  );

  // Section 1 — injury & treatment ----------------------------------------

  if (step === "injury-type") {
    return (
      <StepShell title="How was your Achilles rupture treated?">
        <OptionButton selected={answers.injuryType === "surgical"} onClick={() => { update("injuryType", "surgical"); goTo("anchor-date"); }}>
          Surgical repair
        </OptionButton>
        <OptionButton
          selected={answers.injuryType === "non_surgical"}
          onClick={() => {
            update("injuryType", "non_surgical");
            update("resolvedProtocolId", "willits-accelerated");
            goTo("anchor-date");
          }}
        >
          Non-surgical (functional / conservative)
        </OptionButton>
        <OptionButton selected={answers.injuryType === "not_sure"} onClick={() => { update("injuryType", "not_sure"); goTo("anchor-date"); }}>
          Not sure yet
        </OptionButton>
      </StepShell>
    );
  }

  if (step === "anchor-date") {
    const label =
      answers.injuryType === "surgical" ? "Date of your surgery" : answers.injuryType === "non_surgical" ? "Date of your injury" : "Date of your injury";
    return (
      <StepShell title={label} subtitle="This sets your recovery timeline, so try to get it right.">
        <input
          type="date"
          value={answers.anchorDate}
          onChange={(e) => update("anchorDate", e.target.value)}
          className="min-h-14 rounded-xl border-2 border-neutral-300 px-4 text-lg dark:border-neutral-700 dark:bg-neutral-900"
        />
        <div className="flex-1" />
        <NextButton disabled={!answers.anchorDate} onClick={() => goTo("side")} />
      </StepShell>
    );
  }

  if (step === "side") {
    return (
      <StepShell title="Which leg?">
        <div className="grid grid-cols-2 gap-3">
          <OptionButton selected={answers.side === "left"} onClick={() => { update("side", "left"); goTo(isUndecided ? "mobility-aids" : "rupture-type"); }}>
            Left
          </OptionButton>
          <OptionButton selected={answers.side === "right"} onClick={() => { update("side", "right"); goTo(isUndecided ? "mobility-aids" : "rupture-type"); }}>
            Right
          </OptionButton>
        </div>
      </StepShell>
    );
  }

  if (step === "rupture-type") {
    return (
      <StepShell title="Is this…">
        {RUPTURE_TYPES.map((option) => (
          <OptionButton
            key={option.value}
            selected={answers.ruptureType === option.value}
            onClick={() => { update("ruptureType", option.value); goTo(answers.injuryType === "surgical" ? "tendon-augmentation" : "pre-existing-tendinosis"); }}
          >
            {option.label}
          </OptionButton>
        ))}
      </StepShell>
    );
  }

  if (step === "tendon-augmentation") {
    return (
      <StepShell title="Did your surgery involve tendon augmentation or additional procedures?">
        {YES_NO_NOT_SURE.map((option) => (
          <OptionButton
            key={option.value}
            selected={answers.tendonAugmentation === option.value}
            onClick={() => { update("tendonAugmentation", option.value); goTo("pre-existing-tendinosis"); }}
          >
            {option.label}
          </OptionButton>
        ))}
      </StepShell>
    );
  }

  if (step === "pre-existing-tendinosis") {
    return (
      <StepShell title="Did you have ongoing Achilles pain or problems (tendinosis) before this rupture?">
        {YES_NO_NOT_SURE.map((option) => (
          <OptionButton
            key={option.value}
            selected={answers.preExistingTendinosis === option.value}
            onClick={() => { update("preExistingTendinosis", option.value); goTo("mobility-aids"); }}
          >
            {option.label}
          </OptionButton>
        ))}
      </StepShell>
    );
  }

  // Section 2 — current status ---------------------------------------------

  if (step === "mobility-aids") {
    const hasBootWithWedges = answers.currentMobilityAids.includes("Walking boot with heel wedges");
    return (
      <StepShell title="What are you currently using to get around?" subtitle="Select all that apply.">
        <div className="flex flex-wrap gap-2">
          {MOBILITY_AIDS.map((aid) => (
            <Chip key={aid} selected={answers.currentMobilityAids.includes(aid)} onClick={() => toggle("currentMobilityAids", aid)}>
              {aid}
            </Chip>
          ))}
          <Chip
            selected={answers.currentMobilityAids.includes(NO_MOBILITY_AID)}
            onClick={() => setAnswers((a) => ({ ...a, currentMobilityAids: a.currentMobilityAids.includes(NO_MOBILITY_AID) ? [] : [NO_MOBILITY_AID] }))}
          >
            {NO_MOBILITY_AID}
          </Chip>
        </div>
        {hasBootWithWedges && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">How many wedges?</span>
            <div className="flex gap-2">
              {["3", "2", "1"].map((count) => (
                <OptionButton key={count} selected={answers.currentBootWedgeCount === count} onClick={() => update("currentBootWedgeCount", count)}>
                  {count}
                </OptionButton>
              ))}
            </div>
          </label>
        )}
        <div className="flex-1" />
        <NextButton onClick={() => goTo("weight-bearing-status")} />
      </StepShell>
    );
  }

  if (step === "weight-bearing-status") {
    return (
      <StepShell title="Current weight-bearing status">
        {WEIGHT_BEARING_STATUSES.map((option) => (
          <OptionButton
            key={option.value}
            selected={answers.currentWeightBearingStatus === option.value}
            onClick={() => { update("currentWeightBearingStatus", option.value); goTo("care-team-status"); }}
          >
            {option.label}
          </OptionButton>
        ))}
      </StepShell>
    );
  }

  if (step === "care-team-status") {
    return (
      <StepShell title="Who is guiding your recovery?">
        {CARE_TEAM_STATUSES.map((option) => (
          <OptionButton
            key={option.value}
            selected={answers.careTeamStatus === option.value}
            onClick={() => { update("careTeamStatus", option.value); goTo("red-flags"); }}
          >
            {option.label}
          </OptionButton>
        ))}
      </StepShell>
    );
  }

  // Section 3A — red-flag safety screen ------------------------------------

  if (step === "red-flags") {
    function toggleFlag(sign: string) {
      setAnswers((a) => ({ ...a, redFlagSigns: a.redFlagSigns.includes(sign) ? a.redFlagSigns.filter((s) => s !== sign) : [...a.redFlagSigns, sign] }));
    }
    function next() {
      const hasRealFlags = answers.redFlagSigns.some((s) => s !== NONE_OF_THESE);
      goTo(hasRealFlags ? "red-flag-interrupt" : isUndecided ? "fitness" : "age-range");
    }
    return (
      <StepShell title="Right now, are you experiencing any of the following?" subtitle="Select all that apply.">
        <div className="flex flex-col gap-2">
          {RED_FLAG_OPTIONS.map((sign) => (
            <Chip key={sign} selected={answers.redFlagSigns.includes(sign)} onClick={() => toggleFlag(sign)}>
              {sign}
            </Chip>
          ))}
          <Chip
            selected={answers.redFlagSigns.includes(NONE_OF_THESE)}
            onClick={() => setAnswers((a) => ({ ...a, redFlagSigns: a.redFlagSigns.includes(NONE_OF_THESE) ? [] : [NONE_OF_THESE] }))}
          >
            {NONE_OF_THESE}
          </Chip>
        </div>
        <div className="flex-1" />
        <NextButton disabled={answers.redFlagSigns.length === 0} onClick={next} />
      </StepShell>
    );
  }

  if (step === "red-flag-interrupt") {
    return (
      <StepShell title="Please contact your care team">
        <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 text-red-950 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100">
          <p className="font-semibold">What you selected can be a sign of a serious complication.</p>
          <p className="mt-2 text-sm leading-relaxed">
            Please contact your surgeon, physical therapist, or urgent care
            about this as soon as you can — before continuing with any
            exercise plan. Achilla can&apos;t assess this for you.
          </p>
        </div>
        <div className="flex-1" />
        <NextButton
          label="I understand — I'll contact my care team"
          onClick={() => {
            update("redFlagAcknowledged", true);
            goTo(isUndecided ? "fitness" : "age-range");
          }}
        />
      </StepShell>
    );
  }

  // Section 3B — conservative-pacing factors (skipped if undecided) -------

  if (step === "age-range") {
    return (
      <StepShell title="Your age range">
        {AGE_RANGES.map((option) => (
          <OptionButton key={option.value} selected={answers.ageRange === option.value} onClick={() => { update("ageRange", option.value); goTo("conservative-factors"); }}>
            {option.label}
          </OptionButton>
        ))}
      </StepShell>
    );
  }

  if (step === "conservative-factors") {
    return (
      <StepShell title="Do any of these apply?" subtitle="Optional — if any apply, we'll pace your plan more conservatively to keep things safe.">
        <div className="flex flex-col gap-2">
          {CONSERVATIVE_FACTORS.map((factor) => (
            <Chip key={factor} selected={answers.conservativeFactors.includes(factor)} onClick={() => toggle("conservativeFactors", factor)}>
              {factor}
            </Chip>
          ))}
        </div>
        <div className="flex-1" />
        <NextButton onClick={() => goTo("protocol")} />
      </StepShell>
    );
  }

  // Protocol selection (skipped if undecided) ------------------------------

  if (step === "protocol") {
    return (
      <StepShell title="Which protocol is your surgeon or PT using?">
        {answers.injuryType === "surgical" && (
          <OptionButton
            selected={answers.protocolPreference === "mgb"}
            onClick={() => { update("protocolPreference", "mgb"); update("resolvedProtocolId", "mgb-achilles-repair"); goTo("fitness"); }}
          >
            Mass General Brigham
          </OptionButton>
        )}
        <OptionButton
          selected={answers.protocolPreference === "willits"}
          onClick={() => { update("protocolPreference", "willits"); update("resolvedProtocolId", "willits-accelerated"); goTo("fitness"); }}
        >
          Willits (accelerated functional)
        </OptionButton>
        <OptionButton selected={answers.protocolPreference === "not_sure"} onClick={() => { update("protocolPreference", "not_sure"); goTo("protocol-explainer"); }}>
          Not sure
        </OptionButton>
      </StepShell>
    );
  }

  if (step === "protocol-explainer") {
    return (
      <StepShell title="That's okay — pick the closer match for now">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Confirm the actual protocol with your surgeon or PT as soon as you
          can — you&apos;re not locked in, and you can tell us to switch later.
        </p>
        {eligibleProtocols.map((protocol) => (
          <button
            key={protocol.id}
            type="button"
            onClick={() => { update("resolvedProtocolId", protocol.id); goTo("fitness"); }}
            className="rounded-xl border-2 border-neutral-300 p-4 text-left active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-900"
          >
            <p className="text-lg font-semibold">{protocol.label}</p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{protocol.description}</p>
          </button>
        ))}
      </StepShell>
    );
  }

  // Section 4 — baseline activity -------------------------------------------

  if (step === "fitness") {
    return (
      <StepShell title="Before the injury, how active were you?">
        {FITNESS_LEVELS.map((level) => (
          <OptionButton key={level.value} selected={answers.fitnessLevel === level.value} onClick={() => { update("fitnessLevel", level.value); goTo("activities"); }}>
            {level.label}
          </OptionButton>
        ))}
      </StepShell>
    );
  }

  if (step === "activities") {
    return (
      <StepShell title="What activities or sports were you doing?" subtitle="Optional — select all that apply.">
        <div className="flex flex-wrap gap-2">
          {PRIOR_ACTIVITIES.map((sport) => (
            <Chip key={sport} selected={answers.priorSports.includes(sport)} onClick={() => toggle("priorSports", sport)}>
              {sport}
            </Chip>
          ))}
        </div>
        <label className="mt-2 flex flex-col gap-1.5">
          <span className="text-sm font-medium">Other</span>
          <input
            type="text"
            value={answers.otherSport}
            onChange={(e) => update("otherSport", e.target.value)}
            className="min-h-14 rounded-xl border-2 border-neutral-300 px-4 text-lg dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <div className="flex-1" />
        <NextButton onClick={() => goTo("exercise-frequency")} />
      </StepShell>
    );
  }

  if (step === "exercise-frequency") {
    return (
      <StepShell title="Roughly how often did you exercise?">
        {EXERCISE_FREQUENCIES.map((option) => (
          <OptionButton
            key={option.value}
            selected={answers.exerciseFrequency === option.value}
            onClick={() => { update("exerciseFrequency", option.value); goTo("recovery-goal"); }}
          >
            {option.label}
          </OptionButton>
        ))}
      </StepShell>
    );
  }

  // Section 5 — goals & daily life ------------------------------------------

  if (step === "recovery-goal") {
    return (
      <StepShell title="What's your main recovery goal?">
        {RECOVERY_GOALS.map((option) => (
          <OptionButton key={option.value} selected={answers.recoveryGoal === option.value} onClick={() => { update("recoveryGoal", option.value); goTo("daily-demand"); }}>
            {option.label}
          </OptionButton>
        ))}
      </StepShell>
    );
  }

  if (step === "daily-demand") {
    return (
      <StepShell title="What does a typical day demand physically?">
        {DAILY_DEMANDS.map((option) => (
          <OptionButton key={option.value} selected={answers.dailyDemand === option.value} onClick={() => { update("dailyDemand", option.value); goTo("home-setup"); }}>
            {option.label}
          </OptionButton>
        ))}
      </StepShell>
    );
  }

  if (step === "home-setup") {
    return (
      <StepShell title="Do you have stairs to manage at home?">
        <div className="grid grid-cols-2 gap-3">
          <OptionButton selected={answers.hasStairsAtHome === "yes"} onClick={() => update("hasStairsAtHome", "yes")}>Yes</OptionButton>
          <OptionButton selected={answers.hasStairsAtHome === "no"} onClick={() => update("hasStairsAtHome", "no")}>No</OptionButton>
        </div>
        <label className="mt-2 flex flex-col gap-1.5">
          <span className="text-sm font-medium">Anything else about your home setup? (Optional)</span>
          <textarea
            value={answers.homeNotes}
            onChange={(e) => update("homeNotes", e.target.value)}
            rows={3}
            className="rounded-xl border-2 border-neutral-300 p-4 text-lg dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <div className="flex-1" />
        <NextButton disabled={!answers.hasStairsAtHome} onClick={() => goTo("equipment")} />
      </StepShell>
    );
  }

  if (step === "equipment") {
    return (
      <StepShell title="What equipment can you access?" subtitle="Select all that apply — we'll only suggest exercises you can actually do.">
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_OPTIONS.map((item) => (
            <Chip key={item} selected={answers.availableEquipment.includes(item)} onClick={() => toggle("availableEquipment", item)}>
              {item}
            </Chip>
          ))}
        </div>
        <div className="flex-1" />
        <NextButton onClick={() => goTo("fitness-tracker")} />
      </StepShell>
    );
  }

  if (step === "fitness-tracker") {
    return (
      <StepShell title="Do you use a fitness tracker you'd like to sync workouts to?">
        {FITNESS_TRACKERS.map((option) => (
          <OptionButton key={option.value} selected={answers.fitnessTracker === option.value} onClick={() => { update("fitnessTracker", option.value); goTo("confidence"); }}>
            {option.label}
          </OptionButton>
        ))}
      </StepShell>
    );
  }

  // Section 6 — how you're doing --------------------------------------------

  if (step === "confidence") {
    return (
      <StepShell title="How confident are you feeling about your recovery right now?" subtitle="1 = not at all, 5 = very confident">
        <div className="flex justify-between gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <OptionButton key={n} selected={answers.confidenceBaseline === n} onClick={() => { update("confidenceBaseline", n); goTo("motivation"); }}>
              {n}
            </OptionButton>
          ))}
        </div>
      </StepShell>
    );
  }

  if (step === "motivation") {
    return (
      <StepShell title="How's your motivation to do your daily rehab right now?" subtitle="1 = low, 5 = high">
        <div className="flex justify-between gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <OptionButton key={n} selected={answers.motivationBaseline === n} onClick={() => { update("motivationBaseline", n); goTo("mental-health-note"); }}>
              {n}
            </OptionButton>
          ))}
        </div>
      </StepShell>
    );
  }

  if (step === "mental-health-note") {
    const flagged = checkForDistressSignals(answers.mentalHealthNote);
    return (
      <StepShell title="Anything on your mind about your recovery?" subtitle="Optional — there are no wrong answers.">
        <textarea
          value={answers.mentalHealthNote}
          onChange={(e) => update("mentalHealthNote", e.target.value)}
          rows={5}
          className="rounded-xl border-2 border-neutral-300 p-4 text-lg dark:border-neutral-700 dark:bg-neutral-900"
        />
        {flagged && (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-semibold">{SUPPORTIVE_DISTRESS_MESSAGE.title}</p>
            <p className="mt-1 text-sm leading-relaxed">{SUPPORTIVE_DISTRESS_MESSAGE.body}</p>
            <p className="mt-2 text-sm font-medium">{SUPPORTIVE_DISTRESS_MESSAGE.crisisLine}</p>
          </div>
        )}
        <div className="flex-1" />
        <NextButton onClick={() => goTo("review")} />
      </StepShell>
    );
  }

  // Review + submit ----------------------------------------------------------

  const allSports = [...answers.priorSports, ...(answers.otherSport.trim() ? [answers.otherSport.trim()] : [])];
  const protocol = PROTOCOL_OPTIONS.find((p) => p.id === answers.resolvedProtocolId);

  function handleSubmit() {
    const fd = new FormData();
    fd.set("mode", isUndecided ? "undecided" : "full");
    fd.set("injuryType", answers.injuryType ?? "");
    fd.set("anchorDate", answers.anchorDate);
    fd.set("side", answers.side ?? "");
    if (!isUndecided) {
      fd.set("ruptureType", answers.ruptureType ?? "");
      if (answers.tendonAugmentation) fd.set("tendonAugmentation", answers.tendonAugmentation);
      fd.set("preExistingTendinosis", answers.preExistingTendinosis ?? "");
      if (answers.ageRange) fd.set("ageRange", answers.ageRange);
      answers.conservativeFactors.forEach((f) => fd.append("conservativeFactors", f));
      fd.set("protocolPreference", answers.protocolPreference ?? "");
      fd.set("resolvedProtocolId", answers.resolvedProtocolId ?? "");
    }
    answers.currentMobilityAids.forEach((a) => fd.append("currentMobilityAids", a));
    if (answers.currentBootWedgeCount) fd.set("currentBootWedgeCount", answers.currentBootWedgeCount);
    fd.set("currentWeightBearingStatus", answers.currentWeightBearingStatus ?? "");
    fd.set("careTeamStatus", answers.careTeamStatus ?? "");
    answers.redFlagSigns.filter((s) => s !== NONE_OF_THESE).forEach((s) => fd.append("redFlagSigns", s));
    fd.set("fitnessLevel", answers.fitnessLevel);
    allSports.forEach((sport) => fd.append("priorSports", sport));
    fd.set("exerciseFrequency", answers.exerciseFrequency ?? "");
    fd.set("recoveryGoal", answers.recoveryGoal ?? "");
    fd.set("dailyDemand", answers.dailyDemand ?? "");
    fd.set("hasStairsAtHome", answers.hasStairsAtHome ?? "");
    fd.set("homeNotes", answers.homeNotes);
    answers.availableEquipment.forEach((e) => fd.append("availableEquipment", e));
    fd.set("fitnessTracker", answers.fitnessTracker ?? "");
    fd.set("confidenceBaseline", String(answers.confidenceBaseline ?? ""));
    fd.set("motivationBaseline", String(answers.motivationBaseline ?? ""));
    fd.set("mentalHealthNote", answers.mentalHealthNote);
    formAction(fd);
  }

  return (
    <StepShell title="Review your answers" onBack={goBack}>
      <dl className="flex flex-col gap-3 text-sm">
        <div>
          <dt className="font-medium text-neutral-500 dark:text-neutral-400">Treatment</dt>
          <dd>
            {answers.injuryType === "surgical" ? "Surgical" : answers.injuryType === "non_surgical" ? "Non-surgical" : "Not yet decided"}, {answers.side} side
          </dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-500 dark:text-neutral-400">Anchor date</dt>
          <dd>{answers.anchorDate}</dd>
        </div>
        {!isUndecided && (
          <div>
            <dt className="font-medium text-neutral-500 dark:text-neutral-400">Protocol</dt>
            <dd>{protocol?.label}</dd>
          </div>
        )}
        {answers.fitnessLevel && (
          <div>
            <dt className="font-medium text-neutral-500 dark:text-neutral-400">Fitness level</dt>
            <dd>{FITNESS_LEVELS.find((f) => f.value === answers.fitnessLevel)?.label}</dd>
          </div>
        )}
        {allSports.length > 0 && (
          <div>
            <dt className="font-medium text-neutral-500 dark:text-neutral-400">Prior activities</dt>
            <dd>{allSports.join(", ")}</dd>
          </div>
        )}
      </dl>

      {isUndecided && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Since your treatment type isn&apos;t decided yet, we&apos;ll save
          this and ask you to confirm with your care team before we build
          your daily plan.
        </p>
      )}

      {state.error && (
        <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="flex-1" />
      <NextButton disabled={pending} onClick={handleSubmit} label={pending ? "Saving…" : "Submit"} />
    </StepShell>
  );
}
