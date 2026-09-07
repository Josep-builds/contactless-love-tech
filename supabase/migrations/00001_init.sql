-- Contactless Love — Technologist slice
-- Core schema: operators, cases, case_notes.
-- Enforces the Shadow Clause at the database level (see section 4 below):
-- no case can ever be marked 'closed' without a human-entered
-- confirmed_by + confirmed_at, and that human must be the authenticated
-- actor performing the update — not just any UUID value.

-- ---------------------------------------------------------------------
-- 1. operators
-- ---------------------------------------------------------------------

create table if not exists public.operators (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 255),
  created_at timestamptz not null default now()
);

alter table public.operators enable row level security;

-- An operator can see and manage only their own operator row.
create policy "operators_select_self"
  on public.operators for select
  to authenticated
  using (id = auth.uid());

create policy "operators_upsert_self_insert"
  on public.operators for insert
  to authenticated
  with check (id = auth.uid());

create policy "operators_upsert_self_update"
  on public.operators for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- 2. cases
-- ---------------------------------------------------------------------

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  patient_label text not null check (char_length(patient_label) between 1 and 60),
  severity int not null check (severity between 1 and 5),
  detected_at timestamptz not null,
  last_contacted_at timestamptz,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'escalated', 'closed')),
  assigned_operator uuid references public.operators (id),
  confirmed_by uuid references public.operators (id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),

  -- Shadow Clause, layer 1: a closed case must carry a human confirmation.
  -- This alone survives a raw SQL/API call that skips the app entirely.
  constraint shadow_clause_requires_confirmation check (
    status <> 'closed'
    or (confirmed_by is not null and confirmed_at is not null)
  )
);

create index if not exists cases_assigned_operator_idx on public.cases (assigned_operator);
create index if not exists cases_status_idx on public.cases (status);

alter table public.cases enable row level security;

-- Visible to an operator: cases assigned to them, plus the unassigned
-- queue they can claim from.
create policy "cases_select_assigned_or_unassigned"
  on public.cases for select
  to authenticated
  using (assigned_operator = auth.uid() or assigned_operator is null);

-- Simulated detection events create new, unassigned, open cases. Any
-- authenticated operator can submit one (it mimics an inbound webhook),
-- but the row must land in the shared queue, not pre-claimed or
-- pre-closed.
create policy "cases_insert_simulated_detection"
  on public.cases for insert
  to authenticated
  with check (
    assigned_operator is null
    and status = 'open'
    and confirmed_by is null
    and confirmed_at is null
  );

-- An operator can update a case that's already theirs, or claim an
-- unassigned case. After the update it must be assigned to them or
-- released back to unassigned — never handed to someone else.
create policy "cases_update_own_or_claim"
  on public.cases for update
  to authenticated
  using (assigned_operator = auth.uid() or assigned_operator is null)
  with check (assigned_operator = auth.uid() or assigned_operator is null);

-- ---------------------------------------------------------------------
-- 3. case_notes
-- ---------------------------------------------------------------------

create table if not exists public.case_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  operator_id uuid not null references public.operators (id),
  note text not null check (char_length(note) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists case_notes_case_id_idx on public.case_notes (case_id);

alter table public.case_notes enable row level security;

create policy "case_notes_select_for_own_case"
  on public.case_notes for select
  to authenticated
  using (
    exists (
      select 1 from public.cases c
      where c.id = case_notes.case_id
        and c.assigned_operator = auth.uid()
    )
  );

create policy "case_notes_insert_for_own_case"
  on public.case_notes for insert
  to authenticated
  with check (
    operator_id = auth.uid()
    and exists (
      select 1 from public.cases c
      where c.id = case_notes.case_id
        and c.assigned_operator = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- 4. Shadow Clause, layer 2 — identity-bound trigger
-- ---------------------------------------------------------------------
-- The CHECK constraint above only proves the columns are non-null; it
-- can't prove a *human* set them, because a service-role script could
-- forge confirmed_by/confirmed_at directly. This trigger closes that
-- gap: a case may only transition to 'closed' inside a request that
-- carries an authenticated user (auth.uid() is not null), and that
-- user must be the one named in confirmed_by. This runs for every
-- INSERT/UPDATE regardless of caller — including service-role calls
-- used by the escalation Edge Function — so no automated process can
-- ever close a case, only a signed-in operator acting on their own
-- session can.

create or replace function public.enforce_shadow_clause()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'closed' then
    if auth.uid() is null then
      raise exception 'Shadow Clause: closing a case requires an authenticated operator session, not an automated process';
    end if;
    if new.confirmed_by is null or new.confirmed_at is null then
      raise exception 'Shadow Clause: closing a case requires confirmed_by and confirmed_at';
    end if;
    if new.confirmed_by <> auth.uid() then
      raise exception 'Shadow Clause: confirmed_by must match the authenticated operator performing the close';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists shadow_clause_trigger on public.cases;

create trigger shadow_clause_trigger
  before insert or update on public.cases
  for each row
  execute function public.enforce_shadow_clause();
