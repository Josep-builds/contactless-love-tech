-- Local development / RLS-testing seed data.
-- Intended for `supabase start` (local Docker stack), where inserting
-- directly into auth.users is a normal seeding pattern. Do NOT run this
-- against a hosted production project — auth.users there should only be
-- written by Supabase Auth itself (e.g. real Google sign-in).
--
-- All names, emails, and case labels below are fabricated for testing
-- and are clearly marked [SIMULATED] wherever the UI displays them.

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'operator-a@example.test', crypt('test-password-a', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"[SIMULATED] Operator A"}'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'operator-b@example.test', crypt('test-password-b', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"[SIMULATED] Operator B"}'
  )
on conflict (id) do nothing;

insert into public.operators (id, display_name, email) values
  ('11111111-1111-1111-1111-111111111111', '[SIMULATED] Operator A', 'operator-a@example.test'),
  ('22222222-2222-2222-2222-222222222222', '[SIMULATED] Operator B', 'operator-b@example.test')
on conflict (id) do nothing;

-- Cases assigned to Operator A only.
insert into public.cases (patient_label, severity, detected_at, last_contacted_at, status, assigned_operator)
values
  ('[SIMULATED] Case A1 (J.R.)', 4, now() - interval '2 hours', now() - interval '1 hour', 'in_progress', '11111111-1111-1111-1111-111111111111'),
  ('[SIMULATED] Case A2 (M.L.)', 2, now() - interval '6 days', now() - interval '6 days', 'open', '11111111-1111-1111-1111-111111111111');

-- Cases assigned to Operator B only.
insert into public.cases (patient_label, severity, detected_at, last_contacted_at, status, assigned_operator)
values
  ('[SIMULATED] Case B1 (T.O.)', 5, now() - interval '10 minutes', null, 'open', '22222222-2222-2222-2222-222222222222');

-- Unassigned queue — visible to both operators, claimable by either.
insert into public.cases (patient_label, severity, detected_at, status)
values
  ('[SIMULATED] Case Q1 (S.V.)', 3, now() - interval '30 hours', 'open'),
  ('[SIMULATED] Case Q2 (D.C.)', 1, now() - interval '5 days', 'open');
