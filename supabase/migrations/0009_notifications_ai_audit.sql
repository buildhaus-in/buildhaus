-- ============================================================================
-- Buildhaus · 0009 · Notifications, comments, attachments, audit, AI log
-- ============================================================================

create table notifications (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  recipient_id    uuid references profiles(id) on delete cascade,
  kind            notification_kind not null,
  title           text not null,
  body            text,
  link            text,                 -- in-app route to open
  project_id      uuid references projects(id) on delete set null,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);
create index idx_notif_recipient on notifications(recipient_id, is_read);

create table comments (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  entity_type     text not null,        -- 'project'|'drawing'|'task'|'report'|...
  entity_id       uuid not null,
  body            text not null,
  client_visible  boolean not null default false,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now()
);
create index idx_comments_entity on comments(entity_type, entity_id);

create table attachments (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  entity_type     text not null,
  entity_id       uuid not null,
  storage_path    text not null,
  mime_type       text,
  size_bytes      bigint,
  uploaded_by     uuid references profiles(id),
  created_at      timestamptz not null default now()
);
create index idx_attach_entity on attachments(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Audit log: append-only. Written by the log_audit() helper + triggers on the
-- highest-value tables. No UPDATE/DELETE policy is ever granted.
-- ---------------------------------------------------------------------------
create table audit_logs (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid,
  actor_id        uuid,
  action          text not null,        -- 'insert'|'update'|'delete'|'approve'|'login'|...
  entity_type     text not null,
  entity_id       uuid,
  summary         text,
  diff            jsonb,
  ip              text,
  created_at      timestamptz not null default now()
);
create index idx_audit_org on audit_logs(organisation_id, created_at desc);
create index idx_audit_entity on audit_logs(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- AI request/response log (Owner-only). Every Claude call is server-side and
-- recorded here so usage is auditable and never runs in the browser.
-- ---------------------------------------------------------------------------
create table ai_requests (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  requested_by    uuid references profiles(id),
  feature         text not null,        -- 'report_summary'|'client_update'|'draft_message'|...
  project_id      uuid references projects(id) on delete set null,
  prompt_excerpt  text,
  created_at      timestamptz not null default now()
);

create table ai_responses (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references ai_requests(id) on delete cascade,
  model           text,
  content         text,
  tokens_in       int,
  tokens_out      int,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Generic audit writer used by server code and triggers.
-- ---------------------------------------------------------------------------
create or replace function public.log_audit(
  p_action text, p_entity_type text, p_entity_id uuid,
  p_summary text default null, p_diff jsonb default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_logs(organisation_id, actor_id, action, entity_type, entity_id, summary, diff)
  values (public.current_org_id(), auth.uid(), p_action, p_entity_type, p_entity_id, p_summary, p_diff);
end;
$$;
