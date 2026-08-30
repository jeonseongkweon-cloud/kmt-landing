import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SINGLE_OWNER_EMAIL="jeonseongkweon@gmail.com";
const VOICE_BUILD="1810";
const isSingleOwner=session=>String(session?.user?.email||"").trim().toLowerCase()===SINGLE_OWNER_EMAIL;

const cfg=window.KMT_VOICE_CONFIG;
const directLock=async(_name,_acquireTimeout,fn)=>await fn();
const db=createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{
  auth:{
    persistSession:true,
    detectSessionInUrl:true,
    flowType:"pkce",
    lock:directLock
  }
});
const $=id=>document.getElementById(id);
const state={staff:null,periods:[],students:[],categories:[],period:null,session:null,recognition:null,listening:false,history:[]};
const clean=v=>v==null?"":String(v).trim();
const esc=v=>clean(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const localDate=()=>new Intl.DateTimeFormat("en-CA",{timeZone:cfg.timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const timeText=()=>new Intl.DateTimeFormat("ko-KR",{timeZone:cfg.timezone,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());
const roleLabel=r=>({owner:"관장",master:"수석사범",instructor:"사범",assistant:"보조지도자"}[r]||r||"지도자");
const withTimeout=(promise,ms,label)=>Promise.race([
  promise,
  new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${label} 응답시간 초과 (${Math.round(ms/1000)}초)`)),ms))
]);
function toast(m){$("toast").textContent=m;$("toast").classList.add("show");clearTimeout(window.__voiceToast);window.__voiceToast=setTimeout(()=>$("toast").classList.remove("show"),1800)}
function say(m){try{if(!("speechSynthesis" in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(m);u.lang="ko-KR";u.rate=1.05;window.speechSynthesis.speak(u)}catch{}}
function result(kind,title,detail=""){const box=$("resultBox");box.className=`result-box ${kind}`;$("resultText").textContent=title;$("resultDetail").textContent=detail}
function enrollment(s){return Array.isArray(s.enrollments)?(s.enrollments[0]||{}):(s.enrollments||{})}
function rosterFor(period){return state.students.filter(s=>enrollment(s).class_period_id===period?.id)}
function normalize(t){
  let x=clean(t).replace(/[,.!?~·]/g," ").replace(/\s+/g," ").trim();
  // 호출어는 선택사항. Chrome의 대표적인 "계명아" 오인식도 호출어로 인정.
  x=x.replace(/^(계명아파트|계명 아파트|계명아아|계명 아|계명야|계명 야|개명아|개명 아|개명야|계명이야|계명아)\s*/i,"").trim();
  // 수업 중 자연스럽게 말하는 표현을 기존 명령어로 변환.
  x=x.replace(/^(.+?)\s*(왔어|왔어요|왔습니다|왔다|도착|도착했어|도착했어요)$/,"$1 출석");
  x=x.replace(/^(.+?)\s*(출석해|출석해줘|출석 해줘|출석해주세요|출석 처리|출석처리)$/,"$1 출석");

  // v1.8.5: 문장 끝의 "출석 의도"를 먼저 찾고, 앞의 이름에서 호칭 아/야를 제거한다.
  // 예: "민규야 어서 와" -> "민규야" + "어서 와" -> "민규" + "출석"
  const greetingPatterns=[
    /^(.*?)\s+(어서\s*와|어서\s*와라|어서\s*오렴|어서\s*왔니|어서\s*왔구나|어서\s*왔네)$/,
    /^(.*?)\s+(왔구나|왔네|왔니|잘\s*왔어|잘\s*왔네|반가워|들어와|들어오렴)$/,
    /^(.*?)\s+(오늘도\s*왔네|오늘도\s*왔구나|오늘\s*왔네)$/
  ];
  for(const re of greetingPatterns){
    const m=x.match(re);
    if(m){
      let who=m[1].trim();
      // 실제 이름 끝 글자와 혼동하지 않도록 호칭은 문장 분리 후에만 제거
      if(who.length>=2 && /[아야]$/.test(who)) who=who.slice(0,-1);
      x=who+" 출석";
      break;
    }
  }

  // v1.8.6 STAR / 칭찬 자연어
  // 카테고리 이름을 말하면 해당 STAR로, 단순 칭찬이면 STAR 종류 선택창으로 연결.
  x=x.replace(/^(.+?)(?:아|야)?\s*(칭찬해줘|칭찬해|칭찬하자|별 하나 더|별 하나 줘)$/,"$1 별");
  x=x.replace(/^(.+?)(?:아|야)?\s*(.+?)\s*(잘했어|잘했네|최고야|멋지다|좋았어|아주 좋아)$/,"$1 $2 별");

  // 오늘의 MVP / 챔피언 자연어
  x=x.replace(/^(?:오늘\s*)?(.+?)(?:아|야)?\s*(최고야|최고다|제일 잘했어|챔피언이야|MVP야|엠브이피야)$/i,"$1 MVP");
  x=x.replace(/^(?:오늘\s*)?(?:MVP|엠브이피|챔피언)\s*(.+)$/i,"$1 MVP");
  x=x.replace(/^(.+)\s*(?:오늘\s*)?(?:MVP|엠브이피|챔피언)(?:으로|로)?\s*(해줘|선정해|정해줘)?$/i,"$1 MVP");

  // 수업 시작/종료 자연어
  x=x.replace(/^(?:이제\s*)?(수업\s*)?(시작하자|시작해|시작할게|시작합니다)$/,"수업 시작");
  x=x.replace(/^([1-5]부)\s*(시작하자|시작해|시작할게|시작합니다)$/,"$1 수업 시작");
  x=x.replace(/^(?:이제\s*)?(수업\s*)?(끝내자|끝내|끝이야|마치자|마쳐|마칩니다|종료하자)$/,"수업 종료");
  x=x.replace(/^(오늘\s*)?(여기까지|이제 그만|그만하자)$/,"수업 종료");
  x=x.replace(/^([1-5]부)\s*(끝내자|끝내|마치자|마쳐|종료하자)$/,"$1 수업 종료");

  x=x.replace(/^(.+?)\s*(늦었어|늦었어요|지각했어|지각했어요)$/,"$1 지각");
  x=x.replace(/^(.+?)\s*(안와|안 와|안왔어|안 왔어|결석이야)$/,"$1 결석");
  x=x.replace(/^(.+?)\s*(별\s*하나|별\s*한개|별\s*한 개|별\s*1개|별\s*줘|별\s*주세요|별\s*추가)$/,"$1 별");
  const bu={"일":"1","이":"2","삼":"3","사":"4","오":"5"};
  x=x.replace(/^([일이삼사오])\s*부\b/,(_,n)=>bu[n]+"부");
  x=x.replace(/^([1-5])부\s*(모두|전부|전체|다)\s*출석$/,"$1부 전원 출석");
  x=x.replace(/^([1-5])부\s*아이들\s*(모두|전부|전체|다)\s*출석$/,"$1부 전원 출석");
  // 끝에 붙는 짧은 조사/말버릇은 정규 명령 뒤에서만 제거
  x=x.replace(/(출석|지각|결석|별)\s*(이야|이요|요|해|해줘|해주세요)$/,"$1");
  return x.trim();
}

async function login(){const{error}=await db.auth.signInWithOAuth({provider:"google",options:{redirectTo:`${location.origin}${location.pathname}`}});if(error)$("loginMessage").textContent=error.message}
async function hasPermission(permission){
  // v1.8.9 DIRECT MODE
  // 계명태권도 CLASS는 단일 관리자 운영이므로,
  // 음성명령 실행 전에 관리자 확인 응답을 기다리지 않는다.
  // 실제 DB 읽기/쓰기는 기존 Supabase RLS가 그대로 보호한다.
  return true;
}
async function boot(){
  state.staff={email:SINGLE_OWNER_EMAIL,display_name:"전성권 관장",role:"owner",is_active:true};
  $("app").hidden=false;
  $("staffLabel").textContent="전성권 관장 · 시작 중";
  $("recognitionState").textContent="준비";

  try{setupRecognition()}catch(err){
    console.error("[VOICE] recognition failed",err);
  }

  await loadBase();

  try{
    await withTimeout(loadHistory(),5000,"최근 명령");
  }catch(err){
    console.warn("[VOICE] history skipped",err);
  }
}
async function loadBase(){
  $("staffLabel").textContent="전성권 관장 · 자료 불러오는 중";
  $("recognitionState").textContent="준비";
  $("refreshButton").disabled=true;

  try{
    const[p,s,c]=await Promise.all([
      withTimeout(db.from("class_periods").select("id,code,name,start_time,end_time,sort_order").eq("is_active",true).order("sort_order"),8000,"수업부"),
      withTimeout(db.from("students").select("id,student_code,name,enrollments(class_period_id,status)").order("student_code"),8000,"원생"),
      withTimeout(db.from("star_categories").select("id,code,name,icon,sort_order").eq("is_active",true).order("sort_order"),8000,"STAR 항목")
    ]);

    const error=p.error||s.error||c.error;
    if(error)throw error;

    state.periods=p.data||[];
    state.students=(s.data||[]).filter(x=>enrollment(x).status==="재원");
    state.categories=c.data||[];

    const sel=$("periodSelect");
    sel.innerHTML=state.periods.map(x=>`<option value="${x.id}">${esc(x.code)} · ${esc(x.name)}</option>`).join("");

    state.period=recommendPeriod()||state.periods[0]||null;
    if(state.period)sel.value=state.period.id;
    sel.onchange=async()=>{
      state.period=state.periods.find(x=>x.id===sel.value)||null;
      await syncSessionInfo();
    };

    await syncSessionInfo();
    $("staffLabel").textContent="전성권 관장 · 준비 완료";
    $("speechSupport").textContent ||= "한국어 음성인식 준비 완료";
    return true;
  }catch(err){
    console.error("[VOICE] loadBase failed",err);
    state.periods=[];state.students=[];state.categories=[];state.period=null;
    $("periodSelect").innerHTML="";
    $("sessionInfo").textContent="수업 자료 연결 실패";
    $("staffLabel").textContent="전성권 관장 · 자료 연결 오류";
    result("error","수업 자료를 불러오지 못했습니다.",err?.message||String(err));
    return false;
  }finally{
    $("refreshButton").disabled=false;
  }
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
  r.onresult=async e=>{
    const alts=Array.from(e.results[0]||[]);
    const score=a=>{
      const n=normalize(a.transcript), compact=n.replace(/\s/g,"");
      let sc=Number(a.confidence||0);
      if(/출석|지각|결석|별|STAR|스타|칭찬|잘했어|최고|MVP|엠브이피|챔피언|수업|시작|종료|마치|전원|SPARK|스파크/.test(n))sc+=2;
      if(state.students.some(st=>compact.includes(clean(st.name).replace(/\s/g,""))))sc+=3;
      if(state.periods.some(pd=>compact.includes(clean(pd.name).replace(/\s/g,""))||compact.includes(clean(pd.code).replace(/\s/g,""))))sc+=1;
      return sc;
    };
    const alt=alts.sort((a,b)=>score(b)-score(a))[0]||e.results[0][0];
    const text=alt.transcript,confidence=Number(alt.confidence||0);
    $("heardBox").hidden=false;$("heardText").textContent=text;
    $("confidenceText").textContent=confidence?`인식 신뢰도 ${Math.round(confidence*100)}%`:"";
    $("commandInput").value=text;await runCommand(text,{confidence,source:"voice"});
  };
  $("speechSupport").textContent="한국어 음성인식 준비 완료";
}

function findPeriod(text){const t=text.replace(/\s/g,"");return state.periods.find(p=>t.includes(clean(p.name).replace(/\s/g,""))||t.includes(clean(p.code).replace(/\s/g,"")))||state.period}

function extractStudentTextForAction(text){
  let x=normalize(text);
  // Remove action words and known STAR/MVP tail words, leaving the spoken name as cleanly as possible.
  x=x.replace(/\b(출석|지각|결석|별|스타|STAR|MVP|엠브이피|챔피언)\b/gi," ");
  // Remove common praise/category result phrases while keeping possible category nouns out of the name search.
  const cats=(state.starCategories||[]).map(c=>clean(c.name)).filter(Boolean).sort((a,b)=>b.length-a.length);
  for(const c of cats)x=x.replaceAll(c," ");
  x=x.replace(/\b(칭찬해줘|칭찬해|칭찬하자|잘했어|잘했네|최고야|멋지다|좋았어|아주 좋아|오늘)\b/g," ");
  return x.replace(/\s+/g," ").trim();
}
function studentMatches(text,period=null){
  const t=clean(text).replace(/\s/g,""),all=state.students||[];
  // 전체 재원생에서 성명 완전 포함 검색
  const exact=all.filter(s=>t.includes(clean(s.name).replace(/\s/g,"")));
  if(exact.length)return exact;
  // 명령어를 제거해 "민규 출석" -> "민규"로 검색
  let q=t;
  ["출석","지각","결석","별","스타","STAR","MVP","엠브이피","챔피언","칭찬","칭찬해줘","칭찬해","왔어","왔어요","왔습니다","도착","도착했어","늦었어","안왔어","안와"].forEach(w=>q=q.replaceAll(w,""));
  q=q.replace(/^(계명아파트|계명아|개명아|계명야)/,"").trim();
  if(!q)return [];
  const partial=all.filter(s=>{const n=clean(s.name).replace(/\s/g,"");return n.includes(q)||q.includes(n)});
  if(partial.length)return partial;
  // 이름 한 글자 STT 오인식: 유일한 최단 후보일 때만 허용
  const dist=(a,b)=>{const d=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));for(let i=0;i<=a.length;i++)d[i][0]=i;for(let j=0;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length]};
  const ranked=all.map(st=>({st,d:dist(clean(st.name).replace(/\s/g,""),q)})).sort((a,b)=>a.d-b.d);
  return ranked.length&&ranked[0].d<=1&&(!ranked[1]||ranked[1].d>ranked[0].d)?[ranked[0].st]:[];
}
function categoryMatches(text){const t=text.replace(/\s/g,"");return state.categories.filter(c=>t.includes(clean(c.name).replace(/별$/,""))||t.includes(clean(c.code).toLowerCase()))}
function choose(title,items,label){return new Promise(resolve=>{const d=$("choiceDialog"),list=$("choiceList");$("choiceTitle").textContent=title;list.innerHTML="";items.forEach(item=>{const b=document.createElement("button");b.type="button";b.innerHTML=label(item);b.onclick=()=>{d.close();resolve(item)};list.appendChild(b)});d.onclose=()=>resolve(null);d.showModal()})}
function confirmCommand(message){return new Promise(resolve=>{const d=$("confirmDialog");$("confirmMessage").textContent=message;d.onclose=()=>resolve(d.returnValue==="confirm");d.showModal()})}
async function resolveStudent(text,period){const matches=studentMatches(text,null);if(matches.length===1)return matches[0];if(matches.length>1)return choose("같거나 비슷한 이름이 있습니다. 학생을 선택해 주세요.",matches,s=>`${esc(s.name)} <small>${esc(s.student_code)}</small>`);return null}
async 
function defaultStarCategory(){
  const list=state.categories||[];
  if(!list.length)return null;
  // 기본/칭찬 계열이 있으면 우선, 없으면 현재 활성 STAR의 첫 항목을 사용한다.
  return list.find(c=>/기본|칭찬|basic|general/i.test(`${clean(c.name)} ${clean(c.code)}`)) || list[0];
}
function isBareStarCommand(text){
  // "김민규 별", "민규 별"처럼 별 종류를 말하지 않은 가장 빠른 수업용 명령.
  const n=normalize(text);
  const cats=(state.categories||[]).filter(c=>{
    const key=clean(c.name).replace(/별$/,"").replace(/\s/g,"");
    return key && n.replace(/\s/g,"").includes(key);
  });
  return /별$/.test(n) && cats.length===0;
}
function resolveCategory(text){const matches=categoryMatches(text);if(matches.length===1)return matches[0];if(matches.length>1)return choose("STAR 종류를 선택해 주세요.",matches,c=>`${c.icon||"⭐"} ${esc(c.name)}`);return choose("어떤 STAR를 줄까요?",state.categories,c=>`${c.icon||"⭐"} ${esc(c.name)}`)}

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
    if(/(가족.*(돕기|도움)|가족돕기).*?(SPARK|스파크).*?(완료|기록)/i.test(normalized)){const studentText=extractStudentTextForAction(text);const student=await resolveStudent(studentText||text,period);if(!student)throw new Error("SPARK를 기록할 학생을 확인할 수 없습니다.");const ok=await confirmCommand(`${student.name} 학생의 가족돕기 SPARK를 완료 기록할까요?`);if(!ok){await logCommand({transcript:raw,normalized,commandType:"spark_family_help",payload:{student_id:student.id},status:"cancelled",resultText:"사용자 취소",confidence,source});return}await saveFamilySpark(student);const msg=`${student.name} 가족돕기 SPARK 기록 완료`;result("ok",msg,"SPARK 함께하기 기록에 저장했습니다.");say(msg);await logCommand({transcript:raw,normalized,commandType:"spark_family_help",payload:{student_id:student.id},status:"executed",resultText:msg,confidence,source});return}
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
      const studentText=extractStudentTextForAction(normalized);
      const student=await resolveStudent(studentText||normalized,period);
      if(!student)throw new Error("STAR를 받을 학생을 확인할 수 없습니다.");

      const quick=isBareStarCommand(normalized);
      const category=quick?defaultStarCategory():await resolveCategory(normalized);
      if(!category){
        result("warn","STAR 지급을 취소했습니다.","사용 가능한 STAR 항목이 없습니다.");
        return;
      }

      await saveStar(student,category,period);
      const msg=quick?`${student.name} 별 하나 추가`:`${student.name} ${category.name} 하나`;
      result("ok",msg,quick?"STAR +1 저장 완료":"STAR가 저장되었습니다.");
      say(msg);
      await logCommand({
        transcript:raw,normalized,commandType:"star",
        payload:{student_id:student.id,category_id:category.id,period_id:period?.id,quick_star:quick},
        status:"executed",resultText:msg,confidence,source
      });
      return;
    }

    const status=/지각/.test(normalized)?"late":/결석/.test(normalized)?"absent":/출석/.test(normalized)?"present":null;
    if(status){const student=await resolveStudent(normalized,period);if(!student)throw new Error("출석 처리할 학생을 확인할 수 없습니다.");await saveAttendance(student,status,period);const label={present:"출석",late:"지각",absent:"결석"}[status],msg=`${student.name} ${label} 완료`;result("ok",msg,`${period?.name||"현재 수업"}에 저장했습니다.`);say(msg);await logCommand({transcript:raw,normalized,commandType:"attendance",payload:{student_id:student.id,status,period_id:period?.id},status:"executed",resultText:msg,confidence,source});await syncSessionInfo();return}

    result("warn","아직 이해하지 못한 명령입니다.","‘명령 예시’를 눌러 사용할 수 있는 말을 확인해 주세요.");await logCommand({transcript:raw,normalized,commandType:"unknown",status:"rejected",resultText:"지원하지 않는 명령",confidence,source});
  }catch(e){const msg=e?.message||String(e);result("error","명령을 실행하지 못했습니다.",msg);toast(msg);await logCommand({transcript:raw,normalized,commandType:"error",status:"failed",resultText:msg,confidence,source})}
}

const loginButton=$("loginButton"); if(loginButton) loginButton.onclick=login;
const logoutButton=$("logoutButton"); if(logoutButton) logoutButton.onclick=async()=>{await db.auth.signOut();location.reload()};
$("micButton").onclick=()=>{if(!state.recognition)return;try{state.listening?state.recognition.stop():state.recognition.start()}catch{}};
$("runButton").onclick=()=>runCommand($("commandInput").value,{source:"text"});$("commandInput").onkeydown=e=>{if(e.key==="Enter")runCommand($("commandInput").value,{source:"text"})};
$("refreshButton").onclick=async()=>{
  toast("수업 자료 다시 불러오는 중");
  const ok=await loadBase();
  if(ok){
    try{await withTimeout(loadHistory(),5000,"최근 명령")}catch(_){}
    toast("새로고침 완료");
  }else{
    toast("자료 연결을 확인해 주세요");
  }
};$("helpButton").onclick=()=>$("helpDialog").showModal();
document.querySelectorAll("[data-quick]").forEach(b=>b.onclick=()=>{let t=b.dataset.quick;if(t==="오늘 MVP")t=`오늘 ${state.period?.name||""} MVP`;if(t==="수업 종료")t=`${state.period?.name||""} 수업 종료`;$("commandInput").value=t;runCommand(t,{source:"text"})});
try{db.auth.onAuthStateChange(()=>{})}catch(_){}
boot().catch(err=>{
  console.error("[VOICE] boot fatal",err);
  $("staffLabel").textContent="전성권 관장 · 준비 오류";
  $("recognitionState").textContent="오류";
  result("error","계명아 초기화 오류",err?.message||String(err));
});
