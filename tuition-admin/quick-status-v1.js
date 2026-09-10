// 계명태권도 CLASS 회비관리 SYSTEM
// QUICK STATUS v1.0
// 회비관리 화면에서 재원/휴원/퇴관을 직접 선택한다.
// 현재 단계에서는 CLASS/Supabase 원생상태를 수정하지 않고 이 브라우저에 회비관리 상태만 보존한다.
(function(){
  const KEY='kmt_tuition_quick_status_v1';
  let applying=false;
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
  const save=v=>localStorage.setItem(KEY,JSON.stringify(v));
  const labelToStatus=t=>t.includes('휴원')?'paused':t.includes('퇴관')?'withdrawn':'active';
  const statusLabel=s=>s==='paused'?'휴원':s==='withdrawn'?'퇴관':'재원';
  function householdName(row){return (row.querySelector('strong')?.textContent||'').trim();}
  function currentStatus(row){return labelToStatus(row.querySelector('.badge')?.textContent||'');}
  function openAndApply(row,status,quiet){
    const open=row.querySelector('[data-open]'); if(!open)return false;
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
        if(!quiet) setTimeout(()=>enhance(),40);
      },0);
    },0);
    return true;
  }
  function addSelector(row){
    if(row.dataset.quickStatus==='1')return;
    const open=row.querySelector('[data-open]'); if(!open)return;
    row.dataset.quickStatus='1';
    const name=householdName(row),now=currentStatus(row);
    const sel=document.createElement('select');
    sel.className='btn';
    sel.dataset.quickStatusSelect='1';
    sel.setAttribute('aria-label',`${name} 회비관리 상태`);
    sel.innerHTML=`<option value="active">🟢 재원</option><option value="paused">🔵 휴원</option><option value="withdrawn">⚪ 퇴관</option>`;
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
      const db=load();db[name]={status:next,updatedAt:new Date().toISOString()};save(db);
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
        return; // 한 번에 하나씩 적용. render 후 observer가 다음 항목을 이어서 처리한다.
      }
    }
  }
  function enhance(){
    if(applying)return;
    const rows=[...document.querySelectorAll('#householdRows .row')];
    rows.forEach(addSelector);
    applyStored(rows);
  }
  const obs=new MutationObserver(()=>setTimeout(enhance,30));
  if(document.body)obs.observe(document.body,{childList:true,subtree:true});
  else document.addEventListener('DOMContentLoaded',()=>obs.observe(document.body,{childList:true,subtree:true}));
  document.addEventListener('DOMContentLoaded',()=>setTimeout(enhance,200));
  setTimeout(enhance,300);
})();
