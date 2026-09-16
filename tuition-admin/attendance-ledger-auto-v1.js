// 계명태권도 CLASS 회비관리 SYSTEM
// ATTENDANCE LEDGER AUTO v1.0
// 출석부(재원생)에는 있으나 기존 2026 회비대장에 없는 가정을 자동으로 표에 보완한다.
(function(){
  const LEDGER_KEY='kmt_tuition_ledger_grid_edits_v1';
  const DUE_KEY='kmt_tuition_ledger_due_edits_v1';
  let autoRows=[];
  let attendanceNames=new Set();

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
    window.KMTTuitionLedger?.setAutoRows(autoRows);
  }

  window.addEventListener('kmt:tuition-households',e=>{
    attendanceNames=new Set(e.detail?.attendanceNames||[]);
    buildMissing(e.detail?.households||[]);
    window.KMTTuitionLedger?.setAutoRows(autoRows);
  });

  function mount(){
    if(!window.KMTTuitionLedger){setTimeout(mount,120);return;}
    window.KMTTuitionLedger.setAutoRows(autoRows);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount,{once:true}); else mount();
})();
