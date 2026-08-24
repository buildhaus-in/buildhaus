-- ============================================================================
-- Buildhaus · 0007 · Labour, finance, quality
-- ----------------------------------------------------------------------------
-- All finance tables are OWNER-ONLY. Site Engineers may INSERT labour
-- attendance but may not read contractor bills, payments, or profitability.
-- ============================================================================

-- ------------------------------ Labour -------------------------------------
create table labour_contractors (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  name            text not null,
  trade           text,
  phone           text,
  is_subcontractor boolean not null default false,
  notes           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_contractors_org on labour_contractors(organisation_id);
create trigger trg_contractors_updated before update on labour_contractors
  for each row execute function public.set_updated_at();

create table workers (
  id              uuid primary key default gen_random_uuid(),
  contractor_id   uuid references labour_contractors(id) on delete set null,
  name            text not null,
  trade           text,
  daily_wage      numeric(10,2),
  is_active       boolean not null default true
);

create table labour_attendance (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  attendance_date date not null default current_date,
  trade          text not null,
  contractor_id  uuid references labour_contractors(id) on delete set null,
  count          int not null default 0,
  daily_wage     numeric(10,2),
  entered_by     uuid references profiles(id),
  approved_by    uuid references profiles(id),
  created_at     timestamptz not null default now()
);
create index idx_attendance_project on labour_attendance(project_id);

create table work_orders (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  contractor_id  uuid references labour_contractors(id) on delete set null,
  title          text not null,
  scope          text,
  rate_type      text,     -- 'daily'|'piece'|'lumpsum'
  amount         numeric(14,2),
  status         text default 'open',
  created_at     timestamptz not null default now()
);

create table measurements (
  id             uuid primary key default gen_random_uuid(),
  work_order_id  uuid references work_orders(id) on delete cascade,
  project_id     uuid references projects(id) on delete cascade,
  description    text,
  quantity       numeric(14,2),
  unit           text,
  rate           numeric(12,2),
  amount         numeric(14,2),
  measured_by    uuid references profiles(id),
  created_at     timestamptz not null default now()
);

create table contractor_bills (
  id             uuid primary key default gen_random_uuid(),
  contractor_id  uuid references labour_contractors(id) on delete set null,
  project_id     uuid references projects(id) on delete cascade,
  bill_no        text,
  amount         numeric(14,2),
  advance        numeric(14,2) default 0,
  deduction      numeric(14,2) default 0,
  outstanding    numeric(14,2) default 0,
  bill_date      date default current_date,
  created_at     timestamptz not null default now()
);

-- ------------------------------ Finance ------------------------------------
create table client_payment_schedules (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  milestone      text not null,
  percent        numeric(5,2),
  amount         numeric(14,2),
  due_date       date,
  status         text default 'pending',   -- pending/invoiced/paid/overdue
  created_at     timestamptz not null default now()
);
create index idx_paysched_project on client_payment_schedules(project_id);

create table client_invoices (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  invoice_no     text,
  amount         numeric(14,2),
  invoice_date   date default current_date,
  due_date       date,
  status         text default 'unpaid',
  created_at     timestamptz not null default now()
);

create table client_receipts (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  invoice_id     uuid references client_invoices(id) on delete set null,
  amount         numeric(14,2),
  received_on    date default current_date,
  mode           text,
  created_at     timestamptz not null default now()
);

create table supplier_bills (
  id             uuid primary key default gen_random_uuid(),
  supplier_id    uuid references suppliers(id) on delete set null,
  purchase_id    uuid references purchases(id) on delete set null,
  project_id     uuid references projects(id) on delete cascade,
  bill_no        text,
  amount         numeric(14,2),
  outstanding    numeric(14,2) default 0,
  bill_date      date default current_date,
  created_at     timestamptz not null default now()
);

create table expenses (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid references projects(id) on delete cascade,
  organisation_id uuid not null references organisations(id) on delete cascade,
  expense_date   date not null default current_date,
  category       text,
  description    text,
  amount         numeric(14,2) not null,
  vendor         text,
  payment_mode   text,
  bill_path      text,
  notes          text,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now()
);
create index idx_expenses_project on expenses(project_id);

-- Unified money movements (client receipts, supplier/labour payouts).
create table payments (
  id             uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  project_id     uuid references projects(id) on delete cascade,
  direction      payment_direction not null,
  party_type     text,       -- 'client'|'supplier'|'labour'|'other'
  party_id       uuid,
  amount         numeric(14,2) not null,
  paid_on        date not null default current_date,
  mode           text,
  reference      text,
  notes          text,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now()
);
create index idx_payments_project on payments(project_id);
create index idx_payments_direction on payments(direction);

-- ------------------------------ Quality ------------------------------------
create table quality_checklists (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  name            text not null,          -- 'Column Steel', 'Slab Steel', ...
  items           jsonb not null default '[]'::jsonb,   -- [{label, required}]
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table inspections (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  checklist_id    uuid references quality_checklists(id) on delete set null,
  stage           text,
  floor           text,
  inspection_date date default current_date,
  engineer_id     uuid references profiles(id),
  result          text,
  observation     text,
  corrective_action text,
  due_date        date,
  status          inspection_status not null default 'pending',
  client_visible  boolean not null default false,
  reviewed_by     uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_inspections_project on inspections(project_id);
create trigger trg_inspections_updated before update on inspections
  for each row execute function public.set_updated_at();

create table inspection_items (
  id             uuid primary key default gen_random_uuid(),
  inspection_id  uuid not null references inspections(id) on delete cascade,
  label          text not null,
  passed         boolean,
  remark         text
);
