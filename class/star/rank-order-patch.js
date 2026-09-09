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
      cards.forEach(card => card.querySelector('.rank-one-label')?.remove());

      const indexed = cards.map((card, index) => ({ card, index, score: scoreOf(card) }));
      indexed.sort((a, b) => b.score - a.score || a.index - b.index);

      const current = cards.map(card => card.dataset.student || '').join('|');
      const target = indexed.map(x => x.card.dataset.student || '').join('|');
      if (current !== target) indexed.forEach(({ card }) => grid.appendChild(card));

      const ordered = [...grid.querySelectorAll(':scope > .student')];
      ordered.forEach(card => {
        card.querySelector('.leader-badge')?.setAttribute('hidden', '');
        card.classList.remove('rank-one');
      });

      const first = ordered[0];
      if (first && scoreOf(first) > 0) {
        first.classList.add('rank-one');
        const line = first.querySelector('.student-line');
        if (line) {
          const badge = document.createElement('span');
          badge.className = 'rank-one-label';
          badge.textContent = '1등';
          badge.setAttribute('aria-label', '현재 1등');
          line.insertBefore(badge, line.firstChild);
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
          flex:0 0 auto;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-width:34px;
          height:24px;
          padding:0 7px;
          margin-right:3px;
          border:1px solid rgba(246,196,81,.72);
          border-radius:999px;
          background:rgba(246,196,81,.16);
          color:#ffe18c;
          font-size:11px;
          line-height:1;
          font-weight:1000;
          white-space:nowrap;
          box-shadow:0 0 10px rgba(246,196,81,.10);
        }
        #studentGrid .rank-one{border-color:rgba(246,196,81,.75)!important}
        @media(max-width:760px), (max-width:1024px) and (pointer:coarse){
          #studentGrid .rank-one-label{
            min-width:30px;
            height:22px;
            padding:0 6px;
            font-size:10px;
          }
          #studentGrid .student-line{min-width:0}
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
