import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg=window.KMT_ATTENDANCE_CONFIG;
const db=createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,detectSessionInUrl:true,flowType:"pkce"}});
const $=id=>document.getElementById(id);
const SINGLE_OWNER_EMAIL=String(cfg.allowedAdminEmail||"class-admin@ipma.kr").trim().toLowerCase();
const WEEKDAY_KO=["일","월","화","수","목","금","토"];
const params=new URLSearchParams(location.search);
const state={students:[],student:null,records:[],sessionDates:new Set(),month:parseInitialMonth()};

function clean(v){return v==null?"":String(v).trim()}
function escapeHtml(v){return clean(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function localDate(){return new Intl.DateTimeFormat("en-CA",{timeZone:cfg.timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function dateKey(year,month,day){return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`}
function monthKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function parseInitialMonth(){const q=params.get("month");if(/^\d{4}-\d{2}$/.test(q||"")){const [y,m]=q.split("-").map(Number);if(m>=1&&m<=12)return new Date(y,m-1,1)}const now=new Date();return new Date(now.getFullYear(),now.getMonth(),1)}
function enrollment(s){return Array.isArray(s?.enrollments)?(s.enrollments[0]||{}):(s?.enrollments||{})}
function trainingDays(s){return new Set((Array.isArray(enrollment(s).training_days)?enrollment(s).training_days:[]).map(v=>clean(v).replace(/요일$/,"")).filter(Boolean))}
function trainingDaysText(s){const days=trainingDays(s);return ["월","화","수","목","금","토","일"].filter(d=>days.has(d)).join(" · ")}
function statusForRecord(r){if(!r||r.status==="cancelled")return "";if(r.status==="late")return "late";if(r.status==="present")return r.checked_out_at?"checkout":"present";if(r.status==="absent")return "absent";return ""}
function timeText(value){if(!value)return "";return new Intl.DateTimeFormat("ko-KR",{timeZone:cfg.timezone,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(value))}
function monthBounds(){const y=state.month.getFullYear(),m=state.month.getMonth()+1;const last=new Date(y,m,0).getDate();return {start:dateKey(y,m,1),end:dateKey(y,m,last)}}
function updateUrl(){const p=new URLSearchParams(location.search);if(state.student?.id)p.set("student",state.student.id);p.set("month",monthKey(state.month));history.replaceState(null,"",`${location.pathname}?${p.toString()}`)}

function showError(title,message){$("monthlyApp").hidden=true;$("stateScreen").hidden=false;$("stateTitle").textContent=title;$("stateMessage").textContent=message;$("stateBack").hidden=false}

async function boot(){
  try{
    const {data:{session},error}=await db.auth.getSession();
    if(error)throw error;
    if(!session||String(session.user?.email||"").trim().toLowerCase()!==SINGLE_OWNER_EMAIL){location.replace("../");return}
    await loadStudents();
    if(!state.students.length){showError("재원생이 없습니다","원생관리에서 재원 상태를 확인해 주세요.");return}
    const requested=params.get("student");
    state.student=state.students.find(s=>s.id===requested)||state.students[0];
    fillStudentPicker();
    await loadMonth();
    $("stateScreen").hidden=true;$("monthlyApp").hidden=false;
  }catch(error){console.error("[MONTHLY ATTENDANCE]",error);showError("월간 출석기록을 불러오지 못했습니다",error?.message||"잠시 후 다시 시도해 주세요.")}
}

async function loadStudents(){
  const {data,error}=await db.from("students").select("id,student_code,name,enrollments(class_period_id,class_label_raw,training_days,status)").order("name");
  if(error)throw error;
  state.students=(data||[]).filter(s=>clean(enrollment(s).status)==="재원");
}

function fillStudentPicker(){
  const picker=$("studentPicker");picker.innerHTML=state.students.map(s=>`<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join("");
  picker.value=state.student.id;
  picker.onchange=async()=>{state.student=state.students.find(s=>s.id===picker.value)||state.students[0];await loadMonth()};
}

async function loadMonth(){
  const {start,end}=monthBounds();
  const [aRes,sRes]=await Promise.all([
    db.from("attendance").select("id,student_id,attendance_date,status,checked_at,checked_out_at").eq("student_id",state.student.id).gte("attendance_date",start).lte("attendance_date",end).order("checked_at"),
    db.from("class_sessions").select("session_date,status").gte("session_date",start).lte("session_date",end)
  ]);
  if(aRes.error)throw aRes.error;if(sRes.error)throw sRes.error;
  state.records=aRes.data||[];
  state.sessionDates=new Set((sRes.data||[]).map(r=>r.session_date));
  render();updateUrl();
}

function recordMap(){
  const map=new Map();
  state.records.forEach(r=>{if(r.status==="cancelled")return;const old=map.get(r.attendance_date);if(!old||new Date(r.checked_at)>=new Date(old.checked_at))map.set(r.attendance_date,r)});
  return map;
}

function dayStatus(key,weekday,records){
  const r=records.get(key);const explicit=statusForRecord(r);if(explicit)return {status:explicit,record:r,auto:false};
  const today=localDate();
  const scheduled=trainingDays(state.student).has(WEEKDAY_KO[weekday]);
  if(key<today&&scheduled&&state.sessionDates.has(key))return {status:"absent",record:null,auto:true};
  return {status:"",record:null,auto:false};
}

function badgeHtml(info){
  const r=info.record;
  if(info.status==="present")return `<span class="attendance-badge present"><b>✓</b> 출석${r?` <small>${escapeHtml(timeText(r.checked_at))}</small>`:""}</span>`;
  if(info.status==="late")return `<span class="attendance-badge late"><b>◷</b> 지각${r?` <small>${escapeHtml(timeText(r.checked_at))}</small>`:""}</span>`;
  if(info.status==="checkout")return `<span class="attendance-badge checkout"><b>→</b> 귀가${r?.checked_out_at?` <small>${escapeHtml(timeText(r.checked_out_at))}</small>`:""}</span>`;
  if(info.status==="absent")return `<span class="attendance-badge absent"><b>×</b> 결석${info.auto?` <small>미출석</small>`:""}</span>`;
  return "";
}

function render(){
  const y=state.month.getFullYear(),m=state.month.getMonth()+1;
  $("monthTitle").textContent=`${y}년 ${m}월`;
  $("studentName").textContent=state.student.name;
  const e=enrollment(state.student),days=trainingDaysText(state.student),meta=[clean(e.class_label_raw),days?`수련요일 ${days}`:""] .filter(Boolean);
  $("studentInfo").textContent=meta.join(" | ");
  $("studentPicker").value=state.student.id;

  const records=recordMap();const first=new Date(y,m-1,1),lastDay=new Date(y,m,0).getDate(),leading=first.getDay();
  const cells=[];const counts={present:0,late:0,checkout:0,absent:0};
  for(let i=0;i<leading;i++)cells.push('<div class="calendar-day outside" aria-hidden="true"></div>');
  for(let day=1;day<=lastDay;day++){
    const d=new Date(y,m-1,day),weekday=d.getDay(),key=dateKey(y,m,day),info=dayStatus(key,weekday,records);
    if(info.status)counts[info.status]++;
    const classes=["calendar-day",weekday===0?"sunday":"",weekday===6?"saturday":"",key===localDate()?"today":""].filter(Boolean).join(" ");
    cells.push(`<div class="${classes}" data-date="${key}"><span class="day-number">${day}</span>${badgeHtml(info)}</div>`);
  }
  const total=leading+lastDay,trailing=(7-total%7)%7;for(let i=0;i<trailing;i++)cells.push('<div class="calendar-day outside" aria-hidden="true"></div>');
  $("calendarGrid").innerHTML=cells.join("");
  $("presentCount").textContent=counts.present+counts.checkout;
  $("lateCount").textContent=counts.late;
  $("checkoutCount").textContent=counts.checkout;
  $("absentCount").textContent=counts.absent;
}

async function moveMonth(delta){state.month=new Date(state.month.getFullYear(),state.month.getMonth()+delta,1);await loadMonth()}
$("prevMonth").onclick=()=>moveMonth(-1).catch(e=>showError("월간 출석기록을 불러오지 못했습니다",e.message));
$("nextMonth").onclick=()=>moveMonth(1).catch(e=>showError("월간 출석기록을 불러오지 못했습니다",e.message));

boot();
