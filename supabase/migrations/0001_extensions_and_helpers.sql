-- ============================================================================
-- Buildhaus · 0001 · Extensions, enums, and shared helpers
-- ----------------------------------------------------------------------------
-- Everything downstream depends on this file. It sets up UUID generation,
-- a reusable updated_at trigger, and the enum types used across the schema.
-- ============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";        -- fuzzy search on names

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at fresh on every UPDATE.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enums. Kept as Postgres enums for the values that are truly fixed by the
-- construction domain. Anything the Owner must configure at runtime (rates,
-- packages, roles-beyond-the-core-four) lives in TABLES, never enums.
-- ---------------------------------------------------------------------------

create type lead_stage as enum (
  'new_enquiry','contacted','requirement_collected','site_visit_scheduled',
  'site_visit_completed','estimate_shared','design_discussion','quotation_prepared',
  'quotation_sent','negotiation','won','lost','on_hold'
);

create type project_status as enum (
  'lead_converted','design_stage','approval_stage','pre_construction','mobilisation',
  'under_construction','finishing','snagging','handover','completed','on_hold','cancelled'
);

create type stage_status as enum (
  'not_started','in_progress','completed','delayed','on_hold'
);

create type task_status as enum (
  'draft','assigned','in_progress','blocked','submitted','approved','returned',
  'completed','cancelled'
);

create type report_status as enum (
  'draft','submitted','owner_review','approved','returned'
);

create type drawing_status as enum (
  'draft','submitted','owner_review','client_review','approved',
  'approved_for_construction','superseded'
);

create type drawing_discipline as enum (
  'architectural','structural','electrical','plumbing','interior','elevation',
  'landscape','shop_drawing','as_built'
);

create type approval_status as enum (
  'prepared','owner_review','sent_to_client','approved','changes_requested','revised'
);

create type change_request_status as enum (
  'submitted','under_review','cost_time_shared','client_approved','work_scheduled',
  'completed','rejected','cancelled'
);

create type quotation_status as enum (
  'draft','sent','under_negotiation','accepted','rejected','expired'
);

create type material_request_status as enum (
  'requested','owner_review','rate_entry','approved','purchased','delivered','closed','rejected'
);

create type purchase_status as enum (
  'draft','approved','ordered','partially_received','received','cancelled'
);

create type inspection_status as enum (
  'pending','passed','passed_with_observation','failed','correction_pending','closed'
);

create type payment_direction as enum ('inbound','outbound');   -- client receipt vs. supplier/labour payout

create type notification_kind as enum (
  'new_enquiry','followup_due','report_submitted','report_returned','task_overdue',
  'material_request','material_shortage','drawing_submitted','drawing_revision',
  'client_approval_pending','client_payment_due','supplier_payment_due',
  'labour_payment_due','quality_issue','change_request','project_milestone'
);
