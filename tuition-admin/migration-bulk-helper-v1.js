// 계명태권도 CLASS 회비관리 SYSTEM
// MIGRATION BULK HELPER v1.0
// 2026 등록월 이전의 '미확인' 월만 납부대상아님으로 일괄 제안한다.
// 자동저장/Supabase 쓰기/미납 계산/문자발송 없음.
(function(){
  function audit(){ return window.KMT_TUITION_MIGRATION_AUDIT || {}; }
  function joinedMonth(name){
    const j=(audit().currentGapEvidence||{})[name]?.joined;
    if(!j || !String(j).startsWith('2026-')) return null;
    const m=Number(String(j).slice(5,7));
    return Number.isFinite(m)?m:null;
  }
  function namesFromBox(box){
    const text=(box.querySelector('summary')?.textContent||'').split('·')[0].trim();
    return text.split(/[·,]/).map(x=>x.trim()).filter(Boolean);
  }
  function minRegMonth(box){
    const ms=namesFromBox(box).map(joinedMonth).filter(Boolean);
    return ms.length?Math.min(...ms):null;
  }
  function applyBulk(modal){
    let changed=0, records=0;
    modal.querySelectorAll('[data-record-key]').forEach(box=>{
      const m=minRegMonth(box); if(!m) return;
      let local=0;
      box.querySelectorAll('select[data-month]').forEach(sel=>{
        const month=Number(sel.dataset.month);
        if(month<m && sel.value==='unknown'){
          sel.value='exempt'; local++; changed++;
        }
      });
      if(local) records++;
    });
    const msg=changed
      ? `${records}개 기록의 등록 이전 ${changed}개 월을 ‘납부대상아님’으로 화면에 제안했습니다.\n아직 저장되지 않았습니다. 확인 후 ‘현재 입력 임시저장’을 눌러주세요.`
      : '새로 제안할 등록 이전 미확인 월이 없습니다.';
    alert(msg);
  }
  function inject(){
    const modal=document.getElementById('migrationEntryModal');
    if(!modal || modal.hidden) return;
    if(document.getElementById('migrationBulkExempt')) return;
    const search=document.getElementById('migrationEntrySearch');
    if(!search) return;
    const bar=document.createElement('div');
    bar.className='toolbar';
    bar.style.marginTop='8px';
    bar.innerHTML='<button type="button" class="btn" id="migrationBulkExempt">2026 등록 전월 사선 일괄 제안</button><span class="mini" style="align-self:center">미확인 칸만 변경 · 자동저장 안 함</span>';
    search.parentElement.insertAdjacentElement('afterend',bar);
    document.getElementById('migrationBulkExempt').onclick=()=>applyBulk(modal);
  }
  const obs=new MutationObserver(()=>setTimeout(inject,0));
  obs.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  document.addEventListener('click',e=>{ if(e.target?.id==='openMigrationEntry') setTimeout(inject,60); });
})();
