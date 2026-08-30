-- CLASS v1.6.0 · NEXT-02 MULTI STAFF & PERMISSION SYSTEM
create table if not exists public.kmt_staff_members (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  role text not null check(role in ('owner','master','instructor','assistant')),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default timezone('utc',now()),
  updated_at timestamptz not null default timezone('utc',now())
);

insert into public.kmt_staff_members(email,display_name,role,is_active)
select email,coalesce(display_name,'전성권 관장'),'owner',true from public.kmt_admins
where lower(email)='jeonseongkweon@gmail.com'
on conflict(email) do update set role='owner',is_active=true,updated_at=timezone('utc',now());

create table if not exists public.kmt_staff_audit_log(
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  target_staff_id uuid references public.kmt_staff_members(id) on delete set null,
  target_email text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc',now())
);

create or replace function public.kmt_my_staff_role() returns text language sql stable security definer set search_path=public,pg_temp as $$
 select s.role from public.kmt_staff_members s where lower(s.email)=lower(coalesce(auth.jwt()->>'email','')) and s.is_active limit 1;
$$;
create or replace function public.kmt_is_owner() returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select coalesce(public.kmt_my_staff_role()='owner',false); $$;
create or replace function public.kmt_is_staff() returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select public.kmt_my_staff_role() is not null; $$;
create or replace function public.kmt_has_permission(p_permission text) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 with r as (select public.kmt_my_staff_role() role)
 select case p_permission
   when 'staff_manage' then role='owner'
   when 'student_manage' then role in ('owner','master')
   when 'sms_manage' then role in ('owner','master')
   when 'attendance' then role in ('owner','master','instructor','assistant')
   when 'star' then role in ('owner','master','instructor')
   when 'mission' then role in ('owner','master','instructor')
   when 'spark' then role in ('owner','master','instructor')
   when 'mvp' then role in ('owner','master','instructor')
   when 'class_tools' then role in ('owner','master','instructor')
   when 'dashboard' then role in ('owner','master','instructor','assistant')
   when 'audit_read' then role in ('owner','master')
   else false end from r;
$$;
create or replace function public.kmt_get_my_staff_profile()
returns table(id uuid,email text,display_name text,role text,is_active boolean)
language sql stable security definer set search_path=public,pg_temp as $$
 select s.id,s.email,s.display_name,s.role,s.is_active from public.kmt_staff_members s where lower(s.email)=lower(coalesce(auth.jwt()->>'email','')) limit 1;
$$;

-- legacy admin check remains strict: OWNER only (plus app_metadata super/admin)
create or replace function public.kmt_is_admin() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(auth.jwt()->'app_metadata'->>'role','') in ('admin','super_admin') or coalesce(public.kmt_my_staff_role() in ('owner','master','instructor'),false);
$$;

create or replace function public.kmt_list_staff()
returns table(id uuid,email text,display_name text,role text,is_active boolean,created_at timestamptz,updated_at timestamptz)
language plpgsql security definer set search_path=public,pg_temp as $$ begin
 if not public.kmt_has_permission('staff_manage') then raise exception '관장 권한이 필요합니다.' using errcode='42501'; end if;
 return query select s.id,s.email,s.display_name,s.role,s.is_active,s.created_at,s.updated_at from public.kmt_staff_members s order by case s.role when 'owner' then 1 when 'master' then 2 when 'instructor' then 3 else 4 end,s.display_name,s.email;
end $$;

create or replace function public.kmt_save_staff(p_email text,p_display_name text,p_role text,p_is_active boolean default true)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_email text:=lower(btrim(coalesce(p_email,''))); begin
 if not public.kmt_has_permission('staff_manage') then raise exception '관장 권한이 필요합니다.' using errcode='42501'; end if;
 if v_email='' or position('@' in v_email)=0 then raise exception '올바른 이메일을 입력해 주세요.'; end if;
 if p_role not in ('owner','master','instructor','assistant') then raise exception '허용되지 않은 역할입니다.'; end if;
 insert into public.kmt_staff_members(email,display_name,role,is_active) values(v_email,nullif(btrim(coalesce(p_display_name,'')),''),p_role,coalesce(p_is_active,true))
 on conflict(email) do update set display_name=excluded.display_name,role=excluded.role,is_active=excluded.is_active,updated_at=timezone('utc',now()) returning id into v_id;
 insert into public.kmt_staff_audit_log(actor_user_id,actor_email,action,target_staff_id,target_email,detail)
 values(auth.uid(),auth.jwt()->>'email','staff_saved',v_id,v_email,jsonb_build_object('role',p_role,'is_active',coalesce(p_is_active,true)));
 return v_id;
end $$;

create or replace function public.kmt_set_staff_active(p_staff_id uuid,p_is_active boolean)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_target public.kmt_staff_members%rowtype; begin
 if not public.kmt_has_permission('staff_manage') then raise exception '관장 권한이 필요합니다.' using errcode='42501'; end if;
 select * into strict v_target from public.kmt_staff_members where id=p_staff_id for update;
 if v_target.role='owner' and not p_is_active and (select count(*) from public.kmt_staff_members where role='owner' and is_active)=1 then raise exception '마지막 OWNER 계정은 비활성화할 수 없습니다.'; end if;
 update public.kmt_staff_members set is_active=p_is_active,updated_at=timezone('utc',now()) where id=p_staff_id;
 insert into public.kmt_staff_audit_log(actor_user_id,actor_email,action,target_staff_id,target_email,detail) values(auth.uid(),auth.jwt()->>'email','staff_active_changed',p_staff_id,v_target.email,jsonb_build_object('is_active',p_is_active));
 return true;
end $$;

alter table public.kmt_staff_members enable row level security;
alter table public.kmt_staff_audit_log enable row level security;
drop policy if exists kmt_staff_self_read on public.kmt_staff_members;
create policy kmt_staff_self_read on public.kmt_staff_members for select to authenticated using(lower(email)=lower(coalesce(auth.jwt()->>'email','')) or public.kmt_is_owner());
drop policy if exists kmt_staff_audit_read on public.kmt_staff_audit_log;
create policy kmt_staff_audit_read on public.kmt_staff_audit_log for select to authenticated using(public.kmt_has_permission('audit_read'));

grant execute on function public.kmt_my_staff_role() to authenticated;
grant execute on function public.kmt_is_owner() to authenticated;
grant execute on function public.kmt_is_staff() to authenticated;
grant execute on function public.kmt_has_permission(text) to authenticated;
grant execute on function public.kmt_get_my_staff_profile() to authenticated;
grant execute on function public.kmt_list_staff() to authenticated;
grant execute on function public.kmt_save_staff(text,text,text,boolean) to authenticated;
grant execute on function public.kmt_set_staff_active(uuid,boolean) to authenticated;
grant select on public.kmt_staff_members, public.kmt_staff_audit_log to authenticated;

-- Operational RLS: add role-specific access without removing OWNER policies.
drop policy if exists attendance_staff_all on public.attendance;
create policy attendance_staff_all on public.attendance for all to authenticated using(public.kmt_has_permission('attendance')) with check(public.kmt_has_permission('attendance'));
drop policy if exists class_sessions_staff_all on public.class_sessions;
create policy class_sessions_staff_all on public.class_sessions for all to authenticated using(public.kmt_has_permission('attendance')) with check(public.kmt_has_permission('attendance'));
drop policy if exists star_events_staff_all on public.star_events;
create policy star_events_staff_all on public.star_events for all to authenticated using(public.kmt_has_permission('star')) with check(public.kmt_has_permission('star'));
drop policy if exists praise_events_staff_all on public.praise_events;
create policy praise_events_staff_all on public.praise_events for all to authenticated using(public.kmt_has_permission('star')) with check(public.kmt_has_permission('star'));
drop policy if exists champions_staff_all on public.champions;
create policy champions_staff_all on public.champions for all to authenticated using(public.kmt_has_permission('mvp')) with check(public.kmt_has_permission('mvp'));
drop policy if exists star_categories_staff_read on public.star_categories;
create policy star_categories_staff_read on public.star_categories for select to authenticated using(public.kmt_is_staff());
drop policy if exists class_plans_staff_all on public.class_plans;
create policy class_plans_staff_all on public.class_plans for all to authenticated using(public.kmt_has_permission('class_tools')) with check(public.kmt_has_permission('class_tools'));
drop policy if exists class_missions_staff_all on public.class_missions;
create policy class_missions_staff_all on public.class_missions for all to authenticated using(public.kmt_has_permission('mission')) with check(public.kmt_has_permission('mission'));
drop policy if exists team_scores_staff_all on public.team_scores;
create policy team_scores_staff_all on public.team_scores for all to authenticated using(public.kmt_has_permission('class_tools')) with check(public.kmt_has_permission('class_tools'));
drop policy if exists media_library_staff_read on public.media_library;
create policy media_library_staff_read on public.media_library for select to authenticated using(public.kmt_is_staff());

select 'next02_staff_ready' check_name,count(*) current_staff from public.kmt_staff_members;
