// 계명태권도 CLASS 회비관리 SYSTEM
// MIGRATION BULK HELPER v1.1
// 2026 등록월 이전의 '미확인' 월만 납부대상아님으로 일괄 제안한다.
// 자동저장/Supabase 쓰기/미납 계산/문자발송 없음.
(function(){
  const proposed=new Map();
  function audit(){ return window.KMT_TUITION_MIGRATION_AUDIT || {}; }
  function joinedMonth(name){
    const j=(audit().currentGapEvidence||{})[name]?.joined;
    if(!j || !String(j).startsWith('2026-')) return null;
    const m=Number(String(j).slice(5,7));
    return Number.isFinite(m)?m:null;
  }
  function namesFromBox(box){
    const text=(box.querySelector('summary')?.textContent||'').split('·').map(x=>x.trim());
    const known=new Set(Object.keys(audit().currentGapEvidence||{}));
    const names=text.filter(x=>known.has(x));
    if(names.length) return names;
    const raw=(box.querySelector('summary')?.textContent||'').split('·')[0].trim();
    return raw.split(/[,]/).map(x=>x.trim()).filter(Boolean);
  }
  function minRegMonth(box){
    const ms=namesFromBox(box).map(joinedMonth).filter(Boolean);
    return ms.length?Math.min(...ms):null;
  }
  function refreshStatus(modal){
    let el=document.getElementById('migrationBulkStatus');
    if(!el) return;
    let cells=0;
    proposed.forEach(v=>cells+=v.length);
    el.textContent=cells?`현재 화면 제안 ${cells}개 월 · 아직 저장 안 됨`:'아직 적용된 일괄 제안 없음';
  }
  function applyBulk(modal){
    proposed.clear();
    let changed=0, records=0;
    modal.querySelectorAll('[data-record-key]').forEach(box=>{
      const m=minRegMonth(box); if(!m) return;
      const touched=[];
      box.querySelectorAll('select[data-month]').forEach(sel=>{
        const month=Number(sel.dataset.month);
        if(month<m && sel.value==='unknown'){
          sel.value='exempt';
          sel.dataset.bulkProposed='1';
          touched.push(sel);
          changed++;
        }
      });
      if(touched.length){ proposed.set(box.dataset.recordKey,touched); records++; }
    });
    refreshStatus(modal);
    alert(changed
      ? `${records}개 기록의 등록 이전 ${changed}개 월을 ‘납부대상아님’으로 화면에만 제안했습니다.\n장부와 대조한 뒤 맞으면 ‘현재 입력 임시저장’을 눌러주세요.\n잘못 제안된 경우 ‘일괄 제안 되돌리기’로 원상복구할 수 있습니다.`
      : '새로 제안할 등록 이전 미확인 월이 없습니다.');
  }
  function undoBulk(modal){
    let reverted=0;
    proposed.forEach(list=>list.forEach(sel=>{
      if(sel?.isConnected && sel.dataset.bulkProposed==='1' && sel.value==='exempt'){
        sel.value='unknown'; reverted++;
      }
      if(sel) delete sel.dataset.bulkProposed;
    }));
    proposed.clear();
    refreshStatus(modal);
    alert(reverted?`${reverted}개 월의 일괄 제안을 미확인으로 되돌렸습니다.`:'되돌릴 일괄 제안이 없습니다.');
  }
  function inject(){
    const modal=document.getElementById('migrationEntryModal');
    if(!modal || modal.hidden) return;
    if(document.getElementById('migrationBulkExempt')) return;
    const search=document.getElementById('migrationEntrySearch');
    if(!search) return;
    proposed.clear();
    const bar=document.createElement('div');
    bar.className='toolbar';
    bar.style.marginTop='8px';
    bar.innerHTML='<button type="button" class="btn" id="migrationBulkExempt">2026 등록 전월 사선 일괄 제안</button><button type="button" class="btn" id="migrationBulkUndo">일괄 제안 되돌리기</button><span id="migrationBulkStatus" class="mini" style="align-self:center">아직 적용된 일괄 제안 없음</span>';
    search.parentElement.insertAdjacentElement('afterend',bar);
    document.getElementById('migrationBulkExempt').onclick=()=>applyBulk(modal);
    document.getElementById('migrationBulkUndo').onclick=()=>undoBulk(modal);
    const saveBtn=document.getElementById('migrationEntrySave');
    if(saveBtn) saveBtn.addEventListener('click',()=>{ proposed.clear(); setTimeout(()=>refreshStatus(modal),0); });
  }
  const obs=new MutationObserver(()=>setTimeout(inject,0));
  obs.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  document.addEventListener('click',e=>{ if(e.target?.id==='openMigrationEntry') setTimeout(inject,60); });
})();
