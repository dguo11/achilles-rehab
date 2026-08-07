-- Supports the Profile page's "edit" and "clear & restart" actions.
-- Neither ever mutates or deletes a submitted intake_responses row —
-- editing inserts a new row and marks the old one superseded; restarting
-- marks the current row(s) superseded and discontinues the active
-- protocol selection so the user is routed back through onboarding.
-- "Latest intake" reads throughout the app filter on superseded_at is null.

alter table public.intake_responses
  add column superseded_at timestamptz;

comment on column public.intake_responses.superseded_at is
  'Set when a later intake_responses row (an edit) or a "clear & restart" replaces this one. Never deleted, kept for history/audit. Reads for "the user''s current intake" should filter superseded_at is null.';
