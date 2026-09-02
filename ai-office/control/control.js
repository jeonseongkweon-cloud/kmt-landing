import{db,$,clean,escapeHtml,normalizeSpeech,sessionCode,loadCatalog,commandPayload,createPresentationChannel,presenceHasRole,sendBroadcast,requireSession}from"../shared/core.js";

const state={menus:[],contents:[],recent:[],channel:null,code:"",pending:new Map(),display:false,megaStack:[]};
let toastTimer;
function toast(text){clearTimeout(toastTimer);$("toast").textContent=text;$("toast").classList.add("show");toastTimer=setTimeout(()=>$("toast").classList.remove("show"),2400)}
function makeButton(item){return `<button class="command-button" data-content="${item.id}"><b>${item.is_favorite?"★ ":""}${escapeHtml(item.button_label||item.title)}</b><small>${escapeHtml(item.title)}</small></button>`}
function menuChildren(id){return state.menus.filter(menu=>(menu.parent_id||null)===(id||null))}
function contentChildren(id){return state.contents.filter(content=>content.menu_id===id)}
function menuHasContent(id,seen=new Set()){if(seen.has(id))return false;seen.add(id);return contentChildren(id).length>0||menuChildren(id).some(menu=>menuHasContent(menu.id,seen))}
function menuTrailText(menuId){const names=[];const seen=new Set();let current=state.menus.find(menu=>menu.id===menuId);while(current&&!seen.has(current.id)){seen.add(current.id);names.push(current.title);current=state.menus.find(menu=>menu.id===current.parent_id)}return names.join(" ")}
function bindContentButtons(scope=document){scope.querySelectorAll("[data-content]").forEach(button=>button.onclick=()=>showContent(button.dataset.content,"touch"))}

function renderHome(){
  $("favorites").innerHTML=state.contents.filter(content=>content.is_favorite).slice(0,8).map(makeButton).join("")||'<div class="empty">즐겨찾기가 없습니다.</div>';
  const roots=menuChildren(null).filter(menu=>menuHasContent(menu.id));
  $("megaRoots").innerHTML=roots.map(menu=>`<button class="mega-root-button" data-menu="${menu.id}">${escapeHtml(menu.title)}</button>`).join("")||'<div class="empty">등록된 메뉴가 없습니다.</div>';
  $("megaRoots").querySelectorAll("[data-menu]").forEach(button=>button.onclick=()=>openMega(button.dataset.menu));
  bindContentButtons($("favorites"));
  renderSearch($("searchInput").value);
}

function renderSearch(value){
  const q=clean(value).toLowerCase();
  $("searchSection").hidden=!q;
  if(!q){$("searchResults").innerHTML="";return}
  const matches=state.contents.filter(content=>[content.title,content.button_label,content.voice_command,...(content.voice_aliases||[]),...(content.keywords||[]),menuTrailText(content.menu_id)].join(" ").toLowerCase().includes(q));
  $("searchResults").innerHTML=matches.map(makeButton).join("")||'<div class="empty">검색 결과가 없습니다.</div>';
  bindContentButtons($("searchResults"));
}

function openMega(menuId){state.megaStack=[menuId];$("megaOverlay").classList.add("open");$("megaOverlay").setAttribute("aria-hidden","false");document.body.classList.add("mega-open");renderMega()}
function closeMega(){$("megaOverlay").classList.remove("open","backing");$("megaOverlay").setAttribute("aria-hidden","true");document.body.classList.remove("mega-open");state.megaStack=[]}
function enterMega(menuId){state.megaStack.push(menuId);renderMega()}
function backMega(){if(state.megaStack.length<=1){closeMega();return}state.megaStack.pop();$("megaOverlay").classList.remove("backing");void $("megaOverlay").offsetWidth;$("megaOverlay").classList.add("backing");renderMega()}
function renderMega(){
  const currentId=state.megaStack.at(-1);const menu=state.menus.find(item=>item.id===currentId);
  if(!menu){closeMega();return}
  $("megaTitle").textContent=menu.title;$("megaBack").hidden=false;$("megaBack").textContent=state.megaStack.length<=1?"← 홈":"← 뒤로";
  const childMenus=menuChildren(menu.id).filter(child=>menuHasContent(child.id));
  const contents=contentChildren(menu.id);
  $("megaBody").innerHTML=[...childMenus.map(child=>`<button class="mega-item menu-item" data-submenu="${child.id}">${escapeHtml(child.title)}</button>`),...contents.map(content=>`<button class="mega-item content-item" data-content="${content.id}">${escapeHtml(content.button_label||content.title)}</button>`)].join("")||'<div class="mega-empty">현재 등록된 자료가 없습니다.</div>';
  $("megaBody").querySelectorAll("[data-submenu]").forEach(button=>button.onclick=()=>enterMega(button.dataset.submenu));
  bindContentButtons($("megaBody"));
}

async function showContent(id,source){const item=state.contents.find(c=>c.id===id);if(!item)return;if(!state.display){toast("⚠ DISPLAY 연결을 확인하세요");return}const payload=commandPayload(item,source);state.pending.set(payload.id,setTimeout(()=>{state.pending.delete(payload.id);toast("⚠ 화면 연결을 확인하세요")},AI_OFFICE_CONFIG.commandTimeoutMs));toast("전송 중…");await sendBroadcast(state.channel,"command",payload);state.recent=[id,...state.recent.filter(x=>x!==id)].slice(0,8);localStorage.setItem("aiOfficeRecent",JSON.stringify(state.recent))}
function connect(code){if(state.channel)db.removeChannel(state.channel);state.code=code;localStorage.setItem("aiOfficeSessionCode",code);$("codeTitle").textContent=`연결코드 · ${code}`;$("sessionText").textContent=`SESSION ${code}`;state.channel=createPresentationChannel(code,"control",{presence:p=>{state.display=presenceHasRole(p,"display");$("displayDot").classList.toggle("on",state.display);$("displayStatus").textContent=state.display?"DISPLAY 연결됨":"DISPLAY 연결 대기"},ack:p=>{const timer=state.pending.get(p.commandId);if(timer){clearTimeout(timer);state.pending.delete(p.commandId)}toast(p.ok?"✓ 표시 완료":`⚠ ${p.message||"표시 실패"}`)}})}
const office2Actions=[["aria:today","오늘"],["aria:task","TASK"],["aria:project","PROJECT"],["aria:meeting","회의"],["gen:news","뉴스"],["gen:article","기사"],["gen:library","자료"],["gen:media","미디어"]];
async function showOffice2Action(actionId,source="touch"){if(!state.display){toast("⚠ DISPLAY 연결을 확인하세요");return}const payload={id:crypto.randomUUID(),type:"AI_OFFICE_ACTION",actionId,source,payload:{agent:actionId.split(":")[0],action:actionId.split(":")[1]},sentAt:new Date().toISOString(),version:"1.2.0"};state.pending.set(payload.id,setTimeout(()=>{state.pending.delete(payload.id);toast("⚠ 화면 연결을 확인하세요")},AI_OFFICE_CONFIG.commandTimeoutMs));toast(`${actionId.split(":")[1].toUpperCase()} 전송 중…`);await sendBroadcast(state.channel,"command",payload)}
function renderOffice2Actions(){const box=$("office2Actions");if(!box)return;box.innerHTML=office2Actions.map(([id,label])=>`<button class="office2-action" data-office2-action="${id}">${label}</button>`).join("");box.onclick=e=>{const btn=e.target.closest("[data-office2-action]");if(btn)showOffice2Action(btn.dataset.office2Action,"touch")}}
function startVoice(){const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SpeechRecognition){toast("이 브라우저는 음성인식을 지원하지 않습니다.");return}const r=new SpeechRecognition();r.lang="ko-KR";r.interimResults=false;r.maxAlternatives=3;$("ptt").classList.add("listening");$("ptt").querySelector("span").textContent="듣고 있습니다";r.onresult=e=>{const phrases=Array.from(e.results[0]).map(x=>x.transcript);const normalized=phrases.map(normalizeSpeech);const match=state.contents.find(c=>[c.voice_command,...(c.voice_aliases||[]),c.title,c.button_label].filter(Boolean).some(a=>normalized.some(p=>p.includes(normalizeSpeech(a))||normalizeSpeech(a).includes(p))));if(match){toast(`“${phrases[0]}” → ${match.title}`);showContent(match.id,"voice")}else toast(`명령을 찾지 못했습니다: ${phrases[0]}`)};r.onerror=()=>toast("음성을 인식하지 못했습니다.");r.onend=()=>{$("ptt").classList.remove("listening");$("ptt").querySelector("span").textContent="눌러서 말하기"};r.start()}
async function refreshCatalog(){Object.assign(state,await loadCatalog());renderHome();if(state.megaStack.length)renderMega()}
async function boot(){if(!await requireSession("../"))return;renderOffice2Actions();state.recent=JSON.parse(localStorage.getItem("aiOfficeRecent")||"[]");try{await refreshCatalog()}catch(e){toast("자료를 불러오지 못했습니다. 설치 SQL을 확인하세요.")}connect(localStorage.getItem("aiOfficeSessionCode")||sessionCode());db.channel("ai-office-catalog-control").on("postgres_changes",{event:"*",schema:"public",table:"ai_office_menus"},refreshCatalog).on("postgres_changes",{event:"*",schema:"public",table:"ai_office_contents"},refreshCatalog).subscribe();$("searchInput").oninput=e=>renderSearch(e.target.value);$("clearSearch").onclick=()=>{$("searchInput").value="";renderSearch("");$("searchInput").focus()};$("newSession").onclick=()=>connect(sessionCode());$("ptt").onclick=startVoice;$("megaBack").onclick=backMega;$("megaClose").onclick=closeMega;$("megaOverlay").onclick=e=>{if(e.target===$("megaOverlay"))closeMega()};document.addEventListener("keydown",e=>{if(e.key==="Escape"&&state.megaStack.length)closeMega()})}boot();
