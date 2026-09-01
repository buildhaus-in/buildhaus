# Schema drift follow-up

`supabase/migrations/0018_schema_drift_repair.sql`,
`0019_schema_drift_repair_2.sql` and `0020_material_catalogue_fixes.sql`
fix every concrete column/enum/RLS mismatch found between the real Postgres
schema and what `apps/portal` **and** `apps/website` actually read and
write. 0018 covered the tables touched by that session's RBAC-hardening
pass; 0019 covered the rest of both apps' write surface; 0020 closed out
the handful of tables neither pass's write-only methodology could see.
This file records what those passes covered, how, and — importantly —
what's still genuinely unchecked, so the gap doesn't quietly disappear.

## Why this class of bug was invisible

Demo Mode (`packages/database/src/demo/*`, which is what this environment
runs on — there is no `.env.local`, so `isDemoMode()` is always true) has no
schema at all: no column list, no enum, no NOT NULL, no unique constraint.
It accepts any JS object shape a `.insert()`/`.update()` call hands it. Every
mismatch below would have thrown immediately against a real Supabase
project, but produced no error, no test failure, and no visible symptom in
this environment.

## How the fixed tables were found

A full diff of every `.from("tablename")` call in `apps/portal/src` (0018)
and later `apps/website/src` too (0019) against every `create table` name
across `supabase/migrations/*.sql` found exactly one wholly-missing table
(`site_issues`) — everything else already existed under the right table
name, just with drifted columns. Two complementary field-level checks then
found the actual drift, each catching what the other missed:

1. Every object literal passed to `.insert()`/`.update()`/`.upsert()`,
   diffed key-by-key against the target table's real columns (including
   columns added later by `alter table`, not just the original `create
   table`). This is what 0018 relied on exclusively, and it's what found
   every rename/missing column in both passes.
2. Every column name passed to `.eq()`/`.select()`/`.order()` etc., diffed
   the same way. Added for 0019 after it caught a mismatch (1) alone would
   have missed entirely: nothing in either app ever *inserts* a
   `notifications` row (they're seed/platform-generated), only reads and
   updates one — so the real `recipient_id`/`is_read` vs. the app's
   `profile_id`/`read` was invisible to an insert/update-only sweep.

Both checks are still just automated first passes, not proof — a few
apparent hits from the raw key diff turned out to be false positives from
naive regex parsing (nested object literals read as flat, e.g. a
`specifications: { customer: { name, mobile, ... } }` jsonb payload on
`quotation_versions` initially looked like five bogus top-level column
mismatches). Every finding below was confirmed by actually reading the
call site and the table's DDL side by side before it went in a migration.

## Fixed in 0018 (verified against real DDL + app code, not guessed)

`client_approvals`, `change_requests`, `material_requests`,
`material_request_items`, `drawings`, `drawing_revisions`, `inspections`,
`daily_reports`, `daily_report_labour`, `daily_report_materials`,
`daily_report_photos`, and the new `site_issues` table. See that migration
file's own comments for the exact column/enum diff on each.

## Fixed in 0019 (verified against real DDL + app code, not guessed)

`client_receipts`, `documents`, `estimator_packages`, `estimator_rates`,
`labour_attendance`, `labour_contractors`, `lead_activities`, `leads`,
`clients`, `notifications`, `payments`, `purchases`, `site_visits`,
`suppliers`, `task_comments`, `tasks`. See that migration file's own
comments for the exact column diff on each, plus:

- **`convert_lead_to_project()`** (0011_triggers_functions.sql) read/wrote
  `leads.phone`/`clients.phone` — re-cut in 0019 with `.mobile` on both,
  matching the rename. Demo Mode's stand-in for this function
  (`packages/database/src/demo/rpc.ts`) already used `.mobile` — another
  case of Demo Mode having been built against the app's real contract, not
  the migrations'.
- **Three real NOT-NULL violations, independent of naming drift**, fixed in
  application code rather than the migration: `owner/finance/actions.ts`
  (`recordReceipt`, `markSupplierBillPaid`, `markContractorBillPaid`) never
  set `payments.organisation_id`; `owner/projects/actions.ts`'s
  `uploadDocument` never set `documents.organisation_id`;
  `owner/suppliers/actions.ts`'s `raisePurchase` never set
  `purchases.organisation_id`. All three columns are `not null` on the real
  schema — every one of these inserts would have failed outright against a
  real Postgres project, not just written under the wrong column name.
- **A migration that would itself have failed to apply**:
  `0017_finance_ledger_integrity.sql` created a unique index on
  `client_receipts.receipt_no` without that column ever existing — fixed in
  place (adding the column before the index) rather than papered over here,
  since these migrations have never been applied to any real database in
  this environment.

## Explicitly NOT fixed, and why

- **`daily_report_work`** — real schema uses `report_id`/`description`;
  nothing in `apps/portal/src` reads or writes this table at all (only
  `packages/database/src/demo/seed.ts` seeds it, as dead demo data). Left
  untouched rather than renamed on spec, since there's no app usage to
  verify the "correct" shape against.
- **`daily_report_materials`'s `direction`/`quantity` columns** — the real
  schema models one row per material *per direction* ('received' or
  'consumed'); the app models one row per material with two numeric columns
  (`received`, `consumed`). 0018 added the two columns the app needs rather
  than restructuring the table to the real schema's row-per-direction model
  or rewriting the app to match it — that's a real data-model decision
  (which shape is "correct" going forward), not a drift repair, and
  shouldn't be made unilaterally. The old `direction`/`quantity` columns are
  left in place, unused.
- **`estimator_packages`/`estimator_rates`** — the real schema was built for
  a more elaborate, city/state/building-type-keyed rate model
  (`building_type`, `city`, `state`, `effective_from`, `base_rate_sqft`);
  both apps' actual estimator (a flat package list plus cost-breakdown
  percentages, keyed by `key`/`component`) never touches those columns at
  all. 0019 added the columns the app uses alongside the untouched
  originals rather than forcing a unification.
- **`purchases`** — same situation: the real schema is a multi-item
  purchase-order header (`po_number`, `tax`, `total`, `transport`,
  `payment_terms`) meant to pair with `purchase_items`; the app's
  `raisePurchase` is an explicitly-labelled ("not the full multi-item
  purchase-order workflow... just enough to record intent") single-line
  MVP. Same additive treatment.

## Verified clean — has real writes, all matched already

No changes needed; confirmed by reading the actual insert/update object
literals against the table's DDL: `client_payment_schedules`, `comments`,
`contractor_bills`, `estimator_rate_history`, `expenses`, `faqs`,
`organisation_settings`, `organisations`, `profiles`, `project_members`,
`projects`, `quotation_versions`, `quotations`, `supplier_bills`,
`testimonials`, `user_roles`, `website_pages`, `website_sections`.

## The last five, closed out in 0020

The five tables with no direct `.insert()`/`.update()`/`.upsert()` call
(only reads, or writes exclusively through `convert_lead_to_project()`) got
the same read-side check that caught `notifications` in 0019 — every
`.select()` column list, diffed against the table's real columns.
`client_invoices`, `project_stages`, `quality_checklists` and `roles` came
back clean: every column either app ever selects genuinely exists.
`material_catalogue` had two real issues, both fixed in
`0020_material_catalogue_fixes.sql`:

- **Column drift**: `apps/website`'s `/materials` page, the quotation
  PDF/share-link pages, and `owner/quotations/[id]/download` all select
  `spec`; the real column is `specification`. Renamed to match.
- **An RLS gap independent of the rename**: `apps/website/src/app/materials
  /page.tsx` is a public marketing page with no auth check, reading
  `material_catalogue` with the plain anon client — but `matcat_read`
  (0010_rls_policies.sql) is `to authenticated` only. Against a real
  Supabase project this page would render "Material catalogue unavailable"
  for every visitor, always: RLS silently returns zero rows rather than
  erroring, so nothing would have caught this outside an actual anon-key
  request. Fixed with an anon read policy, extending the same "this is
  deliberately public information" reasoning
  `0015_public_pricing_read.sql` already applied to
  `estimator_packages`/`estimator_rates` for the identical reason (this
  page selects only `id/name/unit/category/spec` — no rate or cost column,
  no PII) — rather than switching the page to `createAdminClient()` and
  pulling in the service-role key where an RLS grant does the job just as
  well (CLAUDE.md: service-role key server-side only, and only where
  genuinely required).

## What this leaves

Every table the app writes to directly, across both `apps/portal` and
`apps/website`, has now been checked column-by-column against the real
schema, and every table it reads from has had its `.select()` column lists
checked the same way. What's **not** covered by any of this: RLS policies
whose *predicate* (not a `.select()`/`.insert()` column list) references a
column that drifted — each rename in 0018/0019/0020 was individually
checked against `0010_rls_policies.sql`/`0011_triggers_functions.sql` for
that specific column, but there's no systematic "diff every policy
predicate" pass the way there was for select/insert column lists. And none
of this has been run against an actual Postgres instance — every fix here
is grounded in reading the migration DDL and the call site side by side,
not in a migration that's actually been applied and exercised. That first
real `supabase db reset` against a live project remains the genuine
verification this repo is still missing.
