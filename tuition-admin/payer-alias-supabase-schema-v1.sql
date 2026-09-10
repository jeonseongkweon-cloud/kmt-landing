-- 계명태권도 CLASS 회비관리 SYSTEM
-- 울산페이 이름 연결표 Supabase 영구저장용 SCHEMA 초안 v1.0
-- 주의: 이 파일은 설계 초안이며 아직 Supabase에 실행하지 않았다.

create table if not exists public.tuition_payer_aliases (
  id text primary key,
  payer_masked text not null,
  students text[] not null default '{}',
  status text not null default 'confirmed' check (status in ('confirmed','review')),
  memo text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tuition_payer_aliases_payer_masked_idx
  on public.tuition_payer_aliases (payer_masked);

alter table public.tuition_payer_aliases enable row level security;

-- 정책은 현재 CLASS 인증 방식 확인 후 확정한다.
-- 아래 예시는 authenticated 사용자만 허용하는 초안이며 즉시 실행하지 않는다.
-- create policy "tuition payer aliases read authenticated"
--   on public.tuition_payer_aliases for select
--   to authenticated using (true);
-- create policy "tuition payer aliases write authenticated"
--   on public.tuition_payer_aliases for all
--   to authenticated using (true) with check (true);

-- updated_at 자동 갱신 트리거도 기존 프로젝트의 공통 함수 유무를 확인 후 연결한다.
