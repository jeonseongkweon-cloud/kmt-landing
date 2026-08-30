import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg=window.KMT_VOICE_CONFIG;
const db=createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,detectSessionInUrl:true,flowType:"pkce"}});
const $=id=>document.getElementById(id);
const state={staff:null,periods:[],students:[],categories:[],period:null,session:null,recognition:null,listening:false,history:[]};
const clean=v=>v==null?"":String(v).trim();
const esc=v=>clean(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const localDate=()=>new Intl.DateTimeFormat("en-CA",{timeZone:cfg.timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const timeText=()=>new Intl.DateTimeFormat("ko-KR",{timeZone:cfg.timezone,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());
const roleLabel=r=>({owner:"관장",master:"수석사범",instructor:"사범",assistant:"보조지도자"}[r]||r||"지도자");
function toast(m){$("toast").textContent=m;$("toast").classList.add("show");clearTimeout(window.__voiceToast);window.__voiceToast=setTimeout(()=>$("toast").classList.remove("show"),1800)}
function say(m){try{if(!("speechSynthesis" in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(m);u.lang="ko-KR";u.rate=1.05;window.speechSynthesis.speak(u)}catch{}}
function result(kind,title,detail=""){const box=$("resultBox");box.className=`result-box ${kind}`;$("resultText").textContent=title;$("resultDetail").textContent=detail}
function enrollment(s){return Array.isArray(s.enrollments)?(s.enrollments[0]||{}):(s.enrollments||{})}
function rosterFor(period){return state.students.filter(s=>enrollment(s).class_period_id===period?.id)}
function normalize(t){return clean(t).replace(/[,.!?~]/g," ").replace(/\s+/g," ").replace(/^계명아\s*/i,"").trim()}

const LOGIN_GUARD_KEY="kmt_voice_oauth_attempt";
function callbackUrl(){return new URL("/class/voice/",location.origin).href}
async function startGoogleLogin(){
  sessionStorage.setItem(LOGIN_GUARD_KEY,"1");
  const{error}=await db.auth.signInWithOAuth({provider:"google",options:{redirectTo:callbackUrl()}});
  if(error){sessionStorage.removeItem(LOGIN_GUARD_KEY);$("loginMessage").textContent=error.message;$("loginScreen").hidden=false}
}
async function hasPermission(permission){const{data,error}=await db.rpc("kmt_has_permission",{p_permission:permission});if(error)throw error;return Boolean(data)}
async function boot(){
  const{data:{session},error:sessionError}=await db.auth.getSession();
  if(sessionError){$("loginMessage").textContent=sessionError.message;$("loginScreen").hidden=false;$("app").hidden=true;return}
  if(!session){
    $("app").hidden=true;
    const returnedFromOAuth=location.search.includes("code=")||location.hash.includes("access_token=");
    const alreadyTried=sessionStorage.getItem(LOGIN_GUARD_KEY)==="1";
    if(!returnedFromOAuth&&!alreadyTried){
      $("loginScreen").hidden=true;
      await startGoogleLogin();
      return;
    }
    sessionStorage.removeItem(LOGIN_GUARD_KEY);
    $("loginScreen").hidden=false;
    $("loginMessage").textContent="로그인 연결이 완료되지 않았습니다. 아래 버튼을 한 번만 눌러 다시 연결해 주세요.";
    return;
  }
  sessionStorage.removeItem(LOGIN_GUARD_KEY);
  if(location.search||location.hash)history.replaceState({},document.title,location.pathname);
  const{data:profileRows,error}=await db.rpc("kmt_get_my_staff_profile");
  const profile=Array.isArray(profileRows)?profileRows[0]:profileRows;
  if(error||!profile?.is_active){$("loginScreen").hidden=false;$("app").hidden=true;$("loginMessage").textContent="승인된 지도자 계정이 아닙니다.";return}
  state.staff=profile;$("loginScreen").hidden=true;$("app").hidden=false;$("staffLabel").textContent=`${profile.display_name||profile.email} · ${roleLabel(profile.role)}`;
  await loadBase();setupRecognition();await loadHistory();
}
async function loadBase(){
  const[p,s,c]=await Promise.all([
    db.from("class_periods").select("id,code,name,start_time,end_time,sort_order").eq("is_active",true).order("sort_order"),
    db.from("students").select("id,student_code,name,enrollments(class_period_id,status)").order("student_code"),
    db.from("star_categories").select("id,code,name,icon,sort_order").eq("is_active",true).order("sort_order")
  ]);
  const error=p.error||s.error||c.error;if(error){result("error","기초자료를 불러오지 못했습니다.",error.message);return}
  state.periods=p.data||[];state.students=(s.data||[]).filter(x=>enrollment(x).status==="재원");state.categories=c.data||[];
  const sel=$("periodSelect");sel.innerHTML=state.periods.map(x=>`<option value="${x.id}">${esc(x.code)} · ${esc(x.name)}</option>`).join("");
  state.period=recommendPeriod()||state.periods[0]||null;if(state.period)sel.value=state.period.id;sel.onchange=async()=>{state.period=state.periods.find(x=>x.id===sel.value)||null;await syncSessionInfo()};
  await syncSessionInfo();
}
function recommendPeriod(){
  const now=new Date(),minutes=Number(new Intl.DateTimeFormat("en-GB",{timeZone:cfg.timezone,hour:"2-digit",minute:"2-digit",hour12:false}).format(now).replace(":",""));
  const hm=v=>Number(clean(v).slice(0,5).replace(":",""));
  return state.periods.find(p=>p.start_time&&p.end_time&&minutes>=hm(p.start_time)&&minutes<=hm(p.end_time))||state.periods.find(p=>p.start_time&&Math.abs(minutes-hm(p.start_time))<=100);
}
async function getSession(period,{create=false,open=false}={}){
  if(!period)return null;
  let{data,error}=await db.from("class_sessions").select("*").eq("session_date",localDate()).eq("class_period_id",period.id).maybeSingle();if(error)throw error;
  if(!data&&create){const r=await db.from("class_sessions").insert({session_date:localDate(),class_period_id:period.id,status:"open"}).select().single();if(r.error)throw r.error;data=r.data}
  if(data&&open&&data.status==="closed"){const r=await db.from("class_sessions").update({status:"open",ended_at:null}).eq("id",data.id).select().single();if(r.error)throw r.error;data=r.data}
  return data;
}
async function syncSessionInfo(){state.session=await getSession(state.period).catch(()=>null);const p=state.period;if(!p){$("sessionInfo").textContent="등록된 수업부가 없습니다.";return}const n=rosterFor(p).length;$("sessionInfo").textContent=state.session?`${p.name} · ${n}명 · ${state.session.status==="open"?"수업 진행 중":"수업 종료됨"}`:`${p.name} · ${n}명 · 오늘 수업 아직 시작 전`}

function setupRecognition(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){$("speechSupport").textContent="이 브라우저는 음성인식을 지원하지 않습니다. 아래 입력창으로 같은 명령을 사용할 수 있습니다.";$("micButton").disabled=true;return}
  const r=new SR();r.lang=cfg.language||"ko-KR";r.continuous=false;r.interimResults=false;r.maxAlternatives=3;state.recognition=r;
  r.onstart=()=>{state.listening=true;$("micButton").classList.add("listening");$("recognitionState").textContent="듣는 중…"};
  r.onend=()=>{state.listening=false;$("micButton").classList.remove("listening");$("recognitionState").textContent="대기"};
  r.onerror=e=>{result("error","음성인식 오류",e.error||"다시 시도해 주세요.")};
  r.onresult=async e=>{const alt=e.results[0][0],text=alt.transcript,confidence=Number(alt.confidence||0);$("heardBox").hidden=false;$("heardText").textContent=text;$("confidenceText").textContent=confidence?`인식 신뢰도 ${Math.round(confidence*100)}%`:"";$("commandInput").value=text;await runCommand(text,{confidence,source:"voice"})};
  $("speechSupport").textContent="한국어 음성인식 준비 완료";
}

function findPeriod(text){const t=text.replace(/\s/g,"");return state.periods.find(p=>t.includes(clean(p.name).replace(/\s/g,""))||t.includes(clean(p.code).replace(/\s/g,"")))||state.period}
function studentMatches(text,period=null){const t=text.replace(/\s/g,"");const pool=period?rosterFor(period):state.students;return pool.filter(s=>t.includes(clean(s.name).replace(/\s/g,"")))}
function categoryMatches(text){const t=text.replace(/\s/g,"");return state.categories.filter(c=>t.includes(clean(c.name).replace(/별$/,""))||t.includes(clean(c.code).toLowerCase()))}
function choose(title,items,label){return new Promise(resolve=>{const d=$("choiceDialog"),list=$("choiceList");$("choiceTitle").textContent=title;list.innerHTML="";items.forEach(item=>{const b=document.createElement("button");b.type="button";b.innerHTML=label(item);b.onclick=()=>{d.close();resolve(item)};list.appendChild(b)});d.onclose=()=>resolve(null);d.showModal()})}
function confirmCommand(message){return new Promise(resolve=>{const d=$("confirmDialog");$("confirmMessage").textContent=message;d.onclose=()=>resolve(d.returnValue==="confirm");d.showModal()})}
async function resolveStudent(text,period){const matches=studentMatches(text,period);if(matches.length===1)return matches[0];if(matches.length>1)return choose("동명이인입니다. 학생을 선택해 주세요.",matches,s=>`${esc(s.name)} <small>${esc(s.student_code)}</small>`);return null}
async function resolveCategory(text){const matches=categoryMatches(text);if(matches.length===1)return matches[0];if(matches.length>1)return choose("STAR 종류를 선택해 주세요.",matches,c=>`${c.icon||"⭐"} ${esc(c.name)}`);return choose("어떤 STAR를 줄까요?",state.categories,c=>`${c.icon||"⭐"} ${esc(c.name)}`)}

async function logCommand({transcript,normalized,commandType,payload,status,resultText,confidence,source}){
  try{await db.from("kmt_voice_command_log").insert({transcript,normalized_text:normalized,command_type:commandType||"unknown",payload:payload||{},status,result_text:resultText||null,confidence:confidence||null,input_source:source||"text"})}catch{}
  state.history.unshift({created_at:new Date().toISOString(),command_type:commandType||"unknown",transcript,status,result_text:resultText||""});state.history=state.history.slice(0,12);renderHistory();
}
async function loadHistory(){const{data}=await db.from("kmt_voice_command_log").select("created_at,command_type,transcript,status,result_text").order("created_at",{ascending:false}).limit(12);if(data){state.history=data;renderHistory()}}
function renderHistory(){$("historyList").innerHTML=state.history.length?state.history.map(h=>`<div class="history-item"><small>${new Date(h.created_at).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})}</small><div><strong>${esc(h.transcript)}</strong><small>${esc(h.result_text||"")}</small></div><span>${h.status==="executed"?"✅":h.status==="cancelled"?"↩️":"⚠️"}</span></div>`).join(""):'<div class="empty">아직 실행한 명령이 없습니다.</div>'}

async function saveAttendance(student,status,period){
  if(!await hasPermission("attendance"))throw new Error("출석 처리 권한이 없습니다.");const session=await getSession(period,{create:true,open:true});
  const{data:old,error:e1}=await db.from("attendance").select("id").eq("session_id",session.id).eq("student_id",student.id).maybeSingle();if(e1)throw e1;
  const payload={session_id:session.id,student_id:student.id,attendance_date:localDate(),status,checked_at:new Date().toISOString(),points_awarded:["present","late"].includes(status)?1:0};
  const r=old?await db.from("attendance").update(payload).eq("id",old.id):await db.from("attendance").insert(payload);if(r.error)throw r.error;return session;
}
async function saveStar(student,category,period){if(!await hasPermission("star"))throw new Error("STAR 지급 권한이 없습니다.");const session=await getSession(period,{create:true,open:true});const r=await db.from("star_events").insert({session_id:session.id,student_id:student.id,category_id:category.id,note:"계명아 음성명령"});if(r.error)throw r.error;return session}
async function saveMvp(student,period){if(!await hasPermission("mvp"))throw new Error("MVP 선정 권한이 없습니다.");const session=await getSession(period,{create:true,open:true});const r=await db.from("champions").upsert({session_id:session.id,student_id:student.id,title:"오늘의 챔피언",category_id:null},{onConflict:"session_id,title"});if(r.error)throw r.error;return session}
async function saveFamilySpark(student){if(!await hasPermission("spark"))throw new Error("SPARK 확인 권한이 없습니다.");const r=await db.rpc("kmt_record_spark_together",{p_student_id:student.id,p_axis:"family",p_activity_code:"help_first",p_partner_student_id:null,p_partner_label:"가족",p_note:"계명아 음성명령 · 가족돕기",p_activity_date:localDate(),p_idempotency_key:crypto.randomUUID()});if(r.error)throw r.error;return r.data}
async function setSession(period,mode){if(!await hasPermission("attendance"))throw new Error("수업 상태 변경 권한이 없습니다.");let session=await getSession(period,{create:mode==="open",open:mode==="open"});if(!session&&mode==="close")throw new Error("오늘 시작된 수업이 없습니다.");if(mode==="close"&&session.status!=="closed"){const r=await db.from("class_sessions").update({status:"closed",ended_at:new Date().toISOString()}).eq("id",session.id).select().single();if(r.error)throw r.error;session=r.data}return session}
async function bulkPresent(period){if(!await hasPermission("attendance"))throw new Error("출석 처리 권한이 없습니다.");const session=await getSession(period,{create:true,open:true}),roster=rosterFor(period);for(const s of roster){const{data:old,error}=await db.from("attendance").select("id").eq("session_id",session.id).eq("student_id",s.id).maybeSingle();if(error)throw error;const payload={session_id:session.id,student_id:s.id,attendance_date:localDate(),status:"present",checked_at:new Date().toISOString(),points_awarded:1};const r=old?await db.from("attendance").update(payload).eq("id",old.id):await db.from("attendance").insert(payload);if(r.error)throw r.error}return roster.length}

async function runCommand(raw,{confidence=1,source="text"}={}){
  const normalized=normalize(raw);if(!normalized)return;
  result("warn","명령을 확인하고 있습니다…",normalized);
  if(source==="voice"&&confidence>0&&confidence<.6){const ok=await confirmCommand(`음성 인식 신뢰도가 ${Math.round(confidence*100)}%입니다. “${raw}” 명령을 계속할까요?`);if(!ok){await logCommand({transcript:raw,normalized,commandType:"low_confidence",status:"cancelled",resultText:"낮은 신뢰도로 실행 취소",confidence,source});result("warn","실행하지 않았습니다.","다시 또렷하게 말해 주세요.");return}}
  const period=findPeriod(normalized);
  try{
    if(/(가족.*(돕기|도움)|가족돕기).*?(SPARK|스파크).*?(완료|기록)/i.test(normalized)){const student=await resolveStudent(normalized,period);if(!student)throw new Error("SPARK를 기록할 학생을 확인할 수 없습니다.");const ok=await confirmCommand(`${student.name} 학생의 가족돕기 SPARK를 완료 기록할까요?`);if(!ok){await logCommand({transcript:raw,normalized,commandType:"spark_family_help",payload:{student_id:student.id},status:"cancelled",resultText:"사용자 취소",confidence,source});return}await saveFamilySpark(student);const msg=`${student.name} 가족돕기 SPARK 기록 완료`;result("ok",msg,"SPARK 함께하기 기록에 저장했습니다.");say(msg);await logCommand({transcript:raw,normalized,commandType:"spark_family_help",payload:{student_id:student.id},status:"executed",resultText:msg,confidence,source});return}
    if(/이번\s*주\s*미션.*(보여|열어)/.test(normalized)){await logCommand({transcript:raw,normalized,commandType:"show_mission",status:"executed",resultText:"수업운영 화면 열기",confidence,source});location.href="../tools/";return}
    if(/SPARK.*(열어|보여)|스파크.*(열어|보여)/i.test(normalized)){await logCommand({transcript:raw,normalized,commandType:"open_spark",status:"executed",resultText:"SPARK 화면 열기",confidence,source});location.href="../spark/";return}

    if(/전원\s*출석/.test(normalized)){
      if(!period)throw new Error("수업부를 확인할 수 없습니다.");const count=rosterFor(period).length;const ok=await confirmCommand(`${period.name} ${count}명을 전원 출석 처리합니다. 실행할까요?`);if(!ok){await logCommand({transcript:raw,normalized,commandType:"bulk_attendance",payload:{period_id:period.id},status:"cancelled",resultText:"사용자 취소",confidence,source});return}
      const done=await bulkPresent(period);const msg=`${period.name} ${done}명 전원 출석 완료`;result("ok",msg,"LIVE 화면에도 자동 반영됩니다.");say(msg);await logCommand({transcript:raw,normalized,commandType:"bulk_attendance",payload:{period_id:period.id,count:done},status:"executed",resultText:msg,confidence,source});await syncSessionInfo();return;
    }

    if(/수업\s*(시작|열어)/.test(normalized)){
      if(!period)throw new Error("수업부를 확인할 수 없습니다.");await setSession(period,"open");const msg=`${period.name} 수업 시작`;result("ok",msg,"수업 세션을 열었습니다.");say(msg);await logCommand({transcript:raw,normalized,commandType:"session_open",payload:{period_id:period.id},status:"executed",resultText:msg,confidence,source});await syncSessionInfo();return;
    }
    if(/수업\s*(종료|끝)/.test(normalized)){
      if(!period)throw new Error("수업부를 확인할 수 없습니다.");const ok=await confirmCommand(`${period.name} 수업을 종료할까요?`);if(!ok){await logCommand({transcript:raw,normalized,commandType:"session_close",payload:{period_id:period.id},status:"cancelled",resultText:"사용자 취소",confidence,source});return}await setSession(period,"close");const msg=`${period.name} 수업 종료`;result("ok",msg,"수업 기록은 그대로 보존됩니다.");say(msg);await logCommand({transcript:raw,normalized,commandType:"session_close",payload:{period_id:period.id},status:"executed",resultText:msg,confidence,source});await syncSessionInfo();return;
    }

    if(/MVP|엠브이피|챔피언/i.test(normalized)){
      const student=await resolveStudent(normalized,period);if(!student)throw new Error("MVP 학생 이름을 확인할 수 없습니다.");const ok=await confirmCommand(`${period?.name||"현재 수업"} 오늘의 MVP를 ${student.name} 학생으로 선정할까요?`);if(!ok){await logCommand({transcript:raw,normalized,commandType:"mvp",payload:{student_id:student.id},status:"cancelled",resultText:"사용자 취소",confidence,source});return}await saveMvp(student,period);const msg=`${student.name} 오늘의 MVP 선정 완료`;result("ok",msg,"챔피언 기록에 저장했습니다.");say(msg);await logCommand({transcript:raw,normalized,commandType:"mvp",payload:{student_id:student.id,period_id:period?.id},status:"executed",resultText:msg,confidence,source});return;
    }

    if(/별|STAR|스타/i.test(normalized)){
      const student=await resolveStudent(normalized,period);if(!student)throw new Error("STAR를 받을 학생을 확인할 수 없습니다.");const category=await resolveCategory(normalized);if(!category){result("warn","STAR 지급을 취소했습니다.","카테고리를 선택하지 않았습니다.");return}await saveStar(student,category,period);const msg=`${student.name} ${category.name} 하나`;result("ok",msg,"STAR가 저장되었습니다.");say(msg);await logCommand({transcript:raw,normalized,commandType:"star",payload:{student_id:student.id,category_id:category.id,period_id:period?.id},status:"executed",resultText:msg,confidence,source});return;
    }

    const status=/지각/.test(normalized)?"late":/결석/.test(normalized)?"absent":/출석/.test(normalized)?"present":null;
    if(status){const student=await resolveStudent(normalized,period);if(!student)throw new Error("출석 처리할 학생을 확인할 수 없습니다.");await saveAttendance(student,status,period);const label={present:"출석",late:"지각",absent:"결석"}[status],msg=`${student.name} ${label} 완료`;result("ok",msg,`${period?.name||"현재 수업"}에 저장했습니다.`);say(msg);await logCommand({transcript:raw,normalized,commandType:"attendance",payload:{student_id:student.id,status,period_id:period?.id},status:"executed",resultText:msg,confidence,source});await syncSessionInfo();return}

    result("warn","아직 이해하지 못한 명령입니다.","‘명령 예시’를 눌러 사용할 수 있는 말을 확인해 주세요.");await logCommand({transcript:raw,normalized,commandType:"unknown",status:"rejected",resultText:"지원하지 않는 명령",confidence,source});
  }catch(e){const msg=e?.message||String(e);result("error","명령을 실행하지 못했습니다.",msg);toast(msg);await logCommand({transcript:raw,normalized,commandType:"error",status:"failed",resultText:msg,confidence,source})}
}

$("loginButton").onclick=startGoogleLogin;$("logoutButton").onclick=async()=>{await db.auth.signOut();location.reload()};
$("micButton").onclick=()=>{if(!state.recognition)return;try{state.listening?state.recognition.stop():state.recognition.start()}catch{}};
$("runButton").onclick=()=>runCommand($("commandInput").value,{source:"text"});$("commandInput").onkeydown=e=>{if(e.key==="Enter")runCommand($("commandInput").value,{source:"text"})};
$("refreshButton").onclick=async()=>{await loadBase();await loadHistory();toast("새로고침 완료")};$("helpButton").onclick=()=>$("helpDialog").showModal();
document.querySelectorAll("[data-quick]").forEach(b=>b.onclick=()=>{let t=b.dataset.quick;if(t==="오늘 MVP")t=`오늘 ${state.period?.name||""} MVP`;if(t==="수업 종료")t=`${state.period?.name||""} 수업 종료`;$("commandInput").value=t;runCommand(t,{source:"text"})});
db.auth.onAuthStateChange((_e,s)=>{if(s&&$("app").hidden)setTimeout(boot,0)});boot();
