-- ============================================================================
-- Buildhaus · 0008 · Estimator, quotations, public portfolio
-- ----------------------------------------------------------------------------
-- Estimator rates are Owner-configured DATA (never hardcoded in frontend).
-- Rate history is preserved with effective dates so old estimates stay
-- reproducible.
-- ============================================================================

create table estimator_packages (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  name            text not null,          -- 'Essential','Premium','Luxury'
  building_type   text,
  base_rate_sqft  numeric(10,2),          -- ₹/sqft baseline
  inclusions      jsonb default '[]'::jsonb,
  exclusions      jsonb default '[]'::jsonb,
  specifications  jsonb default '{}'::jsonb,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_estpkg_org on estimator_packages(organisation_id);
create trigger trg_estpkg_updated before update on estimator_packages
  for each row execute function public.set_updated_at();

-- Every configurable rate/allowance/adjustment is a keyed row. Adding a new
-- cost driver is an INSERT, not a code change.
create table estimator_rates (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  key             text not null,          -- 'cement_rate','labour_pct','lift_cost','city_adj.nellore', ...
  label           text not null,
  city            text,
  state           text,
  building_type   text,
  package         text,
  value           numeric(14,4) not null,
  unit            text,                    -- '₹/bag','%','₹','₹/sqft'
  effective_from  date not null default current_date,
  is_active       boolean not null default true,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now()
);
create index idx_estrate_org_key on estimator_rates(organisation_id, key);

create table estimator_rate_history (
  id              uuid primary key default gen_random_uuid(),
  rate_id         uuid references estimator_rates(id) on delete set null,
  key             text,
  old_value       numeric(14,4),
  new_value       numeric(14,4),
  changed_by      uuid references profiles(id),
  changed_at      timestamptz not null default now()
);

-- Saved estimates (from public estimator or Owner console).
create table estimates (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  lead_id         uuid references leads(id) on delete set null,
  customer_name   text,
  phone           text,
  email           text,
  city            text,
  state           text,
  building_type   text,
  package         text,
  builtup_area_sqft numeric(12,2),
  floors          int,
  inputs          jsonb not null default '{}'::jsonb,   -- full form snapshot
  total_cost      numeric(14,2),
  cost_per_sqft   numeric(10,2),
  breakdown       jsonb not null default '{}'::jsonb,   -- {material, labour, ...}
  timeline_weeks  int,
  created_at      timestamptz not null default now()
);
create index idx_estimates_org on estimates(organisation_id);

create table quotations (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  quotation_no    text not null,
  client_id       uuid references clients(id) on delete set null,
  lead_id         uuid references leads(id) on delete set null,
  project_id      uuid references projects(id) on delete set null,
  kind            text default 'detailed',   -- preliminary/detailed/package/boq/revised/variation
  status          quotation_status not null default 'draft',
  current_version int not null default 1,
  valid_until     date,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organisation_id, quotation_no)
);
create index idx_quotations_org on quotations(organisation_id);
create trigger trg_quotations_updated before update on quotations
  for each row execute function public.set_updated_at();

create table quotation_versions (
  id              uuid primary key default gen_random_uuid(),
  quotation_id    uuid not null references quotations(id) on delete cascade,
  version         int not null,
  project_type    text,
  plot_area_sqft  numeric(12,2),
  builtup_area_sqft numeric(12,2),
  floors          int,
  package         text,
  cost_per_sqft   numeric(10,2),
  total_cost      numeric(14,2),
  material_cost   numeric(14,2),
  labour_cost     numeric(14,2),
  design_cost     numeric(14,2),
  taxes           numeric(14,2),
  optional_items  jsonb default '[]'::jsonb,
  payment_schedule jsonb default '[]'::jsonb,
  timeline        text,
  specifications  jsonb default '{}'::jsonb,
  inclusions      jsonb default '[]'::jsonb,
  exclusions      jsonb default '[]'::jsonb,
  terms           text,
  notes           text,
  created_at      timestamptz not null default now(),
  unique (quotation_id, version)
);

-- ---------------------------------------------------------------------------
-- Public portfolio (only rows with is_public = true reach the website)
-- ---------------------------------------------------------------------------
create table public_projects (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  name            text not null,
  location        text,
  city            text,
  project_type    text,
  plot_area_sqft  numeric(12,2),
  builtup_area_sqft numeric(12,2),
  floors          int,
  completion_year int,
  approx_cost     numeric(14,2),
  cost_per_sqft   numeric(10,2),
  duration_months int,
  materials_used  text,
  package         text,
  description     text,
  cover_photo_url text,
  testimonial     text,
  is_public       boolean not null default false,
  is_featured     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_pubproj_public on public_projects(is_public);
create trigger trg_pubproj_updated before update on public_projects
  for each row execute function public.set_updated_at();

create table project_gallery (
  id              uuid primary key default gen_random_uuid(),
  public_project_id uuid not null references public_projects(id) on delete cascade,
  storage_path    text not null,
  caption         text,
  kind            text default 'gallery',   -- 'gallery'|'before'|'after'
  sort_order      int default 0
);
