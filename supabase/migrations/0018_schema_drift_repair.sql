-- ============================================================================
-- Buildhaus · 0018 · Schema drift repair (app code vs. real Postgres schema)
-- ----------------------------------------------------------------------------
-- Demo Mode (packages/database/src/demo/*) has no schema validation at all —
-- it accepts any JS object shape — so nothing in this environment ever
-- caught that large parts of the app write/read column and enum-value names
-- that simply do not exist in these migrations. Connect a real Supabase
-- project today and every one of the writes below would fail outright.
--
-- Found by diffing every `.from("table")` call and object literal in
-- apps/portal/src against the `create table` / `create type ... as enum`
-- statements in this migrations directory. Scope is deliberately bounded to
-- the tables touched while working this session (finance, drawings,
-- approvals, change requests, materials, quality, daily reports, site
-- issues) — NOT a full audit of all ~54 tables the app uses. The remainder
-- is flagged as follow-up in docs/SCHEMA-DRIFT-FOLLOWUP.md.
--
-- Every rename below was checked against 0010_rls_policies.sql and
-- 0011_triggers_functions.sql for the old column name appearing in a raw
-- (non-`project_id`) policy/function reference. Two were found —
-- matreqitem_rw and the daily_report_{labour,materials,photos} generated
-- loop policy — and are dropped/recreated here against the new names.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. client_approvals — app writes type/ref_id/sent_at/decided_at/description,
--    none of which exist; category/detail/reference_path/history/created_by
--    exist but nothing writes them. Left the unused real columns in place
--    (non-breaking) rather than dropping them.
-- ----------------------------------------------------------------------------
alter table client_approvals
  add column if not exists type text,
  add column if not exists ref_id uuid,
  add column if not exists sent_at timestamptz,
  add column if not exists decided_at timestamptz,
  add column if not exists description text;

alter type approval_status add value if not exists 'rejected';

-- approvals_read's status allowlist predates 'rejected' — without this, a
-- client who rejects their own approval (owner/clients/actions.ts's
-- rejectApproval / client/approvals/actions.ts's rejectApproval both set
-- status='rejected') loses read access to the row they just acted on.
drop policy if exists approvals_read on client_approvals;
create policy approvals_read on client_approvals for select to authenticated
  using (public.is_owner() or public.is_project_member(project_id)
         or (public.is_project_client(project_id)
             and status in ('sent_to_client','approved','changes_requested','revised','rejected')));

-- ----------------------------------------------------------------------------
-- 2. change_requests — client/change-requests/actions.ts sets
--    status='pending_pricing' between 'submitted' and 'cost_time_shared'.
-- ----------------------------------------------------------------------------
alter type change_request_status add value if not exists 'pending_pricing';

-- ----------------------------------------------------------------------------
-- 3. material_requests / material_request_items
-- ----------------------------------------------------------------------------
alter table material_requests rename column required_date to needed_by;
alter type material_request_status add value if not exists 'fulfilled';

alter table material_request_items rename column request_id to material_request_id;
alter table material_request_items rename column name to material_name;

drop policy if exists matreqitem_rw on material_request_items;
create policy matreqitem_rw on material_request_items for all to authenticated
  using (exists (select 1 from material_requests r where r.id = material_request_id
                 and (public.is_owner() or public.is_project_member(r.project_id))))
  with check (exists (select 1 from material_requests r where r.id = material_request_id
                 and (public.is_owner() or public.is_project_member(r.project_id))));

-- ----------------------------------------------------------------------------
-- 4. drawings / drawing_revisions — owner/drawings/actions.ts bounces a
--    drawing back to the architect via status='revision_requested', which
--    doesn't exist in drawing_status.
-- ----------------------------------------------------------------------------
alter type drawing_status add value if not exists 'revision_requested';

alter table drawing_revisions rename column revision to revision_no;
alter table drawing_revisions rename column storage_path to file_url;

-- ----------------------------------------------------------------------------
-- 5. inspections — owner/quality/actions.ts writes inspected_by/inspected_at
--    (a full timestamp) and a free-text notes field; none exist under those
--    names. inspection_status already has 'closed'/'passed'/'failed' etc.,
--    so no enum change needed here.
-- ----------------------------------------------------------------------------
alter table inspections rename column engineer_id to inspected_by;
alter table inspections rename column inspection_date to inspected_at;
alter table inspections alter column inspected_at type timestamptz using inspected_at::timestamptz;
alter table inspections add column if not exists notes text;

-- ----------------------------------------------------------------------------
-- 6. daily_reports — engineer/report/actions.ts and owner/site-operations
--    write/read a header shape that only partly matches: three columns are
--    plain renames, two (quantity_executed, unit, approved_at) don't exist
--    at all.
-- ----------------------------------------------------------------------------
alter table daily_reports rename column work_summary to work_completed;
alter table daily_reports rename column delay_reason to delays;
alter table daily_reports rename column safety_notes to safety_observations;
alter table daily_reports rename column return_reason to returned_reason;
alter table daily_reports add column if not exists quantity_executed numeric(12,2);
alter table daily_reports add column if not exists unit text;
alter table daily_reports add column if not exists approved_at timestamptz;

-- ----------------------------------------------------------------------------
-- 7. daily_report_labour / daily_report_materials / daily_report_photos —
--    engineer/report/actions.ts addresses the parent by daily_report_id,
--    not report_id, and daily_report_materials tracks received/consumed as
--    two separate numeric columns per material rather than one row per
--    direction. daily_report_work is untouched: nothing in apps/portal
--    reads or writes it (seed-only), so it's left exactly as migrated.
-- ----------------------------------------------------------------------------
alter table daily_report_labour rename column report_id to daily_report_id;
alter table daily_report_labour rename column trade to category;

alter table daily_report_materials rename column report_id to daily_report_id;
alter table daily_report_materials add column if not exists received numeric(12,2);
alter table daily_report_materials add column if not exists consumed numeric(12,2);
-- direction/quantity are left in place, unused, rather than dropped —
-- this table's real shape (one row per material+direction) is arguably
-- more normalized than the app's (one row per material with two amount
-- columns); collapsing to one model is a bigger call than a drift repair
-- should make unilaterally. Flagged in the follow-up doc.

alter table daily_report_photos rename column report_id to daily_report_id;
alter table daily_report_photos rename column storage_path to url;

drop policy if exists daily_report_labour_rw on daily_report_labour;
create policy daily_report_labour_rw on daily_report_labour for all to authenticated
  using (exists (select 1 from daily_reports r where r.id = daily_report_id
                 and (public.is_owner() or public.is_project_member(r.project_id))))
  with check (exists (select 1 from daily_reports r where r.id = daily_report_id
                 and (public.is_owner() or public.is_project_member(r.project_id))));

drop policy if exists daily_report_materials_rw on daily_report_materials;
create policy daily_report_materials_rw on daily_report_materials for all to authenticated
  using (exists (select 1 from daily_reports r where r.id = daily_report_id
                 and (public.is_owner() or public.is_project_member(r.project_id))))
  with check (exists (select 1 from daily_reports r where r.id = daily_report_id
                 and (public.is_owner() or public.is_project_member(r.project_id))));

drop policy if exists daily_report_photos_rw on daily_report_photos;
create policy daily_report_photos_rw on daily_report_photos for all to authenticated
  using (exists (select 1 from daily_reports r where r.id = daily_report_id
                 and (public.is_owner() or public.is_project_member(r.project_id))))
  with check (exists (select 1 from daily_reports r where r.id = daily_report_id
                 and (public.is_owner() or public.is_project_member(r.project_id))));

-- ----------------------------------------------------------------------------
-- 8. site_issues — engineer/issues/{page,actions}.tsx reads and writes this
--    table; it doesn't exist anywhere in the migrations at all (confirmed
--    via a full diff of every `.from("...")` call against every
--    `create table` name — the only wholly-missing table found).
-- ----------------------------------------------------------------------------
create table if not exists site_issues (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references projects(id) on delete cascade,
  reported_by      uuid references profiles(id),
  category         text not null default 'other',
  severity         text not null default 'medium',
  title            text not null,
  description      text,
  status           text not null default 'open',
  resolution_notes text,
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz
);
create index if not exists idx_site_issues_project on site_issues(project_id);

alter table site_issues enable row level security;

create policy site_issues_read on site_issues for select to authenticated
  using (public.is_owner() or public.is_project_member(project_id));
create policy site_issues_member_write on site_issues for all to authenticated
  using (public.is_owner() or public.is_project_member(project_id))
  with check (public.is_owner() or public.is_project_member(project_id));
