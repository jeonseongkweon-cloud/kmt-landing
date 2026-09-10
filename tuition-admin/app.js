const today = new Date('2026-09-10T09:00:00+09:00');

const demoHouseholds = [
  {id:'h1',name:'김민규 · 김나라',students:['김민규','김나라'],parents:['박지영','김성호'],payers:['박*영','김*호'],dueDay:19,status:'active',payments:{'2026-08':{paidOn:'2026-08-19',amount:280000,method:'울산페이'}},messages:[]},
  {id:'h2',name:'박윤아',students:['박윤아'],parents:['이정희'],payers:['이*희'],dueDay:2,status:'active',payments:{'2026-07':{paidOn:'2026-07-02',amount:145000,method:'카드'}},messages:[{sentOn:'2026-09-08'}]},
  {id:'h3',name:'황찬규',students:['황찬규'],parents:['황정수'],payers:['황*수'],dueDay:23,status:'active',payments:{'2026-06':{paidOn:'2026-06-23',amount:165000,method:'계좌'}},messages:[]},
  {id:'h4',name:'이서준',students:['이서준'],parents:['최은영'],payers:['최*영'],dueDay:12,status:'active',payments:{'2026-08':{paidOn:'2026-08-12',amount:165000,method:'현금'}},messages:[]},
  {id:'h5',name:'최민호',students:['최민호'],parents:['최성호'],payers:['최*호'],dueDay:5,status:'leave',payments:{'2026-08':{paidOn:'2026-08-05',amount:165000,method:'울산페이'}},messages:[]}
];

const state = {households: demoHouseholds, filter:'all', sort:'due', query:''};
const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

function ym(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function firstOfMonth(d){return new Date(d.getFullYear(),d.getMonth(),1)}
function monthDiff(a,b){return (b.getFullYear()-a.getFullYear())*12+(b.getMonth()-a.getMonth())}
function dueDateFor(monthDate,dueDay){
  const y=monthDate.getFullYear(),m=monthDate.getMonth();
  const last=new Date(y,m+1,0).getDate();
  return new Date(y,m,Math.min(dueDay,last),23,59,59);
}
function overdueMonths(h){
  if(h.status!=='active') return [];
  const months=[];
  for(let offset=5;offset>=0;offset--){
    const m=new Date(today.getFullYear(),today.getMonth()-offset,1);
    const key=ym(m); const due=dueDateFor(m,h.dueDay);
    if(due < today && !h.payments[key]) months.push(key);
  }
  return months;
}
function daysAfterDue(h){
  const m=firstOfMonth(today); const due=dueDateFor(m,h.dueDay);
  return Math.floor((today-due)/86400000);
}
function statusOf(h){
  if(h.status==='leave') return {kind:'info',label:'휴원'};
  if(h.status==='travel') return {kind:'info',label:'여행'};
  if(h.status==='withdrawn') return {kind:'muted',label:'퇴관'};
  const miss=overdueMonths(h);
  if(miss.length) return {kind:'bad',label:`${miss.length}회 미납`,miss};
  const d=daysAfterDue(h);
  if(d>=0) return {kind:'late',label:'납부일 경과'};
  if(d>=-3) return {kind:'warn',label:'납부 임박'};
  return {kind:'ok',label:'정상'};
}
function smsReady(h){
  const miss=overdueMonths(h); if(!miss.length) return false;
  const oldest=new Date(`${miss[0]}-01T00:00:00`); const due=dueDateFor(oldest,h.dueDay);
  return Math.floor((today-due)/86400000)>=7;
}
function money(v){return new Intl.NumberFormat('ko-KR').format(v)+'원'}

function summary(){
  const active=state.households.filter(h=>h.status==='active');
  const counts={ok:0,warn:0,late:0,bad:0,info:0};
  active.forEach(h=>counts[statusOf(h).kind]++);
  $('#sumHouseholds').textContent=state.households.length+'가정';
  $('#sumActive').textContent=active.length+'가정';
  $('#sumOk').textContent=counts.ok;
  $('#sumWarn').textContent=counts.warn;
  $('#sumLate').textContent=counts.late;
  $('#sumBad').textContent=counts.bad;
  $('#sumSms').textContent=state.households.filter(smsReady).length;
  const buckets=[1,2,3].map(n=>state.households.filter(h=>overdueMonths(h).length===n).length);
  $('#sumBadNote').textContent=`1회 ${buckets[0]} · 2회 ${buckets[1]} · 3회+ ${state.households.filter(h=>overdueMonths(h).length>=3).length}`;
}

function match(h,q){
  if(!q) return true;
  const hay=[h.name,...h.students,...h.parents,...h.payers].join(' ').replace(/\s+/g,'').toLowerCase();
  return hay.includes(q.replace(/\s+/g,'').toLowerCase());
}
function filtered(){
  let rows=state.households.filter(h=>match(h,state.query));
  if(state.filter==='bad') rows=rows.filter(h=>overdueMonths(h).length>0);
  if(state.filter==='sms') rows=rows.filter(smsReady);
  if(state.filter==='active') rows=rows.filter(h=>h.status==='active');
  if(state.sort==='name') rows.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  if(state.sort==='due') rows.sort((a,b)=>a.dueDay-b.dueDay || a.name.localeCompare(b.name,'ko'));
  if(state.sort==='bad') rows.sort((a,b)=>overdueMonths(b).length-overdueMonths(a).length || a.dueDay-b.dueDay);
  return rows;
}
function renderRows(){
  const box=$('#householdRows'); box.innerHTML='';
  filtered().forEach(h=>{
    const s=statusOf(h); const tr=document.createElement('div'); tr.className='row';
    const lastMsg=h.messages.at(-1)?.sentOn;
    const msg=smsReady(h)?(lastMsg?`💬 ${lastMsg.slice(5).replace('-','/')} 발송`:'💬 문자대상'):'-';
    tr.innerHTML=`<div><strong>${h.name}</strong><div class="mini">기준일 ${h.dueDay}일 · 결제자 ${h.payers.join(', ')||'-'}</div></div><span class="badge ${s.kind}">${s.label}</span><span>${msg}</span><button class="btn" data-open="${h.id}">상세</button>`;
    box.appendChild(tr);
  });
  if(!filtered().length) box.innerHTML='<div class="empty">검색 결과가 없습니다.</div>';
}
function renderUlsan(){
  const q=$('#ulsanInput').value.trim(); const out=$('#ulsanResult');
  if(!q){out.innerHTML='';return}
  const rows=state.households.filter(h=>match(h,q));
  if(!rows.length){out.innerHTML='<div class="mini">등록된 결제자 후보가 없습니다.</div>';return}
  out.innerHTML=rows.map(h=>`<button class="candidate" data-open="${h.id}"><strong>${h.name}</strong><span>등록 결제자 ${h.payers.join(', ')||'-'} · 기준일 ${h.dueDay}일</span></button>`).join('');
}
function openHousehold(id){
  const h=state.households.find(x=>x.id===id); if(!h)return;
  const s=statusOf(h); const miss=overdueMonths(h);
  $('#modalTitle').textContent=h.name;
  $('#modalBody').innerHTML=`
    <div class="detail-grid">
      <div><span>현재 상태</span><b class="badge ${s.kind}">${s.label}</b></div>
      <div><span>기준 납부일</span><b>매월 ${h.dueDay}일</b></div>
      <div><span>보호자</span><b>${h.parents.join(', ')||'-'}</b></div>
      <div><span>울산페이 결제자</span><b>${h.payers.join(', ')||'-'}</b></div>
    </div>
    <div class="detail-section"><strong>미납 월</strong><div>${miss.length?miss.map(x=>`<span class="month-chip bad">${x.slice(5)}월</span>`).join(' '):'없음'}</div></div>
    <div class="modal-actions"><button class="btn primary" id="demoPay">💰 회비 받음</button><button class="btn">📅 납부일 변경</button><button class="btn">💬 문자</button></div>`;
  $('#modal').hidden=false;
  $('#demoPay')?.addEventListener('click',()=>alert('다음 단계에서 실제 회비등록 폼과 Supabase 저장을 연결합니다.'));
}
function todayPayments(){
  const list=[]; state.households.forEach(h=>Object.entries(h.payments).forEach(([month,p])=>{if(p.paidOn==='2026-09-10')list.push({h,month,...p})}));
  const total=list.reduce((a,b)=>a+b.amount,0); $('#todayTotal').textContent=`${list.length}가정 · ${money(total)}`;
  $('#todayList').innerHTML=list.length?list.map(x=>`<p>${x.h.name} · ${money(x.amount)} · ${x.method}</p>`).join(''):'<p class="mini">오늘 등록된 회비가 없습니다.</p>';
}

$('#searchInput').addEventListener('input',e=>{state.query=e.target.value;renderRows()});
$('#ulsanInput').addEventListener('input',renderUlsan);
$('#ulsanFind').addEventListener('click',renderUlsan);
$$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{state.filter=b.dataset.filter;renderRows()}));
$$('[data-sort]').forEach(b=>b.addEventListener('click',()=>{state.sort=b.dataset.sort;renderRows()}));
document.addEventListener('click',e=>{const id=e.target.closest('[data-open]')?.dataset.open;if(id)openHousehold(id)});
$('#modalClose').addEventListener('click',()=>$('#modal').hidden=true);
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')$('#modal').hidden=true});

summary(); renderRows(); todayPayments();
