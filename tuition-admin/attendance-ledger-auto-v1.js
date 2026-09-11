// 계명태권도 CLASS 회비관리 SYSTEM
// ATTENDANCE LEDGER AUTO v1.0
// 출석부(재원생)에는 있으나 기존 2026 회비대장에 없는 가정을 자동으로 표에 보완한다.
(function(){
  const LEDGER_KEY='kmt_tuition_ledger_grid_edits_v1';
  const DUE_KEY='kmt_tuition_ledger_due_edits_v1';
  let autoRows=[];
  let attendanceNames=new Set();
  let busy=false;

  const norm=s=>String(s||'').replace(/\s/g,'');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const load=k=>{try{return JSON.parse(localStorage.getItem(k)||'{}')}catch{return {}}};
  const rowKey=h=>norm(h.name || (h.students||[]).join(','));
  const studentsKey=h=>(h.students||[]).join('+');
  const dueOf=h=>{
    const d=load(DUE_KEY);
    return Number(d[rowKey(h)] ?? d[h.name] ?? h.dueDay ?? 1);
  };
  const editValue=(h,m,field)=>{
    const db=load(LEDGER_KEY);
    const key=`${studentsKey(h)}|${m}|${field}`;
    return Object.prototype.hasOwnProperty.call(db,key)?db[key]:'';
  };

  function isAttendanceHousehold(h){
    return h && h.status==='active' && (h.students||[]).some(n=>attendanceNames.has(n));
  }

  function buildMissing(households){
    autoRows=(households||[])
      .filter(isAttendanceHousehold)
      .filter(h=>!(h.legacyLedger||[]).length)
      .sort((a,b)=>(a.students?.[0]||a.name||'').localeCompare(b.students?.[0]||b.name||'','ko'));
    window.KMT_TUITION_AUTO_LEDGER_ROWS=autoRows;
  }

  function makeRow(h,no){
    const students=h.students||[h.name];
    return `<tr data-auto-ledger="1" data-household-key="${esc(rowKey(h))}" data-students="${esc(students.join(', '))}">
      <td class="lg-no">${no}</td>
      <td class="lg-name"><b>${esc(h.name||students.join(' · '))} <small style="color:#2563eb">자동</small></b><span>납부일 ${dueOf(h)}일</span><button type="button" class="btn ledger-due-edit-btn">납부일 변경</button></td>
      ${Array.from({length:12},(_,m)=>{
        const ek=`${studentsKey(h)}|${m}|entry`, ak=`${studentsKey(h)}|${m}|amount`;
        return `<td class="lg-month" data-month="${m}"><input data-k="${esc(ek)}" value="${esc(editValue(h,m,'entry'))}" placeholder="-"><input class="lg-amount" data-k="${esc(ak)}" value="${esc(editValue(h,m,'amount'))}" placeholder="금액"><button type="button" class="ledger-month-edit-btn" title="${m+1}월 회비 입력/수정">수정</button></td>`;
      }).join('')}
    </tr>`;
  }

  function bindInputs(root){
    root.querySelectorAll('tr[data-auto-ledger="1"] input[data-k]').forEach(i=>{
      i.onchange=()=>{
        const db=load(LEDGER_KEY); db[i.dataset.k]=i.value.trim(); localStorage.setItem(LEDGER_KEY,JSON.stringify(db));
      };
    });
  }

  function enhance(){
    if(busy || !autoRows.length) return;
    const body=document.getElementById('ledgerGridBody');
    const count=document.getElementById('ledgerGridCount');
    const search=document.getElementById('ledgerGridSearch');
    if(!body||!count||!search) return;
    busy=true;
    try{
      body.querySelectorAll('tr[data-auto-ledger="1"]').forEach(r=>r.remove());
      const q=norm(search.value).toLowerCase();
      const m=count.textContent.match(/(\d+)가정\s*·\s*(\d+)\/(\d+)페이지/);
      const baseTotal=m?Number(m[1]):body.querySelectorAll('tr').length;
      const page=m?Number(m[2]):1;
      const pages=m?Number(m[3]):1;
      let list=[];
      if(q){
        list=autoRows.filter(h=>norm([h.name,...(h.students||[])].join('')).toLowerCase().includes(q));
      }else if(page===pages){
        list=autoRows;
      }
      if(list.length){
        const start=q?body.querySelectorAll('tr').length+1:baseTotal+1;
        body.insertAdjacentHTML('beforeend',list.map((h,i)=>makeRow(h,start+i)).join(''));
        bindInputs(body);
      }
      if(!q){
        count.textContent=`${baseTotal+autoRows.length}가정 · ${page}/${pages}페이지 · 출석부 자동연동 ${autoRows.length}가정`;
      }else if(list.length){
        count.textContent=`검색결과 ${body.querySelectorAll('tr').length}가정 · 출석부 자동연동 포함`;
      }
      const note=document.querySelector('#ledgerGridCard .ledger-note');
      if(note && !note.dataset.attendanceAuto){
        note.dataset.attendanceAuto='1';
        note.textContent='※ 기존 회비대장 + 현재 출석부 재원생을 함께 표시합니다. 출석부에 새 원생을 등록하면 회비관리에도 자동으로 추가됩니다.';
      }
    }finally{busy=false;}
  }

  function schedule(){setTimeout(enhance,0)}

  window.addEventListener('kmt:tuition-households',e=>{
    attendanceNames=new Set(e.detail?.attendanceNames||[]);
    buildMissing(e.detail?.households||[]);
    schedule();
  });

  function mount(){
    const body=document.getElementById('ledgerGridBody');
    if(!body){setTimeout(mount,120);return;}
    const obs=new MutationObserver(()=>schedule());
    obs.observe(body,{childList:true});
    document.getElementById('ledgerGridSearch')?.addEventListener('input',()=>setTimeout(enhance,0));
    document.getElementById('ledgerGridPages')?.addEventListener('click',()=>setTimeout(enhance,20));
    document.getElementById('ledgerSortBar')?.addEventListener('click',()=>setTimeout(enhance,20));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount,{once:true}); else mount();
})();
