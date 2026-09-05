(() => {
  const STORAGE_KEY = "kmt-star-growth-theme-v1";
  const THEMES = {
    fire: {
      label: "🔥 기존 불꽃",
      image: stage => `../../assets/star-growth/stage-${String(stage).padStart(2, "0")}.png`
    },
    taegeom: {
      label: "⚔️ 태검",
      image: stage => `../../assets/star-growth/themes/taegeom/taegeom-${String(stage).padStart(2, "0")}.webp`
    },
    "police-martial": {
      label: "🛡️ 경찰무도",
      image: stage => `../../assets/star-growth/themes/police-martial/police-martial-${String(stage).padStart(2, "0")}.webp`
    },
    "drone-patrol": {
      label: "🚁 드론순찰대",
      image: stage => `../../assets/star-growth/themes/drone-patrol/drone-patrol-${String(stage).padStart(2, "0")}.webp`
    }
  };

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
      img.onerror = () => {
        img.onerror = null;
        img.src = fallback;
      };
      img.src = theme.image(stage);
      img.alt = `${theme.label.replace(/^[^ ]+ /, "")} 공동성장 ${stage}단계`;
    });

    document.querySelectorAll("[data-growth-theme]").forEach(btn => {
      const active = btn.dataset.growthTheme === key;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });

    const name = document.getElementById("growthThemeName");
    if (name) name.textContent = theme.label;
  }

  function selectTheme(key) {
    if (!THEMES[key]) return;
    localStorage.setItem(STORAGE_KEY, key);
    applyTheme(key);
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = `${THEMES[key].label} 공동성장 테마로 변경했습니다.`;
      toast.classList.add("show");
      clearTimeout(window.__growthThemeToast);
      window.__growthThemeToast = setTimeout(() => toast.classList.remove("show"), 1800);
    }
  }

  function mountSelector() {
    const toolbar = document.querySelector("#growthPanel .growth-toolbar");
    if (!toolbar || document.getElementById("growthThemeSelector")) return;

    const wrap = document.createElement("div");
    wrap.id = "growthThemeSelector";
    wrap.className = "growth-theme-selector";
    wrap.innerHTML = `
      <span class="growth-theme-title">이번 주 캐릭터 <b id="growthThemeName"></b></span>
      <div class="growth-theme-buttons" role="group" aria-label="공동성장 캐릭터 테마 선택">
        ${Object.entries(THEMES).map(([key, theme]) => `<button type="button" data-growth-theme="${key}" aria-pressed="false">${theme.label}</button>`).join("")}
      </div>`;
    toolbar.appendChild(wrap);

    wrap.addEventListener("click", event => {
      const button = event.target.closest("[data-growth-theme]");
      if (button) selectTheme(button.dataset.growthTheme);
    });

    const style = document.createElement("style");
    style.textContent = `
      .growth-theme-selector{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-left:auto}
      .growth-theme-title{font-size:12px;opacity:.88;white-space:nowrap}.growth-theme-title b{margin-left:4px;color:#ffd76a}
      .growth-theme-buttons{display:flex;gap:5px;flex-wrap:wrap}
      .growth-theme-buttons button{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);color:inherit;border-radius:999px;padding:6px 9px;font:inherit;font-size:12px;cursor:pointer}
      .growth-theme-buttons button:hover{background:rgba(255,255,255,.13)}
      .growth-theme-buttons button.active{border-color:#ffd76a;background:rgba(255,215,106,.18);box-shadow:0 0 0 1px rgba(255,215,106,.12) inset}
      @media(max-width:760px){.growth-theme-selector{width:100%;margin-left:0}.growth-theme-title{width:100%}.growth-theme-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%}.growth-theme-buttons button{width:100%;padding:7px 5px}}
    `;
    document.head.appendChild(style);
    applyTheme();
  }

  function init() {
    mountSelector();
    const stages = document.getElementById("growthStages");
    if (stages) {
      new MutationObserver(() => applyTheme()).observe(stages, { childList: true, subtree: true });
    }
    applyTheme();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
