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

// PC STAR PINPOINT PATCH v1.0
// 기존 STAR 저장 로직은 건드리지 않고, PC 전체별 버튼 노출 + 기존 highlightStudent 효과를 PC에서도 선명하게 표시한다.
(()=>{
  function mountPcStarPatch(){
    const toolbar=document.querySelector("header .pc-star-toolbar");
    const sourceAll=document.getElementById("awardAllButton");
    if(toolbar&&sourceAll&&!document.getElementById("pcAwardAllButton")){
      const btn=document.createElement("button");
      btn.id="pcAwardAllButton";
      btn.type="button";
      btn.textContent="⭐ 전체별 +1";
      btn.setAttribute("aria-label","현재 출석학생 전체에게 선택된 STAR 1개 지급");
      const picker=document.getElementById("categoryPickerButton");
      if(picker?.nextSibling) toolbar.insertBefore(btn,picker.nextSibling);
      else toolbar.appendChild(btn);
      btn.addEventListener("click",()=>sourceAll.click());
    }

    if(!document.getElementById("pcStarVisualPatch")){
      const style=document.createElement("style");
      style.id="pcStarVisualPatch";
      style.textContent=`
        @media(min-width:761px){
          #pcAwardAllButton{
            height:36px!important;
            min-height:36px!important;
            margin:0!important;
            padding:0 13px!important;
            border:1px solid rgba(246,196,81,.62)!important;
            border-radius:10px!important;
            background:linear-gradient(135deg,rgba(246,196,81,.22),rgba(255,145,0,.13))!important;
            color:#ffe69b!important;
            font-size:13px!important;
            font-weight:1000!important;
            white-space:nowrap!important;
            cursor:pointer!important;
            box-shadow:0 0 0 1px rgba(255,220,95,.06) inset!important;
          }
          #pcAwardAllButton:hover{filter:brightness(1.13)}

          #studentGrid .student.voice-hit{
            z-index:20!important;
            animation:pcStarCardHit .95s cubic-bezier(.18,.88,.28,1.25)!important;
            box-shadow:0 0 0 4px rgba(255,224,96,.95),0 0 42px rgba(255,211,69,.82),0 0 78px rgba(255,171,42,.38)!important;
          }
          #studentGrid .student.voice-hit::before{
            content:"";
            position:absolute;
            inset:-30%;
            z-index:9;
            pointer-events:none;
            background:radial-gradient(circle,rgba(255,255,235,.92) 0 7%,rgba(255,226,92,.45) 18%,transparent 52%);
            animation:pcStarFlash .82s ease-out both!important;
          }
          #studentGrid .student.voice-hit .photo{
            animation:pcStarPhotoFlash .92s ease-out both!important;
          }
          #studentGrid .student.voice-hit .voice-plus{
            z-index:12!important;
            font-size:30px!important;
            color:#fff6a9!important;
            text-shadow:0 0 14px #ffcf32,0 3px 10px rgba(0,0,0,.8)!important;
          }
        }
        @keyframes pcStarCardHit{
          0%{transform:scale(1);filter:brightness(1)}
          28%{transform:scale(1.115);filter:brightness(1.7)}
          58%{transform:scale(1.055);filter:brightness(1.22)}
          100%{transform:scale(1);filter:brightness(1)}
        }
        @keyframes pcStarFlash{
          0%{opacity:0;transform:scale(.55) rotate(-8deg)}
          25%{opacity:1;transform:scale(1.05) rotate(0)}
          100%{opacity:0;transform:scale(1.45) rotate(8deg)}
        }
        @keyframes pcStarPhotoFlash{
          0%,100%{filter:none}
          28%{filter:brightness(1.75) saturate(1.35)}
          62%{filter:brightness(1.18) saturate(1.12)}
        }
      `;
      document.head.appendChild(style);
    }
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",mountPcStarPatch,{once:true});
  else mountPcStarPatch();
})();

// STAR RANK ORDER PINPOINT PATCH loader
// 카드 표시 순서와 PC 1등 강조만 보정하며 STAR 저장/음성/Supabase 로직은 건드리지 않는다.
(()=>{
  const script=document.createElement("script");
  script.src="rank-order-patch.js?v=102";
  script.defer=true;
  document.head.appendChild(script);
})();
