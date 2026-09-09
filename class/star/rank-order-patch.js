(() => {
  let scheduled = false;
  let applying = false;
  const mobileQuery = matchMedia('(max-width:760px), (max-width:1024px) and (pointer:coarse)');

  const scoreOf = card => {
    const text = card.querySelector('.star-count')?.textContent || '';
    const match = text.match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  };

  function clearRankMarks(card) {
    card.querySelectorAll('.leader-badge,.rank-one-label,.rank-one-crown').forEach(el => el.remove());
    card.classList.remove('rank-one');
  }

  function applyStarRanking() {
    if (applying) return;
    const grid = document.getElementById('studentGrid');
    if (!grid) return;
    const cards = [...grid.querySelectorAll(':scope > .student')];
    if (!cards.length) return;

    applying = true;
    try {
      cards.forEach(clearRankMarks);

      const indexed = cards.map((card, index) => ({ card, index, score: scoreOf(card) }));
      indexed.sort((a, b) => b.score - a.score || a.index - b.index);

      const current = cards.map(card => card.dataset.student || '').join('|');
      const target = indexed.map(x => x.card.dataset.student || '').join('|');
      if (current !== target) indexed.forEach(({ card }) => grid.appendChild(card));

      /* 모바일은 순위대로 정렬만 하고 왕관/1등 표시는 전혀 넣지 않는다. */
      if (mobileQuery.matches) return;

      /* PC/노트북에서만 1등을 확실하게 표시한다. */
      const first = grid.querySelector(':scope > .student');
      if (first && scoreOf(first) > 0) {
        first.classList.add('rank-one');
        const line = first.querySelector('.student-line');
        const name = line?.querySelector('h2');
        if (line && name) {
          const crown = document.createElement('span');
          crown.className = 'rank-one-crown';
          crown.textContent = '👑';
          crown.setAttribute('aria-label', '현재 1등');
          name.insertAdjacentElement('beforebegin', crown);

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
        /* 기존 렌더러가 만드는 왕관은 모든 화면에서 제거 */
        #studentGrid .leader-badge{display:none!important}

        /* 모바일: 아이 이름/별만 보이고 순위 표시는 완전히 숨김 */
        @media(max-width:760px), (max-width:1024px) and (pointer:coarse){
          #studentGrid .rank-one-label,
          #studentGrid .rank-one-crown{display:none!important}
          #studentGrid .rank-one{border-color:inherit!important;box-shadow:inherit!important;animation:none!important}
        }

        /* PC/노트북: 1등을 왕관 + 1등 라벨 + 금빛 테두리로 확실하게 표시 */
        @media(min-width:761px) and (pointer:fine){
          #studentGrid .rank-one{
            position:relative!important;
            z-index:4!important;
            border-color:#ffd84d!important;
            box-shadow:0 0 0 2px rgba(255,216,77,.88),0 0 24px rgba(255,203,55,.55),0 0 46px rgba(255,164,32,.20)!important;
            animation:rankOneGlow 1.35s ease-in-out infinite!important;
          }
          #studentGrid .rank-one .student-line{
            display:flex!important;
            align-items:center!important;
            min-width:0!important;
          }
          #studentGrid .rank-one-crown{
            flex:0 0 auto!important;
            display:inline-flex!important;
            align-items:center!important;
            justify-content:center!important;
            margin-right:6px!important;
            font-size:24px!important;
            line-height:1!important;
            filter:drop-shadow(0 0 7px rgba(255,210,59,.85))!important;
            animation:rankCrownPulse 1.05s ease-in-out infinite!important;
          }
          #studentGrid .rank-one-label{
            flex:0 0 auto!important;
            display:inline-flex!important;
            align-items:center!important;
            justify-content:center!important;
            min-width:42px!important;
            height:26px!important;
            padding:0 9px!important;
            margin-left:7px!important;
            border:1px solid rgba(255,226,103,.98)!important;
            border-radius:999px!important;
            background:linear-gradient(135deg,#8b6200,#5b3d00)!important;
            color:#fff7bb!important;
            font-size:12px!important;
            line-height:1!important;
            font-weight:1000!important;
            white-space:nowrap!important;
            box-shadow:0 0 14px rgba(255,210,59,.42)!important;
          }
          #studentGrid .rank-one::after{
            content:"";
            position:absolute!important;
            inset:-3px!important;
            border-radius:inherit!important;
            pointer-events:none!important;
            border:2px solid rgba(255,232,126,.0)!important;
            animation:rankOneRing 1.35s ease-in-out infinite!important;
          }
        }

        @keyframes rankOneGlow{
          0%,100%{filter:brightness(1);box-shadow:0 0 0 2px rgba(255,216,77,.78),0 0 18px rgba(255,203,55,.38),0 0 36px rgba(255,164,32,.14)}
          50%{filter:brightness(1.10);box-shadow:0 0 0 3px rgba(255,235,137,.98),0 0 34px rgba(255,216,77,.82),0 0 64px rgba(255,164,32,.32)}
        }
        @keyframes rankOneRing{
          0%,100%{opacity:.15;transform:scale(1)}
          50%{opacity:.9;transform:scale(1.018);border-color:rgba(255,236,145,.9)}
        }
        @keyframes rankCrownPulse{
          0%,100%{transform:scale(1) rotate(-2deg);filter:drop-shadow(0 0 5px rgba(255,210,59,.60))}
          50%{transform:scale(1.12) rotate(2deg);filter:drop-shadow(0 0 12px rgba(255,226,93,1))}
        }
      `;
      document.head.appendChild(style);
    }

    new MutationObserver(scheduleRanking).observe(grid, {
      childList: true,
      subtree: true,
      characterData: true
    });
    mobileQuery.addEventListener?.('change', scheduleRanking);
    window.addEventListener('resize', scheduleRanking, { passive: true });
    scheduleRanking();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
