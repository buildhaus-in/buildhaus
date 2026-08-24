-- ============================================================================
-- Buildhaus · 0013 · RLS for public website content
-- ----------------------------------------------------------------------------
-- Same predicate helpers as 0010 (is_owner()). Pattern for all four tables:
-- Owner full read/write; PUBLIC (anon) may SELECT only published rows.
--
-- This intentionally introduces `to anon` policies, which 0010 avoided ("public
-- read handled server-side with the service context for anonymous website
-- visitors" — see its closing comment on public_projects/project_gallery).
-- That avoidance doesn't hold here: the already-written public consumers
-- (apps/website/src/app/faq/page.tsx, services/[slug]/page.tsx) call the
-- ordinary `createClient()` — which runs as the caller's role and is always
-- RLS-bound, per packages/database/src/supabase/server.ts — not
-- `createAdminClient()`. So under a real Supabase project, anon needs a real
-- grant here or those pages silently render empty. Scoping every anon policy
-- to `is_published = true` keeps drafts invisible either way.
-- ============================================================================

alter table testimonials enable row level security;
alter table testimonials force row level security;
alter table faqs enable row level security;
alter table faqs force row level security;
alter table website_pages enable row level security;
alter table website_pages force row level security;
alter table website_sections enable row level security;
alter table website_sections force row level security;

-- Testimonials: Owner manages; public sees only published ones (used on the
-- site's testimonials/home sections once wired up).
create policy testimonials_owner on testimonials for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy testimonials_public_read on testimonials for select to anon
  using (is_published = true);

-- FAQs: Owner manages; public sees only published ones (apps/website/faq).
create policy faqs_owner on faqs for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy faqs_public_read on faqs for select to anon
  using (is_published = true);

-- Website pages: Owner manages copy/SEO; public reads a page's meta only when
-- published (an unpublished page should 404 on the public site, not leak
-- draft title/meta_description).
create policy webpages_owner on website_pages for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy webpages_public_read on website_pages for select to anon
  using (is_published = true);

-- Website sections: same pattern. Note a section's own is_published can be
-- false even while its parent page is published (Owner can draft a new
-- section without showing it yet) — the public site's page component is
-- expected to filter on is_published itself in addition to this policy.
create policy websections_owner on website_sections for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy websections_public_read on website_sections for select to anon
  using (is_published = true);
