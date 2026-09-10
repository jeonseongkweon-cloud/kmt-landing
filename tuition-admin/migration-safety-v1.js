// 계명태권도 CLASS 회비관리 SYSTEM
// MIGRATION SAFETY GATE v1.1
// 회비자료 이관 완료 전에는 과거 월 미납 계산과 문자대상 생성을 금지한다.
(function(){
  const originalLoader = window.KMT_TUITION_LOAD_HOUSEHOLDS;

  if (typeof originalLoader === 'function') {
    window.KMT_TUITION_LOAD_HOUSEHOLDS = function(rows){
      const safeRows = (rows || []).map(h => ({
        ...h,
        migrationReady: h.migrationReady === true,
        payments: h.payments || {},
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
    box.textContent = '⚠️ 회비자료 이관 전 안전모드: 과거 월 미납 계산과 회비 문자대상 생성을 일시 중지합니다.';
    target.appendChild(box);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showSafetyNotice);
  else showSafetyNotice();
})();
