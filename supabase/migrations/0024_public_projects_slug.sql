-- 0024_public_projects_slug.sql
--
-- apps/website/src/app/projects/page.tsx and projects/[slug]/page.tsx both
-- query public_projects for a `slug` column that was never added — same
-- class of gap as 0022 (estimator_packages) and 0023 (public_projects RLS):
-- confirmed live, this makes the /projects listing query fail outright
-- with 42703 "column does not exist", and because neither page checks the
-- query's error, every visitor silently saw "No public projects yet"
-- regardless of the RLS fix in 0023 — the listing's own query was broken
-- separately from whether anon could read the table at all.
--
-- Nullable + backfilled rather than "not null" outright, so this can run
-- safely regardless of how many rows currently exist; the unique index
-- (partial, ignoring nulls) stops two future projects from colliding.

alter table public_projects add column if not exists slug text;
create unique index if not exists idx_pubproj_slug on public_projects(slug) where slug is not null;

-- Backfill any existing published rows that don't have one yet, from their
-- name (lowercased, non-alphanumerics collapsed to hyphens) plus a short
-- suffix of the row's own id to guarantee uniqueness without a second pass.
update public_projects
set slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(id::text, 1, 8)
where slug is null;
