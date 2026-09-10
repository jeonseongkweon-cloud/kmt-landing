// 계명태권도 CLASS 회비관리 SYSTEM
// LEDGER DIRECT EDIT v1.0
// 연간 회비대장에서 납부일/월별 납부기록을 확실하게 직접 입력·수정하기 위한 보강 컨트롤.
// 현재 저장은 브라우저 localStorage 전용이며 Supabase에는 쓰지 않는다.
(function(){
  const LEDGER_KEY='kmt_tuition_ledger_grid_edits_v1';
  const DUE_KEY='kmt_tuition_ledger_due_edits_v1';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const load=(key,fallback={})=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const save=(key,v)=>localStorage.setItem(key,JSON.stringify(v));

  function rowName(tr){return (tr.querySelector('.lg-name b')?.textContent||'').trim();}
  function studentKeyFromCell(td){
    const input=td?.querySelector('input[data-k]');
    const key=input?.dataset.k||'';
    const parts=key.split('|');
    return parts.length>=3?{students:parts[0],month:Number(parts[1]),field:parts[2]}:null;
  }
  function monthLabel(m){return `${m+1}월`;}

  function ensureModal(){
    if(document.getElementById('ledgerDirectModal'))return;
    const modal=document.createElement('div');
    modal.id='ledgerDirectModal'; modal.className='modal'; modal.hidden=true;
    modal.innerHTML=`<div class="modal-card"><div class="modal-head"><strong id="ledgerDirectTitle">회비 입력/수정</strong><button class="btn" id="ledgerDirectClose" type="button">닫기</button></div><div class="modal-body"><input type="hidden" id="ledgerDirectEntryKey"><input type="hidden" id="ledgerDirectAmountKey"><div class="field"><label>납부 날짜 / 결제표시</label><input id="ledgerDirectEntry" placeholder="예: 9/10페이, 9/10카드, 연장"></div><div class="field" style="margin-top:10px"><label>금액</label><input id="ledgerDirectAmount" placeholder="예: 16.5, 30만"></div><div class="mini" style="margin-top:8px">날짜는 실제 받은 날짜를 입력합니다. 예: 8월분을 9월 10일에 받았다면 8월 칸에 9/10을 기록합니다.</div><div class="modal-actions"><button class="btn primary" id="ledgerDirectSave" type="button">저장</button><button class="btn" id="ledgerDirectClear" type="button">이 월 기록 비우기</button><button class="btn" id="ledgerDirectCancel" type="button">취소</button></div><div id="ledgerDirectSaved" class="mini"></div></div></div>`;
    document.body.appendChild(modal);
    const close=()=>{modal.hidden=true};
    document.getElementById('ledgerDirectClose').onclick=close;
    document.getElementById('ledgerDirectCancel').onclick=close;
    modal.addEventListener('click',e=>{if(e.target===modal)close()});
    document.getElementById('ledgerDirectSave').onclick=()=>{
      const ek=document.getElementById('ledgerDirectEntryKey').value;
      const ak=document.getElementById('ledgerDirectAmountKey').value;
      const data=load(LEDGER_KEY,{});
      data[ek]=document.getElementById('ledgerDirectEntry').value.trim();
      data[ak]=document.getElementById('ledgerDirectAmount').value.trim();
      save(LEDGER_KEY,data);
      syncVisibleCell(ek,ak,data[ek],data[ak]);
      document.getElementById('ledgerDirectSaved').textContent='✓ 이 브라우저에 임시저장했습니다.';
      setTimeout(close,350);
    };
    document.getElementById('ledgerDirectClear').onclick=()=>{
      if(!confirm('이 월의 날짜/표시와 금액을 모두 비울까요?'))return;
      const ek=document.getElementById('ledgerDirectEntryKey').value;
      const ak=document.getElementById('ledgerDirectAmountKey').value;
      const data=load(LEDGER_KEY,{}); data[ek]=''; data[ak]=''; save(LEDGER_KEY,data);
      syncVisibleCell(ek,ak,'',''); close();
    };
  }
  function syncVisibleCell(ek,ak,entry,amount){
    document.querySelectorAll('#ledgerGridBody input[data-k]').forEach(i=>{
      if(i.dataset.k===ek)i.value=entry;
      if(i.dataset.k===ak)i.value=amount;
    });
  }
  function openMonth(td){
    ensureModal();
    const info=studentKeyFromCell(td); if(!info)return;
    const inputs=td.querySelectorAll('input[data-k]'); if(inputs.length<2)return;
    const tr=td.closest('tr'); const name=rowName(tr);
    document.getElementById('ledgerDirectTitle').textContent=`💰 ${name} · ${monthLabel(info.month)} 회비 입력/수정`;
    document.getElementById('ledgerDirectEntryKey').value=inputs[0].dataset.k;
    document.getElementById('ledgerDirectAmountKey').value=inputs[1].dataset.k;
    document.getElementById('ledgerDirectEntry').value=inputs[0].value||'';
    document.getElementById('ledgerDirectAmount').value=inputs[1].value||'';
    document.getElementById('ledgerDirectSaved').textContent='';
    document.getElementById('ledgerDirectModal').hidden=false;
    setTimeout(()=>document.getElementById('ledgerDirectEntry').focus(),0);
  }

  function editDue(tr){
    const name=rowName(tr); if(!name)return;
    const span=tr.querySelector('.lg-name span');
    const dueDb=load(DUE_KEY,{});
    const shown=Number((span?.textContent.match(/(\d+)일/)||[])[1]||'');
    const old=Number(dueDb[name]||shown||'');
    const val=prompt(`${name} 기준 납부일 변경\n\n현재: ${old||'-'}일\n새 납부일(1~31)을 입력하세요.\n※ 늦게 납부한 날짜와 기준 납부일은 별개입니다.`,old||'');
    if(val===null)return;
    const day=Number(val);
    if(!Number.isInteger(day)||day<1||day>31){alert('납부일은 1~31 사이 숫자로 입력해주세요.');return;}
    dueDb[name]=day; save(DUE_KEY,dueDb);
    if(span)span.textContent=`납부일 ${day}일`;
    alert(`${name} 기준 납부일을 ${day}일로 임시저장했습니다.`);
  }

  function enhance(){
    const card=document.getElementById('ledgerGridCard'); if(!card)return;
    if(!document.getElementById('ledgerEditGuide')){
      const bar=document.createElement('div'); bar.id='ledgerEditGuide'; bar.className='toolbar'; bar.style.margin='0 16px 12px';
      bar.innerHTML='<span class="mini"><b>입력방법:</b> 월 칸의 <b>수정</b> 버튼 → 날짜/금액 저장 · 이름 아래 <b>납부일 변경</b> 버튼 → 기준 납부일 수정</span>';
      const sort=document.getElementById('ledgerSortBar'); (sort||card.querySelector('.ledger-head'))?.insertAdjacentElement('afterend',bar);
    }
    document.querySelectorAll('#ledgerGridBody tr').forEach(tr=>{
      const nameCell=tr.querySelector('.lg-name');
      if(nameCell && !nameCell.querySelector('.ledger-due-edit-btn')){
        const b=document.createElement('button'); b.type='button'; b.className='btn ledger-due-edit-btn'; b.textContent='납부일 변경'; b.style.cssText='padding:3px 6px;margin-top:4px;font-size:10px';
        b.onclick=e=>{e.preventDefault();e.stopPropagation();editDue(tr)}; nameCell.appendChild(b);
      }
      tr.querySelectorAll('.lg-month').forEach(td=>{
        if(td.querySelector('.ledger-month-edit-btn'))return;
        td.style.position='relative';
        const b=document.createElement('button');b.type='button';b.className='ledger-month-edit-btn';b.textContent='수정';b.title='이 월 회비 입력/수정';
        b.style.cssText='position:absolute;right:2px;top:2px;border:1px solid #d0d5dd;border-radius:5px;background:#fff;padding:1px 4px;font-size:9px;cursor:pointer;opacity:.72';
        b.onclick=e=>{e.preventDefault();e.stopPropagation();openMonth(td)};td.appendChild(b);
        td.querySelectorAll('input[data-k]').forEach(i=>{
          i.addEventListener('input',()=>{const data=load(LEDGER_KEY,{});data[i.dataset.k]=i.value;save(LEDGER_KEY,data)});
        });
      });
    });
    const dueDb=load(DUE_KEY,{});
    document.querySelectorAll('#ledgerGridBody tr').forEach(tr=>{const n=rowName(tr),sp=tr.querySelector('.lg-name span');if(sp&&dueDb[n])sp.textContent=`납부일 ${dueDb[n]}일`;});
  }
  const obs=new MutationObserver(()=>setTimeout(enhance,0));
  obs.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(enhance,100));else setTimeout(enhance,100);
})();