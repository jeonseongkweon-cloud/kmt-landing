import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.KMT_ADMIN_CONFIG;
const db = createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
  auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" }
});

const $ = (id) => document.getElementById(id);
const state = { students: [], periods: [], filtered: [], editing: null };
const loginScreen = $("loginScreen");
const adminApp = $("adminApp");

function first(value){ return Array.isArray(value) ? (value[0] || null) : value; }
function clean(value){ return value == null ? "" : String(value).trim(); }
function numberOrNull(value){ const v=clean(value); return v === "" ? null : Number(v); }
function escapeHtml(value){ return clean(value).replace(/[&<>'"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function toast(message){ const el=$("toast"); el.textContent=message; el.classList.add("show"); clearTimeout(window.__kmtToast); window.__kmtToast=setTimeout(()=>el.classList.remove("show"),2200); }
function enrollment(s){ return first(s.enrollments) || {}; }
function guardian(s,pos){ return (s.guardians || []).find(g=>Number(g.position)===pos) || {}; }
function cert(s,type){ return (s.certificates || []).find(c=>c.discipline===type) || {}; }
function points(s){ return first(s.student_points) || {}; }
function sparkLink(s){ return first(s.spark_member_links) || {}; }
function isClassReview(s){ const e=enrollment(s); return !e.class_period_id || clean(e.class_label_raw)==="30"; }

async function signIn(){
  $("loginMessage").textContent="Google 로그인 화면을 여는 중입니다...";
  const redirectTo = `${location.origin}${location.pathname}`;
  const { error } = await db.auth.signInWithOAuth({ provider:"google", options:{ redirectTo, queryParams:{ prompt:"select_account" } } });
  if(error) $("loginMessage").textContent=error.message;
}

async function validateSession(){
 const {data:{session}}=await db.auth.getSession();
 if(!session){location.replace("../");return;}
 const email=clean(session.user.email).toLowerCase();
 if(email!=="jeonseongkweon@gmail.com"){await db.auth.signOut();location.replace("../");return;}
 loginScreen.hidden=true; adminApp.hidden=false;
 $("adminEmail").textContent="전성권 관장";
 await loadData();
}

async function loadData(){
  $("dataStatus").textContent="Supabase에서 불러오는 중...";
  const [studentResult, periodResult] = await Promise.all([
    db.from("students").select(`id,student_code,name,gender,birth_date,birth_date_review_required,photo_url,student_phone,school_name,address,guardians(id,position,name,phone,is_primary,sms_enabled),enrollments(id,class_period_id,class_label_raw,time_raw,training_days,joined_on,member_number,status,status_changed_on,monthly_fee,fee_due_day,class_periods(id,code,name)),certificates(id,discipline,rank_text,next_exam_on),student_points(id,point_type,balance),spark_member_links(id,spark_user_id,spark_display_name,link_status,linked_at,verified_at)`).order("student_code"),
    db.from("class_periods").select("id,code,name,start_time,end_time,sort_order").eq("is_active",true).order("sort_order")
  ]);
  if(studentResult.error){
    $("dataStatus").textContent="권한 또는 연결 확인 필요";
    toast(`데이터 조회 실패: ${studentResult.error.message}`);
    return;
  }
  state.students=studentResult.data || [];
  state.periods=periodResult.data || [];
  fillPeriodOptions(); updateSummary(); applyFilters();
  $("dataStatus").textContent=`최근 갱신 ${new Date().toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})}`;
}

function fillPeriodOptions(){
  const filter=$("classFilter"), edit=$("classPeriod");
  filter.innerHTML='<option value="all">전체 수업부</option><option value="review">미확정</option>';
  edit.innerHTML='<option value="">미확정</option>';
  state.periods.forEach(p=>{
    filter.insertAdjacentHTML("beforeend",`<option value="${p.id}">${escapeHtml(p.name)}</option>`);
    edit.insertAdjacentHTML("beforeend",`<option value="${p.id}">${escapeHtml(p.name)}</option>`);
  });
}

function updateSummary(){
  $("totalCount").textContent=state.students.length;
  $("activeCount").textContent=state.students.filter(s=>enrollment(s).status==="재원").length;
  $("birthReviewCount").textContent=state.students.filter(s=>s.birth_date_review_required).length;
  $("classReviewCount").textContent=state.students.filter(isClassReview).length;
}

function applyFilters(){
  const q=clean($("searchInput").value).toLowerCase();
  const status=$("statusFilter").value, classId=$("classFilter").value, review=$("reviewOnly").checked;
  state.filtered=state.students.filter(s=>{
    const e=enrollment(s);
    const searchOk=!q || s.name.toLowerCase().includes(q) || s.student_code.toLowerCase().includes(q);
    const statusOk=status==="all" || e.status===status;
    const classOk=classId==="all" || (classId==="review" ? isClassReview(s) : e.class_period_id===classId);
    const reviewOk=!review || s.birth_date_review_required || isClassReview(s);
    return searchOk && statusOk && classOk && reviewOk;
  });
  renderList();
}

function renderList(){
  const list=$("studentList"); list.innerHTML="";
  $("resultCount").textContent=`${state.filtered.length}명`;
  $("emptyState").hidden=state.filtered.length>0;
  state.filtered.forEach(s=>{
    const e=enrollment(s), p=first(e.class_periods);
    const photo=clean(s.photo_url); const review=s.birth_date_review_required || isClassReview(s), spark=sparkLink(s);
    const row=document.createElement("article"); row.className="student-row"; row.tabIndex=0;
    row.innerHTML=`${photo?`<img class="avatar" src="${escapeHtml(photo)}" alt="">`:`<div class="avatar avatar-fallback">${escapeHtml(s.name.slice(0,2))}</div>`}
      <div><span class="code">${escapeHtml(s.student_code)}</span><span class="sub">${escapeHtml(s.gender||"-")} · ${escapeHtml(s.birth_date||"생년월일 미확정")}</span></div>
      <div><span class="name">${escapeHtml(s.name)}</span><span class="sub">${escapeHtml((e.training_days||[]).length ? e.training_days.join(",") : "요일 미등록")}</span></div>
      <div class="hide-small"><strong>${escapeHtml(p?.name || e.class_label_raw || "수업부 미확정")}</strong><span class="sub">${escapeHtml((e.training_days||[]).join(","))}</span></div>
      <div class="hide-mid"><span class="badge ${spark.id?`spark ${spark.link_status}`:''}">${spark.id?`🔥 ${spark.link_status==='verified'?'SPARK 연결':'SPARK 확인중'}`:escapeHtml(e.status||"재원")}</span></div>
      <div class="hide-mid">${review?'<span class="badge warn">확인 필요</span>':''}</div><div class="edit-mark">›</div>`;
    row.addEventListener("click",()=>openStudent(s)); row.addEventListener("keydown",ev=>{if(ev.key==="Enter")openStudent(s)}); list.appendChild(row);
  });
}

function setValue(id,value){ $(id).value=value ?? ""; }
function openStudent(s=null){
  state.editing=s;
  const e=s?enrollment(s):{}, g1=s?guardian(s,1):{}, g2=s?guardian(s,2):{};
  $("dialogCode").textContent=s?s.student_code:"신규"; $("dialogTitle").textContent=s?`${s.name} 원생정보`:"원생 추가";
  setValue("studentUuid",s?.id); setValue("studentCode",s?.student_code || nextStudentCode()); $("studentCode").readOnly=Boolean(s);
  setValue("studentName",s?.name); setValue("studentGender",s?.gender); setValue("studentBirth",s?.birth_date); $("birthReview").checked=Boolean(s?.birth_date_review_required);
  setValue("schoolName",s?.school_name); setValue("studentPhone",s?.student_phone); setValue("studentAddress",s?.address);
  setValue("enrollmentStatus",e.status||"재원"); setValue("classPeriod",e.class_period_id); setValue("classLabelRaw",e.class_label_raw); setValue("joinedOn",e.joined_on);
  setValue("trainingDays",(e.training_days||[]).join(",")); setValue("memberNumber",e.member_number); setValue("monthlyFee",e.monthly_fee); setValue("feeDueDay",e.fee_due_day);
  setValue("guardian1Name",g1.name); setValue("guardian1Phone",g1.phone); setValue("guardian2Name",g2.name); setValue("guardian2Phone",g2.phone);
  $("guardian1Sms").checked=s?Boolean(g1.sms_enabled):true; $("guardian2Sms").checked=s?Boolean(g2.sms_enabled):false;
  setValue("certTkd",s?cert(s,"태권도").rank_text:""); setValue("certIpma",s?cert(s,"경호무술").rank_text:""); setValue("certTkkd",s?cert(s,"태권검도_검도").rank_text:""); setValue("growthPoints",s?points(s).balance:0);
  const spark=s?sparkLink(s):{};
  $("sparkStudentIdentity").textContent=s?`${s.student_code} · ${s.name}`:"신규 학생은 먼저 저장해 주세요.";
  $("sparkStudentUuid").textContent=s?`CLASS UUID: ${s.id}`:"";
  setValue("sparkUserId",spark.spark_user_id);setValue("sparkDisplayName",spark.spark_display_name);setValue("sparkLinkStatus",spark.link_status||"pending");setValue("sparkConfirmCode","");
  $("sparkLinkMessage").textContent=spark.id?`연결됨 · ${spark.spark_user_id}`:"아직 연결되지 않음";
  $("saveSparkLink").disabled=!s;$("unlinkSpark").hidden=!spark.id;
  $("saveMessage").textContent=""; $("studentDialog").showModal();
}

async function saveSparkLink(){
  const s=state.editing,code=clean($("sparkConfirmCode").value),sparkId=clean($("sparkUserId").value);
  if(!s)return toast("원생정보를 먼저 저장해 주세요.");
  if(!sparkId)return $("sparkLinkMessage").textContent="SPARK 고유 ID를 입력해 주세요.";
  if(code.toUpperCase()!==s.student_code.toUpperCase())return $("sparkLinkMessage").textContent=`확인을 위해 ${s.student_code}를 정확히 입력해 주세요.`;
  $("saveSparkLink").disabled=true;$("sparkLinkMessage").textContent="연결 저장 중...";
  const {error}=await db.rpc("kmt_link_spark_member",{p_student_id:s.id,p_confirm_student_code:code,p_spark_user_id:sparkId,p_spark_display_name:clean($("sparkDisplayName").value)||null,p_link_status:$("sparkLinkStatus").value});
  $("saveSparkLink").disabled=false;if(error)return $("sparkLinkMessage").textContent=error.message;
  toast(`${s.name} 학생의 SPARK 연결을 저장했습니다.`);$("studentDialog").close();await loadData();
}
async function unlinkSpark(){
  const s=state.editing,code=clean($("sparkConfirmCode").value);if(!s)return;
  if(code.toUpperCase()!==s.student_code.toUpperCase())return $("sparkLinkMessage").textContent=`연결 해제 전 ${s.student_code}를 정확히 입력해 주세요.`;
  if(!confirm(`${s.name} 학생과 SPARK 회원의 연결을 해제할까요? 연결 이력은 보존됩니다.`))return;
  $("unlinkSpark").disabled=true;const {error}=await db.rpc("kmt_unlink_spark_member",{p_student_id:s.id,p_confirm_student_code:code});$("unlinkSpark").disabled=false;
  if(error)return $("sparkLinkMessage").textContent=error.message;toast(`${s.name} 학생의 SPARK 연결을 해제했습니다.`);$("studentDialog").close();await loadData();
}

function nextStudentCode(){
  const max=state.students.reduce((m,s)=>Math.max(m,Number(s.student_code.replace(/\D/g,""))||0),0);
  return `KM${String(max+1).padStart(3,"0")}`;
}

async function saveStudent(event){
  event.preventDefault(); $("saveStudent").disabled=true; $("saveMessage").textContent="저장 중...";
  try{
    const studentPayload={ student_code:clean($("studentCode").value).toUpperCase(), name:clean($("studentName").value), gender:clean($("studentGender").value)||null, birth_date:clean($("studentBirth").value)||null, birth_date_review_required:$("birthReview").checked, school_name:clean($("schoolName").value)||null, student_phone:clean($("studentPhone").value)||null, address:clean($("studentAddress").value)||null };
    let studentId=clean($("studentUuid").value);
    if(studentId){ const {error}=await db.from("students").update(studentPayload).eq("id",studentId); if(error)throw error; }
    else{ const {data,error}=await db.from("students").insert(studentPayload).select("id").single(); if(error)throw error; studentId=data.id; }
    const period=state.periods.find(p=>p.id===$("classPeriod").value);
    const enrollmentPayload={student_id:studentId,class_period_id:$("classPeriod").value||null,class_label_raw:period?.name||clean($("classLabelRaw").value)||null,training_days:clean($("trainingDays").value).split(",").map(v=>v.trim()).filter(Boolean),joined_on:clean($("joinedOn").value)||null,member_number:clean($("memberNumber").value)||null,status:$("enrollmentStatus").value,status_changed_on:new Date().toISOString().slice(0,10),monthly_fee:numberOrNull($("monthlyFee").value),fee_due_day:numberOrNull($("feeDueDay").value)};
    let result=await db.from("enrollments").upsert(enrollmentPayload,{onConflict:"student_id"}); if(result.error)throw result.error;
    const guardians=[{student_id:studentId,position:1,name:clean($("guardian1Name").value)||null,phone:clean($("guardian1Phone").value)||null,is_primary:true,sms_enabled:$("guardian1Sms").checked},{student_id:studentId,position:2,name:clean($("guardian2Name").value)||null,phone:clean($("guardian2Phone").value)||null,is_primary:false,sms_enabled:$("guardian2Sms").checked}];
    result=await db.from("guardians").upsert(guardians,{onConflict:"student_id,position"}); if(result.error)throw result.error;
    const certs=[['태권도','certTkd'],['경호무술','certIpma'],['태권검도_검도','certTkkd']].map(([discipline,id])=>({student_id:studentId,discipline,rank_text:clean($(id).value)||null}));
    result=await db.from("certificates").upsert(certs,{onConflict:"student_id,discipline"}); if(result.error)throw result.error;
    result=await db.from("student_points").upsert({student_id:studentId,point_type:"growth",balance:numberOrNull($("growthPoints").value)||0},{onConflict:"student_id,point_type"}); if(result.error)throw result.error;
    $("studentDialog").close(); toast("원생정보를 저장했습니다."); await loadData();
  }catch(error){ $("saveMessage").textContent=error.message || "저장하지 못했습니다."; }
  finally{ $("saveStudent").disabled=false; }
}

$("googleLogin").addEventListener("click",signIn);
$("logoutButton").addEventListener("click",async()=>{await db.auth.signOut();location.reload();});
$("addStudentButton").addEventListener("click",()=>openStudent());
$("studentForm").addEventListener("submit",saveStudent);
$("cancelEdit").addEventListener("click",()=>$("studentDialog").close());
$("saveSparkLink").addEventListener("click",saveSparkLink);
$("unlinkSpark").addEventListener("click",unlinkSpark);
$("closeDialog").addEventListener("click",()=>$("studentDialog").close());
[$("searchInput"),$("statusFilter"),$("classFilter"),$("reviewOnly")].forEach(el=>el.addEventListener(el.type==="search"?"input":"change",applyFilters));
db.auth.onAuthStateChange((_event,session)=>{ if(session && adminApp.hidden) setTimeout(validateSession,0); });
validateSession();
