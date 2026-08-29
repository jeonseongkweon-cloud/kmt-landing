-- 계명태권도 CLASS SYSTEM v0.6.0
-- 수업계획 · 미션 · 팀점수 · 미디어 관리

create table if not exists public.class_plans (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.class_sessions(id) on delete cascade,
  title text not null default '오늘 수업계획',
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array'),
  current_step integer not null default 0 check (current_step >= 0),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.class_missions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.team_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  team_name text not null check (char_length(btrim(team_name)) between 1 and 20),
  color text not null default '#2d84ff',
  score integer not null default 0 check (score between -999 and 9999),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (session_id, team_name)
);

create table if not exists public.media_library (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  media_type text not null check (media_type in ('audio','video')),
  category text not null default '기타',
  media_url text not null check (media_url ~* '^https?://'),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists class_missions_session_idx on public.class_missions(session_id,status,created_at);
create index if not exists team_scores_session_idx on public.team_scores(session_id);
create index if not exists media_library_active_idx on public.media_library(is_active,sort_order);

alter table public.class_plans enable row level security;
alter table public.class_missions enable row level security;
alter table public.team_scores enable row level security;
alter table public.media_library enable row level security;

drop policy if exists class_plans_admin_all on public.class_plans;
create policy class_plans_admin_all on public.class_plans for all to authenticated using (public.kmt_is_admin()) with check (public.kmt_is_admin());
drop policy if exists class_missions_admin_all on public.class_missions;
create policy class_missions_admin_all on public.class_missions for all to authenticated using (public.kmt_is_admin()) with check (public.kmt_is_admin());
drop policy if exists team_scores_admin_all on public.team_scores;
create policy team_scores_admin_all on public.team_scores for all to authenticated using (public.kmt_is_admin()) with check (public.kmt_is_admin());
drop policy if exists media_library_admin_all on public.media_library;
create policy media_library_admin_all on public.media_library for all to authenticated using (public.kmt_is_admin()) with check (public.kmt_is_admin());

grant select,insert,update,delete on public.class_plans to authenticated;
grant select,insert,update,delete on public.class_missions to authenticated;
grant select,insert,update,delete on public.team_scores to authenticated;
grant select,insert,update,delete on public.media_library to authenticated;

drop trigger if exists class_plans_set_updated_at on public.class_plans;
create trigger class_plans_set_updated_at before update on public.class_plans for each row execute function public.kmt_set_updated_at();
drop trigger if exists class_missions_set_updated_at on public.class_missions;
create trigger class_missions_set_updated_at before update on public.class_missions for each row execute function public.kmt_set_updated_at();
drop trigger if exists team_scores_set_updated_at on public.team_scores;
create trigger team_scores_set_updated_at before update on public.team_scores for each row execute function public.kmt_set_updated_at();
drop trigger if exists media_library_set_updated_at on public.media_library;
create trigger media_library_set_updated_at before update on public.media_library for each row execute function public.kmt_set_updated_at();

select 'class_plans' check_name,count(*) result from public.class_plans
union all select 'class_missions',count(*) from public.class_missions
union all select 'team_scores',count(*) from public.team_scores
union all select 'media_library',count(*) from public.media_library;
