# Buildhaus — Delivery Report (Monorepo Restructure)

Date: 15 July 2026. This report reflects the actual verified state of the repository — every "passes"/"works" claim below was executed and observed, not assumed. Known gaps are listed honestly at the end.

---

## 1. Final monorepo structure

```
buildhaus/
├── apps/
│   ├── website/        Public marketing site (Next.js 14, port 3000)
│   └── portal/         Private CRM/ERP portal (Next.js 14, port 3001)
├── packages/
│   ├── brand/          Palette (single source of truth) + shared Tailwind preset + globals.css
│   ├── ui/             Shared components (Button, Card, Badge, Input, FileUpload, …)
│   ├── database/       createClient/createAdminClient/updateSession + Demo Mode store + uploadFile storage abstraction
│   ├── utils/          inr/dateLabel formatters, delay-risk engine, estimator calc, STANDARD_STAGES, PDF document (./pdf subpath), upload validation
│   ├── types/          Shared row interfaces mirroring the SQL schema
│   └── validation/     Zod schemas + ActionResult convention
├── supabase/
│   ├── migrations/     0001–0014 (see §6)
│   └── seed.sql
├── scripts/            seed-users.mjs (real Supabase), reset-demo-data.mjs
├── e2e/                Playwright specs (website + portal)
├── docs/               ARCHITECTURE, DEPLOYMENT, SECURITY-CHECKLIST, this report
├── package.json        npm workspaces root (dev/build/typecheck/lint/test/test:e2e scripts)
└── tsconfig.base.json
```

Workspace tooling: **npm workspaces** (no Turborepo — plain npm scripts orchestrate both apps; Turborepo can be added later without restructuring).

## 2. Files moved (summary)

- All public routes (`/`, about, services, packages, cost-estimator, projects, process, materials, contact, enquiry, request-site-visit) → `apps/website/src/app/`
- All private routes (login, owner/*, engineer/*, architect/*, client/*, auth/signout) → `apps/portal/src/app/`
- `src/components/ui/*` → `packages/ui/src/` (nav.tsx stayed in portal — it's role-specific)
- `src/lib/{format,delay,estimator-calc}.ts` → `packages/utils/src/`
- `src/lib/demo/*` + `src/lib/supabase/*` → `packages/database/src/`
- Tailwind palette → `packages/brand/` (both apps consume the same preset)
- `supabase/`, `scripts/`, `docs/` → repo root

## 3. Files created (highlights)

- `packages/database/src/demo/db.ts` — rewritten as a **file-backed shared store** (`.demo-data/store.json`, atomic write-then-rename) so both apps' separate processes see the same data. Verified live: an enquiry submitted on :3000 appears in the portal CRM on :3001.
- `packages/database/src/storage.ts` — `uploadFile()` storage abstraction (Demo Mode: disk under `.demo-data/uploads/`, UUID filenames, path-traversal-safe; real-Supabase branch deliberately throws "not implemented" rather than faking success).
- `packages/utils/src/pdf/quotation-document.tsx` — shared `@react-pdf/renderer` quotation document (dedicated `./pdf` subpath so client bundles never pull it in).
- `packages/ui/src/file-upload.tsx` — real file picker with client+server validation via shared `@buildhaus/utils` rules.
- `apps/website/src/app/quotation/[token]/` — secure public quotation (page + real PDF route).
- `apps/portal/src/app/(app)/owner/website/` — Owner CMS for public site content.
- `apps/portal/src/app/uploads/[...path]/route.ts` — serves uploaded files with correct Content-Type.
- `vitest.config.ts`, `playwright.config.ts`, 8 unit/integration/security test files, 5 e2e spec files.
- `apps/*/vercel.json`, `docs/DEPLOYMENT.md`, `docs/SECURITY-CHECKLIST.md`.

## 4. Public website routes (apps/website, :3000 — all verified 200)

`/` · `/about` · `/services` · `/services/[slug]` (10 services) · `/packages` · `/packages/[slug]` (essential/premium/luxury) · `/cost-estimator` · `/quotation/[token]` · `/quotation/[token]/pdf` · `/projects` · `/projects/[slug]` · `/process` · `/materials` · `/faq` · `/contact` · `/enquiry` · `/request-site-visit` · `/request-callback` · `/sitemap.xml` · `/robots.txt`

The Login button links to `NEXT_PUBLIC_PORTAL_URL/login` (cross-app). No portal navigation, no auth, no private data anywhere in this app. SEO: per-page metadata, dynamic OG via `generateMetadata()`, LocalBusiness/Service/Product/House/FAQPage/BreadcrumbList JSON-LD, sitemap includes dynamic slugs.

## 5. Private portal routes (apps/portal, :3001 — all verified 200 with the right role)

- `/login` (+ auto role-redirect; `/` redirects to `/owner` or `/login`)
- **Owner (21)**: `/owner` (Command Centre), crm, crm/[id], quotations, quotations/[id]/download (real PDF, owner-gated), projects, projects/[id], site-operations, drawings, quality, materials, labour, finance, clients, reports, notifications, ai, settings, estimator, suppliers, users, website, website/pages/[slug]
- **Engineer (13)**: today, projects, projects/[id], tasks, tasks/[id], report, materials, drawings, attendance, issues, notifications, profile, more (+ mobile bottom nav)
- **Architect (6)**: dashboard, projects, drawings, drawings/[id], drawings/new, reviews
- **Client (9)**: overview, progress, photos, approvals, payments, payments/receipts/[id], documents, change-requests, messages
- `/uploads/[...path]` (uploaded-file serving), `/auth/signout`
- Portal is `noindex, nofollow` (metadata + robots.ts).

## 6. Database migrations

0001 extensions/helpers · 0002 RBAC · 0003 CRM/clients · 0004 projects/execution · 0005 drawings/documents · 0006 procurement/suppliers · 0007 labour/finance/quality · 0008 estimator/public · 0009 notifications/AI/audit · 0010 RLS policies (full original set) · 0011 triggers/functions · **0012 website content tables (new)** · **0013 website content RLS (new)** · **0014 quotation_public_tokens + RLS (new)**

## 7. RLS policy summary

- Owner: full access (all tables).
- Site Engineer / Architect: assigned projects only (`project_members` spine); no finance, suppliers, or profit.
- Client: own project only (`clients.profile_id`); client-visible rows only.
- Anonymous: published public content only (`public_projects`, published `testimonials`/`faqs`/`website_pages`/`website_sections`); `quotation_public_tokens` readable only for non-revoked/unexpired rows, no anon INSERT.
- Approval separation: engineers can't approve own reports; architects can't approve own drawings (approval columns owner-writable only).
- Demo Mode has **no real RLS** — every portal page instead filters explicitly by the signed-in user (spot-audited across 15+ pages; one bug found and fixed: the owner quotation-download route handler lacked a role check).

## 8. Implemented end-to-end workflows (all exercised)

1. **Visitor → CRM lead**: estimator → quotation with secure token → PDF download → lead + notification in Owner CRM. ✔ (email/WhatsApp send deliberately not wired — see limitations)
2. **Lead → project**: CRM notes/site-visit → convert (atomic RPC) → client + project + 25 stages + payment schedule → assign engineer/architect. ✔
3. **Daily report**: draft → submit → owner approve/return (with reason) → client-visible content appears in Client portal. ✔
4. **Drawing revision**: upload (real file) → owner review → client review → approved-for-construction → older revisions auto-superseded ("Superseded — Do Not Use"), engineer sees latest. ✔
5. **Material procurement**: engineer request → owner review/approve/fulfil → supplier bills → payments. ✔ (purchase→delivery→stock ledger is simplified; see limitations)
6. **Client payment**: schedule → invoices → receipts (printable, ownership-checked) → outstanding updates on both Client and Owner finance views. ✔

## 9. Clickability audit

Method: scripted HTTP sweep of every route above (all 200/valid redirects, zero 500s, zero dead placeholders) + Playwright driving real flows + manual browser passes during each agent's build. Every nav item, dashboard card, attention row, table row, form, and download resolves to a real route or Server Action. No `#` links, no alert-only handlers, no "Coming in Phase N" screens anywhere. Empty states, validation errors, and success feedback exist on all forms (public forms Zod-validated; see limitations for portal-form validation depth).

## 10. Test results (all executed, not estimated)

- `npm run test` (Vitest): **93/93 passed** — 66 unit (estimator calc, INR/date formatting, delay-risk engine, all Zod schemas) + 17 data-layer integration (query builder, relations, RPCs) + 10 HTTP security/access-boundary (anon redirects; engineer/architect/client cannot reach unassigned/foreign data; receipt ID-guessing 404s). Test runs verified not to touch the live demo store (md5-checked).
- `npm run test:e2e` (Playwright, chromium): **10/10 passed** — home, estimator→quotation disclaimer, enquiry success, all four role logins, invalid password, engineer checklist toggle, sign-out.

## 11. Build results (all executed)

- `npm run typecheck`: **0 errors** (both apps; all 6 packages also pass standalone `tsc`).
- `npm run lint`: **No ESLint warnings or errors** (both apps).
- `npm run build:website`: ✔ 28 routes compiled (static + SSG service pages + dynamic).
- `npm run build:portal`: ✔ 49 routes compiled.

## 12. Demo credentials

| Role | Email | Password |
|---|---|---|
| Owner | owner@buildhaus.example | Buildhaus#Owner1 |
| Site Engineer | engineer@buildhaus.example | Buildhaus#Engineer1 |
| Architect | architect@buildhaus.example | Buildhaus#Architect1 |
| Client | client@buildhaus.example | Buildhaus#Client1 |

Seeded public quotation token: `/quotation/kQ9x2ZmP7vT1nD4rW8eF3jH6qB0sYcAeXn5uL2iO`

## 13. Local setup

```bash
npm install
npm run dev           # website :3000 + portal :3001 (Demo Mode, zero config)
# or individually: npm run dev:website / npm run dev:portal
npm run demo:reset    # wipe demo data back to seed
npm run typecheck && npm run lint && npm run build
npm run test          # unit/integration/security (servers must be running for the security tests)
npm run test:e2e      # Playwright (servers must be running)
```

## 14. Environment variables

See `apps/website/.env.example` and `apps/portal/.env.example`. Demo Mode activates automatically when `NEXT_PUBLIC_SUPABASE_URL` is unset. Key vars: `NEXT_PUBLIC_WEBSITE_URL`, `NEXT_PUBLIC_PORTAL_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only), `ANTHROPIC_API_KEY` (server-only, optional — AI assistant stays in labelled canned mode without it).

## 15. Supabase + deployment

`docs/DEPLOYMENT.md` covers: run migrations 0001→0014 in order, then `supabase/seed.sql`, then `node scripts/seed-users.mjs`; two separate Vercel projects (root directories `apps/website` / `apps/portal`) on one repo; DNS for `buildhaus.in` / `app.buildhaus.in`. **No deployment was executed** — configs and instructions only, per explicit scope decision.

## 16. Honest limitations

1. **Demo Mode is the active backend** — no live Supabase project is wired. The demo auth cookie is an unsigned profile ID: fine locally, **never deploy Demo Mode publicly** (documented in SECURITY-CHECKLIST.md). Swapping to real Supabase = set env vars + run migrations/seeds; the code paths already branch.
2. **Email/WhatsApp quotation delivery not built** (explicit scope decision — requires provider credentials). PDF download/print are real; no fake "sent" buttons exist.
3. **Anon-write RLS gap for real-Supabase mode**: the public estimator flow writes `leads`/`quotations`/`estimates` as anonymous; migrations don't yet grant scoped anon INSERTs, so that flow needs a server-role route or scoped policies before going live on real Supabase (documented in SECURITY-CHECKLIST.md).
4. **Validation depth is uneven**: public website forms use shared Zod schemas; many portal Server Actions still rely on HTML5 constraints + server-side type coercion rather than full Zod parsing. The convention (`@buildhaus/validation`'s `ActionResult`) is established for incremental hardening.
5. **Procurement is simplified**: request → approve → bill → payment works; the full purchase-order → delivery → stock-ledger chain from the spec is partially modelled in schema but not fully surfaced in UI.
6. **Estimator rate model is simpler than spec §12**: package rate/sqft + percentage breakdown + optional-works markups, owner-editable with history — but not yet per-city/per-state rate matrices or difficult-site adjustments.
7. **`next@14.2.15` has a published advisory** — pinned for stability during this restructure; upgrading is a follow-up.
8. **Site-visit/GPS/photo-compression/offline-sync** engineer-app features are basic (photos upload without compression; no offline queue).
