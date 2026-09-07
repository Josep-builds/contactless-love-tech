# Contactless Love — Operator Console

Case-management + priority-queue app connecting a simulated health-detection
event to a human follow-up operator. **Not** a patient-facing app and
**not** a diagnostic tool — it's the accountability layer between "a
detection source flagged something" and "a human confirmed the patient got
treated."

See `docs/PACKET.md` for the full design brief. The one rule everything else
is built around (the **Shadow Clause**): no case can ever be marked closed
by an automated process — see [Shadow Clause enforcement](#shadow-clause-enforcement)
below.

## Stack

- Next.js (App Router) + TypeScript, deployed on Vercel
- Supabase: Postgres + Auth (Google sign-in) + Row Level Security
- Vitest for unit tests

## Local development

```bash
npm install
cp .env.example .env.local   # fill in Supabase values, see below
npm run dev
```

Required env vars (`.env.local`, never committed):

| Var | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` key — server/CLI only, never exposed to the browser |
| `ESCALATION_WINDOW_HOURS` | Hours of inactivity before an open case auto-escalates (default 48) |

## Database setup

Schema, RLS policies, and the Shadow Clause enforcement all live in
`supabase/migrations/00001_init.sql`.

```bash
npx supabase login                 # or: supabase login --token <personal-access-token>
npx supabase link --project-ref <your-project-ref>
npx supabase db push               # applies the migration
```

For local RLS testing, `supabase/seed.sql` seeds two fabricated operator
accounts and a handful of `[SIMULATED]`-labeled cases — **local/`supabase
start` only**, since it inserts directly into `auth.users`, which is not
something to do against a hosted project.

Manual test scripts (run via `supabase db query --linked -f <file>` or the
Supabase SQL editor):

- `supabase/tests/rls_isolation.sql` — proves operator A never sees operator
  B's assigned cases.
- `supabase/tests/shadow_clause.sql` — proves closing a case without
  confirmation, or via an unauthenticated/service-role context, is rejected
  at the database layer even via raw SQL.
- `supabase/tests/escalation.sql` — backdate a case and re-check its status
  after invoking the escalation function.

## Google sign-in

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth
   client ID** (Web application). Authorized redirect URI:
   `https://<project-ref>.supabase.co/auth/v1/callback`.
2. Supabase Dashboard → Authentication → Providers → Google → paste the
   client ID/secret, enable.
3. Authentication → URL Configuration → set **Site URL** to your deployed
   app's URL, and add `<your-app-url>/**` to **Redirect URLs**.

## Auto-escalation (Supabase Edge Function)

```bash
npx supabase functions deploy escalate-cases --project-ref <your-project-ref>
npx supabase secrets set ESCALATION_WINDOW_HOURS=48 --project-ref <your-project-ref>
```

Schedule it from the Dashboard: **Edge Functions → escalate-cases → Cron**
(job type "Supabase Edge Function" — auth is handled internally, no key
ever needs to leave the dashboard). A 30-minute interval (`*/30 * * * *`)
is a reasonable default for a 48-hour window.

## Deploying to Vercel

```bash
npx vercel link
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --type config
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add ESCALATION_WINDOW_HOURS production
# repeat for the `preview` environment
npx vercel deploy --prod
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` needs `--type config` explicitly — Vercel
otherwise treats any `NEXT_PUBLIC_*`-prefixed value that looks like a
credential as a secret by default, but the anon key is meant to be public
(that's what RLS is for).

## Testing

```bash
npm run lint
npm test          # priority scoring unit tests (vitest)
npm run build
```

## Shadow Clause enforcement

A case cannot be marked `closed` without a human-entered `confirmed_by` +
`confirmed_at`. This is enforced twice at the database layer
(`supabase/migrations/00001_init.sql`), independent of the UI:

1. A `CHECK` constraint blocks any `status = 'closed'` row that doesn't
   have both fields populated.
2. A `BEFORE INSERT OR UPDATE` trigger additionally requires an
   authenticated session (`auth.uid()` not null) whose id matches
   `confirmed_by` — so a service-role script (like the escalation
   function) can never close a case, and one operator can't attribute a
   close to another.

Both survive a direct API or raw SQL call that skips the Next.js app
entirely — see `supabase/tests/shadow_clause.sql`.

## Security floor

- No secrets committed — Supabase keys live in `.env.local` (gitignored)
  and Vercel/Supabase project env vars only.
- Every route under `/dashboard` requires an authenticated session
  (`src/middleware.ts`); `/sign-in` and `/auth/callback` are the only
  public paths.
- RLS scopes each operator to cases assigned to them plus the shared
  unassigned queue (`supabase/migrations/00001_init.sql`).
- All form/API inputs are validated with zod before touching the database
  (`src/lib/validation/`).
- All seed/demo data is fabricated and labeled `[SIMULATED]` in the UI
  wherever detection events are shown.
