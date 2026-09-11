// 계명태권도 CLASS 회비관리 SYSTEM
// QUICK STATUS v1.1 — 성능 안전화
// 회비관리 화면에서 재원/휴원/퇴관을 직접 선택한다.
// 현재 단계에서는 CLASS/Supabase 원생상태를 수정하지 않고 이 브라우저에 회비관리 상태만 보존한다.
(function(){
  const KEY='kmt_tuition_quick_status_v1';
  let applying=false;
  let enhanceTimer=null;
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
  const save=v=>localStorage.setItem(KEY,JSON.stringify(v));
  const labelToStatus=t=>t.includes('휴원')?'paused':t.includes('퇴관')?'withdrawn':'active';
  const currentStatus=row=>labelToStatus(row.querySelector('.badge')?.textContent||'');
  const householdName=row=>(row.querySelector('strong')?.textContent||'').trim();

  function scheduleEnhance(delay=40){
    clearTimeout(enhanceTimer);
    enhanceTimer=setTimeout(()=>{
      enhanceTimer=null;
      enhance();
    },delay);
  }

  function openAndApply(row,status,quiet){
    const open=row.querySelector('[data-open]');
    if(!open)return false;
    applying=true;
    open.click();
    setTimeout(()=>{
      const st=document.getElementById('openStatus');
      if(!st){applying=false;return;}
      st.click();
      setTimeout(()=>{
        const choice=document.querySelector(`[data-status-choice="${status}"]`);
        if(choice) choice.click();
        applying=false;
        if(!quiet) scheduleEnhance(60);
      },0);
    },0);
    return true;
  }

  function addSelector(row){
    if(row.dataset.quickStatus==='1')return;
    const open=row.querySelector('[data-open]');
    if(!open)return;
    row.dataset.quickStatus='1';
    const name=householdName(row),now=currentStatus(row);
    const sel=document.createElement('select');
    sel.className='btn';
    sel.dataset.quickStatusSelect='1';
    sel.setAttribute('aria-label',`${name} 회비관리 상태`);
    sel.innerHTML='<option value="active">🟢 재원</option><option value="paused">🔵 휴원</option><option value="withdrawn">⚪ 퇴관</option>';
    sel.value=now;
    sel.title='회비관리 페이지에서만 상태를 변경합니다. 과거 회비자료는 삭제하지 않습니다.';
    sel.onchange=()=>{
      const next=sel.value;
      const msg=next==='withdrawn'
        ? `${name} 가정을 퇴관으로 표시할까요?\n과거 회비자료는 보존되며 미납·문자 대상에서 제외됩니다.`
        : next==='paused'
          ? `${name} 가정을 휴원으로 표시할까요?\n휴원 중에는 미납·문자 대상에서 제외됩니다.`
          : `${name} 가정을 재원으로 변경할까요?`;
      if(!confirm(msg)){sel.value=currentStatus(row);return;}
      const db=load();
      db[name]={status:next,updatedAt:new Date().toISOString()};
      save(db);
      openAndApply(row,next,false);
    };
    open.parentElement?.insertBefore(sel,open);
  }

  function applyStored(rows){
    if(applying)return;
    const db=load();
    for(const row of rows){
      const name=householdName(row),saved=db[name]?.status;
      if(saved&&saved!==currentStatus(row)){
        openAndApply(row,saved,true);
        return;
      }
    }
  }

  function enhance(){
    if(applying)return;
    const rows=[...document.querySelectorAll('#householdRows .row')];
    if(!rows.length)return;
    rows.forEach(addSelector);
    applyStored(rows);
  }

  function mount(){
    const root=document.getElementById('householdRows');
    if(!root)return;
    // 기존 body 전체 감시는 회비대장/이관 UI의 대량 DOM 변경까지 모두 받아
    // 수백 개의 타이머를 만들 수 있었다. 가정목록만 감시하고 디바운스한다.
    const obs=new MutationObserver(()=>scheduleEnhance(50));
    obs.observe(root,{childList:true,subtree:true});
    scheduleEnhance(120);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();

// 회비관리 상단 빠른 복귀 버튼
(function(){
  function mountClassReturnButtons(){
    if(document.getElementById('tuitionClassReturnNav')) return;
    const head=document.querySelector('.top .head');
    if(!head) return;
    const oldRight=head.querySelector('.mini');
    const nav=document.createElement('div');
    nav.id='tuitionClassReturnNav';
    nav.style.display='flex';
    nav.style.gap='8px';
    nav.style.alignItems='center';
    nav.style.flexWrap='wrap';
    nav.innerHTML=`
      <a href="../class/admin/" class="btn" style="text-decoration:none;display:inline-flex;align-items:center;gap:5px">👥 원생관리</a>
      <a href="../class/attendance/" class="btn" style="text-decoration:none;display:inline-flex;align-items:center;gap:5px">✅ 출석</a>
    `;
    if(oldRight){
      const box=document.createElement('div');
      box.style.display='flex';
      box.style.flexDirection='column';
      box.style.alignItems='flex-end';
      box.style.gap='6px';
      oldRight.parentNode.insertBefore(box,oldRight);
      box.appendChild(nav);
      box.appendChild(oldRight);
    }else{
      head.appendChild(nav);
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mountClassReturnButtons,{once:true});
  else mountClassReturnButtons();
})();

// payer-alias-v1.js는 index.html에서 한 번만 명시적으로 로드한다.
// QUICK STATUS가 같은 스크립트를 다시 삽입하면 중복 이벤트/렌더링이 생길 수 있으므로 재삽입하지 않는다.
