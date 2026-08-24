-- ============================================================================
-- Buildhaus · 0003 · Projects, membership, clients, and CRM
-- ----------------------------------------------------------------------------
-- `project_members` is the spine of access control: Site Engineers and
-- Architects see ONLY the projects they are members of; Clients see only the
-- project their client record is linked to. Owner sees all (scope='all').
-- ============================================================================

create table clients (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references organisations(id) on delete cascade,
  profile_id       uuid references profiles(id) on delete set null,  -- set once client gets a login
  full_name        text not null,
  phone            text,
  whatsapp         text,
  email            text,
  address          text,
  city             text,
  state            text,
  notes            text,
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index idx_clients_org on clients(organisation_id);
create index idx_clients_profile on clients(profile_id);
create trigger trg_clients_updated before update on clients
  for each row execute function public.set_updated_at();

create table projects (
  id                   uuid primary key default gen_random_uuid(),
  organisation_id      uuid not null references organisations(id) on delete cascade,
  code                 text not null,                 -- e.g. BH-2026-014
  name                 text not null,
  client_id            uuid references clients(id) on delete set null,
  site_address         text,
  gps_lat              numeric(10,6),
  gps_lng              numeric(10,6),
  project_type         text,                          -- house/villa/duplex/...
  plot_area_sqft       numeric(12,2),
  builtup_area_sqft    numeric(12,2),
  floors               int,
  package              text,
  contract_value       numeric(14,2),                 -- OWNER-ONLY via RLS column-masking view
  estimated_cost       numeric(14,2),                 -- OWNER-ONLY
  start_date           date,
  planned_completion   date,
  actual_completion    date,
  status               project_status not null default 'lead_converted',
  progress             int not null default 0 check (progress between 0 and 100),
  current_stage        text,
  risk_level           text default 'low',            -- low/medium/high
  client_visible_progress int default 0 check (client_visible_progress between 0 and 100),
  cover_photo_url      text,
  created_by           uuid references profiles(id),
  updated_by           uuid references profiles(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz,
  unique (organisation_id, code)
);
create index idx_projects_org on projects(organisation_id);
create index idx_projects_client on projects(client_id);
create index idx_projects_status on projects(status);
create trigger trg_projects_updated before update on projects
  for each row execute function public.set_updated_at();

-- Who is assigned to a project, and in what capacity.
create table project_members (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  profile_id   uuid not null references profiles(id) on delete cascade,
  role_key     text not null,        -- 'site_engineer' | 'architect' | ... future roles
  assigned_by  uuid references profiles(id),
  assigned_at  timestamptz not null default now(),
  unique (project_id, profile_id, role_key)
);
create index idx_pm_project on project_members(project_id);
create index idx_pm_profile on project_members(profile_id);

-- Fast membership check used by RLS on every project-scoped table.
create or replace function public.is_project_member(p_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id and profile_id = auth.uid()
  );
$$;

-- Is the current user the client on this project?
create or replace function public.is_project_client(p_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from projects pr
    join clients c on c.id = pr.client_id
    where pr.id = p_project_id and c.profile_id = auth.uid()
  );
$$;

-- One predicate to rule them all: can the current user see this project at all?
create or replace function public.can_view_project(p_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_owner()
      or public.is_project_member(p_project_id)
      or public.is_project_client(p_project_id);
$$;

-- ---------------------------------------------------------------------------
-- CRM: leads and activity trail
-- ---------------------------------------------------------------------------
create table leads (
  id                 uuid primary key default gen_random_uuid(),
  organisation_id    uuid not null references organisations(id) on delete cascade,
  lead_no            text not null,
  customer_name      text not null,
  phone              text,
  email              text,
  whatsapp           text,
  site_location      text,
  city               text,
  state              text,
  plot_size          text,
  builtup_area_sqft  numeric(12,2),
  floors             int,
  building_type      text,
  budget             numeric(14,2),
  preferred_package  text,
  expected_start     date,
  source             text,                    -- website/referral/walk-in/...
  requirement        text,
  followup_date      date,
  probability        int check (probability between 0 and 100),
  estimated_value    numeric(14,2),
  notes              text,
  stage              lead_stage not null default 'new_enquiry',
  lost_reason        text,
  client_id          uuid references clients(id) on delete set null, -- set on 'won'
  project_id         uuid references projects(id) on delete set null,
  created_by         uuid references profiles(id),
  last_activity_at   timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  unique (organisation_id, lead_no)
);
create index idx_leads_org on leads(organisation_id);
create index idx_leads_stage on leads(stage);
create index idx_leads_followup on leads(followup_date);
create trigger trg_leads_updated before update on leads
  for each row execute function public.set_updated_at();

create table lead_activities (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads(id) on delete cascade,
  kind        text not null,          -- 'call','meeting','site_visit','note','estimate','quotation','stage_change'
  summary     text,
  detail      text,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);
create index idx_lead_act_lead on lead_activities(lead_id);

create table site_visits (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references leads(id) on delete cascade,
  project_id    uuid references projects(id) on delete cascade,
  scheduled_at  timestamptz,
  completed_at  timestamptz,
  visited_by    uuid references profiles(id),
  notes         text,
  created_at    timestamptz not null default now()
);
