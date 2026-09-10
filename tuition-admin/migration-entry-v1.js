// 계명태권도 CLASS 회비관리 SYSTEM
// MIGRATION ENTRY BOARD v1.2
// 검토/이관 입력 전용. localStorage에만 저장하며 Supabase/문자/미납 계산에는 반영하지 않는다.
(function(){
  const STORAGE_KEY='kmt_tuition_migration_entry_v1';
  const MONTHS=['01','02','03','04','05','06','07','08','09'];
  const CLASS_LABEL={review:'확인필요',legacy:'기존원생',new2026:'2026신규',withdrawn:'퇴관',paused:'휴원',other:'기타'};
  function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return {}}}
  function save(v){localStorage.setItem(STORAGE_KEY,JSON.stringify(v));}
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function audit(){return window.KMT_TUITION_MIGRATION_AUDIT||{}}
  function names(){const a=audit();return [...new Set([...(a.currentWithoutLegacyLedger||[]),...(a.legacyNotInCurrentReview||[])])].sort((x,y)=>x.localeCompare(y,'ko'));}
  function groupOf(name){
    const a=audit(),g=a.currentGapGroups||{};
    if((g.likely2026NewOrLedgerGap||[]).includes(name)) return 'newCandidate';
    if((g.existingBefore2026||[]).includes(name)) return 'existing';
    if((g.autoMatchedNeedReview||[]).includes(name)) return 'autoReview';
    if((a.legacyNotInCurrentReview||[]).includes(name)) return 'legacyReview';
    return 'other';
  }
  function defaultClass(name){const g=groupOf(name);if(g==='newCandidate')return'new2026';if(g==='existing'||g==='autoReview')return'legacy';return'review';}
  function ensureRecord(db,name){
    if(!db[name]){
      const ev=(audit().currentGapEvidence||{})[name]||{};
      db[name]={classification:defaultClass(name),dueDay:ev.feeDueDay||'',note:'',months:{}};
    }
    MONTHS.forEach(m=>db[name].months[m] ||= 'unknown');
    return db[name];
  }
  function count(db){const ns=names();let done=0,unknown=0,arrears=0;ns.forEach(n=>{const r=ensureRecord(db,n),vals=MONTHS.map(m=>r.months[m]);unknown+=vals.filter(v=>v==='unknown').length;arrears+=vals.filter(v=>v==='arrears').length;if(r.classification!=='review'&&vals.every(v=>v!=='unknown'))done++;});return{total:ns.length,done,unknown,arrears};}
  function renderSummary(){const el=document.getElementById('migrationEntrySummary');if(!el)return;const c=count(load());el.textContent=`검토 ${c.total}명 · 완전확정 ${c.done}명 · 월 미확인 ${c.unknown}건 · 미납확정 ${c.arrears}건`;}
  function evidenceLine(name){
    const e=(audit().currentGapEvidence||{})[name];if(!e)return'';
    const parts=[];if(e.match)parts.push(`DB ${e.match}`);if(e.joined)parts.push(`등록 ${e.joined}`);if(e.feeDueDay)parts.push(`납부일 ${e.feeDueDay}일`);if(e.monthlyFee)parts.push(`기존 원비 ${Number(e.monthlyFee).toLocaleString('ko-KR')}원`);if(e.householdHint)parts.push(`👪 ${e.householdHint}`);if(e.review)parts.push(`⚠ ${e.review}`);
    return parts.join(' · ');
  }
  function registrationHint(name){
    const e=(audit().currentGapEvidence||{})[name];if(!e||!e.joined||!String(e.joined).startsWith('2026-'))return'';
    const month=Number(String(e.joined).slice(5,7));
    return `등록월 ${month}월 · 그 이전 월은 장부 확인 후 '납부대상아님'으로 확정하세요. 자동처리하지 않습니다.`;
  }
  function rowHtml(name,db){
    const r=ensureRecord(db,name),ev=evidenceLine(name),regHint=registrationHint(name);
    const monthCells=MONTHS.map(m=>`<label style="display:flex;flex-direction:column;gap:4px;min-width:86px"><span class="mini">${Number(m)}월</span><select data-month="${m}" style="padding:7px;border:1px solid var(--line);border-radius:8px"><option value="unknown" ${r.months[m]==='unknown'?'selected':''}>미확인</option><option value="paid" ${r.months[m]==='paid'?'selected':''}>납부확인</option><option value="exempt" ${r.months[m]==='exempt'?'selected':''}>납부대상아님</option><option value="arrears" ${r.months[m]==='arrears'?'selected':''}>미납확정</option></select></label>`).join('');
    return `<details data-person="${esc(name)}" data-search="${esc(name+' '+ev)}" style="border:1px solid var(--line);border-radius:14px;padding:10px;margin-top:10px"><summary style="cursor:pointer;font-weight:900">${esc(name)} <span class="mini">· ${CLASS_LABEL[r.classification]||r.classification}</span></summary><div style="margin-top:12px">${ev?`<div class="card info" style="padding:10px;margin-bottom:10px"><div class="mini"><b>기준자료</b> · ${esc(ev)}</div>${regHint?`<div class="mini" style="margin-top:5px"><b>등록월 참고</b> · ${esc(regHint)}</div>`:''}</div>`:''}<div class="form-grid"><div class="field"><label>이관 분류</label><select data-field="classification"><option value="review" ${r.classification==='review'?'selected':''}>확인필요</option><option value="legacy" ${r.classification==='legacy'?'selected':''}>기존원생</option><option value="new2026" ${r.classification==='new2026'?'selected':''}>2026신규</option><option value="paused" ${r.classification==='paused'?'selected':''}>휴원</option><option value="withdrawn" ${r.classification==='withdrawn'?'selected':''}>퇴관</option><option value="other" ${r.classification==='other'?'selected':''}>기타</option></select></div><div class="field"><label>기준 납부일</label><input data-field="dueDay" type="number" min="1" max="31" value="${esc(r.dueDay)}" placeholder="1~31"></div></div><div style="display:flex;gap:8px;overflow-x:auto;padding:10px 0">${monthCells}</div><div class="field"><label>확인 메모</label><textarea data-field="note" rows="2" placeholder="예: 5월부터 등록 / 7월 여행 사선 / 납부일 19→27 변경">${esc(r.note)}</textarea></div><div class="mini" style="margin-top:8px">※ '미납확정'은 장부를 직접 확인한 경우에만 선택. 이 입력은 실제 미납 계산이나 문자대상에 반영되지 않습니다.</div></div></details>`;
  }
  function sectionHtml(title,namesArr,db,note){if(!namesArr.length)return'';return `<section data-entry-section style="margin-top:18px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:end"><div><b style="font-size:16px">${esc(title)}</b>${note?`<div class="mini" style="margin-top:3px">${esc(note)}</div>`:''}</div><span class="badge info">${namesArr.length}명</span></div>${namesArr.map(n=>rowHtml(n,db)).join('')}</section>`;}
  function openBoard(){
    const db=load(),a=audit(),g=a.currentGapGroups||{};
    let modal=document.getElementById('migrationEntryModal');if(!modal){modal=document.createElement('div');modal.id='migrationEntryModal';modal.className='modal';document.body.appendChild(modal);}
    const sections=
      sectionHtml('① 2026 신규 / 장부누락 후보',g.likely2026NewOrLedgerGap||[],db,'신규 확정이 아니라 우선검토 후보입니다.')+
      sectionHtml('② 2026 이전 등록 · 장부 미연결',g.existingBefore2026||[],db,'기존원생으로 보고 과거 장부 연결을 우선 확인합니다.')+
      sectionHtml('③ 자동일치지만 장부 확인필요',g.autoMatchedNeedReview||[],db,'DB 자동일치 자료가 있으나 회비장부 연결은 별도 확인합니다.')+
      sectionHtml('④ 과거 장부 · 현재 CLASS 확인필요',a.legacyNotInCurrentReview||[],db,'삭제하지 않고 과거자료 보존 여부를 확인합니다.');
    modal.innerHTML=`<div class="modal-card" style="width:min(1180px,98vw)"><div class="modal-head"><div><strong>📋 회비자료 이관 입력판</strong><div class="mini">브라우저 임시저장 전용 · Supabase 쓰기 없음 · 문자발송 없음</div></div><button class="btn" id="migrationEntryClose">닫기</button></div><div class="modal-body"><div class="card info"><b>안전규칙</b><div class="mini" style="margin-top:5px">사선=납부대상아님 · 미납은 직접 확인 후만 확정 · 늦게 납부해도 기준일 자동변경 없음 · 적용월은 실제 회비 귀속월 기준 · 가족 후보도 자동 병합하지 않음</div></div><div class="field" style="margin-top:12px"><label>학생 빠른검색</label><input id="migrationEntrySearch" placeholder="이름을 입력하면 해당 학생만 표시"></div><div id="migrationEntryRows">${sections}</div><div class="modal-actions"><button class="btn primary" id="migrationEntrySave">현재 입력 임시저장</button><button class="btn" id="migrationEntryExport">입력내용 JSON 복사</button><button class="btn" id="migrationEntryReset">임시입력 전체삭제</button></div></div></div>`;
    modal.hidden=false;
    document.getElementById('migrationEntryClose').onclick=()=>modal.hidden=true;
    document.getElementById('migrationEntrySearch').oninput=e=>{const q=e.target.value.trim().replace(/\s/g,'').toLowerCase();modal.querySelectorAll('[data-person]').forEach(box=>{box.style.display=!q||box.dataset.search.replace(/\s/g,'').toLowerCase().includes(q)?'':'none';});modal.querySelectorAll('[data-entry-section]').forEach(sec=>{sec.style.display=[...sec.querySelectorAll('[data-person]')].some(x=>x.style.display!=='none')?'':'none';});};
    document.getElementById('migrationEntrySave').onclick=()=>{collect(modal,db);save(db);renderSummary();alert('이관 입력을 이 브라우저에 임시저장했습니다.\n※ Supabase에는 저장되지 않았습니다.');};
    document.getElementById('migrationEntryExport').onclick=async()=>{collect(modal,db);save(db);const text=JSON.stringify(db,null,2);try{await navigator.clipboard.writeText(text);alert('입력내용 JSON을 클립보드에 복사했습니다.');}catch{prompt('아래 내용을 복사하세요.',text)}};
    document.getElementById('migrationEntryReset').onclick=()=>{if(confirm('이 브라우저에 임시저장한 이관 입력을 모두 삭제할까요?')){localStorage.removeItem(STORAGE_KEY);modal.hidden=true;renderSummary();}};
  }
  function collect(modal,db){modal.querySelectorAll('[data-person]').forEach(box=>{const name=box.dataset.person,r=ensureRecord(db,name);r.classification=box.querySelector('[data-field="classification"]').value;r.dueDay=box.querySelector('[data-field="dueDay"]').value;r.note=box.querySelector('[data-field="note"]').value.trim();box.querySelectorAll('[data-month]').forEach(s=>r.months[s.dataset.month]=s.value);r.updatedAt=new Date().toISOString();});}
  function init(){const panel=document.getElementById('migrationAuditPanel');if(!panel)return setTimeout(init,150);if(document.getElementById('openMigrationEntry'))return;const bar=document.createElement('div');bar.className='toolbar';bar.style.marginTop='12px';bar.innerHTML='<button class="btn primary" id="openMigrationEntry">📋 이관 입력판 열기</button><span id="migrationEntrySummary" class="mini" style="align-self:center"></span>';panel.appendChild(bar);document.getElementById('openMigrationEntry').onclick=openBoard;renderSummary();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();