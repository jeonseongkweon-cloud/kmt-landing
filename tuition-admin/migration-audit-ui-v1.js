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
    const current=audit.currentWithoutLegacyLedger||[];
    const review=audit.legacyNotInCurrentReview||[];
    const virtual=audit.excludedVirtualStudents||[];
    const withdrawn=audit.legacyKnownWithdrawn||[];
    box.innerHTML=`
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap">
        <div>
          <h2 class="section-title" style="margin-bottom:4px">🔎 회비자료 이관 점검</h2>
          <div class="mini">미납 판정과 문자발송에는 아직 사용하지 않는 검토용 정보입니다.</div>
        </div>
        <span class="badge info">이관 안전모드</span>
      </div>
      <div class="grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:0">
        <div class="card"><span class="mini">현재 CLASS · 기존장부 미연결</span><b style="display:block;font-size:24px;margin-top:4px">${current.length}명</b></div>
        <div class="card"><span class="mini">과거장부 · 현재 CLASS 확인필요</span><b style="display:block;font-size:24px;margin-top:4px">${review.length}명</b></div>
        <div class="card"><span class="mini">퇴관 확정 과거가정</span><b style="display:block;font-size:24px;margin-top:4px">${withdrawn.length}가정</b></div>
        <div class="card"><span class="mini">가상 원생 제외</span><b style="display:block;font-size:24px;margin-top:4px">${virtual.length}명</b></div>
      </div>
      <details style="margin-top:12px"><summary style="cursor:pointer;font-weight:800">현재 CLASS에 있으나 기존 엑셀 장부와 미연결 ${current.length}명</summary><div class="mini" style="line-height:1.8;margin-top:8px">${current.join(' · ')}</div></details>
      <details style="margin-top:10px"><summary style="cursor:pointer;font-weight:800">기존 장부에는 있으나 현재 CLASS에서 확인이 필요한 ${review.length}명</summary><div class="mini" style="line-height:1.8;margin-top:8px">${review.join(' · ')}</div></details>
      <details style="margin-top:10px"><summary style="cursor:pointer;font-weight:800">가상 원생 제외 내역</summary><div class="mini" style="line-height:1.8;margin-top:8px">${virtual.map(v=>`${v.name} — ${v.reason}`).join('<br>')}</div></details>
    `;
    layout.parentNode.insertBefore(box,layout);
  });
})();
