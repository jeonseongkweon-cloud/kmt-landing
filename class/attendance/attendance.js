import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SINGLE_OWNER_EMAIL="class-admin@ipma.kr";
const isSingleOwner=session=>String(session?.user?.email||"").trim().toLowerCase()===SINGLE_OWNER_EMAIL;

const cfg=window.KMT_ATTENDANCE_CONFIG;
const db=createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,detectSessionInUrl:true,flowType:"pkce"}});
const $=id=>document.getElementById(id);
const state={periods:[],students:[],session:null,records:[],smsRows:[],period:null,attendedOnly:false,realtimeChannel:null,realtimeTimer:null};
const statusText={present:"출석",late:"출석",absent:"결석",cancelled:"미처리",checked_out:"귀가"};

function clean(v){return v==null?"":String(v).trim()}
function escapeHtml(v){return clean(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function localDate(){return new Intl.DateTimeFormat("en-CA",{timeZone:cfg.timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function localTime(value=new Date()){return new Intl.DateTimeFormat("ko-KR",{timeZone:cfg.timezone,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(value))}
function recordFor(id){return state.records.filter(r=>r.student_id===id).sort((a,b)=>new Date(b.checked_at)-new Date(a.checked_at))[0]}
function displayStatus(r){return r?.checked_out_at&&["present","late"].includes(r.status)?"checked_out":r?.status==="cancelled"?"":(r?.status||"")}
function smsFor(attendanceId){return state.smsRows.filter(r=>r.attendance_id===attendanceId)}
function smsLabel(rows){if(!rows.length)return "문자 대상 없음";if(rows.some(r=>r.status==="failed"))return "문자 실패";if(rows.every(r=>r.status==="sent"))return "문자 완료";if(rows.some(r=>r.status==="sending"))return "문자 발송중";return "문자 대기"}
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove("show"),1800)}
function setSaving(text){$("saveStatus").textContent=text}
function phoneDigits(v){return clean(v).replace(/\D/g,"")}
function sharedPhoneStudents(student){
  const phones=new Set((student.guardians||[]).filter(g=>g.sms_enabled).map(g=>phoneDigits(g.phone)).filter(p=>p.length>=10));
  if(!phones.size)return [];
  return state.students.filter(s=>s.id!==student.id&&(s.guardians||[]).some(g=>g.sms_enabled&&phones.has(phoneDigits(g.phone))));
}

function startClock(){const tick=()=>{const d=new Date();$("todayLabel").textContent=new Intl.DateTimeFormat("ko-KR",{timeZone:cfg.timezone,year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(d);$("clockLabel").textContent=localTime(d)};tick();setInterval(tick,15000)}

async function login(){ location.replace("../"); }

async function boot(){
  const {data:{session},error}=await db.auth.getSession();
  if(error){ toast(`로그인 확인 실패: ${error.message}`); return; }
  if(!session || !isSingleOwner(session)){ location.replace("../"); return; }
  $("loginScreen").hidden=true;
  $("attendanceApp").hidden=false;
  startClock();
  await loadPeriods();
}

async function loadPeriods(){
  const [pRes,sRes]=await Promise.all([
    db.from("class_periods").select("id,code,name,start_time,end_time,sort_order").eq("is_active",true).order("sort_order"),
    db.from("students").select("id,student_code,name,photo_url,guardians(phone,sms_enabled),enrollments(class_period_id,class_label_raw,training_days,status)").order("student_code")
  ]);
  if(pRes.error||sRes.error){toast(`자료 조회 실패: ${(pRes.error||sRes.error).message}`);return}
  state.periods=pRes.data||[];state.students=(sRes.data||[]).filter(s=>(s.enrollments?.[0]?.status||s.enrollments?.status)==="재원");
  await openUnifiedBoard();
}

function enrollment(s){return Array.isArray(s.enrollments)?(s.enrollments[0]||{}):(s.enrollments||{})}
function trainingDaysText(s){
  const values=Array.isArray(enrollment(s).training_days)?enrollment(s).training_days:[];
  const days=[...new Set(values.map(v=>clean(v).replace(/요일$/,"")).filter(Boolean))];
  if(!days.length)return "";
  const order=["월","화","수","목","금","토","일"];
  const sorted=[...order.filter(day=>days.includes(day)),...days.filter(day=>!order.includes(day))];
  if(["월","화","수","목","금"].every(day=>sorted.includes(day)))return "";
  return sorted.join(" · ");
}
function periodOrder(s){const id=enrollment(s).class_period_id,index=state.periods.findIndex(p=>p.id===id);return index<0?999:index}
function sortedStudents(){return [...state.students].sort((a,b)=>periodOrder(a)-periodOrder(b)||a.name.localeCompare(b.name,"ko"))}
async function openUnifiedBoard(){
  const period=state.periods.find(p=>p.code==="OTHER")||state.periods[0];
  if(!period){toast("활성 수업부가 없습니다.");return}
  state.period=period;setSaving("오늘 수업을 여는 중...");
  let {data:existing,error:findError}=await db.from("class_sessions").select("*").eq("session_date",localDate()).eq("class_period_id",period.id).maybeSingle();
  if(findError){toast(findError.message);return}
  if(!existing){const {data,error}=await db.from("class_sessions").insert({session_date:localDate(),class_period_id:period.id,status:"open"}).select().single();if(error){toast(error.message);return}existing=data}
  else if(existing.status==="closed"){const {data,error}=await db.from("class_sessions").update({status:"open",ended_at:null}).eq("id",existing.id).select().single();if(error){toast(error.message);return}existing=data}
  state.session=existing;await loadAttendance();startRealtime();
  $("periodScreen").hidden=true;$("classScreen").hidden=false;$("sessionDate").textContent=localDate();$("sessionTitle").textContent="전체 재원생 통합 출석판";$("sessionStatus").textContent="수업부와 관계없이 출석 · 귀가";setSaving("Supabase 자동저장");
}

async function loadAttendance(){
  const {data,error}=await db.from("attendance").select("*").eq("attendance_date",localDate()).order("checked_at");
  if(error){toast(error.message);return}state.records=data||[];const ids=state.records.map(r=>r.id);if(ids.length){const q=await db.from("sms_outbox").select("attendance_id,status").in("attendance_id",ids);state.smsRows=q.data||[]}else state.smsRows=[];renderStudents();renderTrials();updateStats();
}

function visibleStudents(){const list=sortedStudents();return state.attendedOnly?list.filter(s=>["present","late"].includes(recordFor(s.id)?.status)&&!recordFor(s.id)?.checked_out_at):list}
function renderStudents(){
  const grid=$("studentGrid");grid.innerHTML="";const list=visibleStudents();$("emptyMessage").hidden=list.length>0;
  list.forEach(s=>{const r=recordFor(s.id),status=displayStatus(r);const card=document.createElement("article");card.className="student-card";card.dataset.status=status||"waiting";const photo=clean(s.photo_url),days=trainingDaysText(s);card.innerHTML=`<button class="student-main" data-action="present">${photo?`<img class="photo" src="${escapeHtml(photo)}" alt="">`:`<div class="photo photo-fallback">${escapeHtml(s.name.slice(0,2))}</div>`}<strong>${escapeHtml(s.name)}</strong>${days?`<span>${escapeHtml(days)}</span>`:""}<span class="status-pill">${status?statusText[status]:"미처리"}${r&&status?` · ${localTime(status==="checked_out"?r.checked_out_at:r.checked_at)}`:""}</span></button><div class="quick-actions"><button class="p" data-action="present">출석</button><button class="a" data-action="absent">결석</button><button class="o" data-action="checked_out">귀가</button></div>`;
    if(r&&["present","late"].includes(status)){const sms=document.createElement("small");sms.className="sms-state";sms.textContent=smsLabel(smsFor(r.id));card.querySelector(".student-main").appendChild(sms)}card.querySelectorAll("[data-action]").forEach(btn=>btn.onclick=()=>markStudent(s,btn.dataset.action));grid.appendChild(card)});
}

async function markStudent(student,status){
  if(state.session.status==="closed"){toast("종료된 수업입니다. 먼저 수업을 다시 열어주세요.");return}
  if(status==="checked_out"){
    const old=recordFor(student.id);if(!old||!["present","late"].includes(old.status)){toast("먼저 출석 처리해 주세요.");return}
    const result=await db.from("attendance").update({checked_out_at:new Date().toISOString()}).eq("id",old.id).select().single();
    if(result.error){toast(result.error.message);return}await loadAttendance();toast(`${student.name} · 귀가`);return;
  }
  if(status==="present"){
    const shared=sharedPhoneStudents(student);
    if(shared.length){
      const others=shared.map(s=>`${s.name}(${s.student_code})`).join(", ");
      if(!confirm(`보호자 번호가 ${others} 학생과 같습니다.\n\n${student.name} (${student.student_code}) 학생을 ${statusText[status]} 처리할까요?`))return;
    }
  }
  setSaving(`${student.name} 저장 중...`);const old=recordFor(student.id);const payload={session_id:old?.session_id||state.session.id,student_id:student.id,attendance_date:localDate(),status,checked_at:new Date().toISOString(),checked_out_at:null,points_awarded:status==="present"?1:0};
  let result;if(old)result=await db.from("attendance").update(payload).eq("id",old.id).select().single();else result=await db.from("attendance").insert(payload).select().single();
  if(result.error){toast(result.error.message);setSaving("저장 오류");return}
  const i=state.records.findIndex(r=>r.id===result.data.id);if(i>=0)state.records[i]=result.data;else state.records.push(result.data);await loadAttendance();setSaving("저장 완료");toast(`${student.name} · ${statusText[status]}`);setTimeout(()=>setSaving("Supabase 자동저장"),900);
}

function stopRealtime(){
  if(state.realtimeTimer){clearTimeout(state.realtimeTimer);state.realtimeTimer=null}
  if(state.realtimeChannel){db.removeChannel(state.realtimeChannel);state.realtimeChannel=null}
}
function scheduleRealtimeRefresh(){
  clearTimeout(state.realtimeTimer);
  state.realtimeTimer=setTimeout(async()=>{
    if(!state.session)return;
    await loadAttendance();
    setSaving("LIVE 동기화");
    setTimeout(()=>{if(state.session)setSaving("Supabase 자동저장 · LIVE")},700);
  },250);
}
async function syncSessionState(){
  if(!state.session)return;
  const {data,error}=await db.from("class_sessions").select("*").eq("id",state.session.id).maybeSingle();
  if(error||!data)return;
  state.session=data;
  $("sessionStatus").textContent="수업부와 관계없이 출석 · 귀가";
}
function startRealtime(){
  stopRealtime();
  if(!state.session)return;
  const sid=state.session.id,today=localDate();
  state.realtimeChannel=db.channel(`kmt-attendance-live-${today}`)
    .on("postgres_changes",{event:"*",schema:"public",table:"attendance",filter:`attendance_date=eq.${today}`},scheduleRealtimeRefresh)
    .on("postgres_changes",{event:"*",schema:"public",table:"sms_outbox"},scheduleRealtimeRefresh)
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"class_sessions",filter:`id=eq.${sid}`},async()=>{await syncSessionState();scheduleRealtimeRefresh()})
    .subscribe(status=>{
      if(status==="SUBSCRIBED")setSaving("Supabase 자동저장 · LIVE");
      else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT")setSaving("LIVE 재연결 중");
    });
}

function updateStats(){
  const latest=state.students.map(s=>recordFor(s.id)).filter(Boolean),present=latest.filter(r=>["present","late"].includes(r.status)&&!r.checked_out_at).length,checkedOut=latest.filter(r=>["present","late"].includes(r.status)&&r.checked_out_at).length,absent=latest.filter(r=>r.status==="absent").length;$("statTotal").textContent=state.students.length;$("statPresent").textContent=present;$("statAbsent").textContent=absent;$("statCheckedOut").textContent=checkedOut;$("statTrial").textContent=state.records.filter(r=>r.status==="trial").length;$("statWaiting").textContent=Math.max(0,state.students.length-present-checkedOut-absent);
}

function renderTrials(){
  const rows=state.records.filter(r=>r.guest_name&&r.status==="trial");$("trialSection").hidden=rows.length===0;$("trialList").innerHTML=rows.map(r=>`<div class="trial-row"><div><strong>${escapeHtml(r.guest_name)}</strong><span> · ${localTime(r.checked_at)}${r.note?` · ${escapeHtml(r.note)}`:""}</span></div><button data-id="${r.id}">취소</button></div>`).join("");$("trialList").querySelectorAll("button").forEach(b=>b.onclick=()=>cancelTrial(b.dataset.id));
}

async function addTrial(ev){
  ev.preventDefault();const name=clean($("trialName").value);if(!name)return;$("trialMessage").textContent="저장 중...";const payload={session_id:state.session.id,student_id:null,guest_name:name,attendance_date:localDate(),status:"trial",checked_at:new Date().toISOString(),points_awarded:0,note:clean($("trialNote").value)||null};const old=state.records.find(r=>clean(r.guest_name).toLowerCase()===name.toLowerCase());let result;if(old)result=await db.from("attendance").update(payload).eq("id",old.id).select().single();else result=await db.from("attendance").insert(payload).select().single();const {data,error}=result;if(error){$("trialMessage").textContent=error.message;return}state.records=state.records.filter(r=>r.id!==data.id);state.records.push(data);$("trialDialog").close();renderTrials();updateStats();toast(`${name} 체험 출석`);
}
async function cancelTrial(id){const {data,error}=await db.from("attendance").update({status:"cancelled",checked_at:new Date().toISOString()}).eq("id",id).select().single();if(error){toast(error.message);return}const i=state.records.findIndex(r=>r.id===id);if(i>=0)state.records[i]=data;renderTrials();updateStats()}

$("loginButton").onclick=login;$("logoutButton").onclick=async()=>{await db.auth.signOut();location.reload()};$("viewToggle").onclick=()=>{state.attendedOnly=!state.attendedOnly;$("viewToggle").textContent=state.attendedOnly?"전체 명단 보기":"현재 도장 학생만";renderStudents()};$("trialButton").onclick=()=>{$("trialForm").reset();$("trialMessage").textContent="";$("trialDialog").showModal()};$("trialCancel").onclick=()=>$("trialDialog").close();$("trialForm").onsubmit=addTrial;
db.auth.onAuthStateChange((_e,s)=>{if(s&&$("attendanceApp").hidden)setTimeout(boot,0)});boot();
