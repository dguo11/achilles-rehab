-- Supports LLM-generated whole-body ("rest of body") workouts on /today,
-- distinct from the Achilles-specific exercises that always come straight
-- from the protocol. Adds:
--   1) region/source/workout_type on daily_plan_entries, so the same table
--      can hold both protocol-prescribed Achilles work and generated
--      strength/cardio work for the rest of the body.
--   2) liked/caused_pain on session_logs, per-exercise feedback used only
--      for the generated entries — never shown or collected for
--      protocol-prescribed Achilles exercises.
--   3) daily_workout_plans, caching the one-line "what your protocol
--      suggests" summary shown alongside the generated plan each day.

alter table public.daily_plan_entries
  add column region text check (region in ('achilles', 'rest_of_body')),
  add column source text not null default 'protocol' check (source in ('protocol', 'custom-generated')),
  add column workout_type text check (workout_type in ('strength', 'cardio'));

comment on column public.daily_plan_entries.region is
  'Which body-region bucket (from the plan snapshot''s achilles/rest_of_body split) this entry came from. Null for rows inserted before this column existed.';
comment on column public.daily_plan_entries.source is
  '''protocol'' = taken verbatim from the plan snapshot (always true for region = achilles). ''custom-generated'' = an LLM-generated whole-body workout item for the rest_of_body region, grounded in the protocol''s own rest_of_body_interventions for that phase but not copied verbatim from it.';
comment on column public.daily_plan_entries.workout_type is
  'strength | cardio split for custom-generated rest_of_body entries. Null for protocol entries (which keep their own exercise_category instead).';

alter table public.session_logs
  add column liked boolean,
  add column caused_pain boolean;

comment on column public.session_logs.liked is
  'Per-exercise like/dislike feedback, collected only for custom-generated rest_of_body entries. Feeds into the next day''s generation to favor liked exercises and drop disliked ones.';
comment on column public.session_logs.caused_pain is
  'Per-exercise pain/no-pain feedback, collected only for custom-generated rest_of_body entries. Feeds into the next day''s generation to avoid repeating exercises that caused pain — never used to silently alter the protocol''s own Achilles-side prescriptions or weight-bearing status.';

create table public.daily_workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_protocol_selection_id uuid not null references public.user_protocol_selections (id) on delete cascade,
  protocol_phase_id uuid not null references public.protocol_phases (id),
  plan_date date not null,
  protocol_suggestion_summary text not null,
  generated_at timestamptz not null default now(),
  unique (user_protocol_selection_id, plan_date)
);

comment on table public.daily_workout_plans is
  'One row per user per day: caches the brief, protocol-grounded summary shown above the LLM-generated rest-of-body workout ("I created a custom workout plan based on what the protocol suggested..."). The actual generated exercises live in daily_plan_entries (source = custom-generated); this table only holds the day-level summary text.';

alter table public.daily_workout_plans enable row level security;

create policy "daily_workout_plans_owner_access"
  on public.daily_workout_plans for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
