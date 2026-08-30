-- CLASS v1.4.0 · WORK14
-- 계명태권도 SPARK 그룹 및 확장형 도장 커뮤니티

create table if not exists public.spark_groups(
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  group_type text not null check(group_type in('taekwondo_dojo','school','sports_club','community_center','other')),
  organization_code text,
  region text,
  description text,
  is_active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.spark_group_members(
  group_id uuid not null references public.spark_groups(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  role text not null default 'member' check(role in('member','leader','coach')),
  status text not null default 'active' check(status in('active','left')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(group_id,member_id)
);
create index if not exists idx_spark_group_members_member on public.spark_group_members(member_id,status);

create table if not exists public.spark_group_missions(
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.spark_groups(id) on delete cascade,
  title text not null check(char_length(title) between 1 and 100),
  description text check(description is null or char_length(description)<=500),
  starts_on date not null default current_date,
  ends_on date,
  status text not null default 'active' check(status in('active','completed','archived')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(ends_on is null or ends_on>=starts_on)
);
create index if not exists idx_spark_group_missions_active on public.spark_group_missions(group_id,status,starts_on,ends_on);

create table if not exists public.spark_group_news(
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.spark_groups(id) on delete cascade,
  title text not null check(char_length(title) between 1 and 120),
  summary text not null check(char_length(summary) between 1 and 600),
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_spark_group_news_published on public.spark_group_news(group_id,is_published,published_at desc);

create table if not exists public.spark_group_audit(
  id bigint generated always as identity primary key,
  group_id uuid not null,
  entity_type text not null check(entity_type in('group','member','mission','news')),
  entity_id text,
  action text not null,
  snapshot jsonb not null default '{}'::jsonb,
  acted_by uuid,
  acted_at timestamptz not null default now()
);

insert into public.spark_groups(code,name,group_type,organization_code,region,description,settings)
values('KMT-CLASS-001','계명태권도','taekwondo_dojo','KMT','대한민국 울산','GLOBAL SPARK의 첫 실제 도장 적용 그룹',jsonb_build_object('class_url','https://계명태권도.com/class/','privacy_mode','admin_only'))
on conflict(code) do update set name=excluded.name,group_type=excluded.group_type,organization_code=excluded.organization_code,region=excluded.region,description=excluded.description,settings=excluded.settings,updated_at=now();

alter table public.spark_groups enable row level security;
alter table public.spark_group_members enable row level security;
alter table public.spark_group_missions enable row level security;
alter table public.spark_group_news enable row level security;
alter table public.spark_group_audit enable row level security;
revoke all on public.spark_groups,public.spark_group_members,public.spark_group_missions,public.spark_group_news,public.spark_group_audit from anon,authenticated;

create or replace function public.kmt_sync_spark_group_members() returns integer
language plpgsql security definer set search_path=public as $$
declare v_group uuid; v_count integer;
begin
  if not public.kmt_is_admin() then raise exception '관리자만 그룹 연결을 동기화할 수 있습니다.' using errcode='42501'; end if;
  select id into v_group from public.spark_groups where code='KMT-CLASS-001';
  with linked as(
    select distinct case when l.spark_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then l.spark_user_id::uuid end member_id
    from public.spark_member_links l where l.link_status='verified'
  ),valid as(
    select l.member_id from linked l join public.members m on m.id=l.member_id where l.member_id is not null and coalesce(m.status,'active')='active'
  )
  insert into public.spark_group_members(group_id,member_id,role,status)
  select v_group,v.member_id,'member','active' from valid v
  on conflict(group_id,member_id) do update set status='active',updated_at=now();
  get diagnostics v_count=row_count;
  return v_count;
end $$;

create or replace function public.kmt_get_spark_group_dashboard() returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_group uuid; v_result jsonb; v_synced int;
begin
  if not public.kmt_is_admin() then raise exception '관리자만 도장 SPARK 그룹을 조회할 수 있습니다.' using errcode='42501'; end if;
  v_synced:=public.kmt_sync_spark_group_members();
  select id into v_group from public.spark_groups where code='KMT-CLASS-001' and is_active=true;
  if v_group is null then raise exception '계명태권도 SPARK 그룹을 찾을 수 없습니다.'; end if;

  select jsonb_build_object(
    'version','1.4.0',
    'group',jsonb_build_object('id',g.id,'code',g.code,'name',g.name,'type',g.group_type,'region',g.region,'description',g.description),
    'stats',jsonb_build_object(
      'members',(select count(*) from public.spark_group_members gm where gm.group_id=g.id and gm.status='active'),
      'today_participants',(select count(distinct e.member_id) from(
        select s.member_id from public.spark_submissions s join public.spark_group_members gm on gm.member_id=s.member_id and gm.group_id=g.id and gm.status='active' where s.submitted_at>=date_trunc('day',now())
        union select a.actor_member_id from public.spark_together_activities a join public.spark_group_members gm on gm.member_id=a.actor_member_id and gm.group_id=g.id and gm.status='active' where a.status='verified' and a.activity_date=current_date
      ) e),
      'week_activities',(select count(*) from(
        select s.id from public.spark_submissions s join public.spark_group_members gm on gm.member_id=s.member_id and gm.group_id=g.id and gm.status='active' where s.submitted_at>=date_trunc('week',now())
        union all select a.id from public.spark_together_activities a join public.spark_group_members gm on gm.member_id=a.actor_member_id and gm.group_id=g.id and gm.status='active' where a.status='verified' and a.activity_date>=date_trunc('week',current_date)::date
      ) w),
      'total_spark',(select coalesce(sum(ut.lifetime_spark),0) from public.spark_group_members gm left join public.spark_user_tiers ut on ut.member_id=gm.member_id where gm.group_id=g.id and gm.status='active'),
      'friend_activities',(select count(*) from public.spark_together_activities a join public.spark_group_members gm on gm.member_id=a.actor_member_id where gm.group_id=g.id and gm.status='active' and a.status='verified' and a.axis='friend'),
      'family_activities',(select count(*) from public.spark_together_activities a join public.spark_group_members gm on gm.member_id=a.actor_member_id where gm.group_id=g.id and gm.status='active' and a.status='verified' and a.axis='family'),
      'filial_activities',(select count(*) from public.spark_together_activities a join public.spark_group_members gm on gm.member_id=a.actor_member_id where gm.group_id=g.id and gm.status='active' and a.status='verified' and a.activity_code in('greeting','organizing','housework','massage','gratitude','help_first')),
      'joint_missions',(select count(*) from public.spark_together_activities a join public.spark_group_members gm on gm.member_id=a.actor_member_id where gm.group_id=g.id and gm.status='active' and a.status='verified' and a.activity_code='joint_mission'),
      'badges',(select count(*) from public.spark_member_together_badges mb join public.spark_group_members gm on gm.member_id=mb.member_id where gm.group_id=g.id and gm.status='active')
    ),
    'ranking',coalesce((select jsonb_agg(x.obj order by x.spark desc,x.name) from(
      select m.name,coalesce(ut.lifetime_spark,0) spark,jsonb_build_object('member_id',m.id,'name',m.name,'photo_url',m.photo_url,'spark',coalesce(ut.lifetime_spark,0),'tier_name',t.name_ko,'tier_icon',t.icon) obj
      from public.spark_group_members gm join public.members m on m.id=gm.member_id left join public.spark_user_tiers ut on ut.member_id=m.id left join public.spark_tiers t on t.id=ut.tier_id
      where gm.group_id=g.id and gm.status='active' order by spark desc,m.name limit 20
    ) x),'[]'::jsonb),
    'missions',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'description',m.description,'starts_on',m.starts_on,'ends_on',m.ends_on,'status',m.status) order by m.starts_on,m.created_at) from public.spark_group_missions m where m.group_id=g.id and m.status='active' and m.starts_on<=current_date and (m.ends_on is null or m.ends_on>=current_date)),'[]'::jsonb),
    'news',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'title',n.title,'summary',n.summary,'published_at',n.published_at) order by n.published_at desc) from(select * from public.spark_group_news where group_id=g.id and is_published=true order by published_at desc limit 10)n),'[]'::jsonb),
    'synced_members',v_synced
  ) into v_result from public.spark_groups g where g.id=v_group;
  return v_result;
end $$;

create or replace function public.kmt_create_spark_group_mission(p_title text,p_description text default null,p_starts_on date default current_date,p_ends_on date default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_group uuid; v_row public.spark_group_missions%rowtype;
begin
  if not public.kmt_is_admin() then raise exception '관리자만 공동미션을 등록할 수 있습니다.' using errcode='42501'; end if;
  select id into v_group from public.spark_groups where code='KMT-CLASS-001';
  insert into public.spark_group_missions(group_id,title,description,starts_on,ends_on,created_by) values(v_group,btrim(p_title),nullif(btrim(p_description),''),coalesce(p_starts_on,current_date),p_ends_on,auth.uid()) returning * into v_row;
  insert into public.spark_group_audit(group_id,entity_type,entity_id,action,snapshot,acted_by) values(v_group,'mission',v_row.id::text,'create',to_jsonb(v_row),auth.uid());
  return jsonb_build_object('ok',true,'id',v_row.id);
end $$;

create or replace function public.kmt_create_spark_group_news(p_title text,p_summary text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_group uuid; v_row public.spark_group_news%rowtype;
begin
  if not public.kmt_is_admin() then raise exception '관리자만 SPARK NEWS를 등록할 수 있습니다.' using errcode='42501'; end if;
  select id into v_group from public.spark_groups where code='KMT-CLASS-001';
  insert into public.spark_group_news(group_id,title,summary,created_by) values(v_group,btrim(p_title),btrim(p_summary),auth.uid()) returning * into v_row;
  insert into public.spark_group_audit(group_id,entity_type,entity_id,action,snapshot,acted_by) values(v_group,'news',v_row.id::text,'create',to_jsonb(v_row),auth.uid());
  return jsonb_build_object('ok',true,'id',v_row.id);
end $$;

revoke all on function public.kmt_sync_spark_group_members(),public.kmt_get_spark_group_dashboard(),public.kmt_create_spark_group_mission(text,text,date,date),public.kmt_create_spark_group_news(text,text) from public,anon;
grant execute on function public.kmt_sync_spark_group_members(),public.kmt_get_spark_group_dashboard(),public.kmt_create_spark_group_mission(text,text,date,date),public.kmt_create_spark_group_news(text,text) to authenticated;

select 'group_tables' check_name,count(*)::text result from information_schema.tables where table_schema='public' and table_name in('spark_groups','spark_group_members','spark_group_missions','spark_group_news','spark_group_audit')
union all select 'kmt_groups',count(*)::text from public.spark_groups where code='KMT-CLASS-001'
union all select 'group_members',count(*)::text from public.spark_group_members gm join public.spark_groups g on g.id=gm.group_id where g.code='KMT-CLASS-001' and gm.status='active';
