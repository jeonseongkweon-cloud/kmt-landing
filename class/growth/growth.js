(()=>{
"use strict";
const cfg=window.KMT_CLASS_CONFIG||{};
const db=window.supabase.createClient(cfg.supabaseUrl||"https://ojxarsfaewehwjidwgac.supabase.co",cfg.supabaseAnonKey||"sb_publishable_ZoAZrV5rDmYDLxhXlnEXCw_lPqJfin0",{auth:{persistSession:true}});
const $=id=>document.getElementById(id);
const state={rows:[],periods:[]};
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const today=new Date();$("todayLabel").textContent=today.toLocaleDateString("ko-KR",{month:"long",day:"numeric",weekday:"short"});

function dday(dateText){const target=new Date(dateText+"T00:00:00"),now=new Date();now.setHours(0,0,0,0);const n=Math.round((target-now)/86400000);return n===0?"D-DAY":n>0?`D-${n}`:`D+${Math.abs(n)}`}
function levelProgress(xp,level){const base=(level-1)*100,next=level*100;return {pct:Math.max(0,Math.min(100,((xp-base)/(next-base))*100)),remain:Math.max(0,next-xp)}}
function photo(row){return row.photo_url?`<img class="photo" src="${esc(row.photo_url)}" alt="">`:`<div class="photo avatar">🥋</div>`}
function render(){
 const q=$("searchInput").value.trim(),pid=$("periodSelect").value;
 const rows=state.rows.filter(r=>(!q||r.name.includes(q))&&(!pid||String(r.class_period_id||"")===pid));
 $("summary").textContent=`재원생 ${rows.length}명 · 오늘 출석 ${rows.filter(r=>r.attended_today).length}명`;
 $("studentGrid").innerHTML=rows.length?rows.map(r=>{
   const p=levelProgress(Number(r.xp||0),Number(r.level_no||1));
   const badges=[];
   if(Number(r.streak_days||0)>=3)badges.push(`<span class="badge hot">🔥 ${r.streak_days}회 연속출석</span>`);
   if(Number(r.total_stars||0)>=12)badges.push(`<span class="badge">⭐ 12 STAR+</span>`);
   if(Number(r.today_stars||0)>=3)badges.push(`<span class="badge hot">✨ 오늘 STAR ${r.today_stars}</span>`);
   return `<article class="card"><div class="card-top">${photo(r)}<div><div class="name">${esc(r.name)}</div><div class="level">LEVEL ${r.level_no}</div></div></div>
   <div class="stats"><div class="stat"><strong>${r.xp||0}</strong><span>XP</span></div><div class="stat"><strong>⭐ ${r.total_stars||0}</strong><span>STAR</span></div><div class="stat"><strong>${r.attended_total||0}</strong><span>출석</span></div></div>
   <div class="xp-line"><span>다음 LEVEL까지 ${p.remain} XP</span><span>${Math.round(p.pct)}%</span></div><div class="bar"><i style="width:${p.pct}%"></i></div>
   <div class="badge-row">${badges.join("")||'<span class="badge">오늘도 성장 중</span>'}</div></article>`
 }).join(""):'<div class="empty">조건에 맞는 학생이 없습니다.</div>';
}
async function load(){
 try{
   const {data:{session}}=await db.auth.getSession();if(!session){location.href="../";return}
   const [g,p,e]=await Promise.all([
     db.rpc("kmt_growth_center"),
     db.from("class_periods").select("id,name").eq("is_active",true).order("sort_order"),
     db.from("kmt_class_events").select("*").gte("event_date",new Date(Date.now()-86400000*7).toISOString().slice(0,10)).order("event_date").limit(12)
   ]);
   if(g.error)throw g.error;if(p.error)throw p.error;if(e.error)throw e.error;
   state.rows=Array.isArray(g.data)?g.data:[];state.periods=p.data||[];
   $("periodSelect").innerHTML='<option value="">전체 재원생</option>'+state.periods.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");
   $("eventList").innerHTML=(e.data||[]).length?(e.data||[]).map(x=>`<article class="event"><div class="dday">${dday(x.event_date)}</div><h3>${esc(x.title)}</h3><p>${esc(x.event_date)} · ${esc(x.event_type||"event")}</p>${x.note?`<p>${esc(x.note)}</p>`:""}</article>`).join(""):'<div class="empty">등록된 일정이 없습니다.</div>';
   render();
 }catch(err){console.error("[GROWTH]",err);$("studentGrid").innerHTML=`<div class="empty">성장정보 오류: ${esc(err.message||err)}</div>`}
}
$("searchInput").addEventListener("input",render);$("periodSelect").addEventListener("change",render);$("refreshBtn").onclick=load;
$("eventAddBtn").onclick=()=>{$("eventDate").value=new Date().toISOString().slice(0,10);$("eventDialog").showModal()};
$("eventSaveBtn").onclick=async ev=>{
 ev.preventDefault();
 try{
   const payload={title:$("eventTitle").value.trim(),event_date:$("eventDate").value,event_type:$("eventType").value,note:$("eventNote").value.trim()||null};
   if(!payload.title||!payload.event_date)return;
   const r=await db.from("kmt_class_events").insert(payload);if(r.error)throw r.error;
   $("eventDialog").close();$("eventForm").reset();await load();
 }catch(err){alert("일정 저장 실패: "+(err.message||err))}
};
load();
})();