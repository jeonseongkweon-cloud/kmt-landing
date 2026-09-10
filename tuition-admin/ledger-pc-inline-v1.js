// 계명태권도 CLASS 회비관리 SYSTEM
// PC INLINE EDIT v1.2 — PC 전용 엑셀형 직접수정 / 실제 중앙DB 자동저장 확인
(function(){
  const DUE_KEY='kmt_tuition_ledger_due_edits_v1';
  const isPc=()=>window.matchMedia('(pointer:fine)').matches && window.innerWidth>=1000;
  const load=k=>{try{return JSON.parse(localStorage.getItem(k)||'{}')}catch{return {}}};
  const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  let observer=null, statusTimer=null, enhanceTimer=null;

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
        body.tuition-pc-inline .pc-due-input{width:52px;border:1px solid transparent;border-radius:6px;background:transparent;padding:3px 4px;text-align:center;font:inherit;font-weight:800;color:var(--text);cursor:text}
        body.tuition-pc-inline .pc-due-input:hover{border-color:#cbd5e1;background:#fff}
        body.tuition-pc-inline .pc-due-input:focus{outline:2px solid #9db7ff;border-color:#9db7ff;background:#fff}
        body.tuition-pc-inline .ledger-due-edit-btn{font-size:9px;padding:2px 5px;margin:0}

        /* PC 월별 칸은 직접 입력만 사용: 수정 버튼/팝업 진입 버튼 제거 */
        body.tuition-pc-inline #ledgerGridCard .lg-month button,
        body.tuition-pc-inline #ledgerGridCard .ledger-month-edit-btn,
        body.tuition-pc-inline #ledgerGridCard [data-ledger-month-edit]{display:none!important}
        body.tuition-pc-inline #ledgerGridCard .lg-month input[data-k]{
          display:block!important;width:100%!important;min-width:0;border:1px solid transparent!important;
          border-radius:6px;background:transparent!important;padding:3px 4px!important;margin:0!important;
          text-align:center;font:inherit;color:var(--text);cursor:text;pointer-events:auto!important;
        }
        body.tuition-pc-inline #ledgerGridCard .lg-month input[data-k]:hover{background:#f8fafc!important;box-shadow:inset 0 0 0 1px #d0d5dd}
        body.tuition-pc-inline #ledgerGridCard .lg-month input[data-k]:focus{background:#fff!important;outline:2px solid #9db7ff!important;box-shadow:none!important}
        body.tuition-pc-inline #ledgerGridCard .lg-month{cursor:text}

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
      try{
        const ok=await master.saveDue({row,householdKey:key,displayName:row.querySelector('.lg-name b')?.textContent?.trim()||key,studentsCsv:row.dataset.students||'',day,reason:'PC 인라인 수정',memo:''});
        if(ok){
          input.dataset.before=String(day);
          const hidden=nameCell.querySelector(':scope>span');
          if(hidden) hidden.textContent=`납부일 ${day}일`;
          status('✓ 납부일 중앙DB 저장됨','ok');
        }else{
          due[key]=before;save(DUE_KEY,due);input.value=before;
          status('저장 실패 · 원래 값 복원','error');
        }
      }catch(err){
        console.error('[TUITION PC INLINE] due save failed',err);
        due[key]=before;save(DUE_KEY,due);input.value=before;
        status('저장 실패 · 원래 값 복원','error');
      }
    });
  }

  function enhanceMonthInputs(){
    document.querySelectorAll('#ledgerGridCard .lg-month input[data-k]').forEach(input=>{
      input.readOnly=false;
      input.disabled=false;
      input.dataset.pcInlineOwnSave='1';
      if(input.dataset.pcReady)return;
      input.dataset.pcReady='1';
      input.title='클릭 후 바로 입력 · Enter/다른 칸 클릭 중앙DB 자동저장 · Esc 취소';
      input.setAttribute('autocomplete','off');
      input.addEventListener('focus',()=>{
        input.dataset.before=input.value;
        requestAnimationFrame(()=>input.select());
      });
      input.addEventListener('keydown',e=>{
        if(e.key==='Enter'){e.preventDefault();input.blur()}
        if(e.key==='Escape'){
          e.preventDefault();
          input.dataset.cancelled='1';
          input.value=input.dataset.before??input.value;
          input.blur();
        }
      });
      input.addEventListener('change',async()=>{
        if(input.dataset.cancelled==='1'){delete input.dataset.cancelled;return;}
        const master=window.KMTTuitionMaster;
        if(!master?.ok){status('중앙DB 연결 확인 필요','error');return;}
        status('월 회비 중앙DB 저장 중…','saving');
        try{
          const ok=await master.saveInline(input);
          if(ok){
            input.dataset.before=input.value;
            status('✓ 중앙DB 저장됨','ok');
          }else{
            status('중앙DB 저장 실패 · 다시 확인','error');
          }
        }catch(err){
          console.error('[TUITION PC INLINE] month save failed',err);
          status('중앙DB 저장 실패 · 다시 확인','error');
        }
      });
    });
  }

  function removeMonthEditButtons(){
    document.querySelectorAll('#ledgerGridCard .lg-month button, #ledgerGridCard .ledger-month-edit-btn, #ledgerGridCard [data-ledger-month-edit]').forEach(btn=>btn.remove());
  }

  function enhance(){
    if(!isPc())return;
    document.body.classList.add('tuition-pc-inline');
    const root=document.getElementById('ledgerGridCard');
    if(!root)return;
    removeMonthEditButtons();
    root.querySelectorAll('tbody tr').forEach(enhanceDue);
    enhanceMonthInputs();
    const desired='※ PC 직접입력: 월별 날짜·금액을 클릭해 바로 수정합니다. Enter 또는 다른 칸 클릭 시 Supabase 중앙DB에 자동저장되며, Esc는 취소입니다.';
    const note=root.querySelector('.ledger-note');
    if(note && note.textContent!==desired) note.textContent=desired;
    if(!document.getElementById('ledgerPcSaveStatus')) status('자동저장 준비','idle');
  }

  function scheduleEnhance(){
    clearTimeout(enhanceTimer);
    enhanceTimer=setTimeout(()=>{enhanceTimer=null;enhance()},80);
  }

  function mount(){
    if(!isPc())return;
    addStyle();
    enhance();
    const target=document.getElementById('ledgerGridCard');
    if(!target)return;
    observer=new MutationObserver(()=>scheduleEnhance());
    observer.observe(target,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
