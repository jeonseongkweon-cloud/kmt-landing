import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.KMT_ADMIN_CONFIG;
const LEDGER_KEY='kmt_tuition_ledger_grid_edits_v1';
const DETAIL_KEY='kmt_tuition_ledger_month_details_v1';
const DUE_KEY='kmt_tuition_ledger_due_edits_v1';
const DUE_DETAIL_KEY=DUE_KEY+'_details';
const YEAR=2026;

const load=k=>{try{return JSON.parse(localStorage.getItem(k)||'{}')}catch{return {}}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const clean=s=>String(s||'').trim();
const studentList=s=>clean(s).split(/[,+·]/).map(x=>x.trim()).filter(Boolean);
const stableStudents=s=>studentList(s).sort((a,b)=>a.localeCompare(b,'ko'));
const householdKey=s=>`kmt-2026:${stableStudents(s).join('+')}`;
const displayName=s=>stableStudents(s).join(' · ');

function parseAmount(raw){
  const s=clean(raw).replace(/,/g,'').replace(/원/g,'');
  if(!s) return null;
  const n=parseFloat(s.replace(/만/g,''));
  if(!Number.isFinite(n)) return null;
  if(s.includes('만')) return Math.round(n*10000);
  if(n < 100) return Math.round(n*10000);   // 16.5 => 165,000
  if(n < 1000) return Math.round(n*1000);   // 165 => 165,000
  return Math.round(n);
}
function entryText(paidOn,method,status){
  if(status!=='정상납부') return status==='미확인'?'':status;
  if(!paidOn) return '';
  const p=paidOn.split('-');
  const d=p.length===3?`${+p[1]}/${+p[2]}`:'';
  const suffix=method==='울산페이'?'페이':method==='카드'?'카드':method==='계좌/통장'?'통장':method==='현금'?'현금':method==='스포츠바우처'?'바우처':method==='기타'?'기타':'';
  return `${d}${suffix}`;
}

let db=null;
let session=null;
let readyPromise=null;

async function init(){
  if(readyPromise) return readyPromise;
  readyPromise=(async()=>{
    if(!cfg?.supabaseUrl || !cfg?.supabasePublishableKey) return {ok:false,reason:'config-missing'};
    db=createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,detectSessionInUrl:false,autoRefreshToken:true}});
    const res=await db.auth.getSession();
    session=res.data?.session||null;
    if(!session) return {ok:false,reason:'no-session'};
    const loaded=await loadRemoteToLocal();
    return loaded.ok?{ok:true}:{ok:false,reason:loaded.reason||'load-failed',error:loaded.error};
  })();
  return readyPromise;
}

async function ensureHousehold(students,dueDay,display){
  await init();
  if(!db||!session) throw new Error('CLASS 로그인 세션이 없어 서버 저장을 할 수 없습니다.');
  const names=stableStudents(students);
  const key=householdKey(students);
  const payload={
    household_key:key,
    students_key:names.join('+'),
    display_name:display||displayName(students),
    due_day:Number(dueDay)||1,
    is_active:true,
    source:'tuition-admin-web',
    updated_at:new Date().toISOString()
  };
  const {data,error}=await db.from('kmt_tuition_households').upsert(payload,{onConflict:'household_key'}).select('id,due_day').single();
  if(error) throw error;
  if(names.length){
    const rows=names.map(n=>({household_id:data.id,student_name:n}));
    const m=await db.from('kmt_tuition_household_members').upsert(rows,{onConflict:'household_id,student_name'});
    if(m.error) throw m.error;
  }
  return data;
}

async function saveDue({students,dueDay,oldDueDay,reason='',memo='',display=''}){
  const h=await ensureHousehold(students,dueDay,display);
  const a=await db.from('kmt_tuition_audit_log').insert({
    household_id:h.id,
    action:'due_day_change',
    field_name:'due_day',
    old_value:{due_day:Number(oldDueDay)||null},
    new_value:{due_day:Number(dueDay)},
    reason:clean(reason)||null,
    memo:clean(memo)||null,
    actor_user_id:session?.user?.id||null
  });
  if(a.error) console.warn('[TUITION DB] audit insert failed',a.error);
  return {ok:true,householdId:h.id};
}

async function saveMonth({students,dueDay,display='',month,paidOn='',amountText='',method='',status='미확인',memo=''}){
  const h=await ensureHousehold(students,dueDay,display);
  const payload={
    household_id:h.id,
    year:YEAR,
    month:Number(month),
    paid_on:paidOn||null,
    amount:parseAmount(amountText),
    payment_method:method||null,
    status,
    entry_text:entryText(paidOn,method,status)||null,
    amount_text:clean(amountText)||null,
    memo:clean(memo)||null,
    source:'tuition-admin-web',
    updated_at:new Date().toISOString()
  };
  const {data,error}=await db.from('kmt_tuition_monthly_records').upsert(payload,{onConflict:'household_id,year,month'}).select('id').single();
  if(error) throw error;
  const a=await db.from('kmt_tuition_audit_log').insert({
    household_id:h.id,
    monthly_record_id:data.id,
    action:'monthly_record_upsert',
    field_name:`${YEAR}-${String(month).padStart(2,'0')}`,
    new_value:payload,
    memo:clean(memo)||null,
    actor_user_id:session?.user?.id||null
  });
  if(a.error) console.warn('[TUITION DB] audit insert failed',a.error);
  return {ok:true,householdId:h.id,recordId:data.id};
}

async function loadRemoteToLocal(){
  if(!db||!session) return {ok:false,reason:'no-session'};
  const {data:households,error:hErr}=await db.from('kmt_tuition_households').select('id,household_key,students_key,display_name,due_day');
  if(hErr) return {ok:false,reason:'households-read',error:hErr.message};
  const {data:records,error:rErr}=await db.from('kmt_tuition_monthly_records').select('household_id,year,month,paid_on,amount_text,payment_method,status,entry_text,memo').eq('year',YEAR);
  if(rErr) return {ok:false,reason:'records-read',error:rErr.message};
  const byId=new Map((households||[]).map(h=>[h.id,h]));
  const due=load(DUE_KEY), dueDetails=load(DUE_DETAIL_KEY), ledger=load(LEDGER_KEY), details=load(DETAIL_KEY);
  for(const h of households||[]){
    if(!h.students_key) continue;
    const students=h.students_key;
    due[students.replace(/\s/g,'')]=h.due_day;
    dueDetails[students.replace(/\s/g,'')]={...(dueDetails[students.replace(/\s/g,'')]||{}),source:'supabase',updatedAt:new Date().toISOString()};
  }
  for(const r of records||[]){
    const h=byId.get(r.household_id); if(!h?.students_key) continue;
    const students=h.students_key;
    const m=Number(r.month)-1;
    ledger[`${students}|${m}|entry`]=r.entry_text||'';
    ledger[`${students}|${m}|amount`]=r.amount_text||'';
    details[`${students}|${m}|detail`]={appliedMonth:m,paidOn:r.paid_on||'',amount:r.amount_text||'',method:r.payment_method||'',status:r.status||'미확인',memo:r.memo||'',source:'supabase',updatedAt:new Date().toISOString()};
  }
  save(DUE_KEY,due);save(DUE_DETAIL_KEY,dueDetails);save(LEDGER_KEY,ledger);save(DETAIL_KEY,details);
  window.KMTTuitionLedger?.refresh?.();
  return {ok:true,households:(households||[]).length,records:(records||[]).length};
}

window.KMTTuitionDB={init,saveDue,saveMonth,loadRemoteToLocal};
init().then(r=>{
  console.info('[TUITION DB] GLOBAL-CORE sync',r);
  window.dispatchEvent(new CustomEvent('kmt-tuition-db-ready',{detail:r}));
}).catch(err=>console.error('[TUITION DB] init failed',err));
