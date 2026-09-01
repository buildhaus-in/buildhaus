-- ============================================================================
-- Buildhaus · 0019 · Schema drift repair, round 2
-- ----------------------------------------------------------------------------
-- Continuation of 0018_schema_drift_repair.sql, covering the rest of the
-- app's table surface (per docs/SCHEMA-DRIFT-FOLLOWUP.md's "not audited at
-- all" list) — this pass also swept apps/website/src, since several of
-- these tables (leads, lead_activities, site_visits, estimator_packages,
-- estimator_rates) are written by the public cost-estimator, callback and
-- site-visit request flows, not just apps/portal.
--
-- Method, same as 0018: every `.from("table")` call followed by
-- `.insert(`/`.update(`/`.upsert(` across both apps' src, object literal
-- keys diffed against the table's real `create table` (+ any later `alter
-- table`) columns; separately, every `.eq(`/`.select(` column reference
-- diffed the same way, to catch filter/read-column drift an insert/update
-- sweep alone would miss (this is how the notifications.recipient_id /
-- is_read mismatch below was found — nothing ever inserts a notification
-- from application code, only reads and updates one).
--
-- Two tables (estimator_packages, estimator_rates) and one (purchases)
-- turned out to be a real, acknowledged design simplification rather than
-- a naming accident: the app's cost-breakdown-by-percentage estimator and
-- single-line "raise a purchase" MVP (its own comment in
-- owner/suppliers/actions.ts says as much) never touch several real
-- columns built for a more elaborate model (city/state/building_type-keyed
-- rates; a multi-item purchase-order header). Those get the columns they
-- actually use added alongside the untouched originals, same as
-- daily_report_materials in 0018 — not a forced unification.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. client_receipts — already repaired directly in 0017 (see that file's
--    updated comment): this migration's own attempt to index a `receipt_no`
--    column that was never added would have failed outright on a real
--    Postgres project. The received_on -> receipt_date rename that pass
--    missed is finished here.
-- ----------------------------------------------------------------------------
alter table client_receipts rename column received_on to receipt_date;

-- ----------------------------------------------------------------------------
-- 2. documents — owner/projects/actions.ts's uploadDocument().
-- ----------------------------------------------------------------------------
alter table documents rename column storage_path to file_url;
alter table documents add column if not exists uploaded_at timestamptz;

-- ----------------------------------------------------------------------------
-- 3. estimator_packages / estimator_rates — see header note. Both apps'
--    estimator flows key packages by `key` and rates by `component`, and
--    have done so consistently (apps/portal's owner/estimator, apps/website's
--    cost-estimator/packages/services/sitemap) since before this pass.
-- ----------------------------------------------------------------------------
alter table estimator_packages
  add column if not exists key text,
  add column if not exists label text,
  add column if not exists rate_per_sqft numeric(10,2),
  add column if not exists description text;

alter table estimator_rates
  add column if not exists component text,
  add column if not exists percent numeric(5,2);

-- ----------------------------------------------------------------------------
-- 4. labour_attendance / labour_contractors
-- ----------------------------------------------------------------------------
alter table labour_attendance rename column count to present_count;
alter table labour_attendance rename column entered_by to logged_by;
alter table labour_contractors rename column phone to mobile;

-- ----------------------------------------------------------------------------
-- 5. lead_activities
-- ----------------------------------------------------------------------------
alter table lead_activities rename column kind to type;
alter table lead_activities rename column detail to note;

-- ----------------------------------------------------------------------------
-- 6. leads / clients — both renamed together (see convert_lead_to_project()
--    below): owner/crm/actions.ts and every apps/website lead-capture flow
--    (cost-estimator, request-callback, request-site-visit, enquiry) write
--    leads.mobile; owner/clients/page.tsx reads clients.mobile. The real
--    schema had .phone on both, and the trigger function that bridges a
--    converted lead into a client row read/wrote .phone on both sides too
--    (packages/database/src/demo/rpc.ts's Demo Mode stand-in already used
--    .mobile — another case of Demo Mode matching the app's real contract,
--    not the migrations').
-- ----------------------------------------------------------------------------
alter table leads rename column phone to mobile;
alter table leads rename column followup_date to follow_up_date;
alter table leads add column if not exists enquiry_date date;

alter table clients rename column phone to mobile;

-- Re-cut with the corrected column names. Body is otherwise identical to
-- 0011_triggers_functions.sql's original — see that file for the full
-- history/rationale comment above this function.
create or replace function public.convert_lead_to_project(p_lead uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org uuid; v_client uuid; v_project uuid; v_code text; l record;
  stage_names text[] := array[
    'Requirement collection','Survey','Soil testing','Architectural design',
    'Structural design','Approvals','Site mobilisation','Excavation','Foundation',
    'Plinth','RCC structure','Masonry','Internal plastering','External plastering',
    'Waterproofing','Plumbing','Electrical','Flooring','Doors and windows',
    'Painting','Fixtures','Elevation','External works','Snagging','Handover'];
  i int;
begin
  if not public.is_owner() then raise exception 'Only the Owner can convert leads'; end if;
  select * into l from leads where id = p_lead;
  v_org := l.organisation_id;

  if l.client_id is not null then v_client := l.client_id;
  else
    insert into clients(organisation_id, full_name, mobile, whatsapp, email, city, state, created_by)
    values (v_org, l.customer_name, l.mobile, l.whatsapp, l.email, l.city, l.state, auth.uid())
    returning id into v_client;
  end if;

  v_code := public.next_code(v_org, 'project', 'BH');
  insert into projects(organisation_id, code, name, client_id, site_address,
                       project_type, builtup_area_sqft, floors, package, status, created_by)
  values (v_org, v_code, coalesce(l.customer_name,'Project')||' — '||coalesce(l.building_type,'Build'),
          v_client, l.site_location, l.building_type, l.builtup_area_sqft, l.floors,
          l.preferred_package, 'lead_converted', auth.uid())
  returning id into v_project;

  for i in 1 .. array_length(stage_names,1) loop
    insert into project_stages(project_id, seq, name) values (v_project, i, stage_names[i]);
  end loop;

  update leads set stage='won', client_id=v_client, project_id=v_project, updated_at=now() where id=p_lead;
  perform public.log_audit('convert','lead',p_lead, format('Lead converted to project %s', v_code), null);
  return v_project;
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. notifications — nothing in application code ever inserts a
--    notification row (they're seed/platform-generated), only reads and
--    updates one, which is how this survived the insert/update-only half of
--    0018's methodology. Both owner/notifications and engineer/notifications
--    filter/update by `profile_id` and read/write `read`.
-- ----------------------------------------------------------------------------
alter table notifications rename column is_read to read;
alter table notifications rename column recipient_id to profile_id;

drop policy if exists notif_self on notifications;
create policy notif_self on notifications for select to authenticated
  using (profile_id = auth.uid());
drop policy if exists notif_self_update on notifications;
create policy notif_self_update on notifications for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 8. payments — owner/finance/actions.ts's recordReceipt/
--    markSupplierBillPaid/markContractorBillPaid.
-- ----------------------------------------------------------------------------
alter table payments rename column paid_on to payment_date;
alter table payments add column if not exists category text;

-- ----------------------------------------------------------------------------
-- 9. purchases — see header note on raisePurchase's acknowledged MVP scope.
-- ----------------------------------------------------------------------------
alter table purchases
  add column if not exists material_name text,
  add column if not exists quantity numeric(14,2),
  add column if not exists unit text,
  add column if not exists ordered_at timestamptz;

-- ----------------------------------------------------------------------------
-- 10. site_visits — owner/crm/actions.ts's scheduleSiteVisit and
--     apps/website's request-site-visit flow.
-- ----------------------------------------------------------------------------
alter table site_visits rename column scheduled_at to scheduled_date;
alter table site_visits add column if not exists status text not null default 'scheduled';

-- ----------------------------------------------------------------------------
-- 11. suppliers — owner/suppliers/actions.ts's createSupplier.
-- ----------------------------------------------------------------------------
alter table suppliers rename column business_name to name;
alter table suppliers add column if not exists category text;

-- ----------------------------------------------------------------------------
-- 12. task_comments / tasks — engineer/tasks/actions.ts.
-- ----------------------------------------------------------------------------
alter table task_comments rename column created_by to author_id;

alter table tasks rename column rejection_reason to blocker_reason;
alter table tasks add column if not exists accepted_at timestamptz;
alter table tasks add column if not exists checklist jsonb not null default '[]'::jsonb;
