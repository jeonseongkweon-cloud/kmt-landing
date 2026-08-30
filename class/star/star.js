import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SINGLE_OWNER_EMAIL="class-admin@ipma.kr";
const isSingleOwner=session=>String(session?.user?.email||"").trim().toLowerCase()===SINGLE_OWNER_EMAIL;
const cfg=window.KMT_STAR_CONFIG,db=createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,detectSessionInUrl:true,flowType:"pkce"}}),$=id=>document.getElementById(id);
const WAKE_WORD="계명아";
const VOICE_COMMAND_COOLDOWN_MS=2600;
const NOTICE_ICONS={focus:"🥋",notice:"📢",personal:"🔔",item:"🎒",event:"📅",praise:"⭐"};
const state={periods:[],students:[],session:null,period:null,categories:[],category:null,attendance:[],events:[],praises:[],champions:[],notices:[],realtimeChannel:null,realtimeTimer:null,voice:{recognition:null,armed:false,listening:false,speaking:false,restartTimer:null,lastCommands:new Map(),lastVoiceStarId:null}};
const praisePresets=["오늘 인사가 아주 좋았어요.","친구를 도와줬어요.","끝까지 포기하지 않았어요.","수업에 집중했어요."];
const clean=v=>v==null?"":String(v).trim(),escapeHtml=v=>clean(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
function localDate(){return new Intl.DateTimeFormat("en-CA",{timeZone:cfg.timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function localTime(v=new Date()){return new Intl.DateTimeFormat("ko-KR",{timeZone:cfg.timezone,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(v))}
function toast(m){$("toast").textContent=m;$("toast").classList.add("show");clearTimeout(window.__t);window.__t=setTimeout(()=>$("toast").classList.remove("show"),1600)}
function enrollment(s){return Array.isArray(s.enrollments)?(s.enrollments[0]||{}):(s.enrollments||{})}
function rosterFor(p){return state.students.filter(s=>enrollment(s).class_period_id===p.id)}
function attendedStudents(){const ids=new Set(state.attendance.filter(a=>["present","late"].includes(a.status)).map(a=>a.student_id));return rosterFor(state.period).filter(s=>ids.has(s.id))}
function eventsFor(id){return state.events.filter(e=>e.student_id===id)}
function categoryCount(id,cat){return eventsFor(id).filter(e=>e.category_id===cat).length}
function setVoiceStatus(mode,text){
  const el=$("voiceStatus");if(!el)return;el.className=`voice-status ${mode}`;el.textContent=text;
  $("voiceStartButton")?.classList.toggle("active",state.voice.armed);
}
function normalizeSpeech(v){return clean(v).replace(/[.!?。]/g,"").replace(/\s+/g," ").trim()}
function stripWakeWord(v){
  const t=normalizeSpeech(v),i=t.indexOf(WAKE_WORD);if(i<0)return null;
  return clean(t.slice(i+WAKE_WORD.length).replace(/^[,\s]+/,""));
}
function levenshtein(a,b){
  a=clean(a);b=clean(b);const m=a.length,n=b.length,dp=Array(n+1).fill(0).map((_,i)=>i);
  for(let i=1;i<=m;i++){let prev=dp[0];dp[0]=i;for(let j=1;j<=n;j++){const tmp=dp[j];dp[j]=Math.min(dp[j]+1,dp[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=tmp}}
  return dp[n];
}
function currentRoster(){return state.period?rosterFor(state.period):[]}
function matchStudentFromText(text,{allowGlobalExact=false}={}){
  const raw=clean(text).replace(/\s/g,""),roster=currentRoster();
  const exact=roster.filter(s=>raw.includes(clean(s.name).replace(/\s/g,"")));
  if(exact.length===1)return {student:exact[0],confidence:1,scope:"roster"};
  // 현재 수업 명단만 유사매칭. 짧은 이름은 오인식을 막기 위해 엄격하게 처리.
  let best=null;
  for(const s of roster){
    const name=clean(s.name).replace(/\s/g,"");
    const tokens=[raw,...raw.split(/별|출석|지각|단정|인사|자세|발차기|배려|정리|도전|게임/).filter(Boolean)];
    for(const token of tokens){
      const sample=token.slice(0,Math.max(name.length,token.length));
      const d=levenshtein(name,sample),score=1-d/Math.max(name.length,sample.length,1);
      if(!best||score>best.score)best={student:s,score};
    }
  }
  if(best&&best.score>=.78)return {student:best.student,confidence:best.score,scope:"roster-fuzzy"};
  if(allowGlobalExact){
    const global=state.students.filter(s=>raw.includes(clean(s.name).replace(/\s/g,"")));
    if(global.length===1)return {student:global[0],confidence:.98,scope:"global-exact"};
  }
  return null;
}
function categoryFromVoice(text){
  const t=clean(text).replace(/\s/g,"");
  const aliases={NEAT:["단정별","단정"],GREETING:["인사별","인사"],POSTURE:["자세별","자세","집중별"],KICK:["발차기별","발차기"],CARE:["배려별","배려"],CLEANUP:["정리별","정리"],CHALLENGE:["도전별","도전"],GAME:["게임별","게임"]};
  for(const c of state.categories){const words=[...(aliases[c.code]||[]),clean(c.name).replace(/\s/g,"")];if(words.some(w=>w&&t.includes(w)))return c}
  if(/별/.test(t))return state.category;
  return null;
}
function isDuplicateVoiceCommand(command){
  const now=Date.now(),key=normalizeSpeech(command);const last=state.voice.lastCommands.get(key)||0;
  for(const[k,v]of state.voice.lastCommands)if(now-v>15000)state.voice.lastCommands.delete(k);
  if(now-last<VOICE_COMMAND_COOLDOWN_MS)return true;state.voice.lastCommands.set(key,now);return false;
}
function playStarSound(){
  try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const ctx=window.__kmtStarAudio||(window.__kmtStarAudio=new C());if(ctx.state==="suspended")ctx.resume();
    const now=ctx.currentTime;[[740,0],[988,.06],[1318,.12]].forEach(([f,d],i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type="sine";o.frequency.value=f;g.gain.setValueAtTime(.0001,now+d);g.gain.exponentialRampToValueAtTime(i===2?.07:.045,now+d+.012);g.gain.exponentialRampToValueAtTime(.0001,now+d+.16);o.connect(g).connect(ctx.destination);o.start(now+d);o.stop(now+d+.18)})}catch(e){console.warn("[STAR SOUND]",e)}
}
function playAttendanceSound(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const ctx=window.__kmtStarAudio||(window.__kmtStarAudio=new C());if(ctx.state==="suspended")ctx.resume();const o=ctx.createOscillator(),g=ctx.createGain(),n=ctx.currentTime;o.frequency.setValueAtTime(660,n);o.frequency.linearRampToValueAtTime(990,n+.15);g.gain.setValueAtTime(.05,n);g.gain.exponentialRampToValueAtTime(.0001,n+.22);o.connect(g).connect(ctx.destination);o.start();o.stop(n+.23)}catch{}}
function highlightStudent(student,{arrive=false}={}){
  requestAnimationFrame(()=>{const card=document.querySelector(`[data-student="${student.id}"]`);if(!card)return;card.classList.remove("voice-hit","voice-arrive");void card.offsetWidth;card.classList.add(arrive?"voice-arrive":"voice-hit");const main=card.querySelector(".star-main");if(main){const plus=document.createElement("span");plus.className="voice-plus";plus.textContent=arrive?"어서 와!":"⭐ +1";main.appendChild(plus);setTimeout(()=>plus.remove(),1000)}setTimeout(()=>card.classList.remove("voice-hit","voice-arrive"),950)})
}
function pauseRecognitionForTts(){
  state.voice.speaking=true;if(state.voice.recognition&&state.voice.listening){try{state.voice.recognition.abort()}catch{}}
}
function speakShort(text){
  if(!("speechSynthesis"in window))return;
  pauseRecognitionForTts();speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="ko-KR";u.rate=1.16;u.pitch=1.25;u.volume=.9;
  const voices=speechSynthesis.getVoices();u.voice=voices.find(v=>/ko-KR/i.test(v.lang)&&/(sunhi|yuna|여성|female|google.*한국)/i.test(v.name))||voices.find(v=>/ko-KR/i.test(v.lang))||null;
  const done=()=>{state.voice.speaking=false;scheduleVoiceRestart(320)};u.onend=done;u.onerror=done;speechSynthesis.speak(u);
}
function scheduleVoiceRestart(delay=450){
  clearTimeout(state.voice.restartTimer);if(!state.voice.armed||state.voice.speaking||document.hidden)return;
  state.voice.restartTimer=setTimeout(()=>{if(!state.voice.armed||state.voice.listening||state.voice.speaking)return;try{state.voice.recognition?.start()}catch{}},delay);
}
function initSpeechRecognition(){
  if(state.voice.recognition)return true;const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return false;
  const r=new SR();r.lang="ko-KR";r.continuous=true;r.interimResults=false;r.maxAlternatives=3;
  r.onstart=()=>{state.voice.listening=true;setVoiceStatus("listening","🟢 계명아 듣는 중")};
  r.onspeechend=()=>{if(state.voice.armed&&!state.voice.speaking)setVoiceStatus("waiting","🟡 계명아 대기중")};
  r.onresult=async e=>{
    if(state.voice.speaking||!state.voice.armed)return;
    for(let i=e.resultIndex;i<e.results.length;i++){
      const res=e.results[i];if(!res.isFinal)continue;
      const alternatives=[...res].map(a=>a.transcript);const withWake=alternatives.map(stripWakeWord).find(Boolean);
      if(!withWake)continue;
      if(isDuplicateVoiceCommand(withWake)){toast("같은 음성명령 중복 실행을 막았습니다.");continue}
      try{await handleVoiceCommand(withWake)}catch(err){console.error("[STAR VOICE]",err);toast(err.message||"음성명령 처리 실패");speakShort("다시 한번 말해 주세요")}
    }
  };
  r.onerror=e=>{
    state.voice.listening=false;
    if(e.error==="not-allowed"||e.error==="service-not-allowed"){state.voice.armed=false;setVoiceStatus("off","🔴 마이크 권한 필요");toast("Chrome 주소창의 마이크 권한을 허용해 주세요.");return}
    if(e.error!=="aborted"&&e.error!=="no-speech")console.warn("[SpeechRecognition]",e.error);
  };
  r.onend=()=>{state.voice.listening=false;if(state.voice.armed&&!state.voice.speaking){setVoiceStatus("waiting","🟡 계명아 대기중");scheduleVoiceRestart()}else if(!state.voice.armed)setVoiceStatus("off","🔴 음성 꺼짐")};
  state.voice.recognition=r;return true;
}
async function startVoiceClass(){
  if(state.voice.armed){state.voice.armed=false;clearTimeout(state.voice.restartTimer);try{state.voice.recognition?.stop()}catch{};setVoiceStatus("off","🔴 음성 꺼짐");$("voiceStartButton").textContent="🎤 계명아 음성수업 시작";return}
  if(!initSpeechRecognition()){toast("이 브라우저는 Web Speech 음성인식을 지원하지 않습니다.");setVoiceStatus("off","🔴 음성 미지원");return}
  state.voice.armed=true;$("voiceStartButton").textContent="⏹ 계명아 음성수업 끄기";setVoiceStatus("waiting","🟡 계명아 대기중");
  try{state.voice.recognition.start()}catch{scheduleVoiceRestart(150)}
}
async function markAttendanceFromStar(student){
  if(state.session.status==="closed")throw new Error("종료된 수업입니다.");
  const old=state.attendance.find(a=>a.student_id===student.id);
  const payload={session_id:state.session.id,student_id:student.id,attendance_date:localDate(),status:"present",checked_at:new Date().toISOString(),points_awarded:1};
  const q=old?db.from("attendance").update(payload).eq("session_id",state.session.id).eq("student_id",student.id):db.from("attendance").insert(payload);
  const {data,error}=await q.select("student_id,status").single();if(error)throw error;
  const i=state.attendance.findIndex(a=>a.student_id===student.id);if(i>=0)state.attendance[i]=data;else state.attendance.push(data);
  renderStudents();highlightStudent(student,{arrive:true});playAttendanceSound();speakShort(`${student.name} 출석 완료!`);toast(`${student.name} 출석 완료`);
}
async function awardByVoice(student,category){
  const prev=state.category;state.category=category;renderCategories();await award(student,{source:"voice"});state.category=category;
}
async function undoLastVoiceStar(){
  const last=state.events.at(-1);if(!last){toast("취소할 STAR가 없습니다.");return}
  const student=state.students.find(s=>s.id===last.student_id);const {error}=await db.from("star_events").delete().eq("id",last.id);if(error)throw error;
  state.events=state.events.filter(e=>e.id!==last.id);renderStudents();toast(`${student?.name||"학생"} STAR 1건 취소`);speakShort("방금 별 취소 완료");
}
async function handleVoiceCommand(command){
  const t=normalizeSpeech(command);
  if(/^(방금\s*)?(취소|별\s*취소|스타\s*취소)$/.test(t)){await undoLastVoiceStar();return}
  if(/^공지\s+/.test(t)){await addNoticeFromVoice("notice",t.replace(/^공지\s+/,""));return}
  if(/^(오늘\s*)?수련중점\s+/.test(t)){await addNoticeFromVoice("focus",t.replace(/^(오늘\s*)?수련중점\s+/,""));return}
  if(/출석/.test(t)){
    const hit=matchStudentFromText(t,{allowGlobalExact:true});if(!hit)throw new Error("학생 이름을 확실히 찾지 못했습니다.");
    // 현재 수업부가 아닌 학생은 현재 세션에 임의 출석시키지 않는다.
    if(enrollment(hit.student).class_period_id!==state.period.id)throw new Error(`${hit.student.name} 학생은 현재 수업부 명단이 아닙니다.`);
    await markAttendanceFromStar(hit.student);return;
  }
  const category=categoryFromVoice(t);if(category){
    const hit=matchStudentFromText(t);if(!hit)throw new Error("현재 수업 학생 중 이름을 확실히 찾지 못했습니다.");
    await awardByVoice(hit.student,category);return;
  }
  throw new Error("계명아 명령을 이해하지 못했습니다.");
}
function noticeLabel(type){return {focus:"수련중점",notice:"수업공지",personal:"개인전달",item:"준비물",event:"행사/일정",praise:"칭찬"}[type]||"공지"}
async function loadNotices(){
  if(!state.period)return;const q=await db.from("kmt_class_notices").select("*").eq("notice_date",localDate()).eq("class_period_id",state.period.id).eq("is_active",true).order("created_at");
  if(q.error){console.warn("[NOTICES]",q.error.message);state.notices=[]}else state.notices=q.data||[];renderTicker();renderNoticeList();
}
function renderTicker(){
  const track=$("tickerTrack");if(!track)return;const items=state.notices.length?state.notices:[{notice_type:"focus",message:"바른 인사 · 정확한 자세 · 힘찬 기합"}];
  const one=items.map(n=>`<span>${NOTICE_ICONS[n.notice_type]||"📢"} ${escapeHtml(noticeLabel(n.notice_type))} : ${escapeHtml(n.message)}</span>`).join("");
  track.innerHTML=one+one;track.style.setProperty("--ticker-duration",`${Math.max(28,items.length*12)}s`);
}
function renderNoticeList(){
  const el=$("noticeList");if(!el)return;el.innerHTML=state.notices.length?state.notices.map(n=>`<div class="notice-row"><small>${NOTICE_ICONS[n.notice_type]||"📢"} ${escapeHtml(noticeLabel(n.notice_type))}</small><span>${escapeHtml(n.message)}</span><button data-notice-delete="${n.id}">삭제</button></div>`).join(""):'<p class="muted">등록된 공지가 없습니다.</p>';
  el.querySelectorAll("[data-notice-delete]").forEach(b=>b.onclick=()=>deleteNotice(b.dataset.noticeDelete));
}
async function addNotice(type,message){
  const payload={notice_date:localDate(),class_period_id:state.period.id,session_id:state.session?.id||null,notice_type:type,message:clean(message),is_active:true};
  const r=await db.from("kmt_class_notices").insert(payload).select().single();if(r.error)throw r.error;state.notices.push(r.data);renderTicker();renderNoticeList();
}
async function addNoticeFromVoice(type,message){if(!clean(message))throw new Error("공지 내용을 말해 주세요.");await addNotice(type,message);toast("전광판 공지 추가");speakShort("공지 추가 완료")}
async function deleteNotice(id){const r=await db.from("kmt_class_notices").update({is_active:false}).eq("id",id);if(r.error){toast(r.error.message);return}state.notices=state.notices.filter(n=>n.id!==id);renderTicker();renderNoticeList()}


async function login(){location.replace("../")}
async function boot(){const{data:{session},error}=await db.auth.getSession();if(error){toast(`로그인 확인 실패: ${error.message}`);return}if(!session||!isSingleOwner(session)){location.replace("../");return}$("loginScreen").hidden=true;$("app").hidden=false;startClock();await loadBase()}
function startClock(){const tick=()=>{$("dateLabel").textContent=new Intl.DateTimeFormat("ko-KR",{timeZone:cfg.timezone,year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(new Date());$("clockLabel").textContent=localTime()};tick();setInterval(tick,15000)}
async function loadBase(){const [p,s,c]=await Promise.all([db.from("class_periods").select("*").eq("is_active",true).order("sort_order"),db.from("students").select("id,student_code,name,photo_url,enrollments(class_period_id,status)").order("student_code"),db.from("star_categories").select("*").eq("is_active",true).order("sort_order")]);const error=p.error||s.error||c.error;if(error){toast(error.message);return}state.periods=p.data||[];state.students=(s.data||[]).filter(x=>enrollment(x).status==="재원");state.categories=c.data||[];state.category=state.categories[0]||null;renderPeriods()}
function renderPeriods(){$("periodGrid").innerHTML=state.periods.map(p=>`<button class="period-card" data-id="${p.id}"><small>${escapeHtml(p.code)}</small><strong>${escapeHtml(p.name)}</strong><span>${rosterFor(p).length}명 · STAR 수업판</span></button>`).join("");document.querySelectorAll(".period-card").forEach(b=>b.onclick=()=>openPeriod(state.periods.find(p=>p.id===b.dataset.id)))}
async function openPeriod(p){state.period=p;const {data,error}=await db.from("class_sessions").select("*").eq("session_date",localDate()).eq("class_period_id",p.id).maybeSingle();if(error){toast(error.message);return}if(!data){toast("먼저 출석 화면에서 오늘 수업을 시작해 주세요.");return}state.session=data;await loadRecords();await loadNotices();startRealtime();$("periodScreen").hidden=true;$("starScreen").hidden=false;$("sessionDate").textContent=localDate();$("sessionTitle").textContent=`${p.name} STAR 수업`;renderCategories();renderStudents()}
async function loadRecords(){const [a,e,p,c]=await Promise.all([db.from("attendance").select("student_id,status").eq("session_id",state.session.id),db.from("star_events").select("*").eq("session_id",state.session.id).order("awarded_at"),db.from("praise_events").select("*").eq("session_id",state.session.id).order("praised_at"),db.from("champions").select("*,star_categories(name,icon)").eq("session_id",state.session.id).order("selected_at")]);const error=a.error||e.error||p.error||c.error;if(error){toast(error.message);return}state.attendance=a.data||[];state.events=e.data||[];state.praises=p.data||[];state.champions=c.data||[]}
function renderCategories(){$("categoryBar").innerHTML=state.categories.map(c=>`<button class="category ${c.id===state.category?.id?"active":""}" data-id="${c.id}">${c.icon} ${escapeHtml(c.name)}</button>`).join("");document.querySelectorAll(".category").forEach(b=>b.onclick=()=>{state.category=state.categories.find(c=>c.id===b.dataset.id);$("categoryName").textContent=`${state.category.icon} ${state.category.name} 선택됨`;renderCategories()})}
function renderStudents(){const list=attendedStudents();$("emptyMessage").hidden=!!list.length;$("totalStars").textContent=state.events.length;$("studentGrid").innerHTML=list.map(s=>{const count=eventsFor(s.id).length,photo=clean(s.photo_url),perfect=count>=cfg.perfectStar;return `<article class="student ${perfect?"perfect":""}" data-student="${s.id}"><button class="star-main" data-star="${s.id}">${photo?`<img class="photo" src="${escapeHtml(photo)}" alt="">`:`<div class="photo fallback">${escapeHtml(s.name.slice(0,2))}</div>`}<h2>${escapeHtml(s.name)}</h2><div class="star-count">⭐ × ${count}</div><div class="meter"><i style="width:${Math.min(100,count/cfg.perfectStar*100)}%"></i></div><small>${perfect?"PERFECT STAR":"카드를 눌러 +1"}</small></button><div class="card-actions"><button data-detail="${s.id}">상세</button><button class="praise" data-praise="${s.id}">👏 칭찬</button><button class="undo" data-undo="${s.id}">UNDO</button></div></article>`}).join("");document.querySelectorAll("[data-star]").forEach(b=>b.onclick=()=>award(state.students.find(s=>s.id===b.dataset.star)));document.querySelectorAll("[data-undo]").forEach(b=>b.onclick=()=>undo(state.students.find(s=>s.id===b.dataset.undo)));document.querySelectorAll("[data-detail]").forEach(b=>b.onclick=()=>showDetail(state.students.find(s=>s.id===b.dataset.detail)));document.querySelectorAll("[data-praise]").forEach(b=>b.onclick=()=>showPraise(state.students.find(s=>s.id===b.dataset.praise)))}

async function awardAdvancedBadges(studentId){
  const {data,error}=await db.rpc("kmt_award_advanced_star_badges",{p_student_id:studentId,p_session_id:state.session.id});
  if(error){console.warn("[STAR ADVANCED BADGE]",error.message);return []}
  return data||[];
}
function categoryLeader(categoryId){
  const list=attendedStudents().map(s=>({s,n:categoryCount(s.id,categoryId)})).sort((a,b)=>b.n-a.n||a.s.name.localeCompare(b.s.name,"ko"));
  return list[0]?.n>0?list[0]:null;
}
function advancedRewardText(student,total,newBadges){
  const leaders=state.categories.map(c=>({c,lead:categoryLeader(c.id)})).filter(x=>x.lead?.s.id===student.id&&x.lead.n>0);
  const leaderText=leaders.length?` · 현재 ${leaders.slice(0,2).map(x=>championTitle(x.c)).join("·")}`:"";
  const badgeText=newBadges.length?` · 새 배지 ${newBadges.join("·")}`:"";
  return `${total>=cfg.perfectStar?"PERFECT STAR!":`오늘 ⭐${total}`}${leaderText}${badgeText}`;
}

async function award(s,{source="click"}={}){if(!state.category){toast("STAR 카테고리를 먼저 선택해 주세요.");return}if(state.session.status==="closed"){toast("종료된 수업입니다.");return}$("saveStatus").textContent=`${s.name} 저장 중...`;const category=state.category;const {data,error}=await db.from("star_events").insert({session_id:state.session.id,student_id:s.id,category_id:category.id}).select().single();if(error){toast(error.message);return}state.events.push(data);state.voice.lastVoiceStarId=source==="voice"?data.id:state.voice.lastVoiceStarId;const total=eventsFor(s.id).length;const newBadges=await awardAdvancedBadges(s.id);renderStudents();showBurst(s,category,total,newBadges);highlightStudent(s);playStarSound();if(source==="voice")speakShort(`${s.name} ${category.name} 하나!`);$("saveStatus").textContent=advancedRewardText(s,total,newBadges);setTimeout(()=>$("saveStatus").textContent="Supabase 자동저장",900)}
function stopRealtime(){if(state.realtimeTimer){clearTimeout(state.realtimeTimer);state.realtimeTimer=null}if(state.realtimeChannel){db.removeChannel(state.realtimeChannel);state.realtimeChannel=null}}
function scheduleRealtimeRefresh(){clearTimeout(state.realtimeTimer);state.realtimeTimer=setTimeout(async()=>{if(!state.session)return;await loadRecords();renderStudents();if(!$("championDialog").open)renderChampions();$("saveStatus").textContent="Supabase 자동저장 · LIVE"},250)}
async function syncSessionState(){if(!state.session)return;const{data,error}=await db.from("class_sessions").select("*").eq("id",state.session.id).maybeSingle();if(!error&&data)state.session=data}
function startRealtime(){
  stopRealtime();if(!state.session)return;const sid=state.session.id;
  state.realtimeChannel=db.channel(`kmt-star-live-${sid}`)
    .on("postgres_changes",{event:"*",schema:"public",table:"attendance",filter:`session_id=eq.${sid}`},scheduleRealtimeRefresh)
    .on("postgres_changes",{event:"*",schema:"public",table:"star_events",filter:`session_id=eq.${sid}`},scheduleRealtimeRefresh)
    .on("postgres_changes",{event:"*",schema:"public",table:"praise_events",filter:`session_id=eq.${sid}`},scheduleRealtimeRefresh)
    .on("postgres_changes",{event:"*",schema:"public",table:"champions",filter:`session_id=eq.${sid}`},scheduleRealtimeRefresh)
    .on("postgres_changes",{event:"*",schema:"public",table:"kmt_class_notices",filter:`class_period_id=eq.${state.period.id}`},()=>setTimeout(loadNotices,180))
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"class_sessions",filter:`id=eq.${sid}`},async()=>{await syncSessionState();scheduleRealtimeRefresh()})
    .subscribe(status=>{if(status==="SUBSCRIBED")$("saveStatus").textContent="Supabase 자동저장 · LIVE";else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT")$("saveStatus").textContent="LIVE 재연결 중"});
}

function showBurst(s,c,total,newBadges=[]){$("burstIcon").textContent=total>=cfg.perfectStar?"🌟":c.icon;$("burstName").textContent=s.name;$("burstCategory").textContent=total>=cfg.perfectStar?"PERFECT STAR!":`${c.name} +1`;$("burstTotal").textContent=advancedRewardText(s,total,newBadges);$("starBurst").hidden=false;document.querySelector(".class-ticker")?.classList.add("star-priority");clearTimeout(window.__burst);window.__burst=setTimeout(()=>{$("starBurst").hidden=true;document.querySelector(".class-ticker")?.classList.remove("star-priority")},total>=cfg.perfectStar||newBadges.length?2500:1100)}
async function undo(s){const last=eventsFor(s.id).at(-1);if(!last){toast("되돌릴 STAR가 없습니다.");return}const {error}=await db.from("star_events").delete().eq("id",last.id);if(error){toast(error.message);return}state.events=state.events.filter(e=>e.id!==last.id);renderStudents();toast(`${s.name} 마지막 STAR 입력을 취소했습니다.`)}
function showDetail(s){const rows=state.categories.filter(c=>categoryCount(s.id,c.id)).map(c=>`<div class="detail-row"><span>${c.icon} ${escapeHtml(c.name)}</span><strong>${categoryCount(s.id,c.id)}</strong></div>`).join("");const praises=state.praises.filter(p=>p.student_id===s.id).map(p=>`<div class="detail-row"><span>👏 ${escapeHtml(p.message)}</span><small>${localTime(p.praised_at)}</small></div>`).join("");$("detailContent").innerHTML=`<h2>${escapeHtml(s.name)} · ⭐ × ${eventsFor(s.id).length}</h2>${rows||'<p class="muted">아직 받은 STAR가 없습니다.</p>'}<h3>오늘의 칭찬</h3>${praises||'<p class="muted">아직 칭찬 기록이 없습니다.</p>'}`;$("detailDialog").showModal()}
function showPraise(s){$("praiseStudentId").value=s.id;$("praiseTitle").textContent=`${s.name} 칭찬 기록`;$("praiseMessage").value="";$("praisePresets").innerHTML=praisePresets.map(x=>`<button type="button">${x}</button>`).join("");$("praisePresets").querySelectorAll("button").forEach(b=>b.onclick=()=>$("praiseMessage").value=b.textContent);$("praiseDialog").showModal()}
async function savePraise(e){e.preventDefault();const student_id=$("praiseStudentId").value,message=clean($("praiseMessage").value);const {data,error}=await db.from("praise_events").insert({session_id:state.session.id,student_id,message}).select().single();if(error){toast(error.message);return}state.praises.push(data);$("praiseDialog").close();toast("칭찬을 저장했습니다.")}
function championTitle(c){const map={GREETING:"인사왕",POSTURE:"집중왕",KICK:"발차기왕",CARE:"배려왕",CLEANUP:"정리왕",CHALLENGE:"도전왕",GAME:"게임왕",NEAT:"단정왕"};return map[c.code]||`${c.name} 왕`}
function showChampions(){const students=attendedStudents(),top=[...students].sort((a,b)=>eventsFor(b.id).length-eventsFor(a.id).length)[0];$("championSuggestions").innerHTML=`<div class="suggestion"><strong>🏆 오늘의 챔피언</strong><select data-title="오늘의 챔피언"><option value="">학생 선택</option>${students.map(s=>`<option value="${s.id}" ${s.id===top?.id?"selected":""}>${escapeHtml(s.name)} · ⭐${eventsFor(s.id).length}</option>`).join("")}</select><button>저장</button></div>`+state.categories.map(c=>{const rank=[...students].sort((a,b)=>categoryCount(b.id,c.id)-categoryCount(a.id,c.id))[0],score=rank?categoryCount(rank.id,c.id):0;return `<div class="suggestion"><strong>${c.icon} ${championTitle(c)}</strong><select data-title="${championTitle(c)}" data-category="${c.id}"><option value="">학생 선택</option>${students.map(s=>`<option value="${s.id}" ${score&&s.id===rank.id?"selected":""}>${escapeHtml(s.name)} · ${categoryCount(s.id,c.id)}</option>`).join("")}</select><button>저장</button></div>`}).join("");$("championSuggestions").querySelectorAll("button").forEach(b=>b.onclick=()=>saveChampion(b.previousElementSibling));renderChampions();$("championDialog").showModal()}
async function saveChampion(sel){if(!sel.value){toast("학생을 선택해 주세요.");return}const payload={session_id:state.session.id,student_id:sel.value,title:sel.dataset.title,category_id:sel.dataset.category||null};const {data,error}=await db.from("champions").upsert(payload,{onConflict:"session_id,title"}).select("*,star_categories(name,icon)").single();if(error){toast(error.message);return}state.champions=state.champions.filter(c=>c.title!==data.title);state.champions.push(data);renderChampions();toast(`${data.title} 저장 완료`)}
function renderChampions(){$("championList").innerHTML=state.champions.length?state.champions.map(c=>{const s=state.students.find(x=>x.id===c.student_id);return `<div class="champion-row"><span>${c.star_categories?.icon||"🏆"} ${escapeHtml(c.title)}</span><strong>${escapeHtml(s?.name||"")}</strong><button data-delete="${c.id}">삭제</button></div>`}).join(""):'<p class="muted">아직 선정된 챔피언이 없습니다.</p>';document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteChampion(b.dataset.delete))}
async function deleteChampion(id){const {error}=await db.from("champions").delete().eq("id",id);if(error){toast(error.message);return}state.champions=state.champions.filter(c=>c.id!==id);renderChampions()}


$("voiceStartButton").onclick=startVoiceClass;
$("noticeManageButton").onclick=()=>{renderNoticeList();$("noticeDialog").showModal()};
$("noticeForm").onsubmit=async e=>{e.preventDefault();try{await addNotice($("noticeType").value,$("noticeText").value);$("noticeText").value="";toast("전광판 공지를 추가했습니다.")}catch(err){toast(err.message)}};
document.addEventListener("visibilitychange",()=>{if(document.hidden&&state.voice.listening){try{state.voice.recognition?.stop()}catch{}}else if(!document.hidden&&state.voice.armed)scheduleVoiceRestart(250)});

$("loginButton").onclick=login;$("logoutButton").onclick=async()=>{await db.auth.signOut();location.reload()};$("backButton").onclick=()=>{stopRealtime();state.voice.armed=false;clearTimeout(state.voice.restartTimer);try{state.voice.recognition?.stop()}catch{};setVoiceStatus("off","🔴 음성 꺼짐");$("voiceStartButton").textContent="🎤 계명아 음성수업 시작";$("starScreen").hidden=true;$("periodScreen").hidden=false;state.session=null;state.period=null};$("praiseForm").onsubmit=savePraise;$("championButton").onclick=showChampions;document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).close());$("starBurst").onclick=()=>$("starBurst").hidden=true;db.auth.onAuthStateChange((_e,s)=>{if(s&&$("app").hidden)setTimeout(boot,0)});boot();
