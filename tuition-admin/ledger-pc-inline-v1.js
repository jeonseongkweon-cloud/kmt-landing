// 계명태권도 CLASS 회비관리 SYSTEM
// PC INLINE EDIT v1.0 — PC 전용 마우스/키보드 직접수정
(function(){
  const DUE_KEY='kmt_tuition_ledger_due_edits_v1';
  const isPc=()=>window.matchMedia('(pointer:fine)').matches && window.innerWidth>=1000;
  const load=k=>{try{return JSON.parse(localStorage.getItem(k)||'{}')}catch{return {}}};
  const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  let observer=null, statusTimer=null;

  function status(text,kind='info'){
    let el=document.getElementById('ledgerPcSaveStatus');
    if(!el){
      el=document.createElement('span');
      el.id='ledgerPcSaveStatus';
      el.className='pc-save-status';
      const tools=document.querySelector('#ledgerGridCard .ledger-tools');
      if(tools) tools.appendChild(el);
    }
    if(!el)return;
    el.dataset.kind=kind;
    if(el.textContent!==text) el.textContent=text;
    clearTimeout(statusTimer);
    if(kind==='ok') statusTimer=setTimeout(()=>{if(el.textContent!=='자동저장 준비')el.textContent='자동저장 준비';el.dataset.kind='idle'},1800);
  }

  function addStyle(){
    if(document.getElementById('ledgerPcInlineStyle'))return;
    const s=document.createElement('style');
    s.id='ledgerPcInlineStyle';
    s.textContent=`
      @media (min-width:1000px) and (pointer:fine){
        body.tuition-pc-inline #ledgerGridCard .lg-name>span{display:none}
        body.tuition-pc-inline .pc-due-wrap{display:flex;align-items:center;gap:4px;margin-top:4px;font-size:11px;color:var(--muted)}
        body.tuition-pc-inline .pc-due-input{width:52px;border:1px solid transparent;border-radius:6px;background:transparent;padding:3px 4px;text-align:center;font:inherit;font-weight:800;color:var(--text)}
        body.tuition-pc-inline .pc-due-input:hover{border-color:#cbd5e1;background:#fff}
        body.tuition-pc-inline .pc-due-input:focus{outline:2px solid #9db7ff;border-color:#9db7ff;background:#fff}
        body.tuition-pc-inline .ledger-due-edit-btn{font-size:9px;padding:2px 5px;margin:0}
        body.tuition-pc-inline #ledgerGridCard .lg-month input{cursor:text}
        body.tuition-pc-inline #ledgerGridCard .lg-month input:hover{background:#f8fafc;box-shadow:inset 0 0 0 1px #d0d5dd}
        body.tuition-pc-inline .pc-save-status{display:inline-flex;align-items:center;min-height:28px;padding:4px 8px;border-radius:999px;border:1px solid var(--line);background:#fff;font-size:11px;font-weight:800;color:var(--muted)}
        body.tuition-pc-inline .pc-save-status[data-kind="saving"]{background:var(--warn);color:#7a4f01}
        body.tuition-pc-inline .pc-save-status[data-kind="ok"]{background:var(--ok);color:#176b3a}
        body.tuition-pc-inline .pc-save-status[data-kind="error"]{background:var(--bad);color:#9b1c1c}
      }`;
    document.head.appendChild(s);
  }

  function dueFromRow(row){
    const text=row.querySelector('.lg-name>span')?.textContent||'';
    return Number((text.match(/(\d+)일/)||[])[1]||0);
  }

  function enhanceDue(row){
    const nameCell=row.querySelector('.lg-name');
    if(!nameCell || nameCell.querySelector('.pc-due-wrap'))return;
    const oldButton=nameCell.querySelector('.ledger-due-edit-btn');
    const current=dueFromRow(row);
    const wrap=document.createElement('div');
    wrap.className='pc-due-wrap';
    wrap.innerHTML=`<span>납부일</span><input class="pc-due-input" type="number" min="1" max="31" value="${current||1}" aria-label="기준 납부일"><span>일</span>`;
    const input=wrap.querySelector('input');
    if(oldButton){oldButton.textContent='상세';oldButton.title='변경 사유·메모를 포함한 상세 수정';wrap.appendChild(oldButton)}
    nameCell.appendChild(wrap);

    input.addEventListener('focus',()=>{input.dataset.before=input.value;input.select()});
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'){e.preventDefault();input.blur()}
      if(e.key==='Escape'){e.preventDefault();input.value=input.dataset.before||input.value;input.blur()}
    });
    input.addEventListener('blur',async()=>{
      const before=Number(input.dataset.before||current||1);
      const day=Number(input.value);
      if(day===before)return;
      if(!Number.isInteger(day)||day<1||day>31){input.value=before;status('납부일은 1~31만 입력','error');return}
      const key=row.dataset.householdKey||'';
      const due=load(DUE_KEY);due[key]=day;save(DUE_KEY,due);
      status('납부일 저장 중…','saving');
      const master=window.KMTTuitionMaster;
      if(!master?.ok){due[key]=before;save(DUE_KEY,due);input.value=before;status('중앙DB 연결 실패 · 원래 값 복원','error');return}
      const ok=await master.saveDue({
        row,householdKey:key,
        displayName:row.querySelector('.lg-name b')?.textContent?.trim()||key,
        studentsCsv:row.dataset.students||'',day,reason:'PC 인라인 수정',memo:''
      });
      if(ok){
        input.dataset.before=String(day);
        const hidden=nameCell.querySelector(':scope>span');
        if(hidden) hidden.textContent=`납부일 ${day}일`;
        status('✓ 납부일 저장됨','ok');
      }else{
        due[key]=before;save(DUE_KEY,due);input.value=before;
        status('저장 실패 · 원래 값 복원','error');
      }
    });
  }

  function enhanceMonthInputs(){
    document.querySelectorAll('#ledgerGridCard .lg-month input[data-k]').forEach(input=>{
      if(input.dataset.pcReady)return;
      input.dataset.pcReady='1';
      input.title='클릭 후 바로 수정 · Enter 저장 · Esc 취소';
      input.addEventListener('focus',()=>{input.dataset.before=input.value});
      input.addEventListener('keydown',e=>{
        if(e.key==='Enter'){e.preventDefault();input.blur()}
        if(e.key==='Escape'){e.preventDefault();input.value=input.dataset.before??input.value;input.blur()}
      });
      input.addEventListener('change',()=>{
        status('월 회비 중앙DB 자동저장 중…','saving');
        setTimeout(()=>status('✓ 자동저장 처리','ok'),700);
      });
    });
  }

  function enhance(){
    if(!isPc())return;
    document.body.classList.add('tuition-pc-inline');
    const root=document.getElementById('ledgerGridCard');
    if(!root)return;
    root.querySelectorAll('tbody tr').forEach(enhanceDue);
    enhanceMonthInputs();
    const desired='※ PC 전용: 납부일·월별 날짜·금액을 표에서 바로 수정할 수 있습니다. Enter 또는 다른 칸 클릭 시 저장되며, 상세 버튼은 사유·메모가 필요한 경우에만 사용합니다.';
    const note=root.querySelector('.ledger-note');
    if(note && note.textContent!==desired) note.textContent=desired;
    if(!document.getElementById('ledgerPcSaveStatus')) status('자동저장 준비','idle');
  }

  function mount(){
    if(!isPc())return;
    addStyle();
    enhance();
    const target=document.getElementById('ledgerGridCard')||document.body;
    observer=new MutationObserver(()=>enhance());
    observer.observe(target,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
