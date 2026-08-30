(()=>{"use strict";
const c=window.KMT_CLASS_CONFIG||{},db=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{persistSession:true}}),$=x=>document.getElementById(x);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const today=()=>new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Seoul"});
function mega(icon,title,sub=""){const m=$("mega");$("megaIcon").textContent=icon;$("megaTitle").textContent=title;$("megaSub").textContent=sub;m.classList.remove("hidden");setTimeout(()=>m.classList.add("hidden"),1800)}
async function load(){
 const {data:{session}}=await db.auth.getSession();if(!session){location.href="../";return}
 const [s,m]=await Promise.all([db.from("kmt_team_scores").select("team_name,points").eq("score_date",today()),db.from("kmt_class_missions").select("*").eq("mission_date",today()).order("created_at")]);
 if(s.error)throw s.error;if(m.error)throw m.error;
 const total=n=>(s.data||[]).filter(x=>x.team_name===n).reduce((a,x)=>a+Number(x.points||0),0);
 $("redScore").textContent=total("계명팀");$("blueScore").textContent=total("최고팀");
 $("missions").innerHTML=(m.data||[]).length?(m.data||[]).map(x=>{const pct=Math.min(100,Math.round(x.current_value/x.target_value*100));return `<article class="mission"><div><h3>${x.is_completed?"✅ ":""}${esc(x.title)}</h3><p>${x.current_value} / ${x.target_value}${x.reward_text?` · 보상: ${esc(x.reward_text)}`:""}</p><div class="progress"><i style="width:${pct}%"></i></div></div><button data-mid="${x.id}" data-cur="${x.current_value}" data-target="${x.target_value}">+1</button></article>`}).join(""):'<p>오늘 미션을 추가해 보세요.</p>';
 document.querySelectorAll("[data-mid]").forEach(b=>b.onclick=()=>missionPlus(b));
}
async function addScore(team,p){const r=await db.from("kmt_team_scores").insert({team_name:team,points:p,score_date:today(),note:"수업 게임센터"});if(r.error)throw r.error;await load()}
async function missionPlus(b){const cur=Number(b.dataset.cur)+1,target=Number(b.dataset.target),done=cur>=target;const r=await db.from("kmt_class_missions").update({current_value:cur,is_completed:done}).eq("id",b.dataset.mid);if(r.error)return alert(r.error.message);if(done)mega("🎯","MISSION CLEAR!","오늘의 미션 성공!");load()}
document.querySelectorAll("[data-team]").forEach(b=>b.onclick=()=>addScore(b.dataset.team,Number(b.dataset.p)));
$("resetBtn").onclick=async()=>{if(!confirm("오늘 팀 점수를 초기화할까요?"))return;const r=await db.from("kmt_team_scores").delete().eq("score_date",today());if(r.error)alert(r.error.message);else load()};
$("newMission").onclick=()=>$("missionDlg").showModal();
$("missionSave").onclick=async e=>{e.preventDefault();const payload={title:$("missionTitle").value.trim(),target_value:Number($("missionTarget").value||1),reward_text:$("missionReward").value.trim()||null,mission_date:today()};const r=await db.from("kmt_class_missions").insert(payload);if(r.error)return alert(r.error.message);$("missionDlg").close();$("missionForm").reset();load()};
document.querySelectorAll("[data-fx]").forEach(b=>b.onclick=()=>{const f=b.dataset.fx;if(f==="applause")mega("👏","모두 박수!","최고예요!");if(f==="fireworks")mega("🎆","FIREWORKS!","멋진 순간!");if(f==="win-red")mega("🏆","계명팀 승리!","RED TEAM WIN!");if(f==="win-blue")mega("🏆","최고팀 승리!","BLUE TEAM WIN!")});
load();
})();