# Schema drift follow-up

`supabase/migrations/0018_schema_drift_repair.sql` fixes every concrete
column/enum mismatch found between the real Postgres schema and what
`apps/portal` actually reads and writes, for the tables touched in that
session's RBAC-hardening pass. This file records what that pass covered,
how it was found, and — importantly — what it did **not** check, so the gap
doesn't quietly disappear.

## Why this class of bug was invisible

Demo Mode (`packages/database/src/demo/*`, which is what this environment
runs on — there is no `.env.local`, so `isDemoMode()` is always true) has no
schema at all: no column list, no enum, no NOT NULL, no unique constraint.
It accepts any JS object shape a `.insert()`/`.update()` call hands it. Every
mismatch below would have thrown immediately against a real Supabase
project, but produced no error, no test failure, and no visible symptom in
this environment.

## How the fixed tables were found

A full diff of every `.from("tablename")` call in `apps/portal/src` against
every `create table` name across `supabase/migrations/*.sql` found exactly
one wholly-missing table (`site_issues`). Then, for the tables touched while
working the RBAC-hardening plan this session, every object literal passed to
`.insert()`/`.update()` was checked field-by-field against that table's real
`create table` statement. That per-field check is what found the renames and
missing columns — the table-existence diff alone would have missed all of
them, since every one of these tables already existed under the right name.

## Fixed in 0018 (verified against real DDL + app code, not guessed)

`client_approvals`, `change_requests`, `material_requests`,
`material_request_items`, `drawings`, `drawing_revisions`, `inspections`,
`daily_reports`, `daily_report_labour`, `daily_report_materials`,
`daily_report_photos`, and the new `site_issues` table. See the migration
file's own comments for the exact column/enum diff on each.

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

## Not audited at all

The app uses roughly 54 distinct tables. This pass checked the ~11 above
because they were the ones touched while working the RBAC-hardening plan —
it is not a systematic audit of the other ~43. Given Demo Mode's total lack
of schema enforcement, the same class of bug (a renamed/missing column, a
missing enum value) could exist in any of them undetected. Before connecting
a real Supabase project, the same field-by-field check (every `.insert()` /
`.update()` object literal in `apps/portal/src` against its table's `create
table` statement in `supabase/migrations/`) should be run across the full
table list, not just these 11.
