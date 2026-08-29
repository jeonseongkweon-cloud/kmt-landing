-- 계명태권도 CLASS SYSTEM v0.3.0
-- Google 로그인 관리자 허용목록 및 API 권한

create table if not exists public.kmt_admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.kmt_admins (email, display_name, is_active)
values ('jeonseongkweon@gmail.com', '전성권 관리자', true)
on conflict (email) do update set
  display_name = excluded.display_name,
  is_active = true,
  updated_at = timezone('utc', now());

create or replace function public.kmt_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'super_admin')
    or exists (
      select 1
      from public.kmt_admins a
      where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and a.is_active
    );
$$;

revoke all on function public.kmt_is_admin() from public;
grant execute on function public.kmt_is_admin() to authenticated;

alter table public.kmt_admins enable row level security;
drop policy if exists kmt_admins_read_self on public.kmt_admins;
create policy kmt_admins_read_self
on public.kmt_admins
for select to authenticated
using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) and is_active);

grant select on public.kmt_admins to authenticated;
grant select, insert, update on public.students to authenticated;
grant select, insert, update on public.guardians to authenticated;
grant select, insert, update on public.enrollments to authenticated;
grant select, insert, update on public.certificates to authenticated;
grant select, insert, update on public.student_points to authenticated;
grant select, insert, update on public.training_evaluations to authenticated;
grant select on public.class_periods to authenticated;
grant select on public.student_current_profile to authenticated;

select email, display_name, is_active
from public.kmt_admins
where email = 'jeonseongkweon@gmail.com';
