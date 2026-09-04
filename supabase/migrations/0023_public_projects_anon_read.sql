-- 0023_public_projects_anon_read.sql
--
-- public_projects/project_gallery have only ever had `to authenticated`
-- SELECT policies (0010_rls_policies.sql), with a comment claiming "public
-- read handled server-side with the service context for anonymous website
-- visitors." 0013_website_content_rls.sql's own header comment already
-- flagged this assumption as wrong for the sibling tables it fixed
-- (testimonials/faqs/website_pages/website_sections): the real public
-- consumers (apps/website/src/app/page.tsx's "Featured projects" section)
-- call the ordinary `createClient()`, which runs as the caller's role and
-- is always RLS-bound — never `createAdminClient()`. 0013 fixed that for
-- four tables but never touched public_projects/project_gallery, which
-- have carried the exact same gap since 0010: confirmed live just now — a
-- real, is_public=true, is_featured=true project ("Reddy Residence") is
-- completely invisible to the anon-key client the homepage actually uses,
-- with no error, so every visitor silently saw the "Projects will appear
-- here once the Owner publishes them" empty state regardless of whether
-- any were actually published.
--
-- Same pattern as 0013: scope the anon policy to is_public = true so
-- unpublished/draft entries stay invisible either way.

drop policy if exists pubproj_read on public_projects;
create policy pubproj_read on public_projects for select to authenticated
  using (organisation_id = public.current_org_id());
create policy pubproj_public_read on public_projects for select to anon
  using (is_public = true);

drop policy if exists gallery_read on project_gallery;
create policy gallery_read on project_gallery for select to authenticated using (true);
create policy gallery_public_read on project_gallery for select to anon
  using (exists (
    select 1 from public_projects pp
    where pp.id = project_gallery.public_project_id and pp.is_public = true
  ));
