-- ============================================================================
-- Buildhaus · 0011 · Business functions, triggers, storage
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Auto-provision a profile when a Supabase auth user is created. The
-- organisation + roles are attached by the Owner afterwards (invite flow),
-- but this guarantees a profile row always exists.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  default_org uuid;
begin
  select id into default_org from organisations order by created_at limit 1;
  if default_org is not null then
    insert into public.profiles (id, organisation_id, full_name)
    values (new.id, default_org, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Sequence-based, human-readable codes (per org, per year).
-- ---------------------------------------------------------------------------
create table if not exists code_counters (
  organisation_id uuid not null,
  scope           text not null,     -- 'lead'|'project'|'quotation'|'po'
  year            int not null,
  last_no         int not null default 0,
  primary key (organisation_id, scope, year)
);
alter table code_counters enable row level security;
create policy codecounter_owner on code_counters for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

create or replace function public.next_code(p_org uuid, p_scope text, p_prefix text)
returns text language plpgsql security definer set search_path = public as $$
declare y int := extract(year from now()); n int;
begin
  insert into code_counters(organisation_id, scope, year, last_no)
  values (p_org, p_scope, y, 1)
  on conflict (organisation_id, scope, year)
    do update set last_no = code_counters.last_no + 1
  returning last_no into n;
  return format('%s-%s-%s', p_prefix, y, lpad(n::text, 4, '0'));
end;
$$;

-- ---------------------------------------------------------------------------
-- Convert a won lead into client + project + standard stages, atomically.
-- Called from a server action after the Owner marks a lead 'won'.
-- ---------------------------------------------------------------------------
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
    insert into clients(organisation_id, full_name, phone, whatsapp, email, city, state, created_by)
    values (v_org, l.customer_name, l.phone, l.whatsapp, l.email, l.city, l.state, auth.uid())
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

-- ---------------------------------------------------------------------------
-- Lightweight audit triggers on the highest-value tables.
-- ---------------------------------------------------------------------------
create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
declare eid uuid;
begin
  eid := coalesce((case when tg_op='DELETE' then old.id else new.id end), null);
  insert into audit_logs(organisation_id, actor_id, action, entity_type, entity_id, summary)
  values (public.current_org_id(), auth.uid(), lower(tg_op), tg_table_name, eid,
          format('%s on %s', tg_op, tg_table_name));
  return case when tg_op='DELETE' then old else new end;
end;
$$;

do $$
declare tbl text;
begin
  foreach tbl in array array['projects','payments','expenses','quotations','drawings',
                             'daily_reports','client_approvals','purchases','suppliers','inspections']
  loop
    execute format('create trigger trg_audit_%1$s after insert or update or delete on %1$s
                    for each row execute function public.audit_row();', tbl);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage buckets (private). Signed URLs only; no public bucket for project data.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('project-files','project-files', false),
  ('drawings','drawings', false),
  ('site-photos','site-photos', false),
  ('documents','documents', false)
on conflict (id) do nothing;

-- Public marketing bucket for the website portfolio images only.
insert into storage.buckets (id, name, public) values ('public-portfolio','public-portfolio', true)
on conflict (id) do nothing;

-- Authenticated users may read/write private buckets; RLS on the row tables +
-- signed URLs govern who can actually reach a given file path. (Path convention:
-- {bucket}/{project_id}/... — server checks project access before signing.)
create policy "authed read private" on storage.objects for select to authenticated
  using (bucket_id in ('project-files','drawings','site-photos','documents'));
create policy "authed write private" on storage.objects for insert to authenticated
  with check (bucket_id in ('project-files','drawings','site-photos','documents'));
create policy "public read portfolio" on storage.objects for select to public
  using (bucket_id = 'public-portfolio');
create policy "owner write portfolio" on storage.objects for insert to authenticated
  with check (bucket_id = 'public-portfolio' and public.is_owner());
