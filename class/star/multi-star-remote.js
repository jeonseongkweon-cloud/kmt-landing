// SMART MULTI STAR v1.0.2 — isolated remote
// 기존 1인 음성 STAR 로직은 수정하지 않는다.
import { compact, decomposeHangul, levenshtein } from "./smart-name-voice.js?v=101";

const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function similarity(a,b){a=String(a??"");b=String(b??"");return 1-levenshtein(a,b)/Math.max(a.length,b.length,1)}
function nameScore(spoken,registered){
  spoken=compact(spoken);registered=compact(registered);if(!spoken||!registered)return 0;if(spoken===registered)return 1;
  const syllable=similarity(spoken,registered),jamo=similarity(decomposeHangul(spoken),decomposeHangul(registered));
  const surname=spoken[0]&&spoken[0]===registered[0]?.toLowerCase()?1:0,length=spoken.length===registered.length?1:0;
  return Math.min(.99,syllable*.30+jamo*.58+surname*.08+length*.04)
}
function currentCards(){
  return [...document.querySelectorAll('#studentGrid .student[data-student]')].map(card=>({
    id:String(card.dataset.student),
    name:(card.querySelector('.star-main h2')?.textContent||'').trim(),
    button:card.querySelector('[data-star]')
  })).filter(x=>x.name&&x.button)
}
function stripCommand(raw){
  return String(raw??'').normalize('NFC').replace(/[.!?。]/g,' ').replace(/(계명아|개명아|계명이야|개명이야)/g,' ').replace(/(칭찬별|인사별|자세별|인성별|정리별|도전별|단정별|효도별|게임별|미션별|스타|별)/g,' ').replace(/(그리고|하고|이랑|랑|과|와|및|또)/g,' ').replace(/[,，、/]/g,' ').replace(/\s+/g,' ').trim()
}
function exactContained(text,cards){
  const compactText=compact(text),hits=[];
  for(const card of cards){const name=compact(card.name),index=compactText.indexOf(name);if(index>=0)hits.push({...card,index,score:1})}
  hits.sort((a,b)=>a.index-b.index);return hits
}
function fuzzyTokens(text,cards){
  const tokens=stripCommand(text).split(/\s+/).filter(Boolean),used=new Set(),out=[];
  for(const token of tokens){
    let best=null,second=null;
    for(const card of cards){if(used.has(card.id))continue;const score=nameScore(token,card.name),row={...card,score,spoken:token};if(!best||score>best.score){second=best;best=row}else if(!second||score>second.score)second=row}
    if(best&&best.score>=.68&&best.score-(second?.score||0)>=.08){out.push(best);used.add(best.id)}
  }
  return out
}
function resolveNames(alternatives,cards){
  let best=[];
  for(const raw of alternatives){let rows=exactContained(raw,cards);if(rows.length<2)rows=fuzzyTokens(raw,cards);const seen=new Set();rows=rows.filter(x=>!seen.has(x.id)&&seen.add(x.id));if(rows.length>best.length)best=rows}
  return best
}
function showFeedback(label,text){
  const l=$('voiceFeedbackLabel'),t=$('voiceTranscript');if(l)l.textContent=label;if(t)t.textContent=text
}
function showGroupEffect(rows){
  const old=document.getElementById('isolatedMultiStarEffect');if(old)old.remove();
  const layer=document.createElement('div');layer.id='isolatedMultiStarEffect';layer.style.cssText='position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:rgba(2,10,20,.42);pointer-events:none';
  const card=document.createElement('div');card.style.cssText='max-width:min(88vw,720px);padding:24px 28px;border-radius:26px;background:#081a2c;color:#fff;text-align:center;border:1px solid rgba(255,220,100,.42);box-shadow:0 20px 70px rgba(0,0,0,.48)';
  const names=rows.map(x=>x.name).join(' · ');card.innerHTML=`<div style="font-size:32px">⭐ 👥 ⭐</div><strong style="display:block;font-size:clamp(25px,5vw,40px);margin:7px 0">GROUP STAR</strong><b style="font-size:clamp(18px,4vw,28px)">${names}</b><span style="display:block;margin-top:8px">${rows.length}명 모두 +1</span>`;layer.appendChild(card);document.body.appendChild(layer);setTimeout(()=>layer.remove(),1300)
}
async function awardRows(rows){
  document.body.dataset.multiStarRemote='on';
  try{
    for(const row of rows){row.button.click();await sleep(420)}
    const burst=$('starBurst');if(burst)burst.hidden=true;
  }finally{delete document.body.dataset.multiStarRemote}
  showGroupEffect(rows);showFeedback('✅ GROUP STAR 지급 완료',`${rows.map(x=>x.name).join(' · ')} / ${rows.length}명 +1`)
}
function injectStyle(){
  if(document.getElementById('multiStarRemoteStyle'))return;const s=document.createElement('style');s.id='multiStarRemoteStyle';s.textContent=`body[data-multi-star-remote="on"] #starBurst{display:none!important}.multi-star-remote.active{border-color:#ffd65c!important;background:rgba(246,196,81,.22)!important}@media(max-width:760px),(max-width:1024px) and (pointer:coarse){.category-live-inline .live-status{grid-template-columns:1fr 1fr 1fr auto!important}.multi-star-remote{min-height:38px;padding:7px 6px!important;font-size:11px!important}}`;document.head.appendChild(s)
}
function setup(){
  const host=$('voiceStarButton')?.parentElement;if(!host||$('multiStarVoiceButton'))return;injectStyle();
  const btn=document.createElement('button');btn.id='multiStarVoiceButton';btn.type='button';btn.className='voice-start multi-star-remote';btn.textContent='👥 다중 STAR';
  $('voiceStarButton').insertAdjacentElement('afterend',btn);
  btn.onclick=()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){showFeedback('⚠ 다중 음성 미지원','이 브라우저는 음성인식을 지원하지 않습니다.');return}
    const cards=currentCards();if(cards.length<2){showFeedback('⚠ 출석 학생 부족','현재 STAR ROOM에 2명 이상 있어야 합니다.');return}
    const r=new SR();r.lang='ko-KR';r.continuous=false;r.interimResults=false;r.maxAlternatives=5;btn.classList.add('active');showFeedback('👥 다중 STAR 듣는 중…','예: 김나라 김강민 김시율 별');
    r.onresult=async e=>{const alternatives=[];for(let i=0;i<e.results.length;i++)for(const item of Array.from(e.results[i]||[]))if(item?.transcript)alternatives.push(item.transcript.trim());const rows=resolveNames(alternatives,cards);if(rows.length<2){showFeedback('⚠ 두 명 이상을 찾지 못했습니다.',`인식: ${alternatives[0]||'-'}`);return}await awardRows(rows)};
    r.onerror=e=>showFeedback('⚠ 다중 음성 오류',e.error||'다시 시도해 주세요.');
    r.onend=()=>btn.classList.remove('active');
    try{r.start()}catch{btn.classList.remove('active');showFeedback('⚠ 마이크 시작 실패','잠시 후 다시 눌러 주세요.')}
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(setup,300));else setTimeout(setup,300);
