// 계명태권도 CLASS 회비관리 SYSTEM
// 울산페이 결제자(가려진 이름) ↔ 실제 수련생 연결표 v1.1
// 목적: 울산페이에 '김*민'처럼 일부 글자만 보일 때 실제 수련생을 빠르게 찾는다.
// 저장: 현재 브라우저 localStorage. Supabase/운영 DB에는 아직 쓰지 않는다.
(function(){
  const KEY='kmt_tuition_payer_aliases_v1';
  const SOURCE_NOTE='2026-09-10 수기메모 5장';
  let aliases=[];
  try{ aliases=JSON.parse(localStorage.getItem(KEY)||'[]'); if(!Array.isArray(aliases)) aliases=[]; }catch{aliases=[];}
  aliases=aliases.map(a=>({...a,status:a.status||'confirmed'}));

  const norm=s=>String(s||'').replace(/\s/g,'').toLowerCase();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const roster=()=>Array.from(new Set((window.KMT_TUITION_LATEST_ROSTER_2026?.activeStudents||[]))).sort((a,b)=>a.localeCompare(b,'ko'));
  function save(){localStorage.setItem(KEY,JSON.stringify(aliases));}
  function find(q,status='all'){const n=norm(q);return aliases.filter(a=>(status==='all'||a.status===status)&&(!n||norm(a.payer).includes(n)||norm(a.students.join(',')).includes(n)||norm(a.memo).includes(n)));}

  function renderList(q=''){
    const box=document.getElementById('payerAliasList'); if(!box)return;
    const status=document.getElementById('payerAliasFilter')?.value||'all';
    const list=find(q,status);
    box.innerHTML=list.length?list.map(a=>`<div class="payer-alias-row" data-id="${a.id}"><div><b>${esc(a.payer)}</b> → <strong>${esc(a.students.join(' · '))}</strong> <span class="payer-status ${a.status==='review'?'review':'confirmed'}">${a.status==='review'?'확인필요':'확정'}</span><div class="mini">${esc(a.memo||'')}${a.source?` · ${esc(a.source)}`:''}</div></div><div><button class="btn" data-edit="${a.id}">수정</button> <button class="btn" data-del="${a.id}">삭제</button></div></div>`).join(''):'<div class="mini">조건에 맞는 결제자 연결정보가 없습니다.</div>';
    box.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{if(!confirm('이 연결정보를 삭제할까요?'))return;aliases=aliases.filter(a=>a.id!==b.dataset.del);save();renderList(document.getElementById('payerAliasSearch')?.value||'');});
    box.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editAlias(b.dataset.edit));
    const count=document.getElementById('payerAliasCount');if(count)count.textContent=`전체 ${aliases.length}건 · 확정 ${aliases.filter(a=>a.status==='confirmed').length}건 · 확인필요 ${aliases.filter(a=>a.status==='review').length}건`;
  }

  function parseStudents(raw){return raw.split(/[,·]/).map(x=>x.trim()).filter(Boolean);}
  function upsert(){
    const payer=document.getElementById('payerAliasPayer').value.trim();
    const students=parseStudents(document.getElementById('payerAliasStudents').value);
    const memo=document.getElementById('payerAliasMemo').value.trim();
    const status=document.getElementById('payerAliasStatus').value;
    const id=document.getElementById('payerAliasEditId').value;
    if(!payer||!students.length){alert('가려진 결제자 이름과 실제 수련생 이름을 입력해주세요.');return;}
    const unknown=students.filter(s=>!roster().includes(s));
    if(unknown.length&&!confirm(`${unknown.join(', ')} 은(는) 최신 수련생 명단에서 확인되지 않습니다. 그래도 저장할까요?`))return;
    const item={id:id||`pa-${Date.now()}`,payer,students,memo,status,source:SOURCE_NOTE,updatedAt:new Date().toISOString()};
    const i=aliases.findIndex(a=>a.id===item.id); if(i>=0)aliases[i]=item;else aliases.unshift(item);
    save(); clearForm(); renderList(document.getElementById('payerAliasSearch')?.value||'');
  }
  function editAlias(id){const a=aliases.find(x=>x.id===id);if(!a)return;document.getElementById('payerAliasEditId').value=a.id;document.getElementById('payerAliasPayer').value=a.payer;document.getElementById('payerAliasStudents').value=a.students.join(', ');document.getElementById('payerAliasMemo').value=a.memo||'';document.getElementById('payerAliasStatus').value=a.status||'confirmed';document.getElementById('payerAliasSave').textContent='연결정보 수정 저장';document.getElementById('payerAliasPayer').focus();}
  function clearForm(){document.getElementById('payerAliasEditId').value='';document.getElementById('payerAliasPayer').value='';document.getElementById('payerAliasStudents').value='';document.getElementById('payerAliasMemo').value='';document.getElementById('payerAliasStatus').value='confirmed';document.getElementById('payerAliasSave').textContent='새 연결 등록';}

  function exportBackup(){
    const data={version:1,exportedAt:new Date().toISOString(),aliases};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`ulsanpay-alias-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  function importBackup(file){
    if(!file)return;const r=new FileReader();r.onload=()=>{try{const parsed=JSON.parse(r.result);const list=Array.isArray(parsed)?parsed:parsed.aliases;if(!Array.isArray(list))throw new Error();if(!confirm(`${list.length}건을 불러옵니다. 같은 ID는 덮어쓰고 나머지는 추가할까요?`))return;const map=new Map(aliases.map(a=>[a.id,a]));list.forEach(a=>{if(a&&a.id&&a.payer&&Array.isArray(a.students))map.set(a.id,{...a,status:a.status||'confirmed'});});aliases=[...map.values()];save();renderList(document.getElementById('payerAliasSearch')?.value||'');alert('연결표 백업을 불러왔습니다.');}catch{alert('올바른 연결표 JSON 파일이 아닙니다.');}};r.readAsText(file,'utf-8');
  }

  function appendQuickResult(){
    const input=document.getElementById('ulsanInput'), out=document.getElementById('ulsanResult'); if(!input||!out)return;
    const q=input.value.trim(); if(!q)return;
    const list=find(q).sort((a,b)=>(a.status==='confirmed'?0:1)-(b.status==='confirmed'?0:1)); if(!list.length)return;
    const old=out.querySelector('.payer-alias-quick'); if(old)old.remove();
    const d=document.createElement('div'); d.className='payer-alias-quick'; d.style.marginTop='10px';
    d.innerHTML=`<div class="mini"><b>저장된 결제자 연결표</b></div>${list.slice(0,8).map(a=>`<button class="candidate" type="button"><b>${esc(a.payer)} → ${esc(a.students.join(' · '))}</b><span class="mini">${a.status==='review'?'⚠ 확인필요 · ':''}${esc(a.memo||'등록된 수기메모 연결')}</span></button>`).join('')}`;
    out.appendChild(d);
  }

  function mount(){
    if(document.getElementById('payerAliasCard'))return;
    const quick=document.querySelector('.layout .card:nth-child(2)'); if(!quick)return;
    const wrap=document.createElement('div');wrap.id='payerAliasCard';wrap.style.marginTop='18px';
    wrap.innerHTML=`<hr style="border:0;border-top:1px solid var(--line);margin:18px 0"><h2 class="section-title">🔗 울산페이 이름 연결표</h2><div class="mini">가려진 결제자 이름을 실제 수련생과 연결합니다. 확실하지 않은 수기메모는 ‘확인필요’로 보관할 수 있습니다.</div><input type="hidden" id="payerAliasEditId"><div class="field" style="margin-top:10px"><label>울산페이에 보이는 이름</label><input id="payerAliasPayer" placeholder="예: 김*민"></div><div class="field" style="margin-top:8px"><label>연결할 실제 수련생</label><input id="payerAliasStudents" list="payerAliasStudentList" placeholder="예: 김민규 또는 김민규, 김나라"><datalist id="payerAliasStudentList">${roster().map(n=>`<option value="${esc(n)}">`).join('')}</datalist></div><div class="field" style="margin-top:8px"><label>확정 상태</label><select id="payerAliasStatus"><option value="confirmed">확정</option><option value="review">확인필요</option></select></div><div class="field" style="margin-top:8px"><label>메모(선택)</label><input id="payerAliasMemo" placeholder="예: 어머니 / 형제 합산 / 30만원"></div><div class="toolbar"><button class="btn primary" id="payerAliasSave" type="button">새 연결 등록</button><button class="btn" id="payerAliasCancel" type="button">입력 취소</button></div><div class="toolbar"><button class="btn" id="payerAliasExport" type="button">연결표 백업 내보내기</button><button class="btn" id="payerAliasImportBtn" type="button">백업 불러오기</button><input id="payerAliasImport" type="file" accept="application/json,.json" hidden></div><div class="field" style="margin-top:14px"><label>등록된 연결표 검색</label><input id="payerAliasSearch" placeholder="결제자 또는 수련생 이름 검색"></div><div class="toolbar" style="margin-top:8px"><select id="payerAliasFilter" class="btn"><option value="all">전체 보기</option><option value="confirmed">확정만</option><option value="review">확인필요만</option></select><span id="payerAliasCount" class="mini" style="align-self:center"></span></div><div id="payerAliasList" style="margin-top:8px"></div><p class="mini">※ 현재는 브라우저 임시저장입니다. 백업 JSON으로 별도 보관할 수 있고, Supabase 영구저장은 다음 단계에서 연결합니다.</p>`;
    quick.appendChild(wrap);
    const style=document.createElement('style');style.textContent='.payer-alias-row{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--line)}.payer-status{display:inline-block;padding:2px 6px;border-radius:999px;font-size:11px;font-weight:800}.payer-status.confirmed{background:var(--ok)}.payer-status.review{background:var(--warn)}';document.head.appendChild(style);
    document.getElementById('payerAliasSave').onclick=upsert;document.getElementById('payerAliasCancel').onclick=clearForm;document.getElementById('payerAliasSearch').oninput=e=>renderList(e.target.value);document.getElementById('payerAliasFilter').onchange=()=>renderList(document.getElementById('payerAliasSearch').value);document.getElementById('payerAliasExport').onclick=exportBackup;document.getElementById('payerAliasImportBtn').onclick=()=>document.getElementById('payerAliasImport').click();document.getElementById('payerAliasImport').onchange=e=>importBackup(e.target.files?.[0]);renderList();
    const f=document.getElementById('ulsanFind'); if(f)f.addEventListener('click',()=>setTimeout(appendQuickResult,0));
    const u=document.getElementById('ulsanInput'); if(u)u.addEventListener('keydown',e=>{if(e.key==='Enter')setTimeout(appendQuickResult,0)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();