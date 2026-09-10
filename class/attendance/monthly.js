import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg=window.KMT_ATTENDANCE_CONFIG;
const db=createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,detectSessionInUrl:true,flowType:"pkce"}});
const $=id=>document.getElementById(id);
const SINGLE_OWNER_EMAIL="jeonseongkweon@gmail.com";
const WEEKDAY_KO=["일","월","화","수","목","금","토"];
const params=new URLSearchParams(location.search);
const state={students:[],student:null,records:[],sessionStatusByDate:new Map(),month:parseInitialMonth()};

function clean(v){return v==null?"":String(v).trim()}
function escapeHtml(v){return clean(v).replace(/[&<>'\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'\"':"&quot;"}[c]))}
function localDate(){return new Intl.DateTimeFormat("en-CA",{timeZone:cfg.timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function dateKey(year,month,day){return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`}
function monthKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function parseInitialMonth(){const q=params.get("month");if(/^\d{4}-\d{2}$/.test(q||"")){const [y,m]=q.split("-").map(Number);if(m>=1&&m<=12)return new Date(y,m-1,1)}const now=new Date();return new Date(now.getFullYear(),now.getMonth(),1)}
function enrollment(s){return Array.isArray(s?.enrollments)?(s.enrollments[0]||{}):(s?.enrollments||{})}
function trainingDays(s){return new Set((Array.isArray(enrollment(s).training_days)?enrollment(s).training_days:[]).map(v=>clean(v).replace(/요일$/,"")).filter(Boolean))}
function trainingDaysText(s){const days=trainingDays(s);return ["월","화","수","목","금","토","일"].filter(d=>days.has(d)).join(" · ")}
function timeText(value){if(!value)return "";return new Intl.DateTimeFormat("ko-KR",{timeZone:cfg.timezone,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(value))}
function monthBounds(){const y=state.month.getFullYear(),m=state.month.getMonth()+1;const last=new Date(y,m,0).getDate();return {start:dateKey(y,m,1),end:dateKey(y,m,last)}}
function updateUrl(){const p=new URLSearchParams(location.search);if(state.student?.id)p.set("student",state.student.id);p.set("month",monthKey(state.month));history.replaceState(null,"",`${location.pathname}?${p.toString()}`)}
function showError(title,message){$("monthlyApp").hidden=true;$("stateScreen").hidden=false;$("stateTitle").textContent=title;$("stateMessage").textContent=message;$("stateBack").hidden=false}

async function boot(){
  try{
    const {data:{session},error}=await db.auth.getSession();
    if(error)throw error;
    if(!session){showError("로그인이 필요합니다","CLASS 출석판에 로그인한 뒤 다시 월간출석을 열어 주세요.");return}
    if(String(session.user?.email||"").trim().toLowerCase()!==SINGLE_OWNER_EMAIL){showError("관리자 계정 확인이 필요합니다","현재 CLASS 운영 관리자 계정으로 로그인되어 있지 않습니다.");return}
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
  const picker=$("studentPicker");
  picker.innerHTML=state.students.map(s=>`<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join("");
  picker.value=state.student.id;
  picker.onchange=async()=>{state.student=state.students.find(s=>s.id===picker.value)||state.students[0];await loadMonth()};
}

async function loadMonth(){
  const {start,end}=monthBounds();
  const [aRes,sRes]=await Promise.all([
    db.from("attendance").select("id,student_id,attendance_date,status,checked_at,checked_out_at").eq("student_id",state.student.id).gte("attendance_date",start).lte("attendance_date",end).order("checked_at"),
    db.from("class_sessions").select("session_date,status").gte("session_date",start).lte("session_date",end)
  ]);
  if(aRes.error)throw aRes.error;
  if(sRes.error)throw sRes.error;
  state.records=aRes.data||[];
  state.sessionStatusByDate=new Map();
  (sRes.data||[]).forEach(r=>{
    const date=clean(r.session_date),status=clean(r.status).toLowerCase();
    if(!date)return;
    // 실제로 수업판이 열린 날(open) 또는 종료된 날(closed)만 수업일로 인정한다.
    if(status==="open"||status==="closed")state.sessionStatusByDate.set(date,status);
  });
  render();
  updateUrl();
}

function recordMap(){
  const map=new Map();
  state.records.forEach(r=>{
    if(r.status==="cancelled")return;
    const old=map.get(r.attendance_date);
    if(!old||new Date(r.checked_at)>=new Date(old.checked_at))map.set(r.attendance_date,r);
  });
  return map;
}

function dayInfo(key,weekday,records){
  const r=records.get(key);
  // 실제 저장된 출결 기록이 있으면 그 기록을 최우선으로 사용한다.
  if(r){
    if(r.status==="present")return {status:"present",record:r,auto:false};
    if(r.status==="late")return {status:"late",record:r,auto:false};
    if(r.status==="absent")return {status:"absent",record:r,auto:false};
  }

  // 자동 결석은 오판을 막기 위해 아래 세 조건을 모두 만족할 때만 화면에 표시한다.
  // 1) 이미 지난 날짜, 2) 학생의 등록 수련요일, 3) 실제 CLASS 수업판이 열린 날.
  const scheduled=trainingDays(state.student).has(WEEKDAY_KO[weekday]);
  const actualClassDay=state.sessionStatusByDate.has(key);
  if(key<localDate()&&scheduled&&actualClassDay)return {status:"absent",record:null,auto:true};
  return {status:"",record:null,auto:false};
}

function badgeHtml(info){
  const r=info.record;
  if(info.status==="present"){
    const checkout=r?.checked_out_at?`<span class="attendance-badge checkout"><b>→</b> 귀가 <small>${escapeHtml(timeText(r.checked_out_at))}</small></span>`:"";
    return `<span class="attendance-badge present"><b>✓</b> 출석 <small>${escapeHtml(timeText(r.checked_at))}</small></span>${checkout}`;
  }
  if(info.status==="late"){
    const checkout=r?.checked_out_at?`<span class="attendance-badge checkout"><b>→</b> 귀가 <small>${escapeHtml(timeText(r.checked_out_at))}</small></span>`:"";
    return `<span class="attendance-badge late"><b>◷</b> 지각 <small>${escapeHtml(timeText(r.checked_at))}</small></span>${checkout}`;
  }
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

  const records=recordMap();
  const first=new Date(y,m-1,1),lastDay=new Date(y,m,0).getDate(),leading=first.getDay();
  const cells=[];
  const counts={present:0,late:0,checkout:0,absent:0};
  for(let i=0;i<leading;i++)cells.push('<div class="calendar-day outside" aria-hidden="true"></div>');
  for(let day=1;day<=lastDay;day++){
    const d=new Date(y,m-1,day),weekday=d.getDay(),key=dateKey(y,m,day),info=dayInfo(key,weekday,records);
    if(info.status==="present")counts.present++;
    if(info.status==="late")counts.late++;
    if(info.status==="absent")counts.absent++;
    if(info.record?.checked_out_at&&["present","late"].includes(info.status))counts.checkout++;
    const classes=["calendar-day",weekday===0?"sunday":"",weekday===6?"saturday":"",key===localDate()?"today":""].filter(Boolean).join(" ");
    cells.push(`<div class="${classes}" data-date="${key}"><span class="day-number">${day}</span>${badgeHtml(info)}</div>`);
  }
  const total=leading+lastDay,trailing=(7-total%7)%7;
  for(let i=0;i<trailing;i++)cells.push('<div class="calendar-day outside" aria-hidden="true"></div>');
  $("calendarGrid").innerHTML=cells.join("");
  $("presentCount").textContent=counts.present;
  $("lateCount").textContent=counts.late;
  $("checkoutCount").textContent=counts.checkout;
  $("absentCount").textContent=counts.absent;
  const note=$("calendarNote");
  if(note)note.textContent="실제 저장된 출결기록을 우선 표시합니다. 기록이 없는 과거 날짜는 등록 수련요일이면서 실제 CLASS 수업판이 열린 날에만 미출석(결석)으로 표시합니다.";
}

async function moveMonth(delta){state.month=new Date(state.month.getFullYear(),state.month.getMonth()+delta,1);await loadMonth()}
$("prevMonth").onclick=()=>moveMonth(-1).catch(e=>showError("월간 출석기록을 불러오지 못했습니다",e.message));
$("nextMonth").onclick=()=>moveMonth(1).catch(e=>showError("월간 출석기록을 불러오지 못했습니다",e.message));

boot();
