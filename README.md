# Buildhaus

End-to-end construction platform for Buildhaus (Nellore, Andhra Pradesh) — two independent Next.js applications in one npm-workspaces monorepo:

| App | Port (dev) | Production domain | What it is |
|---|---|---|---|
| `apps/website` | 3000 | buildhaus.in | Public marketing site: services, packages, projects portfolio, cost estimator, instant quotation (real PDF, secure token links), enquiry/site-visit/callback forms — **no login required** |
| `apps/portal` | 3001 | app.buildhaus.in | Private CRM + construction ERP: Owner / Site Engineer / Architect / Client role portals — login required, noindex |

Shared packages: `@buildhaus/brand` (palette + Tailwind preset), `@buildhaus/ui` (components), `@buildhaus/database` (data access + Demo Mode + file storage), `@buildhaus/utils` (formatters, delay engine, estimator calc, PDF document), `@buildhaus/types`, `@buildhaus/validation` (Zod).

Stack: Next.js 14 App Router · TypeScript strict · Tailwind · Supabase (Postgres/Auth/Storage/RLS) · Zod · @react-pdf/renderer · Vitest + Playwright.

## Quick start (Demo Mode — zero config)

```bash
npm install
npm run dev          # website on :3000, portal on :3001
```

With no Supabase environment configured, both apps run in a clearly-labelled **Demo Mode**: a file-backed sample dataset shared between the two apps (`.demo-data/store.json`). Everything is clickable and mutations persist — submit an enquiry on the website and it appears in the portal CRM. `npm run demo:reset` restores the original sample data.

**Demo logins** (portal, `http://localhost:3001/login`):

| Role | Email | Password |
|---|---|---|
| Owner | owner@buildhaus.example | Buildhaus#Owner1 |
| Site Engineer | engineer@buildhaus.example | Buildhaus#Engineer1 |
| Architect | architect@buildhaus.example | Buildhaus#Architect1 |
| Client | client@buildhaus.example | Buildhaus#Client1 |

> Demo Mode is for local/internal review only — its session cookie is not cryptographically signed. Never deploy Demo Mode publicly. See `docs/SECURITY-CHECKLIST.md`.

## Real backend (Supabase)

1. Create a Supabase project; run `supabase/migrations/0001…0014` in order, then `supabase/seed.sql`.
2. Copy `apps/website/.env.example` → `apps/website/.env.local` and `apps/portal/.env.example` → `apps/portal/.env.local`; fill in the Supabase URL/keys.
3. `node scripts/seed-users.mjs` to create the demo logins + sample project in the real database.

Once `NEXT_PUBLIC_SUPABASE_URL` is set, every `createClient()` call automatically switches from Demo Mode to the real client — no code changes. (Note: the public estimator's anonymous-write flow needs the scoped anon RLS policies described in `docs/SECURITY-CHECKLIST.md` before going live.)

## Commands

```bash
npm run dev               # both apps           npm run dev:website / dev:portal
npm run build             # both apps           npm run build:website / build:portal
npm run typecheck         # both apps (strict)
npm run lint              # both apps
npm run test              # Vitest: 93 unit/integration/security tests
npm run test:e2e          # Playwright: 10 e2e tests (dev servers must be running)
npm run demo:reset        # reset Demo Mode data to the seed
npm run seed              # seed demo users into a REAL Supabase project
```

## Documentation

- `docs/DELIVERY-REPORT.md` — full route lists, workflows, test/build results, honest limitations
- `docs/ARCHITECTURE.md` — access model, workflows, schema design
- `docs/DEPLOYMENT.md` — Vercel two-project setup, DNS, env vars
- `docs/SECURITY-CHECKLIST.md` — enforcement layers, threat table, known gaps

## Historical note

`index.html` / `original-artifact.html` at the repo root are the original single-file prototype this platform grew out of — kept for reference only; nothing imports them.
