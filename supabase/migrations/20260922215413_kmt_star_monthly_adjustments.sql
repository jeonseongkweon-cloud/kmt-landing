-- Manual display adjustment only. The original star_events history is untouched.
create table if not exists public.kmt_star_monthly_adjustments (
  student_id uuid not null references public.students(id) on delete restrict,
  year_month text not null check (year_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  adjustment integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid not null default auth.uid() references auth.users(id),
  primary key (student_id, year_month)
);

alter table public.kmt_star_monthly_adjustments enable row level security;

drop policy if exists kmt_star_monthly_adjustments_admin_read on public.kmt_star_monthly_adjustments;
create policy kmt_star_monthly_adjustments_admin_read
on public.kmt_star_monthly_adjustments for select to authenticated
using (public.kmt_is_admin() and lower(coalesce(auth.jwt()->>'email','')) = 'jeonseongkweon@gmail.com');

drop policy if exists kmt_star_monthly_adjustments_admin_insert on public.kmt_star_monthly_adjustments;
create policy kmt_star_monthly_adjustments_admin_insert
on public.kmt_star_monthly_adjustments for insert to authenticated
with check (public.kmt_is_admin() and lower(coalesce(auth.jwt()->>'email','')) = 'jeonseongkweon@gmail.com' and updated_by = (select auth.uid()));

drop policy if exists kmt_star_monthly_adjustments_admin_update on public.kmt_star_monthly_adjustments;
create policy kmt_star_monthly_adjustments_admin_update
on public.kmt_star_monthly_adjustments for update to authenticated
using (public.kmt_is_admin() and lower(coalesce(auth.jwt()->>'email','')) = 'jeonseongkweon@gmail.com')
with check (public.kmt_is_admin() and lower(coalesce(auth.jwt()->>'email','')) = 'jeonseongkweon@gmail.com' and updated_by = (select auth.uid()));

grant select, insert, update on public.kmt_star_monthly_adjustments to authenticated;
