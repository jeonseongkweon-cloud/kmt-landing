// 계명태권도 CLASS 회비관리 SYSTEM
// MIGRATION VERIFICATION HELPER v1.0
// 장부 대조 완료 여부를 브라우저 임시기록에 함께 보관한다.
// Supabase 쓰기/미납 계산/문자발송에는 반영하지 않는다.
(function(){
  const STORAGE_KEY='kmt_tuition_migration_entry_v1';
  const MONTHS=['01','02','03','04','05','06','07','08','09'];
  const load=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return {}}};
  const save=v=>localStorage.setItem(STORAGE_KEY,JSON.stringify(v));
  function recordState(key){const db=load();return db[key]||{};}
  function isMonthComplete(box){return [...box.querySelectorAll('select[data-month]')].every(s=>s.value!=='unknown');}
  function updateBadge(box){
    const key=box.dataset.recordKey;
    const state=recordState(key);
    const badge=box.querySelector('[data-ledger-verify-badge]');
    const check=box.querySelector('[data-ledger-verified]');
    if(!badge||!check)return;
    check.checked=state.ledgerVerified===true;
    const complete=isMonthComplete(box);
    if(state.ledgerVerified===true&&complete){badge.textContent='장부대조 완료';badge.className='badge ok';}
    else if(state.ledgerVerified===true&&!complete){badge.textContent='대조완료 표시 · 월 미확인 남음';badge.className='badge warn';}
    else {badge.textContent='장부대조 미완료';badge.className='badge muted';}
  }
  function enhanceBox(box){
    if(box.dataset.verifyHelper==='1')return;
    box.dataset.verifyHelper='1';
    const key=box.dataset.recordKey||'';
    const body=box.querySelector('summary')?.nextElementSibling;
    if(!body)return;
    const panel=document.createElement('div');
    panel.className='card';
    panel.style.cssText='padding:10px;margin-top:10px;display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap';
    panel.innerHTML='<label style="display:flex;gap:8px;align-items:center;font-weight:800"><input type="checkbox" data-ledger-verified> 수기·엑셀 장부 대조 완료</label><span data-ledger-verify-badge class="badge muted">장부대조 미완료</span>';
    body.appendChild(panel);
    const check=panel.querySelector('[data-ledger-verified]');
    check.onchange=()=>{
      const db=load();
      db[key]=db[key]||{months:{}};
      db[key].ledgerVerified=check.checked;
      db[key].ledgerVerifiedAt=check.checked?new Date().toISOString():null;
      save(db);
      updateBadge(box);
    };
    box.querySelectorAll('select[data-month]').forEach(sel=>sel.addEventListener('change',()=>updateBadge(box)));
    updateBadge(box);
  }
  function enhance(){document.querySelectorAll('#migrationEntryModal [data-record-key]').forEach(enhanceBox);}
  function refreshTop(){
    const modal=document.getElementById('migrationEntryModal');if(!modal||modal.hidden)return;
    const boxes=[...modal.querySelectorAll('[data-record-key]')];
    const verified=boxes.filter(b=>recordState(b.dataset.recordKey).ledgerVerified===true).length;
    const complete=boxes.filter(b=>recordState(b.dataset.recordKey).ledgerVerified===true&&isMonthComplete(b)).length;
    let el=document.getElementById('migrationVerificationSummary');
    if(!el){
      el=document.createElement('div');el.id='migrationVerificationSummary';el.className='card info';el.style.cssText='padding:10px;margin-top:10px';
      const search=document.getElementById('migrationEntrySearch');if(search)search.parentElement.insertAdjacentElement('afterend',el);
    }
    el.innerHTML=`<b>장부대조 진행</b> <span class="mini">· 대조완료 ${verified}/${boxes.length} · 월까지 완전확정 ${complete}/${boxes.length}</span>`;
  }
  function run(){enhance();refreshTop();}
  document.addEventListener('click',e=>{
    if(e.target?.id==='openMigrationEntry')setTimeout(run,80);
    if(e.target?.closest?.('#migrationEntryModal summary'))setTimeout(run,0);
    if(e.target?.id==='migrationEntrySave')setTimeout(run,20);
  });
  document.addEventListener('change',e=>{if(e.target?.matches?.('#migrationEntryModal select[data-month],#migrationEntryModal [data-ledger-verified]'))setTimeout(refreshTop,0);});
  const obs=new MutationObserver(()=>{const m=document.getElementById('migrationEntryModal');if(m&&!m.hidden)run();});
  if(document.body)obs.observe(document.body,{childList:true,subtree:true});
  else document.addEventListener('DOMContentLoaded',()=>obs.observe(document.body,{childList:true,subtree:true}));
})();
