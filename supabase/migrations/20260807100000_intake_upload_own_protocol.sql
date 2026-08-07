-- Adds a third protocol-selection path to the intake questionnaire:
-- "upload your own protocol" (Section: protocol selection). Unlike 'mgb' /
-- 'willits' / 'not_sure', this path never resolves to a built-in protocol
-- id at intake time — the user is routed to /protocol/upload instead, and
-- a user_protocol_selections row is only created once they confirm a
-- reviewed/edited custom protocol there.

alter table public.intake_responses
  drop constraint intake_responses_protocol_preference_check,
  add constraint intake_responses_protocol_preference_check
    check (protocol_preference in ('mgb', 'willits', 'upload_own', 'not_sure'));
