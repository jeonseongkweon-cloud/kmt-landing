-- 계명태권도 CLASS SYSTEM v0.5.0
-- STAR · 칭찬 · 오늘의 챔피언

create table if not exists public.star_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  icon text not null default '⭐',
  color text not null default '#f6c451',
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.star_categories (code, name, icon, color, sort_order) values
  ('NEAT', '단정별', '🥋', '#9cc7ff', 10),
  ('GREETING', '인사별', '🙇', '#6ee7b7', 20),
  ('POSTURE', '자세별', '🎯', '#c4b5fd', 30),
  ('KICK', '발차기별', '⚡', '#fbbf24', 40),
  ('CARE', '배려별', '🤝', '#fb7185', 50),
  ('CLEANUP', '정리별', '🧹', '#67e8f9', 60),
  ('CHALLENGE', '도전별', '🔥', '#fb923c', 70),
  ('GAME', '게임별', '🎮', '#a78bfa', 80)
on conflict (code) do update set
  name = excluded.name, icon = excluded.icon, color = excluded.color,
  sort_order = excluded.sort_order, is_active = true;

create table if not exists public.star_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  category_id uuid not null references public.star_categories(id) on delete restrict,
  amount smallint not null default 1 check (amount = 1),
  note text,
  awarded_at timestamptz not null default now(),
  awarded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.praise_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  message text not null check (char_length(btrim(message)) between 1 and 200),
  praised_at timestamptz not null default now(),
  praised_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.champions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 30),
  category_id uuid references public.star_categories(id) on delete set null,
  selected_at timestamptz not null default now(),
  selected_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default timezone('utc', now()),
  unique (session_id, title)
);

create index if not exists star_events_session_student_idx on public.star_events (session_id, student_id, awarded_at);
create index if not exists star_events_student_idx on public.star_events (student_id, awarded_at desc);
create index if not exists praise_events_student_idx on public.praise_events (student_id, praised_at desc);
create index if not exists champions_student_idx on public.champions (student_id, selected_at desc);

alter table public.star_categories enable row level security;
alter table public.star_events enable row level security;
alter table public.praise_events enable row level security;
alter table public.champions enable row level security;

drop policy if exists star_categories_admin_all on public.star_categories;
create policy star_categories_admin_all on public.star_categories for all to authenticated
using (public.kmt_is_admin()) with check (public.kmt_is_admin());
drop policy if exists star_events_admin_all on public.star_events;
create policy star_events_admin_all on public.star_events for all to authenticated
using (public.kmt_is_admin()) with check (public.kmt_is_admin());
drop policy if exists praise_events_admin_all on public.praise_events;
create policy praise_events_admin_all on public.praise_events for all to authenticated
using (public.kmt_is_admin()) with check (public.kmt_is_admin());
drop policy if exists champions_admin_all on public.champions;
create policy champions_admin_all on public.champions for all to authenticated
using (public.kmt_is_admin()) with check (public.kmt_is_admin());

grant select, insert, update, delete on public.star_categories to authenticated;
grant select, insert, delete on public.star_events to authenticated;
grant select, insert, delete on public.praise_events to authenticated;
grant select, insert, update, delete on public.champions to authenticated;

drop trigger if exists star_categories_set_updated_at on public.star_categories;
create trigger star_categories_set_updated_at before update on public.star_categories
for each row execute function public.kmt_set_updated_at();

create or replace view public.student_star_summary with (security_invoker = true) as
select s.id student_id, s.student_code, s.name,
  count(distinct se.id)::integer total_stars,
  count(distinct se.id) filter (where cs.session_date = timezone('Asia/Seoul', now())::date)::integer today_stars,
  count(distinct c.id)::integer champion_total
from public.students s
left join public.star_events se on se.student_id = s.id
left join public.class_sessions cs on cs.id = se.session_id
left join public.champions c on c.student_id = s.id
group by s.id, s.student_code, s.name;

grant select on public.student_star_summary to authenticated;

select 'star_categories' check_name, count(*) result from public.star_categories
union all select 'star_events', count(*) from public.star_events
union all select 'praise_events', count(*) from public.praise_events
union all select 'champions', count(*) from public.champions;
