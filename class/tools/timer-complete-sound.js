// TIMER COMPLETE SOUND v1.0
// Display/audio-only patch: when the existing timer reaches TIME!, play the same sound used by 전체별 +1.
(() => {
  const AUDIO_URL = "../../assets/star-effects/all-star-cheer.mp3";
  const overlay = document.getElementById("timerOverlay");
  const startButton = document.getElementById("timerStart");
  if (!overlay) return;

  const audio = new Audio(AUDIO_URL);
  audio.preload = "auto";
  audio.volume = 1;
  let primed = false;
  let wasHidden = overlay.hidden;

  const prime = () => {
    if (primed) return;
    try {
      const oldVolume = audio.volume;
      audio.volume = 0;
      audio.currentTime = 0;
      const p = audio.play();
      if (p?.then) {
        p.then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = oldVolume;
          primed = true;
        }).catch(() => {
          audio.volume = oldVolume;
        });
      }
    } catch (_) {
      audio.volume = 1;
    }
  };

  const playFinishSound = () => {
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
      const p = audio.play();
      if (p?.catch) p.catch(err => console.warn("[TIMER COMPLETE SOUND]", err));
    } catch (err) {
      console.warn("[TIMER COMPLETE SOUND]", err);
    }
  };

  startButton?.addEventListener("pointerdown", prime, { passive: true });
  startButton?.addEventListener("click", prime, { passive: true });

  new MutationObserver(() => {
    const hidden = overlay.hidden;
    if (wasHidden && !hidden) playFinishSound();
    wasHidden = hidden;
  }).observe(overlay, { attributes: true, attributeFilter: ["hidden"] });
})();
