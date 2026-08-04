-- Expands intake_responses to match the full intake questionnaire design:
-- conservative-pacing flags (Section 1B/3B), current-status self-report
-- (Section 2, cross-checked against the anchor-implied phase at plan
-- generation time in Phase 3), the required red-flag safety screen
-- (Section 3A), baseline activity/goals (Sections 4-5), and a light
-- mental-health baseline (Section 6).

alter table public.intake_responses
  drop constraint intake_responses_injury_type_check,
  add constraint intake_responses_injury_type_check
    check (injury_type in ('surgical', 'non_surgical', 'not_sure'));

alter table public.intake_responses
  add column rupture_type text check (rupture_type in ('first_time', 're_rupture', 'revision')),
  add column tendon_augmentation text check (tendon_augmentation in ('yes', 'no', 'not_sure')),
  add column pre_existing_tendinosis text check (pre_existing_tendinosis in ('yes', 'no', 'not_sure')),
  add column current_mobility_aids jsonb not null default '[]'::jsonb,
  add column current_boot_wedge_count int check (current_boot_wedge_count between 0 and 3),
  add column current_weight_bearing_status text
    check (current_weight_bearing_status in ('non_weight_bearing', 'partial_weight_bearing', 'weight_bearing_as_tolerated', 'full_weight_bearing')),
  add column care_team_status text check (care_team_status in ('pt', 'surgeon', 'both', 'neither')),
  add column red_flag_signs jsonb not null default '[]'::jsonb,
  add column red_flag_acknowledged_at timestamptz,
  add column age_range text check (age_range in ('under_40', '40_59', '60_plus')),
  add column conservative_factors jsonb not null default '[]'::jsonb,
  add column exercise_frequency text check (exercise_frequency in ('lt_1x', '1_2x', '3_4x', '5plus_x')),
  add column recovery_goal text check (recovery_goal in ('daily_activities', 'recreational', 'competitive')),
  add column daily_demand text check (daily_demand in ('seated', 'on_feet', 'manual_labor')),
  add column has_stairs_at_home boolean,
  add column home_notes text,
  add column available_equipment jsonb not null default '[]'::jsonb,
  add column fitness_tracker text check (fitness_tracker in ('garmin', 'strava', 'other', 'no')),
  add column confidence_baseline int check (confidence_baseline between 1 and 5),
  add column motivation_baseline int check (motivation_baseline between 1 and 5),
  add column mental_health_baseline_note text,
  add column mental_health_flagged boolean not null default false;

comment on column public.intake_responses.red_flag_signs is
  'Self-reported at intake (Section 3A). Any non-empty array means the wizard showed the safety interrupt and the user acknowledged it before continuing — see red_flag_acknowledged_at.';
comment on column public.intake_responses.current_mobility_aids is
  'Self-reported current status (Section 2), cross-checked against the anchor-date-implied phase during plan generation (Phase 3) — mismatches are surfaced as a "confirm with your PT" flag, never used to silently override the protocol''s own phase timing.';
comment on column public.intake_responses.mental_health_flagged is
  'Set by a lightweight keyword check on the Section 6.3 free-text note. Surfaces a supportive in-app prompt only, same as daily_notes.flagged_red_flag — never sent anywhere automatically.';

-- injury_type gained a third value ('not_sure'); user_protocol_selections
-- still requires a concrete protocol, so a 'not_sure' intake is saved
-- without a matching selection row until the user confirms a treatment
-- track and completes protocol selection.
