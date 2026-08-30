import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SINGLE_OWNER_EMAIL="jeonseongkweon@gmail.com";
const isSingleOwner=session=>String(session?.user?.email||"").trim().toLowerCase()===SINGLE_OWNER_EMAIL;

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

async function login(){location.replace("../");}const i=state.records.findIndex(r=>r.id===id);if(i>=0)state.records[i]=data;renderTrials();updateStats()}

async function toggleSession(){const closed=state.session.status==="closed";const payload=closed?{status:"open",ended_at:null}:{status:"closed",ended_at:new Date().toISOString()};const {data,error}=await db.from("class_sessions").update(payload).eq("id",state.session.id).select().single();if(error){toast(error.message);return}state.session=data;$("sessionStatus").textContent=data.status==="closed"?"수업 종료됨":"수업 진행 중";$("closeSessionButton").textContent=data.status==="closed"?"수업 다시 열기":"수업 종료";toast(data.status==="closed"?"오늘 수업을 종료했습니다.":"수업을 다시 열었습니다.")}

$("loginButton").onclick=login;$("logoutButton").onclick=async()=>{await db.auth.signOut();location.reload()};$("backButton").onclick=()=>{stopRealtime();$("classScreen").hidden=true;$("periodScreen").hidden=false;state.session=null;state.period=null};$("viewToggle").onclick=()=>{state.attendedOnly=!state.attendedOnly;$("viewToggle").textContent=state.attendedOnly?"전체 명단 보기":"출석 학생만 보기";renderStudents()};$("trialButton").onclick=()=>{$("trialForm").reset();$("trialMessage").textContent="";$("trialDialog").showModal()};$("trialCancel").onclick=()=>$("trialDialog").close();$("trialForm").onsubmit=addTrial;$("closeSessionButton").onclick=toggleSession;
db.auth.onAuthStateChange((_e,s)=>{if(s&&$("attendanceApp").hidden)setTimeout(boot,0)});boot();
