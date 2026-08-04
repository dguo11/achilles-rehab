export type RedFlagsData = {
  source: "protocol" | "achilla-baseline";
  action: string;
  signs: string[];
  note?: string;
};

/**
 * The shape written into `plan_reviews.generated_plan_snapshot`. This is
 * deliberately a self-contained copy of everything the review screen needs
 * (protocol name/source/red flags/notes, the resolved phase, and the
 * dosage-suggested exercise list) — the whole point of freezing a snapshot
 * is that it renders identically even if the underlying protocol/phase rows
 * change later.
 */
export type PlanSnapshot = {
  generatedAt: string;
  protocol: {
    id: string;
    name: string;
    source: string;
    globalNotes: string[];
    redFlags: RedFlagsData | null;
  };
  phase: {
    orderIndex: number;
    number: number | null;
    name: string | null;
    timeframeLabel: string;
    goals: string[];
    weightBearing: unknown;
    assistiveDevices: string[] | null;
    interventions: Record<string, string[]>;
    criteriaToProgress: string[] | null;
  };
  exercises: PlanSnapshotExercise[];
};

export type PlanSnapshotExercise = {
  exerciseName: string;
  category: string | null;
  suggestedSets: number | null;
  suggestedReps: number | null;
  suggestedFrequency: string | null;
  rationale: string | null;
  dosageSource: "llm-suggested";
};
