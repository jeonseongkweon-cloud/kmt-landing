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
