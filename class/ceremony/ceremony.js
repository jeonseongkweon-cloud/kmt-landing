(()=>{"use strict";
const c=window.KMT_CLASS_CONFIG||{},db=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{persistSession:true}}),$=x=>document.getElementById(x);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
let students=[],awardQueue=[],awardIndex=0,timerId=null,timerLeft=300;
function dday(s){const a=new Date(s+"T00:00:00"),b=new Date();b.setHours(0,0,0,0);const n=Math.round((a-b)/86400000);return n===0?"D-DAY":n>0?`D-${n}`:`D+${Math.abs(n)}`}
function mega(i,t,s=""){const m=$("mega");$("megaIcon").textContent=i;$("megaTitle").textContent=t;$("megaSub").textContent=s;m.classList.remove("hidden");setTimeout(()=>m.classList.add("hidden"),1800)}
function buildAwards(rows){
 const active=rows.filter(x=>x.attended_today||Number(x.today_stars)>0),byStar=[...active].sort((a,b)=>b.today_stars-a.today_stars||b.xp-a.xp),byXp=[...active].sort((a,b)=>b.xp-a.xp);
 const q=[];
 if(byStar[0]&&byStar[0].today_stars>0)q.push({icon:"🏆",title:"TODAY'S CHAMPION",name:byStar[0].name,sub:`오늘 STAR ${byStar[0].today_stars}개`});
 const perfect=active.find(x=>Number(x.today_stars)>=5);if(perfect)q.push({icon:"🌟",title:"PERFECT STAR",name:perfect.name,sub:`오늘 STAR ${perfect.today_stars}개 · 최고의 집중력!`});
 const grow=byXp[0];if(grow)q.push({icon:"🔥",title:"GROWTH LEADER",name:grow.name,sub:`LEVEL ${grow.level_no} · ${grow.xp} XP`});
 const attendee=active.find(x=>x.attended_today);if(attendee)q.push({icon:"🥋",title:"GREAT ATTITUDE",name:attendee.name,sub:"오늘도 성실하게 수업에 참여했습니다."});
 return q;
}
function renderAwards(){ $("awards").innerHTML=awardQueue.length?awardQueue.map(a=>`<article class="award"><div class="icon">${a.icon}</div><h3>${esc(a.title)}</h3><strong>${esc(a.name)}</strong><p>${esc(a.sub)}</p></article>`).join(""):'<div class="empty">오늘 출석 또는 STAR 기록이 생기면 특별상이 나타납니다.</div>'}
async function load(){
 const {data:{session}}=await db.auth.getSession();if(!session){location.href="../";return}
 const [g,e]=await Promise.all([db.rpc("kmt_growth_center"),db.from("kmt_class_events").select("*").eq("is_active",true).gte("event_date",new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Seoul"})).order("event_date").limit(8)]);
 if(g.error)throw g.error;if(e.error)throw e.error;students=g.data||[];awardQueue=buildAwards(students);renderAwards();
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
paintTimer();load();
})();