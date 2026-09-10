-- 계명태권도 회비관리 SYSTEM v1.0 / schema draft v2
-- 설계 전용. 아직 Supabase에 적용하지 않는다.
-- v1보다 실제 운영규칙(가정단위, 월 적용, 결제자 복수, 납부일 변경이력)을 더 정확히 반영한다.

create table if not exists public.tuition_households (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  due_day smallint not null check (due_day between 1 and 31),
  status text not null default 'active' check (status in ('active','leave','travel','withdrawn')),
  status_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tuition_household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.tuition_households(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  member_status text not null default 'active' check (member_status in ('active','leave','travel','withdrawn')),
  joined_on date,
  ended_on date,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  unique(student_id)
);

create table if not exists public.tuition_payers (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.tuition_households(id) on delete cascade,
  payer_name text not null,
  relationship text,
  provider text not null default 'ulsanpay' check (provider in ('ulsanpay','bank','card','cash','other')),
  masked_alias text,
  search_aliases text[] not null default '{}',
  is_active boolean not null default true,
  last_used_at timestamptz,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tuition_due_day_history (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.tuition_households(id) on delete cascade,
  old_due_day smallint check (old_due_day between 1 and 31),
  new_due_day smallint not null check (new_due_day between 1 and 31),
  reason text not null check (reason in ('travel','leave','academy_closure','other','initial')),
  memo text,
  changed_on date not null default (timezone('Asia/Seoul', now())::date),
  changed_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tuition_month_status (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.tuition_households(id) on delete cascade,
  billing_month date not null check (extract(day from billing_month)=1),
  applicability text not null default 'due' check (applicability in ('due','not_applicable')),
  reason text check (reason in ('before_join','withdrawn','leave','travel','academy_closure','other')),
  memo text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(household_id,billing_month)
);

create table if not exists public.tuition_payments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.tuition_households(id) on delete restrict,
  billing_month date not null check (extract(day from billing_month)=1),
  paid_on date not null default (timezone('Asia/Seoul', now())::date),
  amount integer not null check (amount > 0),
  payment_method text not null check (payment_method in ('ulsanpay','bank','card','cash','other')),
  payer_id uuid references public.tuition_payers(id) on delete set null,
  payer_text_snapshot text,
  memo text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(household_id,billing_month)
);

create table if not exists public.tuition_message_history (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.tuition_households(id) on delete restrict,
  guardian_id uuid references public.guardians(id) on delete set null,
  billing_month date,
  message_type text not null default 'overdue' check (message_type in ('overdue','manual','other')),
  recipient_name text,
  recipient_phone text not null,
  message text not null,
  delivery_status text not null default 'draft' check (delivery_status in ('draft','queued','sent','failed','cancelled')),
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists tuition_household_members_household_idx on public.tuition_household_members(household_id);
create index if not exists tuition_payers_search_idx on public.tuition_payers(household_id,is_active);
create index if not exists tuition_due_history_idx on public.tuition_due_day_history(household_id,changed_on desc);
create index if not exists tuition_month_status_idx on public.tuition_month_status(billing_month,applicability);
create index if not exists tuition_payments_month_idx on public.tuition_payments(billing_month,paid_on);
create index if not exists tuition_message_history_household_idx on public.tuition_message_history(household_id,created_at desc);

-- 미납 회차는 금액으로 계산하지 않는다.
-- 해당 가정의 '납부대상(due)' 월 중 payment가 없는 월의 개수로 계산한다.
-- 실제 paid_on이 늦어도 due_day는 변경하지 않는다.
-- due_day는 명시적인 '납부일 변경' 동작으로만 갱신하며 반드시 history에 남긴다.
-- 문자 준비대상: 현재 기준 납부일에서 7일 이상 경과 + 해당 billing_month 미납.
-- not_applicable 월은 미납횟수/문자대상에서 제외한다.
-- 형제는 household 하나로 표시하되 각 student_id는 members로 개별 연결한다.

-- RLS/GRANT/trigger는 실제 Supabase 적용 직전 기존 kmt_is_admin() 정책을 확인한 후 별도 migration에서 추가한다.
-- 기존 CLASS/STAR/attendance/sms_outbox 테이블은 이 설계에서 ALTER 하지 않는다.
