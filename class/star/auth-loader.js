const originalUrl = new URL('./star.js?v=3311', import.meta.url);
const connectorUrl = new URL('./spark-connector.js?v=102', import.meta.url).href;
const smartNameVoiceUrl = new URL('./smart-name-voice.js?v=100', import.meta.url).href;
const smartMultiStarUrl = new URL('./smart-multi-star.js?v=100', import.meta.url).href;
const source = await fetch(originalUrl, { cache: 'no-store' }).then(r => {
  if (!r.ok) throw new Error(`STAR module load failed: ${r.status}`);
  return r.text();
});
const multiHooks = `
function showGroupStarEffect(students,category){
  const old=document.getElementById("smartMultiStarEffect");if(old)old.remove();
  const layer=document.createElement("div");layer.id="smartMultiStarEffect";layer.setAttribute("aria-live","polite");
  layer.style.cssText="position:fixed;inset:0;z-index:9998;display:grid;place-items:center;background:rgba(3,12,25,.38);pointer-events:none;backdrop-filter:blur(2px)";
  const card=document.createElement("div");card.style.cssText="max-width:min(88vw,760px);padding:26px 30px;border-radius:28px;background:rgba(7,17,30,.96);color:white;text-align:center;box-shadow:0 18px 60px rgba(0,0,0,.38);border:1px solid rgba(255,255,255,.18)";
  const names=students.map(s=>escapeHtml(s.name)).join(" · "),label=escapeHtml(categoryDisplayName(category)||"STAR");
  card.innerHTML=\`<div style="font-size:34px">⭐ 👥 ⭐</div><strong style="display:block;font-size:clamp(24px,5vw,42px);margin:8px 0">GROUP STAR</strong><b style="display:block;font-size:clamp(18px,3.8vw,30px);line-height:1.45">\${names}</b><span style="display:block;margin-top:10px;font-size:clamp(17px,3vw,24px)">\${students.length}명 모두 \${label} +1</span>\`;
  layer.appendChild(card);document.body.appendChild(layer);setTimeout(()=>{layer.style.opacity="0";layer.style.transition="opacity .25s"},1050);setTimeout(()=>layer.remove(),1350)
}
async function executeMultiVoiceStar(students,command){
  const t=normalizeSpeech(command),category=categoryFromVoice(t)||state.category;if(!category)throw new Error("STAR 카테고리를 먼저 선택해 주세요.");
  const unique=[...new Map(students.map(s=>[String(s.id),s])).values()];if(unique.length<2)return false;
  document.body.dataset.smartMultiStar="on";
  try{for(const student of unique)await awardByVoice(student,category)}finally{delete document.body.dataset.smartMultiStar}
  unique.forEach((student,index)=>setTimeout(()=>highlightStudent(student),index*55));playStarSound();playGrowthSound(false);showGroupStarEffect(unique,category);
  const label=categoryDisplayName(category)||"STAR",names=unique.map(s=>s.name).join(" · ");
  state.voice.multiResult={label:"✅ GROUP STAR 지급 완료",transcript:\`\${names} / \${unique.length}명 \${label} +1\`};
  toast(\`⭐ \${unique.length}명 모두 \${label} +1\`);speakShort(\`\${unique.length}명 \${label} 하나!\`);return true
}
`;
const patched = source
  .replace('const SINGLE_OWNER_EMAIL="class-admin@ipma.kr";', 'const SINGLE_OWNER_EMAIL="jeonseongkweon@gmail.com";')
  .replace('from "./spark-connector.js?v=102";', `from "${connectorUrl}";`)
  .replace('from "./smart-name-voice.js?v=100";', `from "${smartNameVoiceUrl}";\nimport { resolveMultiStudentNames } from "${smartMultiStarUrl}";`)
  .replace('function playStarSound(){', 'function playStarSound(){if(document.body?.dataset.smartMultiStar==="on")return;')
  .replace('function showBurst(s,c,total,newBadges=[]){', 'function showBurst(s,c,total,newBadges=[]){if(document.body?.dataset.smartMultiStar==="on")return;')
  .replace('async function handleVoiceCommand(command,mode=null,alternatives=[command]){', `${multiHooks}\nasync function handleVoiceCommand(command,mode=null,alternatives=[command]){\n  const multiText=normalizeSpeech(command),multiIntent=mode==="star"||/별|스타|칭찬/.test(multiText);\n  if(multiIntent){const multi=resolveMultiStudentNames({alternatives,students:currentRoster(),commandTerms:VOICE_COMMAND_TERMS});if(multi.students.length>=2){voiceDebug("SMART MULTI STAR",multi.students.map(s=>s.name).join(" · "));await executeMultiVoiceStar(multi.students,multiText);return}}`)
  .replace('if(!state.voice.pending)setVoiceFeedback("✅ 처리 완료:",`“${alternatives[0]}”`)', 'if(!state.voice.pending){if(state.voice.multiResult){setVoiceFeedback(state.voice.multiResult.label,state.voice.multiResult.transcript);state.voice.multiResult=null}else setVoiceFeedback("✅ 처리 완료:",`“${alternatives[0]}”`)}')
  .replace('$("backButton").onclick=()=>{window.open("../attendance/","_blank","noopener")};', '$("backButton").onclick=()=>{location.href="../attendance/"};');
const blob = new Blob([patched], { type: 'text/javascript' });
const url = URL.createObjectURL(blob);
try {
  await import(url);
  const version=document.querySelector('.brand span');
  if(version)version.textContent='v3.4.0 · SMART NAME VOICE v1.1.1 · SMART MULTI STAR v1.0';
} finally {
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
