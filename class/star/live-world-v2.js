// STAR CLASS LIVE WORLD v2.0 — ALWAYS ALIVE ENGINE
// Display-only event manager. STAR, attendance, Supabase, UNDO, voice and SPARK logic stay in star.js.
(() => {
  "use strict";
  window.LIVE_WORLD_V2_ACTIVE = true;

  const LIVE_MODES = Object.freeze({
    calm: { rate: 1.35, glow: .72, particles: 4 },
    normal: { rate: 1, glow: 1, particles: 7 },
    fun: { rate: .72, glow: 1.18, particles: 10 }
  });
  const LIVE_CONFIG = Object.freeze({
    mode: "normal",
    cardEventMin: 5000, cardEventMax: 8000,
    leaderEventMin: 8000, leaderEventMax: 12000,
    droneMin: 25000, droneMax: 40000,
    rocketMin: 35000, rocketMax: 60000,
    cometMin: 30000, cometMax: 60000,
    characterPeekMin: 60000, characterPeekMax: 90000,
    growthPopupMin: 90000, growthPopupMax: 120000
  });
  window.LIVE_WORLD_MODES = LIVE_MODES;
  window.LIVE_WORLD_CONFIG = LIVE_CONFIG;

  const boot = () => {
    const screen = document.getElementById("starScreen");
    const grid = document.getElementById("studentGrid");
    if (!screen || !grid || document.getElementById("liveWorldV2Style")) return;

    const style = document.createElement("style");
    style.id = "liveWorldV2Style";
    style.textContent = `
#starScreen .student{--live-glow-strength:1;isolation:isolate}
#starScreen .student .student-line h2{position:relative;animation:lwv2NameShimmer 5.4s ease-in-out infinite!important}
#starScreen .student:nth-child(7n+1) h2{animation-delay:-.5s!important}#starScreen .student:nth-child(7n+2) h2{animation-delay:-1.8s!important}#starScreen .student:nth-child(7n+3) h2{animation-delay:-3.2s!important}#starScreen .student:nth-child(7n+4) h2{animation-delay:-4.4s!important}#starScreen .student:nth-child(7n+5) h2{animation-delay:-2.5s!important}#starScreen .student:nth-child(7n+6) h2{animation-delay:-5.1s!important}#starScreen .student:nth-child(7n+7) h2{animation-delay:-3.8s!important}
#starScreen .student .star-item{display:inline-block;animation:lwv2StarSparkle 4.1s ease-in-out infinite!important}
#starScreen .student .star-row:nth-child(1) .star-item:nth-child(1){animation-delay:-.2s!important}#starScreen .student .star-row:nth-child(1) .star-item:nth-child(2){animation-delay:-1.1s!important}#starScreen .student .star-row:nth-child(1) .star-item:nth-child(3){animation-delay:-2s!important}#starScreen .student .star-row:nth-child(1) .star-item:nth-child(4){animation-delay:-2.9s!important}#starScreen .student .star-row:nth-child(1) .star-item:nth-child(5){animation-delay:-3.8s!important}
#starScreen .student .star-row:nth-child(2) .star-item:nth-child(1){animation-delay:-2.45s!important}#starScreen .student .star-row:nth-child(2) .star-item:nth-child(2){animation-delay:-3.35s!important}#starScreen .student .star-row:nth-child(2) .star-item:nth-child(3){animation-delay:-.65s!important}#starScreen .student .star-row:nth-child(2) .star-item:nth-child(4){animation-delay:-1.55s!important}#starScreen .student .star-row:nth-child(2) .star-item:nth-child(5){animation-delay:-3.05s!important}
#starScreen .student .photo{animation:lwv2PhotoAura 6.3s ease-in-out infinite!important}
#starScreen .student:nth-child(3n+2) .photo{animation-delay:-2.1s!important}#starScreen .student:nth-child(3n+3) .photo{animation-delay:-4.2s!important}
#starScreen .student.lwv2-pop .star-main{animation:lwv2CardPop 1.85s cubic-bezier(.2,.82,.2,1.16)!important}
#starScreen .student.lwv2-tilt .star-main{transform-style:preserve-3d;animation:lwv2CardTilt 1.9s ease-in-out!important}
#starScreen .student.lwv2-name .student-line h2{animation:lwv2NameEvent 1.75s ease-out!important}
#starScreen .student.lwv2-photo .photo{animation:lwv2PhotoEvent 1.9s ease-out!important}
#starScreen .student.lwv2-border{overflow:visible!important}
#starScreen .student.lwv2-border::before{content:"";position:absolute;z-index:12;inset:-3px;border-radius:20px;padding:3px;pointer-events:none;background:conic-gradient(from 0deg,transparent 0 15%,#fff7c5 21%,#ffd33f 31%,transparent 40% 100%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:lwv2BorderRun 1.55s linear}
#starScreen .student.lwv2-wave .star-item{animation:lwv2StarWave .58s ease-in-out both!important}
#starScreen .student.lwv2-wave .star-row:nth-child(1) .star-item:nth-child(1){animation-delay:0s!important}#starScreen .student.lwv2-wave .star-row:nth-child(1) .star-item:nth-child(2){animation-delay:.12s!important}#starScreen .student.lwv2-wave .star-row:nth-child(1) .star-item:nth-child(3){animation-delay:.24s!important}#starScreen .student.lwv2-wave .star-row:nth-child(1) .star-item:nth-child(4){animation-delay:.36s!important}#starScreen .student.lwv2-wave .star-row:nth-child(1) .star-item:nth-child(5){animation-delay:.48s!important}#starScreen .student.lwv2-wave .star-row:nth-child(2) .star-item:nth-child(1){animation-delay:.60s!important}#starScreen .student.lwv2-wave .star-row:nth-child(2) .star-item:nth-child(2){animation-delay:.72s!important}#starScreen .student.lwv2-wave .star-row:nth-child(2) .star-item:nth-child(3){animation-delay:.84s!important}#starScreen .student.lwv2-wave .star-row:nth-child(2) .star-item:nth-child(4){animation-delay:.96s!important}#starScreen .student.lwv2-wave .star-row:nth-child(2) .star-item:nth-child(5){animation-delay:1.08s!important}
#starScreen .student.lwv2-award .star-main{animation:lwv2AwardCard 1.35s ease-out!important}#starScreen .student.lwv2-award .student-line h2{animation:lwv2NameEvent 1.15s ease-out!important}#starScreen .student.lwv2-award .star-item{animation:lwv2AwardStar .85s ease-out both!important}#starScreen .student.lwv2-award::after{content:"✨";position:absolute;z-index:14;right:8%;top:9%;font-size:30px;pointer-events:none;animation:lwv2AwardSpark 1.25s ease-out both}
#starScreen .student.lwv2-leader .leader-badge{animation:lwv2Crown 2.2s ease-in-out!important}#starScreen .student.lwv2-leader::after{content:"✨";position:absolute;z-index:15;left:7px;top:4px;font-size:28px;pointer-events:none;animation:lwv2GoldDust 2.2s ease-out}
.lwv2-drone,.lwv2-sky,.lwv2-peek,.lwv2-overlay,.lwv2-searchlight,.lwv2-particle{position:fixed;pointer-events:none}
.lwv2-drone{z-index:32;width:142px;height:90px;display:grid;place-items:center;font-size:70px;filter:drop-shadow(0 9px 12px #0008);will-change:transform,opacity}.lwv2-drone::after{content:"STAR DRONE";position:absolute;top:76px;padding:3px 9px;border:1px solid #9de8ff88;border-radius:99px;background:#061b2eee;color:#e7fbff;font:900 12px sans-serif;white-space:nowrap}.lwv2-searchlight{z-index:29;border-radius:50%;border:2px solid #9feaffaa;background:radial-gradient(circle,#bdf5ff40,transparent 68%);box-shadow:0 0 35px #7cddff77;animation:lwv2Search 1.4s ease-out both}.lwv2-particle{z-index:34;font-size:25px;animation:lwv2Particle 1.25s ease-out both}
.lwv2-sky{z-index:28;font-size:48px;will-change:transform,opacity;filter:drop-shadow(0 0 13px #ffe371cc)}.lwv2-sky::after{content:"";position:absolute;right:30px;top:23px;width:125px;height:7px;background:linear-gradient(90deg,transparent,#aeeaff66,#ffd76ccc);filter:blur(2px)}
.lwv2-peek{z-index:36;right:14px;bottom:12px;width:220px;padding:10px;border:2px solid #ffe17aaa;border-radius:24px;background:#071c30ee;text-align:center;transform:translateX(125%);animation:lwv2Peek 3s ease-in-out both}.lwv2-peek img{display:block;width:100%;height:185px;object-fit:contain}.lwv2-peek strong{display:block;color:#ffe47d;font-size:24px}
.lwv2-overlay{inset:0;z-index:5700;display:grid;place-items:center;background:radial-gradient(circle,#244f7a77,#020914e8);animation:lwv2OverlayIn .25s ease-out}.lwv2-overlay-card{position:relative;width:min(850px,92vw);padding:24px 32px;border:4px solid #ffe274;border-radius:30px;background:#08223a;box-shadow:0 0 70px #ffc83f77;text-align:center}.lwv2-overlay-card h2{margin:0;color:#ffe36e;font-size:clamp(46px,6vw,86px)}.lwv2-overlay-card img{display:block;width:auto;max-width:65vw;height:min(47vh,460px);margin:auto;object-fit:contain}.lwv2-overlay-card strong{display:block;font-size:clamp(25px,3vw,42px)}.lwv2-overlay-card p{margin:8px;color:#cceaff;font-size:22px;font-weight:900}.lwv2-overlay-card.milestone{animation:lwv2Milestone .55s cubic-bezier(.2,.9,.2,1.25)}
@keyframes lwv2NameShimmer{0%,68%,100%{color:#f8fbff;text-shadow:0 0 3px #7ed7ff33}78%{color:#fff8ce;text-shadow:0 0 8px #ffe16fbf,0 0 15px #7ed7ff66}}
@keyframes lwv2StarSparkle{0%,70%,100%{opacity:.88;transform:scale(1);filter:brightness(1)}80%{opacity:1;transform:scale(1.23);filter:brightness(1.4) drop-shadow(0 0 7px #ffe36f)}90%{transform:scale(1.04)}}
@keyframes lwv2PhotoAura{0%,100%{box-shadow:0 0 0 1px #8fdcff22,0 0 7px #69caff18}50%{box-shadow:0 0 0 2px #ffe37b77,0 0 15px #65ccff4f}}
@keyframes lwv2CardPop{0%,100%{transform:scale(1)}42%{transform:scale(1.04) translateY(-3px)}65%{transform:scale(1.018)}}@keyframes lwv2CardTilt{0%,100%{transform:perspective(850px) rotateY(0)}30%{transform:perspective(850px) rotateY(-6deg)}62%{transform:perspective(850px) rotateY(6deg)}}
@keyframes lwv2NameEvent{0%,100%{color:inherit;text-shadow:none;transform:scale(1)}45%{color:#fff5aa;text-shadow:0 0 16px #ffdf54,0 0 25px #63d4ff;transform:scale(1.06)}}@keyframes lwv2PhotoEvent{0%,100%{box-shadow:0 0 5px #5dcfff33}45%{box-shadow:0 0 0 3px #fff1a7dd,0 0 30px #69d7ffbb}}
@keyframes lwv2BorderRun{to{transform:rotate(360deg)}}@keyframes lwv2StarWave{0%,100%{transform:translateY(0) scale(1);filter:none}48%{transform:translateY(-8px) scale(1.24);filter:brightness(1.55) drop-shadow(0 0 10px #ffe45d)}}
@keyframes lwv2AwardCard{0%,100%{transform:scale(1)}35%{transform:scale(1.045) translateY(-4px);filter:drop-shadow(0 0 15px #ffd64f)}65%{transform:scale(1.02)}}@keyframes lwv2AwardStar{0%,100%{transform:scale(1)}45%{transform:scale(1.3);filter:brightness(1.7) drop-shadow(0 0 10px #fff08b)}}@keyframes lwv2AwardSpark{0%{opacity:0;transform:scale(.4)}35%{opacity:1;transform:scale(1.4) rotate(20deg)}100%{opacity:0;transform:translateY(45px) rotate(55deg)}}
@keyframes lwv2Crown{0%,100%{transform:translateY(0) scale(1)}35%{transform:translateY(-10px) scale(1.18);filter:drop-shadow(0 0 12px #fff1a1)}65%{transform:translateY(-4px) rotate(5deg)}}@keyframes lwv2GoldDust{0%{opacity:0;transform:scale(.4)}35%{opacity:1;transform:translateY(8px) scale(1.3)}100%{opacity:0;transform:translateY(58px) rotate(35deg)}}
@keyframes lwv2Search{0%,100%{opacity:0;transform:scale(.7)}30%,72%{opacity:1;transform:scale(1)}}@keyframes lwv2Particle{0%{opacity:0;transform:translateY(-12px) scale(.5)}28%{opacity:1;transform:scale(1.25)}100%{opacity:0;transform:translateY(62px) rotate(50deg)}}
@keyframes lwv2Peek{0%,100%{transform:translateX(125%);opacity:0}18%,78%{transform:translateX(0);opacity:1}}@keyframes lwv2OverlayIn{from{opacity:0}to{opacity:1}}@keyframes lwv2Milestone{from{opacity:0;transform:scale(.55)}70%{transform:scale(1.06)}to{transform:scale(1)}}
@media(max-width:760px){.lwv2-drone,.lwv2-sky,.lwv2-peek,.lwv2-overlay,.lwv2-searchlight,.lwv2-particle{display:none!important}}
@media(prefers-reduced-motion:reduce){#starScreen .student h2,#starScreen .student .star-item,#starScreen .student .photo{animation:none!important}}
`;
    document.head.appendChild(style);

    const mode = LIVE_MODES[LIVE_CONFIG.mode] || LIVE_MODES.normal;
    const random = (min, max) => Math.round((min + Math.random() * (max - min)) * mode.rate);
    const now = () => performance.now();
    const state = { busyUntil: 0, busyType: "", lastStudent: "", lastEvent: "", queue: [], events: [], timer: null, startedAt: now() };
    const jobs = [
      { type: "small", level: 1, min: LIVE_CONFIG.cardEventMin, max: LIVE_CONFIG.cardEventMax },
      { type: "leader", level: 1, min: LIVE_CONFIG.leaderEventMin, max: LIVE_CONFIG.leaderEventMax },
      { type: "drone", level: 2, min: LIVE_CONFIG.droneMin, max: LIVE_CONFIG.droneMax },
      { type: "rocket", level: 2, min: LIVE_CONFIG.rocketMin, max: LIVE_CONFIG.rocketMax },
      { type: "comet", level: 2, min: LIVE_CONFIG.cometMin, max: LIVE_CONFIG.cometMax },
      { type: "peek", level: 2, min: LIVE_CONFIG.characterPeekMin, max: LIVE_CONFIG.characterPeekMax },
      { type: "growth", level: 3, min: LIVE_CONFIG.growthPopupMin, max: LIVE_CONFIG.growthPopupMax }
    ];
    jobs.forEach((job, index) => { job.nextAt = now() + random(index < 3 ? job.min * .35 : job.min * .55, index < 3 ? job.max * .65 : job.max * .78); });

    const cards = () => [...grid.querySelectorAll(":scope > .student[data-student]")].filter(el => el.isConnected);
    const uiBusy = () => document.hidden || screen.hidden || !document.getElementById("starBurst")?.hidden || !document.getElementById("growthCelebration")?.hidden || !document.getElementById("classShowOverlay")?.hidden || !!document.querySelector("dialog[open]") || !document.getElementById("systemMenu")?.hidden;
    const record = (type, detail = {}) => { state.events.push({ type, at: Date.now(), ...detail }); if (state.events.length > 160) state.events.splice(0, 40); document.dispatchEvent(new CustomEvent(`kmt:live-world:${type}`, { detail })); };
    const occupy = (type, duration) => { state.busyType = type; state.busyUntil = now() + duration; record(type); };
    const cleanup = (node, ms) => setTimeout(() => node?.remove(), ms);
    const chooseCard = () => { const list = cards(); if (!list.length) return null; let pool = list.filter(c => c.dataset.student !== state.lastStudent); if (!pool.length) pool = list; const card = pool[Math.floor(Math.random() * pool.length)]; state.lastStudent = card.dataset.student; return card; };
    const runCardClass = (card, cls, duration = 2200) => { if (!card) return false; card.classList.remove(cls); void card.offsetWidth; card.classList.add(cls); setTimeout(() => card.classList.remove(cls), duration + 80); return true; };

    const smallEvents = [
      ["border", "lwv2-border"], ["pop", "lwv2-pop"], ["tilt", "lwv2-tilt"],
      ["name-glow", "lwv2-name"], ["star-wave", "lwv2-wave"], ["photo-glow", "lwv2-photo"]
    ];
    const runSmall = () => { const card = chooseCard(); if (!card) return false; let pool = smallEvents.filter(([name]) => name !== state.lastEvent); if (!pool.length) pool = smallEvents; const [name, cls] = pool[Math.floor(Math.random() * pool.length)]; state.lastEvent = name; runCardClass(card, cls); occupy(`small:${name}`, 2200); return true; };
    const runLeader = () => { const card = grid.querySelector(":scope > .student.current-leader"); if (!card) return false; runCardClass(card, "lwv2-leader", 2300); occupy("leader", 2300); return true; };

    const dropAt = (card, icon = "✨") => { const r = card.getBoundingClientRect(); const p = document.createElement("i"); p.className = "lwv2-particle"; p.textContent = icon; p.style.left = `${r.left + r.width * .5}px`; p.style.top = `${Math.max(78, r.top - 10)}px`; document.body.appendChild(p); cleanup(p, 1400); };
    const runDrone = () => { const card = chooseCard(); if (!card) return false; const r = card.getBoundingClientRect(), fromLeft = Math.random() < .5, drone = document.createElement("div"); drone.className = "lwv2-drone"; drone.textContent = "🚁"; document.body.appendChild(drone); const sx = fromLeft ? -170 : innerWidth + 170, tx = Math.max(20, Math.min(innerWidth - 160, r.left + r.width / 2 - 70)), ty = Math.max(88, r.top - 90), ex = fromLeft ? innerWidth + 170 : -170; const a = drone.animate([{ transform:`translate3d(${sx}px,120px,0)`,opacity:0},{transform:`translate3d(${tx}px,${ty}px,0)`,opacity:1,offset:.38},{transform:`translate3d(${tx}px,${ty}px,0)`,opacity:1,offset:.68},{transform:`translate3d(${ex}px,80px,0)`,opacity:0}],{duration:6800,easing:"cubic-bezier(.2,.7,.2,1)",fill:"forwards"}); setTimeout(()=>{const light=document.createElement("div");light.className="lwv2-searchlight";light.style.left=`${r.left+r.width*.18}px`;light.style.top=`${r.top}px`;light.style.width=`${r.width*.64}px`;light.style.height=`${r.height*.75}px`;document.body.appendChild(light);cleanup(light,1500);dropAt(card)},3300); a.finished.finally(()=>drone.remove()); occupy("drone",7000); return true; };
    const runSky = type => { const el = document.createElement("div"), reverse = Math.random() < .5; el.className = "lwv2-sky"; el.textContent = type === "rocket" ? "🚀" : "🌟"; document.body.appendChild(el); const sy = innerHeight * (.68 + Math.random() * .16), ey = innerHeight * (.10 + Math.random() * .18), sx = reverse ? innerWidth + 150 : -150, ex = reverse ? -180 : innerWidth + 180; el.style.transform = reverse ? "scaleX(-1)" : ""; const a=el.animate([{transform:`translate3d(${sx}px,${sy}px,0) ${reverse?"scaleX(-1)":""}`,opacity:0},{opacity:1,offset:.12},{opacity:1,offset:.82},{transform:`translate3d(${ex}px,${ey}px,0) ${reverse?"scaleX(-1)":""}`,opacity:0}],{duration:type==="rocket"?3200:2800,easing:"cubic-bezier(.18,.62,.22,1)",fill:"forwards"});a.finished.finally(()=>el.remove());occupy(type,type==="rocket"?3400:3000);return true; };
    const growthData = () => { const stageEl=document.querySelector("#growthStages .growth-stage"), score=document.getElementById("growthScore")?.textContent||"", next=document.getElementById("growthNext")?.textContent?.replace(/\s+/g," ").trim()||""; return { stage:Math.max(1,Number(stageEl?.dataset.stage||1)), image:stageEl?.querySelector("img")?.src||"", score, next }; };
    const runPeek = () => { const g=growthData(); if(!g.image)return false; const el=document.createElement("div");el.className="lwv2-peek";el.innerHTML=`<img src="${g.image}" alt=""><strong>${g.stage} / 7</strong>`;document.body.appendChild(el);cleanup(el,3200);occupy("peek",3200);return true; };
    const runGrowth = () => { const g=growthData(), el=document.createElement("div"); if(!g.image)return false;el.className="lwv2-overlay";el.innerHTML=`<div class="lwv2-overlay-card"><h2>우리 반 공동성장</h2><img src="${g.image}" alt="공동성장 ${g.stage}단계"><strong>${g.stage} / 7</strong><p>${g.score}</p><p>${g.next}</p></div>`;document.body.appendChild(el);cleanup(el,4200);occupy("growth",4200);return true; };
    const showMilestone = (card, total) => { const name=card?.querySelector("h2")?.textContent||"STAR HERO", el=document.createElement("div");el.className="lwv2-overlay";el.innerHTML=`<div class="lwv2-overlay-card milestone"><h2>${total===10?"🌟 STAR 10 달성!":"⭐ 5 STAR!"}</h2><strong>${name}</strong><p>${"⭐".repeat(Math.min(total,10))}</p></div>`;document.body.appendChild(el);const duration=total===10?3900:3000;cleanup(el,duration);occupy(`milestone:${total}`,duration); };

    const runners = { small:runSmall, leader:runLeader, drone:runDrone, rocket:()=>runSky("rocket"), comet:()=>runSky("comet"), peek:runPeek, growth:runGrowth };
    const schedule = job => { job.nextAt = now() + random(job.min, job.max); };
    const tick = () => {
      const t=now();
      if (t >= state.busyUntil) { state.busyType=""; state.busyUntil=0; }
      if (!uiBusy() && !state.busyType) {
        const queued=state.queue.shift();
        if(queued){showMilestone(queued.card,queued.total)}
        else { const due=jobs.filter(j=>j.nextAt<=t).sort((a,b)=>b.level-a.level||a.nextAt-b.nextAt)[0]; if(due){const ran=runners[due.type]?.();schedule(due);if(!ran)due.nextAt=t+3000;} }
      }
      state.timer=setTimeout(tick,250);
    };

    new MutationObserver(mutations => { for(const mutation of mutations){ for(const node of mutation.addedNodes){ if(!(node instanceof Element))continue; const plus=node.matches?.(".voice-plus")?node:node.querySelector?.(".voice-plus"); if(!plus||!/⭐\s*\+1/.test(plus.textContent||""))continue; const card=plus.closest(".student"); if(!card)continue; runCardClass(card,"lwv2-award",1400);record("award",{studentId:card.dataset.student});setTimeout(()=>{const total=Number(card.querySelector(".star-count")?.dataset.starCount||0);if(total===5||total===10)state.queue.push({card,total});},120); } } }).observe(grid,{childList:true,subtree:true});

    const snapshot = () => { const times=state.events.map(e=>e.at), gaps=times.slice(1).map((t,i)=>t-times[i]); return { config:LIVE_CONFIG, mode:LIVE_CONFIG.mode, busyType:state.busyType, cardCount:cards().length, eventCount:state.events.length, events:[...state.events], longestEventStartGapMs:gaps.length?Math.max(...gaps):0, running:!!state.timer }; };
    window.LIVE_EVENT_MANAGER = { version:"2.0.0", config:LIVE_CONFIG, modes:LIVE_MODES, snapshot, testEvent(type){const card=cards()[0];if(type==="milestone5"||type==="milestone10"){state.queue.unshift({card,total:type==="milestone10"?10:5});return true}const runner=runners[type];return runner?runner():false}, stop(){clearTimeout(state.timer);state.timer=null} };
    record("engine-ready",{version:"2.0.0"});
    tick();
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else setTimeout(boot,0);
})();
