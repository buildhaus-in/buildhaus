-- 0015: Anonymous read access for public pricing content.
--
-- The public website renders package cards, package detail pages, the
-- services cost-range strip and the sitemap directly from estimator_packages
-- / estimator_rates using the ANON key (see apps/website/src/app/packages,
-- services/[slug], sitemap.ts). Under 0010 those tables were
-- authenticated-only, which is correct for WRITES but would make the public
-- packages pages render empty against a real Supabase project.
--
-- Package rates and the cost-component percentages are deliberately public
-- information (the brand leads with transparent pricing), so a read-only anon
-- grant is safe. All writes remain owner-only via the existing 0010 policies.

create policy estpkg_read_anon on estimator_packages
  for select to anon
  using (true);

create policy estrate_read_anon on estimator_rates
  for select to anon
  using (true);
