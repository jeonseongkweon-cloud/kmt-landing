window.KMT_STAR_CONFIG = Object.freeze({
  version:"1.5.3",
  supabaseUrl: "https://ojxarsfaewehwjidwgac.supabase.co",
  supabasePublishableKey: "sb_publishable_ZoAZrV5rDmYDLxhXlnEXCw_lPqJfin0",
  allowedAdminEmail: "class-admin@ipma.kr",
  timezone: "Asia/Seoul",
  perfectStar: 12,
  globalSparkConnectorUrl: "https://jdlrmtcsbaklbexrjwjq.supabase.co/functions/v1/kmt-class-star",
  globalSparkCenterCode: "KMT-000001",
  globalSparkConnectorVersion: "1.0.2"
});

// STAR SOUND POLICY v1.0
// Routine STAR feedback is visual-first; only entry/all-star/growth moments keep restrained audio.
(()=>{
  const mediaVolume=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,"volume");
  if(mediaVolume?.set&&mediaVolume?.get){
    Object.defineProperty(HTMLMediaElement.prototype,"volume",{
      configurable:true,
      enumerable:mediaVolume.enumerable,
      get:mediaVolume.get,
      set(value){
        const src=String(this.currentSrc||this.src||"");
        let next=Number(value);
        if(src.includes("leader-change.wav"))next=0;
        else if(src.includes("star-room-entry.mp3"))next=Math.min(next,.68);
        else if(src.includes("all-star-cheer.mp3"))next=Math.min(next,.22);
        else if(src.includes("growth-level-up.mp3"))next=Math.min(next,.38);
        return mediaVolume.set.call(this,next);
      }
    });
  }

  const ramp=AudioParam?.prototype?.exponentialRampToValueAtTime;
  if(ramp){
    AudioParam.prototype.exponentialRampToValueAtTime=function(value,endTime){
      const stack=String(new Error().stack||"");
      let next=value;
      if(stack.includes("playStarSound"))next=.0001;
      else if(stack.includes("playGrowthSound")&&next>.0001)next=Math.max(.0001,next*.42);
      return ramp.call(this,next,endTime);
    };
  }
})();
