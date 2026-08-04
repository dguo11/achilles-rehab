-- daily_notes had a flagged_red_flag boolean but no record of which signs
-- were actually checked, unlike intake_responses. Matching that pattern so
-- the flag is auditable, not just a bit.
alter table public.daily_notes
  add column red_flag_signs jsonb not null default '[]'::jsonb;

comment on column public.daily_notes.red_flag_signs is
  'Signs the user selected from the active protocol''s red-flag list on this day''s note. Non-empty array is what sets flagged_red_flag.';
