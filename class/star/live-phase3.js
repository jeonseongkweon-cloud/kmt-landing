// STAR PINSET loader — load display refinement first, then ranking refinement.
(() => {
  const base = document.currentScript?.src || location.href;
  const load = (file, done) => {
    const s = document.createElement('script');
    s.src = new URL(file, base).href;
    s.onload = () => done?.();
    document.head.appendChild(s);
  };
  load('./star-display-pinset.js?v=130', () => load('./star-rank-pinset.js?v=100'));
})();

// LIVE STAR BOARD v1.0 — PHASE 3
// Fun display-only events for young students: mini drone fly-by + rare comet surprise.
// Never changes STAR totals, attendance, Supabase, UNDO, voice, growth calculation or SPARK data.
(() => {
  const starScreen = document.getElementById("starScreen");
  const grid = document.getElementById("studentGrid");
  if (!starScreen || !grid) return;

  const CONFIG = Object.freeze({
    droneMin: 45000,
    droneMax: 90000,
    droneDuration: 7600,
    dronePauseAtCard: 1500,
    surpriseMin: 70000,
    surpriseMax: 130000,
    surpriseDuration: 2600
  });
  window.LIVE_PHASE3_CONFIG = CONFIG;

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

  const style = document.createElement("style");
  style.id = "livePhase3Style";
  style.textContent = `
.live-drone-wrap{position:fixed;z-index:4200;left:0;top:0;width:90px;height:64px;pointer-events:none;will-change:transform,opacity;filter:drop-shadow(0 10px 10px rgba(0,0,0,.35))}
.live-drone{position:relative;width:86px;height:58px;transform-origin:center;animation:droneBob .7s ease-in-out infinite alternate}
.live-drone-body{position:absolute;left:27px;top:22px;width:34px;height:20px;border:2px solid #bfe8ff;border-radius:13px 13px 17px 17px;background:linear-gradient(180deg,#2d719d,#0e3652);box-shadow:0 0 12px rgba(116,210,255,.35)}
.live-drone-eye{position:absolute;left:39px;top:29px;width:10px;height:7px;border-radius:50%;background:#7df4ff;box-shadow:0 0 11px #5deeff;animation:droneEye 1s ease-in-out infinite alternate}
.live-drone-arm{position:absolute;left:12px;top:26px;width:64px;height:4px;border-radius:4px;background:#91bed5}
.live-drone-rotor{position:absolute;width:28px;height:5px;border-radius:50%;background:rgba(209,245,255,.92);box-shadow:0 0 8px rgba(158,231,255,.7);animation:droneRotor .11s linear infinite}
.live-drone-rotor.r1{left:2px;top:12px}.live-drone-rotor.r2{right:0;top:12px}.live-drone-rotor.r3{left:4px;top:40px}.live-drone-rotor.r4{right:2px;top:40px}
.live-drone-light{position:absolute;left:43px;top:45px;width:5px;height:5px;border-radius:50%;background:#ffd95d;box-shadow:0 0 9px #ffd95d;animation:droneLight .45s steps(2,end) infinite}
.live-drone-label{position:absolute;left:50%;top:57px;transform:translateX(-50%);white-space:nowrap;padding:3px 8px;border-radius:999px;background:rgba(4,24,40,.86);border:1px solid rgba(147,221,255,.38);color:#dff7ff;font-size:11px;font-weight:900;opacity:.88}
.live-drone-spark{position:fixed;z-index:4210;pointer-events:none;font-size:30px;will-change:transform,opacity;animation:droneSparkDrop 1.15s ease-out both}
.live-drone-target{animation:droneTargetGlow 1.8s ease-in-out both!important;z-index:8!important}
.live-surprise-comet{position:fixed;z-index:4100;left:-130px;top:15vh;width:120px;height:30px;pointer-events:none;will-change:transform,opacity;animation:cometFly 2.6s cubic-bezier(.12,.65,.25,1) both}
.live-surprise-comet::before{content:"🌟";position:absolute;right:0;top:-8px;font-size:38px;filter:drop-shadow(0 0 12px rgba(255,224,93,.9))}
.live-surprise-comet::after{content:"";position:absolute;right:24px;top:8px;width:95px;height:7px;border-radius:99px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),rgba(255,223,104,.75));filter:blur(2px)}
@keyframes droneBob{from{transform:translateY(-2px) rotate(-1deg)}to{transform:translateY(3px) rotate(1deg)}}
@keyframes droneRotor{to{transform:rotate(360deg)}}
@keyframes droneEye{from{opacity:.45}to{opacity:1}}
@keyframes droneLight{0%{opacity:.2}100%{opacity:1}}
@keyframes droneSparkDrop{0%{opacity:0;transform:translateY(-12px) scale(.5) rotate(0)}30%{opacity:1;transform:translateY(0) scale(1.25) rotate(10deg)}100%{opacity:0;transform:translateY(58px) scale(.75) rotate(45deg)}}
@keyframes droneTargetGlow{0%,100%{box-shadow:inherit;transform:translateY(0)}38%{box-shadow:0 0 0 3px rgba(117,230,255,.68),0 0 28px rgba(91,211,255,.48),0 0 52px rgba(255,220,83,.22);transform:translateY(-2px)}65%{box-shadow:0 0 0 2px rgba(255,225,111,.62),0 0 24px rgba(255,209,66,.38)}}
@keyframes cometFly{0%{opacity:0;transform:translate3d(0,0,0) rotate(-15deg) scale(.8)}10%{opacity:1}78%{opacity:1}100%{opacity:0;transform:translate3d(calc(100vw + 260px),62vh,0) rotate(-15deg) scale(1.12)}}
@media(max-width:760px){.live-drone-wrap,.live-drone-spark,.live-surprise-comet{display:none!important}}
`;
  document.head.appendChild(style);

  let droneTimer = null;
  let surpriseTimer = null;
  let droneActive = false;
  let surpriseActive = false;
  let lastTarget = null;

  const randomMs = (min, max) => Math.floor(min + Math.random() * (max - min + 1));
  const visible = () => !document.hidden && !starScreen.hidden && window.innerWidth > 760;
  const busy = () => droneActive || surpriseActive ||
    !document.getElementById("classShowOverlay")?.hidden ||
    !document.getElementById("liveGrowthOverlay")?.hidden ||
    !document.getElementById("starBurst")?.hidden ||
    !document.getElementById("growthCelebration")?.hidden;
  const cards = () => [...grid.querySelectorAll(":scope > .student")].filter(card => card.isConnected);

  const chooseTarget = () => {
    const list = cards();
    if (!list.length) return null;
    let pool = list.filter(card => card !== lastTarget);
    if (!pool.length) pool = list;
    return pool[Math.floor(Math.random() * pool.length)] || null;
  };

  const makeDrone = () => {
    const wrap = document.createElement("div");
    wrap.className = "live-drone-wrap";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML = `<div class="live-drone"><i class="live-drone-arm"></i><i class="live-drone-rotor r1"></i><i class="live-drone-rotor r2"></i><i class="live-drone-rotor r3"></i><i class="live-drone-rotor r4"></i><i class="live-drone-body"></i><i class="live-drone-eye"></i><i class="live-drone-light"></i><span class="live-drone-label">STAR DRONE</span></div>`;
    document.body.appendChild(wrap);
    return wrap;
  };

  const dropSpark = target => {
    if (!target?.isConnected) return;
    const rect = target.getBoundingClientRect();
    const spark = document.createElement("div");
    spark.className = "live-drone-spark";
    spark.textContent = Math.random() < .5 ? "✨" : "⭐";
    spark.style.left = `${rect.left + rect.width * .5 - 15}px`;
    spark.style.top = `${Math.max(78, rect.top - 10)}px`;
    spark.setAttribute("aria-hidden", "true");
    document.body.appendChild(spark);
    target.classList.add("live-drone-target");
    setTimeout(() => target.classList.remove("live-drone-target"), 1850);
    setTimeout(() => spark.remove(), 1250);
  };

  const runDrone = () => {
    if (!visible() || busy()) { scheduleDrone(); return; }
    const target = chooseTarget();
    if (!target) { scheduleDrone(); return; }

    droneActive = true;
    lastTarget = target;
    const drone = makeDrone();
    const rect = target.getBoundingClientRect();
    const fromLeft = Math.random() < .5;
    const startX = fromLeft ? -120 : window.innerWidth + 120;
    const targetX = Math.max(24, Math.min(window.innerWidth - 110, rect.left + rect.width * .5 - 45));
    const targetY = Math.max(90, Math.min(window.innerHeight - 150, rect.top - 54));
    const exitX = fromLeft ? window.innerWidth + 140 : -140;
    const startY = Math.max(90, Math.min(window.innerHeight - 160, targetY + (Math.random() * 120 - 60)));

    const animation = drone.animate([
      { transform:`translate3d(${startX}px,${startY}px,0) scale(.85)`, opacity:0, offset:0 },
      { opacity:1, offset:.08 },
      { transform:`translate3d(${targetX}px,${targetY}px,0) scale(1)`, opacity:1, offset:.38 },
      { transform:`translate3d(${targetX}px,${targetY - 5}px,0) scale(1.08)`, opacity:1, offset:.58 },
      { transform:`translate3d(${targetX}px,${targetY}px,0) scale(1)`, opacity:1, offset:.68 },
      { transform:`translate3d(${exitX}px,${Math.max(75,targetY - 40)}px,0) scale(.9)`, opacity:.9, offset:.94 },
      { opacity:0, offset:1 }
    ], { duration: CONFIG.droneDuration, easing:"cubic-bezier(.2,.7,.2,1)", fill:"forwards" });

    setTimeout(() => dropSpark(target), Math.round(CONFIG.droneDuration * .52));
    animation.finished.finally(() => {
      drone.remove();
      droneActive = false;
      scheduleDrone();
    });
  };

  const runSurprise = () => {
    if (!visible() || busy()) { scheduleSurprise(); return; }
    surpriseActive = true;
    const comet = document.createElement("div");
    comet.className = "live-surprise-comet";
    comet.style.top = `${12 + Math.random() * 28}vh`;
    comet.setAttribute("aria-hidden", "true");
    document.body.appendChild(comet);
    setTimeout(() => {
      comet.remove();
      surpriseActive = false;
      scheduleSurprise();
    }, CONFIG.surpriseDuration + 150);
  };

  const scheduleDrone = () => {
    clearTimeout(droneTimer);
    droneTimer = setTimeout(runDrone, randomMs(CONFIG.droneMin, CONFIG.droneMax));
  };
  const scheduleSurprise = () => {
    clearTimeout(surpriseTimer);
    surpriseTimer = setTimeout(runSurprise, randomMs(CONFIG.surpriseMin, CONFIG.surpriseMax));
  };

  scheduleDrone();
  scheduleSurprise();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      scheduleDrone();
      scheduleSurprise();
    }
  });
})();
