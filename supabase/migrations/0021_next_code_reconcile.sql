-- ============================================================================
-- Buildhaus · 0021 · next_code(): reconcile against the real table, not just
-- the counter
-- ----------------------------------------------------------------------------
-- Same bug as packages/database/src/demo/rpc.ts's next_code stand-in had,
-- and was already fixed there this session (see that file's own comment):
-- code_counters starts a scope's last_no at 1 unconditionally, with no
-- awareness of codes that already exist in the target table because they
-- were inserted directly rather than through this function — exactly what
-- scripts/link-real-users.mjs does for the sample project (hardcoded
-- code: "BH-2026-0001"). The first real call to next_code(org,'project','BH')
-- against a fresh code_counters row then also returns "BH-2026-0001",
-- colliding with projects_organisation_id_code_key — confirmed live: this
-- is exactly the error the Owner hit on their very first real "Create
-- project" click.
--
-- Fix: before incrementing, scan the actual scope-appropriate table for the
-- highest already-used sequence number for this org/year, and start from
-- whichever is higher — the counter or the table. Covers the same class of
-- collision for quotations/leads too, not just projects, since none of
-- them are exempt from being seeded/imported directly at some point.
-- ============================================================================
create or replace function public.next_code(p_org uuid, p_scope text, p_prefix text)
returns text language plpgsql security definer set search_path = public as $$
declare
  y int := extract(year from now());
  n int;
  existing_max int := 0;
  pattern text := p_prefix || '-' || y || '-';
begin
  if p_scope = 'project' then
    select coalesce(max(substring(code from length(pattern) + 1)::int), 0) into existing_max
    from projects where organisation_id = p_org and code like pattern || '%';
  elsif p_scope = 'quotation' then
    select coalesce(max(substring(quotation_no from length(pattern) + 1)::int), 0) into existing_max
    from quotations where organisation_id = p_org and quotation_no like pattern || '%';
  elsif p_scope = 'lead' then
    select coalesce(max(substring(lead_no from length(pattern) + 1)::int), 0) into existing_max
    from leads where organisation_id = p_org and lead_no like pattern || '%';
  end if;

  insert into code_counters(organisation_id, scope, year, last_no)
  values (p_org, p_scope, y, existing_max + 1)
  on conflict (organisation_id, scope, year)
    do update set last_no = greatest(code_counters.last_no, existing_max) + 1
  returning last_no into n;
  return format('%s-%s-%s', p_prefix, y, lpad(n::text, 4, '0'));
end;
$$;
