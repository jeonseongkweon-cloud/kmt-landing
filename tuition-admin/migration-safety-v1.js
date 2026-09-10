// 계명태권도 CLASS 회비관리 SYSTEM
// MIGRATION SAFETY GATE v1.2
// 회비자료 이관 완료 전에는 과거 월을 임시 '이관보호' 처리하여 허위 미납/문자대상을 차단한다.
(function(){
  const originalLoader = window.KMT_TUITION_LOAD_HOUSEHOLDS;
  const TODAY = new Date('2026-09-10T09:00:00+09:00');

  function ym(d){
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }
  function dueDateFor(m,day){
    if(!day) return null;
    const last = new Date(m.getFullYear(), m.getMonth()+1, 0).getDate();
    return new Date(m.getFullYear(), m.getMonth(), Math.min(day,last), 23,59,59);
  }
  function protectedPayments(h){
    const payments = {...(h.payments||{})};
    if(h.migrationReady === true || h.status !== 'active' || !h.dueDay) return payments;
    for(let o=5;o>=0;o--){
      const m = new Date(TODAY.getFullYear(), TODAY.getMonth()-o, 1);
      const k = ym(m);
      const due = dueDateFor(m,h.dueDay);
      if(due && due < TODAY && !payments[k]){
        payments[k] = {
          paidOn:'',
          amount:0,
          method:'이관보호',
          migrationPlaceholder:true,
          memo:'회비자료 이관 전 허위 미납 방지용 임시 처리'
        };
      }
    }
    return payments;
  }

  if (typeof originalLoader === 'function') {
    window.KMT_TUITION_LOAD_HOUSEHOLDS = function(rows){
      const safeRows = (rows || []).map(h => ({
        ...h,
        migrationReady: h.migrationReady === true,
        payments: protectedPayments(h),
        messages: h.messages || [],
        dueHistory: h.dueHistory || []
      }));
      return originalLoader(safeRows);
    };
  }

  function showSafetyNotice(){
    if (document.getElementById('migrationSafetyNotice')) return;
    const target = document.querySelector('.top');
    if (!target) return;
    const box = document.createElement('div');
    box.id = 'migrationSafetyNotice';
    box.style.cssText = 'margin-top:8px;padding:10px 12px;border-radius:12px;background:#fff7df;border:1px solid #f2d98d;font-size:13px;font-weight:800;color:#6b5200';
    box.textContent = '⚠️ 회비자료 이관 전 안전모드: 과거 월은 미납으로 계산하지 않으며 회비 문자대상 생성도 중지합니다.';
    target.appendChild(box);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showSafetyNotice);
  else showSafetyNotice();
})();
