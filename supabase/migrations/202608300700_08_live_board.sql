-- 계명태권도 CLASS SYSTEM v0.7.0
-- Supabase LIVE BOARD 안전 조회 함수

create or replace function public.kmt_live_board()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  result jsonb;
  today_kst date := timezone('Asia/Seoul', now())::date;
  month_start date := date_trunc('month', timezone('Asia/Seoul', now()))::date;
begin
  if not public.kmt_is_admin() then
    raise exception '관리자 권한이 필요합니다.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'month_label', extract(month from today_kst)::integer,
    'growth_ranking', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.points desc, x.name)
      from (
        select s.id student_id, s.name, s.photo_url photo, coalesce(sp.balance,0) points
        from public.students s
        join public.enrollments e on e.student_id=s.id and e.status='재원'
        left join public.student_points sp on sp.student_id=s.id and sp.point_type='growth'
        order by coalesce(sp.balance,0) desc, s.name
        limit 10
      ) x
    ), '[]'::jsonb),
    'attendance_ranking', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.total desc, x.name)
      from (
        select s.id student_id, s.name, s.photo_url photo, count(a.id)::integer total
        from public.students s
        join public.enrollments e on e.student_id=s.id and e.status='재원'
        join public.attendance a on a.student_id=s.id and a.status in ('present','late')
          and a.attendance_date between month_start and today_kst
        group by s.id,s.name,s.photo_url
        order by count(a.id) desc,s.name
        limit 10
      ) x
    ), '[]'::jsonb),
    'star_ranking', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.total desc, x.name)
      from (
        select s.id student_id,s.name,s.photo_url photo,count(se.id)::integer total
        from public.students s
        join public.enrollments e on e.student_id=s.id and e.status='재원'
        join public.star_events se on se.student_id=s.id
        join public.class_sessions cs on cs.id=se.session_id and cs.session_date between month_start and today_kst
        group by s.id,s.name,s.photo_url
        order by count(se.id) desc,s.name
        limit 10
      ) x
    ), '[]'::jsonb),
    'champions', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.selected_at desc)
      from (
        select c.id,c.title,s.name,s.photo_url photo,c.selected_at
        from public.champions c
        join public.class_sessions cs on cs.id=c.session_id and cs.session_date=today_kst
        join public.students s on s.id=c.student_id
        order by c.selected_at desc
        limit 8
      ) x
    ), '[]'::jsonb),
    'new_students', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.joined_on desc,x.name)
      from (
        select s.name,e.joined_on
        from public.students s join public.enrollments e on e.student_id=s.id
        where e.status='재원' and e.joined_on between month_start and today_kst
        order by e.joined_on desc,s.name limit 20
      ) x
    ), '[]'::jsonb),
    'today_plan', coalesce((
      select jsonb_build_object('period',cp.name,'steps',p.steps,'current_step',p.current_step)
      from public.class_sessions cs
      join public.class_periods cp on cp.id=cs.class_period_id
      join public.class_plans p on p.session_id=cs.id
      where cs.session_date=today_kst
      order by cs.started_at desc limit 1
    ), '{}'::jsonb),
    'today_missions', coalesce((
      select jsonb_agg(jsonb_build_object('title',m.title,'status',m.status) order by m.created_at)
      from public.class_missions m join public.class_sessions cs on cs.id=m.session_id
      where cs.session_date=today_kst and m.status<>'cancelled' and m.student_id is null
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke all on function public.kmt_live_board() from public, anon;
grant execute on function public.kmt_live_board() to authenticated;

select 'live_board_function_ready' check_name;
