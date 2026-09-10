// 계명태권도 CLASS 회비관리 SYSTEM
// MIGRATION SAFETY GATE v1.0
// 목적: 기존 회비자료 이관이 완료되기 전 과거 월을 임의 미납으로 계산하거나 문자대상으로 올리지 않는다.
(function(){
  const originalLoader = window.KMT_TUITION_LOAD_HOUSEHOLDS;

  // CLASS 실데이터가 들어오면 기본값은 '이관 전'으로 둔다.
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

  // app.js의 전역 함수가 존재할 때만 안전하게 교체한다.
  if (typeof window.overdueMonths === 'function') {
    window.overdueMonths = function(h){
      if (!h || h.status !== 'active' || !h.dueDay) return [];
      // 이관 완료가 명시된 가정만 실제 미납 계산 허용.
      if (h.migrationReady !== true) return [];
      const a = [];
      for (let o = 5; o >= 0; o--) {
        const m = new Date(today.getFullYear(), today.getMonth() - o, 1);
        const k = ym(m);
        const due = dueDateFor(m, h.dueDay);
        if (due && due < today && !(h.payments || {})[k]) a.push(k);
      }
      return a;
    };
  }

  if (typeof window.smsReady === 'function') {
    window.smsReady = function(h){
      if (!h || h.status !== 'active') return false;
      if (h.migrationReady !== true) return false;
      const m = overdueMonths(h);
      if (!m.length) return false;
      const due = dueDateFor(new Date(`${m[0]}-01T00:00:00`), h.dueDay);
      return Math.floor((today - due) / 86400000) >= 7;
    };
  }

  // 사용자에게 현재 안전모드를 명확히 알린다.
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
