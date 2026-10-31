-- 0026_daily_reports_multiple_per_day.sql
--
-- Site engineers file several updates a day (e.g. morning and evening), each
-- reviewed by the Owner and shared to the project's WhatsApp group. 0004
-- limited daily_reports to one row per (project, date, engineer), so once
-- the day's report was approved the engineer had no way to post another.
--
-- Drops that unique constraint (whatever name Postgres gave it) and keeps a
-- plain index for the engineer's "today on this project" lookup.
-- Re-runnable.

do $$
declare c text;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.daily_reports'::regclass
      and con.contype = 'u'
      and (select array_agg(att.attname::text order by att.attname)
           from unnest(con.conkey) k
           join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k)
          = array['engineer_id', 'project_id', 'report_date']
  loop
    execute format('alter table public.daily_reports drop constraint %I', c);
  end loop;
end $$;

create index if not exists idx_reports_project_engineer_date
  on daily_reports(project_id, engineer_id, report_date);
