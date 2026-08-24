-- ============================================================================
-- Buildhaus · 0010 · Row-Level Security
-- ----------------------------------------------------------------------------
-- Enforcement happens in the database, so it holds no matter which client
-- (web, future mobile, scripts) connects. The Next.js layer adds a second
-- check for UX, but the DB is the source of truth.
--
-- Predicate helpers (from 0002/0003):
--   is_owner()                  → current user holds the 'owner' role
--   has_permission('mod.act')   → data-driven permission check
--   can_view_project(id)        → owner OR assigned member OR the project's client
--   is_project_member(id)       → assigned engineer/architect
--   is_project_client(id)       → the client on that project
--   current_org_id()            → the caller's organisation
-- ============================================================================

-- Turn RLS on for everything. (Tables not listed default to owner-only via the
-- catch-all at the bottom.)
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename not in ('permissions')   -- global lookup, readable to all authed
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
  end loop;
end $$;

-- Permissions catalogue is world-readable to authenticated users (needed for UI gating).
alter table permissions enable row level security;
create policy perm_read on permissions for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Identity & org tables
-- ---------------------------------------------------------------------------
create policy org_read on organisations for select to authenticated
  using (id = public.current_org_id());
create policy org_write on organisations for all to authenticated
  using (id = public.current_org_id() and public.is_owner())
  with check (id = public.current_org_id() and public.is_owner());

create policy orgset_read on organisation_settings for select to authenticated
  using (organisation_id = public.current_org_id());
create policy orgset_write on organisation_settings for all to authenticated
  using (organisation_id = public.current_org_id() and public.is_owner())
  with check (organisation_id = public.current_org_id() and public.is_owner());

-- Profiles: you can read yourself and org-mates; only owner manages others.
create policy profiles_read on profiles for select to authenticated
  using (organisation_id = public.current_org_id());
create policy profiles_self_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_owner_all on profiles for all to authenticated
  using (organisation_id = public.current_org_id() and public.is_owner())
  with check (organisation_id = public.current_org_id() and public.is_owner());

-- Roles / grants: readable to all in org (for UI), writable by owner only.
create policy roles_read on roles for select to authenticated
  using (organisation_id = public.current_org_id());
create policy roles_owner on roles for all to authenticated
  using (organisation_id = public.current_org_id() and public.is_owner())
  with check (organisation_id = public.current_org_id() and public.is_owner());

create policy roleperm_read on role_permissions for select to authenticated using (true);
create policy roleperm_owner on role_permissions for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

create policy userroles_read on user_roles for select to authenticated
  using (profile_id = auth.uid() or public.is_owner());
create policy userroles_owner on user_roles for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- Projects & membership
-- ---------------------------------------------------------------------------
create policy projects_read on projects for select to authenticated
  using (organisation_id = public.current_org_id() and public.can_view_project(id));
create policy projects_owner_write on projects for all to authenticated
  using (organisation_id = public.current_org_id() and public.is_owner())
  with check (organisation_id = public.current_org_id() and public.is_owner());
-- Members may update only progress/current_stage on their projects (handled in
-- app + a narrower policy could be added; owner retains full control here).

create policy pm_read on project_members for select to authenticated
  using (public.is_owner() or profile_id = auth.uid() or public.is_project_member(project_id));
create policy pm_owner on project_members for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- Clients: owner full; a client can read only their own client row.
-- ---------------------------------------------------------------------------
create policy clients_owner on clients for all to authenticated
  using (organisation_id = public.current_org_id() and public.is_owner())
  with check (organisation_id = public.current_org_id() and public.is_owner());
create policy clients_self_read on clients for select to authenticated
  using (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- CRM: owner-only (engineers/architects/clients never touch leads).
-- ---------------------------------------------------------------------------
create policy leads_owner on leads for all to authenticated
  using (organisation_id = public.current_org_id() and public.is_owner())
  with check (organisation_id = public.current_org_id() and public.is_owner());
create policy leadact_owner on lead_activities for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy sitevisit_owner on site_visits for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- Project-scoped operational tables.
-- Pattern: owner + assigned members can read; clients read only client-visible
-- rows; writes are constrained per table.
-- ---------------------------------------------------------------------------

-- Stages
create policy stages_read on project_stages for select to authenticated
  using (public.is_owner() or public.is_project_member(project_id)
         or (public.is_project_client(project_id) and client_visible));
create policy stages_write on project_stages for all to authenticated
  using (public.is_owner() or public.is_project_member(project_id))
  with check (public.is_owner() or public.is_project_member(project_id));

-- Tasks (engineers/architects on the project; clients never see tasks)
create policy tasks_read on tasks for select to authenticated
  using (public.is_owner() or public.is_project_member(project_id));
create policy tasks_member_write on tasks for all to authenticated
  using (public.is_owner() or public.is_project_member(project_id))
  with check (public.is_owner() or public.is_project_member(project_id));

create policy taskcomments_rw on task_comments for all to authenticated
  using (exists (select 1 from tasks t where t.id = task_id and (public.is_owner() or public.is_project_member(t.project_id))))
  with check (exists (select 1 from tasks t where t.id = task_id and (public.is_owner() or public.is_project_member(t.project_id))));

-- Daily reports: engineer/owner read all on project; client sees only approved + client_visible.
create policy reports_read on daily_reports for select to authenticated
  using (public.is_owner() or public.is_project_member(project_id)
         or (public.is_project_client(project_id) and client_visible and status = 'approved'));
create policy reports_member_write on daily_reports for all to authenticated
  using (public.is_owner() or public.is_project_member(project_id))
  with check (public.is_owner() or public.is_project_member(project_id));

-- Report children inherit access from the parent report.
do $$
declare tbl text;
begin
  foreach tbl in array array['daily_report_work','daily_report_labour','daily_report_materials','daily_report_photos']
  loop
    execute format($f$
      create policy %1$s_rw on %1$s for all to authenticated
      using (exists (select 1 from daily_reports r where r.id = report_id
                     and (public.is_owner() or public.is_project_member(r.project_id))))
      with check (exists (select 1 from daily_reports r where r.id = report_id
                     and (public.is_owner() or public.is_project_member(r.project_id))));
    $f$, tbl);
  end loop;
end $$;

-- Documents: client sees only client_visible docs on their project.
create policy documents_read on documents for select to authenticated
  using (public.is_owner() or public.is_project_member(project_id)
         or (public.is_project_client(project_id) and client_visible));
create policy documents_member_write on documents for all to authenticated
  using (public.is_owner() or public.is_project_member(project_id))
  with check (public.is_owner() or public.is_project_member(project_id));

-- Drawings: members read; client reads when review required or approved.
create policy drawings_read on drawings for select to authenticated
  using (public.is_owner() or public.is_project_member(project_id)
         or (public.is_project_client(project_id)
             and status in ('client_review','approved','approved_for_construction')));
create policy drawings_member_write on drawings for all to authenticated
  using (public.is_owner() or public.is_project_member(project_id))
  with check (public.is_owner() or public.is_project_member(project_id));

-- Revisions: append-only. SELECT + INSERT only — NO update/delete policy exists,
-- so revision history can never be silently rewritten or removed.
create policy drawrev_read on drawing_revisions for select to authenticated
  using (exists (select 1 from drawings d where d.id = drawing_id
                 and (public.is_owner() or public.is_project_member(d.project_id)
                      or public.is_project_client(d.project_id))));
create policy drawrev_insert on drawing_revisions for insert to authenticated
  with check (exists (select 1 from drawings d where d.id = drawing_id
                 and (public.is_owner() or public.is_project_member(d.project_id))));

-- Client approvals: client can read + respond on their project.
create policy approvals_read on client_approvals for select to authenticated
  using (public.is_owner() or public.is_project_member(project_id)
         or (public.is_project_client(project_id) and status in ('sent_to_client','approved','changes_requested','revised')));
create policy approvals_owner_write on client_approvals for all to authenticated
  using (public.is_owner() or public.is_project_member(project_id))
  with check (public.is_owner() or public.is_project_member(project_id));
create policy approvals_client_update on client_approvals for update to authenticated
  using (public.is_project_client(project_id))
  with check (public.is_project_client(project_id));

-- Change requests: client raises + reads their own; owner manages.
create policy change_read on change_requests for select to authenticated
  using (public.is_owner() or public.is_project_member(project_id) or public.is_project_client(project_id));
create policy change_client_insert on change_requests for insert to authenticated
  with check (public.is_project_client(project_id));
create policy change_owner_write on change_requests for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

create policy variations_owner on variations for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- Procurement / suppliers / finance / labour / quality
-- Owner-only by default. The ONE exception: Site Engineers may create material
-- requests + attendance on their assigned projects, and read the material
-- catalogue (names/units, not owner cost columns — enforced by a masked view).
-- ---------------------------------------------------------------------------

-- Material catalogue: members can read (for requests); owner writes.
create policy matcat_read on material_catalogue for select to authenticated
  using (organisation_id = public.current_org_id());
create policy matcat_owner_write on material_catalogue for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- Suppliers & all supplier/rate tables: OWNER ONLY.
create policy suppliers_owner on suppliers for all to authenticated
  using (organisation_id = public.current_org_id() and public.is_owner())
  with check (organisation_id = public.current_org_id() and public.is_owner());
create policy suppmat_owner on supplier_materials for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy supprate_owner on supplier_rates for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy suppratehist_owner on supplier_rate_history for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- Project materials: members read (site view); owner writes cost columns.
create policy projmat_read on project_materials for select to authenticated
  using (public.is_owner() or public.is_project_member(project_id));
create policy projmat_owner_write on project_materials for all to authenticated
  using (public.is_owner() or public.is_project_member(project_id))
  with check (public.is_owner() or public.is_project_member(project_id));

-- Material requests: member creates + reads own project; owner manages.
create policy matreq_read on material_requests for select to authenticated
  using (public.is_owner() or public.is_project_member(project_id));
create policy matreq_member_insert on material_requests for insert to authenticated
  with check (public.is_project_member(project_id) or public.is_owner());
create policy matreq_owner_write on material_requests for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy matreqitem_rw on material_request_items for all to authenticated
  using (exists (select 1 from material_requests r where r.id = request_id
                 and (public.is_owner() or public.is_project_member(r.project_id))))
  with check (exists (select 1 from material_requests r where r.id = request_id
                 and (public.is_owner() or public.is_project_member(r.project_id))));

-- Purchases, receipts, inventory, bills: OWNER ONLY (receipts/inventory
-- readable to members for site stock visibility).
create policy purchases_owner on purchases for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy purchitems_owner on purchase_items for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy receipts_read on material_receipts for select to authenticated
  using (public.is_owner() or public.is_project_member(project_id));
create policy receipts_write on material_receipts for all to authenticated
  using (public.is_owner() or public.is_project_member(project_id))
  with check (public.is_owner() or public.is_project_member(project_id));
create policy invtxn_read on inventory_transactions for select to authenticated
  using (public.is_owner() or public.is_project_member(project_id));
create policy invtxn_write on inventory_transactions for all to authenticated
  using (public.is_owner() or public.is_project_member(project_id))
  with check (public.is_owner() or public.is_project_member(project_id));

-- Labour: engineers may INSERT attendance on their projects; owner sees/edits all.
create policy contractors_owner on labour_contractors for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy workers_owner on workers for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy attendance_read on labour_attendance for select to authenticated
  using (public.is_owner() or public.is_project_member(project_id));
create policy attendance_member_insert on labour_attendance for insert to authenticated
  with check (public.is_project_member(project_id) or public.is_owner());
create policy attendance_owner_write on labour_attendance for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy workorders_owner on work_orders for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy measurements_owner on measurements for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy contractorbills_owner on contractor_bills for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- Finance: OWNER ONLY, except a client may read their OWN payment schedule,
-- invoices, and receipts (their money, their project).
create policy paysched_owner on client_payment_schedules for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy paysched_client_read on client_payment_schedules for select to authenticated
  using (public.is_project_client(project_id));
create policy invoices_owner on client_invoices for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy invoices_client_read on client_invoices for select to authenticated
  using (public.is_project_client(project_id));
create policy receiptsc_owner on client_receipts for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy receiptsc_client_read on client_receipts for select to authenticated
  using (public.is_project_client(project_id));
create policy suppbills_owner on supplier_bills for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy expenses_owner on expenses for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy payments_owner on payments for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- Quality: members read + create inspections on their projects; client sees
-- only client_visible ones; owner manages templates.
create policy checklists_read on quality_checklists for select to authenticated
  using (organisation_id = public.current_org_id());
create policy checklists_owner on quality_checklists for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy inspections_read on inspections for select to authenticated
  using (public.is_owner() or public.is_project_member(project_id)
         or (public.is_project_client(project_id) and client_visible));
create policy inspections_member_write on inspections for all to authenticated
  using (public.is_owner() or public.is_project_member(project_id))
  with check (public.is_owner() or public.is_project_member(project_id));
create policy inspitems_rw on inspection_items for all to authenticated
  using (exists (select 1 from inspections i where i.id = inspection_id
                 and (public.is_owner() or public.is_project_member(i.project_id))))
  with check (exists (select 1 from inspections i where i.id = inspection_id
                 and (public.is_owner() or public.is_project_member(i.project_id))));

-- ---------------------------------------------------------------------------
-- Estimator / quotations / portfolio
-- ---------------------------------------------------------------------------
create policy estpkg_read on estimator_packages for select to authenticated
  using (organisation_id = public.current_org_id());
create policy estpkg_owner on estimator_packages for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy estrate_owner on estimator_rates for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy estratehist_owner on estimator_rate_history for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy estimates_owner on estimates for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy quotations_owner on quotations for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy quotations_client_read on quotations for select to authenticated
  using (exists (select 1 from clients c where c.id = quotations.client_id and c.profile_id = auth.uid()));
create policy quotver_owner on quotation_versions for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- Public portfolio: owner writes; authenticated may read (public read handled
-- server-side with the service context for anonymous website visitors).
create policy pubproj_read on public_projects for select to authenticated
  using (organisation_id = public.current_org_id());
create policy pubproj_owner on public_projects for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy gallery_read on project_gallery for select to authenticated using (true);
create policy gallery_owner on project_gallery for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- Cross-cutting: notifications, comments, attachments, audit, AI
-- ---------------------------------------------------------------------------
create policy notif_self on notifications for select to authenticated
  using (recipient_id = auth.uid());
create policy notif_self_update on notifications for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy notif_owner_insert on notifications for insert to authenticated
  with check (organisation_id = public.current_org_id());

create policy comments_read on comments for select to authenticated
  using (organisation_id = public.current_org_id()
         and (public.is_owner() or client_visible or created_by = auth.uid()));
create policy comments_write on comments for all to authenticated
  using (organisation_id = public.current_org_id() and (public.is_owner() or created_by = auth.uid()))
  with check (organisation_id = public.current_org_id());

create policy attach_read on attachments for select to authenticated
  using (organisation_id = public.current_org_id());
create policy attach_write on attachments for all to authenticated
  using (organisation_id = public.current_org_id())
  with check (organisation_id = public.current_org_id());

-- Audit: owner reads; INSERT via security-definer helper only (no direct writes).
create policy audit_owner_read on audit_logs for select to authenticated
  using (organisation_id = public.current_org_id() and public.is_owner());

-- AI logs: owner only.
create policy ai_req_owner on ai_requests for all to authenticated
  using (organisation_id = public.current_org_id() and public.is_owner())
  with check (organisation_id = public.current_org_id() and public.is_owner());
create policy ai_resp_owner on ai_responses for all to authenticated
  using (exists (select 1 from ai_requests r where r.id = request_id and public.is_owner()))
  with check (exists (select 1 from ai_requests r where r.id = request_id and public.is_owner()));
