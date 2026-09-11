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

// CLASS QUICK SHOW MENU v1.0
// Adds a second hamburger button for quick classroom popups only.
// Character popup: 3 seconds. Mission popup: 5 seconds.
(() => {
  const systemButton = document.getElementById("systemMenuButton");
  const header = systemButton?.parentElement;
  if (!systemButton || !header || document.getElementById("classQuickShowButton")) return;

  const style = document.createElement("style");
  style.id = "classQuickShowStyleV1";
  style.textContent = `
.class-quick-show-button{
  width:44px;height:44px;padding:0;border:1px solid rgba(255,255,255,.16);border-radius:12px;
  background:#102b47;color:#ffe17a;font-size:23px;font-weight:1000;cursor:pointer;
  display:inline-flex;align-items:center;justify-content:center;box-shadow:0 7px 22px rgba(0,0,0,.18)
}
.class-quick-show-button:hover{filter:brightness(1.12)}
.class-quick-menu{
  position:fixed;z-index:1200;right:84px;top:68px;width:250px;padding:12px;
  border:1px solid rgba(246,196,81,.35);border-radius:16px;background:rgba(5,22,38,.98);
  box-shadow:0 20px 60px rgba(0,0,0,.5);backdrop-filter:blur(14px)
}
.class-quick-menu[hidden]{display:none!important}
.class-quick-menu strong{display:block;margin:2px 4px 10px;color:#ffe799;font-size:14px}
.class-quick-menu button{
  width:100%;min-height:52px;margin:5px 0;padding:10px 12px;border:1px solid rgba(255,255,255,.12);
  border-radius:12px;background:#123556;color:#fff;font-size:16px;font-weight:1000;cursor:pointer
}
.class-quick-menu button:hover{background:#18466f}
.class-show-overlay{
  position:fixed;inset:0;z-index:5000;display:grid;place-items:center;padding:28px;
  background:radial-gradient(circle at center,rgba(20,62,100,.48),rgba(0,7,17,.88));
  backdrop-filter:blur(5px);animation:classOverlayIn .2s ease-out
}
.class-show-overlay[hidden]{display:none!important}
.class-show-card{
  position:relative;width:min(920px,92vw);max-height:88vh;overflow:hidden;padding:28px 34px 30px;
  border:3px solid rgba(255,221,92,.86);border-radius:30px;background:linear-gradient(155deg,#0d2a47,#061526);
  box-shadow:0 0 0 6px rgba(255,255,255,.04),0 0 65px rgba(255,204,55,.32),0 28px 85px rgba(0,0,0,.58);
  text-align:center
}
.class-show-card h2{margin:0 0 10px;color:#ffe17a;font-size:clamp(30px,4vw,56px)}
.class-show-countdown{
  position:absolute;right:22px;top:18px;min-width:52px;height:52px;padding:0 12px;border-radius:999px;
  display:grid;place-items:center;background:rgba(255,208,60,.14);border:1px solid rgba(255,224,118,.48);
  color:#ffe06b;font-size:24px;font-weight:1000
}
.class-character-image{display:block;width:auto;max-width:min(570px,70vw);height:min(54vh,520px);margin:4px auto 8px;object-fit:contain;filter:drop-shadow(0 16px 30px rgba(0,0,0,.4))}
.class-character-stage{font-size:clamp(24px,3vw,40px);font-weight:1000;color:#fff}
.class-character-score{margin-top:8px;font-size:clamp(20px,2.2vw,30px);font-weight:950;color:#ffd85c}
.class-character-next{margin-top:8px;font-size:clamp(18px,1.9vw,26px);font-weight:900;color:#bfe3ff}
.class-character-hint{margin-top:7px;color:#9fc0dc;font-size:15px}
.class-mission-body{min-height:200px;display:grid;place-items:center;padding:18px 16px;font-size:clamp(28px,3.3vw,48px);line-height:1.45;font-weight:1000;color:#fff}
.class-mission-body:empty::before{content:"오늘의 미션이 아직 입력되지 않았습니다.";color:#9db2c9;font-size:24px}
@keyframes classOverlayIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}}
@media(max-width:760px){.class-quick-show-button{display:none!important}.class-quick-menu{display:none!important}}
`;
  document.head.appendChild(style);

  const quickButton = document.createElement("button");
  quickButton.id = "classQuickShowButton";
  quickButton.className = "class-quick-show-button";
  quickButton.type = "button";
  quickButton.title = "캐릭터 · 오늘의 미션 빠른 보기";
  quickButton.setAttribute("aria-label", "캐릭터와 오늘의 미션 빠른 보기");
  quickButton.textContent = "☰";
  header.insertBefore(quickButton, systemButton);

  const menu = document.createElement("div");
  menu.id = "classQuickShowMenu";
  menu.className = "class-quick-menu";
  menu.hidden = true;
  menu.innerHTML = `<strong>수업 빠른 보기</strong><button type="button" data-quick-show="character">🔥 공동성장 캐릭터</button><button type="button" data-quick-show="mission">🎯 오늘의 미션</button>`;
  document.body.appendChild(menu);

  const overlay = document.createElement("div");
  overlay.id = "classShowOverlay";
  overlay.className = "class-show-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `<div class="class-show-card"><div class="class-show-countdown" id="classShowCountdown"></div><div id="classShowContent"></div></div>`;
  document.body.appendChild(overlay);

  let closeTimer = null;
  let countdownTimer = null;

  const closeOverlay = () => {
    clearTimeout(closeTimer);
    clearInterval(countdownTimer);
    overlay.hidden = true;
    document.getElementById("classShowContent").innerHTML = "";
  };

  const openOverlay = (seconds, render) => {
    closeOverlay();
    menu.hidden = true;
    const content = document.getElementById("classShowContent");
    render(content);
    overlay.hidden = false;
    let left = seconds;
    const counter = document.getElementById("classShowCountdown");
    counter.textContent = String(left);
    countdownTimer = setInterval(() => {
      left -= 1;
      counter.textContent = String(Math.max(0, left));
      if (left <= 0) clearInterval(countdownTimer);
    }, 1000);
    closeTimer = setTimeout(closeOverlay, seconds * 1000);
  };

  const showCharacter = () => openOverlay(3, content => {
    const img = document.querySelector("#growthStages img");
    const stageLabel = document.querySelector("#growthStages .growth-stage span")?.textContent?.trim() || "1 / 7";
    const score = document.getElementById("growthScore")?.textContent?.trim() || "⭐ 0 / 출석 대기";
    const next = document.getElementById("growthNext")?.textContent?.trim() || "다음 성장까지 확인 중";
    const hint = document.getElementById("growthHint")?.textContent?.trim() || "";
    content.innerHTML = `<h2>🔥 우리 반 공동성장</h2>${img ? `<img class="class-character-image" src="${img.src}" alt="공동성장 캐릭터">` : ""}<div class="class-character-stage">현재 캐릭터 ${stageLabel}</div><div class="class-character-score">${score}</div><div class="class-character-next">${next}</div><div class="class-character-hint">${hint}</div>`;
  });

  const showMission = () => openOverlay(5, content => {
    const source = document.getElementById("missionInfo");
    content.innerHTML = `<h2>🎯 오늘의 미션</h2><div class="class-mission-body"></div>`;
    const body = content.querySelector(".class-mission-body");
    if (source) body.innerHTML = source.innerHTML;
  });

  quickButton.addEventListener("click", e => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
  });
  menu.addEventListener("click", e => {
    const button = e.target.closest("[data-quick-show]");
    if (!button) return;
    if (button.dataset.quickShow === "character") showCharacter();
    if (button.dataset.quickShow === "mission") showMission();
  });
  overlay.addEventListener("click", closeOverlay);
  document.addEventListener("click", e => {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== quickButton) menu.hidden = true;
  });
})();
