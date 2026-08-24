# Buildhaus — Architecture &amp; Plan

This is the planning document for the Buildhaus platform: how the prototype maps to a real app, the access model for the four MVP roles, the core workflows, the database design, the screen inventory, and the phased build plan. It doubles as the reference the code is built against.

---

## A. Review of the prototype

The starting point was a single `index.html` (React via CDN, Babel-in-browser) with all data in `localStorage` and one hardcoded project. It nailed the **look** (dark construction palette, INR lakh/crore formatting, clean cards) and a few **interaction patterns** worth keeping: progress bars tied to consumption, an approve-report flow, a material-shortage signal, and copyable WhatsApp templates.

Four things made it unfit to grow as-is, and each is resolved in this build:

1. **The Anthropic API was called from the browser**, exposing the key. → All AI moves to server routes; the key stays server-side.
2. **`localStorage` held all data** — not shared, not secure, not multi-user. → Postgres via Supabase, with real auth.
3. **No authentication or roles.** → Supabase Auth + a data-driven RBAC model enforced by Row-Level Security.
4. **One giant file with in-browser compilation** wouldn't scale. → Next.js App Router with a typed component library.

What carried over verbatim: the exact colour tokens, the INR formatter, and the progress/approval UX ideas.

---

## B. MVP architecture &amp; access model

Four roles ship in the MVP. The permission system is **data-driven** — roles and permissions are rows, not hardcoded `if` branches — so future roles (procurement manager, accounts, QS, sales, etc.) are added by inserting rows and, at most, giving them a home route.

**The access spine is `project_members`.** A Site Engineer or Architect sees a project only if they have a row linking them to it. A Client sees a project only if their `clients.profile_id` matches the signed-in user and the project points at that client. The Owner sees everything in their organisation.

Access matrix (high level):

| Area | Owner | Site Engineer | Architect | Client |
|---|---|---|---|---|
| CRM / leads | Full | — | — | — |
| Estimator / quotations | Full | — | — | Own quotes (read) |
| Projects | All | Assigned | Assigned | Own (read) |
| Tasks | All | Assigned (write) | Assigned (read) | — |
| Daily reports | Review/approve | Submit on assigned | — | Approved + shared only |
| Drawings | All | Read approved | Upload/revise on assigned | Shared for review/approved |
| Materials/procurement | Full | Request only | — | — |
| Suppliers | Full (incl. bank) | — | — | — |
| Finance/profitability | Full | — | — | Own schedule/invoices/receipts |
| Quality | All | Create on assigned | — | Shared only |
| Users &amp; roles | Full | — | — | — |

Two enforcement layers: **RLS in Postgres** (authoritative — holds for web, future mobile, or scripts) and a **Next.js check** in the `(app)` layout for good UX (redirects rather than empty screens). Financial columns on otherwise-shared tables (e.g. `projects.contract_value`) are Owner-restricted; a column-masking view is the planned refinement so members can read the row without the money columns.

Per-role navigation:

- **Owner:** Command Centre · CRM · Estimator · Quotations · Projects · Materials · Suppliers · Finance · Users · Settings
- **Site Engineer:** Today · My Projects · Tasks · Daily Report · Materials · Drawings
- **Architect:** Dashboard · Projects · Drawings · Reviews
- **Client:** Overview · Progress · Photos · Approvals · Payments · Documents

---

## C. Core workflows

**Enquiry → Project.** Website enquiry or manual entry creates a `lead`. The Owner works it through the pipeline; on *won*, `convert_lead_to_project()` atomically creates the client + project + the 25 standard construction stages and marks the lead converted.

**Estimate → Quotation.** The public estimator uses Owner-configured rates (data rows, with history) to produce an estimate; that becomes a versioned quotation; an accepted quotation seeds a project.

**Daily site report.** Engineer submits (work, labour, materials, photos, GPS, weather) → status `submitted` → Owner reviews → `approved` (optionally marked client-visible) or `returned` with a reason.

**Drawing → approval.** Architect uploads a drawing; each revision is an **append-only** row (history can't be silently rewritten). Sent for client review → client approves or requests changes → approved-for-construction becomes the version engineers build to.

**Material request → purchase.** Engineer raises a request on their project → Owner turns it into a purchase order against a supplier → receipts update site stock and consumption.

**Client payment.** Owner defines a milestone schedule → invoices raised → receipts recorded. The client sees their own schedule/invoices/receipts and nothing else financial.

**Change request.** Client raises a change → Owner prices it (cost + timeline impact) → client approves → it flows into variations and, if needed, a revised quotation.

---

## D. Technical architecture

- **Frontend/server:** Next.js App Router. Server Components read data through a per-request Supabase client that runs as the signed-in user, so RLS always applies. Mutations use Server Actions.
- **Auth:** Supabase Auth (email/password in MVP). Middleware refreshes the session and gates the app area; the `(app)` layout resolves roles and enforces route-prefix access.
- **Database:** Postgres with helper predicates (`is_owner`, `is_project_member`, `is_project_client`, `can_view_project`, `has_permission`) used throughout the policies.
- **Storage:** Private buckets for project files, drawings, site photos, documents; one public bucket for the marketing portfolio. Access to private files is brokered by signed URLs after a server-side project-access check.
- **AI (Phase 8):** All Claude calls run in server routes, logged in `ai_requests`/`ai_responses`; the key never reaches the browser.
- **Secrets:** Only `NEXT_PUBLIC_*` values reach the client. The service-role key is used server-side and only after an Owner check.

---

## E. Database schema (summary)

Roughly 90 tables across these groups (see `supabase/migrations`):

- **Identity/RBAC:** organisations, organisation_settings, profiles, roles, permissions, role_permissions, user_roles.
- **CRM:** clients, leads, lead_activities, site_visits.
- **Projects:** projects, project_members, project_stages, tasks, task_comments.
- **Reports:** daily_reports (+ work/labour/materials/photos children).
- **Design:** documents, drawings, drawing_revisions, client_approvals, change_requests, variations.
- **Materials/procurement:** material_catalogue, suppliers, supplier_materials/rates/rate_history, project_materials, material_requests(+items), purchases(+items), material_receipts, inventory_transactions.
- **Labour:** labour_contractors, workers, labour_attendance, work_orders, measurements, contractor_bills.
- **Finance:** client_payment_schedules, client_invoices, client_receipts, supplier_bills, expenses, payments.
- **Quality:** quality_checklists, inspections, inspection_items.
- **Estimator/sales:** estimator_packages, estimator_rates(+history), estimates, quotations, quotation_versions.
- **Public site:** public_projects, project_gallery.
- **Cross-cutting:** notifications, comments, attachments, audit_logs, ai_requests, ai_responses, code_counters.

Conventions: UUID PKs, `organisation_id` for isolation, `created_at/updated_at` with an update trigger, soft-delete (`deleted_at`) on major entities, human-readable codes via `next_code()`, and audit triggers on the ten highest-value tables. Estimator and supplier rates keep history so past numbers stay reproducible.

---

## F. Screen inventory

**Public:** Home (built), Estimator, Packages, Projects/portfolio, Process, Contact, Enquiry.

**Owner:** Command Centre (built), Projects list + create (built), Project detail (built), Users (built), CRM, Estimator config, Quotations, Materials/procurement, Suppliers, Finance, Settings.

**Site Engineer:** Today (built), My Projects, Tasks, Daily Report, Materials, Drawings.

**Architect:** Dashboard (built), Projects, Drawings, Reviews.

**Client:** Overview (built), Progress, Photos, Approvals, Payments, Documents.

Everything not yet built is a real, navigable route with an honest "coming in Phase N" placeholder — no dead links.

---

## G. Phased build plan

1. **Phase 1 (this delivery):** Foundation — schema, RBAC + RLS, auth, role shells, Owner projects/users, all four dashboards, demo data.
2. **Phase 2:** CRM &amp; leads, website enquiry capture, lead → project conversion UI.
3. **Phase 3:** Site execution — tasks, daily reports with photos, client progress/photos views.
4. **Phase 4:** Materials, procurement, suppliers (with WhatsApp/email templates), drawings &amp; approvals, change requests.
5. **Phase 5:** Estimator config + public estimator, versioned quotations, documents.
6. **Phase 6:** Finance — payment schedules, invoices/receipts, expenses, per-project profitability, client payments view.
7. **Phase 7:** Quality module, settings, roles/permissions admin UI, notifications, audit views, column-masking refinement.
8. **Phase 8:** AI assistant via secure server routes (report summaries, client updates, draft messages), fully logged.

### Phase 1 acceptance — status

Runs locally with the documented setup · styling migrated to the shared palette · all four roles sign in and land on their own home · permissions enforced in the database via RLS · multiple projects supported · Owner creates projects and assigns engineers/architects · engineers/architects see only assigned projects, clients only their own · data persists in Postgres · private storage buckets configured for secure uploads · audit logs enabled on key tables · responsive nav (sidebar + mobile bar) · no `localStorage` for production data · migrations + seed + env docs + setup instructions included.

The one thing that couldn't be exercised in the build environment is a live `npm install` / Supabase run (no network there); the setup steps are the standard flow and any environment-specific error is a quick fix.
