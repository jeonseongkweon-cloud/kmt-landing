// STAR DISPLAY PINSET v1.3 — display-only refinements.
// 1) Show up to 10 STARs as 5 + 5.
// 2) Make PC student photos taller (6:5 frame) without changing stored photo data.
(() => {
  const grid = document.getElementById('studentGrid');
  if (!grid) return;

  const style = document.createElement('style');
  style.id = 'starDisplayPinsetV13';
  style.textContent = `
    #studentGrid .star-count{
      display:flex!important;
      flex-direction:column!important;
      align-items:center!important;
      justify-content:center!important;
      gap:2px!important;
      line-height:1!important;
      min-height:48px!important;
      padding-bottom:2px!important;
    }
    #studentGrid .star-count .star-row{
      display:block!important;
      white-space:nowrap!important;
      line-height:1.05!important;
    }
    @media (min-width:761px){
      #studentGrid.student-grid .photo{
        width:100%!important;
        height:auto!important;
        aspect-ratio:6 / 5!important;
        min-height:0!important;
        max-height:none!important;
        border-radius:14px!important;
        object-fit:cover!important;
        object-position:center 35%!important;
      }
    }
  `;
  document.head.appendChild(style);

  const readCount = el => {
    const saved = Number(el.dataset.starCount || 0);
    if (Number.isFinite(saved) && saved > 0) return saved;
    const aria = String(el.getAttribute('aria-label') || '');
    const ariaMatch = aria.match(/(\d+)/);
    if (ariaMatch) return Number(ariaMatch[1]) || 0;
    const raw = String(el.textContent || '').trim();
    const numeric = raw.match(/(\d+)/);
    if (numeric) return Number(numeric[1]) || 0;
    return (raw.match(/⭐/g) || []).length;
  };

  const sync = root => {
    const scope = root instanceof Element ? root : grid;
    const targets = scope.matches?.('.star-count') ? [scope] : [...(scope.querySelectorAll?.('.star-count') || [])];
    targets.forEach(el => {
      const count = Math.max(0, readCount(el));
      const visible = Math.min(count, 10);
      el.dataset.starCount = String(count);
      el.setAttribute('aria-label', `STAR ${count}개`);
      el.title = count > 10 ? `STAR ${count}개 · 화면에는 10개까지 표시` : `STAR ${count}개`;
      el.innerHTML = '';
      for (let start = 0; start < visible; start += 5) {
        const row = document.createElement('span');
        row.className = 'star-row';
        row.textContent = '⭐'.repeat(Math.min(5, visible - start));
        el.appendChild(row);
      }
    });
  };

  sync(grid);
  new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) sync(node);
      }
    }
  }).observe(grid, { childList: true, subtree: true });
})();
