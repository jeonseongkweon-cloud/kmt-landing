(function(){
  "use strict";
  const VERSION="1.0.0";
  const DEFAULTS={enabled:true,soundEnabled:true,volume:0.75,fullScreenEnabled:true,maxParticles:24};
  const state={settings:{...DEFAULTS},sounds:new Map(),active:new Set(),root:null};

  function ensureRoot(){
    if(state.root&&document.body.contains(state.root))return state.root;
    const root=document.createElement("div");
    root.id="kmt-effect-root";
    root.setAttribute("aria-hidden","true");
    document.body.appendChild(root);
    state.root=root;
    return root;
  }
  function safeRemove(node){try{if(node&&node.parentNode)node.parentNode.removeChild(node);state.active.delete(node)}catch(_){}}
  function after(node,ms){state.active.add(node);window.setTimeout(()=>safeRemove(node),Math.max(200,ms+150));return node}
  function flash(level="light",duration){
    if(!state.settings.enabled||!state.settings.fullScreenEnabled)return null;
    const el=document.createElement("div"),ms=duration||(level==="mega"?2200:level==="power"?1200:850);
    el.className=`kmt-effect-flash ${level}`;
    el.style.setProperty("--kmt-fx-duration",`${ms}ms`);
    ensureRoot().appendChild(el);return after(el,ms);
  }
  function particles(options={}){
    if(!state.settings.enabled||!state.settings.fullScreenEnabled)return[];
    const count=Math.min(Number(options.count||10),Math.max(0,Number(state.settings.maxParticles||24)));
    const icons=Array.isArray(options.icons)&&options.icons.length?options.icons:["✦","⭐","✨"];
    const x=Number(options.x||50),y=Number(options.y||50),nodes=[];
    for(let i=0;i<count;i++){
      const n=document.createElement("span"),angle=(Math.PI*2*i/Math.max(1,count))+(Math.random()*.45),dist=55+Math.random()*115;
      n.className="kmt-effect-particle";n.textContent=icons[i%icons.length];
      n.style.setProperty("--x",`${x+(Math.random()*4-2)}%`);n.style.setProperty("--y",`${y+(Math.random()*3-1.5)}%`);
      n.style.setProperty("--dx",`${Math.cos(angle)*dist}px`);n.style.setProperty("--dy",`${Math.sin(angle)*dist-55}px`);
      n.style.setProperty("--rot",`${Math.round(Math.random()*220-110)}deg`);n.style.setProperty("--size",`${18+Math.round(Math.random()*22)}px`);
      n.style.setProperty("--life",`${780+Math.round(Math.random()*420)}ms`);n.style.setProperty("--delay",`${Math.round(Math.random()*80)}ms`);
      ensureRoot().appendChild(n);nodes.push(after(n,1400));
    } return nodes;
  }
  function label(text,options={}){
    if(!state.settings.enabled||!state.settings.fullScreenEnabled||!text)return null;
    const el=document.createElement("div"),ms=Number(options.duration||1200);
    el.className="kmt-effect-label";el.textContent=String(text);el.style.setProperty("--life",`${ms}ms`);
    if(options.x!=null)el.style.left=`${options.x}%`;if(options.y!=null)el.style.top=`${options.y}%`;
    ensureRoot().appendChild(el);return after(el,ms);
  }
  function getPoint(target){
    try{const el=typeof target==="string"?document.querySelector(target):target;if(el&&el.getBoundingClientRect){const r=el.getBoundingClientRect();return{x:((r.left+r.width/2)/innerWidth)*100,y:((r.top+r.height/2)/innerHeight)*100}}}catch(_){}
    return{x:50,y:50};
  }
  function playEffect(type,payload={}){
    try{
      if(!state.settings.enabled)return false;
      const name=String(type||"").toLowerCase(),point=getPoint(payload.target);
      if(name==="attendance"||name==="light"){flash("light",850);particles({x:point.x,y:point.y,count:6,icons:["✓","✦","✨"]})}
      else if(name==="star"||name==="praise"||name==="power"){flash("power",1200);particles({x:point.x,y:point.y,count:14,icons:["⭐","✨","✦"]});if(payload.label)label(payload.label,{x:point.x,y:Math.max(18,point.y-8),duration:1200})}
      else if(name==="champion"||name==="mega"){flash("mega",2200);particles({x:50,y:48,count:22,icons:["🏆","⭐","✨","🎉"]});if(payload.label)label(payload.label,{x:50,y:44,duration:1900})}
      else flash(payload.level||"light",payload.duration);
      document.dispatchEvent(new CustomEvent("kmt:effect",{detail:{type:name,payload}}));return true;
    }catch(err){console.warn("[KMT Effect] visual effect skipped:",err);return false}
  }
  function registerSound(name,url,options={}){
    try{if(!name||!url)return false;const list=state.sounds.get(name)||[];list.push({url,volume:Number(options.volume??1)});state.sounds.set(name,list);return true}catch(_){return false}
  }
  async function playSound(name,options={}){
    try{
      if(!state.settings.enabled||!state.settings.soundEnabled)return false;
      const list=state.sounds.get(name)||[];if(!list.length){document.dispatchEvent(new CustomEvent("kmt:sound",{detail:{name,status:"unregistered"}}));return false}
      const item=list[Math.floor(Math.random()*list.length)],audio=new Audio(item.url);
      audio.preload="auto";audio.volume=Math.min(1,Math.max(0,state.settings.volume*item.volume*Number(options.volume??1)));
      await audio.play();document.dispatchEvent(new CustomEvent("kmt:sound",{detail:{name,status:"played"}}));return true;
    }catch(err){console.warn("[KMT Effect] sound skipped:",err);return false}
  }
  function setSettings(patch={}){
    state.settings={...state.settings,...patch};try{localStorage.setItem("kmt_effect_settings",JSON.stringify(state.settings))}catch(_){}
    return{...state.settings};
  }
  function loadSettings(){try{const saved=JSON.parse(localStorage.getItem("kmt_effect_settings")||"null");if(saved&&typeof saved==="object")state.settings={...DEFAULTS,...saved}}catch(_){}}
  function clear(){[...state.active].forEach(safeRemove);if(state.root)state.root.textContent=""}
  loadSettings();
  const api={version:VERSION,play:playEffect,playEffect,playSound,registerSound,setSettings,getSettings:()=>({...state.settings}),clear,pointFor:getPoint,
    test:{light:()=>playEffect("attendance",{label:"LIGHT"}),power:()=>playEffect("star",{label:"+1 STAR"}),mega:()=>playEffect("champion",{label:"TODAY'S CHAMPION"})}};
  window.KMTEffects=api;window.playEffect=(type,payload)=>api.playEffect(type,payload);window.playSound=(name,options)=>api.playSound(name,options);
  document.dispatchEvent(new CustomEvent("kmt:effects-ready",{detail:{version:VERSION}}));
})();
