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
(() => {
  const grid = document.getElementById("studentGrid");
  if (!grid) return;
  grid.dataset.layoutCols = "7";
  const style = document.createElement("style");
  style.id = "pcStarFixedSevenColumnV11";
  style.textContent = `@media (min-width:761px){#studentGrid.student-grid{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;justify-content:start!important;align-items:start!important;gap:9px!important;width:100%!important}#studentGrid.student-grid>.student{width:auto!important;max-width:none!important;min-width:0!important;flex:none!important;aspect-ratio:auto!important}}`;
  document.head.appendChild(style);
})();

// CLASS QUICK SHOW MENU v1.0
(() => {
  const systemButton = document.getElementById("systemMenuButton");
  const header = systemButton?.parentElement;
  if (!systemButton || !header || document.getElementById("classQuickShowButton")) return;
  const style = document.createElement("style");
  style.id = "classQuickShowStyleV1";
  style.textContent = `.class-quick-show-button{width:44px;height:44px;padding:0;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:#102b47;color:#ffe17a;font-size:23px;font-weight:1000;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 7px 22px rgba(0,0,0,.18)}.class-quick-show-button:hover{filter:brightness(1.12)}.class-quick-menu{position:fixed;z-index:1200;right:84px;top:68px;width:250px;padding:12px;border:1px solid rgba(246,196,81,.35);border-radius:16px;background:rgba(5,22,38,.98);box-shadow:0 20px 60px rgba(0,0,0,.5);backdrop-filter:blur(14px)}.class-quick-menu[hidden]{display:none!important}.class-quick-menu strong{display:block;margin:2px 4px 10px;color:#ffe799;font-size:14px}.class-quick-menu button{width:100%;min-height:52px;margin:5px 0;padding:10px 12px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:#123556;color:#fff;font-size:16px;font-weight:1000;cursor:pointer}.class-quick-menu button:hover{background:#18466f}.class-show-overlay{position:fixed;inset:0;z-index:5000;display:grid;place-items:center;padding:28px;background:radial-gradient(circle at center,rgba(20,62,100,.48),rgba(0,7,17,.88));backdrop-filter:blur(5px);animation:classOverlayIn .2s ease-out}.class-show-overlay[hidden]{display:none!important}.class-show-card{position:relative;width:min(920px,92vw);max-height:88vh;overflow:hidden;padding:28px 34px 30px;border:3px solid rgba(255,221,92,.86);border-radius:30px;background:linear-gradient(155deg,#0d2a47,#061526);box-shadow:0 0 0 6px rgba(255,255,255,.04),0 0 65px rgba(255,204,55,.32),0 28px 85px rgba(0,0,0,.58);text-align:center}.class-show-card h2{margin:0 0 10px;color:#ffe17a;font-size:clamp(30px,4vw,56px)}.class-show-countdown{position:absolute;right:22px;top:18px;min-width:52px;height:52px;padding:0 12px;border-radius:999px;display:grid;place-items:center;background:rgba(255,208,60,.14);border:1px solid rgba(255,224,118,.48);color:#ffe06b;font-size:24px;font-weight:1000}.class-character-image{display:block;width:auto;max-width:min(570px,70vw);height:min(54vh,520px);margin:4px auto 8px;object-fit:contain;filter:drop-shadow(0 16px 30px rgba(0,0,0,.4))}.class-character-stage{font-size:clamp(24px,3vw,40px);font-weight:1000;color:#fff}.class-character-score{margin-top:8px;font-size:clamp(20px,2.2vw,30px);font-weight:950;color:#ffd85c}.class-character-next{margin-top:8px;font-size:clamp(18px,1.9vw,26px);font-weight:900;color:#bfe3ff}.class-character-hint{margin-top:7px;color:#9fc0dc;font-size:15px}.class-mission-body{min-height:200px;display:grid;place-items:center;padding:18px 16px;font-size:clamp(28px,3.3vw,48px);line-height:1.45;font-weight:1000;color:#fff}.class-mission-body:empty::before{content:"오늘의 미션이 아직 입력되지 않았습니다.";color:#9db2c9;font-size:24px}@keyframes classOverlayIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}}@media(max-width:760px){.class-quick-show-button{display:none!important}.class-quick-menu{display:none!important}}`;
  document.head.appendChild(style);
  const quickButton=document.createElement("button");quickButton.id="classQuickShowButton";quickButton.className="class-quick-show-button";quickButton.type="button";quickButton.title="캐릭터 · 오늘의 미션 빠른 보기";quickButton.setAttribute("aria-label","캐릭터와 오늘의 미션 빠른 보기");quickButton.textContent="☰";header.insertBefore(quickButton,systemButton);
  const menu=document.createElement("div");menu.id="classQuickShowMenu";menu.className="class-quick-menu";menu.hidden=true;menu.innerHTML=`<strong>수업 빠른 보기</strong><button type="button" data-quick-show="character">🔥 공동성장 캐릭터</button><button type="button" data-quick-show="mission">🎯 오늘의 미션</button>`;document.body.appendChild(menu);
  const overlay=document.createElement("div");overlay.id="classShowOverlay";overlay.className="class-show-overlay";overlay.hidden=true;overlay.innerHTML=`<div class="class-show-card"><div class="class-show-countdown" id="classShowCountdown"></div><div id="classShowContent"></div></div>`;document.body.appendChild(overlay);
  let closeTimer=null,countdownTimer=null;
  const closeOverlay=()=>{clearTimeout(closeTimer);clearInterval(countdownTimer);overlay.hidden=true;document.getElementById("classShowContent").innerHTML=""};
  const openOverlay=(seconds,render)=>{closeOverlay();menu.hidden=true;const content=document.getElementById("classShowContent");render(content);overlay.hidden=false;let left=seconds;const counter=document.getElementById("classShowCountdown");counter.textContent=String(left);countdownTimer=setInterval(()=>{left-=1;counter.textContent=String(Math.max(0,left));if(left<=0)clearInterval(countdownTimer)},1000);closeTimer=setTimeout(closeOverlay,seconds*1000)};
  const showCharacter=()=>openOverlay(3,content=>{const img=document.querySelector("#growthStages img");const stageLabel=document.querySelector("#growthStages .growth-stage span")?.textContent?.trim()||"1 / 7";const score=document.getElementById("growthScore")?.textContent?.trim()||"⭐ 0 / 출석 대기";const next=document.getElementById("growthNext")?.textContent?.trim()||"다음 성장까지 확인 중";const hint=document.getElementById("growthHint")?.textContent?.trim()||"";content.innerHTML=`<h2>🔥 우리 반 공동성장</h2>${img?`<img class="class-character-image" src="${img.src}" alt="공동성장 캐릭터">`:""}<div class="class-character-stage">현재 캐릭터 ${stageLabel}</div><div class="class-character-score">${score}</div><div class="class-character-next">${next}</div><div class="class-character-hint">${hint}</div>`});
  const showMission=()=>openOverlay(5,content=>{const source=document.getElementById("missionInfo");content.innerHTML=`<h2>🎯 오늘의 미션</h2><div class="class-mission-body"></div>`;const body=content.querySelector(".class-mission-body");if(source)body.innerHTML=source.innerHTML});
  quickButton.addEventListener("click",e=>{e.stopPropagation();menu.hidden=!menu.hidden});menu.addEventListener("click",e=>{const button=e.target.closest("[data-quick-show]");if(!button)return;if(button.dataset.quickShow==="character")showCharacter();if(button.dataset.quickShow==="mission")showMission()});overlay.addEventListener("click",closeOverlay);document.addEventListener("click",e=>{if(!menu.hidden&&!menu.contains(e.target)&&e.target!==quickButton)menu.hidden=true});
})();

// LIVE STAR BOARD v1.0 — PHASE 1
(() => {
  const grid=document.getElementById("studentGrid");
  const starScreen=document.getElementById("starScreen");
  if(!grid||!starScreen)return;
  const LIVE_EFFECT_CONFIG=Object.freeze({cardEventMin:7000,cardEventMax:10000,cardEventDuration:2400,leaderEventMin:10000,leaderEventMax:14000,leaderEventDuration:2500,screenGlowMin:45000,screenGlowMax:75000,screenGlowDuration:3000,awardHitDuration:900});
  window.LIVE_EFFECT_CONFIG=LIVE_EFFECT_CONFIG;
  const reduceMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;if(reduceMotion)return;
  let lastCard=null,cardTimer=null,leaderTimer=null,screenTimer=null,effectBusy=false;
  const randomMs=(min,max)=>Math.floor(min+Math.random()*(max-min+1));
  const visible=()=>!document.hidden&&!starScreen.hidden;
  const cards=()=>[...grid.querySelectorAll(":scope > .student")].filter(card=>card.isConnected);
  const clearLiveClasses=card=>card?.classList.remove("live-gold-run","live-star-dance","live-card-pop","live-tilt");
  const scheduleCardEvent=()=>{clearTimeout(cardTimer);cardTimer=setTimeout(runCardEvent,randomMs(LIVE_EFFECT_CONFIG.cardEventMin,LIVE_EFFECT_CONFIG.cardEventMax))};
  const runCardEvent=()=>{if(!visible()||effectBusy){scheduleCardEvent();return}const list=cards();if(!list.length){scheduleCardEvent();return}let pool=list.filter(card=>card!==lastCard&&!card.classList.contains("current-leader"));if(!pool.length)pool=list.filter(card=>card!==lastCard);if(!pool.length)pool=list;const card=pool[Math.floor(Math.random()*pool.length)];const effects=["live-gold-run","live-star-dance","live-card-pop","live-tilt"];const effect=effects[Math.floor(Math.random()*effects.length)];effectBusy=true;lastCard=card;clearLiveClasses(card);void card.offsetWidth;card.classList.add(effect);setTimeout(()=>{clearLiveClasses(card);effectBusy=false},LIVE_EFFECT_CONFIG.cardEventDuration);scheduleCardEvent()};
  const scheduleLeaderEvent=()=>{clearTimeout(leaderTimer);leaderTimer=setTimeout(runLeaderEvent,randomMs(LIVE_EFFECT_CONFIG.leaderEventMin,LIVE_EFFECT_CONFIG.leaderEventMax))};
  const runLeaderEvent=()=>{if(visible()){const leaders=[...grid.querySelectorAll(":scope > .student.current-leader")];leaders.forEach(card=>{card.classList.remove("leader-live-event");void card.offsetWidth;card.classList.add("leader-live-event");setTimeout(()=>card.classList.remove("leader-live-event"),LIVE_EFFECT_CONFIG.leaderEventDuration)})}scheduleLeaderEvent()};
  const scheduleScreenSweep=()=>{clearTimeout(screenTimer);screenTimer=setTimeout(runScreenSweep,randomMs(LIVE_EFFECT_CONFIG.screenGlowMin,LIVE_EFFECT_CONFIG.screenGlowMax))};
  const runScreenSweep=()=>{if(visible()&&!document.querySelector(".live-screen-sweep")){const sweep=document.createElement("div");sweep.className="live-screen-sweep";sweep.setAttribute("aria-hidden","true");document.body.appendChild(sweep);setTimeout(()=>sweep.remove(),LIVE_EFFECT_CONFIG.screenGlowDuration)}scheduleScreenSweep()};
  new MutationObserver(mutations=>{for(const mutation of mutations){for(const node of mutation.addedNodes){if(!(node instanceof Element))continue;const plus=node.matches?.(".voice-plus")?node:node.querySelector?.(".voice-plus");if(!plus||!/⭐\s*\+1/.test(plus.textContent||""))continue;const card=plus.closest(".student");if(!card)continue;card.classList.remove("live-award-hit");void card.offsetWidth;card.classList.add("live-award-hit");setTimeout(()=>card.classList.remove("live-award-hit"),LIVE_EFFECT_CONFIG.awardHitDuration)}}}).observe(grid,{childList:true,subtree:true});
  grid.querySelectorAll(":scope > .student").forEach(clearLiveClasses);
  scheduleCardEvent();scheduleLeaderEvent();scheduleScreenSweep();
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){scheduleCardEvent();scheduleLeaderEvent();scheduleScreenSweep()}});
})();

// LIVE STAR BOARD v1.0 — PHASE 2
// Every 3 minutes, briefly show the current shared-growth character.
// When the real growth stage rises, show a stronger LEVEL UP celebration.
// Display-only: growth calculation/storage remains owned by star.js.
(() => {
  const starScreen=document.getElementById("starScreen");
  const growthStages=document.getElementById("growthStages");
  if(!starScreen||!growthStages)return;

  const CONFIG=Object.freeze({autoInterval:180000,autoDuration:4000,levelUpDuration:6500});
  window.LIVE_PHASE2_CONFIG=CONFIG;

  const style=document.createElement("style");
  style.id="liveGrowthPhase2Style";
  style.textContent=`
.live-growth-overlay{position:fixed;inset:0;z-index:5600;display:grid;place-items:center;padding:22px;pointer-events:none;background:radial-gradient(circle at center,rgba(27,79,119,.48),rgba(0,8,18,.88));backdrop-filter:blur(5px);animation:liveGrowthOverlayIn .28s ease-out}
.live-growth-overlay[hidden]{display:none!important}
.live-growth-card{position:relative;width:min(880px,92vw);max-height:90vh;overflow:hidden;padding:22px 32px 26px;border:3px solid rgba(255,221,91,.9);border-radius:32px;background:linear-gradient(155deg,#10395f,#061727);box-shadow:0 0 0 7px rgba(255,255,255,.045),0 0 80px rgba(255,205,55,.34),0 30px 90px rgba(0,0,0,.62);text-align:center;animation:liveGrowthCardPop .42s cubic-bezier(.18,.9,.25,1.28)}
.live-growth-kicker{font-size:clamp(18px,2vw,28px);font-weight:1000;color:#bfe4ff;letter-spacing:.02em}
.live-growth-title{margin:2px 0 6px;font-size:clamp(38px,5.5vw,76px);line-height:1;color:#ffe36d;text-shadow:0 0 24px rgba(255,211,68,.42)}
.live-growth-character{display:block;width:auto;max-width:min(580px,72vw);height:min(49vh,490px);margin:2px auto 8px;object-fit:contain;filter:drop-shadow(0 18px 34px rgba(0,0,0,.5));animation:liveGrowthCharacterFloat 2.1s ease-in-out infinite alternate}
.live-growth-stage{font-size:clamp(28px,3.2vw,44px);font-weight:1000;color:#fff}
.live-growth-score{margin-top:5px;font-size:clamp(21px,2.4vw,32px);font-weight:1000;color:#ffd85e}
.live-growth-next{margin-top:5px;font-size:clamp(18px,2vw,28px);font-weight:900;color:#bfe4ff}
.live-growth-meter{width:min(620px,82%);height:13px;margin:13px auto 0;border-radius:99px;overflow:hidden;background:rgba(255,255,255,.11);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
.live-growth-meter>i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#f6c451,#fff1a5);box-shadow:0 0 16px rgba(255,215,82,.6)}
.live-growth-countdown{position:absolute;right:20px;top:17px;width:50px;height:50px;display:grid;place-items:center;border:1px solid rgba(255,231,137,.48);border-radius:50%;background:rgba(255,211,76,.13);color:#ffe36d;font-size:22px;font-weight:1000}
.live-growth-overlay.level-up{background:radial-gradient(circle at center,rgba(255,185,26,.26),rgba(0,8,18,.93))}
.live-growth-overlay.level-up .live-growth-card{border-width:5px;box-shadow:0 0 0 9px rgba(255,255,255,.055),0 0 110px rgba(255,196,36,.72),0 34px 100px rgba(0,0,0,.7);animation:liveLevelCardBang .62s cubic-bezier(.15,.9,.22,1.3)}
.live-growth-overlay.level-up .live-growth-title{font-size:clamp(54px,7vw,98px);animation:liveLevelTitlePulse .8s ease-in-out infinite alternate}
.live-growth-overlay.level-up .live-growth-character{animation:liveLevelCharacter 1s ease-in-out infinite alternate}
.live-growth-particles{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.live-growth-particles i{position:absolute;font-style:normal;font-size:clamp(22px,2.5vw,38px);animation:liveGrowthParticle 2.6s ease-out infinite}
.live-growth-particles i:nth-child(1){left:7%;top:15%;animation-delay:0s}.live-growth-particles i:nth-child(2){left:18%;top:70%;animation-delay:.3s}.live-growth-particles i:nth-child(3){left:35%;top:9%;animation-delay:.7s}.live-growth-particles i:nth-child(4){right:34%;top:14%;animation-delay:.15s}.live-growth-particles i:nth-child(5){right:17%;top:67%;animation-delay:.55s}.live-growth-particles i:nth-child(6){right:6%;top:20%;animation-delay:.85s}
@keyframes liveGrowthOverlayIn{from{opacity:0}to{opacity:1}}@keyframes liveGrowthCardPop{from{opacity:0;transform:scale(.72)}to{opacity:1;transform:scale(1)}}
@keyframes liveGrowthCharacterFloat{from{transform:translateY(2px) scale(1)}to{transform:translateY(-8px) scale(1.025)}}
@keyframes liveLevelCardBang{0%{opacity:0;transform:scale(.55) rotate(-2deg)}65%{opacity:1;transform:scale(1.045) rotate(1deg)}100%{transform:scale(1)}}
@keyframes liveLevelTitlePulse{from{filter:brightness(1);transform:scale(1)}to{filter:brightness(1.28);transform:scale(1.045);text-shadow:0 0 36px rgba(255,227,98,.9)}}
@keyframes liveLevelCharacter{from{transform:translateY(2px) scale(1);filter:drop-shadow(0 18px 34px rgba(0,0,0,.5))}to{transform:translateY(-10px) scale(1.045);filter:drop-shadow(0 0 28px rgba(255,216,72,.55))}}
@keyframes liveGrowthParticle{0%{opacity:0;transform:translateY(20px) scale(.5) rotate(0)}25%{opacity:1}100%{opacity:0;transform:translateY(-90px) scale(1.2) rotate(70deg)}}
@media(max-width:760px){.live-growth-overlay{display:none!important}}
@media(prefers-reduced-motion:reduce){.live-growth-card,.live-growth-character,.live-growth-title,.live-growth-particles i{animation:none!important}}
`;
  document.head.appendChild(style);

  const overlay=document.createElement("div");
  overlay.className="live-growth-overlay";
  overlay.id="liveGrowthOverlay";
  overlay.hidden=true;
  document.body.appendChild(overlay);

  let autoTimer=null,closeTimer=null,countTimer=null,lastStage=0,baselineReady=false;
  const isVisible=()=>!document.hidden&&!starScreen.hidden&&window.innerWidth>760;
  const currentStage=()=>{
    const n=Number(growthStages.querySelector(".growth-stage")?.dataset?.stage||0);
    return Number.isFinite(n)?Math.max(0,Math.min(7,n)):0;
  };
  const currentImage=()=>document.getElementById("growthHeroImage")?.src||growthStages.querySelector(".growth-stage img")?.src||"";
  const parseProgress=()=>{
    const text=document.getElementById("growthScore")?.textContent||"";
    const m=text.match(/(\d+)\s*\/\s*(\d+)/);
    return m?{total:Number(m[1]),goal:Number(m[2])}:{total:0,goal:0};
  };
  const stageLabel=()=>growthStages.querySelector(".growth-stage span")?.textContent?.trim()||`${Math.max(1,currentStage())} / 7`;
  const nextText=()=>document.getElementById("growthNext")?.textContent?.replace(/\s+/g," ")?.trim()||"다음 성장까지 확인 중";
  const popupBusy=()=>!document.getElementById("classShowOverlay")?.hidden||!document.getElementById("starBurst")?.hidden||!document.getElementById("growthCelebration")?.hidden;

  const close=()=>{clearTimeout(closeTimer);clearInterval(countTimer);overlay.hidden=true;overlay.classList.remove("level-up");overlay.innerHTML=""};
  const show=(mode="auto",duration=CONFIG.autoDuration)=>{
    if(!isVisible()||popupBusy())return false;
    const stage=Math.max(1,currentStage());
    const img=currentImage();
    const progress=parseProgress();
    const percent=progress.goal?Math.min(100,Math.max(0,progress.total/progress.goal*100)):0;
    const seconds=Math.ceil(duration/1000);
    overlay.classList.toggle("level-up",mode==="level-up");
    overlay.innerHTML=`<div class="live-growth-card"><div class="live-growth-countdown">${seconds}</div><div class="live-growth-particles"><i>⭐</i><i>✨</i><i>🌟</i><i>✨</i><i>⭐</i><i>🌟</i></div><div class="live-growth-kicker">🔥 우리 반 공동성장</div><div class="live-growth-title">${mode==="level-up"?"LEVEL UP!":"성장 캐릭터"}</div>${img?`<img class="live-growth-character" src="${img}" alt="공동성장 ${stage}단계 캐릭터">`:""}<div class="live-growth-stage">${mode==="level-up"?`${stage}단계 달성!`:`현재 ${stageLabel()}`}</div><div class="live-growth-score">${progress.goal?`⭐ ${progress.total} / ${progress.goal} STAR`:"출석 후 공동성장이 시작됩니다"}</div><div class="live-growth-next">${nextText()}</div><div class="live-growth-meter"><i style="width:${percent}%"></i></div></div>`;
    overlay.hidden=false;
    clearTimeout(closeTimer);clearInterval(countTimer);
    let left=seconds;
    const counter=overlay.querySelector(".live-growth-countdown");
    countTimer=setInterval(()=>{left-=1;if(counter)counter.textContent=String(Math.max(0,left));if(left<=0)clearInterval(countTimer)},1000);
    closeTimer=setTimeout(close,duration);
    return true;
  };

  const scheduleAuto=()=>{clearTimeout(autoTimer);autoTimer=setTimeout(()=>{if(!show("auto",CONFIG.autoDuration)){setTimeout(()=>show("auto",CONFIG.autoDuration),10000)}scheduleAuto()},CONFIG.autoInterval)};

  const syncStage=()=>{
    const stage=currentStage();
    if(!stage)return;
    if(!baselineReady){lastStage=stage;baselineReady=true;return}
    if(stage>lastStage){
      const newStage=stage;
      lastStage=stage;
      setTimeout(()=>show("level-up",CONFIG.levelUpDuration),120);
      return;
    }
    lastStage=stage;
  };

  new MutationObserver(()=>syncStage()).observe(growthStages,{childList:true,subtree:true,attributes:true,attributeFilter:["data-stage"]});
  syncStage();
  scheduleAuto();
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)scheduleAuto()});
})();
