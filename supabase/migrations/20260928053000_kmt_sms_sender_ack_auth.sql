-- The Android sender uses an authenticated administrator JWT. Remove the
-- historical anon EXECUTE grant; keep the existing kmt_is_admin() checks.
revoke execute on function public.kmt_sms_heartbeat(text,text,text,boolean) from anon;
revoke execute on function public.kmt_sms_claim_next(text) from anon;
revoke execute on function public.kmt_sms_finish(uuid,text,boolean,text) from anon;

-- A response can be lost after a successful commit. Let the same device
-- acknowledge its already-finalized result without sending another SMS.
create or replace function public.kmt_sms_finish(
  p_outbox_id uuid, p_device_id text, p_success boolean, p_error text default null
) returns public.sms_outbox
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
  if v_row.id is null then
    select * into v_row from public.sms_outbox
    where id=p_outbox_id and locked_by=left(p_device_id,120)
      and ((p_success and status='sent') or (not p_success and status='failed'
        and last_error is distinct from '발송결과 미확인: 중복 방지를 위해 수동 재전송 필요'));
    if v_row.id is null then raise exception '잠긴 문자 요청을 찾을 수 없습니다.'; end if;
  end if;
  if p_success then update public.sms_sender_status set
    last_sent_at=coalesce(v_row.sent_at,now()),last_seen_at=now() where id=1; end if;
  return v_row;
end;
$$;
