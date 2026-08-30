-- CLASS v1.5.0 · NEXT-01 CLASS LIVE SYNC SYSTEM
-- Existing tables only: ensure the tables used by CLASS LIVE are in Supabase Realtime publication.
-- No student/attendance/star data is changed.

do $$
declare
  t text;
begin
  foreach t in array array[
    'attendance',
    'sms_outbox',
    'class_sessions',
    'star_events',
    'praise_events',
    'champions',
    'class_plans',
    'class_missions',
    'team_scores'
  ]
  loop
    if to_regclass(format('public.%I', t)) is not null
       and not exists (
         select 1
         from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = t
       ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
