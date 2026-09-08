const originalUrl = new URL('./star.js?v=3312', import.meta.url);
const connectorUrl = new URL('./spark-connector.js?v=102', import.meta.url).href;
const smartNameVoiceUrl = new URL('./smart-name-voice.js?v=101', import.meta.url).href;
const integratedMultiVoiceUrl = new URL('./integrated-multi-voice.js?v=200', import.meta.url).href;
const source = await fetch(originalUrl, { cache: 'no-store' }).then(r => {
  if (!r.ok) throw new Error(`STAR module load failed: ${r.status}`);
  return r.text();
});
const patched = source
  .replace('const SINGLE_OWNER_EMAIL="class-admin@ipma.kr";', 'const SINGLE_OWNER_EMAIL="jeonseongkweon@gmail.com";')
  .replace('from "./spark-connector.js?v=102";', `from "${connectorUrl}";`)
  .replace('from "./smart-name-voice.js?v=100";', `from "${smartNameVoiceUrl}";\nimport { resolveIntegratedMultiVoice } from "${integratedMultiVoiceUrl}";`)
  .replace('async function handleVoiceCommand(command,mode=null,alternatives=[command]){\n  const t=normalizeSpeech(command);', `async function handleVoiceCommand(command,mode=null,alternatives=[command]){\n  const t=normalizeSpeech(command);\n  if(mode==="star"||/별|스타|칭찬/.test(t)){\n    const multi=resolveIntegratedMultiVoice({alternatives,students:currentRoster()});\n    if(multi.students.length>=2){\n      const category=categoryFromVoice(t)||state.category;if(!category)throw new Error("STAR 카테고리를 먼저 선택해 주세요.");\n      const names=[];\n      for(const student of multi.students){await awardByVoice(student,category);names.push(student.name)}\n      speakShort(\`${'${multi.students.length}'}명 별 하나!\`);\n      setVoiceFeedback("✅ 다중 STAR 지급 완료",\`${'${names.join(" · ")}'} / ${'${multi.students.length}'}명 +1\`);\n      voiceDebug("SMART MULTI STAR",names.join(" · "));\n      return\n    }\n    if(multi.obviousMulti)throw new Error("여러 이름을 확실히 찾지 못했습니다. 다시 말씀해 주세요.")\n  }`)
  .replace('$("mobileVoiceRemote").onclick=()=>startOneShotVoice(null);', '$("mobileVoiceRemote").onclick=()=>startOneShotVoice("star");')
  .replace('$("backButton").onclick=()=>{window.open("../attendance/","_blank","noopener")};', '$("backButton").onclick=()=>{location.href="../attendance/"};');
const blob = new Blob([patched], { type: 'text/javascript' });
const url = URL.createObjectURL(blob);
try {
  await import(url);
} finally {
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
