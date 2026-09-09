(() => {
  const STORAGE_KEY = "kmt-star-growth-theme-v1";
  const THEMES = {
    fire: { label: "기존 불꽃", image: stage => `../../assets/star-growth/stage-${String(stage).padStart(2, "0")}.png` },
    taegeom: { label: "태검", image: stage => `../../assets/star-growth/themes/taegeom/taegeom-${String(stage).padStart(2, "0")}.webp` },
    "police-martial": { label: "경찰무도", image: stage => `../../assets/star-growth/themes/police-martial/police-martial-${String(stage).padStart(2, "0")}.webp` },
    "drone-patrol": { label: "드론순찰대", image: stage => `../../assets/star-growth/themes/drone-patrol/drone-patrol-${String(stage).padStart(2, "0")}.webp` }
  };
  const ORDER = ["fire", "taegeom", "police-martial", "drone-patrol"];

  function currentThemeKey() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return THEMES[saved] ? saved : "fire";
  }

  function currentStage() {
    const el = document.querySelector("#growthStages .growth-stage");
    const n = Number(el?.dataset?.stage || 1);
    return Math.max(1, Math.min(7, Number.isFinite(n) ? n : 1));
  }

  function syncHero(key = currentThemeKey()) {
    const stage = currentStage();
    const theme = THEMES[key] || THEMES.fire;
    const img = document.getElementById("growthHeroImage");
    const label = document.getElementById("growthHeroStage");
    if (img) {
      img.onerror = () => {
        img.onerror = null;
        img.src = THEMES.fire.image(stage);
      };
      img.src = theme.image(stage);
      img.alt = `${theme.label} ${stage}단계`;
    }
    if (label) label.textContent = `${stage} / 7`;
  }

  function applyTheme(key = currentThemeKey()) {
    const theme = THEMES[key] || THEMES.fire;
    document.querySelectorAll("#growthStages .growth-stage").forEach((stageEl, index) => {
      const stage = Number(stageEl.dataset.stage) || index + 1;
      const img = stageEl.querySelector("img");
      if (!img) return;
      const fallback = THEMES.fire.image(stage);
      img.onerror = () => { img.onerror = null; img.src = fallback; };
      img.src = theme.image(stage);
      img.alt = `${theme.label} ${stage}단계`;
    });
    document.querySelectorAll("[data-growth-theme]").forEach(btn => {
      const active = btn.dataset.growthTheme === key;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    syncHero(key);
  }

  function selectTheme(key) {
    if (!THEMES[key]) return;
    localStorage.setItem(STORAGE_KEY, key);
    applyTheme(key);
  }

  function mountUI() {
    const panel = document.getElementById("growthPanel");
    if (!panel || document.getElementById("growthHero")) return;

    const toolbar = panel.querySelector(".growth-toolbar");
    if (toolbar) toolbar.hidden = true;

    const stages = document.getElementById("growthStages");
    const hero = document.createElement("div");
    hero.id = "growthHero";
    hero.className = "growth-hero";
    hero.innerHTML = `
      <div id="growthHeroStage" class="growth-hero-stage">1 / 7</div>
      <div class="growth-hero-image-wrap"><img id="growthHeroImage" alt="공동성장 캐릭터"></div>`;
    panel.insertBefore(hero, stages || panel.firstChild);

    const selector = document.createElement("div");
    selector.id = "growthThemeSelector";
    selector.className = "growth-theme-selector compact-number-selector";
    selector.setAttribute("aria-label", "공동성장 캐릭터 종류 선택");
    selector.innerHTML = ORDER.map((key, index) => `<button type="button" data-growth-theme="${key}" aria-pressed="false" aria-label="${index + 1}번 ${THEMES[key].label}" title="${THEMES[key].label}">${index + 1}</button>`).join("");

    const progress = panel.querySelector(".growth-progress");
    panel.insertBefore(selector, progress || null);
    selector.addEventListener("click", event => {
      const button = event.target.closest("[data-growth-theme]");
      if (button) selectTheme(button.dataset.growthTheme);
    });

    const style = document.createElement("style");
    style.textContent = `
      #growthPanel{display:flex!important;flex-direction:column!important;min-height:430px!important;padding:8px!important;overflow:hidden!important}
      #growthPanel .growth-toolbar{display:none!important}
      #growthPanel #growthStages{display:none!important}
      #growthPanel .growth-hero{flex:1 1 auto!important;min-height:330px!important;display:flex!important;flex-direction:column!important;width:100%!important;overflow:hidden!important}
      #growthPanel .growth-hero-stage{flex:0 0 auto!important;text-align:center!important;font-size:11px!important;font-weight:950!important;color:#ffe18c!important;line-height:20px!important;height:20px!important}
      #growthPanel .growth-hero-image-wrap{flex:1 1 auto!important;min-height:300px!important;width:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important}
      #growthPanel #growthHeroImage{display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:345px!important;object-fit:contain!important;object-position:center center!important;margin:0!important;padding:0!important;opacity:1!important;filter:none!important;transform:none!important}
      #growthPanel .compact-number-selector{flex:0 0 auto!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:5px!important;width:100%!important;margin:4px 0 5px!important}
      #growthPanel .compact-number-selector button{height:28px!important;padding:0!important;border:1px solid rgba(255,255,255,.18)!important;border-radius:7px!important;background:rgba(255,255,255,.06)!important;color:#c9d7e6!important;font-weight:1000!important;cursor:pointer!important}
      #growthPanel .compact-number-selector button.active{border-color:#f6c451!important;background:rgba(246,196,81,.18)!important;color:#ffe18c!important;box-shadow:0 0 10px rgba(246,196,81,.12)!important}
      #growthPanel .growth-progress{flex:0 0 auto!important;margin:0!important;padding:0!important;min-height:24px!important}
      #growthPanel .growth-progress #growthScore{display:none!important}
      #growthPanel .growth-progress .growth-meter{display:none!important}
      #growthPanel .growth-progress #growthNext{display:flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;min-height:24px!important;font-size:11px!important;text-align:center!important}
      #growthPanel .growth-progress #growthNext small{font-size:10px!important}
      #growthPanel .growth-progress #growthNext b{font-size:15px!important;color:#ffe18c!important}

      /* 학생카드 핀셋: PC에서 최대 5열 고정. 6명=3x2, 7~8명=4열, 9명 이상=5열 */
      @media(min-width:761px){
        #studentGrid.student-grid{display:grid!important;gap:12px!important;justify-content:stretch!important;align-items:start!important;grid-template-columns:repeat(5,minmax(0,1fr))!important}
        #studentGrid.student-grid>.student{width:auto!important;max-width:none!important;min-width:0!important;flex:none!important}
        #studentGrid.student-grid:has(>.student:nth-child(1):last-child){grid-template-columns:1fr!important}
        #studentGrid.student-grid:has(>.student:nth-child(2):last-child){grid-template-columns:repeat(2,minmax(0,1fr))!important}
        #studentGrid.student-grid:has(>.student:nth-child(3):last-child){grid-template-columns:repeat(3,minmax(0,1fr))!important}
        #studentGrid.student-grid:has(>.student:nth-child(4):last-child){grid-template-columns:repeat(4,minmax(0,1fr))!important}
        #studentGrid.student-grid:has(>.student:nth-child(5):last-child){grid-template-columns:repeat(5,minmax(0,1fr))!important}
        #studentGrid.student-grid:has(>.student:nth-child(6):last-child){grid-template-columns:repeat(3,minmax(0,1fr))!important}
        #studentGrid.student-grid:has(>.student:nth-child(7):last-child),
        #studentGrid.student-grid:has(>.student:nth-child(8):last-child){grid-template-columns:repeat(4,minmax(0,1fr))!important}
        #studentGrid.student-grid:has(>.student:nth-child(n+9)){grid-template-columns:repeat(5,minmax(0,1fr))!important}
      }

      @media(max-width:760px){#growthPanel{min-height:380px!important}#growthPanel .growth-hero{min-height:285px!important}#growthPanel .growth-hero-image-wrap{min-height:255px!important}#growthPanel #growthHeroImage{max-height:300px!important}}
    `;
    document.head.appendChild(style);

    if (stages) {
      new MutationObserver(() => syncHero()).observe(stages, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-stage"] });
    }
    applyTheme();
  }

  function init() {
    mountUI();
    applyTheme();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
