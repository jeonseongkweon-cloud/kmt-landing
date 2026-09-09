(() => {
  let scheduled = false;
  let applying = false;

  const scoreOf = card => {
    const text = card.querySelector('.star-count')?.textContent || '';
    const match = text.match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  };

  function applyStarRanking() {
    if (applying) return;
    const grid = document.getElementById('studentGrid');
    if (!grid) return;

    const cards = [...grid.querySelectorAll(':scope > .student')];
    if (!cards.length) return;

    applying = true;
    try {
      cards.forEach(card => {
        card.querySelectorAll('.leader-badge').forEach(el => el.remove());
        card.querySelectorAll('.rank-one-label').forEach(el => el.remove());
        card.classList.remove('rank-one');
      });

      const indexed = cards.map((card, index) => ({ card, index, score: scoreOf(card) }));
      indexed.sort((a, b) => b.score - a.score || a.index - b.index);

      const current = cards.map(card => card.dataset.student || '').join('|');
      const target = indexed.map(x => x.card.dataset.student || '').join('|');
      if (current !== target) indexed.forEach(({ card }) => grid.appendChild(card));

      const ordered = [...grid.querySelectorAll(':scope > .student')];
      const first = ordered[0];
      if (first && scoreOf(first) > 0) {
        first.classList.add('rank-one');
        const line = first.querySelector('.student-line');
        const name = line?.querySelector('h2');
        if (line && name) {
          const badge = document.createElement('span');
          badge.className = 'rank-one-label';
          badge.textContent = '1등';
          badge.setAttribute('aria-label', '현재 1등');
          name.insertAdjacentElement('afterend', badge);
        }
      }
    } finally {
      applying = false;
    }
  }

  function scheduleRanking() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyStarRanking();
    });
  }

  function mount() {
    const grid = document.getElementById('studentGrid');
    if (!grid) {
      setTimeout(mount, 120);
      return;
    }

    if (!document.getElementById('starRankOrderStyle')) {
      const style = document.createElement('style');
      style.id = 'starRankOrderStyle';
      style.textContent = `
        #studentGrid .leader-badge{display:none!important}
        #studentGrid .rank-one-label{
          flex:0 0 auto!important;
          display:inline-flex!important;
          align-items:center!important;
          justify-content:center!important;
          min-width:38px!important;
          height:24px!important;
          padding:0 8px!important;
          margin-left:7px!important;
          border:1px solid rgba(246,196,81,.9)!important;
          border-radius:999px!important;
          background:#7a5600!important;
          color:#fff3a6!important;
          font-size:12px!important;
          line-height:1!important;
          font-weight:1000!important;
          white-space:nowrap!important;
          box-shadow:0 0 12px rgba(246,196,81,.3)!important;
        }
        #studentGrid .rank-one{border-color:rgba(246,196,81,.85)!important;box-shadow:0 0 0 1px rgba(246,196,81,.25),0 0 18px rgba(246,196,81,.12)!important}
        @media(max-width:760px), (max-width:1024px) and (pointer:coarse){
          #studentGrid .rank-one-label{
            min-width:36px!important;
            height:24px!important;
            padding:0 7px!important;
            margin-left:6px!important;
            font-size:12px!important;
          }
          #studentGrid .student-line{min-width:0!important;display:flex!important;align-items:center!important}
          #studentGrid .student-line h2{display:block!important;min-width:0!important}
        }
      `;
      document.head.appendChild(style);
    }

    new MutationObserver(scheduleRanking).observe(grid, {
      childList: true,
      subtree: true,
      characterData: true
    });
    scheduleRanking();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
