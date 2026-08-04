-- Global protocol reference data: readable by any authenticated user, but
-- writable only by the service role (seed script) or, for user-uploaded
-- protocols, by the uploading user and only while is_verified = false.

create extension if not exists "pgcrypto";

create table public.protocols (
  id text primary key,
  name text not null,
  source text not null,
  applies_to text[] not null,
  gating text not null check (gating in ('time', 'time_and_criterion')),
  global_notes jsonb not null default '[]'::jsonb,
  red_flags jsonb,
  supporting_programs jsonb,
  raw_json jsonb not null,
  is_verified boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.protocols is
  'Clinical rehab protocols. The two seeded protocols (is_verified = true) are transcribed from source PDFs and are read-only at runtime. Rows with is_verified = false are user-uploaded and owned by created_by.';
comment on column public.protocols.red_flags is
  'jsonb: { action: string, signs: string[], source: "protocol" | "achilla-baseline" }. "protocol" means the signs are stated in the source document; "achilla-baseline" means Achilla supplied a general post-op safety list because the source document did not include one (e.g. Willits, a research-paper timeline table).';

alter table public.protocols enable row level security;

create policy "protocols_select_visible"
  on public.protocols for select
  to authenticated
  using (is_verified = true or created_by = auth.uid());

create policy "protocols_insert_own_unverified"
  on public.protocols for insert
  to authenticated
  with check (created_by = auth.uid() and is_verified = false);

create policy "protocols_update_own_unverified"
  on public.protocols for update
  to authenticated
  using (created_by = auth.uid() and is_verified = false)
  with check (created_by = auth.uid() and is_verified = false);

create policy "protocols_delete_own_unverified"
  on public.protocols for delete
  to authenticated
  using (created_by = auth.uid() and is_verified = false);

create table public.protocol_phases (
  id uuid primary key default gen_random_uuid(),
  protocol_id text not null references public.protocols (id) on delete cascade,
  order_index int not null,
  number int,
  name text,
  timeframe_label text not null,
  timeframe_start_days int,
  timeframe_end_days int,
  goals jsonb not null default '[]'::jsonb,
  weight_bearing jsonb,
  interventions jsonb not null default '{}'::jsonb,
  criteria_to_progress jsonb,
  criteria_to_discharge jsonb,
  continues_from_order_indexes int[],
  assistive_devices jsonb,
  unique (protocol_id, order_index)
);

comment on column public.protocol_phases.timeframe_start_days is
  'Approximate day offset from the user''s anchor date (surgery or injury date), used only to suggest the current phase. Never used to silently auto-advance a time_and_criterion-gated protocol past criteria_to_progress.';
comment on column public.protocol_phases.weight_bearing is
  'jsonb: string | string[] | { label: string, inferred?: boolean, note?: string }. Kept verbatim per phase — "protected weight-bearing" (partial load, crutches required), "weight-bearing as tolerated" (progressing load, may still involve crutches/cane per tolerance), and "full weight-bearing" (no assistive device needed) are distinct and must never be treated as equivalent.';
comment on column public.protocol_phases.assistive_devices is
  'jsonb string[], derived by tagging device mentions (crutches, boot, wedge, shoe leveler, heel lift, cane, sneaker) already present in this phase''s own weight_bearing/goals text — never invented independently of that text.';

alter table public.protocol_phases enable row level security;

create policy "protocol_phases_select_visible"
  on public.protocol_phases for select
  to authenticated
  using (
    exists (
      select 1 from public.protocols p
      where p.id = protocol_phases.protocol_id
        and (p.is_verified = true or p.created_by = auth.uid())
    )
  );

create policy "protocol_phases_insert_own_unverified"
  on public.protocol_phases for insert
  to authenticated
  with check (
    exists (
      select 1 from public.protocols p
      where p.id = protocol_phases.protocol_id
        and p.created_by = auth.uid() and p.is_verified = false
    )
  );

create policy "protocol_phases_update_own_unverified"
  on public.protocol_phases for update
  to authenticated
  using (
    exists (
      select 1 from public.protocols p
      where p.id = protocol_phases.protocol_id
        and p.created_by = auth.uid() and p.is_verified = false
    )
  )
  with check (
    exists (
      select 1 from public.protocols p
      where p.id = protocol_phases.protocol_id
        and p.created_by = auth.uid() and p.is_verified = false
    )
  );

create policy "protocol_phases_delete_own_unverified"
  on public.protocol_phases for delete
  to authenticated
  using (
    exists (
      select 1 from public.protocols p
      where p.id = protocol_phases.protocol_id
        and p.created_by = auth.uid() and p.is_verified = false
    )
  );
