-- Manual test for the escalate-cases Edge Function.
--
-- 1. Run this block to backdate a seeded case's last_contacted_at past
--    the escalation window (default 48h), simulating a case that's
--    gone stale.
-- 2. Invoke the function (locally: `supabase functions serve
--    escalate-cases`, then in another shell:
--      curl -i --request POST 'http://localhost:54321/functions/v1/escalate-cases' \
--        --header "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
--    ).
-- 3. Re-run the SELECT at the bottom: the case should now show
--    status = 'escalated' and assigned_operator = null, which puts it
--    back in everyone's unassigned queue.

update public.cases
set last_contacted_at = now() - interval '72 hours',
    status = 'in_progress'
where patient_label = '[SIMULATED] Case A1 (J.R.)';

-- Before: status should be 'in_progress', still assigned to Operator A.
select id, patient_label, status, assigned_operator, last_contacted_at
from public.cases
where patient_label = '[SIMULATED] Case A1 (J.R.)';

-- ... invoke the function here ...

-- After: status should be 'escalated', assigned_operator should be null.
select id, patient_label, status, assigned_operator, last_contacted_at
from public.cases
where patient_label = '[SIMULATED] Case A1 (J.R.)';
