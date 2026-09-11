// STAR DISPLAY PINSET v1.2 — display-only: max 10 stars, 5 per row, taller 4:3 photo area.
(() => {
  const grid = document.getElementById("studentGrid");
  if (!grid) return;

  const style = document.createElement("style");
  style.id = "starDisplayPinsetV12";
  style.textContent = `
#studentGrid .star-count{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:2px!important;line-height:1!important}
#studentGrid .star-count .star-row{display:block!important;white-space:nowrap!important;line-height:1.05!important}
@media (min-width:761px){
  #studentGrid.student-grid .photo{
    width:100%!important;
    height:auto!important;
    aspect-ratio:4 / 3!important;
    min-height:0!important;
    max-height:none!important;
    border-radius:14px!important;
    object-fit:cover!important;
    object-position:center 35%!important;
  }
}
`;
  document.head.appendChild(style);

  const syncVisualStars = root => {
    const scope = root instanceof Element ? root : grid;
    const targets = scope.matches?.(".star-count") ? [scope] : [...scope.querySelectorAll?.(".star-count") || []];
    targets.forEach(el => {
      let count = Number(el.dataset.starCount || 0);
      if (!count) {
        const raw = String(el.textContent || "").trim();
        const numeric = raw.match(/(\d+)/);
        if (numeric) count = Number(numeric[1]) || 0;
        else count = (raw.match(/⭐/g) || []).length;
      }
      count = Math.max(0, count);
      const visible = Math.min(count, 10);
      el.dataset.starCount = String(count);
      el.setAttribute("aria-label", `STAR ${count}개`);
      el.title = count > 10 ? `STAR ${count}개 · 화면에는 10개까지 표시` : `STAR ${count}개`;
      el.innerHTML = "";
      for (let start = 0; start < visible; start += 5) {
        const row = document.createElement("span");
        row.className = "star-row";
        row.textContent = "⭐".repeat(Math.min(5, visible - start));
        el.appendChild(row);
      }
    });
  };

  syncVisualStars(grid);
  new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) syncVisualStars(node);
      }
    }
  }).observe(grid, { childList: true, subtree: true });
})();
