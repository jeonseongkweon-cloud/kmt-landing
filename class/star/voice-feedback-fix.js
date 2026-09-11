// SMART NAME VOICE v1.1.1 — success feedback guard
// STAR award logic is intentionally untouched. This only prevents a late
// recognition/no-match message from overwriting feedback after a confirmed award.
(() => {
  let lastSuccessAt = 0;
  let lastSuccessName = "";
  const SUCCESS_WINDOW_MS = 3200;

  const markSuccess = (name = "") => {
    lastSuccessAt = Date.now();
    lastSuccessName = String(name || "").trim();
  };

  const wasJustSuccessful = () => Date.now() - lastSuccessAt <= SUCCESS_WINDOW_MS;
  const isFalseNameFailure = text => /학생 이름을 .*찾지 못했습니다/.test(String(text || ""));

  const showSuccessFeedback = () => {
    const label = document.getElementById("voiceFeedbackLabel");
    const transcript = document.getElementById("voiceTranscript");
    if (label) label.textContent = "✅ STAR 지급 완료:";
    if (transcript && lastSuccessName) transcript.textContent = `${lastSuccessName} ⭐ +1`;
  };

  const burst = document.getElementById("starBurst");
  if (burst) {
    new MutationObserver(() => {
      if (!burst.hidden) markSuccess(document.getElementById("burstName")?.textContent);
    }).observe(burst, { attributes: true, attributeFilter: ["hidden", "class", "style"] });
  }

  const grid = document.getElementById("studentGrid");
  if (grid) {
    new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          const plus = node.matches?.(".voice-plus") ? node : node.querySelector?.(".voice-plus");
          if (!plus || !/⭐\s*\+1/.test(plus.textContent || "")) continue;
          const card = plus.closest("[data-student]");
          const name = card?.querySelector(".student-name, h3, h2, strong")?.textContent || document.getElementById("burstName")?.textContent || "";
          markSuccess(name);
        }
      }
    }).observe(grid, { childList: true, subtree: true });
  }

  const label = document.getElementById("voiceFeedbackLabel");
  if (label) {
    new MutationObserver(() => {
      if (wasJustSuccessful() && isFalseNameFailure(label.textContent)) showSuccessFeedback();
    }).observe(label, { childList: true, characterData: true, subtree: true });
  }

  const toast = document.getElementById("toast");
  if (toast) {
    new MutationObserver(() => {
      if (wasJustSuccessful() && isFalseNameFailure(toast.textContent)) {
        toast.textContent = lastSuccessName ? `${lastSuccessName} STAR +1` : "STAR 지급 완료";
      }
    }).observe(toast, { childList: true, characterData: true, subtree: true });
  }
})();

// STAR VISUAL COUNT v1.0 — show one visible star per earned STAR.
// The core STAR data/rendering stays untouched; this is display-only.
(() => {
  const grid = document.getElementById("studentGrid");
  if (!grid) return;

  const syncVisualStars = root => {
    const scope = root instanceof Element ? root : grid;
    const targets = scope.matches?.(".star-count") ? [scope] : [...scope.querySelectorAll?.(".star-count") || []];
    targets.forEach(el => {
      const raw = String(el.textContent || "").trim();
      const match = raw.match(/^⭐\s*(\d+)$/);
      if (!match) return;
      const count = Math.max(0, Number(match[1]) || 0);
      el.dataset.starCount = String(count);
      el.setAttribute("aria-label", `STAR ${count}개`);
      el.title = `STAR ${count}개`;
      el.textContent = count > 0 ? "⭐".repeat(count) : "";
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

// PC STAR RESPONSIVE CARD LAYOUT v1.0
// Display-only pin-point patch: keep one fixed card/photo aspect ratio while
// allowing the whole card to grow/shrink uniformly by attendance count.
// No STAR, attendance, voice, Supabase, UNDO or selection logic is touched.
(() => {
  const grid = document.getElementById("studentGrid");
  if (!grid) return;

  const style = document.createElement("style");
  style.id = "pcStarResponsiveCardLayoutV1";
  style.textContent = `
@media (min-width:761px){
  #studentGrid.student-grid{
    --star-cols:8;
    --star-gap:12px;
    --star-card-max:240px;
    display:flex!important;
    flex-wrap:wrap!important;
    align-items:flex-start!important;
    justify-content:center!important;
    gap:var(--star-gap)!important;
    width:100%!important;
  }

  #studentGrid.student-grid > .student{
    flex:0 0 min(
      var(--star-card-max),
      calc((100% - (var(--star-cols) - 1) * var(--star-gap)) / var(--star-cols))
    )!important;
    width:auto!important;
    max-width:none!important;
    aspect-ratio:4 / 5!important;
    min-width:0!important;
  }

  #studentGrid.student-grid > .student .star-main{
    width:100%!important;
    height:100%!important;
    min-height:0!important;
    display:flex!important;
    flex-direction:column!important;
  }

  #studentGrid.student-grid > .student .photo,
  #studentGrid.student-grid > .student img.photo,
  #studentGrid.student-grid > .student .fallback.photo{
    width:100%!important;
    height:auto!important;
    aspect-ratio:4 / 3!important;
    flex:0 0 auto!important;
    margin:0 auto!important;
    object-fit:cover!important;
    object-position:center 35%!important;
    border-radius:14px!important;
  }

  #studentGrid[data-layout-cols="1"]{--star-cols:1;--star-card-max:390px}
  #studentGrid[data-layout-cols="2"]{--star-cols:2;--star-card-max:350px}
  #studentGrid[data-layout-cols="3"]{--star-cols:3;--star-card-max:310px}
  #studentGrid[data-layout-cols="4"]{--star-cols:4;--star-card-max:275px}
  #studentGrid[data-layout-cols="5"]{--star-cols:5;--star-card-max:250px}
  #studentGrid[data-layout-cols="6"]{--star-cols:6;--star-card-max:225px}
  #studentGrid[data-layout-cols="8"]{--star-cols:8;--star-card-max:205px}
}
`;
  document.head.appendChild(style);

  const chooseCols = count => {
    if (count <= 1) return 1;      // 1명: 가운데 크게
    if (count === 2) return 2;     // 2명: 가운데 2명
    if (count === 3) return 3;     // 3명: 가운데 3명
    if (count === 4) return 2;     // 4명: 2 x 2 크게
    if (count <= 6) return 3;      // 5~6명: 3열, 2줄
    if (count <= 8) return 4;      // 7~8명: 4열, 2줄
    if (count <= 10) return 5;     // 9~10명: 5열
    if (count <= 12) return 6;     // 11~12명: 6열
    return 8;                      // 13명 이상: 최대 8열
  };

  const syncLayout = () => {
    const count = grid.querySelectorAll(":scope > .student").length;
    grid.dataset.studentCount = String(count);
    grid.dataset.layoutCols = String(chooseCols(count));
  };

  syncLayout();
  new MutationObserver(syncLayout).observe(grid, { childList:true });
})();
