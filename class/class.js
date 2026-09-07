(function () {
  "use strict";

  const config = window.KMT_CLASS_CONFIG || {};
  const appName = document.querySelector("[data-app-name]");
  const version = document.querySelector("[data-version]");
  const stage = document.querySelector("[data-stage]");
  const homeLink = document.querySelector("[data-home-link]");

  if (appName) appName.textContent = config.appName || "계명태권도 CLASS SYSTEM";
  if (version) version.textContent = `CLASS v${config.version || "0.4.0"}`;
  if (stage) stage.textContent = config.stage || "WORK 9차 · Android 문자 발신기";
  if (homeLink) homeLink.href = config.homeUrl || "../";

  document.documentElement.dataset.classReady = "true";
})();

(async function(){
 const gate=document.getElementById("classGate"),btn=document.getElementById("gateLogin"),msg=document.getElementById("gateMessage");
 const db=window.supabase.createClient("https://ojxarsfaewehwjidwgac.supabase.co","sb_publishable_ZoAZrV5rDmYDLxhXlnEXCw_lPqJfin0",{auth:{persistSession:true,detectSessionInUrl:true,flowType:"pkce"}});
 const owner="jeonseongkweon@gmail.com";
 const {data:{session}}=await db.auth.getSession();
 if(session && String(session.user?.email||"").toLowerCase()===owner){
   gate.style.display="none"; history.replaceState({},document.title,location.pathname);
 } else {
   if(session) await db.auth.signOut();
   gate.style.display="grid";
 }
 btn.onclick=async()=>{
   msg.textContent="관장 계정을 확인하는 중...";
   const {error}=await db.auth.signInWithOAuth({provider:"google",options:{redirectTo:`${location.origin}/class/`}});
   if(error) msg.textContent=error.message;
 };
})();
