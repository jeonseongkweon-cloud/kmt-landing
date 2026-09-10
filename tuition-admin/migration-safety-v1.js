// 계명태권도 CLASS 회비관리 SYSTEM
// MIGRATION SAFETY GATE v1.1
// 목적: 기존 회비자료 이관 완료 전 과거 월을 미납으로 계산하거나 문자대상으로 올리지 않는다.
(function(){
  const originalLoader = window.KMT_TUITION_LOAD_HOUSEHOLDS;
  const originalOpenSms = window.openSms;

  // CLASS 실데이터는 기본적으로 '이관 전' 상태로 로딩한다.
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

  // 이관 완료가 명시되지 않은 가정은 미납 계산을 절대 하지 않는다.
  if (typeof window.overdueMonths === 'function') {
    const originalOverdueMonths = window.overdueMonths;
    window.overdueMonths = function(h){
      if (!h || h.status !== 'active' || !h.dueDay) return [];
      if (h.migrationReady !== true) return [];
      return originalOverdueMonths(h);
    };
  }

  // 이관 전 가정은 대시보드에서 '이관대기'로 명확히 표시한다.
  if (typeof window.statusOf === 'function') {
    const originalStatusOf = window.statusOf;
    window.statusOf = function(h){
      if (h && h.status === 'active' && h.migrationReady !== true) {
        return {kind:'info', label:'이관대기'};
      }
      return originalStatusOf(h);
    };
  }

  // 이관 전 가정은 문자대상 계산에서 무조건 제외한다.
  if (typeof window.smsReady === 'function') {
    const originalSmsReady = window.smsReady;
    window.smsReady = function(h){
      if (!h || h.migrationReady !== true) return false;
      return originalSmsReady(h);
    };
  }

  // 상세화면의 문자 버튼을 직접 눌러도 이관 전에는 열리지 않게 차단한다.
  if (typeof originalOpenSms === 'function') {
    window.openSms = function(id){
      try {
        const h = (window.KMT_TUITION_GET_HOUSEHOLDS?.() || []).find(x => x.id === id);
        if (h && h.migrationReady !== true) {
          alert('회비자료 이관이 완료되기 전에는 회비 안내 문자를 준비할 수 없습니다.');
          return;
        }
      } catch (_) {}
      return originalOpenSms(id);
    };
  }

  function showSafetyNotice(){
    if (document.getElementById('migrationSafetyNotice')) return;
    const target = document.querySelector('.top');
    if (!target) return;
    const box = document.createElement('div');
    box.id = 'migrationSafetyNotice';
    box.style.cssText = 'margin-top:8px;padding:10px 12px;border-radius:12px;background:#fff7df;border:1px solid #f2d98d;font-size:13px;font-weight:800;color:#6b5200';
    box.textContent = '⚠️ 회비자료 이관 전 안전모드: 기존 회비장부 확인이 끝날 때까지 과거 미납 계산과 회비 문자대상 생성을 중지합니다.';
    target.appendChild(box);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showSafetyNotice);
  else showSafetyNotice();
})();
