-- Manual RLS isolation test.
-- Run against a database that has supabase/seed.sql loaded (local
-- `supabase start`, or the Supabase Studio SQL editor against a project
-- seeded the same way). Each block impersonates one operator by setting
-- the JWT claims Postgres reads via auth.uid(), the same mechanism
-- PostgREST uses for real requests.
--
-- Expected result: Operator A's query never returns Operator B's
-- assigned cases, and vice versa. Both see the unassigned queue.

begin;

-- Impersonate Operator A.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- Expect: Case A1, Case A2 (assigned to A) + Case Q1, Case Q2 (unassigned).
-- Must NOT include Case B1.
select id, patient_label, assigned_operator, status
from public.cases
order by patient_label;

rollback;

begin;

-- Impersonate Operator B.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

-- Expect: Case B1 (assigned to B) + Case Q1, Case Q2 (unassigned).
-- Must NOT include Case A1 or Case A2.
select id, patient_label, assigned_operator, status
from public.cases
order by patient_label;

rollback;

begin;

-- Operator B must not be able to update Operator A's case directly,
-- even via a raw SQL UPDATE (RLS applies regardless of client).
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

update public.cases
set last_contacted_at = now()
where patient_label = '[SIMULATED] Case A1 (J.R.)';

-- Expect: 0 rows updated (RLS silently filters the row out of the
-- update's WHERE-visible set rather than raising an error).
select format('rows updated: %s', (select count(*) from public.cases
  where patient_label = '[SIMULATED] Case A1 (J.R.)' and last_contacted_at is not null)) as result;

rollback;
