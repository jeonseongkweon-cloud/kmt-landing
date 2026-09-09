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
      img.style.objectFit = "contain";
      img.style.objectPosition = "center center";
      img.style.transform = "none";
    });
    document.querySelectorAll("[data-growth-theme]").forEach(btn => {
      const active = btn.dataset.growthTheme === key;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.title = `${btn.textContent} · ${THEMES[btn.dataset.growthTheme].label}`;
    });
  }

  function selectTheme(key) {
    if (!THEMES[key]) return;
    localStorage.setItem(STORAGE_KEY, key);
    applyTheme(key);
  }

  function mountSelector() {
    const panel = document.getElementById("growthPanel");
    if (!panel || document.getElementById("growthThemeSelector")) return;

    const toolbar = panel.querySelector(".growth-toolbar");
    if (toolbar) toolbar.hidden = true;

    const wrap = document.createElement("div");
    wrap.id = "growthThemeSelector";
    wrap.className = "growth-theme-selector compact-number-selector";
    wrap.setAttribute("aria-label", "공동성장 캐릭터 종류 선택");
    wrap.innerHTML = ORDER.map((key, index) => `<button type="button" data-growth-theme="${key}" aria-pressed="false" aria-label="${index + 1}번 ${THEMES[key].label}">${index + 1}</button>`).join("");

    const progress = panel.querySelector(".growth-progress");
    panel.insertBefore(wrap, progress || null);
    wrap.addEventListener("click", event => {
      const button = event.target.closest("[data-growth-theme]");
      if (button) selectTheme(button.dataset.growthTheme);
    });

    const style = document.createElement("style");
    style.textContent = `
      #growthPanel{display:flex!important;flex-direction:column!important;min-height:410px!important;padding:10px!important;overflow:hidden}
      #growthPanel .growth-toolbar{display:none!important}
      #growthPanel #growthStages{flex:1 1 auto!important;min-height:300px!important;width:100%!important;display:grid!important;place-items:center!important;margin:0!important;padding:0!important}
      #growthPanel #growthStages .growth-stage{position:relative!important;width:100%!important;height:100%!important;min-height:300px!important;display:grid!important;place-items:center!important;padding:0!important;margin:0!important;background:transparent!important;border:0!important;box-shadow:none!important;overflow:hidden!important}
      #growthPanel #growthStages .growth-stage>span{position:absolute!important;right:8px!important;bottom:6px!important;z-index:2!important;padding:3px 7px!important;border-radius:999px!important;background:rgba(3,14,26,.72)!important;color:#ffe18c!important;font-size:11px!important;font-weight:950!important}
      #growthPanel #growthStages .growth-stage img{display:block!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:330px!important;object-fit:contain!important;object-position:center!important;margin:auto!important;filter:none!important;opacity:1!important}
      #growthPanel .compact-number-selector{flex:0 0 auto;display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:6px!important;width:100%!important;margin:5px 0 6px!important}
      #growthPanel .compact-number-selector button{height:30px!important;padding:0!important;border:1px solid rgba(255,255,255,.18)!important;border-radius:8px!important;background:rgba(255,255,255,.06)!important;color:#c9d7e6!important;font-weight:1000!important;cursor:pointer!important}
      #growthPanel .compact-number-selector button.active{border-color:#f6c451!important;background:rgba(246,196,81,.18)!important;color:#ffe18c!important;box-shadow:0 0 12px rgba(246,196,81,.13)!important}
      #growthPanel .growth-progress{flex:0 0 auto!important;margin-top:0!important;padding-top:4px!important}
      #growthPanel .growth-progress #growthNext{font-size:11px!important}
      @media(max-width:760px){#growthPanel{min-height:360px!important}#growthPanel #growthStages,#growthPanel #growthStages .growth-stage{min-height:260px!important}#growthPanel #growthStages .growth-stage img{max-height:285px!important}}
    `;
    document.head.appendChild(style);
    applyTheme();
  }

  function init() {
    mountSelector();
    const stages = document.getElementById("growthStages");
    if (stages) new MutationObserver(() => applyTheme()).observe(stages, { childList: true, subtree: true });
    applyTheme();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
