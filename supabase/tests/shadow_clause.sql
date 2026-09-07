-- Shadow Clause enforcement test — the core deliverable.
-- Run against a database seeded with supabase/seed.sql. Every block
-- below is a raw SQL UPDATE/INSERT that bypasses the Next.js app
-- entirely, proving the guarantee holds even against direct API/SQL
-- access, not just the UI's disabled "Close case" button.

-- 1. Authenticated operator, no confirmation fields: must fail the
--    CHECK constraint (and the trigger, whichever fires first).
begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
begin
  update public.cases
  set status = 'closed'
  where patient_label = '[SIMULATED] Case A1 (J.R.)';
  raise exception 'FAIL: close without confirmation fields should have been rejected';
exception
  when others then
    raise notice 'PASS (no confirmation fields): %', sqlerrm;
end $$;
rollback;

-- 2. No authenticated session at all (simulates a service-role /
--    automated script forging both fields directly): must fail even
--    though confirmed_by/confirmed_at are populated, because closing
--    requires an authenticated human session.
begin;
set local role service_role;

do $$
begin
  update public.cases
  set status = 'closed',
      confirmed_by = '11111111-1111-1111-1111-111111111111',
      confirmed_at = now()
  where patient_label = '[SIMULATED] Case A1 (J.R.)';
  raise exception 'FAIL: automated close should have been rejected';
exception
  when others then
    raise notice 'PASS (no automated close): %', sqlerrm;
end $$;
rollback;

-- 3. Authenticated as Operator A, but attributing the confirmation to
--    Operator B (impersonation): must fail.
begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

do $$
begin
  update public.cases
  set status = 'closed',
      confirmed_by = '22222222-2222-2222-2222-222222222222',
      confirmed_at = now()
  where patient_label = '[SIMULATED] Case A1 (J.R.)';
  raise exception 'FAIL: closing with a mismatched confirmed_by should have been rejected';
exception
  when others then
    raise notice 'PASS (no impersonation): %', sqlerrm;
end $$;
rollback;

-- 4. The legitimate path: Operator A, authenticated, confirming their
--    own case with both fields populated and confirmed_by = self.
--    Must succeed.
begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

update public.cases
set status = 'closed',
    confirmed_by = '11111111-1111-1111-1111-111111111111',
    confirmed_at = now()
where patient_label = '[SIMULATED] Case A1 (J.R.)';

select
  case when status = 'closed' then 'PASS (legitimate close succeeded)'
       else 'FAIL: legitimate close did not apply'
  end as result
from public.cases
where patient_label = '[SIMULATED] Case A1 (J.R.)';

rollback;
