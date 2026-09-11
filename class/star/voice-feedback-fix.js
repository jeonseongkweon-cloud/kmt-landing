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

// STAR VISUAL COUNT v1.1 — show earned STARs as rows of five, up to 15 visible.
// The actual STAR total is preserved in data/ARIA/title. Display only is capped.
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
      const visible = Math.min(count, 15);
      el.dataset.starCount = String(count);
      el.setAttribute("aria-label", `STAR ${count}개`);
      el.title = count > 15 ? `STAR ${count}개 · 화면에는 15개까지 표시` : `STAR ${count}개`;
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

// PC STAR FIXED 7-COLUMN LAYOUT v1.1
// Keep a consistent seven-column classroom board. No attendance-count resizing.
(() => {
  const grid = document.getElementById("studentGrid");
  if (!grid) return;
  grid.dataset.layoutCols = "7";

  const style = document.createElement("style");
  style.id = "pcStarFixedSevenColumnV11";
  style.textContent = `
@media (min-width:761px){
  #studentGrid.student-grid{
    display:grid!important;
    grid-template-columns:repeat(7,minmax(0,1fr))!important;
    justify-content:start!important;
    align-items:start!important;
    gap:9px!important;
    width:100%!important;
  }
  #studentGrid.student-grid > .student{
    width:auto!important;
    max-width:none!important;
    min-width:0!important;
    flex:none!important;
    aspect-ratio:auto!important;
  }
}
`;
  document.head.appendChild(style);
})();
