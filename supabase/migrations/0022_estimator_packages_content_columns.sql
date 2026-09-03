-- 0022_estimator_packages_content_columns.sql
--
-- The public Packages pages (apps/website/src/app/packages/page.tsx and
-- packages/[slug]/page.tsx) query estimator_packages for `series`,
-- `best_for`, `highlights` and `specs` alongside the `key`/`label`/
-- `rate_per_sqft`/`description` columns 0019_schema_drift_repair_2.sql
-- already added. Those four were never added at all — PostgREST rejects
-- the query outright with 42703 "column does not exist", and because
-- neither page ever checked the query's `error`, every visitor to
-- /packages silently saw "Packages unavailable" instead of a real error
-- or, once this is fixed, the actual package content.
--
-- Adding the columns here; the three existing rows' new columns (plus
-- the still-empty key/label/rate_per_sqft/description from 0019) are
-- backfilled separately via a script against the real project, not in
-- this file — this migration is schema-only, matching every other file
-- in this directory.

alter table estimator_packages
  add column if not exists series text,
  add column if not exists best_for jsonb default '[]'::jsonb,
  add column if not exists highlights jsonb default '[]'::jsonb,
  add column if not exists specs jsonb default '[]'::jsonb;
