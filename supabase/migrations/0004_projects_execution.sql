-- ============================================================================
-- Buildhaus · 0004 · Execution: stages, tasks, daily site reports
-- ============================================================================

create table project_stages (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references projects(id) on delete cascade,
  seq                int not null,               -- 1..25 standard construction stages
  name               text not null,
  planned_start      date,
  planned_finish     date,
  actual_start       date,
  actual_finish      date,
  progress           int not null default 0 check (progress between 0 and 100),
  assigned_to        uuid references profiles(id),
  status             stage_status not null default 'not_started',
  delay_days         int default 0,
  delay_reason       text,
  client_visible     boolean not null default true,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (project_id, seq)
);
create index idx_stages_project on project_stages(project_id);
create trigger trg_stages_updated before update on project_stages
  for each row execute function public.set_updated_at();

create table tasks (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references projects(id) on delete cascade,
  stage_id         uuid references project_stages(id) on delete set null,
  floor            text,
  zone             text,
  title            text not null,
  description      text,
  site_engineer_id uuid references profiles(id),
  architect_id     uuid references profiles(id),
  priority         text default 'medium',        -- low/medium/high
  start_date       date,
  due_date         date,
  status           task_status not null default 'assigned',
  progress         int not null default 0 check (progress between 0 and 100),
  dimensions       text,
  drawing_ref      text,
  checklist        jsonb default '[]'::jsonb,     -- [{item, done}]
  notes            text,
  owner_review     text,                          -- 'approved'|'returned'|null
  rejection_reason text,
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index idx_tasks_project on tasks(project_id);
create index idx_tasks_engineer on tasks(site_engineer_id);
create index idx_tasks_status on tasks(status);
create trigger trg_tasks_updated before update on tasks
  for each row execute function public.set_updated_at();

create table task_comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  body        text not null,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Daily site reports  (header + normalised children)
-- ---------------------------------------------------------------------------
create table daily_reports (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references projects(id) on delete cascade,
  report_date        date not null,
  engineer_id        uuid references profiles(id),
  weather            text,
  stage              text,
  floor              text,
  zone               text,
  work_summary       text,
  machinery_used     text,
  quality_checks     text,
  site_issues        text,
  delay_reason       text,
  safety_notes       text,
  client_instructions text,
  tomorrow_plan      text,
  notes              text,
  gps_lat            numeric(10,6),
  gps_lng            numeric(10,6),
  status             report_status not null default 'draft',
  client_visible     boolean not null default false,   -- Owner chooses what the client sees
  submitted_at       timestamptz,
  reviewed_by        uuid references profiles(id),
  reviewed_at        timestamptz,
  return_reason      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (project_id, report_date, engineer_id)
);
create index idx_reports_project on daily_reports(project_id);
create index idx_reports_status on daily_reports(status);
create trigger trg_reports_updated before update on daily_reports
  for each row execute function public.set_updated_at();

create table daily_report_work (
  id             uuid primary key default gen_random_uuid(),
  report_id      uuid not null references daily_reports(id) on delete cascade,
  description    text not null,
  quantity       numeric(12,2),
  unit           text
);

create table daily_report_labour (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references daily_reports(id) on delete cascade,
  trade       text not null,        -- mason/helper/carpenter/...
  count       int not null default 0
);

create table daily_report_materials (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid not null references daily_reports(id) on delete cascade,
  material     text not null,
  direction    text not null default 'consumed',  -- 'received' | 'consumed'
  quantity     numeric(12,2),
  unit         text
);

create table daily_report_photos (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references daily_reports(id) on delete cascade,
  storage_path text not null,
  caption     text,
  created_at  timestamptz not null default now()
);
