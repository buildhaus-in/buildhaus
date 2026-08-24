-- ============================================================================
-- Buildhaus · 0002 · Organisations, profiles, and role-based access control
-- ----------------------------------------------------------------------------
-- The RBAC engine is data-driven on purpose. The MVP ships four roles
-- (owner, site_engineer, architect, client) but the tables below let the Owner
-- add the ~10 future internal roles WITHOUT a schema migration: insert a row in
-- `roles`, grant it rows in `role_permissions`, done. No enum, no redeploy.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Organisations  (multi-tenant seam; MVP runs a single org: Buildhaus)
-- ---------------------------------------------------------------------------
create table organisations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  legal_name    text,
  gst_number    text,
  phone         text,
  email         text,
  address       text,
  city          text,
  state         text,
  logo_url      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_org_updated before update on organisations
  for each row execute function public.set_updated_at();

create table organisation_settings (
  organisation_id  uuid primary key references organisations(id) on delete cascade,
  currency         text not null default 'INR',
  timezone         text not null default 'Asia/Kolkata',
  date_format      text not null default 'DD-MM-YYYY',
  area_unit        text not null default 'sqft',
  estimator_disclaimer text not null default
    'This is an indicative estimate based on the information provided. Final cost will be confirmed after site inspection, soil conditions, drawings, specifications, local rates and detailed BOQ preparation.',
  updated_at       timestamptz not null default now()
);
create trigger trg_org_settings_updated before update on organisation_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profiles  (one row per Supabase auth user)
-- ---------------------------------------------------------------------------
create table profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  organisation_id  uuid not null references organisations(id) on delete cascade,
  full_name        text not null,
  phone            text,
  whatsapp         text,
  avatar_url       text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_profiles_org on profiles(organisation_id);
create trigger trg_profiles_updated before update on profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Roles / permissions / grants
-- ---------------------------------------------------------------------------
create table roles (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references organisations(id) on delete cascade,
  key              text not null,              -- 'owner','site_engineer','architect','client', future: 'accounts', etc.
  label            text not null,
  is_system        boolean not null default false,   -- system roles can't be deleted
  scope            text not null default 'assigned',  -- 'all' (owner) | 'assigned' (engineer/architect) | 'own' (client) | 'public'
  created_at       timestamptz not null default now(),
  unique (organisation_id, key)
);

-- Permissions are string keys like 'projects.read', 'finance.read', 'reports.approve'.
create table permissions (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,          -- 'module.action'
  module      text not null,                 -- 'projects','finance','drawings', ...
  action      text not null,                 -- 'read','create','update','delete','approve'
  description text
);

create table role_permissions (
  role_id       uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- A profile can hold multiple roles (future-proofing for combined internal duties).
create table user_roles (
  profile_id  uuid not null references profiles(id) on delete cascade,
  role_id     uuid not null references roles(id) on delete cascade,
  primary key (profile_id, role_id)
);
create index idx_user_roles_profile on user_roles(profile_id);

-- ---------------------------------------------------------------------------
-- Security-definer helpers used everywhere by RLS. They read the CURRENT user's
-- org / roles / permissions. SECURITY DEFINER so RLS on the underlying tables
-- doesn't recurse.
-- ---------------------------------------------------------------------------
create or replace function public.current_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organisation_id from profiles where id = auth.uid();
$$;

create or replace function public.has_permission(perm_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from user_roles ur
    join role_permissions rp on rp.role_id = ur.role_id
    join permissions p on p.id = rp.permission_id
    where ur.profile_id = auth.uid()
      and p.key = perm_key
  );
$$;

create or replace function public.has_role(role_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles ur
    join roles r on r.id = ur.role_id
    where ur.profile_id = auth.uid() and r.key = role_key
  );
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('owner');
$$;
