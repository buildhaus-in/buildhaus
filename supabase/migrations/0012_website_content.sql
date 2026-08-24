-- ============================================================================
-- Buildhaus · 0012 · Public website content (testimonials, FAQs, page copy)
-- ----------------------------------------------------------------------------
-- Backs /owner/website (the Owner's CMS) and the public marketing site's FAQ
-- page, testimonials, and editable page copy/SEO fields (see
-- apps/portal/src/app/(app)/owner/website/*, apps/website/src/app/faq/page.tsx).
--
-- NOTE ON SCOPE: as of this migration no prior migration created these four
-- tables, even though the Demo Mode fixtures (packages/database/src/demo/seed.ts,
-- keys `testimonials`/`faqs`/`website_pages`/`website_sections`) and the
-- consuming app code (owner/website/actions.ts, faq/page.tsx,
-- services/[slug]/page.tsx) already assume they exist. This migration defines
-- them to match that existing app code exactly, so RLS (0013) has something to
-- attach to. If a concurrent "CMS" migration also creates these tables under a
-- different file, reconcile by dropping the `create table` statements below
-- and keeping only anything this file adds that the other migration doesn't.
--
-- Deliberately NOT organisation_id-scoped: this is a single-org MVP and these
-- rows are inherently public-facing content, not per-tenant data. The already-
-- written insert code (owner/website/actions.ts) never sets organisation_id,
-- so adding a NOT NULL organisation_id column here would break those inserts.
-- ============================================================================

create table testimonials (
  id             uuid primary key default gen_random_uuid(),
  client_name    text not null,
  project_id     uuid references projects(id) on delete set null,
  quote          text not null,
  rating         int not null default 5 check (rating between 1 and 5),
  is_published   boolean not null default false,
  display_order  int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_testimonials_published on testimonials(is_published);
create trigger trg_testimonials_updated before update on testimonials
  for each row execute function public.set_updated_at();

create table faqs (
  id             uuid primary key default gen_random_uuid(),
  category       text not null default 'General',
  question       text not null,
  answer         text not null,
  is_published   boolean not null default false,
  display_order  int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_faqs_published on faqs(is_published);
create trigger trg_faqs_updated before update on faqs
  for each row execute function public.set_updated_at();

create table website_pages (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  title             text not null,
  seo_title         text,
  meta_description  text,
  is_published      boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger trg_website_pages_updated before update on website_pages
  for each row execute function public.set_updated_at();

-- Sections are keyed by website_pages.slug (text), not website_pages.id — see
-- packages/database/src/demo/relations.ts comment: content blocks can be
-- wired up from apps/website page components by slug before the corresponding
-- website_pages row necessarily exists, so this is deliberately not an FK.
create table website_sections (
  id             uuid primary key default gen_random_uuid(),
  page_slug      text not null,
  key            text not null,
  heading        text,
  body           text,
  display_order  int not null default 0,
  is_published   boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (page_slug, key)
);
create index idx_website_sections_page on website_sections(page_slug);
create trigger trg_website_sections_updated before update on website_sections
  for each row execute function public.set_updated_at();
