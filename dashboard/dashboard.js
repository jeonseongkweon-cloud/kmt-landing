const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTndQfKXAUuJaAZTbFYFhWbNhlhFmg2tNyaaRJRRLxYGCgUawZUeytRZ-aH9nusJ1SAUHtYYozgO6a0/pub?gid=0&single=true&output=csv";

const HALL_OF_FAME = [
  {title:"어제의 MVP", name:"김민규", tag:"노력 최고"},
  {title:"어제의 웃음왕", name:"김예담", tag:"시간 약속 굿!"},
  {title:"어제의 도전왕", name:"최기영", tag:"도복이 반짝!"},
  {title:"어제의 인사왕", name:"김동언", tag:"인사 태도 최고"},
  {title:"어제의 집중왕", name:"하석진", tag:"눈빛이 다르다!"},
  {title:"어제의 성실왕", name:"김우리", tag:"정리정돈 멋짐!"},
  {title:"어제의 배려왕", name:"김시율", tag:"친구 돕기 최고!"},
  {title:"어제의 목소리왕", name:"이주형", tag:"기합 우렁차다!"},
];

function pad2(n){ return String(n).padStart(2,"0"); }
function nowTime(){
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function setLive(ok, msg){
  const dot = document.getElementById("liveDot");
  const text = document.getElementById("liveText");
  if(!dot || !text) return;
  if(ok){ dot.classList.remove("warn"); text.textContent = msg || "연결됨"; }
  else{ dot.classList.add("warn"); text.textContent = msg || "오프라인"; }
}
function toggleFull(){
  const el = document.documentElement;
  if(!document.fullscreenElement) el.requestFullscreen?.();
  else document.exitFullscreen?.();
}

function parseCSV(text){
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for(let i=0;i<text.length;i++){
    const c = text[i];
    const n = text[i+1];

    if(c === '"' ){
      if(inQuotes && n === '"'){ cur += '"'; i++; }
      else inQuotes = !inQuotes;
      continue;
    }

    if(!inQuotes && c === ','){
      row.push(cur.trim());
      cur = "";
      continue;
    }

    if(!inQuotes && (c === '\n' || c === '\r')){
      if(c === '\r' && n === '\n') i++;
      row.push(cur.trim());
      cur = "";
      if(row.some(v => v !== "")) rows.push(row);
      row = [];
      continue;
    }

    cur += c;
  }
  row.push(cur.trim());
  if(row.some(v => v !== "")) rows.push(row);
  return rows;
}

function toNumber(v){
  const n = Number(String(v||"").replace(/[^\d.-]/g,""));
  return Number.isFinite(n) ? n : 0;
}

function initialsKR(name){
  const s = String(name||"").trim();
  if(!s) return "KM";
  return s.slice(0,2);
}

function safeImg(url){
  const u = String(url||"").trim();
  if(!u) return "";
  if(/^https?:\/\//i.test(u)) return u;
  return "";
}

function photoBoxHTML(name, photoUrl){
  const src = safeImg(photoUrl);
  if(src){
    return `<div class="miniPhoto"><img alt="${name}" src="${src}" loading="lazy"></div>`;
  }
  return `<div class="miniPhoto"><div class="phFallback">${initialsKR(name)}</div></div>`;
}

function renderTicker(listEl, items, mode){
  const makeRow = (it, i)=>`
    <div class="row ${i===0?"top1":i===1?"top2":i===2?"top3":""}">
      <div class="rank ${i===0?"top1":i===1?"top2":i===2?"top3":""}">${i+1}</div>
      ${photoBoxHTML(it.name, it.photo)}
      <div class="name">${it.name}</div>
      <div class="meta">${mode==="pts" ? `${it.pts} P` : (it.label || "")}</div>
    </div>
  `;
  const baseHTML = items.map(makeRow).join("");
  listEl.innerHTML = baseHTML + baseHTML;

  requestAnimationFrame(()=>{
    const oneSetHeight = listEl.scrollHeight / 2;
    listEl.parentElement.style.setProperty("--scrollH", oneSetHeight + "px");
    const sec = Math.max(18, Math.min(28, items.length * 2.1));
    listEl.style.animationDuration = sec + "s";
  });
}

function renderPhotoFlow(trackEl, items){
  const makeAvatar = (it)=>`
    <div class="avatar">
      ${
        safeImg(it.photo)
          ? `<img alt="${it.name}" src="${safeImg(it.photo)}" loading="lazy" />`
          : `<div class="phFallback" style="font-size:16px">${initialsKR(it.name)}</div>`
      }
      <div class="label">${it.name}</div>
    </div>
  `;

  trackEl.innerHTML = items.map(makeAvatar).join("") + items.map(makeAvatar).join("");

  const finalize = ()=>{
    const w = trackEl.scrollWidth / 2;
    trackEl.style.setProperty("--scrollW", w + "px");
    const sec = Math.max(18, Math.min(42, w / 60));
    trackEl.style.animationDuration = sec + "s";
  };

  const imgs = Array.from(trackEl.querySelectorAll("img"));
  let loaded = 0;
  if(imgs.length === 0) { setTimeout(finalize, 60); return; }

  imgs.forEach(img=>{
    const done = ()=>{ loaded++; if(loaded >= imgs.length) finalize(); };
    if(img.complete) done();
    else{
      img.addEventListener("load", done, {once:true});
      img.addEventListener("error", done, {once:true});
    }
  });

  setTimeout(finalize, 900);
}

function renderAwardsFromSheet(grid, awards, photoByName){
  grid.innerHTML = awards.map(it=>{
    const photo = photoByName.get(it.name) || "";
    return `
      <div class="awardCard">
        <div class="awardPhoto">
          ${ safeImg(photo) ? `<img alt="${it.name}" src="${safeImg(photo)}" loading="lazy">`
                           : `<div class="phFallback">${initialsKR(it.name)}</div>`}
        </div>
        <div class="awardTxt">
          <div class="awardTitle">${it.title}</div>
          <div class="awardName">${it.name}</div>
          <div class="awardTag">${it.tag}</div>
        </div>
      </div>
    `;
  }).join("");
}

function startClock(){
  const el = document.getElementById("todayTime");
  const tick = ()=>{ if(el) el.textContent = nowTime(); };
  tick();
  setInterval(tick, 1000*15);
}

async function loadFromSheet(){
  setLive(true, "로딩중…");
  const url = CSV_URL + (CSV_URL.includes("?") ? "&" : "?") + "t=" + Date.now();

  const res = await fetch(url, {cache:"no-store"});
  if(!res.ok) throw new Error("CSV fetch 실패: " + res.status);

  const text = await res.text();
  const rows = parseCSV(text);
  if(rows.length < 2) throw new Error("CSV 데이터가 비어있습니다.");

  const header = rows[0];
  const idx = (name)=> header.indexOf(name);

  const iId = idx("아이디");
  const iName = idx("이름");
  const iPhoto = idx("포토링크");
  const iPts = idx("합계포인트");

  const iDanLabel = idx("단증합계");     // N열(표시용)
  const iRankScore = idx("rank_score");  // O열(정렬용)

  if(iName === -1 || iPhoto === -1 || iPts === -1){
    throw new Error("헤더 컬럼을 찾을 수 없습니다. (필수: 이름, 포토링크, 합계포인트)");
  }
  if(iDanLabel === -1 || iRankScore === -1){
    throw new Error("단/급 TOP10용 컬럼을 찾을 수 없습니다. (필수: 단증합계, rank_score)");
  }

  const students = rows.slice(1).map(r=>{
    const id = r[iId] || "";
    const name = r[iName] || "";
    const photo = r[iPhoto] || "";
    const pts = toNumber(r[iPts]);

    const danLabel = (iDanLabel>=0 ? r[iDanLabel] : "") || "";
    const rankScore = (iRankScore>=0 ? toNumber(r[iRankScore]) : 0);

    return {id, name, photo, pts, danLabel, rankScore};
  }).filter(s=>String(s.name||"").trim().length>0);

  const photoByName = new Map();
  students.forEach(s=>{
    const key = String(s.name).trim();
    if(key && !photoByName.has(key) && String(s.photo||"").trim()) photoByName.set(key, s.photo);
  });

  const rankingTop = [...students]
    .sort((a,b)=>b.pts - a.pts)
    .slice(0,10)
    .map(s=>({name:s.name, pts:s.pts, photo:s.photo}));

  const danTop = [...students]
    .filter(s => String(s.danLabel||"").trim().length > 0)
    .sort((a,b)=> (b.rankScore||0) - (a.rankScore||0))
    .slice(0,10)
    .map(s=>({name:s.name, label:s.danLabel, photo:s.photo}));

  const flow = students
    .filter(s=>safeImg(s.photo))
    .slice(0,14)
    .map(s=>({name:s.name, photo:s.photo}));

  const d = new Date();
  const monthEl = document.getElementById("monthLabel");
  if(monthEl) monthEl.textContent = `${d.getMonth()+1}월`;

  renderTicker(document.getElementById("rankList"), rankingTop, "pts");
  renderTicker(document.getElementById("danList"), danTop, "dan");

  if(flow.length >= 3){
    renderPhotoFlow(document.getElementById("photoTrack"), flow);
    const hint = document.getElementById("photoHint");
    if(hint) hint.textContent = `시트 연동 (${flow.length}명)`;
  }else{
    document.getElementById("photoTrack").innerHTML =
      `<div style="padding:10px 12px; color:rgba(255,255,255,.7); font-weight:900">포토링크가 있는 학생이 부족합니다.</div>`;
  }

  renderAwardsFromSheet(document.getElementById("awardsGrid"), HALL_OF_FAME, photoByName);

  setLive(true, "연결됨");
  const rankHint = document.getElementById("rankHint");
  if(rankHint) rankHint.textContent = `시트 연동 (${students.length}명)`;
}

startClock();
setLive(true, "로딩중…");

const el = document.getElementById("newNames");
if(el && !el.textContent.trim()) el.textContent = "홍길동 환영합니다!";

loadFromSheet().catch(err=>{
  console.error(err);
  setLive(false, "시트 오류");
  alert("구글시트 연동 오류: " + err.message);
});
