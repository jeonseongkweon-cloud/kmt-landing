import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg=window.KMT_ATTENDANCE_CONFIG;
const db=createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,detectSessionInUrl:true,flowType:"pkce"}});
const $=id=>document.getElementById(id);
const state={periods:[],students:[],session:null,records:[],smsRows:[],sparkByStudent:new Map(),period:null,attendedOnly:false,realtimeChannel:null,realtimeTimer:null};
const statusText={present:"출석",late:"지각",absent:"결석",cancelled:"미처리"};

function clean(v){return v==null?"":String(v).trim()}
function escapeHtml(v){return clean(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function localDate(){return new Intl.DateTimeFormat("en-CA",{timeZone:cfg.timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function localTime(value=new Date()){return new Intl.DateTimeFormat("ko-KR",{timeZone:cfg.timezone,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(value))}
function recordFor(id){return state.records.find(r=>r.student_id===id)}
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

async function login(){
  $("loginMessage").textContent="Google 로그인 화면을 여는 중...";
  const {error}=await db.auth.signInWithOAuth({provider:"google",options:{redirectTo:`${location.origin}${location.pathname}`,queryParams:{prompt:"select_account"}}});
  if(error)$("loginMessage").textContent=error.message;
}

async function boot(){
  const {data:{session}}=await db.auth.getSession();
  if(!session){$("loginScreen").hidden=false;$("attendanceApp").hidden=true;return}
  if(clean(session.user.email).toLowerCase()!==cfg.allowedAdminEmail.toLowerCase()){
    await db.auth.signOut();$("loginMessage").textContent="등록되지 않은 관리자 계정입니다.";return;
  }
  $("loginScreen").hidden=true;$("attendanceApp").hidden=false;startClock();await loadPeriods();
}

async function loadPeriods(){
  const [pRes,sRes]=await Promise.all([
    db.from("class_periods").select("id,code,name,start_time,end_time,sort_order").eq("is_active",true).order("sort_order"),
    db.from("students").select("id,student_code,name,photo_url,guardians(phone,sms_enabled),enrollments(class_period_id,class_label_raw,status)").order("student_code")
  ]);
  if(pRes.error||sRes.error){toast(`자료 조회 실패: ${(pRes.error||sRes.error).message}`);return}
  state.periods=pRes.data||[];state.students=(sRes.data||[]).filter(s=>(s.enrollments?.[0]?.status||s.enrollments?.status)==="재원");renderPeriods();
}

function enrollment(s){return Array.isArray(s.enrollments)?(s.enrollments[0]||{}):(s.enrollments||{})}
function studentsForPeriod(period){
  if(period.code==="OTHER")return state.students.filter(s=>!enrollment(s).class_period_id);
  return state.students.filter(s=>enrollment(s).class_period_id===period.id);
}
function renderPeriods(){
  const grid=$("periodGrid");grid.innerHTML="";
  state.periods.forEach(p=>{const count=studentsForPeriod(p).length;const b=document.createElement("button");b.className="period-card";b.innerHTML=`<small>${escapeHtml(p.code)}</small><strong>${escapeHtml(p.name)}</strong><span>${count}명 · ${clean(p.start_time)?clean(p.start_time).slice(0,5):"시간 자유"}</span>`;b.onclick=()=>openPeriod(p);grid.appendChild(b)});
}

async function openPeriod(period){
  state.period=period;setSaving("오늘 수업을 여는 중...");
  let {data:existing,error:findError}=await db.from("class_sessions").select("*").eq("session_date",localDate()).eq("class_period_id",period.id).maybeSingle();
  if(findError){toast(findError.message);return}
  if(!existing){const {data,error}=await db.from("class_sessions").insert({session_date:localDate(),class_period_id:period.id,status:"open"}).select().single();if(error){toast(error.message);return}existing=data}
  state.session=existing;await loadAttendance();loadSparkSummary();startRealtime();
  $("periodScreen").hidden=true;$("classScreen").hidden=false;$("sessionDate").textContent=localDate();$("sessionTitle").textContent=`${period.name} 오늘 수업`;$("sessionStatus").textContent=existing.status==="closed"?"수업 종료됨":"수업 진행 중";$("closeSessionButton").textContent=existing.status==="closed"?"수업 다시 열기":"수업 종료";setSaving("Supabase 자동저장");
}

async function loadAttendance(){
  const {data,error}=await db.from("attendance").select("*").eq("session_id",state.session.id).order("checked_at");
  if(error){toast(error.message);return}state.records=data||[];const ids=state.records.map(r=>r.id);if(ids.length){const q=await db.from("sms_outbox").select("attendance_id,status").in("attendance_id",ids);state.smsRows=q.data||[]}else state.smsRows=[];renderStudents();renderTrials();updateStats();
}

function visibleStudents(){const list=studentsForPeriod(state.period);return state.attendedOnly?list.filter(s=>["present","late"].includes(recordFor(s.id)?.status)):list}
function sparkMarkup(studentId){
  const info=state.sparkByStudent.get(studentId);if(!info)return "";
  if(!info.linked){const label=info.reason==="LINK_NOT_VERIFIED"?"SPARK 연결 확인 중":info.reason==="SPARK_UNAVAILABLE"?"SPARK 정보 일시 확인 불가":"SPARK 미연결";return `<span class="spark-summary muted"><strong>🔥 ${label}</strong></span>`}
  const sp=info.spark||{},mi=info.missions||{},st=info.streak||{};const streak=st.current_streak??st.current??0;
  return `<span class="spark-summary"><strong>🔥 ${escapeHtml(sp.tier_icon||"")} ${escapeHtml(sp.tier_name||"SPARK")} · ${Number(sp.lifetime_spark||0).toLocaleString()} SPARK</strong><span>오늘 미션 ${mi.today_completed||0}/${mi.today_total||0} · 연속 ${streak}일 · 배지 준비 중</span></span>`
}
async function loadSparkSummary(){
  const students=studentsForPeriod(state.period);if(!students.length)return;
  const {data,error}=await db.rpc("kmt_get_class_spark_dashboard",{p_student_ids:students.map(s=>s.id)});
  if(error){console.warn("SPARK summary unavailable",error);return}
  state.sparkByStudent=new Map((data?.items||[]).map(item=>[item.student_id,item]));renderStudents();
}
function renderStudents(){
  const grid=$("studentGrid");grid.innerHTML="";const list=visibleStudents();$("emptyMessage").hidden=list.length>0;
  list.forEach(s=>{const r=recordFor(s.id),status=r?.status==="cancelled"?"":(r?.status||"");const card=document.createElement("article");card.className="student-card";card.dataset.status=status||"waiting";const photo=clean(s.photo_url);card.innerHTML=`<button class="student-main" data-action="present">${photo?`<img class="photo" src="${escapeHtml(photo)}" alt="">`:`<div class="photo photo-fallback">${escapeHtml(s.name.slice(0,2))}</div>`}<strong>${escapeHtml(s.name)}</strong><span>${escapeHtml(s.student_code)}</span><span class="status-pill">${status?statusText[status]:"눌러서 출석"}${r&&status?` · ${localTime(r.checked_at)}`:""}</span></button><div class="quick-actions"><button class="p" data-action="present">출석</button><button class="l" data-action="late">지각</button><button class="a" data-action="absent">결석</button><button data-action="cancelled">취소</button></div>`;
    card.querySelector(".student-main").insertAdjacentHTML("beforeend",sparkMarkup(s.id));
    if(r&&["present","late"].includes(status)){const sms=document.createElement("small");sms.className="sms-state";sms.textContent=smsLabel(smsFor(r.id));card.querySelector(".student-main").appendChild(sms)}card.querySelectorAll("[data-action]").forEach(btn=>btn.onclick=()=>markStudent(s,btn.dataset.action));grid.appendChild(card)});
}

async function markStudent(student,status){
  if(state.session.status==="closed"){toast("종료된 수업입니다. 먼저 수업을 다시 열어주세요.");return}
  if(["present","late"].includes(status)){
    const shared=sharedPhoneStudents(student);
    if(shared.length){
      const others=shared.map(s=>`${s.name}(${s.student_code})`).join(", ");
      if(!confirm(`보호자 번호가 ${others} 학생과 같습니다.\n\n${student.name} (${student.student_code}) 학생을 ${statusText[status]} 처리할까요?`))return;
    }
  }
  setSaving(`${student.name} 저장 중...`);const old=recordFor(student.id);const payload={session_id:state.session.id,student_id:student.id,attendance_date:localDate(),status,checked_at:new Date().toISOString(),points_awarded:["present","late"].includes(status)?1:0};
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
  $("sessionStatus").textContent=data.status==="closed"?"수업 종료됨":"수업 진행 중";
  $("closeSessionButton").textContent=data.status==="closed"?"수업 다시 열기":"수업 종료";
}
function startRealtime(){
  stopRealtime();
  if(!state.session)return;
  const sid=state.session.id;
  state.realtimeChannel=db.channel(`kmt-attendance-live-${sid}`)
    .on("postgres_changes",{event:"*",schema:"public",table:"attendance",filter:`session_id=eq.${sid}`},scheduleRealtimeRefresh)
    .on("postgres_changes",{event:"*",schema:"public",table:"sms_outbox"},scheduleRealtimeRefresh)
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"class_sessions",filter:`id=eq.${sid}`},async()=>{await syncSessionState();scheduleRealtimeRefresh()})
    .subscribe(status=>{
      if(status==="SUBSCRIBED")setSaving("Supabase 자동저장 · LIVE");
      else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT")setSaving("LIVE 재연결 중");
    });
}

function updateStats(){
  const roster=studentsForPeriod(state.period);const active=state.records.filter(r=>r.status!=="cancelled");
  const count=s=>active.filter(r=>r.status===s).length;$("statTotal").textContent=roster.length;$("statPresent").textContent=count("present");$("statLate").textContent=count("late");$("statAbsent").textContent=count("absent");$("statTrial").textContent=count("trial");const done=new Set(active.filter(r=>r.student_id).map(r=>r.student_id));$("statWaiting").textContent=Math.max(0,roster.length-done.size);
}

function renderTrials(){
  const rows=state.records.filter(r=>r.guest_name&&r.status==="trial");$("trialSection").hidden=rows.length===0;$("trialList").innerHTML=rows.map(r=>`<div class="trial-row"><div><strong>${escapeHtml(r.guest_name)}</strong><span> · ${localTime(r.checked_at)}${r.note?` · ${escapeHtml(r.note)}`:""}</span></div><button data-id="${r.id}">취소</button></div>`).join("");$("trialList").querySelectorAll("button").forEach(b=>b.onclick=()=>cancelTrial(b.dataset.id));
}

async function addTrial(ev){
  ev.preventDefault();const name=clean($("trialName").value);if(!name)return;$("trialMessage").textContent="저장 중...";const payload={session_id:state.session.id,student_id:null,guest_name:name,attendance_date:localDate(),status:"trial",checked_at:new Date().toISOString(),points_awarded:0,note:clean($("trialNote").value)||null};const old=state.records.find(r=>clean(r.guest_name).toLowerCase()===name.toLowerCase());let result;if(old)result=await db.from("attendance").update(payload).eq("id",old.id).select().single();else result=await db.from("attendance").insert(payload).select().single();const {data,error}=result;if(error){$("trialMessage").textContent=error.message;return}state.records=state.records.filter(r=>r.id!==data.id);state.records.push(data);$("trialDialog").close();renderTrials();updateStats();toast(`${name} 체험 출석`);
}
async function cancelTrial(id){const {data,error}=await db.from("attendance").update({status:"cancelled",checked_at:new Date().toISOString()}).eq("id",id).select().single();if(error){toast(error.message);return}const i=state.records.findIndex(r=>r.id===id);if(i>=0)state.records[i]=data;renderTrials();updateStats()}

async function toggleSession(){const closed=state.session.status==="closed";const payload=closed?{status:"open",ended_at:null}:{status:"closed",ended_at:new Date().toISOString()};const {data,error}=await db.from("class_sessions").update(payload).eq("id",state.session.id).select().single();if(error){toast(error.message);return}state.session=data;$("sessionStatus").textContent=data.status==="closed"?"수업 종료됨":"수업 진행 중";$("closeSessionButton").textContent=data.status==="closed"?"수업 다시 열기":"수업 종료";toast(data.status==="closed"?"오늘 수업을 종료했습니다.":"수업을 다시 열었습니다.")}

$("loginButton").onclick=login;$("logoutButton").onclick=async()=>{await db.auth.signOut();location.reload()};$("backButton").onclick=()=>{stopRealtime();$("classScreen").hidden=true;$("periodScreen").hidden=false;state.session=null;state.period=null};$("viewToggle").onclick=()=>{state.attendedOnly=!state.attendedOnly;$("viewToggle").textContent=state.attendedOnly?"전체 명단 보기":"출석 학생만 보기";renderStudents()};$("trialButton").onclick=()=>{$("trialForm").reset();$("trialMessage").textContent="";$("trialDialog").showModal()};$("trialCancel").onclick=()=>$("trialDialog").close();$("trialForm").onsubmit=addTrial;$("closeSessionButton").onclick=toggleSession;
db.auth.onAuthStateChange((_e,s)=>{if(s&&$("attendanceApp").hidden)setTimeout(boot,0)});boot();
