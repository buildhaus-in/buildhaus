-- ============================================================================
-- Buildhaus · 0005 · Documents, drawings, approvals, change requests
-- ----------------------------------------------------------------------------
-- Revision history is append-only by policy: RLS forbids deleting revisions,
-- and superseding a drawing sets status rather than removing rows.
-- ============================================================================

create table documents (
  id             uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  project_id     uuid references projects(id) on delete cascade,
  title          text not null,
  category       text,
  storage_path   text not null,
  mime_type      text,
  size_bytes     bigint,
  client_visible boolean not null default false,
  uploaded_by    uuid references profiles(id),
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index idx_documents_project on documents(project_id);

create table drawings (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  drawing_no     text not null,
  title          text not null,
  discipline     drawing_discipline not null,
  floor          text,
  current_revision int not null default 0,
  status         drawing_status not null default 'draft',
  client_review_required boolean not null default false,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (project_id, drawing_no)
);
create index idx_drawings_project on drawings(project_id);
create trigger trg_drawings_updated before update on drawings
  for each row execute function public.set_updated_at();

create table drawing_revisions (
  id             uuid primary key default gen_random_uuid(),
  drawing_id     uuid not null references drawings(id) on delete cascade,
  revision       int not null,
  storage_path   text not null,
  status         drawing_status not null default 'draft',
  issue_date     date,
  notes          text,
  uploaded_by    uuid references profiles(id),
  reviewed_by    uuid references profiles(id),
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  unique (drawing_id, revision)
);
create index idx_drawing_rev_drawing on drawing_revisions(drawing_id);

create table client_approvals (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  title          text not null,
  category       text,                 -- floor_plan/elevation/tiles/...
  detail         text,
  reference_path text,
  status         approval_status not null default 'prepared',
  client_response text,
  history        jsonb default '[]'::jsonb,   -- append-only audit of state changes
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_approvals_project on client_approvals(project_id);
create trigger trg_approvals_updated before update on client_approvals
  for each row execute function public.set_updated_at();

create table change_requests (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  title           text not null,
  description     text,
  reference_path  text,
  drawing_ref     text,
  owner_response  text,
  cost_impact     numeric(14,2),
  timeline_impact_days int,
  quotation_ref   text,
  client_approved boolean,
  payment_status  text,
  status          change_request_status not null default 'submitted',
  raised_by       uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_change_req_project on change_requests(project_id);
create trigger trg_change_req_updated before update on change_requests
  for each row execute function public.set_updated_at();

create table variations (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  change_request_id uuid references change_requests(id) on delete set null,
  description     text,
  amount          numeric(14,2),
  approved        boolean default false,
  created_at      timestamptz not null default now()
);
