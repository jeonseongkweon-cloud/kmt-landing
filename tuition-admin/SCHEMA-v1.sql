-- 계명태권도 회비관리 SYSTEM v1.0
-- IMPORTANT: 설계 파일. 아직 Supabase에 적용하지 않는다.
-- 원칙: 기존 CLASS/STAR/attendance/sms_outbox 구조를 변경하지 않고 tuition_* 전용 구조만 추가한다.

create table if not exists public.tuition_households (
  id uuid primary key default gen_random_uuid(),
  household_name text,
  memo text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tuition_accounts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students(id) on delete restrict,
  household_id uuid references public.tuition_households(id) on delete set null,
  monthly_fee integer not null default 0 check (monthly_fee >= 0),
  due_day smallint not null default 1 check (due_day between 1 and 31),
  payment_method text not null default 'unknown' check (payment_method in ('unknown','bank','ulsanpay','card','cash','other')),
  active boolean not null default true,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tuition_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  household_id uuid references public.tuition_households(id) on delete set null,
  billing_month date not null,
  amount integer not null check (amount >= 0),
  paid_on date not null default (timezone('Asia/Seoul', now())::date),
  payment_method text not null default 'unknown' check (payment_method in ('unknown','bank','ulsanpay','card','cash','other')),
  reference_text text,
  memo text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(student_id, billing_month)
);

create table if not exists public.tuition_message_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete restrict,
  household_id uuid references public.tuition_households(id) on delete set null,
  guardian_id uuid references public.guardians(id) on delete set null,
  message_type text not null check (message_type in ('due_soon','overdue','manual','receipt','other')),
  recipient_phone text,
  message text not null,
  status text not null default 'draft' check (status in ('draft','queued','sent','failed','cancelled')),
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists tuition_accounts_household_idx on public.tuition_accounts(household_id);
create index if not exists tuition_payments_month_idx on public.tuition_payments(billing_month, paid_on);
create index if not exists tuition_payments_student_idx on public.tuition_payments(student_id, billing_month desc);
create index if not exists tuition_message_history_student_idx on public.tuition_message_history(student_id, created_at desc);

alter table public.tuition_households enable row level security;
alter table public.tuition_accounts enable row level security;
alter table public.tuition_payments enable row level security;
alter table public.tuition_message_history enable row level security;

create policy tuition_households_admin_all on public.tuition_households for all to authenticated using (public.kmt_is_admin()) with check (public.kmt_is_admin());
create policy tuition_accounts_admin_all on public.tuition_accounts for all to authenticated using (public.kmt_is_admin()) with check (public.kmt_is_admin());
create policy tuition_payments_admin_all on public.tuition_payments for all to authenticated using (public.kmt_is_admin()) with check (public.kmt_is_admin());
create policy tuition_message_history_admin_all on public.tuition_message_history for all to authenticated using (public.kmt_is_admin()) with check (public.kmt_is_admin());

grant select, insert, update on public.tuition_households to authenticated;
grant select, insert, update on public.tuition_accounts to authenticated;
grant select, insert, update on public.tuition_payments to authenticated;
grant select, insert, update on public.tuition_message_history to authenticated;

-- 주의: 기존 sms_outbox는 attendance_id NOT NULL 구조이므로 회비문자를 직접 넣지 않는다.
-- 회비 문자 발송 연계는 후속 migration에서 기존 출석 문자와 충돌하지 않는 별도 큐/공용화 방식으로 설계한다.
