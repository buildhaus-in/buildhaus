-- ============================================================================
-- Buildhaus · 0006 · Materials, procurement, suppliers, inventory
-- ----------------------------------------------------------------------------
-- Suppliers are OWNER-ONLY (no supplier login in the MVP). RLS makes every
-- table in this file invisible to engineers/architects/clients except the
-- narrow slice a Site Engineer needs (raising a material request).
-- ============================================================================

create table material_catalogue (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references organisations(id) on delete cascade,
  name             text not null,
  category         text,
  brand            text,
  specification    text,
  unit             text,
  current_rate     numeric(12,2),
  previous_rate    numeric(12,2),
  preferred_supplier_id uuid,       -- FK added after suppliers table exists
  notes            text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_matcat_org on material_catalogue(organisation_id);
create trigger trg_matcat_updated before update on material_catalogue
  for each row execute function public.set_updated_at();

create table suppliers (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references organisations(id) on delete cascade,
  code             text,
  business_name    text not null,
  contact_person   text,
  mobile           text,
  whatsapp         text,
  email            text,
  address          text,
  gst_number       text,
  pan              text,
  bank_info        text,           -- OWNER-ONLY; never exposed via any non-owner view
  credit_terms     text,
  delivery_days    int,
  rating           numeric(2,1),
  notes            text,
  is_active        boolean not null default true,
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index idx_suppliers_org on suppliers(organisation_id);
create trigger trg_suppliers_updated before update on suppliers
  for each row execute function public.set_updated_at();

alter table material_catalogue
  add constraint fk_matcat_supplier
  foreign key (preferred_supplier_id) references suppliers(id) on delete set null;

create table supplier_materials (
  supplier_id  uuid not null references suppliers(id) on delete cascade,
  material_id  uuid not null references material_catalogue(id) on delete cascade,
  brand        text,
  primary key (supplier_id, material_id)
);

create table supplier_rates (
  id           uuid primary key default gen_random_uuid(),
  supplier_id  uuid not null references suppliers(id) on delete cascade,
  material_id  uuid references material_catalogue(id) on delete set null,
  rate         numeric(12,2) not null,
  effective_from date not null default current_date,
  is_active    boolean not null default true,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);
create index idx_supplier_rates_supplier on supplier_rates(supplier_id);

create table supplier_rate_history (
  id           uuid primary key default gen_random_uuid(),
  supplier_id  uuid not null references suppliers(id) on delete cascade,
  material_id  uuid references material_catalogue(id) on delete set null,
  old_rate     numeric(12,2),
  new_rate     numeric(12,2),
  changed_by   uuid references profiles(id),
  changed_at   timestamptz not null default now()
);

-- Per-project material planning / tracking
create table project_materials (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  material_id    uuid references material_catalogue(id) on delete set null,
  name           text not null,
  unit           text,
  boq_qty        numeric(14,2) default 0,
  required_qty   numeric(14,2) default 0,
  ordered_qty    numeric(14,2) default 0,
  received_qty   numeric(14,2) default 0,
  consumed_qty   numeric(14,2) default 0,
  wasted_qty     numeric(14,2) default 0,
  returned_qty   numeric(14,2) default 0,
  estimated_cost numeric(14,2) default 0,   -- OWNER-ONLY column
  actual_cost    numeric(14,2) default 0,   -- OWNER-ONLY column
  updated_at     timestamptz not null default now()
);
create index idx_projmat_project on project_materials(project_id);
create trigger trg_projmat_updated before update on project_materials
  for each row execute function public.set_updated_at();

create table material_requests (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  requested_by   uuid references profiles(id),
  required_date  date,
  priority       text default 'medium',
  status         material_request_status not null default 'requested',
  notes          text,
  owner_notes    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_matreq_project on material_requests(project_id);
create trigger trg_matreq_updated before update on material_requests
  for each row execute function public.set_updated_at();

create table material_request_items (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid not null references material_requests(id) on delete cascade,
  material_id    uuid references material_catalogue(id) on delete set null,
  name           text not null,
  specification  text,
  brand          text,
  quantity       numeric(14,2),
  unit           text,
  site_stock     numeric(14,2),
  activity       text
);

create table purchases (
  id             uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  project_id     uuid references projects(id) on delete set null,
  supplier_id    uuid references suppliers(id) on delete set null,
  request_id     uuid references material_requests(id) on delete set null,
  po_number      text,
  status         purchase_status not null default 'draft',
  transport      numeric(12,2) default 0,
  tax            numeric(12,2) default 0,
  total          numeric(14,2) default 0,
  expected_delivery date,
  payment_terms  text,
  notes          text,
  approved_by    uuid references profiles(id),
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_purchases_org on purchases(organisation_id);
create trigger trg_purchases_updated before update on purchases
  for each row execute function public.set_updated_at();

create table purchase_items (
  id           uuid primary key default gen_random_uuid(),
  purchase_id  uuid not null references purchases(id) on delete cascade,
  material_id  uuid references material_catalogue(id) on delete set null,
  name         text not null,
  quantity     numeric(14,2),
  unit         text,
  rate         numeric(12,2),
  landed_rate  numeric(12,2)
);

create table material_receipts (
  id           uuid primary key default gen_random_uuid(),
  purchase_id  uuid references purchases(id) on delete set null,
  project_id   uuid references projects(id) on delete cascade,
  material_id  uuid references material_catalogue(id) on delete set null,
  name         text,
  quantity     numeric(14,2),
  unit         text,
  received_at  date not null default current_date,
  received_by  uuid references profiles(id),
  created_at   timestamptz not null default now()
);

create table inventory_transactions (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  material_id  uuid references material_catalogue(id) on delete set null,
  name         text,
  kind         text not null,   -- 'received'|'consumed'|'wasted'|'returned'|'adjustment'
  quantity     numeric(14,2),
  unit         text,
  ref_report   uuid references daily_reports(id) on delete set null,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now()
);
create index idx_invtxn_project on inventory_transactions(project_id);
