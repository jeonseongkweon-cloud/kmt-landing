-- CLASS v1.2.0 · WORK12
-- 검증된 GLOBAL SPARK 성장정보를 CLASS에 복제하지 않고 관리자에게만 제공합니다.
create or replace function public.kmt_validate_verified_spark_link() returns trigger language plpgsql security definer set search_path=public as $$
declare v_member_id uuid;
begin
  if new.link_status <> 'verified' then return new; end if;
  begin v_member_id:=btrim(new.spark_user_id)::uuid;
  exception when invalid_text_representation then raise exception '확인 완료 연결에는 올바른 SPARK 회원 UUID가 필요합니다.'; end;
  if not exists(select 1 from public.members m where m.id=v_member_id and coalesce(m.status,'active')='active') then
    raise exception '활성 GLOBAL SPARK 회원을 찾을 수 없습니다.';
  end if;
  return new;
end $$;
drop trigger if exists trg_kmt_validate_verified_spark_link on public.spark_member_links;
create trigger trg_kmt_validate_verified_spark_link before insert or update of spark_user_id,link_status on public.spark_member_links for each row execute function public.kmt_validate_verified_spark_link();

create or replace function public.kmt_get_class_spark_dashboard(p_student_ids uuid[]) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_student_id uuid; v_link public.spark_member_links%rowtype; v_member_id uuid; v_item jsonb; v_items jsonb:='[]'::jsonb; v_streak jsonb;
begin
  if not public.kmt_is_admin() then raise exception '관리자만 SPARK 성장정보를 조회할 수 있습니다.' using errcode='42501'; end if;
  foreach v_student_id in array coalesce(p_student_ids,array[]::uuid[]) loop
    begin
      select * into v_link from public.spark_member_links where student_id=v_student_id;
      if not found then
        v_item:=jsonb_build_object('student_id',v_student_id,'linked',false,'reason','NOT_LINKED');
      elsif v_link.link_status<>'verified' then
        v_item:=jsonb_build_object('student_id',v_student_id,'linked',false,'reason','LINK_NOT_VERIFIED','link_status',v_link.link_status);
      else
        begin v_member_id:=btrim(v_link.spark_user_id)::uuid; exception when invalid_text_representation then raise exception 'INVALID_SPARK_MEMBER_ID'; end;
        if not exists(select 1 from public.members m where m.id=v_member_id and coalesce(m.status,'active')='active') then raise exception 'SPARK_MEMBER_NOT_FOUND'; end if;
        perform public.spark_recalculate_member_tier(v_member_id);
        v_streak:=public.spark_recalculate_streak_internal(v_member_id);
        select jsonb_build_object(
          'student_id',v_student_id,'linked',true,'link_status',v_link.link_status,
          'member',jsonb_build_object('id',m.id,'name',m.name,'idp_level',coalesce(oml.level_number,ml.level_number,1),'idp_level_code',coalesce(oml.level_code,ml.level_code,'WHITE')),
          'spark',jsonb_build_object('lifetime_spark',coalesce(sut.lifetime_spark,0),'tier_name',st.name_ko,'tier_icon',st.icon,'tier_color',st.color),
          'missions',jsonb_build_object(
            'completed_total',(select count(*) from public.spark_submissions ss where ss.member_id=m.id and ss.status='approved'),
            'today_total',(select count(*) from public.spark_missions sm join public.spark_mission_rules r on r.mission_id=sm.id where sm.status='published' and sm.safety_review_status='approved' and sm.age_review_status='approved' and (r.active_from is null or now()>=r.active_from) and (r.active_until is null or now()<=r.active_until)),
            'today_completed',(select count(distinct ss.mission_id) from public.spark_submissions ss where ss.member_id=m.id and ss.status='approved' and ss.submitted_at>=date_trunc('day',now()))),
          'streak',coalesce(v_streak,'{}'::jsonb),'badges',jsonb_build_object('available',false,'count',null)
        ) into v_item
        from public.members m
        left join public.organization_member_levels oml on oml.member_id=m.id and oml.organization_code='IDP' and oml.status='active'
        left join public.member_levels ml on ml.member_id=m.id and ml.status='active'
        left join public.spark_user_tiers sut on sut.member_id=m.id
        left join public.spark_tiers st on st.id=sut.tier_id
        where m.id=v_member_id limit 1;
      end if;
    exception when others then v_item:=jsonb_build_object('student_id',v_student_id,'linked',false,'reason','SPARK_UNAVAILABLE');
    end;
    v_items:=v_items||jsonb_build_array(v_item);
  end loop;
  return jsonb_build_object('version','1.2.0','items',v_items);
end $$;
revoke all on function public.kmt_get_class_spark_dashboard(uuid[]) from public;
grant execute on function public.kmt_get_class_spark_dashboard(uuid[]) to authenticated;

select 'work12_function' check_name,count(*)::text result from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='kmt_get_class_spark_dashboard'
union all select 'verified_links',count(*)::text from public.spark_member_links where link_status='verified';
