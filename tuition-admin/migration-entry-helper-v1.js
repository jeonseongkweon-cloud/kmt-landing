// 계명태권도 CLASS 회비관리 SYSTEM
// MIGRATION ENTRY HELPER v1.0
// 이관 입력판 편의 기능. 화면 제안만 하며 자동 저장/Supabase/미납/문자에는 반영하지 않는다.
(function(){
  const audit=()=>window.KMT_TUITION_MIGRATION_AUDIT||{};
  const evidence=name=>(audit().currentGapEvidence||{})[name]||{};
  const membersFromKey=key=>String(key||'').startsWith('가정:')?String(key).slice(3).split('·').filter(Boolean):[String(key||'')];
  function joinedMonths(members){
    return members.map(n=>evidence(n).joined).filter(v=>v&&String(v).startsWith('2026-')).map(v=>Number(String(v).slice(5,7))).filter(n=>n>=1&&n<=12);
  }
  function dueDays(members){
    return [...new Set(members.map(n=>Number(evidence(n).feeDueDay)).filter(n=>n>=1&&n<=31))].sort((a,b)=>a-b);
  }
  function enhanceBox(box){
    if(box.dataset.migrationHelper==='1')return;
    box.dataset.migrationHelper='1';
    const key=box.dataset.recordKey||'';
    const members=membersFromKey(key);
    const body=box.querySelector('summary')?.nextElementSibling;
    if(!body)return;
    const days=dueDays(members);
    if(members.length>1&&days.length>1){
      const warn=document.createElement('div');
      warn.className='card warn';
      warn.style.cssText='padding:10px;margin:0 0 10px';
      warn.innerHTML=`<div class="mini"><b>⚠ 가정 납부일 확인</b> · 구성원 자료의 납부일이 ${days.map(d=>d+'일').join(' / ')}로 다릅니다. 가정의 실제 기준 납부일을 직접 확정해 주세요.</div>`;
      body.insertBefore(warn,body.firstChild);
    }
    const months=joinedMonths(members);
    if(!months.length)return;
    const firstMonth=Math.min(...months);
    if(firstMonth<=1)return;
    const bar=document.createElement('div');
    bar.className='toolbar';
    bar.style.margin='4px 0 10px';
    const btn=document.createElement('button');
    btn.type='button';btn.className='btn';
    btn.textContent=`등록 전월(${firstMonth-1}개월) 사선 제안 적용`;
    const note=document.createElement('span');
    note.className='mini';note.style.alignSelf='center';
    note.textContent='미확인 칸만 화면에서 바꿉니다. 자동저장하지 않습니다.';
    btn.onclick=()=>{
      if(!confirm(`등록정보 기준으로 1월~${firstMonth-1}월의 '미확인' 칸만 '납부대상아님'으로 표시할까요?\n\n장부와 실제 등록시점이 다를 수 있으므로 적용 후 반드시 확인해 주세요.`))return;
      let changed=0;
      box.querySelectorAll('[data-month]').forEach(sel=>{
        const m=Number(sel.dataset.month);
        if(m<firstMonth&&sel.value==='unknown'){sel.value='exempt';changed++;}
      });
      note.textContent=`${changed}개 월을 화면에 제안 적용했습니다. 확인 후 아래 '현재 입력 임시저장'을 눌러야 저장됩니다.`;
    };
    bar.append(btn,note);
    const monthStrip=body.querySelector('[data-month]')?.parentElement?.parentElement;
    if(monthStrip) body.insertBefore(bar,monthStrip); else body.appendChild(bar);
  }
  function enhance(){document.querySelectorAll('#migrationEntryModal [data-record-key]').forEach(enhanceBox);}
  document.addEventListener('click',e=>{
    if(e.target&&e.target.id==='openMigrationEntry')setTimeout(enhance,60);
    if(e.target&&e.target.closest&&e.target.closest('#migrationEntryModal summary'))setTimeout(enhance,0);
  });
  const obs=new MutationObserver(()=>{const m=document.getElementById('migrationEntryModal');if(m&&!m.hidden)enhance();});
  if(document.body)obs.observe(document.body,{childList:true,subtree:true});
  else document.addEventListener('DOMContentLoaded',()=>obs.observe(document.body,{childList:true,subtree:true}));
})();
