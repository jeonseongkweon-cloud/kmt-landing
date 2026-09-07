const originalUrl = new URL('./star.js?v=3300', import.meta.url);
const connectorUrl = new URL('./spark-connector.js?v=102', import.meta.url).href;
const smartNameVoiceUrl = new URL('./smart-name-voice.js?v=100', import.meta.url).href;
const source = await fetch(originalUrl, { cache: 'no-store' }).then(r => {
  if (!r.ok) throw new Error(`STAR module load failed: ${r.status}`);
  return r.text();
});
const patched = source
  .replace('const SINGLE_OWNER_EMAIL="class-admin@ipma.kr";', 'const SINGLE_OWNER_EMAIL="jeonseongkweon@gmail.com";')
  .replace('from "./spark-connector.js?v=102";', `from "${connectorUrl}";`)
  .replace('from "./smart-name-voice.js?v=100";', `from "${smartNameVoiceUrl}";`)
  .replace('$("backButton").onclick=()=>{window.open("../attendance/","_blank","noopener")};', '$("backButton").onclick=()=>{location.href="../attendance/"};');
const blob = new Blob([patched], { type: 'text/javascript' });
const url = URL.createObjectURL(blob);
try {
  await import(url);
} finally {
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
