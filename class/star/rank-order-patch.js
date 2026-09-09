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
    card.querySelectorAll('.leader-badge,.rank-one-label,.rank-one-crown,.rank-one-star').forEach(el => el.remove());
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

      /* 모바일은 점수순 정렬만 유지하고 순위 시각효과는 전혀 넣지 않는다. */
      if (mobileQuery.matches) return;

      /* PC/노트북에서만 1등을 강하게 강조한다. */
      const first = grid.querySelector(':scope > .student');
      if (first && scoreOf(first) > 0) {
        first.classList.add('rank-one');

        const crown = document.createElement('span');
        crown.className = 'rank-one-crown';
        crown.textContent = '👑';
        crown.setAttribute('aria-label', '현재 1등');
        first.appendChild(crown);

        const star = document.createElement('span');
        star.className = 'rank-one-star';
        star.textContent = '⭐';
        star.setAttribute('aria-hidden', 'true');
        first.appendChild(star);

        const line = first.querySelector('.student-line');
        const name = line?.querySelector('h2');
        if (line && name) {
          const badge = document.createElement('span');
          badge.className = 'rank-one-label';
          badge.textContent = '👑 1등';
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

        /* 모바일: 정렬만. 왕관/1등/금빛 효과 모두 없음. */
        @media(max-width:760px), (max-width:1024px) and (pointer:coarse){
          #studentGrid .rank-one-label,
          #studentGrid .rank-one-crown,
          #studentGrid .rank-one-star{display:none!important}
          #studentGrid .rank-one{
            border-color:inherit!important;
            box-shadow:inherit!important;
            animation:none!important;
            filter:none!important;
          }
          #studentGrid .rank-one::after{display:none!important}
        }

        /* PC/노트북 전용 1등 챔피언 효과 */
        @media(min-width:761px) and (pointer:fine){
          #studentGrid .student.rank-one{
            position:relative!important;
            z-index:30!important;
            overflow:visible!important;
            border:4px solid #ffd83d!important;
            outline:2px solid rgba(255,246,174,.95)!important;
            outline-offset:3px!important;
            box-shadow:0 0 10px #fff7a8,0 0 28px #ffd633,0 0 56px rgba(255,170,0,.9),0 0 90px rgba(255,129,0,.42)!important;
            animation:rankOneChampionGlow .82s ease-in-out infinite alternate!important;
          }
          #studentGrid .student.rank-one::after{
            content:"";
            position:absolute!important;
            inset:-8px!important;
            z-index:-1!important;
            border-radius:inherit!important;
            pointer-events:none!important;
            border:3px solid rgba(255,224,74,.85)!important;
            box-shadow:0 0 24px rgba(255,230,86,.85)!important;
            animation:rankOneChampionRing 1.05s ease-in-out infinite!important;
          }
          #studentGrid .rank-one-crown{
            position:absolute!important;
            top:-31px!important;
            left:50%!important;
            transform:translateX(-50%)!important;
            z-index:50!important;
            display:block!important;
            font-size:42px!important;
            line-height:1!important;
            pointer-events:none!important;
            filter:drop-shadow(0 0 5px #fff6a5) drop-shadow(0 0 14px #ffbf00)!important;
            animation:rankCrownChampion 1s ease-in-out infinite!important;
          }
          #studentGrid .rank-one-star{
            position:absolute!important;
            top:10px!important;
            right:10px!important;
            z-index:50!important;
            display:block!important;
            font-size:27px!important;
            line-height:1!important;
            pointer-events:none!important;
            text-shadow:0 0 8px #fff,0 0 18px #ffd52d,0 0 28px #ff9d00!important;
            animation:rankStarChampion .62s ease-in-out infinite alternate!important;
          }
          #studentGrid .rank-one .student-line{
            display:flex!important;
            align-items:center!important;
            min-width:0!important;
          }
          #studentGrid .rank-one-label{
            flex:0 0 auto!important;
            display:inline-flex!important;
            align-items:center!important;
            justify-content:center!important;
            min-width:60px!important;
            height:29px!important;
            padding:0 10px!important;
            margin-left:8px!important;
            border:2px solid #ffe16b!important;
            border-radius:999px!important;
            background:linear-gradient(135deg,#b97800,#6b3f00)!important;
            color:#fffbd1!important;
            font-size:13px!important;
            line-height:1!important;
            font-weight:1000!important;
            white-space:nowrap!important;
            text-shadow:0 1px 2px #4b2b00!important;
            box-shadow:0 0 9px #ffe36c,0 0 18px rgba(255,180,0,.65)!important;
            animation:rankBadgeChampion .82s ease-in-out infinite alternate!important;
          }
        }

        @keyframes rankOneChampionGlow{
          from{filter:brightness(1.02) saturate(1.05);box-shadow:0 0 8px #fff7a8,0 0 20px #ffd633,0 0 42px rgba(255,170,0,.72),0 0 68px rgba(255,129,0,.30)}
          to{filter:brightness(1.16) saturate(1.18);box-shadow:0 0 16px #fffbd0,0 0 38px #ffe24c,0 0 72px rgba(255,175,0,1),0 0 105px rgba(255,116,0,.55)}
        }
        @keyframes rankOneChampionRing{
          0%,100%{opacity:.38;transform:scale(1)}
          50%{opacity:1;transform:scale(1.025)}
        }
        @keyframes rankCrownChampion{
          0%,100%{transform:translateX(-50%) scale(1) rotate(-3deg)}
          50%{transform:translateX(-50%) scale(1.16) rotate(3deg)}
        }
        @keyframes rankStarChampion{
          from{transform:scale(.86) rotate(-8deg);opacity:.72}
          to{transform:scale(1.22) rotate(8deg);opacity:1}
        }
        @keyframes rankBadgeChampion{
          from{filter:brightness(1)}
          to{filter:brightness(1.28)}
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
