-- CLASS v1.3.0 · WORK13
-- SPARK 친구·가족·공유·전달 시스템
-- 중요: 이 모듈은 SPARK XP를 지급하지 않습니다. 단순 추천 경쟁도 만들지 않습니다.

create table if not exists public.spark_together_activities (
  id uuid primary key default gen_random_uuid(),
  actor_member_id uuid not null references public.members(id) on delete cascade,
  axis text not null check (axis in ('personal','family','friend')),
  activity_code text not null check (activity_code in (
    'exercise','challenge','learning','habit','service','public_good',
    'greeting','organizing','housework','massage','gratitude','help_first','family_exercise',
    'praise_friend','approach_friend','help_friend','friend_exercise','joint_mission','friend_service','spark_intro','spark_together'
  )),
  partner_member_id uuid references public.members(id) on delete set null,
  partner_label text check (partner_label is null or char_length(partner_label) <= 40),
  note text check (note is null or char_length(note) <= 300),
  activity_date date not null default current_date,
  status text not null default 'verified' check (status in ('verified','void')),
  idempotency_key text not null unique,
  verified_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (partner_member_id is null or partner_member_id <> actor_member_id),
  check (
    (axis='personal' and activity_code in('exercise','challenge','learning','habit','service','public_good')) or
    (axis='family' and activity_code in('greeting','organizing','housework','massage','gratitude','help_first','family_exercise')) or
    (axis='friend' and activity_code in('praise_friend','approach_friend','help_friend','friend_exercise','joint_mission','friend_service','spark_intro','spark_together'))
  )
);
create index if not exists idx_spark_together_actor_date on public.spark_together_activities(actor_member_id,activity_date desc);
create index if not exists idx_spark_together_partner on public.spark_together_activities(partner_member_id) where partner_member_id is not null;

create table if not exists public.spark_together_badges (
  code text primary key,
  name text not null,
  icon text not null,
  description text not null,
  sort_order integer not null unique
);
insert into public.spark_together_badges(code,name,icon,description,sort_order) values
('SPARK_STARTER','SPARK STARTER','🔥','첫 함께하기 활동을 실천했어요.',10),
('SPARK_FRIEND','SPARK FRIEND','🤝','친구와 좋은 행동을 함께했어요.',20),
('SPARK_HELPER','SPARK HELPER','🌱','도움과 봉사를 꾸준히 실천했어요.',30),
('FAMILY_SPARK','FAMILY SPARK','❤️','가족을 위한 SPARK를 꾸준히 실천했어요.',40),
('SPARK_CONNECTOR','SPARK CONNECTOR','🔗','여러 친구와 SPARK를 함께 이어갔어요.',50),
('SPARK_LEADER','SPARK LEADER','🏆','공동미션과 봉사를 지속적으로 이끌었어요.',60)
on conflict(code) do update set name=excluded.name,icon=excluded.icon,description=excluded.description,sort_order=excluded.sort_order;

create table if not exists public.spark_member_together_badges (
  member_id uuid not null references public.members(id) on delete cascade,
  badge_code text not null references public.spark_together_badges(code) on delete restrict,
  awarded_at timestamptz not null default now(),
  source text not null default 'WORK13_RULE',
  primary key(member_id,badge_code)
);

create table if not exists public.spark_together_audit (
  id bigint generated always as identity primary key,
  activity_id uuid,
  actor_member_id uuid not null,
  action text not null check(action in ('create','void')),
  snapshot jsonb not null default '{}'::jsonb,
  acted_by uuid,
  acted_at timestamptz not null default now()
);

alter table public.spark_together_activities enable row level security;
alter table public.spark_together_badges enable row level security;
alter table public.spark_member_together_badges enable row level security;
alter table public.spark_together_audit enable row level security;
revoke all on public.spark_together_activities,public.spark_together_badges,public.spark_member_together_badges,public.spark_together_audit from anon,authenticated;

create or replace function public.spark_recalculate_together_badges(p_member_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare v_total int; v_friend int; v_helper int; v_family int; v_partners int; v_leader int;
begin
  select count(*),count(*) filter(where axis='friend'),count(*) filter(where activity_code in('help_friend','service','friend_service','public_good')),
    count(*) filter(where axis='family'),count(distinct coalesce(partner_member_id::text,partner_label)) filter(where axis='friend'),
    count(*) filter(where activity_code in('joint_mission','friend_service','service','public_good'))
  into v_total,v_friend,v_helper,v_family,v_partners,v_leader from public.spark_together_activities where actor_member_id=p_member_id and status='verified';
  if v_total>=1 then insert into public.spark_member_together_badges(member_id,badge_code) values(p_member_id,'SPARK_STARTER') on conflict do nothing; end if;
  if v_friend>=1 then insert into public.spark_member_together_badges(member_id,badge_code) values(p_member_id,'SPARK_FRIEND') on conflict do nothing; end if;
  if v_helper>=3 then insert into public.spark_member_together_badges(member_id,badge_code) values(p_member_id,'SPARK_HELPER') on conflict do nothing; end if;
  if v_family>=3 then insert into public.spark_member_together_badges(member_id,badge_code) values(p_member_id,'FAMILY_SPARK') on conflict do nothing; end if;
  if v_partners>=3 then insert into public.spark_member_together_badges(member_id,badge_code) values(p_member_id,'SPARK_CONNECTOR') on conflict do nothing; end if;
  if v_leader>=10 then insert into public.spark_member_together_badges(member_id,badge_code) values(p_member_id,'SPARK_LEADER') on conflict do nothing; end if;
end $$;
revoke all on function public.spark_recalculate_together_badges(uuid) from public,anon,authenticated;

create or replace function public.kmt_spark_member_for_student(p_student_id uuid) returns uuid
language sql stable security definer set search_path=public as $$
  select case when l.spark_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then l.spark_user_id::uuid end
  from public.spark_member_links l join public.members m on m.id=(case when l.spark_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then l.spark_user_id::uuid end)
  where l.student_id=p_student_id and l.link_status='verified' and coalesce(m.status,'active')='active'
$$;
revoke all on function public.kmt_spark_member_for_student(uuid) from public,anon,authenticated;

create or replace function public.kmt_record_spark_together(
  p_student_id uuid,p_axis text,p_activity_code text,p_partner_student_id uuid default null,
  p_partner_label text default null,p_note text default null,p_activity_date date default current_date,p_idempotency_key text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid; v_partner uuid; v_row public.spark_together_activities%rowtype;
begin
  if not public.kmt_is_admin() then raise exception '관리자만 함께하는 SPARK를 확인할 수 있습니다.' using errcode='42501'; end if;
  v_actor:=public.kmt_spark_member_for_student(p_student_id);
  if v_actor is null then raise exception '확인 완료된 SPARK 연결이 필요합니다.'; end if;
  if p_partner_student_id is not null then
    v_partner:=public.kmt_spark_member_for_student(p_partner_student_id);
    if v_partner is null then raise exception '함께한 학생도 확인 완료된 SPARK 연결이 필요합니다.'; end if;
    if v_partner=v_actor then raise exception '자기 자신을 함께한 친구로 선택할 수 없습니다.'; end if;
  end if;
  insert into public.spark_together_activities(actor_member_id,axis,activity_code,partner_member_id,partner_label,note,activity_date,idempotency_key,verified_by)
  values(v_actor,p_axis,p_activity_code,v_partner,nullif(btrim(p_partner_label),''),nullif(btrim(p_note),''),coalesce(p_activity_date,current_date),coalesce(nullif(p_idempotency_key,''),gen_random_uuid()::text),auth.uid())
  on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key returning * into v_row;
  insert into public.spark_together_audit(activity_id,actor_member_id,action,snapshot,acted_by) values(v_row.id,v_actor,'create',to_jsonb(v_row),auth.uid());
  perform public.spark_recalculate_together_badges(v_actor);
  return jsonb_build_object('ok',true,'activity_id',v_row.id,'xp_awarded',0);
end $$;

create or replace function public.kmt_void_spark_together(p_activity_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_row public.spark_together_activities%rowtype;
begin
  if not public.kmt_is_admin() then raise exception '관리자만 기록을 취소할 수 있습니다.' using errcode='42501'; end if;
  update public.spark_together_activities set status='void',updated_at=now() where id=p_activity_id and status='verified' returning * into v_row;
  if not found then raise exception '취소할 활동을 찾을 수 없습니다.'; end if;
  insert into public.spark_together_audit(activity_id,actor_member_id,action,snapshot,acted_by) values(v_row.id,v_row.actor_member_id,'void',to_jsonb(v_row),auth.uid());
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.kmt_get_spark_together_roster() returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare v_result jsonb;
begin
  if not public.kmt_is_admin() then raise exception '관리자만 함께하는 SPARK를 조회할 수 있습니다.' using errcode='42501'; end if;
  select coalesce(jsonb_agg(x.obj order by x.student_code),'[]'::jsonb) into v_result from(
    select s.student_code,jsonb_build_object(
      'student_id',s.id,'student_code',s.student_code,'name',s.name,'photo_url',s.photo_url,
      'linked',(m.id is not null),'member_id',m.id,
      'stats',jsonb_build_object(
        'total',(select count(*) from public.spark_together_activities a where a.actor_member_id=m.id and a.status='verified'),
        'personal',(select count(*) from public.spark_together_activities a where a.actor_member_id=m.id and a.status='verified' and a.axis='personal'),
        'family',(select count(*) from public.spark_together_activities a where a.actor_member_id=m.id and a.status='verified' and a.axis='family'),
        'friend',(select count(*) from public.spark_together_activities a where a.actor_member_id=m.id and a.status='verified' and a.axis='friend'),
        'transmissions',(select count(*) from public.spark_together_activities a where a.actor_member_id=m.id and a.status='verified' and a.activity_code in('spark_intro','spark_together','joint_mission','friend_service')),
        'friends',(select count(distinct coalesce(a.partner_member_id::text,a.partner_label)) from public.spark_together_activities a where a.actor_member_id=m.id and a.status='verified' and a.axis='friend'),
        'joint_missions',(select count(*) from public.spark_together_activities a where a.actor_member_id=m.id and a.status='verified' and a.activity_code='joint_mission'),
        'badges',(select count(*) from public.spark_member_together_badges mb where mb.member_id=m.id)),
      'badges',coalesce((select jsonb_agg(jsonb_build_object('code',b.code,'name',b.name,'icon',b.icon) order by b.sort_order) from public.spark_member_together_badges mb join public.spark_together_badges b on b.code=mb.badge_code where mb.member_id=m.id),'[]'::jsonb)
    ) obj
    from public.students s
    left join public.spark_member_links l on l.student_id=s.id and l.link_status='verified' and l.spark_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    left join public.members m on m.id=(case when l.spark_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then l.spark_user_id::uuid end) and coalesce(m.status,'active')='active'
  ) x;
  return jsonb_build_object('version','1.3.0','students',v_result,'xp_policy','NO_REFERRAL_XP');
end $$;

create or replace function public.kmt_get_spark_together_history(p_student_id uuid,p_limit int default 30) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare v_member uuid; v_result jsonb;
begin
  if not public.kmt_is_admin() then raise exception '관리자만 기록을 조회할 수 있습니다.' using errcode='42501'; end if;
  v_member:=public.kmt_spark_member_for_student(p_student_id);
  if v_member is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(x.obj order by x.activity_date desc,x.created_at desc),'[]'::jsonb) into v_result from(
    select a.activity_date,a.created_at,jsonb_build_object('id',a.id,'axis',a.axis,'activity_code',a.activity_code,'partner_label',coalesce(pm.name,a.partner_label),'note',a.note,'status',a.status,'activity_date',a.activity_date) obj
    from public.spark_together_activities a left join public.members pm on pm.id=a.partner_member_id where a.actor_member_id=v_member order by a.activity_date desc,a.created_at desc limit least(greatest(coalesce(p_limit,30),1),100)
  ) x;
  return v_result;
end $$;

revoke all on function public.kmt_record_spark_together(uuid,text,text,uuid,text,text,date,text),public.kmt_void_spark_together(uuid),public.kmt_get_spark_together_roster(),public.kmt_get_spark_together_history(uuid,int) from public,anon;
grant execute on function public.kmt_record_spark_together(uuid,text,text,uuid,text,text,date,text),public.kmt_void_spark_together(uuid),public.kmt_get_spark_together_roster(),public.kmt_get_spark_together_history(uuid,int) to authenticated;

select 'together_tables' check_name,count(*)::text result from information_schema.tables where table_schema='public' and table_name in('spark_together_activities','spark_together_badges','spark_member_together_badges','spark_together_audit')
union all select 'together_badges',count(*)::text from public.spark_together_badges
union all select 'verified_links',count(*)::text from public.spark_member_links where link_status='verified';
