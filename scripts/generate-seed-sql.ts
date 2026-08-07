// One-off generator: reads data/achilles-protocols.seed.json and writes
// supabase/seed/seed_protocols.sql — plain INSERT statements (with
// ON CONFLICT upserts, so re-running the seed after an edit is safe) that
// get applied via the Supabase migration tool. Kept separate from a
// service-role-key-based runtime script because seeding only ever needs to
// happen from a trusted operator running this repo, not from the deployed
// app.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Phase = {
  orderIndex: number;
  number: number | null;
  name: string | null;
  timeframeLabel: string;
  timeframeStartDays: number | null;
  timeframeEndDays: number | null;
  goals?: string[];
  weightBearing?: unknown;
  assistiveDevices?: string[];
  interventions: Record<string, unknown>;
  achillesInterventions?: Record<string, unknown>;
  restOfBodyInterventions?: Record<string, unknown>;
  gaitTraining?: string[] | null;
  criteriaToProgress?: string[];
  criteriaToDischarge?: string[];
  continuesFromOrderIndexes?: number[];
};

type Protocol = {
  id: string;
  name: string;
  source: string;
  appliesTo: string[];
  gating: string;
  globalNotes: string[];
  redFlags?: unknown;
  supportingPrograms?: unknown;
  phases: Phase[];
};

type SeedFile = { protocols: Protocol[] };

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlStringArray(values: string[]): string {
  return `ARRAY[${values.map(sqlString).join(", ")}]::text[]`;
}

function sqlJsonb(value: unknown): string {
  const json = JSON.stringify(value ?? null);
  // Dollar-quote so we never have to hand-escape single quotes inside JSON text.
  return `$jsonb$${json}$jsonb$::jsonb`;
}

function sqlIntArrayOrNull(values: number[] | undefined): string {
  if (!values || values.length === 0) return "null";
  return `ARRAY[${values.join(", ")}]::int[]`;
}

function sqlIntOrNull(value: number | null | undefined): string {
  return value === null || value === undefined ? "null" : String(value);
}

function sqlNullableString(value: string | null | undefined): string {
  return value === null || value === undefined ? "null" : sqlString(value);
}

const seedPath = join(process.cwd(), "data/achilles-protocols.seed.json");
const seed: SeedFile = JSON.parse(readFileSync(seedPath, "utf-8"));

const lines: string[] = [];
lines.push(
  "-- Generated from data/achilles-protocols.seed.json by scripts/generate-seed-sql.ts.",
  "-- Do not hand-edit; edit the JSON and regenerate instead.",
  "-- No explicit begin/commit here: the migration runner already wraps this",
  "-- in its own transaction.",
  "",
  "-- Clear any previously seeded rows for these two protocols (their phases",
  "-- cascade-delete) so this script is safe to re-run after a JSON edit.",
  `delete from public.protocols where id in (${seed.protocols.map((p) => sqlString(p.id)).join(", ")});`,
  "",
);

for (const protocol of seed.protocols) {
  lines.push(
    `insert into public.protocols (id, name, source, applies_to, gating, global_notes, red_flags, supporting_programs, raw_json, is_verified, created_by)`,
    `values (`,
    `  ${sqlString(protocol.id)},`,
    `  ${sqlString(protocol.name)},`,
    `  ${sqlString(protocol.source)},`,
    `  ${sqlStringArray(protocol.appliesTo)},`,
    `  ${sqlString(protocol.gating)},`,
    `  ${sqlJsonb(protocol.globalNotes)},`,
    `  ${sqlJsonb(protocol.redFlags ?? null)},`,
    `  ${sqlJsonb(protocol.supportingPrograms ?? null)},`,
    `  ${sqlJsonb(protocol)},`,
    `  true,`,
    `  null`,
    `);`,
    "",
  );

  for (const phase of protocol.phases) {
    lines.push(
      `insert into public.protocol_phases (protocol_id, order_index, number, name, timeframe_label, timeframe_start_days, timeframe_end_days, goals, weight_bearing, interventions, achilles_interventions, rest_of_body_interventions, gait_training, criteria_to_progress, criteria_to_discharge, continues_from_order_indexes, assistive_devices)`,
      `values (`,
      `  ${sqlString(protocol.id)},`,
      `  ${phase.orderIndex},`,
      `  ${sqlIntOrNull(phase.number)},`,
      `  ${sqlNullableString(phase.name)},`,
      `  ${sqlString(phase.timeframeLabel)},`,
      `  ${sqlIntOrNull(phase.timeframeStartDays)},`,
      `  ${sqlIntOrNull(phase.timeframeEndDays)},`,
      `  ${sqlJsonb(phase.goals ?? [])},`,
      `  ${sqlJsonb(phase.weightBearing ?? null)},`,
      `  ${sqlJsonb(phase.interventions ?? {})},`,
      `  ${sqlJsonb(phase.achillesInterventions ?? {})},`,
      `  ${sqlJsonb(phase.restOfBodyInterventions ?? {})},`,
      `  ${sqlJsonb(phase.gaitTraining ?? null)},`,
      `  ${sqlJsonb(phase.criteriaToProgress ?? null)},`,
      `  ${sqlJsonb(phase.criteriaToDischarge ?? null)},`,
      `  ${sqlIntArrayOrNull(phase.continuesFromOrderIndexes)},`,
      `  ${sqlJsonb(phase.assistiveDevices ?? [])}`,
      `);`,
      "",
    );
  }
}


const outPath = join(process.cwd(), "supabase/seed/seed_protocols.sql");
writeFileSync(outPath, lines.join("\n"), "utf-8");
console.log(`Wrote ${outPath}`);
