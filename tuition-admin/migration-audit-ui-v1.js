(function(){
  const audit=window.KMT_TUITION_MIGRATION_AUDIT;
  if(!audit) return;
  function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }
  ready(()=>{
    const wrap=document.querySelector('.wrap');
    const layout=document.querySelector('.layout');
    if(!wrap||!layout) return;
    const box=document.createElement('div');
    box.className='card';
    box.id='migrationAuditPanel';
    box.style.margin='14px 0';
    const latest=window.KMT_TUITION_LATEST_ROSTER_2026||{};
    const current=audit.currentWithoutLegacyLedger||[];
    const rosterOnly=audit.latestRosterOnlyNotClass||[];
    const virtual=audit.excludedVirtualStudents||[];
    const groups=audit.currentGapGroups||{};
    const likely=groups.likely2026NewOrLedgerGap||[];
    const existing=groups.existingBefore2026||[];
    const autoReview=groups.autoMatchedNeedReview||[];
    const evidence=audit.currentGapEvidence||{};
    const latestCount=(latest.activeStudents||[]).length;
    const classLinked=Math.max(0,latestCount-rosterOnly.length);
    const fmt=e=>{
      const bits=[];
      if(e?.match) bits.push(e.match);
      if(e?.joined) bits.push(`등록 ${e.joined}`);
      if(e?.feeDueDay!=null) bits.push(`납부일 ${e.feeDueDay}일`);
      if(e?.monthlyFee) bits.push(`${Number(e.monthlyFee).toLocaleString('ko-KR')}원`);
      if(e?.review) bits.push(e.review);
      return bits.join(' · ');
    };
    const rows=names=>names.map(n=>`<div style="padding:5px 0"><b>${n}</b><span class="mini"> — ${fmt(evidence[n])||'추가 확인'}</span></div>`).join('');
    box.innerHTML=`
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap">
        <div>
          <h2 class="section-title" style="margin-bottom:4px">🔎 회비자료 이관 점검</h2>
          <div class="mini">최신 2026 회비대장의 비회색 수련생만 기준으로 합니다. 회색 글자는 현재 관리대상에 반영하지 않습니다.</div>
        </div>
        <span class="badge info">이관 안전모드</span>
      </div>
      <div class="grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:0">
        <div class="card ok"><span class="mini">최신 회비대장 수련생</span><b style="display:block;font-size:24px;margin-top:4px">${latestCount}명</b></div>
        <div class="card"><span class="mini">CLASS 연결</span><b style="display:block;font-size:24px;margin-top:4px">${classLinked}명</b></div>
        <div class="card warn"><span class="mini">현재 장부 미연결</span><b style="display:block;font-size:24px;margin-top:4px">${current.length}명</b></div>
        <div class="card info"><span class="mini">최신명단 · CLASS 미등록</span><b style="display:block;font-size:24px;margin-top:4px">${rosterOnly.length}명</b></div>
      </div>
      <div class="grid" style="grid-template-columns:repeat(3,1fr);margin:10px 0 0">
        <div class="card warn"><span class="mini">2026 신규/장부누락 후보</span><b style="display:block;font-size:22px;margin-top:4px">${likely.length}명</b></div>
        <div class="card info"><span class="mini">2026 이전 등록 · 장부미연결</span><b style="display:block;font-size:22px;margin-top:4px">${existing.length}명</b></div>
        <div class="card muted"><span class="mini">자동일치지만 장부 확인필요</span><b style="display:block;font-size:22px;margin-top:4px">${autoReview.length}명</b></div>
      </div>
      <details style="margin-top:12px"><summary style="cursor:pointer;font-weight:800">2026 신규/장부누락 후보 ${likely.length}명</summary><div style="margin-top:8px">${rows(likely)}</div></details>
      <details style="margin-top:10px"><summary style="cursor:pointer;font-weight:800">2026 이전 등록인데 기존 장부 미연결 ${existing.length}명</summary><div style="margin-top:8px">${rows(existing)}</div></details>
      <details style="margin-top:10px"><summary style="cursor:pointer;font-weight:800">자동일치지만 기존 장부 확인필요 ${autoReview.length}명</summary><div style="margin-top:8px">${rows(autoReview)}</div></details>
      <details style="margin-top:10px"><summary style="cursor:pointer;font-weight:800">최신명단에는 있으나 CLASS에 없는 ${rosterOnly.length}명</summary><div style="margin-top:8px">${rows(rosterOnly)}</div></details>
      <details style="margin-top:10px"><summary style="cursor:pointer;font-weight:800">가상 원생 제외 내역</summary><div class="mini" style="line-height:1.8;margin-top:8px">${virtual.map(v=>`${v.name} — ${v.reason}`).join('<br>')}</div></details>
      <div class="mini" style="margin-top:12px">※ 회색 글자와 최신 명단에 없는 학생은 현재 회비관리 대상에서 제외하지만 과거 장부 원본 자체는 삭제하지 않습니다.</div>
    `;
    layout.parentNode.insertBefore(box,layout);
  });
})();
(function(){
  const s=document.createElement('script');
  s.src='./migration-entry-helper-v1.js?v=1';
  s.defer=true;
  document.head.appendChild(s);
  const v=document.createElement('script');
  v.src='./migration-verification-helper-v1.js?v=1';
  v.defer=true;
  document.head.appendChild(v);
})();
