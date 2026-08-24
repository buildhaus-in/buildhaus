# Buildhaus — Sprint status &amp; feature checklist

Honest status per the acceptance criteria (spec §31) and development rules (§32). This file is the single source of truth for what is functional vs. scaffolded. Nothing below is marked done unless the code actually does it.

## Legend
- ✅ Done and functional
- 🟡 Partial / foundation in place, UI to complete
- ⛔ Not started (planned, has a real navigable placeholder — never a dead link)

---

## Sprint 1 — Functional foundation

| Item | Status |
|---|---|
| Not a single static HTML file (Next.js App Router) | ✅ |
| Runs locally as a Next.js app (after `npm install` + Supabase) | ✅ |
| Supabase auth (sign in / out, session) | ✅ |
| Owner / Engineer / Architect / Client login | ✅ |
| Role-based redirect to correct home | ✅ |
| Production role switcher removed (never existed in the app; only in the throwaway preview) | ✅ |
| Multiple projects stored in the DB | ✅ |
| Owner creates a project | ✅ |
| Owner creates users, assigns roles | ✅ |
| Owner assigns Engineer / Architect to a project (`project_members`) | ✅ |
| Assigned users can access the project; unassigned cannot (RLS) | ✅ |
| Client sees only their own project (RLS) | ✅ |
| Row-Level Security policies included | ✅ |
| Database migrations included (0001–0011) | ✅ |
| Seed data + demo-user script included | ✅ |
| Audit logs created (triggers on 10 key tables) | ✅ |
| Env vars documented (`.env.example`) + setup instructions (README) | ✅ |
| Responsive layouts | ✅ |
| No production data from hardcoded HTML | ✅ |
| No production data in localStorage (only future unsent drafts) | ✅ |
| Secure file upload buckets configured | 🟡 (buckets + policies exist; upload UI in Sprint 2) |
| Demo mode vs production mode | 🟡 (production is default & complete; demo seeding via script) |

## Corrections requested on the preview (this delivery)

| Item | Status |
|---|---|
| Owner navigation → 16 items, grouped | ✅ |
| Command Centre: 4 cards (Active Projects, New Enquiries, Pending Approvals, Cash Position) | ✅ |
| Command Centre: Needs Your Attention (each row links to records) | ✅ |
| Command Centre: Project Health (progress, planned, variance, delay days, risk) | ✅ |
| Command Centre: Today Across Sites | ✅ |
| Command Centre: Upcoming Financial Commitments | ✅ |
| Automatic delay-risk engine (not manual-only) | ✅ `src/lib/delay.ts` |
| Progress consistency: Internal actual vs Published-to-client, clearly labelled | ✅ |
| Client payment wording fixed (Contract Value / Invoiced / Paid / Outstanding / Next Payment + due date) | ✅ |
| Client payment schedule table (stage, %, amount, due, status) | ✅ |
| Engineer mobile bottom nav (Today, Tasks, Report, Materials, More) | ✅ |
| No dead links (every nav target is a real page) | ✅ |

---

## Sprint 2 — Three core workflows (next)

| Item | Status |
|---|---|
| Daily-report workflow: draft → submitted → owner review → approved / returned | ⛔ (schema + RLS ready; forms to build) |
| Photo upload (camera, compression, retry, unsent draft) | ⛔ |
| Drawing revision workflow (append-only, approved-for-construction, superseded) | ⛔ (schema + append-only RLS ready) |
| Engineer sees latest approved-for-construction drawing | ⛔ |
| Project assignment workflow end-to-end | ✅ (assignment done; consuming screens in Sprint 2) |

## Sprint 3 — Public website & estimator
Home, About, Services, Packages, Cost Estimator, Past Projects, Project detail, Process, Why Buildhaus, Contact, Enquiry, Client Login. Public portfolio publishing. Owner-configurable estimator rates (schema ready: `estimator_rates` with history). — ⛔ (public home ✅; the rest planned)

## Sprint 4 — CRM & quotations
Lead pipeline (Kanban/table), follow-ups, activities, estimates, versioned quotations, lead → project conversion (`convert_lead_to_project()` ✅ in DB). — ⛔ (conversion function ready; UI planned)

## Sprint 5 — Procurement & inventory
Material requests → owner rates → supplier select → purchase → delivery → stock → supplier bill → payment. Supplier records (owner-only) + copyable WhatsApp/email templates. — ⛔ (full schema ready)

## Sprint 6 — Finance, labour, quality
Client finance, expenses, profitability (owner-only), labour attendance & bills, quality inspections. — ⛔ (full schema ready)

## Sprint 7 — Client portal & AI
Full client portal (approvals, change requests, messages), Owner-only AI assistant via secure server routes, management reporting. — ⛔ (overview + payments ✅; rest planned)

---

## Security invariants (enforced now)
- Owner-only: finance, profitability, suppliers (incl. bank details), labour rates. ✅ (RLS)
- Engineer/Architect: assigned projects only. ✅
- Client: own project + client-visible rows only. ✅
- Site Engineer cannot approve own report; Architect cannot approve own drawing. ✅ (approval columns are owner-writable only)
- Drawing revisions append-only (no update/delete policy). ✅
- Audit history on key tables. ✅
- Anthropic key never in the browser (AI via server routes only). ✅ (routes land in Sprint 7)
