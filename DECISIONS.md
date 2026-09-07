# Decisions

## What was built (2026-09-07)

All 8 build steps from `docs/implementation-prompt.md` (as pasted into the
session) are complete and committed:

1. Next.js + Supabase auth scaffold, Google sign-in, protected routes.
2. `operators` / `cases` / `case_notes` schema with RLS.
3. Simulated detection event → case creation (`/dashboard/simulate`, `POST
   /api/detections`).
4. Priority scoring (`severity_weight * severity + time_weight * hours`)
   and a ranked queue view, unit tested.
5. Case detail view: timeline, claim, follow-up notes.
6. Shadow Clause enforcement — DB constraint + trigger, disabled "Close
   case" UI control, `supabase/tests/shadow_clause.sql`.
7. Auto-escalation Edge Function (`supabase/functions/escalate-cases`).
8. Deployed live: Supabase project `olgtvkzmtkwxamwhdpjl`
   (contactless-love-tech, us-east-1), Vercel project
   `josepbuilds/contactless-love-tech` →
   https://contactless-love-tech.vercel.app.

## Verified live (2026-09-07)

Ran `supabase/tests/shadow_clause.sql`'s four scenarios against the actual
hosted database (`olgtvkzmtkwxamwhdpjl`), not just reasoned through them —
via `supabase db query --linked`, using a throwaway operator pair + case
created for the run and deleted immediately after (verified zero rows left
behind). All 4 passed:

1. Authenticated operator, no `confirmed_by`/`confirmed_at` → rejected.
2. `service_role` (no auth session), both fields forged → rejected —
   confirms no automated process can close a case, period.
3. Authenticated operator, `confirmed_by` set to a *different* operator
   (impersonation) → rejected.
4. Authenticated operator, `confirmed_by = self` → succeeded, row shows
   `status = closed` with both fields correctly populated.

The RLS isolation test (`supabase/tests/rls_isolation.sql`) is still only
reasoned through, not executed live — see Known gaps below.

## Decisions and why

- **CHECK constraint + trigger, not just a trigger, for the Shadow
  Clause.** The constraint alone proves the columns are non-null; it
  can't prove a *human* set them, since a service-role script could forge
  `confirmed_by`/`confirmed_at` directly. The trigger additionally
  requires `auth.uid()` to be non-null and equal to `confirmed_by`, which
  is what actually makes "no automated process can ever close a case" a
  guarantee rather than a convention. Belt and suspenders, deliberately.

- **Escalation unassigns rather than reassigns to a specific operator.**
  Simpler, and matches the acceptance criteria's own wording ("reappears
  at the top of the unassigned queue") — the priority score already
  handles making a stale, now-escalated case surface first, no
  round-robin logic needed.

- **`supabase/functions` excluded from the Next.js `tsconfig`/`eslint`
  project.** It's Deno runtime code (uses `Deno.serve`, `jsr:` imports);
  including it broke `tsc --noEmit` on the main app.

- **Anon key needs `--type config` on Vercel, not `--type secret`.**
  Vercel's CLI treats any `NEXT_PUBLIC_*` value that looks like a
  credential as secret-by-default and refuses to add it without an
  explicit type. The anon key is *meant* to be public — RLS is what
  actually protects the data — so `config` (not `secret`) is correct
  here.

- **Cron scheduling done via the Supabase Dashboard, not `pg_cron` +
  `vault` in a migration.** Started down the `pg_cron`/`pg_net`/Vault path
  (extensions are enabled on the project), but storing the service-role
  key required piping it through a shell command, which the session's
  safety classifier correctly blocked. The Dashboard's native "Edge
  Function" cron job type handles the auth header internally with no key
  ever touching a shell, so that's what's actually in place: a 30-minute
  schedule (`*/30 * * * *`) against a 48-hour escalation window.

- **`supabase config push` was deliberately never run.** The generated
  `config.toml` is full of local-dev defaults (e.g. `site_url =
  http://127.0.0.1:3000`) that would have clobbered the hosted project's
  real settings. Google OAuth and the auth URL allow-list were configured
  by hand in the Dashboard instead.

## Known gaps / fast-follows

- `supabase/seed.sql` only works against a local `supabase start` stack
  (it inserts directly into `auth.users`, which you shouldn't do on a
  hosted project). The two-operator RLS isolation test in
  `supabase/tests/rls_isolation.sql` has been reasoned through carefully
  but not executed against a live database (unlike the Shadow Clause
  tests above); run it locally or adapt it with real signed-in operators'
  UUIDs to actually exercise it.
- `src/middleware.ts` uses Next.js's deprecated middleware convention
  (`next build` warns and suggests migrating to `proxy.ts`). Left as-is
  since the codemod requires a clean git tree mid-build-out and the
  rename isn't functionally necessary yet.
- No automated test exercises the Shadow Clause trigger or RLS policies
  in CI — they're SQL scripts meant to be run manually or via `supabase
  db query --linked -f <file>`. A fast-follow would wire these into a
  GitHub Action against a preview Supabase branch.
- The personal access tokens used to set this up (Supabase, Vercel) were
  pasted into the chat session to authenticate the CLIs non-interactively.
  Recommend revoking and regenerating both once you've confirmed the
  deploy is stable.

## Next steps

- Sign in as yourself via Google on the live app, submit a simulated
  detection event, and walk the full flow: queue → claim → note → close
  (confirm it's blocked until the checkbox is ticked, then confirm it
  succeeds).
- Decide on a real escalation window for production use (currently 48h
  default) and whether 30-minute cron granularity is right for it.
- Persona pass from the packet (Layer 1, the promotora walkthrough) is
  still open — do this once the live flow above is verified.
