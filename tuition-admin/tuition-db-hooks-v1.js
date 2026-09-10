// 계명태권도 CLASS 회비관리 SYSTEM
// localStorage 저장 성공 후 GLOBAL-CORE에도 같은 내용을 영구저장한다.
// DB 실패 시 기존 브라우저 저장은 유지하고 사용자에게 알린다.
(function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function db(){
    for(let i=0;i<30;i++){
      if(window.KMTTuitionDB) return window.KMTTuitionDB;
      await sleep(100);
    }
    throw new Error('GLOBAL-CORE 연결 모듈이 준비되지 않았습니다.');
  }
  function dueFromVisible(students){
    const rows=[...document.querySelectorAll('#ledgerGridBody tr')];
    const norm=s=>String(s||'').replace(/\s/g,'');
    const target=norm(students);
    const row=rows.find(r=>norm(r.dataset.students||r.querySelector('.lg-name b')?.textContent)===target || target.includes(norm(r.querySelector('.lg-name b')?.textContent)));
    const m=(row?.querySelector('.lg-name span')?.textContent||'').match(/(\d+)일/);
    return m?Number(m[1]):1;
  }
  function showResult(ok,msg){
    let el=document.getElementById('tuitionDbSaveStatus');
    if(!el){
      el=document.createElement('div');el.id='tuitionDbSaveStatus';
      el.style.cssText='position:fixed;right:18px;bottom:18px;z-index:2000;padding:11px 14px;border-radius:12px;font-weight:800;box-shadow:0 8px 24px #0002;background:#fff;border:1px solid #ddd';
      document.body.appendChild(el);
    }
    el.textContent=(ok?'✓ ':'⚠ ')+msg;
    el.style.background=ok?'#e8f7ee':'#fff7df';
    clearTimeout(el._t);el._t=setTimeout(()=>el.remove(),3500);
  }

  document.addEventListener('submit',async e=>{
    if(e.target?.id==='ledgerDueForm'){
      const students=(document.getElementById('ledgerDueHousehold')?.textContent||'').split('/').slice(1).join('/').trim();
      const display=(document.getElementById('ledgerDueHousehold')?.textContent||'').split('/')[0].trim();
      const oldDue=parseInt(document.getElementById('ledgerDueCurrent')?.textContent||'',10)||null;
      const dueDay=parseInt(document.getElementById('ledgerDueNew')?.value||'',10);
      const reason=document.getElementById('ledgerDueReason')?.value||'';
      const memo=document.getElementById('ledgerDueMemo')?.value||'';
      setTimeout(async()=>{
        try{const api=await db();await api.saveDue({students,dueDay,oldDueDay:oldDue,reason,memo,display});showResult(true,'납부일을 GLOBAL-CORE에 영구저장했습니다.');}
        catch(err){console.error('[TUITION DB] due save failed',err);showResult(false,'브라우저에는 저장됐지만 서버 저장은 실패했습니다.');}
      },0);
    }
    if(e.target?.id==='ledgerMonthForm'){
      const students=document.getElementById('ledgerMonthStudents')?.value||'';
      const display=(document.getElementById('ledgerMonthHousehold')?.value||'').split('/')[0].trim();
      const month=(parseInt(document.getElementById('ledgerMonthApplied')?.value||'0',10)+1);
      const paidOn=document.getElementById('ledgerMonthPaidOn')?.value||'';
      const amountText=document.getElementById('ledgerMonthAmount')?.value||'';
      const method=document.getElementById('ledgerMonthMethod')?.value||'';
      const status=document.getElementById('ledgerMonthStatus')?.value||'미확인';
      const memo=document.getElementById('ledgerMonthMemo')?.value||'';
      const dueDay=dueFromVisible(students);
      setTimeout(async()=>{
        try{const api=await db();await api.saveMonth({students,dueDay,display,month,paidOn,amountText,method,status,memo});showResult(true,`${month}월 회비를 GLOBAL-CORE에 영구저장했습니다.`);}
        catch(err){console.error('[TUITION DB] month save failed',err);showResult(false,'브라우저에는 저장됐지만 서버 저장은 실패했습니다.');}
      },0);
    }
  },true);
})();
