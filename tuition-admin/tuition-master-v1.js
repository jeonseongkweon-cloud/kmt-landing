import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.KMT_ADMIN_CONFIG;
const LEDGER_KEY='kmt_tuition_ledger_grid_edits_v1';
const DETAIL_KEY='kmt_tuition_ledger_month_details_v1';
const DUE_KEY='kmt_tuition_ledger_due_edits_v1';
const YEAR=2026;

const load=k=>{try{return JSON.parse(localStorage.getItem(k)||'{}')}catch{return {}}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const norm=s=>String(s||'').replace(/\s/g,'');
const detailKey=(studentsKey,month)=>`${studentsKey}|${month}|detail`;
const fieldKey=(studentsKey,month,field)=>`${studentsKey}|${month}|${field}`;

function parseAmount(v){
  const raw=String(v??'').trim();
  if(!raw || raw==='?') return null;
  const hasMan=/만/.test(raw);
  const n=Number(raw.replace(/,/g,'.').replace(/[^0-9.]/g,''));
  if(!Number.isFinite(n)) return null;
  if(hasMan || n<1000) return Math.round(n*10000);
  return Math.round(n);
}
function entryToDate(v){
  const m=String(v||'').match(/(\d{1,2})\/(\d{1,2})/);
  if(!m) return null;
  return `${YEAR}-${String(+m[1]).padStart(2,'0')}-${String(+m[2]).padStart(2,'0')}`;
}
function inferMethod(entry){
  const s=String(entry||'');
  if(/페이|페$/.test(s)) return '울산페이';
  if(/카드|카$/.test(s)) return '카드';
  if(/통장|통$|계좌/.test(s)) return '계좌/통장';
  if(/현금/.test(s)) return '현금';
  if(/바우처|스포츠/.test(s)) return '스포츠바우처';
  return '';
}
function inferStatus(entry){
  const s=String(entry||'').trim();
  if(!s) return '미확인';
  if(/연장/.test(s)) return '연장';
  if(/휴원/.test(s)) return '휴원';
  if(/대상아님/.test(s)) return '납부대상아님';
  return '정상납부';
}

let db=null;
let ready=false;
let session=null;

async function init(){
  if(!cfg?.supabaseUrl || !cfg?.supabasePublishableKey){expose(false,'config-missing');return;}
  db=createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,detectSessionInUrl:false,autoRefreshToken:true}});
  const s=await db.auth.getSession();
  session=s.data?.session||null;
  if(!session){expose(false,'no-session');return;}
  ready=true;
  expose(true,'ready');
  await pullRemoteIntoLocal();
  updateNote();
  observeRows();
}
function expose(ok,state){
  window.KMTTuitionMaster={ok,state,saveDue,saveMonth,saveInline,reload:pullRemoteIntoLocal};
}
async function ensureHousehold(row, override={}){
  if(!ready || !db) return null;
  const householdKey=override.householdKey || row?.dataset?.householdKey || norm(override.displayName||'');
  const displayName=override.displayName || row?.querySelector('.lg-name b')?.textContent?.trim() || householdKey;
  const studentsCsv=override.studentsCsv || row?.dataset?.students || displayName;
  const studentNames=studentsCsv.split(',').map(x=>x.trim()).filter(Boolean);
  const studentsKey=override.studentsKey || studentNames.join('+');
  const dueText=row?.querySelector('.lg-name span')?.textContent||'';
  const dueDay=Number(override.dueDay || (dueText.match(/(\d+)일/)||[])[1] || 1);
  const {data,error}=await db.from('kmt_tuition_households').upsert({household_key:householdKey,display_name:displayName,students_key:studentsKey,due_day:Math.min(31,Math.max(1,dueDay)),updated_at:new Date().toISOString()},{onConflict:'household_key'}).select('id,household_key,students_key,due_day').single();
  if(error){console.error('[TUITION MASTER] household upsert failed',error);return null;}
  if(studentNames.length){
    const {data:students}=await db.from('students').select('id,name').in('name',studentNames);
    const idByName=new Map((students||[]).map(s=>[s.name,s.id]));
    const memberRows=studentNames.map(name=>({household_id:data.id,student_id:idByName.get(name)||null,student_name:name}));
    const r=await db.from('kmt_tuition_household_members').upsert(memberRows,{onConflict:'household_id,student_name'});
    if(r.error) console.warn('[TUITION MASTER] member link skipped',r.error.message);
  }
  return data;
}
async function audit(payload){
  if(!ready||!db) return;
  const {error}=await db.from('kmt_tuition_audit_log').insert(payload);
  if(error) console.warn('[TUITION MASTER] audit skipped',error.message);
}
async function saveDue(payload={}){
  if(!ready||!db) return false;
  const row=payload.row || document.querySelector(`#ledgerGridCard tr[data-household-key="${CSS.escape(payload.householdKey||'')}"]`);
  const h=await ensureHousehold(row,{householdKey:payload.householdKey,displayName:payload.displayName,studentsCsv:payload.studentsCsv,dueDay:payload.day});
  if(!h) return false;
  const oldDay=Number(h.due_day||0),day=Number(payload.day);
  const {error}=await db.from('kmt_tuition_households').update({due_day:day,updated_at:new Date().toISOString()}).eq('id',h.id);
  if(error){console.error('[TUITION MASTER] due save failed',error);return false;}
  await audit({household_id:h.id,action:'due_day_update',field_name:'due_day',old_value:{value:oldDay},new_value:{value:day},reason:payload.reason||null,memo:payload.memo||null});
  return true;
}
async function saveMonth(payload={}){
  if(!ready||!db) return false;
  const row=payload.row;
  const h=await ensureHousehold(row,{householdKey:payload.householdKey,displayName:payload.displayName,studentsCsv:payload.studentsCsv});
  if(!h) return false;
  const month=Number(payload.appliedMonth)+1,originalMonth=Number(payload.originalMonth)+1;
  if(originalMonth!==month) await db.from('kmt_tuition_monthly_records').delete().eq('household_id',h.id).eq('year',YEAR).eq('month',originalMonth);
  const entryText=payload.entryText ?? '',amountText=payload.amountText ?? payload.amount ?? '';
  const record={household_id:h.id,year:YEAR,month,paid_on:payload.paidOn||entryToDate(entryText),amount:parseAmount(payload.amount),payment_method:payload.method||inferMethod(entryText)||null,status:payload.status||inferStatus(entryText),entry_text:entryText||null,amount_text:amountText||null,memo:payload.memo||null,source:'tuition_admin',updated_at:new Date().toISOString()};
  const {data,error}=await db.from('kmt_tuition_monthly_records').upsert(record,{onConflict:'household_id,year,month'}).select('id').single();
  if(error){console.error('[TUITION MASTER] month save failed',error);return false;}
  await audit({household_id:h.id,monthly_record_id:data?.id||null,action:'monthly_record_upsert',new_value:{year:YEAR,month,paid_on:record.paid_on,amount:record.amount,payment_method:record.payment_method,status:record.status,entry_text:record.entry_text,amount_text:record.amount_text},memo:payload.memo||null});
  return true;
}
async function saveInline(input){
  if(!ready||!db||!input) return false;
  const row=input.closest('tr'); if(!row) return false;
  const parts=String(input.dataset.k||'').split('|'); if(parts.length<3) return false;
  parts.pop(); const month=Number(parts.pop()); const studentsKey=parts.join('|');
  const ledger=load(LEDGER_KEY);
  const entryText=ledger[fieldKey(studentsKey,month,'entry')] ?? row.querySelector(`.lg-month[data-month="${month}"] input[data-k$="|entry"]`)?.value ?? '';
  const amountText=ledger[fieldKey(studentsKey,month,'amount')] ?? row.querySelector(`.lg-month[data-month="${month}"] input[data-k$="|amount"]`)?.value ?? '';
  return saveMonth({row,householdKey:row.dataset.householdKey,displayName:row.querySelector('.lg-name b')?.textContent?.trim(),studentsCsv:row.dataset.students,originalMonth:month,appliedMonth:month,entryText,amountText,amount:amountText,paidOn:entryToDate(entryText),method:inferMethod(entryText),status:inferStatus(entryText),memo:''});
}
async function pullRemoteIntoLocal(){
  if(!ready||!db) return false;
  const {data:households,error:hErr}=await db.from('kmt_tuition_households').select('id,household_key,students_key,due_day');
  if(hErr){console.warn('[TUITION MASTER] remote household load failed',hErr.message);return false;}
  const due=load(DUE_KEY),byId=new Map();
  for(const h of households||[]){byId.set(h.id,h);if(h.household_key)due[h.household_key]=h.due_day;}
  save(DUE_KEY,due);
  const {data:records,error:rErr}=await db.from('kmt_tuition_monthly_records').select('household_id,year,month,paid_on,amount,payment_method,status,entry_text,amount_text,memo').eq('year',YEAR);
  if(rErr){console.warn('[TUITION MASTER] remote month load failed',rErr.message);return false;}
  const ledger=load(LEDGER_KEY),details=load(DETAIL_KEY);
  for(const r of records||[]){
    const h=byId.get(r.household_id); if(!h?.students_key) continue;
    const m=r.month-1;
    if(r.entry_text!=null) ledger[fieldKey(h.students_key,m,'entry')]=r.entry_text;
    if(r.amount_text!=null) ledger[fieldKey(h.students_key,m,'amount')]=r.amount_text;
    details[detailKey(h.students_key,m)]={appliedMonth:m,paidOn:r.paid_on||'',amount:r.amount_text||r.amount||'',method:r.payment_method||'',status:r.status||'미확인',memo:r.memo||'',updatedAt:new Date().toISOString(),source:'supabase'};
  }
  save(LEDGER_KEY,ledger); save(DETAIL_KEY,details);
  window.KMTTuitionLedger?.refresh?.();
  return true;
}

const NOTE_TEXT='※ 수정값은 브라우저에 안전 백업되며, 관리자 로그인 상태에서는 Supabase 중앙 회비 DB에도 자동 저장됩니다.';
function updateNote(){
  const note=document.querySelector('#ledgerGridCard .ledger-note');
  if(note && note.textContent!==NOTE_TEXT) note.textContent=NOTE_TEXT;
}
function observeRows(){
  updateNote();
  const root=document.getElementById('ledgerGridCard');
  if(!root) return setTimeout(observeRows,300);
  let scheduled=false;
  const mo=new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;updateNote();});
  });
  mo.observe(root,{childList:true,subtree:true});
}

document.addEventListener('change',e=>{
  const input=e.target.closest?.('#ledgerGridCard input[data-k]');
  // PC 직접입력 모드는 ledger-pc-inline-v1.js가 실제 저장 성공/실패 UI까지 담당한다.
  // 여기서 다시 저장하면 동일 값이 Supabase에 두 번 기록될 수 있으므로 중복 저장을 막는다.
  if(input && input.dataset.pcInlineOwnSave!=='1') setTimeout(()=>saveInline(input),0);
},true);

document.addEventListener('submit',e=>{
  if(e.target.id==='ledgerDueForm'){
    const row=document.querySelector(`#ledgerGridCard tr[data-household-key="${CSS.escape(document.getElementById('ledgerDueKey')?.value||'')}"]`);
    const payload={row,householdKey:document.getElementById('ledgerDueKey')?.value,displayName:row?.querySelector('.lg-name b')?.textContent?.trim(),studentsCsv:row?.dataset.students,day:Number(document.getElementById('ledgerDueNew')?.value),reason:document.getElementById('ledgerDueReason')?.value?.trim(),memo:document.getElementById('ledgerDueMemo')?.value?.trim()};
    setTimeout(()=>saveDue(payload),0);
  }
  if(e.target.id==='ledgerMonthForm'){
    const studentsKey=document.getElementById('ledgerMonthStudents')?.value||'';
    const anyInput=document.querySelector(`#ledgerGridCard input[data-k^="${CSS.escape(studentsKey+'|')}"]`);
    const row=anyInput?.closest('tr');
    const applied=Number(document.getElementById('ledgerMonthApplied')?.value||0),original=Number(document.getElementById('ledgerMonthOriginal')?.value||0);
    const method=document.getElementById('ledgerMonthMethod')?.value||'',status=document.getElementById('ledgerMonthStatus')?.value||'미확인',paidOn=document.getElementById('ledgerMonthPaidOn')?.value||'',amount=document.getElementById('ledgerMonthAmount')?.value?.trim()||'';
    const suffix=method==='울산페이'?'페이':method==='카드'?'카드':method==='계좌/통장'?'통장':method==='현금'?'현금':method==='스포츠바우처'?'바우처':method==='기타'?'기타':'';
    const entryText=status==='정상납부'?(paidOn?`${+paidOn.slice(5,7)}/${+paidOn.slice(8,10)}${suffix}`:''):status==='미확인'?'':status;
    const payload={row,householdKey:row?.dataset.householdKey,displayName:row?.querySelector('.lg-name b')?.textContent?.trim(),studentsCsv:row?.dataset.students,studentsKey,originalMonth:original,appliedMonth:applied,paidOn,amount,amountText:amount,method,status,entryText,memo:document.getElementById('ledgerMonthMemo')?.value?.trim()||''};
    setTimeout(()=>saveMonth(payload),0);
  }
},true);

init().catch(err=>{console.error('[TUITION MASTER] init failed',err);expose(false,'init-failed')});
