import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { syncSparkRoster, syncSparkAward, syncSparkUndo } from "./spark-connector.js?v=102";
import { resolveStudentName } from "./smart-name-voice.js?v=100";

const SINGLE_OWNER_EMAIL="class-admin@ipma.kr";
const isSingleOwner=session=>String(session?.user?.email||"").trim().toLowerCase()===SINGLE_OWNER_EMAIL;
const cfg=window.KMT_STAR_CONFIG,db=createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,detectSessionInUrl:true,flowType:"pkce"}}),$=id=>document.getElementById(id);
const VOICE_COMMAND_COOLDOWN_MS=2600;
const NOTICE_ICONS={focus:"🥋",notice:"📢",personal:"🔔",item:"🎒",event:"📅",praise:"⭐"};
const state={periods:[],students:[],session:null,period:null,categories:[],category:null,attendance:[],events:[],praises:[],champions:[],notices:[],selectedIds:new Set(),mobileSort:localStorage.getItem("kmt-star-mobile-sort")||"stars",realtimeChannel:null,realtimeTimer:null,livePollTimer:null,livePollBusy:false,localAwardPending:0,leaderId:null,leaderReady:false,growth:{goal:0,stage:0,ready:false,revealTimer:null,celebrationTimers:[]},voice:{recognition:null,listening:false,mode:null,lastCommands:new Map(),lastVoiceStarId:null,pending:null,lastDebug:null,sessionId:0,active:null,retryTimer:null,debug:localStorage.getItem("kmt-voice-debug")==="on",debugEvents:[]}};
const praisePresets=["오늘 인사가 아주 좋았어요.","친구를 도와줬어요.","끝까지 포기하지 않았어요.","수업에 집중했어요."];
const clean=v=>v==null?"":String(v).trim(),escapeHtml=v=>clean(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const categoryDisplayName=category=>category?.code==="CARE"?"인성별":category?.code==="KICK"?"효도별":clean(category?.name);
function localDate(){return new Intl.DateTimeFormat("en-CA",{timeZone:cfg.timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function localTime(v=new Date()){return new Intl.DateTimeFormat("ko-KR",{timeZone:cfg.timezone,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(v))}
function toast(m){$("toast").textContent=m;$("toast").classList.add("show");clearTimeout(window.__t);window.__t=setTimeout(()=>$("toast").classList.remove("show"),1600)}
function enrollment(s){return Array.isArray(s.enrollments)?(s.enrollments[0]||{}):(s.enrollments||{})}
function rosterFor(p){return state.students.filter(s=>enrollment(s).class_period_id===p.id)}
function attendedStudents(){const latest=new Map();state.attendance.forEach(a=>{const old=latest.get(a.student_id);if(!old||new Date(a.checked_at||a.updated_at||0)>new Date(old.checked_at||old.updated_at||0))latest.set(a.student_id,a)});const ids=new Set([...latest.values()].filter(a=>["present","late"].includes(a.status)&&!a.checked_out_at).map(a=>a.student_id));return state.students.filter(s=>ids.has(s.id))}
function latestAttendanceFor(studentId){
  return state.attendance.filter(a=>String(a.student_id)===String(studentId)).sort((a,b)=>new Date(b.checked_at||b.updated_at||0)-new Date(a.checked_at||a.updated_at||0))[0]||null
}
function currentAttendanceStart(studentId){
  const a=latestAttendanceFor(studentId);if(!a||!["present","late"].includes(a.status)||a.checked_out_at)return 0;
  const t=Date.parse(a.checked_at||a.updated_at||"");return Number.isFinite(t)?t:0
}
function isCurrentAttendanceEvent(event){
  const start=currentAttendanceStart(event.student_id);if(!start)return false;
  const awarded=Date.parse(event.awarded_at||"");return !Number.isFinite(awarded)||awarded>=start
}
function eventsFor(id){return state.events.filter(e=>String(e.student_id)===String(id)&&isCurrentAttendanceEvent(e))}
function currentRoomEvents(){return state.events.filter(isCurrentAttendanceEvent)}
function growthCycleStorageKey(){return state.session?`kmt-star-growth-cycle:${state.session.id}`:""}
function syncGrowthCycle(){
  if(!state.session)return;
  const starts=attendedStudents().map(s=>currentAttendanceStart(s.id)).filter(Boolean).sort((a,b)=>a-b);if(!starts.length)return;
  const earliest=starts[0],key=growthCycleStorageKey(),stored=Number(localStorage.getItem(key))||0;
  if(!stored){localStorage.setItem(key,String(earliest));return}
  if(earliest>stored&&currentRoomEvents().length===0){
    localStorage.setItem(key,String(earliest));localStorage.removeItem(growthStorageKey());
    state.growth.goal=0;state.growth.stage=0;state.growth.ready=false;clearGrowthTimers();
  }
}
function categoryCount(id,cat){return eventsFor(id).filter(e=>e.category_id===cat).length}
const GROWTH_RATIOS=[0,1/6,2/6,3/6,4/6,5/6,1];
function growthStorageKey(){return state.session?`kmt-star-growth-goal:${state.session.id}`:""}
function readGrowthGoal(){const n=Number(localStorage.getItem(growthStorageKey()));return Number.isInteger(n)&&n>0?n:0}
function growthThresholds(goal){let previous=0;return GROWTH_RATIOS.map((ratio,index)=>{const value=index===0?1:(index===6?goal:Math.ceil(goal*ratio));previous=Math.min(goal,Math.max(previous+1,value));return previous})}
function growthStageFor(total,goal){if(!goal||total<1)return 0;const thresholds=growthThresholds(goal);let stage=0;thresholds.forEach((value,index)=>{if(total>=value)stage=index+1});return stage}
function clearGrowthTimers(){if(state.growth.revealTimer){clearInterval(state.growth.revealTimer);state.growth.revealTimer=null}state.growth.celebrationTimers.forEach(clearTimeout);state.growth.celebrationTimers=[]}
const GROWTH_LEVEL_UP_AUDIO="../../assets/star-growth/growth-level-up.mp3";
let growthLevelUpAudio=null,growthLevelUpAudioPrimed=false;
function getGrowthLevelUpAudio(){
  if(!growthLevelUpAudio){growthLevelUpAudio=new Audio(GROWTH_LEVEL_UP_AUDIO);growthLevelUpAudio.preload="auto";growthLevelUpAudio.volume=1}
  return growthLevelUpAudio
}
function primeGrowthLevelUpAudio(){
  if(growthLevelUpAudioPrimed)return;const audio=getGrowthLevelUpAudio();
  try{audio.volume=0;const promise=audio.play();if(promise?.then)promise.then(()=>{audio.pause();audio.currentTime=0;audio.volume=1;growthLevelUpAudioPrimed=true}).catch(()=>{audio.volume=1})}catch{audio.volume=1}
}
function playGrowthLevelUpMusic(){
  try{const audio=getGrowthLevelUpAudio();audio.pause();audio.currentTime=0;audio.volume=1;const promise=audio.play();if(promise?.catch)promise.catch(e=>console.warn("[GROWTH LEVEL-UP MP3]",e))}catch(e){console.warn("[GROWTH LEVEL-UP MP3]",e)}
}
const LEADER_CHANGE_AUDIO="../../assets/star-effects/leader-change.wav";
let leaderChangeAudio=null,leaderChangeAudioPrimed=false;
function getLeaderChangeAudio(){
  if(!leaderChangeAudio){leaderChangeAudio=new Audio(LEADER_CHANGE_AUDIO);leaderChangeAudio.preload="auto";leaderChangeAudio.volume=1}
  return leaderChangeAudio
}
function primeLeaderChangeAudio(){
  if(leaderChangeAudioPrimed)return;const audio=getLeaderChangeAudio();
  try{audio.volume=0;const promise=audio.play();if(promise?.then)promise.then(()=>{audio.pause();audio.currentTime=0;audio.volume=1;leaderChangeAudioPrimed=true}).catch(()=>{audio.volume=1})}catch{audio.volume=1}
}
function playLeaderChangeSound(){
  try{const audio=getLeaderChangeAudio();audio.pause();audio.currentTime=0;audio.volume=1;const promise=audio.play();if(promise?.catch)promise.catch(e=>console.warn("[LEADER CHANGE WAV]",e))}catch(e){console.warn("[LEADER CHANGE WAV]",e)}
}

const STAR_ROOM_ENTRY_AUDIO="../../assets/star-effects/star-room-entry.mp3";
let starRoomEntryAudio=null;
function playStarRoomEntrySound(){
  try{const audio=starRoomEntryAudio||(starRoomEntryAudio=new Audio(STAR_ROOM_ENTRY_AUDIO));audio.preload="auto";audio.volume=1;audio.currentTime=0;const promise=audio.play();if(promise?.catch)promise.catch(()=>{})}catch(e){console.warn("[STAR ROOM ENTRY MP3]",e)}
}

const ALL_STAR_CHEER_AUDIO="../../assets/star-effects/all-star-cheer.mp3";
let allStarCheerAudio=null,allStarCheerAudioPrimed=false;
function getAllStarCheerAudio(){
  if(!allStarCheerAudio){allStarCheerAudio=new Audio(ALL_STAR_CHEER_AUDIO);allStarCheerAudio.preload="auto";allStarCheerAudio.volume=1}
  return allStarCheerAudio
}
function primeAllStarCheerAudio(){
  if(allStarCheerAudioPrimed)return;const audio=getAllStarCheerAudio();
  try{audio.volume=0;const promise=audio.play();if(promise?.then)promise.then(()=>{audio.pause();audio.currentTime=0;audio.volume=1;allStarCheerAudioPrimed=true}).catch(()=>{audio.volume=1})}catch{audio.volume=1}
}
function playAllStarCheerSound(){
  try{const audio=getAllStarCheerAudio();audio.pause();audio.currentTime=0;audio.volume=1;const promise=audio.play();if(promise?.catch)promise.catch(e=>console.warn("[ALL STAR CHEER MP3]",e))}catch(e){console.warn("[ALL STAR CHEER MP3]",e)}
}
function playGrowthSound(final=false){
  try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const ctx=window.__kmtStarAudio||(window.__kmtStarAudio=new C());if(ctx.state==="suspended")ctx.resume();const now=ctx.currentTime,notes=final?[523,659,784,1047,1319]:[659,880,1175];notes.forEach((frequency,index)=>{const o=ctx.createOscillator(),g=ctx.createGain(),start=now+index*.075;o.type=index%2?"triangle":"sine";o.frequency.setValueAtTime(frequency,start);g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(final?.075:.052,start+.018);g.gain.exponentialRampToValueAtTime(.0001,start+(final?.42:.24));o.connect(g).connect(ctx.destination);o.start(start);o.stop(start+(final?.44:.26))})}catch(e){console.warn("[GROWTH SOUND]",e)}
}
function showGrowthCelebration(stage,total,goal){
  const layer=$("growthCelebration");if(!layer)return;clearGrowthTimers();const final=stage===7;layer.className=`growth-celebration ${final?"final":"level-up"}`;layer.innerHTML=final?`<div><span>🏆</span><strong>오늘의 공동 목표 달성!</strong><b>🔥 ${total} / ${goal} STAR 🔥</b><em>🎉 수련 완료! 신나는 놀이체육 TIME!</em><i class="growth-particles" aria-hidden="true"></i></div>`:`<div><span>✨</span><strong>성장 성공!</strong><b>${stage}단계 활성화</b><i class="growth-particles" aria-hidden="true"></i></div>`;layer.hidden=false;playGrowthLevelUpMusic();state.growth.celebrationTimers.push(setTimeout(()=>layer.classList.add("out"),final?2600:1350),setTimeout(()=>{layer.hidden=true;layer.classList.remove("out")},final?3300:1900))
}
function renderGrowth({celebrate=true}={}){
  const panel=$("growthPanel");if(!panel)return;syncGrowthCycle();
  const total=currentRoomEvents().length,attendanceCount=attendedStudents().length,goal=attendanceCount*8;
  state.growth.goal=goal;
  const stage=growthStageFor(total,goal),thresholds=goal?growthThresholds(goal):[];
  const shownStage=Math.max(1,stage);$("growthStages").innerHTML=`<div class="growth-stage active current-stage ${celebrate&&state.growth.ready&&stage>state.growth.stage?"new-stage":""}" data-stage="${shownStage}"><span>${shownStage} / 7</span><img src="../../assets/star-growth/stage-${String(shownStage).padStart(2,"0")}.png" alt="공동성장 ${shownStage}단계"></div>`;
  $("growthScore").textContent=goal?`⭐ ${total} / ${goal}`:"⭐ 0 / 목표 미정";$("growthMeterFill").style.width=goal?`${Math.min(100,total/goal*100)}%`:"0%";
  if(!goal){$("growthNext").textContent="첫 학생 출석 시 자동 산출됩니다.";$("growthHint").textContent="출석 인원 기준 자동 공동목표 · 출석 대기 중"}
  else if(stage>=7){$("growthNext").textContent=total>goal?`목표 초과 ⭐ +${total-goal}`:"공동 목표를 달성했습니다!";$("growthHint").textContent=`출석 ${attendanceCount}명 · 자동 목표 ${goal} STAR · 완전체 달성`}
  else{const next=thresholds[stage];$("growthNext").innerHTML=`<small>다음 성장까지</small><b>⭐ ${Math.max(0,next-total)}</b>`;$("growthHint").textContent=`출석 ${attendanceCount}명 · 자동 목표 ${goal} STAR · 현재 ${stage}단계`}
  $("goalButton").hidden=true;$("goalResetButton").hidden=true;panel.dataset.ready=goal?"true":"false";panel.classList.toggle("complete",stage===7);panel.classList.toggle("over-goal",stage===7&&total>goal);
  if(celebrate&&state.growth.ready&&stage>state.growth.stage)showGrowthCelebration(stage,total,goal);state.growth.stage=stage;state.growth.ready=true
}
function calculateGrowthGoal(){
  renderGrowth({celebrate:false});
  const count=attendedStudents().length;if(count)toast(`출석 ${count}명 · 자동 목표 ${count*8} STAR`);else toast("첫 학생 출석 시 목표가 자동 산출됩니다.")
}
function resetGrowthGoal(){calculateGrowthGoal()}

function setVoiceStatus(mode,text){
  const el=$("voiceStatus");if(!el)return;el.className=`voice-status ${mode}`;el.textContent=text;
  $("voiceAttendanceButton")?.classList.toggle("active",state.voice.listening&&state.voice.mode==="attendance");
  $("voiceStarButton")?.classList.toggle("active",state.voice.listening&&state.voice.mode==="star");
  const remote=$("mobileVoiceRemote");if(remote){remote.classList.toggle("listening",state.voice.listening);remote.querySelector("strong").textContent=state.voice.listening?"듣고 있어요":"계명아";remote.querySelector("small").textContent=state.voice.listening?"말씀해 주세요":"눌러서 말하기"}
}
function setVoiceFeedback(label,transcript=""){
  if($("voiceFeedbackLabel"))$("voiceFeedbackLabel").textContent=label;
  if($("voiceTranscript"))$("voiceTranscript").textContent=transcript||"예: 김나라 출석 / 김강민 인성별";
}
function voiceTime(){return new Intl.DateTimeFormat("ko-KR",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date())}
function voiceDebug(event,detail=""){
  const row={time:voiceTime(),event,detail:clean(detail)};state.voice.debugEvents.push(row);state.voice.debugEvents=state.voice.debugEvents.slice(-40);
  console.info("[VOICE DEBUG]",row);renderVoiceDebug()
}
function setVoiceDebugField(id,value){const el=$(id);if(el)el.textContent=clean(value)||"-"}
function renderVoiceDebug(){
  const panel=$("voiceDebugPanel");if(!panel)return;panel.hidden=!state.voice.debug;
  $("voiceDebugToggle")?.setAttribute("aria-pressed",state.voice.debug?"true":"false");
  setVoiceDebugField("voiceDebugSupport",(window.SpeechRecognition||window.webkitSpeechRecognition)?"지원":"미지원");
  setVoiceDebugField("voiceDebugPermission",state.voice.permission||"확인 중");
  setVoiceDebugField("voiceDebugSession",state.voice.active?.id||"-");
  setVoiceDebugField("voiceDebugRaw",state.voice.active?.raw||"-");
  setVoiceDebugField("voiceDebugAlt",(state.voice.active?.alternatives||[]).map((x,i)=>`${i+1}. ${x}`).join(" / ")||"-");
  setVoiceDebugField("voiceDebugMatch",state.voice.lastDebug?.top||"-");
  setVoiceDebugField("voiceDebugFinal",state.voice.lastDebug?.final||"-");
  setVoiceDebugField("voiceDebugCommand",state.voice.lastDebug?.command||"-");
  setVoiceDebugField("voiceDebugResult",state.voice.active?.result||"-");
  const log=$("voiceDebugEvents");if(log)log.textContent=state.voice.debugEvents.map(x=>`[${x.time}] ${x.event}${x.detail?` · ${x.detail}`:""}`).join("\n")
}
async function inspectMicrophonePermission(){
  if(!navigator.permissions?.query){state.voice.permission="브라우저 확인 필요";renderVoiceDebug();return}
  try{const p=await navigator.permissions.query({name:"microphone"});state.voice.permission=p.state;p.onchange=()=>{state.voice.permission=p.state;renderVoiceDebug()}}catch{state.voice.permission="브라우저 확인 필요"}renderVoiceDebug()
}
function normalizeSpeech(v){return clean(v).replace(/[.!?。]/g,"").replace(/\s+/g," ").trim()}
function voiceAliases(s){return (s?.kmt_student_voice_aliases||[]).map(a=>clean(a.alias)).filter(Boolean)}
function voiceNameKey(v){return clean(v).replace(/\s/g,"")}
function currentRoster(){return attendedStudents()}
const VOICE_COMMAND_TERMS=["출석체크","출석 처리","출석","체크","왔습니다","왔어요","왔어","왔다","도착했어","도착","미션성공","미션완료","미션클리어","단정별","인사별","자세별","집중별","효도별","발차기별","인성별","배려별","정리별","도전별","미션별","게임별","칭찬별","스타","STAR","별","단정","인사","자세","집중","효도","발차기","인성","배려","정리","도전","미션","게임","칭찬"];
function preferredVoiceIds(mode){
  const attended=currentRoster().map(s=>String(s.id));
  if(mode!=="attendance")return attended;
  const integrated=clean(state.period?.name).includes("기타")||clean(state.period?.code).toUpperCase()==="ETC";
  const periodIds=integrated?[]:rosterFor(state.period).map(s=>String(s.id));return [...new Set([...periodIds,...attended])]
}
function debugVoice(alternatives,resolution,command){
  const top=resolution.candidates.map(x=>`${x.student.name} ${Math.round(x.score*100)}%`).join(" / ");
  state.voice.lastDebug={alternatives,name:resolution.phrases?.[0]||"",command,top,level:resolution.level,final:resolution.student?.name||""};
  console.info("[SMART NAME VOICE]",state.voice.lastDebug);renderVoiceDebug()
}
function resolveVoiceStudent(alternatives,mode,command){
  const students=mode==="star"||/별|스타|칭찬|미션\s*(성공|완료|클리어)/.test(command)?currentRoster():state.students;
  return resolveStudentName({alternatives,students,preferredStudentIds:preferredVoiceIds(mode),commandTerms:VOICE_COMMAND_TERMS})
}
function contextualPhrases(){return [...new Set(state.students.flatMap(s=>[s.name,...voiceAliases(s)]).map(clean).filter(Boolean))]}
function applyContextualBiasing(recognition){
  const Phrase=window.SpeechRecognitionPhrase;if(!Phrase||!("phrases" in recognition))return false;
  try{recognition.phrases=contextualPhrases().map(value=>new Phrase(value,5));return true}catch(e){console.info("[SMART NAME VOICE] contextual biasing unavailable",e);return false}
}
function showVoiceChoice(resolution,alternatives,mode,command){
  state.voice.pending={alternatives,mode,command};const dialog=$("voiceChoiceDialog"),buttons=$("voiceChoiceButtons");
  buttons.innerHTML=resolution.candidates.map(x=>`<button type="button" data-voice-student="${escapeHtml(x.student.id)}"><strong>${escapeHtml(x.student.name)}</strong><span>${Math.round(x.score*100)}%</span></button>`).join("");
  buttons.querySelectorAll("[data-voice-student]").forEach(button=>button.onclick=async()=>{const pending=state.voice.pending,student=state.students.find(s=>String(s.id)===String(button.dataset.voiceStudent));dialog.close();state.voice.pending=null;if(!pending||!student)return;try{await executeResolvedVoiceCommand(student,pending.command,pending.mode);if(state.voice.active)state.voice.active.result="후보 확인 후 실행 성공";setVoiceFeedback("✅ 확인 후 처리 완료:",student.name);voiceDebug("후보 선택",student.name)}catch(err){if(state.voice.active)state.voice.active.result=err.message||"후보 실행 실패";toast(err.message||"음성명령 처리 실패");voiceDebug("후보 실행 실패",err.message)}});
  dialog.showModal()
}
function categoryFromVoice(text){
  const t=clean(text).replace(/\s/g,"");
  const aliases={NEAT:["단정별","단정"],GREETING:["인사별","인사"],POSTURE:["자세별","자세","집중별","집중"],KICK:["효도별","효도","발차기별","발차기"],CARE:["인성별","인성","배려별","배려"],CLEANUP:["정리별","정리"],CHALLENGE:["도전별","도전","미션별"],GAME:["게임별","게임"]};
  for(const c of state.categories){const words=[...(aliases[c.code]||[]),clean(c.name).replace(/\s/g,"")];if(words.some(w=>w&&t.includes(w)))return c}
  const genericStar=state.students.some(s=>[s.name,...voiceAliases(s)].some(name=>t===`${voiceNameKey(name)}별`));
  if(genericStar)return state.categories.find(c=>c.code==="CARE")||null;
  if(/별|스타|칭찬/.test(t))return state.category;
  return null;
}
function isDuplicateVoiceCommand(command){
  const now=Date.now(),key=normalizeSpeech(command);const last=state.voice.lastCommands.get(key)||0;
  for(const[k,v]of state.voice.lastCommands)if(now-v>15000)state.voice.lastCommands.delete(k);
  if(now-last<VOICE_COMMAND_COOLDOWN_MS)return true;state.voice.lastCommands.set(key,now);return false;
}
function ensureStarAudioReady(){
  try{
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
    const ctx=window.__kmtStarAudio||(window.__kmtStarAudio=new C());
    if(ctx.state==="suspended")ctx.resume().catch(()=>{});
    return ctx;
  }catch(e){console.warn("[STAR AUDIO READY]",e);return null}
}
function unlockStarAudio(){
  const ctx=ensureStarAudioReady();
  if(ctx){try{const o=ctx.createOscillator(),g=ctx.createGain(),n=ctx.currentTime;g.gain.setValueAtTime(.00001,n);o.connect(g).connect(ctx.destination);o.start(n);o.stop(n+.01)}catch{}}
  primeGrowthLevelUpAudio();
  primeLeaderChangeAudio();
  primeAllStarCheerAudio();
}
function playStarSound(){
  try{const ctx=ensureStarAudioReady();if(!ctx)return;
    const now=ctx.currentTime;[[740,0],[988,.06],[1318,.12]].forEach(([f,d],i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type="sine";o.frequency.value=f;g.gain.setValueAtTime(.0001,now+d);g.gain.exponentialRampToValueAtTime(i===2?.018:.012,now+d+.012);g.gain.exponentialRampToValueAtTime(.0001,now+d+.16);o.connect(g).connect(ctx.destination);o.start(now+d);o.stop(now+d+.18)})}catch(e){console.warn("[STAR SOUND]",e)}
}
function playAttendanceSound(){try{const ctx=ensureStarAudioReady();if(!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain(),n=ctx.currentTime;o.frequency.setValueAtTime(660,n);o.frequency.linearRampToValueAtTime(990,n+.15);g.gain.setValueAtTime(.1,n);g.gain.exponentialRampToValueAtTime(.0001,n+.22);o.connect(g).connect(ctx.destination);o.start();o.stop(n+.23)}catch{}}
function highlightStudent(student,{arrive=false}={}){
  requestAnimationFrame(()=>{const card=document.querySelector(`[data-student="${student.id}"]`);if(!card)return;card.classList.remove("voice-hit","voice-arrive");void card.offsetWidth;card.classList.add(arrive?"voice-arrive":"voice-hit");const main=card.querySelector(".star-main");if(main){const plus=document.createElement("span");plus.className="voice-plus";plus.textContent=arrive?"어서 와!":"⭐ +1";main.appendChild(plus);setTimeout(()=>plus.remove(),1000)}setTimeout(()=>card.classList.remove("voice-hit","voice-arrive"),950)})
}
function speakShort(text){
  if(!("speechSynthesis"in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang="ko-KR";u.rate=1.16;u.pitch=1.2;u.volume=.9;
  const voices=speechSynthesis.getVoices();u.voice=voices.find(v=>/ko-KR/i.test(v.lang))||null;speechSynthesis.speak(u);
}
function stopOneShotVoice(message="⚪ 음성 대기"){
  clearTimeout(state.voice.retryTimer);state.voice.listening=false;state.voice.mode=null;if(state.voice.active)state.voice.active.cancelled=true;try{state.voice.recognition?.stop()}catch{};setVoiceStatus("off",message);voiceDebug("수동 종료",message);
}
function voiceErrorMessage(code){return {"no-speech":"음성을 듣지 못했습니다. 다시 말씀해 주세요.","audio-capture":"마이크를 사용할 수 없습니다. 다른 앱의 마이크 사용 여부를 확인해 주세요.","not-allowed":"마이크 권한이 차단되었습니다. Chrome 사이트 설정에서 허용해 주세요.","service-not-allowed":"브라우저 음성인식 서비스 사용이 차단되었습니다.",network:"네트워크 음성인식 오류입니다. 인터넷 연결을 확인해 주세요.",aborted:"음성인식이 중단되었습니다.","language-not-supported":"한국어 음성인식을 지원하지 않는 브라우저입니다."}[code]||`음성인식 오류: ${code||"unknown"}`}
async function processVoiceSession(session,{fromInterim=false}={}){
  if(!session||session.executed||session.cancelled)return;const alternatives=[...new Set(session.alternatives.map(normalizeSpeech).filter(Boolean))];if(!alternatives.length)return;
  session.executed=true;session.raw=alternatives[0];session.result=fromInterim?"중간 결과로 명령 확인 중":"최종 결과 확인 중";renderVoiceDebug();
  setVoiceStatus("processing","🔎 결과 확인");setVoiceFeedback(fromInterim?"🔎 인식 결과 확인:":"인식된 명령:",`“${alternatives[0]}”`);
  if(isDuplicateVoiceCommand(alternatives[0])){session.result="중복 실행 차단";voiceDebug("중복 차단",alternatives[0]);toast("같은 음성명령 중복 실행을 막았습니다.");return}
  try{await handleVoiceCommand(alternatives[0],session.mode,alternatives);session.result=state.voice.pending?"후보 선택 대기":"명령 실행 성공";voiceDebug("명령 실행",session.result);if(!state.voice.pending)setVoiceFeedback("✅ 처리 완료:",`“${alternatives[0]}”`)}
  catch(err){session.result=err.message||"명령 실행 실패";voiceDebug("명령 실패",session.result);console.error("[STAR VOICE]",err);toast(session.result);setVoiceFeedback("⚠ "+session.result,`“${alternatives[0]}”`)}
  finally{renderVoiceDebug()}
}
function initSpeechRecognition(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return false;
  if(state.voice.recognition)return true;
  const r=new SR();r.lang="ko-KR";r.continuous=false;r.interimResults=true;r.maxAlternatives=5;applyContextualBiasing(r);
  r.onstart=()=>{const s=state.voice.active;if(!s)return;state.voice.listening=true;s.startedAt=new Date().toISOString();setVoiceStatus("listening","🎤 듣는 중");setVoiceFeedback("🎤 듣고 있습니다…","“박윤아 도전별”처럼 말씀하세요.");voiceDebug("onstart",s.startedAt)};
  r.onaudiostart=()=>{setVoiceStatus("listening","🎤 마이크 연결");voiceDebug("onaudiostart")};
  r.onsoundstart=()=>{setVoiceStatus("listening","🎤 음성 감지 중");setVoiceFeedback("🎤 음성 감지 중…","계속 말씀하세요.");voiceDebug("onsoundstart")};
  r.onspeechstart=()=>{setVoiceStatus("listening","🎤 말소리 인식 중");voiceDebug("onspeechstart")};
  r.onresult=async e=>{
    const s=state.voice.active;if(!s||s.cancelled)return;let finalSeen=false;
    for(let i=e.resultIndex;i<e.results.length;i++){const res=e.results[i],alts=Array.from(res||[]).map(x=>normalizeSpeech(x?.transcript||"")).filter(Boolean);s.alternatives.push(...alts);if(alts[0])s.raw=alts[0];if(res.isFinal)finalSeen=true}
    s.alternatives=[...new Set(s.alternatives)].slice(0,10);setVoiceStatus("processing",finalSeen?"🔎 결과 확인":"✍️ 인식 중");setVoiceFeedback(finalSeen?"🔎 결과 확인 중…":"✍️ 인식 중…",`“${s.raw||""}”`);voiceDebug("onresult",`${finalSeen?"final":"interim"} · ${s.raw||""}`);
    if(finalSeen)await processVoiceSession(s)
  };
  r.onspeechend=()=>voiceDebug("onspeechend");r.onsoundend=()=>voiceDebug("onsoundend");r.onaudioend=()=>voiceDebug("onaudioend");
  r.onnomatch=()=>{const s=state.voice.active;if(s)s.error="no-match";voiceDebug("onnomatch","일치 결과 없음");setVoiceFeedback("⚠ 음성을 인식하지 못했습니다.","다시 말씀해 주세요.")};
  r.onerror=e=>{const s=state.voice.active;if(s)s.error=e.error;const message=voiceErrorMessage(e.error);voiceDebug("onerror",e.error);setVoiceFeedback("⚠ "+message,"");toast(message)};
  r.onend=async()=>{const s=state.voice.active;state.voice.listening=false;voiceDebug("onend",s?.error||"정상");if(s&&!s.executed&&!s.cancelled&&s.alternatives.length)await processVoiceSession(s,{fromInterim:true});if(s&&!s.executed&&!s.cancelled&&s.error==="no-speech"&&s.retryCount<1){s.retryCount++;setVoiceStatus("listening","🔁 한 번 더 듣기");setVoiceFeedback("🔁 음성을 듣지 못해 한 번 더 시도합니다.","지금 말씀해 주세요.");voiceDebug("자동 재시도","1회");state.voice.retryTimer=setTimeout(()=>startOneShotVoice(s.mode,{retryCount:s.retryCount}),500);return}state.voice.mode=null;setVoiceStatus("off",s?.result==="명령 실행 성공"?"✅ 실행 완료":"⚪ 음성 대기")};
  state.voice.recognition=r;return true;
}
function startOneShotVoice(mode,{retryCount=0}={}){
  if(state.voice.listening){stopOneShotVoice();return}
  if(!state.session){toast("수업부를 먼저 선택해 주세요.");return}
  if(!initSpeechRecognition()){toast("이 브라우저는 Web Speech 음성인식을 지원하지 않습니다.");setVoiceStatus("off","🔴 음성 미지원");return}
  state.voice.pending=null;state.voice.lastDebug=null;state.voice.mode=mode;const id=++state.voice.sessionId;state.voice.active={id,mode,retryCount,alternatives:[],raw:"",result:"대기",error:"",executed:false,cancelled:false};applyContextualBiasing(state.voice.recognition);voiceDebug("세션 생성",`#${id} · ${mode||"자동 명령"}`);setVoiceStatus("listening","🎤 시작 준비");setVoiceFeedback(mode==="attendance"?"🎤 음성 출석 준비":mode==="star"?"⭐ 음성 STAR 준비":"🎙 계명아 듣기 준비",mode==="attendance"?"예: 김나라 출석 / 김강민 왔어":mode==="star"?"예: 김나라 별 / 김강민 인성별":"예: 김나라 출석 / 김강민 인성별");
  try{state.voice.recognition.start()}catch(err){state.voice.active.error="start-failed";voiceDebug("start 실패",err.message);toast("마이크를 시작하지 못했습니다. 잠시 후 다시 눌러 주세요.")}
}
async function markAttendanceFromStar(student){
  if(state.session.status==="closed")throw new Error("종료된 수업입니다.");
  const old=state.attendance.find(a=>a.student_id===student.id);
  const payload={session_id:old?.session_id||state.session.id,student_id:student.id,attendance_date:localDate(),status:"present",checked_at:new Date().toISOString(),checked_out_at:null,points_awarded:1};
  const q=old?db.from("attendance").update(payload).eq("id",old.id):db.from("attendance").insert(payload);
  const {data,error}=await q.select("id,session_id,student_id,status,checked_at,checked_out_at").single();if(error)throw error;
  const i=state.attendance.findIndex(a=>a.student_id===student.id);if(i>=0)state.attendance[i]=data;else state.attendance.push(data);
  renderStudents();highlightStudent(student,{arrive:true});playAttendanceSound();speakShort(`${student.name} 출석 완료!`);toast(`${student.name} 출석 완료`);
}
async function awardByVoice(student,category){state.category=category;renderCategories();await award(student,{source:"voice"})}
async function undoLastVoiceStar(){
  const last=currentRoomEvents().at(-1);if(!last){toast("취소할 STAR가 없습니다.");return}
  const student=state.students.find(s=>s.id===last.student_id);const {error}=await db.from("star_events").delete().eq("id",last.id);if(error)throw error;
  state.events=state.events.filter(e=>e.id!==last.id);renderStudents();toast(`${student?.name||"학생"} STAR 1건 취소`);speakShort("방금 별 취소 완료");
}
async function executeResolvedVoiceCommand(student,command,mode=null){
  const t=normalizeSpeech(command),attendanceIntent=/출석|출석\s*체크|왔어|왔어요|왔다|왔습니다|도착|도착했어/.test(t);
  if(mode==="attendance"||attendanceIntent){await markAttendanceFromStar(student);return}
  if(/미션\s*(성공|완료|클리어)/.test(t)){const missionCategory=state.categories.find(c=>c.code==="CHALLENGE")||state.category;if(!missionCategory)throw new Error("STAR 종류를 먼저 선택해 주세요.");await awardByVoice(student,missionCategory);showMissionClear(student);return}
  const category=categoryFromVoice(t),resolved=category||state.category;if(mode==="star"||category){if(!resolved)throw new Error("STAR 카테고리를 먼저 선택해 주세요.");await awardByVoice(student,resolved);return}
  throw new Error("출석 또는 STAR 명령을 이해하지 못했습니다.")
}
async function handleVoiceCommand(command,mode=null,alternatives=[command]){
  const t=normalizeSpeech(command);
  if(/^(방금\s*)?(취소|별\s*취소|스타\s*취소)$/.test(t)){await undoLastVoiceStar();return}
  const resolution=resolveVoiceStudent(alternatives,mode,t);debugVoice(alternatives,resolution,t);
  if(resolution.level==="C"){showVoiceChoice(resolution,alternatives,mode,t);setVoiceFeedback("누구를 말씀하셨나요?",resolution.candidates.map(x=>x.student.name).join(" / "));return}
  if(!resolution.student)throw new Error("학생 이름을 확실히 찾지 못했습니다.");
  await executeResolvedVoiceCommand(resolution.student,t,mode)
}
function showMissionClear(student){
  const old=document.getElementById("missionClearEffect");if(old)old.remove();const layer=document.createElement("div");layer.id="missionClearEffect";layer.className="mission-clear-effect";layer.innerHTML=`<div><span>🎯</span><strong>MISSION CLEAR!</strong><b>${escapeHtml(student.name)} ⭐ +1</b></div>`;document.body.appendChild(layer);setTimeout(()=>layer.classList.add("out"),1200);setTimeout(()=>layer.remove(),1750)
}
function noticeLabel(type){return {focus:"수련 미션",notice:"공지사항",personal:"개인 전달",item:"준비물",event:"행사/일정",praise:"칭찬"}[type]||"공지"}
async function loadNotices(){
  if(!state.period)return;const q=await db.from("kmt_class_notices").select("*").eq("notice_date",localDate()).eq("class_period_id",state.period.id).eq("is_active",true).order("created_at");
  if(q.error){console.warn("[NOTICES]",q.error.message);state.notices=[]}else state.notices=q.data||[];renderTicker();renderNoticeList();
}
function renderTicker(){
  const missions=state.notices.filter(n=>n.notice_type==="focus");
  const personals=state.notices.filter(n=>n.notice_type==="personal");
  const publics=state.notices.filter(n=>!["focus","personal"].includes(n.notice_type));
  renderInfoList("missionInfo",missions,"돌려차기 30회 · 바른 인사 · 성공하면 ⭐ +1");
  renderInfoList("noticeInfo",publics,"오늘 등록된 공지사항이 없습니다.");
  renderInfoList("personalInfo",personals,"오늘 등록된 개인 전달사항이 없습니다.");
}
function renderInfoList(id,items,fallback){
  const el=$(id);if(!el)return;
  if(el.__rotateTimer){clearInterval(el.__rotateTimer);el.__rotateTimer=null}
  el.classList.remove("rotating-info","single-info");
  el.innerHTML=items.length?items.map((n,i)=>`<div class="info-line ${i===0?"is-visible":""}">${escapeHtml(n.message)}</div>`).join(""):`<div class="info-empty is-visible">${escapeHtml(fallback)}</div>`;
  if(!["noticeInfo","personalInfo"].includes(id))return;
  if(items.length<2){el.classList.add("single-info");return}
  let index=0;const lines=[...el.querySelectorAll(".info-line")];
  el.classList.add("rotating-info");
  el.__rotateTimer=setInterval(()=>{
    const current=lines[index];
    const nextIndex=(index+1)%lines.length;
    const next=lines[nextIndex];
    current?.classList.remove("is-visible");
    next?.classList.add("is-visible");
    index=nextIndex;
  },7000)
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
async function boot(){const{data:{session},error}=await db.auth.getSession();if(error){toast(`로그인 확인 실패: ${error.message}`);return}if(!session||!isSingleOwner(session)){location.replace("../");return}$("loginScreen").hidden=true;$("app").hidden=false;startClock();await loadBase();await inspectMicrophonePermission();renderVoiceDebug()}
function startClock(){const tick=()=>{$("dateLabel").textContent=new Intl.DateTimeFormat("ko-KR",{timeZone:cfg.timezone,year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(new Date());$("clockLabel").textContent=localTime()};tick();setInterval(tick,15000)}
async function loadBase(){const [p,s,c]=await Promise.all([db.from("class_periods").select("*").eq("is_active",true).order("sort_order"),db.from("students").select("id,student_code,name,photo_url,enrollments(class_period_id,status),kmt_student_voice_aliases(id,alias,alias_key)").order("student_code"),db.from("star_categories").select("*").eq("is_active",true).order("sort_order")]);const error=p.error||s.error||c.error;if(error){toast(error.message);return}state.periods=p.data||[];state.students=(s.data||[]).filter(x=>enrollment(x).status==="재원");state.categories=c.data||[];state.category=state.categories.find(x=>x.code==="POSTURE")||state.categories[0]||null;syncSparkRoster({db,students:state.students}).catch(e=>console.warn("[GLOBAL SPARK ROSTER]",e));await openIntegratedStarRoom()}
function integratedStarPeriod(){return state.periods.find(p=>clean(p.name).includes("기타")||clean(p.code).toUpperCase()==="ETC")||state.periods.at(-1)||state.periods[0]||null}
async function openIntegratedStarRoom(){const p=integratedStarPeriod();if(!p){$("periodScreen").hidden=false;$("starScreen").hidden=true;$("periodGrid").innerHTML='<div class="empty">활성 수업부가 없어 STAR ROOM을 열 수 없습니다.</div>';toast("활성 수업부를 확인해 주세요.");return}await openPeriod(p)}
function renderPeriods(){}
async function openPeriod(p){state.period=p;let {data,error}=await db.from("class_sessions").select("*").eq("session_date",localDate()).eq("class_period_id",p.id).maybeSingle();if(error){toast(error.message);return}if(!data){const created=await db.from("class_sessions").insert({session_date:localDate(),class_period_id:p.id,status:"open"}).select().single();if(created.error){toast(created.error.message);return}data=created.data}state.session=data;state.selectedIds.clear();state.category=state.categories.find(x=>x.code==="POSTURE")||state.categories[0]||null;state.growth.goal=0;state.growth.stage=0;state.growth.ready=false;await loadRecords();syncGrowthCycle();await loadNotices();startRealtime();startLiveFallback();$("periodScreen").hidden=true;$("starScreen").hidden=false;$("sessionDate").textContent=localDate();$("sessionTitle").textContent="오늘의 통합 STAR ROOM";$("sessionTitle").dataset.desktopTitle="오늘 ⭐ STAR ROOM";renderCategories();renderStudents();renderGrowth({celebrate:false});setTimeout(playStarRoomEntrySound,80)}
async function loadRecords(){const [a,e,p,c]=await Promise.all([db.from("attendance").select("id,session_id,student_id,status,checked_at,checked_out_at").eq("attendance_date",localDate()),db.from("star_events").select("*").eq("session_id",state.session.id).order("awarded_at"),db.from("praise_events").select("*").eq("session_id",state.session.id).order("praised_at"),db.from("champions").select("*,star_categories(name,icon)").eq("session_id",state.session.id).order("selected_at")]);const error=a.error||e.error||p.error||c.error;if(error){toast(error.message);return}state.attendance=a.data||[];state.events=e.data||[];state.praises=p.data||[];state.champions=c.data||[]}
function renderCategories(){
  const primary=state.categories[0];if(!primary){$("categoryBar").innerHTML="";return}
  const preferred=["인사","자세","배려","정리","도전"],rank=c=>{const i=preferred.findIndex(v=>clean(c.name).includes(v));return i<0?preferred.length:i};
  const details=[...state.categories].sort((a,b)=>rank(a)-rank(b)||Number(a.sort_order||0)-Number(b.sort_order||0));
  $("categoryBar").innerHTML=`<button class="category praise-primary ${primary.id===state.category?.id?"active":""}" data-id="${primary.id}">⭐ 칭찬별</button><details class="category-more"><summary>더보기 ▾</summary><div class="category-more-list">${details.map(c=>`<button class="category ${c.id===state.category?.id?"active":""}" data-id="${c.id}">${c.icon} ${escapeHtml(categoryDisplayName(c))}</button>`).join("")}</div></details><label class="mobile-sort-control"><span>↕</span><select id="mobileSortSelect" aria-label="학생카드 정렬"><option value="stars">별순</option><option value="period">부별</option><option value="name">이름순</option><option value="attendance">출석순</option></select></label>`;
  const selectCategory=id=>{state.category=state.categories.find(c=>String(c.id)===String(id))||state.category;$("categoryName").textContent=`${state.category.icon||"⭐"} ${categoryDisplayName(state.category)} 선택됨`;$("categoryPickerButton").textContent=`${state.category.icon||"⭐"} ${categoryDisplayName(state.category)} ▼`;renderSelectionToolbar();renderCategories()};
  document.querySelectorAll("#categoryBar .category").forEach(b=>b.onclick=()=>selectCategory(b.dataset.id));
  const grid=$("categoryDialogGrid");if(grid){grid.innerHTML=details.map(c=>`<button type="button" class="${c.id===state.category?.id?"active":""}" data-category-choice="${c.id}">${c.icon||"⭐"} ${escapeHtml(categoryDisplayName(c))}${c.id===state.category?.id?" ✓":""}</button>`).join("");grid.querySelectorAll("[data-category-choice]").forEach(b=>b.onclick=()=>{selectCategory(b.dataset.categoryChoice);$("categoryDialog").close()})}
  if(state.category){$("categoryPickerButton").textContent=`${state.category.icon||"⭐"} ${categoryDisplayName(state.category)} ▼`;$("categoryName").textContent=`${state.category.icon||"⭐"} ${categoryDisplayName(state.category)} 선택됨`}
  const sortSelect=$("mobileSortSelect");sortSelect.value=["stars","period","name","attendance"].includes(state.mobileSort)?state.mobileSort:"stars";sortSelect.onchange=()=>{state.mobileSort=sortSelect.value;localStorage.setItem("kmt-star-mobile-sort",state.mobileSort);renderStudents()}
}
function scoreReachedAt(studentId){
  const rows=eventsFor(studentId);if(!rows.length)return Number.MAX_SAFE_INTEGER;const t=Date.parse(rows.at(-1).awarded_at||"");return Number.isFinite(t)?t:Number.MAX_SAFE_INTEGER
}
function sortedAttendedStudents(){
  const rows=attendedStudents().map((s,index)=>({s,index,count:eventsFor(s.id).length,reached:scoreReachedAt(s.id)}));
  const starSort=(a,b)=>b.count-a.count||a.reached-b.reached||a.index-b.index||a.s.name.localeCompare(b.s.name,"ko");
  const attendanceAt=studentId=>{const records=state.attendance.filter(a=>a.student_id===studentId);const latest=records.sort((a,b)=>new Date(b.checked_at||b.updated_at||0)-new Date(a.checked_at||a.updated_at||0))[0];const time=Date.parse(latest?.checked_at||"");return Number.isFinite(time)?time:Number.MAX_SAFE_INTEGER};
  if(!matchMedia("(max-width:760px), (max-width:1024px) and (pointer:coarse)").matches)return rows.sort((a,b)=>attendanceAt(a.s.id)-attendanceAt(b.s.id)||a.index-b.index).map(x=>x.s);
  const periodRank=student=>{const id=enrollment(student).class_period_id,index=state.periods.findIndex(p=>p.id===id);return index<0?Number.MAX_SAFE_INTEGER:index};
  const sorter=state.mobileSort==="period"?(a,b)=>periodRank(a.s)-periodRank(b.s)||a.s.name.localeCompare(b.s.name,"ko"):state.mobileSort==="name"?(a,b)=>a.s.name.localeCompare(b.s.name,"ko"):state.mobileSort==="attendance"?(a,b)=>attendanceAt(a.s.id)-attendanceAt(b.s.id)||a.s.name.localeCompare(b.s.name,"ko"):starSort;
  return rows.sort(sorter).map(x=>x.s)
}
function captureCardPositions(){const m=new Map();document.querySelectorAll("#studentGrid .student[data-student]").forEach(el=>m.set(el.dataset.student,el.getBoundingClientRect()));return m}
function animateCardMoves(before){requestAnimationFrame(()=>document.querySelectorAll("#studentGrid .student[data-student]").forEach(el=>{const prev=before.get(el.dataset.student);if(!prev)return;const now=el.getBoundingClientRect(),dx=prev.left-now.left,dy=prev.top-now.top;if(Math.abs(dx)<1&&Math.abs(dy)<1)return;el.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:"translate(0,0)"}],{duration:430,easing:"cubic-bezier(.2,.8,.2,1)"})}))}
function showLeaderChanged(student){
  const old=document.getElementById("leaderChangeEffect");if(old)old.remove();const layer=document.createElement("div");layer.id="leaderChangeEffect";layer.className="leader-change-effect";layer.innerHTML=`<div><span>👑</span><strong>새로운 1위!</strong><b>${escapeHtml(student.name)}</b></div>`;document.body.appendChild(layer);playLeaderChangeSound();setTimeout(()=>layer.classList.add("out"),1200);setTimeout(()=>layer.remove(),1800)
}
function usesMobileStarControls(){return matchMedia("(max-width:760px), (max-width:1024px) and (pointer:coarse)").matches}
function gridColumns(count){if(count<=1)return 1;if(count<=3)return count;if(count<=6)return 3;if(count<=8)return 4;return 5}
function renderSelectionToolbar(){
  const count=state.selectedIds.size,label=state.category?categoryDisplayName(state.category):"STAR";
  if($("selectionCount"))$("selectionCount").textContent=`선택 ${count}명`;
  if($("clearSelectionButton"))$("clearSelectionButton").disabled=!count;
  if($("awardSelectedButton")){$("awardSelectedButton").disabled=!count;$("awardSelectedButton").textContent=count?`⭐ 선택 ${count}명에게 ${label} +1`:"학생을 선택하세요"}
}
function toggleStudentSelection(id){
  const key=String(id);if(state.selectedIds.has(key))state.selectedIds.delete(key);else state.selectedIds.add(key);renderStudents()
}
function renderStudents(){
  const before=captureCardPositions(),list=sortedAttendedStudents(),maxScore=Math.max(0,...attendedStudents().map(s=>eventsFor(s.id).length)),leaders=new Set(maxScore>0?attendedStudents().filter(s=>eventsFor(s.id).length===maxScore).map(s=>String(s.id)):[]),leader=list.find(s=>leaders.has(String(s.id)))||null,previousLeader=state.leaderId;
  const presentIds=new Set(list.map(s=>String(s.id)));state.selectedIds.forEach(id=>{if(!presentIds.has(id))state.selectedIds.delete(id)});
  $("emptyMessage").hidden=!!list.length;$("totalStars").textContent=currentRoomEvents().length;
  const columns=gridColumns(list.length);$("studentGrid").dataset.count=list.length;$("studentGrid").style.setProperty("--grid-columns",columns);$("studentGrid").style.setProperty("--grid-rows",Math.max(1,Math.ceil(list.length/columns)));$("studentGrid").style.setProperty("--card-width",`${100/columns}%`);
  $("studentGrid").innerHTML=list.map(s=>{const count=eventsFor(s.id).length,photo=clean(s.photo_url),perfect=count>=cfg.perfectStar,isLeader=leaders.has(String(s.id)),selected=state.selectedIds.has(String(s.id));return `<article class="student ${perfect?"perfect":""} ${isLeader?"current-leader":""} ${selected?"selected":""}" data-student="${s.id}">${isLeader?'<div class="leader-badge" aria-label="현재 공동 1등">👑</div>':""}${selected?'<div class="selection-badge">✓</div>':""}<div class="star-main" data-star="${s.id}" role="button" tabindex="0" aria-pressed="${selected}">${photo?`<img class="photo" src="${escapeHtml(photo)}" alt="${escapeHtml(s.name)} 사진">`:`<div class="photo fallback">${escapeHtml(s.name.slice(0,2))}</div>`}<div class="student-line"><h2>${escapeHtml(s.name)}</h2><strong class="star-count">⭐${count}</strong><button class="undo card-undo" type="button" data-undo="${s.id}" aria-label="${escapeHtml(s.name)} 마지막 STAR 취소">↶</button></div></div></article>`}).join("");
  animateCardMoves(before);
  state.leaderId=leader&&eventsFor(leader.id).length>0?leader.id:null;
  if(state.leaderReady&&state.leaderId&&state.leaderId!==previousLeader){document.querySelector(`[data-student="${state.leaderId}"]`)?.classList.add("leader-changed");showLeaderChanged(leader)}
  state.leaderReady=true;
  document.querySelectorAll("[data-star]").forEach(b=>b.onclick=()=>{const student=state.students.find(s=>String(s.id)===String(b.dataset.star));if(usesMobileStarControls())award(student);else toggleStudentSelection(b.dataset.star)});document.querySelectorAll("[data-undo]").forEach(b=>b.onclick=e=>{e.stopPropagation();undo(state.students.find(s=>String(s.id)===String(b.dataset.undo)))});renderSelectionToolbar();renderGrowth()
}

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

async function awardAll(){
  const students=attendedStudents();
  if(!state.category){toast("STAR 카테고리를 먼저 선택해 주세요.");return}
  if(state.session.status==="closed"){toast("종료된 수업입니다.");return}
  if(!students.length){toast("현재 STAR ROOM에 출석 중인 학생이 없습니다.");return}
  const label=categoryDisplayName(state.category)||"별";
  if(!confirm(`현재 출석학생 ${students.length}명 모두에게 ${label} +1을 지급합니다.`))return;
  const button=$("awardAllButton"),category=state.category;
  button.disabled=true;state.localAwardPending++;$("saveStatus").textContent=`전체 ${students.length}명 저장 중...`;
  try{
    const payload=students.map(s=>({session_id:state.session.id,student_id:s.id,category_id:category.id}));
    const {data,error}=await db.from("star_events").insert(payload).select();
    if(error){toast(`전체 STAR 저장 실패: ${error.message}`);return}
    const rows=data||[];state.events.push(...rows);
    await Promise.allSettled(rows.map(event=>{
      const student=students.find(s=>String(s.id)===String(event.student_id));
      return student?syncSparkAward({db,student,category,event}):Promise.resolve({skipped:true,reason:"STUDENT_NOT_FOUND"});
    })).then(results=>results.forEach(result=>{if(result.status==="rejected")console.warn("[GLOBAL SPARK AWARD ALL]",result.reason)}));
    await Promise.allSettled(students.map(s=>awardAdvancedBadges(s.id)));
    renderStudents();
    students.forEach((s,i)=>setTimeout(()=>highlightStudent(s),Math.min(i,6)*70));
    playGrowthSound(false);playStarSound();playAllStarCheerSound();
    speakShort(`전체 ${label} 하나!`);
    $("saveStatus").textContent=`전체 ${students.length}명 ${label} +1 완료`;
    toast(`⭐ ${students.length}명 모두에게 ${label} +1!`);
    setTimeout(()=>$("saveStatus").textContent="Supabase 자동저장 · LIVE",1400);
  }finally{state.localAwardPending=Math.max(0,state.localAwardPending-1);button.disabled=false}
}

async function awardSelected(){
  if(!state.category){toast("STAR 종류를 먼저 선택해 주세요.");return}
  if(state.session.status==="closed"){toast("종료된 수업입니다.");return}
  const students=attendedStudents().filter(s=>state.selectedIds.has(String(s.id)));if(!students.length){toast("학생을 먼저 선택해 주세요.");return}
  const category=state.category,label=categoryDisplayName(category)||"별",button=$("awardSelectedButton");button.disabled=true;state.localAwardPending++;$("saveStatus").textContent=`선택 ${students.length}명 저장 중...`;
  try{
    const payload=students.map(s=>({session_id:state.session.id,student_id:s.id,category_id:category.id})),{data,error}=await db.from("star_events").insert(payload).select();
    if(error){toast(`선택 STAR 저장 실패: ${error.message}`);return}
    const rows=data||[];state.events.push(...rows);
    await Promise.allSettled(rows.map(event=>{const student=students.find(s=>String(s.id)===String(event.student_id));return student?syncSparkAward({db,student,category,event}):Promise.resolve({skipped:true})}));
    await Promise.allSettled(students.map(s=>awardAdvancedBadges(s.id)));
    state.selectedIds.clear();renderStudents();students.forEach(s=>highlightStudent(s));playStarSound();playGrowthSound(false);
    $("saveStatus").textContent=`선택 ${students.length}명 ${label} +1 완료`;toast(`⭐ 선택 ${students.length}명에게 ${label} +1!`);setTimeout(()=>$("saveStatus").textContent="Supabase 자동저장 · LIVE",1400)
  }finally{state.localAwardPending=Math.max(0,state.localAwardPending-1);renderSelectionToolbar()}
}

async function award(s,{source="click"}={}){if(!state.category){toast("STAR 카테고리를 먼저 선택해 주세요.");return}if(state.session.status==="closed"){toast("종료된 수업입니다.");return}$("saveStatus").textContent=`${s.name} 저장 중...`;const category=state.category;state.localAwardPending++;try{const {data,error}=await db.from("star_events").insert({session_id:state.session.id,student_id:s.id,category_id:category.id}).select().single();if(error){toast(error.message);return}state.events.push(data);syncSparkAward({db,student:s,category,event:data}).then(result=>{if(result?.ok)console.info("[GLOBAL SPARK AWARD]",result)}).catch(e=>console.warn("[GLOBAL SPARK AWARD]",e));state.voice.lastVoiceStarId=source==="voice"?data.id:state.voice.lastVoiceStarId;const total=eventsFor(s.id).length;const newBadges=await awardAdvancedBadges(s.id);renderStudents();showBurst(s,category,total,newBadges);highlightStudent(s);playStarSound();$("saveStatus").textContent=advancedRewardText(s,total,newBadges);setTimeout(()=>$("saveStatus").textContent="Supabase 자동저장",900)}finally{state.localAwardPending=Math.max(0,state.localAwardPending-1)}}
function incomingStarEvents(beforeIds,rows=state.events){
  return (rows||[]).filter(e=>!beforeIds.has(String(e.id))).sort((a,b)=>new Date(a.awarded_at||0)-new Date(b.awarded_at||0));
}
function playIncomingStarFeedback(rows){
  if(!rows?.length||state.localAwardPending>0)return;
  rows.forEach((event,index)=>setTimeout(()=>{
    const student=state.students.find(s=>String(s.id)===String(event.student_id));
    const category=state.categories.find(c=>String(c.id)===String(event.category_id))||state.category;
    if(!student)return;
    const total=eventsFor(student.id).length;
    highlightStudent(student);playStarSound();
    if(category)showBurst(student,category,total,[]);
    $("saveStatus").textContent="다른 기기 STAR 수신 · LIVE";
    setTimeout(()=>$("saveStatus").textContent="Supabase 자동저장 · LIVE",1000);
  },index*220));
}
function stopRealtime(){if(state.realtimeTimer){clearTimeout(state.realtimeTimer);state.realtimeTimer=null}if(state.livePollTimer){clearInterval(state.livePollTimer);state.livePollTimer=null}state.livePollBusy=false;if(state.realtimeChannel){db.removeChannel(state.realtimeChannel);state.realtimeChannel=null}}
function liveSnapshotKey(attendance=state.attendance,events=state.events){
  const a=(attendance||[]).map(x=>`${x.student_id}:${x.status}:${x.checked_at||""}:${x.checked_out_at||""}`).sort().join("|");
  const e=(events||[]).map(x=>`${x.id}:${x.student_id}:${x.category_id}`).sort().join("|");
  return `${a}::${e}`
}
async function pollLiveChanges(){
  if(!state.session||state.livePollBusy||document.hidden)return;state.livePollBusy=true;
  try{
    const sid=state.session.id,before=liveSnapshotKey(),beforeIds=new Set(state.events.map(x=>String(x.id)));
    const[a,e]=await Promise.all([
      db.from("attendance").select("id,session_id,student_id,status,checked_at,checked_out_at").eq("attendance_date",localDate()),
      db.from("star_events").select("id,student_id,category_id,awarded_at").eq("session_id",sid).order("awarded_at")
    ]);
    if(a.error||e.error){console.warn("[STAR LIVE FALLBACK]",a.error?.message||e.error?.message);return}
    const nextAttendance=a.data||[],nextEvents=e.data||[],after=liveSnapshotKey(nextAttendance,nextEvents);
    if(after!==before){const incoming=incomingStarEvents(beforeIds,nextEvents);state.attendance=nextAttendance;state.events=nextEvents;renderStudents();playIncomingStarFeedback(incoming);$("saveStatus").textContent="Supabase 자동저장 · LIVE"}
  }finally{state.livePollBusy=false}
}
function startLiveFallback(){
  if(state.livePollTimer)clearInterval(state.livePollTimer);
  state.livePollTimer=setInterval(pollLiveChanges,3000);
}
function scheduleRealtimeRefresh(){clearTimeout(state.realtimeTimer);const beforeIds=new Set(state.events.map(x=>String(x.id)));state.realtimeTimer=setTimeout(async()=>{if(!state.session)return;await loadRecords();const incoming=incomingStarEvents(beforeIds,state.events);renderStudents();playIncomingStarFeedback(incoming);if(!$("championDialog").open)renderChampions();$("saveStatus").textContent="Supabase 자동저장 · LIVE"},250)}
async function syncSessionState(){if(!state.session)return;const{data,error}=await db.from("class_sessions").select("*").eq("id",state.session.id).maybeSingle();if(!error&&data)state.session=data}
function startRealtime(){
  stopRealtime();if(!state.session)return;const sid=state.session.id,today=localDate();
  state.realtimeChannel=db.channel(`kmt-star-live-${sid}-${today}`)
    .on("postgres_changes",{event:"*",schema:"public",table:"attendance",filter:`attendance_date=eq.${today}`},scheduleRealtimeRefresh)
    .on("postgres_changes",{event:"*",schema:"public",table:"star_events",filter:`session_id=eq.${sid}`},scheduleRealtimeRefresh)
    .on("postgres_changes",{event:"*",schema:"public",table:"praise_events",filter:`session_id=eq.${sid}`},scheduleRealtimeRefresh)
    .on("postgres_changes",{event:"*",schema:"public",table:"champions",filter:`session_id=eq.${sid}`},scheduleRealtimeRefresh)
    .on("postgres_changes",{event:"*",schema:"public",table:"kmt_class_notices",filter:`class_period_id=eq.${state.period.id}`},()=>setTimeout(loadNotices,180))
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"class_sessions",filter:`id=eq.${sid}`},async()=>{await syncSessionState();scheduleRealtimeRefresh()})
    .subscribe(status=>{if(status==="SUBSCRIBED")$("saveStatus").textContent="Supabase 자동저장 · LIVE";else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT")$("saveStatus").textContent="LIVE 재연결 중"});
}

function showBurst(s,c,total,newBadges=[]){
  $("burstIcon").textContent=total>=cfg.perfectStar?"🌟":(c.icon||"⭐");
  $("burstName").textContent=s.name;
  $("burstCategory").textContent=total>=cfg.perfectStar?"PERFECT STAR!":`${categoryDisplayName(c)} +1`;
  $("burstTotal").textContent=advancedRewardText(s,total,newBadges);
  const photo=$("burstPhoto"),fallback=$("burstPhotoFallback"),src=clean(s.photo_url);
  if(src){photo.src=src;photo.alt=`${s.name} 사진`;photo.hidden=false;fallback.hidden=true}
  else{photo.removeAttribute("src");photo.alt="";photo.hidden=true;fallback.textContent=s.name.slice(0,2);fallback.hidden=false}
  const layer=$("starBurst");layer.hidden=false;layer.classList.remove("star-award-replay");void layer.offsetWidth;layer.classList.add("star-award-replay");
  document.querySelector(".class-ticker")?.classList.add("star-priority");
  clearTimeout(window.__burst);window.__burst=setTimeout(()=>{layer.hidden=true;layer.classList.remove("star-award-replay");document.querySelector(".class-ticker")?.classList.remove("star-priority")},total>=cfg.perfectStar||newBadges.length?3200:2400)
}
async function undo(s){const last=eventsFor(s.id).at(-1);if(!last){toast("되돌릴 STAR가 없습니다.");return}const {error}=await db.from("star_events").delete().eq("id",last.id);if(error){toast(error.message);return}state.events=state.events.filter(e=>e.id!==last.id);syncSparkUndo({db,event:last}).catch(e=>console.warn("[GLOBAL SPARK UNDO]",e));renderStudents();toast(`${s.name} 마지막 STAR 입력을 취소했습니다.`)}
function showDetail(s){const rows=state.categories.filter(c=>categoryCount(s.id,c.id)).map(c=>`<div class="detail-row"><span>${c.icon} ${escapeHtml(categoryDisplayName(c))}</span><strong>${categoryCount(s.id,c.id)}</strong></div>`).join("");const praises=state.praises.filter(p=>p.student_id===s.id).map(p=>`<div class="detail-row"><span>👏 ${escapeHtml(p.message)}</span><small>${localTime(p.praised_at)}</small></div>`).join("");$("detailContent").innerHTML=`<h2>${escapeHtml(s.name)} · ⭐ × ${eventsFor(s.id).length}</h2>${rows||'<p class="muted">아직 받은 STAR가 없습니다.</p>'}<h3>오늘의 칭찬</h3>${praises||'<p class="muted">아직 칭찬 기록이 없습니다.</p>'}`;$("detailDialog").showModal()}
function showPraise(s){$("praiseStudentId").value=s.id;$("praiseTitle").textContent=`${s.name} 칭찬 기록`;$("praiseMessage").value="";$("praisePresets").innerHTML=praisePresets.map(x=>`<button type="button">${x}</button>`).join("");$("praisePresets").querySelectorAll("button").forEach(b=>b.onclick=()=>$("praiseMessage").value=b.textContent);$("praiseDialog").showModal()}
async function savePraise(e){e.preventDefault();const student_id=$("praiseStudentId").value,message=clean($("praiseMessage").value);const {data,error}=await db.from("praise_events").insert({session_id:state.session.id,student_id,message}).select().single();if(error){toast(error.message);return}state.praises.push(data);$("praiseDialog").close();toast("칭찬을 저장했습니다.")}
function championTitle(c){const map={GREETING:"인사왕",POSTURE:"집중왕",KICK:"발차기왕",CARE:"배려왕",CLEANUP:"정리왕",CHALLENGE:"도전왕",GAME:"게임왕",NEAT:"단정왕"};return map[c.code]||`${c.name} 왕`}
function showChampions(){const students=attendedStudents(),top=[...students].sort((a,b)=>eventsFor(b.id).length-eventsFor(a.id).length)[0];$("championSuggestions").innerHTML=`<div class="suggestion"><strong>🏆 오늘의 챔피언</strong><select data-title="오늘의 챔피언"><option value="">학생 선택</option>${students.map(s=>`<option value="${s.id}" ${s.id===top?.id?"selected":""}>${escapeHtml(s.name)} · ⭐${eventsFor(s.id).length}</option>`).join("")}</select><button>저장</button></div>`+state.categories.map(c=>{const rank=[...students].sort((a,b)=>categoryCount(b.id,c.id)-categoryCount(a.id,c.id))[0],score=rank?categoryCount(rank.id,c.id):0;return `<div class="suggestion"><strong>${c.icon} ${championTitle(c)}</strong><select data-title="${championTitle(c)}" data-category="${c.id}"><option value="">학생 선택</option>${students.map(s=>`<option value="${s.id}" ${score&&s.id===rank.id?"selected":""}>${escapeHtml(s.name)} · ${categoryCount(s.id,c.id)}</option>`).join("")}</select><button>저장</button></div>`}).join("");$("championSuggestions").querySelectorAll("button").forEach(b=>b.onclick=()=>saveChampion(b.previousElementSibling));renderChampions();$("championDialog").showModal()}
async function saveChampion(sel){if(!sel.value){toast("학생을 선택해 주세요.");return}const payload={session_id:state.session.id,student_id:sel.value,title:sel.dataset.title,category_id:sel.dataset.category||null};const {data,error}=await db.from("champions").upsert(payload,{onConflict:"session_id,title"}).select("*,star_categories(name,icon)").single();if(error){toast(error.message);return}state.champions=state.champions.filter(c=>c.title!==data.title);state.champions.push(data);renderChampions();toast(`${data.title} 저장 완료`)}
function renderChampions(){$("championList").innerHTML=state.champions.length?state.champions.map(c=>{const s=state.students.find(x=>x.id===c.student_id);return `<div class="champion-row"><span>${c.star_categories?.icon||"🏆"} ${escapeHtml(c.title)}</span><strong>${escapeHtml(s?.name||"")}</strong><button data-delete="${c.id}">삭제</button></div>`}).join(""):'<p class="muted">아직 선정된 챔피언이 없습니다.</p>';document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteChampion(b.dataset.delete))}
async function deleteChampion(id){const {error}=await db.from("champions").delete().eq("id",id);if(error){toast(error.message);return}state.champions=state.champions.filter(c=>c.id!==id);renderChampions()}


$("awardAllButton").onclick=awardAll;
$("awardAllDialogButton").onclick=async()=>{$("categoryDialog").close();await awardAll()};
$("awardSelectedButton").onclick=awardSelected;
$("clearSelectionButton").onclick=()=>{state.selectedIds.clear();renderStudents()};
$("categoryPickerButton").onclick=()=>{$("categoryDialog").showModal()};
$("systemMenuButton").onclick=()=>{const menu=$("systemMenu"),open=menu.hidden;menu.hidden=!open;$("systemMenuButton").setAttribute("aria-expanded",String(open))};
$("noticeMenuButton").onclick=()=>{$("systemMenu").hidden=true;renderNoticeList();$("noticeDialog").showModal()};
$("voiceAttendanceButton").onclick=()=>startOneShotVoice("attendance");
$("voiceStarButton").onclick=()=>startOneShotVoice("star");
$("mobileVoiceRemote").onclick=()=>startOneShotVoice(null);
$("voiceDebugToggle").onclick=()=>{state.voice.debug=!state.voice.debug;localStorage.setItem("kmt-voice-debug",state.voice.debug?"on":"off");renderVoiceDebug();if(state.voice.debug)voiceDebug("진단 모드","ON")};
$("voiceDebugClose").onclick=()=>{state.voice.debug=false;localStorage.setItem("kmt-voice-debug","off");renderVoiceDebug()};
$("goalButton").onclick=calculateGrowthGoal;
$("goalResetButton").onclick=resetGrowthGoal;
$("noticeManageButton").onclick=()=>{renderNoticeList();$("noticeDialog").showModal()};
$("noticeForm").onsubmit=async e=>{e.preventDefault();try{await addNotice($("noticeType").value,$("noticeText").value);$("noticeText").value="";toast("전광판 공지를 추가했습니다.")}catch(err){toast(err.message)}};
["pointerdown","touchstart","keydown"].forEach(type=>document.addEventListener(type,unlockStarAudio,{once:true,passive:true}));
document.addEventListener("visibilitychange",()=>{if(document.hidden&&state.voice.listening)stopOneShotVoice()});
document.addEventListener("keydown",e=>{const card=e.target.closest?.("[data-star]");if(card&&(e.key==="Enter"||e.key===" ")){e.preventDefault();card.click()}});

$("loginButton").onclick=login;$("logoutButton").onclick=async()=>{await db.auth.signOut();location.reload()};$("backButton").onclick=()=>{window.open("../attendance/","_blank","noopener")};$("praiseForm").onsubmit=savePraise;$("championButton").onclick=showChampions;document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).close());$("starBurst").onclick=()=>$("starBurst").hidden=true;db.auth.onAuthStateChange((_e,s)=>{if(s&&$("app").hidden)setTimeout(boot,0)});boot();
