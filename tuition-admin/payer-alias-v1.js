// 계명태권도 CLASS 회비관리 SYSTEM
// 울산페이 결제자(가려진 이름) ↔ 실제 수련생 연결표 v1.0
// 목적: 울산페이에 '김*민'처럼 일부 글자만 보일 때 실제 수련생을 빠르게 찾는다.
// 저장: 현재 브라우저 localStorage. Supabase/운영 DB에는 아직 쓰지 않는다.
(function(){
  const KEY='kmt_tuition_payer_aliases_v1';
  const SOURCE_NOTE='2026-09-10 수기메모 5장';
  let aliases=[];
  try{ aliases=JSON.parse(localStorage.getItem(KEY)||'[]'); if(!Array.isArray(aliases)) aliases=[]; }catch{aliases=[];}

  const norm=s=>String(s||'').replace(/\s/g,'').toLowerCase();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const roster=()=>Array.from(new Set((window.KMT_TUITION_LATEST_ROSTER_2026?.activeStudents||[]))).sort((a,b)=>a.localeCompare(b,'ko'));
  function save(){localStorage.setItem(KEY,JSON.stringify(aliases));}
  function find(q){const n=norm(q);return aliases.filter(a=>!n||norm(a.payer).includes(n)||norm(a.students.join(',')).includes(n)||norm(a.memo).includes(n));}

  function renderList(q=''){
    const box=document.getElementById('payerAliasList'); if(!box)return;
    const list=find(q);
    box.innerHTML=list.length?list.map(a=>`<div class="payer-alias-row" data-id="${a.id}"><div><b>${esc(a.payer)}</b> → <strong>${esc(a.students.join(' · '))}</strong><div class="mini">${esc(a.memo||'')}${a.source?` · ${esc(a.source)}`:''}</div></div><div><button class="btn" data-edit="${a.id}">수정</button> <button class="btn" data-del="${a.id}">삭제</button></div></div>`).join(''):'<div class="mini">등록된 결제자 연결정보가 없습니다.</div>';
    box.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{if(!confirm('이 연결정보를 삭제할까요?'))return;aliases=aliases.filter(a=>a.id!==b.dataset.del);save();renderList(document.getElementById('payerAliasSearch')?.value||'');});
    box.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editAlias(b.dataset.edit));
  }

  function parseStudents(raw){return raw.split(/[,·]/).map(x=>x.trim()).filter(Boolean);}
  function upsert(){
    const payer=document.getElementById('payerAliasPayer').value.trim();
    const students=parseStudents(document.getElementById('payerAliasStudents').value);
    const memo=document.getElementById('payerAliasMemo').value.trim();
    const id=document.getElementById('payerAliasEditId').value;
    if(!payer||!students.length){alert('가려진 결제자 이름과 실제 수련생 이름을 입력해주세요.');return;}
    const unknown=students.filter(s=>!roster().includes(s));
    if(unknown.length&&!confirm(`${unknown.join(', ')} 은(는) 최신 수련생 명단에서 확인되지 않습니다. 그래도 저장할까요?`))return;
    const item={id:id||`pa-${Date.now()}`,payer,students,memo,source:SOURCE_NOTE,updatedAt:new Date().toISOString()};
    const i=aliases.findIndex(a=>a.id===item.id); if(i>=0)aliases[i]=item;else aliases.unshift(item);
    save(); clearForm(); renderList(document.getElementById('payerAliasSearch')?.value||'');
  }
  function editAlias(id){const a=aliases.find(x=>x.id===id);if(!a)return;document.getElementById('payerAliasEditId').value=a.id;document.getElementById('payerAliasPayer').value=a.payer;document.getElementById('payerAliasStudents').value=a.students.join(', ');document.getElementById('payerAliasMemo').value=a.memo||'';document.getElementById('payerAliasSave').textContent='연결정보 수정 저장';document.getElementById('payerAliasPayer').focus();}
  function clearForm(){document.getElementById('payerAliasEditId').value='';document.getElementById('payerAliasPayer').value='';document.getElementById('payerAliasStudents').value='';document.getElementById('payerAliasMemo').value='';document.getElementById('payerAliasSave').textContent='새 연결 등록';}

  function appendQuickResult(){
    const input=document.getElementById('ulsanInput'), out=document.getElementById('ulsanResult'); if(!input||!out)return;
    const q=input.value.trim(); if(!q)return;
    const list=find(q); if(!list.length)return;
    const old=out.querySelector('.payer-alias-quick'); if(old)old.remove();
    const d=document.createElement('div'); d.className='payer-alias-quick'; d.style.marginTop='10px';
    d.innerHTML=`<div class="mini"><b>저장된 결제자 연결표</b></div>${list.slice(0,8).map(a=>`<button class="candidate" type="button"><b>${esc(a.payer)} → ${esc(a.students.join(' · '))}</b><span class="mini">${esc(a.memo||'등록된 수기메모 연결')}</span></button>`).join('')}`;
    out.appendChild(d);
  }

  function mount(){
    if(document.getElementById('payerAliasCard'))return;
    const quick=document.querySelector('.layout .card:nth-child(2)'); if(!quick)return;
    const wrap=document.createElement('div');wrap.id='payerAliasCard';wrap.style.marginTop='18px';
    wrap.innerHTML=`<hr style="border:0;border-top:1px solid var(--line);margin:18px 0"><h2 class="section-title">🔗 울산페이 이름 연결표</h2><div class="mini">수기메모처럼 결제자 이름 일부만 보일 때 실제 수련생과 연결합니다. 지금부터 새 이름도 직접 계속 추가할 수 있습니다.</div><input type="hidden" id="payerAliasEditId"><div class="field" style="margin-top:10px"><label>울산페이에 보이는 이름</label><input id="payerAliasPayer" placeholder="예: 김*민"></div><div class="field" style="margin-top:8px"><label>연결할 실제 수련생</label><input id="payerAliasStudents" list="payerAliasStudentList" placeholder="예: 김민규 또는 김민규, 김나라"><datalist id="payerAliasStudentList">${roster().map(n=>`<option value="${esc(n)}">`).join('')}</datalist></div><div class="field" style="margin-top:8px"><label>메모(선택)</label><input id="payerAliasMemo" placeholder="예: 어머니 / 형제 합산 / 30만원"></div><div class="toolbar"><button class="btn primary" id="payerAliasSave" type="button">새 연결 등록</button><button class="btn" id="payerAliasCancel" type="button">입력 취소</button></div><div class="field" style="margin-top:14px"><label>등록된 연결표 검색</label><input id="payerAliasSearch" placeholder="결제자 또는 수련생 이름 검색"></div><div id="payerAliasList" style="margin-top:8px"></div><p class="mini">※ 현재는 브라우저에 안전 임시저장합니다. 수기메모 사진은 참고자료이고, 읽기 애매한 글씨는 임의 확정하지 않습니다.</p>`;
    quick.appendChild(wrap);
    const style=document.createElement('style');style.textContent='.payer-alias-row{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--line)}';document.head.appendChild(style);
    document.getElementById('payerAliasSave').onclick=upsert;document.getElementById('payerAliasCancel').onclick=clearForm;document.getElementById('payerAliasSearch').oninput=e=>renderList(e.target.value);renderList();
    const f=document.getElementById('ulsanFind'); if(f)f.addEventListener('click',()=>setTimeout(appendQuickResult,0));
    const u=document.getElementById('ulsanInput'); if(u)u.addEventListener('keydown',e=>{if(e.key==='Enter')setTimeout(appendQuickResult,0)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();