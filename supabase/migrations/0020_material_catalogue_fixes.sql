-- ============================================================================
-- Buildhaus · 0020 · material_catalogue: column rename + public read
-- ----------------------------------------------------------------------------
-- Closes out docs/SCHEMA-DRIFT-FOLLOWUP.md's "still genuinely unchecked" list
-- (client_invoices, material_catalogue, project_stages, quality_checklists,
-- roles) — the other four read exactly the columns the real schema has
-- (verified by diffing every .select() column list against each table's
-- real DDL); material_catalogue had two real issues.
-- ============================================================================

-- 1. Column drift: apps/website's /materials page, quotation PDF/share-link
--    pages, and owner/quotations/[id]/download all select `spec`; the real
--    column is `specification`.
alter table material_catalogue rename column specification to spec;

-- 2. RLS gap, independent of the rename: matcat_read
--    (0010_rls_policies.sql) is `to authenticated` only. Every other reader
--    of this table is either an owner-authenticated page or already uses
--    createAdminClient() for a legitimate anonymous-visitor service context
--    (apps/website's quotation/[token] pages — see their own comments) —
--    except apps/website/src/app/materials/page.tsx, a public marketing
--    page with no auth check at all, using the plain anon client. Against a
--    real Supabase project this page would render "Material catalogue
--    unavailable" for every visitor, always: RLS silently returns zero
--    rows rather than erroring. It only selects id/name/unit/category/spec
--    (no rate/cost columns, no PII) — the same "deliberately public
--    information" reasoning 0015_public_pricing_read.sql already applied to
--    estimator_packages/estimator_rates for the same reason (the public
--    packages pages), extended here rather than switching this page to
--    createAdminClient() and pulling in the service-role key where an RLS
--    grant does the job (CLAUDE.md: service-role key server-side only, and
--    only where genuinely required).
create policy matcat_read_anon on material_catalogue
  for select to anon
  using (true);
