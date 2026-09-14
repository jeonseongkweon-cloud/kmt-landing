(function () {
  "use strict";

  /* Keep CLASS laptops on the current root Service Worker.  A controller
     change reloads only once per tab, so a newly activated worker can replace
     stale HTML/JS without creating a reload loop. */
  if ("serviceWorker" in navigator) {
    const swRefreshKey = "kmt_class_sw_v18_reloaded";
    let controllerChanged = false;

    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (controllerChanged) return;
      controllerChanged = true;
      try {
        if (sessionStorage.getItem(swRefreshKey) === "1") return;
        sessionStorage.setItem(swRefreshKey, "1");
      } catch (e) {
        return;
      }
      window.location.reload();
    });

    navigator.serviceWorker.register("../service-worker.js").then(function (registration) {
      return registration.update();
    }).catch(function () {
      /* Navigation remains available when SW registration/update is offline. */
    });
  }

  const config = window.KMT_CLASS_CONFIG || {};
  const appName = document.querySelector("[data-app-name]");
  const version = document.querySelector("[data-version]");
  const stage = document.querySelector("[data-stage]");
  const homeLink = document.querySelector("[data-home-link]");

  if (appName) appName.textContent = config.appName || "계명태권도 CLASS SYSTEM";
  if (version) version.textContent = `CLASS v${config.version || "0.4.0"}`;
  if (stage) stage.textContent = config.stage || "WORK 9차 · Android 문자 발신기";
  if (homeLink) homeLink.href = config.homeUrl || "../";

  /* Emergency navigation guard: CLASS menu links must always navigate even if
     another UI module accidentally cancels a click event. */
  document.addEventListener("click", function (event) {
    const link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!link) return;
    if (link.target === "_blank" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const href = link.getAttribute("href");
    if (!href || href.charAt(0) === "#" || /^javascript:/i.test(href)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign(link.href);
  }, true);

  document.documentElement.dataset.classReady = "true";
})();

(async function(){
 const gate=document.getElementById("classGate"),btn=document.getElementById("gateLogin"),msg=document.getElementById("gateMessage");
 const owner="jeonseongkweon@gmail.com";
 const localKey="kmt_class_owner_verified";

 function openClass(){
   if(gate){
     gate.style.display="none";
     gate.style.pointerEvents="none";
     gate.setAttribute("aria-hidden","true");
   }
   try{ localStorage.setItem(localKey,"1"); }catch(e){}
   if(location.search||location.hash) history.replaceState({},document.title,location.pathname);
 }

 let locallyVerified=false;
 try{ locallyVerified=localStorage.getItem(localKey)==="1"; }catch(e){}
 if(locallyVerified){ openClass(); return; }

 /* Do not let a delayed/failed Supabase CDN leave a stale invisible blocker. */
 if(!window.supabase || typeof window.supabase.createClient!=="function"){
   if(msg) msg.textContent="로그인 모듈을 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요.";
   if(gate){ gate.style.display="grid"; gate.style.pointerEvents="auto"; }
   return;
 }

 const db=window.supabase.createClient("https://ojxarsfaewehwjidwgac.supabase.co","sb_publishable_ZoAZrV5rDmYDLxhXlnEXCw_lPqJfin0",{auth:{persistSession:true,detectSessionInUrl:true,flowType:"pkce"}});
 try{
   const {data:{session}}=await db.auth.getSession();
   if(session && String(session.user?.email||"").toLowerCase()===owner){
     openClass();
   } else if(gate) {
     gate.style.display="grid";
     gate.style.pointerEvents="auto";
   }
  }catch(e){
   if(msg) msg.textContent="관장 계정 확인 중 오류가 발생했습니다. 새로고침 후 다시 시도해 주세요.";
   if(gate){ gate.style.display="grid"; gate.style.pointerEvents="auto"; }
  }

 if(btn) btn.onclick=async()=>{
   if(msg) msg.textContent="관장 계정을 확인하는 중...";
   const {error}=await db.auth.signInWithOAuth({provider:"google",options:{redirectTo:`${location.origin}/class/`}});
   if(error && msg) msg.textContent=error.message;
 };
})();
