create table if not exists public.kmt_management_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  entry_type text not null check (entry_type in ('income', 'expense')),
  category text not null check (category in ('other_income', 'examination_fee', 'regular_expense', 'special_expense')),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  amount bigint not null check (amount > 0),
  memo text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kmt_management_entry_category_type_check check (
    (entry_type = 'income' and category in ('other_income', 'examination_fee')) or
    (entry_type = 'expense' and category in ('regular_expense', 'special_expense'))
  )
);

create index if not exists kmt_management_entries_date_idx
  on public.kmt_management_entries (entry_date desc);

create index if not exists kmt_management_entries_type_date_idx
  on public.kmt_management_entries (entry_type, entry_date desc);

alter table public.kmt_management_entries enable row level security;

drop policy if exists kmt_management_entries_staff_select on public.kmt_management_entries;
create policy kmt_management_entries_staff_select
  on public.kmt_management_entries for select
  to authenticated
  using ((select public.kmt_is_staff()));

drop policy if exists kmt_management_entries_staff_insert on public.kmt_management_entries;
create policy kmt_management_entries_staff_insert
  on public.kmt_management_entries for insert
  to authenticated
  with check ((select public.kmt_is_staff()) and (select auth.uid()) = created_by);

drop policy if exists kmt_management_entries_staff_update on public.kmt_management_entries;
create policy kmt_management_entries_staff_update
  on public.kmt_management_entries for update
  to authenticated
  using ((select public.kmt_is_staff()))
  with check ((select public.kmt_is_staff()) and created_by is not null);

drop policy if exists kmt_management_entries_staff_delete on public.kmt_management_entries;
create policy kmt_management_entries_staff_delete
  on public.kmt_management_entries for delete
  to authenticated
  using ((select public.kmt_is_staff()));

grant select, insert, update, delete on public.kmt_management_entries to authenticated;

comment on table public.kmt_management_entries is
  '계명태권도 경영관리 수동 수입·지출. 기존 kmt_tuition_monthly_records와 분리.';
