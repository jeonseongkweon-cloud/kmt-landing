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
 const authConfig=window.KMT_CLASS_CONFIG||{};
 const gate=document.getElementById("classGate"),form=document.getElementById("gateForm"),btn=document.getElementById("gateLogin"),idInput=document.getElementById("gateId"),passwordInput=document.getElementById("gatePassword"),msg=document.getElementById("gateMessage");
 const db=window.supabase.createClient("https://ojxarsfaewehwjidwgac.supabase.co","sb_publishable_ZoAZrV5rDmYDLxhXlnEXCw_lPqJfin0",{auth:{persistSession:true,detectSessionInUrl:false,autoRefreshToken:true}});
 const expectedId=String(authConfig.adminLoginId||"admin").trim().toLowerCase();
 const authEmail=String(authConfig.adminAuthEmail||"").trim().toLowerCase();

 function openClass(){
   gate.style.display="none";
   history.replaceState({},document.title,"./");
 }
 async function currentClassSession(){
   const {data:{session},error}=await db.auth.getSession();
   if(error) return null;
   return session&&String(session.user?.email||"").toLowerCase()===authEmail?session:null;
 }

 const {data:{session}}=await db.auth.getSession();
 if(session&&String(session.user?.email||"").toLowerCase()!==authEmail){
   await db.auth.signOut({scope:"local"});
 }
 if(await currentClassSession()) openClass();
 else { gate.style.display="grid"; passwordInput.focus(); }

 form.addEventListener("submit",async(event)=>{
   event.preventDefault();
   const loginId=String(idInput.value||"").trim().toLowerCase();
   const password=passwordInput.value;
   if(loginId!==expectedId){ msg.textContent="관리자 아이디 또는 비밀번호를 확인해 주세요."; return; }
   btn.disabled=true; idInput.disabled=true; passwordInput.disabled=true;
   msg.textContent="CLASS 관리자 로그인을 확인하는 중입니다...";
   const {data,error}=await db.auth.signInWithPassword({email:authEmail,password});
   if(error||!data.session){
     msg.textContent="관리자 아이디 또는 비밀번호를 확인해 주세요.";
     passwordInput.value=""; btn.disabled=false; idInput.disabled=false; passwordInput.disabled=false; passwordInput.focus();
     return;
   }
   openClass();
 });
})();
