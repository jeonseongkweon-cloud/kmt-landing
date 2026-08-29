-- 계명태권도 CLASS SYSTEM v0.9.0
-- WORK9: Android SIM 문자 발신기 전용 RPC

create or replace function public.kmt_sms_heartbeat(
  p_device_id text,
  p_device_name text default null,
  p_app_version text default '0.9.0',
  p_enabled boolean default true
)
returns public.sms_sender_status
language plpgsql security invoker set search_path=public as $$
declare v_row public.sms_sender_status;
begin
  if not public.kmt_is_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  insert into public.sms_sender_status(id,device_id,device_name,is_enabled,last_seen_at,app_version)
  values(1,left(p_device_id,120),left(p_device_name,120),p_enabled,now(),left(p_app_version,30))
  on conflict(id) do update set device_id=excluded.device_id,device_name=excluded.device_name,
    is_enabled=excluded.is_enabled,last_seen_at=excluded.last_seen_at,app_version=excluded.app_version,
    updated_at=timezone('utc',now()) returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.kmt_sms_claim_next(p_device_id text)
returns table(id uuid,recipient_phone text,message text,student_name text,attempts smallint)
language plpgsql security invoker set search_path=public as $$
declare v_id uuid;
begin
  if not public.kmt_is_admin() then raise exception '관리자 권한이 필요합니다.'; end if;

  -- 이미 발송됐을 가능성이 있으므로 자동 재전송하지 않고 수동 확인 대상으로 둔다.
  update public.sms_outbox set status='failed',locked_at=null,
    last_error='발송결과 미확인: 중복 방지를 위해 수동 재전송 필요'
  where status='sending' and locked_at < now()-interval '5 minutes';

  select o.id into v_id
  from public.sms_outbox o
  where o.status='pending' and o.next_attempt_at<=now()
  order by o.created_at
  for update skip locked limit 1;

  if v_id is null then return; end if;

  update public.sms_outbox o set status='sending',attempts=o.attempts+1,
    locked_at=now(),locked_by=left(p_device_id,120),last_error=null
  where o.id=v_id;

  return query select o.id,o.recipient_phone,o.message,s.name,o.attempts
  from public.sms_outbox o join public.students s on s.id=o.student_id where o.id=v_id;
end;
$$;

create or replace function public.kmt_sms_finish(
  p_outbox_id uuid,
  p_device_id text,
  p_success boolean,
  p_error text default null
)
returns public.sms_outbox
language plpgsql security invoker set search_path=public as $$
declare v_row public.sms_outbox;
begin
  if not public.kmt_is_admin() then raise exception '관리자 권한이 필요합니다.'; end if;
  update public.sms_outbox set
    status=case when p_success then 'sent' else 'failed' end,
    sent_at=case when p_success then now() else null end,
    last_error=case when p_success then null else left(coalesce(p_error,'발송 실패'),500) end,
    locked_at=null
  where id=p_outbox_id and status='sending' and locked_by=left(p_device_id,120)
  returning * into v_row;
  if v_row.id is null then raise exception '잠긴 문자 요청을 찾을 수 없습니다.'; end if;
  if p_success then update public.sms_sender_status set last_sent_at=now(),last_seen_at=now() where id=1; end if;
  return v_row;
end;
$$;

revoke all on function public.kmt_sms_heartbeat(text,text,text,boolean) from public;
revoke all on function public.kmt_sms_claim_next(text) from public;
revoke all on function public.kmt_sms_finish(uuid,text,boolean,text) from public;
grant execute on function public.kmt_sms_heartbeat(text,text,text,boolean) to authenticated;
grant execute on function public.kmt_sms_claim_next(text) to authenticated;
grant execute on function public.kmt_sms_finish(uuid,text,boolean,text) to authenticated;

select 'android_sender_rpc_ready' as check_name,
  count(*)::text as result
from pg_proc where pronamespace='public'::regnamespace
and proname in ('kmt_sms_heartbeat','kmt_sms_claim_next','kmt_sms_finish');
