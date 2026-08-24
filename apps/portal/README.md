# Buildhaus

End-to-end construction management for Buildhaus (Nellore, Andhra Pradesh) — CRM, estimation, projects, site execution, materials/procurement, finance and a premium client portal, with four roles in the MVP (Owner, Site Engineer, Architect, Client) and a data-driven permission system built to absorb ~10 more roles without a schema change.

Stack: Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres, Auth, RLS, Storage). Claude is called only from server routes (never the browser).

---

## What's in Phase 1

- Auth for all four roles at `/login`, each landing on its own home.
- Role-aware app shell with per-role navigation.
- **Row-Level Security** enforcing every access rule in the database itself: engineers/architects see only assigned projects, clients see only their own project and only the parts marked client-visible, finance/suppliers are Owner-only.
- Owner: Command Centre, Projects (list + create + detail), Users (create users, assign roles, assign engineers/architects to projects).
- Engineer / Architect / Client dashboards reading live, RLS-scoped data.
- Public marketing home reading the published portfolio.
- Full schema (11 migrations), seed data, and a script that creates demo logins and migrates the original "Sunil Reddy villa" demo into the real tables.
- Every navigation link resolves to a real page. Screens scheduled for later phases show an honest "coming in Phase N" placeholder rather than a dead link.

> Note on running: this project was assembled in an environment without network access, so `npm install` and a live Supabase connection couldn't be exercised here. The steps below are the standard, tested Next.js + Supabase flow. If anything in your environment differs, tell me the error and I'll fix it.

---

## Prerequisites

- Node.js 18.17+ (or 20+)
- A free Supabase project (https://supabase.com)
- The Supabase CLI (optional but recommended): https://supabase.com/docs/guides/cli

---

## 1. Install

```bash
npm install
```

## 2. Configure environment

Copy `.env.example` to `.env.local` and fill in values from your Supabase project (Project Settings → API):

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — service_role key (server-only; used by the seed script and Owner user-creation)
- `ANTHROPIC_API_KEY` — only needed once AI features land (Phase 8); kept server-side

## 3. Create the database

Using the Supabase SQL editor or CLI, run the migrations in order (`supabase/migrations/0001…0011`), then `supabase/seed.sql`.

With the CLI:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push          # applies migrations
# then run seed.sql via the SQL editor, or:
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

Or manually: open each file in the SQL editor and run them in filename order, then `seed.sql`.

## 4. Create demo logins + demo data

```bash
npm run seed:users
```

This creates four users and migrates the villa demo project (stages, tasks, materials, payment schedule):

| Role          | Email                        | Password             |
|---------------|------------------------------|----------------------|
| Owner         | owner@buildhaus.example      | Buildhaus#Owner1     |
| Site Engineer | engineer@buildhaus.example   | Buildhaus#Engineer1  |
| Architect     | architect@buildhaus.example  | Buildhaus#Architect1 |
| Client        | client@buildhaus.example     | Buildhaus#Client1    |

Change these after first sign-in.

## 5. Run

```bash
npm run dev
```

Open http://localhost:3000. Sign in at `/login` with any of the four accounts to see role-specific views.

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import into Vercel.
3. Add the same environment variables in the Vercel project settings.
4. Deploy. (Run migrations/seed against your production Supabase project first.)

---

## Project layout

```
supabase/migrations/   Schema, RBAC, RLS, functions, triggers, storage
supabase/seed.sql      Org, permissions, roles, estimator config, checklists, portfolio
scripts/seed-users.mjs Demo logins + villa demo-data migration
src/lib/               Supabase clients, session/RBAC, formatting
src/components/ui/      Reusable design-system components (brand palette)
src/app/               Routes: public site, /login, role areas (owner/engineer/architect/client)
docs/ARCHITECTURE.md   Full planning: access model, workflows, schema, screen list, phase plan
```

## Security notes

- The database is the source of truth: RLS is enabled and forced on every table.
- The service-role key is used only in server code, and only after confirming the caller is the Owner.
- Claude/Anthropic calls will run exclusively through server routes; the API key is never exposed to the browser.
- Project data files live in private Storage buckets; only the public portfolio bucket is world-readable.
