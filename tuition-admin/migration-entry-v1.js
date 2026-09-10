// 계명태권도 CLASS 회비관리 SYSTEM
// MIGRATION ENTRY BOARD v1.0
// 검토/이관 입력 전용. localStorage에만 저장하며 Supabase/문자/미납 계산에는 반영하지 않는다.
(function(){
  const STORAGE_KEY='kmt_tuition_migration_entry_v1';
  const MONTHS=['01','02','03','04','05','06','07','08','09'];
  const MONTH_LABEL={unknown:'미확인',paid:'납부확인',exempt:'납부대상아님',arrears:'미납확정'};
  const CLASS_LABEL={review:'확인필요',legacy:'기존원생',new2026:'2026신규',withdrawn:'퇴관',paused:'휴원',other:'기타'};
  function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return {}}}
  function save(v){localStorage.setItem(STORAGE_KEY,JSON.stringify(v));}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function names(){
    const a=window.KMT_TUITION_MIGRATION_AUDIT||{};
    return [...new Set([...(a.currentWithoutLegacyLedger||[]),...(a.legacyNotInCurrentReview||[])])].sort((x,y)=>x.localeCompare(y,'ko'));
  }
  function ensureRecord(db,name){
    db[name] ||= {classification:'review',dueDay:'',note:'',months:{}};
    MONTHS.forEach(m=>db[name].months[m] ||= 'unknown');
    return db[name];
  }
  function count(db){
    const ns=names(); let done=0,unknown=0,arrears=0;
    ns.forEach(n=>{const r=ensureRecord(db,n);const vals=MONTHS.map(m=>r.months[m]);unknown+=vals.filter(v=>v==='unknown').length;arrears+=vals.filter(v=>v==='arrears').length;if(r.classification!=='review'&&vals.every(v=>v!=='unknown'))done++;});
    return {total:ns.length,done,unknown,arrears};
  }
  function renderSummary(){
    const el=document.getElementById('migrationEntrySummary'); if(!el)return;
    const c=count(load());
    el.textContent=`검토 ${c.total}명 · 완전확정 ${c.done}명 · 월 미확인 ${c.unknown}건 · 미납확정 ${c.arrears}건`;
  }
  function openBoard(){
    const db=load(), ns=names();
    let modal=document.getElementById('migrationEntryModal');
    if(!modal){modal=document.createElement('div');modal.id='migrationEntryModal';modal.className='modal';document.body.appendChild(modal);}
    const rows=ns.map(name=>{
      const r=ensureRecord(db,name);
      const monthCells=MONTHS.map(m=>`<label style="display:flex;flex-direction:column;gap:4px;min-width:86px"><span class="mini">${Number(m)}월</span><select data-month="${m}" style="padding:7px;border:1px solid var(--line);border-radius:8px"><option value="unknown" ${r.months[m]==='unknown'?'selected':''}>미확인</option><option value="paid" ${r.months[m]==='paid'?'selected':''}>납부확인</option><option value="exempt" ${r.months[m]==='exempt'?'selected':''}>납부대상아님</option><option value="arrears" ${r.months[m]==='arrears'?'selected':''}>미납확정</option></select></label>`).join('');
      return `<details data-person="${esc(name)}" style="border:1px solid var(--line);border-radius:14px;padding:10px;margin-top:10px"><summary style="cursor:pointer;font-weight:900">${esc(name)} <span class="mini">· ${CLASS_LABEL[r.classification]||r.classification}</span></summary><div style="margin-top:12px"><div class="form-grid"><div class="field"><label>이관 분류</label><select data-field="classification"><option value="review" ${r.classification==='review'?'selected':''}>확인필요</option><option value="legacy" ${r.classification==='legacy'?'selected':''}>기존원생</option><option value="new2026" ${r.classification==='new2026'?'selected':''}>2026신규</option><option value="paused" ${r.classification==='paused'?'selected':''}>휴원</option><option value="withdrawn" ${r.classification==='withdrawn'?'selected':''}>퇴관</option><option value="other" ${r.classification==='other'?'selected':''}>기타</option></select></div><div class="field"><label>기준 납부일</label><input data-field="dueDay" type="number" min="1" max="31" value="${esc(r.dueDay)}" placeholder="1~31"></div></div><div style="display:flex;gap:8px;overflow-x:auto;padding:10px 0">${monthCells}</div><div class="field"><label>확인 메모</label><textarea data-field="note" rows="2" placeholder="예: 5월부터 등록 / 7월 여행 사선 / 납부일 19→27 변경">${esc(r.note)}</textarea></div><div class="mini" style="margin-top:8px">※ '미납확정'은 장부를 직접 확인한 경우에만 선택. 이 입력은 아직 실제 미납 계산이나 문자대상에 반영되지 않습니다.</div></div></details>`;
    }).join('');
    modal.innerHTML=`<div class="modal-card" style="width:min(1180px,98vw)"><div class="modal-head"><div><strong>📋 회비자료 이관 입력판</strong><div class="mini">브라우저 임시저장 전용 · Supabase 쓰기 없음 · 문자발송 없음</div></div><button class="btn" id="migrationEntryClose">닫기</button></div><div class="modal-body"><div class="card info"><b>안전규칙</b><div class="mini" style="margin-top:5px">사선=납부대상아님 · 미납은 직접 확인 후만 확정 · 늦게 납부해도 기준일 자동변경 없음 · 적용월은 실제 회비 귀속월 기준</div></div><div id="migrationEntryRows">${rows}</div><div class="modal-actions"><button class="btn primary" id="migrationEntrySave">현재 입력 임시저장</button><button class="btn" id="migrationEntryExport">입력내용 JSON 복사</button><button class="btn" id="migrationEntryReset">임시입력 전체삭제</button></div></div></div>`;
    modal.hidden=false;
    document.getElementById('migrationEntryClose').onclick=()=>modal.hidden=true;
    document.getElementById('migrationEntrySave').onclick=()=>{collect(modal,db);save(db);renderSummary();alert('이관 입력을 이 브라우저에 임시저장했습니다.\n※ Supabase에는 저장되지 않았습니다.');};
    document.getElementById('migrationEntryExport').onclick=async()=>{collect(modal,db);save(db);const text=JSON.stringify(db,null,2);try{await navigator.clipboard.writeText(text);alert('입력내용 JSON을 클립보드에 복사했습니다.');}catch{prompt('아래 내용을 복사하세요.',text)}};
    document.getElementById('migrationEntryReset').onclick=()=>{if(confirm('이 브라우저에 임시저장한 이관 입력을 모두 삭제할까요?')){localStorage.removeItem(STORAGE_KEY);modal.hidden=true;renderSummary();}};
  }
  function collect(modal,db){
    modal.querySelectorAll('[data-person]').forEach(box=>{
      const name=box.dataset.person,r=ensureRecord(db,name);
      r.classification=box.querySelector('[data-field="classification"]').value;
      r.dueDay=box.querySelector('[data-field="dueDay"]').value;
      r.note=box.querySelector('[data-field="note"]').value.trim();
      box.querySelectorAll('[data-month]').forEach(s=>r.months[s.dataset.month]=s.value);
      r.updatedAt=new Date().toISOString();
    });
  }
  function init(){
    const panel=document.getElementById('migrationAuditPanel'); if(!panel)return setTimeout(init,150);
    if(document.getElementById('openMigrationEntry'))return;
    const bar=document.createElement('div');bar.className='toolbar';bar.style.marginTop='12px';
    bar.innerHTML='<button class="btn primary" id="openMigrationEntry">📋 이관 입력판 열기</button><span id="migrationEntrySummary" class="mini" style="align-self:center"></span>';
    panel.appendChild(bar);document.getElementById('openMigrationEntry').onclick=openBoard;renderSummary();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
