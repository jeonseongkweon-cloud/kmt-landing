import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.KMT_ADMIN_CONFIG;

export async function loadClassTuitionSource(){
  if(!cfg?.supabaseUrl || !cfg?.supabasePublishableKey){
    return { ok:false, reason:'config-missing', students:[] };
  }

  const db = createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth:{ persistSession:true, detectSessionInUrl:false, autoRefreshToken:true }
  });

  const { data:{ session } } = await db.auth.getSession();
  if(!session){
    return { ok:false, reason:'no-session', students:[] };
  }

  const { data, error } = await db
    .from('students')
    .select(`
      id,
      student_code,
      name,
      guardians(id,position,name,phone,is_primary,sms_enabled),
      enrollments(id,status,status_changed_on,monthly_fee,fee_due_day,class_period_id,class_label_raw,class_periods(id,code,name))
    `)
    .order('student_code');

  if(error){
    return { ok:false, reason:'query-failed', error:error.message, students:[] };
  }

  return {
    ok:true,
    students:(data||[]).map(normalizeStudent)
  };
}

function first(v){ return Array.isArray(v) ? (v[0] || null) : v; }
function clean(v){ return v == null ? '' : String(v).trim(); }
function statusToTuition(v){
  const s=clean(v);
  if(['휴원','휴관'].includes(s)) return 'paused';
  if(['퇴관','퇴원','중단'].includes(s)) return 'withdrawn';
  return 'active';
}
function normalizeStudent(s){
  const enrollment = first(s.enrollments) || {};
  const period = first(enrollment.class_periods) || {};
  const guardians = (s.guardians || [])
    .map(g=>({
      id:g.id,
      name:clean(g.name),
      phone:clean(g.phone),
      isPrimary:Boolean(g.is_primary),
      smsEnabled:Boolean(g.sms_enabled),
      position:Number(g.position || 0)
    }))
    .sort((a,b)=>Number(b.isPrimary)-Number(a.isPrimary) || a.position-b.position);

  return {
    studentId:s.id,
    studentCode:clean(s.student_code),
    name:clean(s.name),
    tuitionStatus:statusToTuition(enrollment.status),
    rawEnrollmentStatus:clean(enrollment.status),
    statusChangedOn:enrollment.status_changed_on || null,
    monthlyFee:Number(enrollment.monthly_fee || 0),
    dueDay:enrollment.fee_due_day == null ? null : Number(enrollment.fee_due_day),
    classPeriodId:enrollment.class_period_id || null,
    classLabel:clean(period.name || enrollment.class_label_raw),
    guardians
  };
}

export function buildOneStudentHouseholds(students){
  return students.map(s=>({
    id:`class-${s.studentId}`,
    classStudentIds:[s.studentId],
    studentCodes:[s.studentCode],
    name:s.name,
    students:[s.name],
    parents:s.guardians.map(g=>({name:g.name,phone:g.phone,guardianId:g.id,smsEnabled:g.smsEnabled,isPrimary:g.isPrimary})),
    payers:[],
    dueDay:s.dueDay,
    status:s.tuitionStatus,
    payments:{},
    messages:[],
    dueHistory:[],
    classLabel:s.classLabel,
    source:'class-readonly'
  }));
}
