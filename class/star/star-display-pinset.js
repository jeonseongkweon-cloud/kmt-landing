// STAR DISPLAY PINSET v1.4 — display-only refinements.
// PC: show up to 10 STARs as 5 + 5 and keep tall portrait photo frame.
// Mobile: show numeric STAR count only so 3-letter names remain fully readable.
(() => {
  const grid = document.getElementById('studentGrid');
  if (!grid) return;

  const mobileQuery = window.matchMedia('(max-width:760px), (max-width:1024px) and (pointer:coarse)');

  const style = document.createElement('style');
  style.id = 'starDisplayPinsetV14';
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
    @media (min-width:761px) and (pointer:fine){
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
    @media (max-width:760px), (max-width:1024px) and (pointer:coarse){
      #studentGrid .star-main{
        padding:14px 12px!important;
      }
      #studentGrid .star-main h2,
      #studentGrid .student-name{
        display:block!important;
        width:100%!important;
        min-width:0!important;
        margin:0 0 8px!important;
        overflow:visible!important;
        text-overflow:clip!important;
        white-space:nowrap!important;
        font-size:20px!important;
        line-height:1.15!important;
        text-align:left!important;
      }
      #studentGrid .star-count{
        min-height:0!important;
        padding:0!important;
        display:block!important;
        width:auto!important;
        color:#f6c451!important;
        font-size:24px!important;
        font-weight:1000!important;
        line-height:1!important;
        text-align:left!important;
        letter-spacing:0!important;
      }
      #studentGrid .star-count::before{
        content:'STAR ';
        font-size:12px!important;
        color:#9db2c9!important;
        font-weight:900!important;
        vertical-align:middle;
      }
      #studentGrid .leader-badge,
      #studentGrid .rank-one-label,
      #studentGrid .rank-one-crown,
      #studentGrid .rank-one-star{
        display:none!important;
      }
      #studentGrid .student.current-leader,
      #studentGrid .student.rank-one,
      #studentGrid .student.perfect{
        border-color:rgba(255,255,255,.14)!important;
        outline:0!important;
        box-shadow:none!important;
        animation:none!important;
        filter:none!important;
      }
      #studentGrid .student.current-leader::before,
      #studentGrid .student.current-leader::after,
      #studentGrid .student.rank-one::before,
      #studentGrid .student.rank-one::after{
        display:none!important;
      }
    }
  `;
  document.head.appendChild(style);

  const readCount = el => {
    const saved = Number(el.dataset.starCount || 0);
    if (Number.isFinite(saved) && saved >= 0) return saved;
    const aria = String(el.getAttribute('aria-label') || '');
    const ariaMatch = aria.match(/(\d+)/);
    if (ariaMatch) return Number(ariaMatch[1]) || 0;
    const raw = String(el.textContent || '').trim();
    const numeric = raw.match(/(\d+)/);
    if (numeric) return Number(numeric[1]) || 0;
    return (raw.match(/⭐/g) || []).length;
  };

  const paint = el => {
    const count = Math.max(0, readCount(el));
    el.dataset.starCount = String(count);
    el.setAttribute('aria-label', `STAR ${count}개`);

    if (mobileQuery.matches) {
      el.title = `STAR ${count}개`;
      el.textContent = String(count);
      return;
    }

    const visible = Math.min(count, 10);
    el.title = count > 10 ? `STAR ${count}개 · 화면에는 10개까지 표시` : `STAR ${count}개`;
    el.innerHTML = '';
    for (let start = 0; start < visible; start += 5) {
      const row = document.createElement('span');
      row.className = 'star-row';
      const rowSize = Math.min(5, visible - start);
      for (let index = 0; index < rowSize; index += 1) {
        const star = document.createElement('span');
        star.className = 'star-item';
        star.textContent = '⭐';
        row.appendChild(star);
      }
      el.appendChild(row);
    }
  };

  const sync = root => {
    const scope = root instanceof Element ? root : grid;
    const targets = scope.matches?.('.star-count') ? [scope] : [...(scope.querySelectorAll?.('.star-count') || [])];
    targets.forEach(paint);
  };

  sync(grid);
  new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) sync(node);
      }
    }
  }).observe(grid, { childList: true, subtree: true });

  mobileQuery.addEventListener?.('change', () => sync(grid));
})();
