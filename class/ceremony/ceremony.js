(()=>{"use strict";
const c=window.KMT_CLASS_CONFIG||{},db=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{persistSession:true}}),$=x=>document.getElementById(x);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
let students=[],awardQueue=[],awardIndex=0,timerId=null,timerLeft=300;
function dday(s){const a=new Date(s+"T00:00:00"),b=new Date();b.setHours(0,0,0,0);const n=Math.round((a-b)/86400000);return n===0?"D-DAY":n>0?`D-${n}`:`D+${Math.abs(n)}`}
function mega(i,t,s=""){const m=$("mega");$("megaIcon").textContent=i;$("megaTitle").textContent=t;$("megaSub").textContent=s;m.classList.remove("hidden");setTimeout(()=>m.classList.add("hidden"),1800)}
async function resolveSession(){
 const qs=new URLSearchParams(location.search),sid=qs.get("session_id");
 if(sid){const r=await db.from("class_sessions").select("*").eq("id",sid).maybeSingle();if(r.error)throw r.error;if(r.data)return r.data}
 const today=new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Seoul"});
 const r=await db.from("class_sessions").select("*").eq("session_date",today).order("started_at",{ascending:false,nullsFirst:false}).limit(1).maybeSingle();
 if(r.error)throw r.error;return r.data||null;
}
async function buildAwards(){
 const session=await resolveSession(); if(!session)return [];
 const r=await db.rpc("kmt_session_award_summary",{p_session_id:session.id}); if(r.error)throw r.error;
 const q=(r.data||[]).map(x=>({icon:x.icon||"🏆",title:x.title,name:x.student_name,sub:`${x.score}${x.award_type==="category"||x.award_type==="champion"||x.award_type==="perfect"?" STAR":"점"}`}));
 const today=new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Seoul"});
 const tr=await db.from("kmt_team_scores").select("team_name,points").eq("score_date",today);
 if(!tr.error){const sums=new Map();for(const x of(tr.data||[]))sums.set(x.team_name,(sums.get(x.team_name)||0)+Number(x.points||0));if(sums.size){let team="",max=-Infinity;for(const[k,n]of sums)if(n>max){team=k;max=n}q.push({icon:"🏅",title:"팀 우승",name:team,sub:`${max}점`})}}
 const mr=await db.from("kmt_class_missions").select("title,reward_text").eq("mission_date",today).eq("is_completed",true).limit(3);
 if(!mr.error)for(const m of(mr.data||[]))q.push({icon:"🎯",title:"MISSION CLEAR",name:m.title,sub:m.reward_text||"미션 성공!"});
 return q;
}
function renderAwards(){ $("awards").innerHTML=awardQueue.length?awardQueue.map(a=>`<article class="award"><div class="icon">${a.icon}</div><h3>${esc(a.title)}</h3><strong>${esc(a.name)}</strong><p>${esc(a.sub)}</p></article>`).join(""):'<div class="empty">오늘 출석 또는 STAR 기록이 생기면 특별상이 나타납니다.</div>'}
async function load(){
 const {data:{session}}=await db.auth.getSession();if(!session){location.href="../";return}
 const [g,e]=await Promise.all([db.rpc("kmt_growth_center"),db.from("kmt_class_events").select("*").eq("is_active",true).gte("event_date",new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Seoul"})).order("event_date").limit(8)]);
 if(g.error)throw g.error;if(e.error)throw e.error;students=g.data||[];awardQueue=await buildAwards();renderAwards();
 $("events").innerHTML=(e.data||[]).length?(e.data||[]).map(x=>`<article class="event"><b>${dday(x.event_date)}</b><span>${esc(x.title)}</span></article>`).join(""):'<div class="empty">다가오는 일정이 없습니다.</div>';
}
function showAward(){if(!awardQueue.length)return mega("🏆","오늘의 기록을 기다려요!","STAR와 출석 기록이 생기면 시상할 수 있습니다.");const a=awardQueue[awardIndex%awardQueue.length];$("awardIcon").textContent=a.icon;$("awardTitle").textContent=a.title;$("awardName").textContent=a.name;$("awardSub").textContent=a.sub;$("ceremony").classList.remove("hidden")}
$("ceremonyBtn").onclick=()=>{awardIndex=0;showAward()};$("nextAward").onclick=()=>{awardIndex++;showAward()};$("closeCeremony").onclick=()=>$("ceremony").classList.add("hidden");$("refreshAwards").onclick=load;
function paintTimer(){const m=Math.floor(timerLeft/60),s=timerLeft%60;$("timer").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`}
document.querySelectorAll("[data-min]").forEach(b=>b.onclick=()=>{clearInterval(timerId);timerLeft=Number(b.dataset.min)*60;paintTimer();timerId=setInterval(()=>{timerLeft--;paintTimer();if(timerLeft<=0){clearInterval(timerId);mega("⏰","TIME!","시간 종료!")}},1000)});
$("timerStop").onclick=()=>clearInterval(timerId);
$("oxBtn").onclick=()=>{let n=0;const id=setInterval(()=>{$("ox").textContent=Math.random()<.5?"⭕":"❌";if(++n>12){clearInterval(id);mega($("ox").textContent,"OX 결정!","준비!")}},70)};
$("studentBtn").onclick=()=>{const pool=students.filter(x=>x.attended_today);if(!pool.length)return mega("🥋","출석 학생이 없습니다");let n=0;const id=setInterval(()=>{const r=pool[Math.floor(Math.random()*pool.length)];$("randomStudent").textContent=r.name;if(++n>15){clearInterval(id);mega("🎲",$("randomStudent").textContent+"!","도전!")}},70)};
document.querySelectorAll("[data-fx]").forEach(b=>b.onclick=()=>{const x=b.dataset.fx;if(x==="perfect")mega("🌟","PERFECT STAR!","완벽해요!");if(x==="applause")mega("👏","모두 박수!","최고예요!");if(x==="fire")mega("🎆","FIREWORKS!","멋진 순간!");if(x==="focus")mega("🥋","집중!","READY!")});
paintTimer();load().then(()=>{const qs=new URLSearchParams(location.search);if(qs.get("auto")==="1"&&awardQueue.length){awardIndex=0;showAward()}});
})();