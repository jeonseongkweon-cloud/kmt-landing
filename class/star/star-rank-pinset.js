// STAR RANK PINSET v1.0 — always keep highest STAR first (top-left).
// Display-only DOM ordering. Stored STAR data is untouched.
(() => {
  const grid = document.getElementById('studentGrid');
  if (!grid) return;

  let scheduled = false;
  let applying = false;

  const scoreOf = card => {
    const star = card.querySelector('.star-count');
    if (!star) return 0;
    const saved = Number(star.dataset.starCount || 0);
    if (Number.isFinite(saved) && saved >= 0) return saved;
    const aria = String(star.getAttribute('aria-label') || '');
    const match = aria.match(/(\d+)/);
    if (match) return Number(match[1]) || 0;
    const text = String(star.textContent || '');
    const numeric = text.match(/(\d+)/);
    if (numeric) return Number(numeric[1]) || 0;
    return (text.match(/⭐/g) || []).length;
  };

  const apply = () => {
    if (applying) return;
    const cards = [...grid.querySelectorAll(':scope > .student')];
    if (cards.length < 2) return;
    applying = true;
    try {
      const ranked = cards.map((card, index) => ({ card, index, score: scoreOf(card) }))
        .sort((a, b) => b.score - a.score || a.index - b.index);
      const current = cards.map(card => card.dataset.student || '').join('|');
      const target = ranked.map(item => item.card.dataset.student || '').join('|');
      if (current !== target) ranked.forEach(item => grid.appendChild(item.card));
    } finally {
      applying = false;
    }
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  };

  new MutationObserver(schedule).observe(grid, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['data-star-count', 'aria-label']
  });

  schedule();
})();
