import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg=window.KMT_ADMIN_CONFIG||{};
const $=id=>document.getElementById(id);
const money=n=>`${Math.round(Number(n)||0).toLocaleString('ko-KR')}원`;
const RENT=2000000;
const fixedExpenseDefinitions=[
  {category:'costco_hyundai_card',title:'코스트코 현대카드',day:10},
  {category:'samsung_card',title:'삼성카드',day:13},
  {category:'woori_card',title:'우리카드',day:14},
  {category:'water_common_electricity',title:'상수도·공동전기',day:1},
  {category:'insurance',title:'보험료',day:1},
  {category:'mother_in_law_repayment',title:'장모님 상환',day:1},
  {category:'electricity',title:'전기세',day:1},
  {category:'parking_fee',title:'주차장사용료',day:1}
];
const fixedCategories=new Set(fixedExpenseDefinitions.map(x=>x.category));
const regularOptions=['소모품','간식·식비','교육용품','차량·교통','택배·배송','수리·관리','사무용품','행사비','기타'];
const categoryLabel={other_income:'기타수입',examination_fee:'승단심사비',regular_expense:'일반지출',special_expense:'특별지출',other_fixed_expense:'기타 고정지출',costco_hyundai_card:'코스트코 현대카드',samsung_card:'삼성카드',woori_card:'우리카드',water_common_electricity:'상수도·공동전기',insurance:'보험료',mother_in_law_repayment:'장모님 상환',electricity:'전기세',parking_fee:'주차장사용료'};
const state={db:null,user:null,month:'',tuition:[],entries:[]};

function localToday(){const d=new Date(),off=d.getTimezoneOffset();return new Date(d.getTime()-off*60000).toISOString().slice(0,10)}
function currentMonth(){return localToday().slice(0,7)}
function bounds(ym){const [y,m]=ym.split('-').map(Number);const next=m===12?`${y+1}-01-01`:`${y}-${String(m+1).padStart(2,'0')}-01`;return {year:y,month:m,start:`${ym}-01`,next}}
function defaultDate(){return state.month===currentMonth()?localToday():`${state.month}-01`}
function setDefaults(){const day=defaultDate();$('incomeDate').value=day;$('expenseDate').value=day;$('otherFixedDate').value=day;$('regularDate').value=day}
function showError(message){$('errorBox').textContent=message;$('errorBox').hidden=false;$('syncStatus').textContent='오류 발생'}
function clearError(){$('errorBox').hidden=true;$('errorBox').textContent=''}
function paymentMemo(payment,memo){return `[결제방법] ${payment}${memo?`\n${memo}`:''}`}
function parsePaymentMemo(value){const text=String(value||''),match=text.match(/^\[결제방법\]\s*([^\n]+)(?:\n|$)/);return {payment:match?.[1]||'기타',memo:match?text.slice(match[0].length):text}}

async function init(){
  if(!cfg.supabaseUrl||!cfg.supabasePublishableKey) throw new Error('Supabase 설정을 찾지 못했습니다.');
  state.db=createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,detectSessionInUrl:false,autoRefreshToken:true}});
  const {data:{session}}=await state.db.auth.getSession();
  if(!session){$('loginRequired').hidden=false;return}
  state.user=session.user;state.month=currentMonth();$('monthPicker').value=state.month;setDefaults();bind();$('app').hidden=false;await reload();
}

function bind(){
  $('monthPicker').addEventListener('change',async e=>{if(e.target.value){state.month=e.target.value;resetAllOpenForms();await reload()}});
  $('prevMonth').onclick=()=>moveMonth(-1);$('nextMonth').onclick=()=>moveMonth(1);
  $('thisMonth').onclick=async()=>{state.month=currentMonth();$('monthPicker').value=state.month;resetAllOpenForms();await reload()};
  $('incomeForm').addEventListener('submit',e=>saveForm(e,'income'));
  $('expenseForm').addEventListener('submit',e=>saveForm(e,'expense'));
  $('otherFixedForm').addEventListener('submit',e=>saveCustomExpense(e,'otherFixed'));
  $('regularForm').addEventListener('submit',e=>saveCustomExpense(e,'regular'));
  $('incomeCancel').onclick=()=>resetForm('income');$('expenseCancel').onclick=()=>resetForm('expense');
  $('otherFixedCancel').onclick=()=>closeCustomForm('otherFixed');$('regularCancel').onclick=()=>closeCustomForm('regular');
  $('toggleOtherFixed').onclick=()=>toggleCustomForm('otherFixed');$('toggleRegular').onclick=()=>toggleCustomForm('regular');
  $('regularCategory').addEventListener('change',toggleRegularDirect);
  $('entryRows').addEventListener('click',handleRowAction);$('otherFixedList').addEventListener('click',handleRowAction);$('regularList').addEventListener('click',handleRowAction);
  $('fixedExpenseRows').addEventListener('click',saveFixedExpense);
}
async function moveMonth(delta){const [y,m]=state.month.split('-').map(Number),d=new Date(y,m-1+delta,1);state.month=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;$('monthPicker').value=state.month;resetAllOpenForms();await reload()}

async function reload(){
  clearError();$('syncStatus').textContent='중앙DB 불러오는 중…';
  const {year}=bounds(state.month);
  const [tuitionResult,entryResult]=await Promise.all([
    state.db.from('kmt_tuition_monthly_records').select('id,year,month,amount,status').eq('year',year),
    state.db.from('kmt_management_entries').select('id,entry_date,entry_type,category,title,amount,memo,created_at,updated_at').gte('entry_date',`${year}-01-01`).lt('entry_date',`${year+1}-01-01`).order('entry_date',{ascending:false}).order('created_at',{ascending:false})
  ]);
  if(tuitionResult.error) throw new Error(`회비 읽기 실패: ${tuitionResult.error.message}`);
  if(entryResult.error) throw new Error(`경영자료 읽기 실패: ${entryResult.error.message}`);
  state.tuition=tuitionResult.data||[];state.entries=entryResult.data||[];render();$('syncStatus').textContent=`${new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})} 중앙DB 동기화`;
}

function totals(month){
  const [year,mon]=month.split('-').map(Number);
  const tuition=state.tuition.filter(r=>r.year===year&&r.month===mon&&r.status==='정상납부').reduce((s,r)=>s+Number(r.amount||0),0);
  const rows=state.entries.filter(r=>r.entry_date.slice(0,7)===month);
  const other=rows.filter(r=>r.entry_type==='income').reduce((s,r)=>s+Number(r.amount),0);
  const mainFixed=rows.filter(r=>fixedCategories.has(r.category)).reduce((s,r)=>s+Number(r.amount),0);
  const otherFixed=rows.filter(r=>r.category==='other_fixed_expense').reduce((s,r)=>s+Number(r.amount),0);
  const regular=rows.filter(r=>r.category==='regular_expense').reduce((s,r)=>s+Number(r.amount),0);
  const special=rows.filter(r=>r.category==='special_expense').reduce((s,r)=>s+Number(r.amount),0);
  const fixed=RENT+mainFixed+otherFixed,expense=fixed+regular+special;
  return {tuition,other,mainFixed,otherFixed,regular,special,fixed,income:tuition+other,expense,profit:tuition+other-expense,rows};
}
function render(){
  const t=totals(state.month),[year,mon]=state.month.split('-');
  $('totalIncome').textContent=money(t.income);$('totalExpense').textContent=money(t.expense);$('totalProfit').textContent=money(t.profit);
  $('totalProfit').classList.toggle('profit-negative',t.profit<0);
  $('incomeBreakdown').textContent=`회비 ${money(t.tuition)} + 기타·심사 ${money(t.other)}`;
  $('expenseBreakdown').textContent=`고정지출 ${money(t.fixed)} + 일반지출 ${money(t.regular)} + 특별지출 ${money(t.special)}`;
  renderFixedExpenses(t.rows);renderCustomLists(t.rows);
  $('ledgerTitle').textContent=`${Number(mon)}월 수입·지출 내역`;
  $('entryRows').innerHTML=t.rows.map(ledgerRow).join('');$('emptyState').hidden=t.rows.length>0;
  $('annualYear').textContent=year;
  $('annualRows').innerHTML=Array.from({length:12},(_,i)=>{const x=totals(`${year}-${String(i+1).padStart(2,'0')}`);return `<tr><td>${i+1}월</td><td class="num optional-detail">${money(x.tuition)}</td><td class="num optional-detail">${money(x.other)}</td><td class="num amount-income">${money(x.income)}</td><td class="num amount-expense">${money(x.expense)}</td><td class="num ${x.profit<0?'profit-negative':''}">${money(x.profit)}</td></tr>`}).join('');
}
function ledgerRow(row){const memo=parsePaymentMemo(row.memo),detail=[memo.payment!=='기타'&&row.entry_type==='expense'?memo.payment:'',memo.memo].filter(Boolean).join(' · ');return `<tr><td>${row.entry_date}</td><td>${row.entry_type==='income'?'수입':'지출'}</td><td>${categoryLabel[row.category]||escapeHtml(row.category)}</td><td>${escapeHtml(row.title)}${detail?`<br><small>${escapeHtml(detail)}</small>`:''}</td><td class="num ${row.entry_type==='income'?'amount-income':'amount-expense'}">${row.entry_type==='income'?'+':'−'} ${money(row.amount)}</td><td>${rowActions(row.id)}</td></tr>`}
function rowActions(id){return `<div class="row-actions"><button data-action="edit" data-id="${id}">수정</button><button class="delete" data-action="delete" data-id="${id}">삭제</button></div>`}
function escapeHtml(v){return String(v||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

async function saveForm(event,type){
  event.preventDefault();const id=$(`${type}Id`).value;
  const payload={entry_date:$(`${type}Date`).value,entry_type:type,category:$(`${type}Category`).value,title:$(`${type}Title`).value.trim(),amount:Number($(`${type}Amount`).value),memo:$(`${type}Memo`).value.trim()||null,updated_at:new Date().toISOString()};
  if(!payload.entry_date||!payload.title||!Number.isFinite(payload.amount)||payload.amount<=0)return alert('날짜·내용·금액을 정확히 입력해주세요.');
  await persistEntry(event.submitter,id,payload,()=>resetForm(type));
}

function renderFixedExpenses(monthRows){
  $('fixedExpenseRows').innerHTML=fixedExpenseDefinitions.map(def=>{
    const row=monthRows.find(x=>x.category===def.category),date=row?.entry_date||`${state.month}-${String(def.day).padStart(2,'0')}`;
    return `<div class="fixed-expense-item" data-category="${def.category}" data-id="${row?.id||''}"><strong>${def.title}</strong><label>실제 지급일<input data-field="date" type="date" value="${date}"></label><label>금액<input data-field="amount" type="number" inputmode="numeric" min="1" step="1" value="${row?.amount||''}" placeholder="금액 입력"></label><button data-action="save-fixed" type="button">${row?'수정 저장':'저장'}</button><span class="fixed-save-state">${row?'저장됨':''}</span></div>`;
  }).join('');
}

async function saveFixedExpense(event){
  const button=event.target.closest('button[data-action="save-fixed"]');if(!button)return;
  const box=button.closest('.fixed-expense-item'),category=box.dataset.category,def=fixedExpenseDefinitions.find(x=>x.category===category);
  const entryDate=box.querySelector('[data-field="date"]').value,amount=Number(box.querySelector('[data-field="amount"]').value),saved=box.querySelector('.fixed-save-state');
  if(!entryDate||entryDate.slice(0,7)!==state.month)return alert('현재 조회 중인 월의 지급일을 선택해주세요.');
  if(!Number.isFinite(amount)||amount<=0)return alert('금액을 정확히 입력해주세요.');
  button.disabled=true;button.textContent='저장 중…';saved.textContent='';
  try{
    const payload={entry_date:entryDate,entry_type:'expense',category,title:def.title,amount,updated_at:new Date().toISOString()};let result;
    if(box.dataset.id)result=await state.db.from('kmt_management_entries').update(payload).eq('id',box.dataset.id).select('id').single();
    else result=await state.db.from('kmt_management_entries').insert({...payload,created_by:state.user.id}).select('id').single();
    if(result.error)throw result.error;await reload();
  }catch(err){saved.textContent='저장 실패';showError(`고정 지출 저장 실패: ${err.message}`);button.disabled=false;button.textContent=box.dataset.id?'수정 저장':'저장'}
}

function toggleCustomForm(type,open){const form=$(type==='otherFixed'?'otherFixedForm':'regularForm'),button=$(type==='otherFixed'?'toggleOtherFixed':'toggleRegular'),willOpen=open??form.hidden;form.hidden=!willOpen;button.setAttribute('aria-expanded',String(willOpen));if(willOpen){const date=$(type==='otherFixed'?'otherFixedDate':'regularDate');if(!date.value)date.value=defaultDate();form.scrollIntoView({behavior:'smooth',block:'center'})}}
function closeCustomForm(type){const form=$(type==='otherFixed'?'otherFixedForm':'regularForm');form.reset();$(type==='otherFixed'?'otherFixedId':'regularId').value='';$(type==='otherFixed'?'otherFixedDate':'regularDate').value=defaultDate();if(type==='regular')toggleRegularDirect();form.querySelector('.primary').textContent='저장';toggleCustomForm(type,false)}
function resetAllOpenForms(){resetForm('income');resetForm('expense');closeCustomForm('otherFixed');closeCustomForm('regular');setDefaults()}
function toggleRegularDirect(){$('regularDirectWrap').hidden=$('regularCategory').value!=='direct';$('regularDirect').required=$('regularCategory').value==='direct'}

async function saveCustomExpense(event,type){
  event.preventDefault();const isFixed=type==='otherFixed',prefix=isFixed?'otherFixed':'regular',id=$(`${prefix}Id`).value;
  const title=isFixed?$('otherFixedTitle').value.trim():($('regularCategory').value==='direct'?$('regularDirect').value.trim():$('regularCategory').value);
  const payload={entry_date:$(`${prefix}Date`).value,entry_type:'expense',category:isFixed?'other_fixed_expense':'regular_expense',title,amount:Number($(`${prefix}Amount`).value),memo:paymentMemo($(`${prefix}Payment`).value,$(`${prefix}Memo`).value.trim()),updated_at:new Date().toISOString()};
  if(!payload.entry_date||payload.entry_date.slice(0,7)!==state.month)return alert('현재 조회 중인 월의 날짜를 선택해주세요.');
  if(!payload.title||!Number.isFinite(payload.amount)||payload.amount<=0)return alert('날짜·항목·금액을 정확히 입력해주세요.');
  await persistEntry(event.submitter,id,payload,()=>closeCustomForm(type));
}

async function persistEntry(button,id,payload,onSuccess){
  const original=button.textContent;button.disabled=true;button.textContent='저장 중…';
  try{
    let result;if(id)result=await state.db.from('kmt_management_entries').update(payload).eq('id',id).select('id').single();
    else result=await state.db.from('kmt_management_entries').insert({...payload,created_by:state.user.id}).select('id').single();
    if(result.error)throw result.error;state.month=payload.entry_date.slice(0,7);$('monthPicker').value=state.month;onSuccess();await reload();
  }catch(err){showError(`저장 실패: ${err.message}`);button.disabled=false;button.textContent=original}
}

function renderCustomLists(rows){
  $('otherFixedList').innerHTML=rows.filter(r=>r.category==='other_fixed_expense').map(customListRow).join('');
  $('regularList').innerHTML=rows.filter(r=>r.category==='regular_expense').map(customListRow).join('');
}
function customListRow(row){const parsed=parsePaymentMemo(row.memo),detail=[parsed.payment,parsed.memo].filter(Boolean).join(' · ');return `<div class="entry-list-row"><time>${row.entry_date.slice(5).replace('-','/')}</time><strong>${escapeHtml(row.title)}</strong><span class="amount">${money(row.amount)}</span><small>${escapeHtml(detail)}</small>${rowActions(row.id)}</div>`}

function resetForm(type){$(`${type}Form`).reset();$(`${type}Id`).value='';$(`${type}Date`).value=defaultDate();$(`${type}Cancel`).hidden=true;const button=$(`${type}Form`).querySelector('.primary');button.textContent='저장'}
function editCustom(row,type){const prefix=type==='otherFixed'?'otherFixed':'regular',parsed=parsePaymentMemo(row.memo);$(`${prefix}Id`).value=row.id;$(`${prefix}Date`).value=row.entry_date;$(`${prefix}Amount`).value=row.amount;$(`${prefix}Payment`).value=parsed.payment;$(`${prefix}Memo`).value=parsed.memo;if(type==='otherFixed')$('otherFixedTitle').value=row.title;else if(regularOptions.includes(row.title)){$('regularCategory').value=row.title;$('regularDirect').value=''}else{$('regularCategory').value='direct';$('regularDirect').value=row.title}if(type==='regular')toggleRegularDirect();toggleCustomForm(type,true);$(type==='otherFixed'?'otherFixedForm':'regularForm').querySelector('.primary').textContent='수정 저장'}
async function handleRowAction(event){
  const button=event.target.closest('button[data-action]');if(!button)return;const row=state.entries.find(r=>r.id===button.dataset.id);if(!row)return;
  if(button.dataset.action==='edit'){
    if(row.category==='other_fixed_expense'){editCustom(row,'otherFixed');return}
    if(row.category==='regular_expense'){editCustom(row,'regular');return}
    if(fixedCategories.has(row.category)){document.querySelector(`.fixed-expense-item[data-category="${row.category}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});return}
    const type=row.entry_type;$(`${type}Id`).value=row.id;$(`${type}Date`).value=row.entry_date;$(`${type}Category`).value=row.category;$(`${type}Title`).value=row.title;$(`${type}Amount`).value=row.amount;$(`${type}Memo`).value=row.memo||'';$(`${type}Cancel`).hidden=false;$(`${type}Form`).querySelector('.primary').textContent='수정 저장';$(`${type}Form`).scrollIntoView({behavior:'smooth',block:'center'});return;
  }
  const question=row.entry_type==='expense'?`이 지출을 삭제하시겠습니까?\n“${row.title}” ${money(row.amount)}`:`“${row.title}” ${money(row.amount)} 기록을 삭제할까요?`;
  if(!confirm(question))return;
  button.disabled=true;const {error}=await state.db.from('kmt_management_entries').delete().eq('id',row.id);if(error){showError(`삭제 실패: ${error.message}`);button.disabled=false;return}await reload();
}

init().catch(err=>showError(`경영관리 SYSTEM 시작 실패: ${err.message}`));
