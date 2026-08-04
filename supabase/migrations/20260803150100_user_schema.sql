-- User-owned data. Every table here carries a user_id and an
-- owner-only RLS policy: `auth.uid() = user_id`, no exceptions.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_owner_access"
  on public.profiles for all
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row on signup so the app never has to special-case
-- "no profile yet" for a freshly-registered user.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.intake_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  injury_type text not null check (injury_type in ('surgical', 'non_surgical')),
  injury_date date not null,
  surgery_date date,
  side text not null check (side in ('left', 'right')),
  severity text,
  protocol_preference text not null check (protocol_preference in ('mgb', 'willits', 'not_sure')),
  fitness_level text,
  prior_sports jsonb not null default '[]'::jsonb,
  lifestyle_notes text,
  submitted_at timestamptz not null default now(),
  constraint surgery_date_required_if_surgical
    check (injury_type <> 'surgical' or surgery_date is not null)
);

alter table public.intake_responses enable row level security;

create policy "intake_responses_owner_access"
  on public.intake_responses for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.user_protocol_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  protocol_id text not null references public.protocols (id),
  anchor_date date not null,
  current_phase_order_index int not null default 0,
  status text not null default 'draft_pending_review'
    check (status in ('draft_pending_review', 'active', 'completed', 'discontinued')),
  created_at timestamptz not null default now()
);

alter table public.user_protocol_selections enable row level security;

create policy "user_protocol_selections_owner_access"
  on public.user_protocol_selections for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The PT-review gate. Deliberately has NO update policy for the
-- `authenticated` role: once a review row is inserted, nothing a client can
-- do through the normal Supabase client can ever flip `acknowledged` to
-- true or edit `acknowledged_at`. The only writer is a server route
-- (using the service-role key, after re-checking the caller's session)
-- that sets both fields together with a server-generated timestamp. This is
-- what makes the "reviewed with my PT" gate impossible to bypass or
-- auto-check from the client.
create table public.plan_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_protocol_selection_id uuid not null references public.user_protocol_selections (id) on delete cascade,
  generated_plan_snapshot jsonb not null,
  acknowledged boolean not null default false,
  acknowledged_at timestamptz,
  reviewer_note text,
  created_at timestamptz not null default now(),
  constraint acknowledged_at_set_iff_acknowledged
    check ((acknowledged and acknowledged_at is not null) or (not acknowledged and acknowledged_at is null))
);

alter table public.plan_reviews enable row level security;

create policy "plan_reviews_select_own"
  on public.plan_reviews for select
  to authenticated
  using (auth.uid() = user_id);

create policy "plan_reviews_insert_own_unacknowledged"
  on public.plan_reviews for insert
  to authenticated
  with check (auth.uid() = user_id and acknowledged = false and acknowledged_at is null);

-- No update/delete policy for `authenticated` on purpose (see comment above).

create table public.daily_plan_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_protocol_selection_id uuid not null references public.user_protocol_selections (id) on delete cascade,
  protocol_phase_id uuid not null references public.protocol_phases (id),
  plan_date date not null,
  exercise_name text not null,
  exercise_category text,
  suggested_sets int,
  suggested_reps int,
  suggested_frequency text,
  dosage_source text not null check (dosage_source in ('llm-suggested', 'user-set', 'pt-provided')),
  notes text,
  sort_order int not null default 0,
  unique (user_protocol_selection_id, plan_date, exercise_name)
);

alter table public.daily_plan_entries enable row level security;

create policy "daily_plan_entries_owner_access"
  on public.daily_plan_entries for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.session_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  daily_plan_entry_id uuid references public.daily_plan_entries (id) on delete set null,
  plan_date date not null,
  completed boolean not null default false,
  actual_sets int,
  actual_reps int,
  pain_level int check (pain_level between 0 and 10),
  effort_level int check (effort_level between 0 and 10),
  duration_minutes int,
  notes text,
  logged_at timestamptz not null default now()
);

alter table public.session_logs enable row level security;

create policy "session_logs_owner_access"
  on public.session_logs for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.daily_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  note_date date not null,
  pain_level int check (pain_level between 0 and 10),
  swelling_level text check (swelling_level in ('none', 'mild', 'moderate', 'severe')),
  rom_notes text,
  mood_level int check (mood_level between 1 and 5),
  motivation_level int check (motivation_level between 1 and 5),
  physical_health_text text,
  mental_health_text text,
  flagged_red_flag boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, note_date)
);

comment on column public.daily_notes.flagged_red_flag is
  'Set by app logic when a red-flag sign or significant-distress signal is detected in this note. Surfaces an in-app supportive/contact-care-team prompt only — nothing is automatically sent to a clinician or crisis service.';

alter table public.daily_notes enable row level security;

create policy "daily_notes_owner_access"
  on public.daily_notes for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.fit_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_log_ids uuid[] not null,
  export_type text not null check (export_type in ('running', 'generic_workout')),
  file_path text not null,
  created_at timestamptz not null default now()
);

alter table public.fit_exports enable row level security;

create policy "fit_exports_owner_access"
  on public.fit_exports for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.custom_protocol_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  original_file_path text not null,
  parsed_status text not null default 'pending'
    check (parsed_status in ('pending', 'parsed', 'needs_review', 'confirmed', 'rejected')),
  parsed_json jsonb,
  reviewed_and_edited_json jsonb,
  resulting_protocol_id text references public.protocols (id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.custom_protocol_uploads enable row level security;

create policy "custom_protocol_uploads_owner_access"
  on public.custom_protocol_uploads for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
