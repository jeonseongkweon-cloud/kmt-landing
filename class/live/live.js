(()=>{"use strict";
const c=window.KMT_CLASS_CONFIG||{},db=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{persistSession:true}});
const $=x=>document.getElementById(x),esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
let previous=new Map();
function tick(){const d=new Date();$("clock").textContent=d.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"});$("date").textContent=d.toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"short"})}tick();setInterval(tick,1000);
function img(r){return r.photo_url?`<img src="${esc(r.photo_url)}">`:`<div class="avatar">🥋</div>`}
function levelPct(r){return Math.max(0,Math.min(100,(Number(r.xp||0)%100)))}
function levelFx(r){const old=previous.get(r.student_id);if(old&&r.level_no>old){$("levelFx").querySelector("span").textContent=`${r.name} · LEVEL ${r.level_no}`;$("levelFx").classList.remove("hidden");setTimeout(()=>$("levelFx").classList.add("hidden"),2200)}previous.set(r.student_id,r.level_no)}
async function load(){
 try{
  const {data:{session}}=await db.auth.getSession();if(!session){location.href="../";return}
  await db.rpc("kmt_award_growth_badges");
  const {data,error}=await db.rpc("kmt_growth_live_board");if(error)throw error;const rows=data||[];
  rows.forEach(levelFx);
  $("att").textContent=rows.filter(x=>x.attended_today).length;$("stars").textContent=rows.reduce((a,x)=>a+Number(x.today_stars||0),0);
  const champ=rows.find(x=>Number(x.today_stars)>0);
  $("champion").innerHTML=champ?`<div class="trophy">🏆</div><div><small>TODAY'S CHAMPION</small><h2>${esc(champ.name)}</h2><p>오늘 STAR ${champ.today_stars} · LEVEL ${champ.level_no} · ${champ.xp} XP</p></div>`:`<div class="trophy">🏆</div><div><small>TODAY'S CHAMPION</small><h2>STAR를 기다리는 중</h2><p>오늘 가장 많은 STAR를 받은 친구가 나타납니다.</p></div>`;
  $("ranking").innerHTML=rows.slice(0,8).map((r,i)=>`<article class="rank ${i===0?"no1":""}"><div class="pos">${i+1}</div><div class="person">${img(r)}<div><strong>${esc(r.name)}</strong><span>LEVEL ${r.level_no} · 배지 ${r.badge_count}</span></div></div><div class="score">⭐ ${r.today_stars} <small>오늘</small></div></article>`).join("");
  $("levels").innerHTML=[...rows].sort((a,b)=>levelPct(b)-levelPct(a)).slice(0,8).map(r=>`<article class="lv"><div class="lvtop"><strong>${esc(r.name)} · LV.${r.level_no}</strong><span>${r.xp} XP</span></div><div class="bar"><i style="width:${levelPct(r)}%"></i></div></article>`).join("");
 }catch(e){console.error("[LIVE]",e)}
}
$("refresh").onclick=load;load();setInterval(load,15000);
})();