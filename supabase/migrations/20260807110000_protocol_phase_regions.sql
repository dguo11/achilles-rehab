-- Splits each phase's exercise list into the two body-region buckets used
-- throughout the app's phase summary UI, plus a dedicated gait-training
-- field for the weight-bearing/gait section. Replaces the single flat
-- `interventions` column as the source of truth for exercise display and
-- dosage suggestion — kept alongside it only as a legacy/raw record.

alter table public.protocol_phases
  add column achilles_interventions jsonb not null default '{}'::jsonb,
  add column rest_of_body_interventions jsonb not null default '{}'::jsonb,
  add column gait_training jsonb;

comment on column public.protocol_phases.achilles_interventions is
  'jsonb: Record<category, string[]>, same shape as the legacy interventions column, restricted to exercises/mobility work targeting the ankle/Achilles/calf-complex directly (e.g. ROM, ankle strengthening, tendon loading progressions).';
comment on column public.protocol_phases.rest_of_body_interventions is
  'jsonb: Record<category, string[]>, restricted to exercises targeting the rest of the body (hip/knee/core/upper body, general cardio, whole-body proprioception/balance work not specific to the ankle).';
comment on column public.protocol_phases.gait_training is
  'jsonb string[] | null. Gait-specific guidance (e.g. "normalize gait in boot with shoe leveler") pulled out for display alongside weight_bearing, distinct from the exercise buckets above.';

comment on column public.protocol_phases.interventions is
  'Legacy flat Record<category, string[]> — superseded by achilles_interventions / rest_of_body_interventions for display and dosage suggestion. Kept only as a raw record of the original (pre-region-split) transcription/extraction.';
