-- 계명태권도 CLASS SYSTEM v0.4.0
-- 오늘 수업 및 출석기록

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null default (timezone('Asia/Seoul', now())::date),
  class_period_id uuid not null references public.class_periods(id) on delete restrict,
  status text not null default 'open' check (status in ('open', 'closed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (session_date, class_period_id)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid references public.students(id) on delete restrict,
  guest_name text,
  attendance_date date not null default (timezone('Asia/Seoul', now())::date),
  status text not null check (status in ('present', 'late', 'absent', 'trial', 'cancelled')),
  checked_at timestamptz not null default now(),
  points_awarded smallint not null default 0 check (points_awarded in (0, 1)),
  note text,
  checked_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint attendance_person_check check (
    (student_id is not null and guest_name is null)
    or (student_id is null and nullif(btrim(guest_name), '') is not null and status in ('trial', 'cancelled'))
  )
);

create unique index if not exists attendance_session_student_uidx
on public.attendance (session_id, student_id)
where student_id is not null;

create unique index if not exists attendance_session_guest_uidx
on public.attendance (session_id, lower(guest_name))
where guest_name is not null;

create index if not exists class_sessions_date_idx on public.class_sessions (session_date desc);
create index if not exists attendance_date_idx on public.attendance (attendance_date desc);
create index if not exists attendance_student_idx on public.attendance (student_id, attendance_date desc);

alter table public.class_sessions enable row level security;
alter table public.attendance enable row level security;

drop policy if exists class_sessions_admin_all on public.class_sessions;
create policy class_sessions_admin_all on public.class_sessions
for all to authenticated
using (public.kmt_is_admin()) with check (public.kmt_is_admin());

drop policy if exists attendance_admin_all on public.attendance;
create policy attendance_admin_all on public.attendance
for all to authenticated
using (public.kmt_is_admin()) with check (public.kmt_is_admin());

grant select, insert, update on public.class_sessions to authenticated;
grant select, insert, update on public.attendance to authenticated;

drop trigger if exists class_sessions_set_updated_at on public.class_sessions;
create trigger class_sessions_set_updated_at before update on public.class_sessions
for each row execute function public.kmt_set_updated_at();

drop trigger if exists attendance_set_updated_at on public.attendance;
create trigger attendance_set_updated_at before update on public.attendance
for each row execute function public.kmt_set_updated_at();

create or replace view public.student_attendance_summary
with (security_invoker = true)
as
select
  s.id as student_id,
  s.student_code,
  s.name,
  count(a.id) filter (where a.status in ('present', 'late')) as attended_total,
  count(a.id) filter (
    where a.status in ('present', 'late')
      and date_trunc('month', a.attendance_date::timestamp) = date_trunc('month', timezone('Asia/Seoul', now()))
  ) as attended_this_month,
  max(a.attendance_date) filter (where a.status in ('present', 'late')) as last_attended_on
from public.students s
left join public.attendance a on a.student_id = s.id
group by s.id, s.student_code, s.name;

grant select on public.student_attendance_summary to authenticated;

select 'class_sessions_ready' as check_name, count(*) as current_rows from public.class_sessions
union all
select 'attendance_ready', count(*) from public.attendance;
