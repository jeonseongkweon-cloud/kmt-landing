/* =========================================================
   ✅ CONFIG
   ========================================================= */
const CONFIG = {
  // 단증합계(랭킹 기준) CSV
  pointsCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTndQfKXAUuJaAZTbFYFhWbNhlhFmg2tNyaaRJRRLxYGCgUawZUeytRZ-aH9nusJ1SAUHtYYozgO6a0/pub?gid=0&single=true&output=csv",

  // 사진 폴더(확인 완료: /gallery/images/students/KM001_01.jpg 열림)
  photoBaseUrl: "/gallery/images/students/",
  photoSuffix: "_01.jpg",

  topN: 10,
  scrollSecondsPoints: 22,
  scrollSecondsBelt: 24,
  photoScrollSeconds: 28,

  // ✅ 실명 표시 (요청 반영)
  privacyMode: "full",

  // 신규 등록(원하면 여기만 수정)
  newStudents: [
    { name: "신규: (이름 입력)", note: "환영합니다!" },
    { name: "신규: (이름 입력)", note: "환영합니다!" },
    { name: "신규: (이름 입력)", note: "환영합니다!" },
    { name: "신규: (이름 입력)", note: "환영합니다!" },
  ],
};

/* =========================================================
   ✅ 오늘의 명예의 전당 (사무실에서 여기만 수정하면 끝)
   - title: 항목명
   - name: 실명
   - id: KM001 (사진 자동)
   - tag: 짧은 칭찬
   ========================================================= */
const DAILY_AWARDS = [
  { title: "오늘의 MVP",        id: "KM001", name: "김예담", tag: "노력 최고!" },
  { title: "오늘의 출석왕",     id: "KM002", name: "이서안", tag: "시간 약속 굿!" },
  { title: "오늘의 도복왕",     id: "KM003", name: "김강민", tag: "도복이 반짝!" },
  { title: "오늘의 인사왕",     id: "KM004", name: "박민규", tag: "인사 태도 최고!" },
  { title: "오늘의 목소리왕",   id: "KM005", name: "오윤후", tag: "기합 우렁차다!" },
  { title: "오늘의 정리왕",     id: "KM006", name: "윤호은", tag: "정리정돈 멋짐!" },
  { title: "오늘의 배려왕",     id: "KM007", name: "정우빈", tag: "친구 돕기 최고!" },
  { title: "오늘의 집중왕",     id: "KM008", name: "최서준", tag: "눈빛이 다르다!" },
];

/* =========================
   DOM
   ========================= */
const $ = (id) => document.getElementById(id);

/* =========================
   Utils
   ========================= */
function fmt(n){
  try { return new Intl.NumberFormat("ko-KR").format(n); } catch(e){ return String(n); }
}
function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function parseCSV(text){
  const lines = text.trim().split(/\r?\n/);
  if(lines.length <= 1) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  const rows = [];
  for(let i=1;i<lines.length;i++){
    const cols = lines[i].split(",");
    const obj = {};
    headers.forEach((h,idx)=> obj[h] = (cols[idx] ?? "").trim());
    rows.push(obj);
  }
  return rows;
}
function numLike(v){
  return Number(String(v ?? "").replace(/[^\d]/g,"")) || 0;
}
function applyPrivacy(name, id){
  if(CONFIG.privacyMode === "full") return name || id || "-";
  if(CONFIG.privacyMode === "id") return id || name || "-";
  // initial 모드는 이번 버전에선 사용 안하지만 남겨둠
  const s = String(name ?? "").trim();
  if(!s) return id || "-";
  if(/[가-힣]/.test(s)){
    if(s.length===1) return s;
    if(s.length===2) return s[0]+"*";
    return s[0]+"*"+s[s.length-1];
  }
  return s[0]+"*";
}
function setSpeedY(tickerEl, seconds){
  tickerEl.style.setProperty("--speed", seconds + "s");
}
function setSpeedX(trackEl, seconds){
  trackEl.style.setProperty("--speedX", seconds + "s");
}

/* =========================
   Data load
   ========================= */
async function loadCsv(url){
  const res = await fetch(url, { cache: "no-store" });
  if(!res.ok) throw new Error("CSV fetch 실패: " + res.status);
  const text = await res.text();
  return parseCSV(text);
}

/* =========================
   Column mapping (유연)
   ========================= */
function mapRows(rows){
  const get = (r, keys) => {
    for(const k of keys){
      if(r[k] !== undefined && String(r[k]).trim() !== "") return r[k];
    }
    return "";
  };

  return rows.map(r => {
    const name = get(r, ["이름","name","학생","수련생","성명"]);
    const id   = get(r, ["아이디","ID","id","student_id","코드","번호"]).toUpperCase();

    // ✅ 랭킹 점수는 단증합계 우선
    const scoreRaw = get(r, ["단증합계","단증 합계","합계","총합","누적","포인트","points","점수","score"]);
    const points = numLike(scoreRaw);

    // 단/급(있으면 사용)
    const beltRaw = get(r, ["단","급","등급","벨트","품","단계","rank","belt"]);
    const beltNum = numLike(beltRaw);

    let beltText = beltRaw ? String(beltRaw) : "";
    if(beltText && /^[0-9]{1,2}$/.test(beltText)) beltText = beltText + "단";

    return { name, id, points, beltRaw, beltNum, beltText };
  })
  .filter(x => x.name || x.id);
}

/* =========================
   Render: 랭킹 TOP3 효과 포함
   ========================= */
function renderTicker(listEl, items, type){
  const top = items.slice(0, CONFIG.topN);

  const html = top.map((it, idx) => {
    const rankNum = idx + 1;
    const displayName = applyPrivacy(it.name, it.id);

    let meta = "-";
    if(type === "points"){
      meta = fmt(it.points) + " P";
    }else{
      meta = it.beltText || it.beltRaw || "-";
    }

    const topClass = (rankNum===1) ? "top1" : (rankNum===2) ? "top2" : (rankNum===3) ? "top3" : "";
    const rankClass = topClass;

    return `
      <div class="row ${topClass}">
        <div class="rank ${rankClass}">${rankNum}</div>
        <div class="name">${escapeHtml(displayName)}</div>
        <div class="meta">${escapeHtml(meta)}</div>
      </div>
    `;
  }).join("");

  // 끊김 없는 스크롤(복제)
  listEl.innerHTML = html + html;

  // scroll 높이 계산 (원본 절반 기준)
  requestAnimationFrame(() => {
    const children = Array.from(listEl.children);
    const half = children.length / 2;
    let h = 0;
    for(let i=0;i<half;i++){
      h += children[i].getBoundingClientRect().height + 10;
    }
    listEl.parentElement.style.setProperty("--scrollH", Math.max(160, Math.floor(h)) + "px");
  });
}

/* =========================
   Render: 신규
   ========================= */
function renderNewList(){
  const el = $("newList");
  if(!el) return;
  el.innerHTML = (CONFIG.newStudents || []).map(it => `
    <div class="row" style="grid-template-columns: 1fr auto;">
      <div class="name">${escapeHtml(it.name || "-")}</div>
      <div class="meta">${escapeHtml(it.note || "")}</div>
    </div>
  `).join("");
}

/* =========================
   Render: 사진 흐름
   ========================= */
function renderPhotoMarquee(fromItems){
  const track = $("photoTrack");
  if(!track) return;

  const base = (CONFIG.photoBaseUrl || "").trim().replace(/\/?$/, "/");
  const suffix = CONFIG.photoSuffix || "_01.jpg";

  // 랭킹/단선배 섞어서 다양하게
  const unique = [];
  const seen = new Set();

  for(const it of fromItems){
    const key = (it.id || "").toUpperCase();
    if(!key) continue;
    if(seen.has(key)) continue;
    seen.add(key);
    unique.push({
      id: key,
      label: it.name || key, // ✅ 실명 표시
    });
    if(unique.length >= Math.max(14, CONFIG.topN * 2)) break;
  }

  const arr = unique.map(x => ({
    label: x.label,
    src: base + x.id + suffix
  }));

  // 끊김 방지로 2번 반복
  fillPhotoTrack(arr.concat(arr));
}

function fillPhotoTrack(arr){
  const track = $("photoTrack");
  if(!track) return;

  track.innerHTML = arr.map(it => {
    const label = escapeHtml(it.label || "KMT");
    const src = it.src ? escapeHtml(it.src) : "";
    return `
      <div class="avatar">
        ${src ? `<img src="${src}" alt="${label}" loading="lazy" onerror="this.style.display='none'" />`
              : `<div style="font-weight:1000;color:var(--gold);opacity:.9;">KM</div>`}
        <div class="label">${label}</div>
      </div>
    `;
  }).join("");

  requestAnimationFrame(() => {
    const rect = track.getBoundingClientRect();
    track.style.setProperty("--scrollW", Math.max(700, Math.floor(rect.width/2)) + "px");
  });
}

/* =========================
   Render: 명예의 전당(사진+실명)
   ========================= */
function renderAwards(){
  const grid = $("awardsGrid");
  if(!grid) return;

  const base = (CONFIG.photoBaseUrl || "").trim().replace(/\/?$/, "/");
  const suffix = CONFIG.photoSuffix || "_01.jpg";

  grid.innerHTML = (DAILY_AWARDS || []).map(a => {
    const id = (a.id || "").toUpperCase();
    const showName = applyPrivacy(a.name, id);
    const src = id ? (base + id + suffix) : "";

    return `
      <div class="awardCard">
        <div class="awardPhoto">
          ${src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(showName)}" loading="lazy" onerror="this.style.display='none'">`
                : `<div style="font-weight:1000;color:var(--gold);opacity:.9;">KM</div>`}
        </div>
        <div class="awardTxt">
          <div class="awardTitle">${escapeHtml(a.title || "오늘의 ★")}</div>
          <div class="awardName">${escapeHtml(showName)}</div>
          <div class="awardTag">${escapeHtml(a.tag || "")}</div>
        </div>
      </div>
    `;
  }).join("");
}

/* =========================
   Init
   ========================= */
let PAUSED = false;

async function init(){
  // ✅ 필수 DOM이 없으면 여기서 경고만 띄우고 진행(먹통 방지)
  const required = ["pointsList","beltList","photoTrack","awardsGrid","pointsTicker","beltTicker"];
  required.forEach(id=>{
    if(!$(id)) console.warn(`[Dashboard] missing #${id} (index.html id 확인)`);
  });

  const now = new Date();
  const monthText = $("monthText");
  const msgDate = $("msgDate");
  if(monthText) monthText.textContent = `${now.getMonth()+1}월`;
  if(msgDate) msgDate.textContent = `${now.getMonth()+1}월 ${now.getDate()}일`;

  // 속도
  if($("pointsTicker")) setSpeedY($("pointsTicker"), CONFIG.scrollSecondsPoints);
  if($("beltTicker")) setSpeedY($("beltTicker"), CONFIG.scrollSecondsBelt);
  if($("photoTrack")) setSpeedX($("photoTrack"), CONFIG.photoScrollSeconds);

  renderNewList();
  renderAwards();

  try{
    const rows = await loadCsv(CONFIG.pointsCsvUrl);
    const data = mapRows(rows);

    // 1) 포인트/단증합계 랭킹
    const pointsSorted = [...data].sort((a,b)=> b.points - a.points);
    if($("pointsList")) renderTicker($("pointsList"), pointsSorted, "points");

    // 2) 단/선배 랭킹 (단 정보 있으면 단 우선, 없으면 points로라도 표시)
    const hasBelt = data.some(x => x.beltRaw && String(x.beltRaw).trim() !== "");
    const beltSorted = hasBelt
      ? [...data].sort((a,b)=> (b.beltNum - a.beltNum) || (b.points - a.points))
      : [...pointsSorted];

    const beltRender = beltSorted.map(x => ({
      ...x,
      beltText: x.beltText || (x.points ? (fmt(x.points) + " (합계)") : "-")
    }));
    if($("beltList")) renderTicker($("beltList"), beltRender, "belt");

    // 3) 사진 흐름
    renderPhotoMarquee([...pointsSorted, ...beltSorted]);

    if($("liveDot")) $("liveDot").classList.remove("warn");
    if($("nowText")) $("nowText").textContent = "LIVE";
  }catch(err){
    console.error(err);
    if($("liveDot")) $("liveDot").classList.add("warn");
    if($("nowText")) $("nowText").textContent = "오류";
  }

  // 버튼들
  const btnFullscreen = $("btnFullscreen");
  if(btnFullscreen){
    btnFullscreen.addEventListener("click", async ()=>{
      const el = $("frame");
      try{
        if(!document.fullscreenElement) await el.requestFullscreen();
        else await document.exitFullscreen();
      }catch(e){}
    });
  }

  const btnPause = $("btnPause");
  if(btnPause){
    btnPause.addEventListener("click", ()=>{
      PAUSED = !PAUSED;
      const state = PAUSED ? "paused" : "running";
      document.querySelectorAll(".list, .track").forEach(el=>{
        el.style.animationPlayState = state;
      });
      btnPause.textContent = PAUSED ? "재생" : "일시정지";
    });
  }

  const btnReload = $("btnReload");
  if(btnReload) btnReload.addEventListener("click", ()=> location.reload());

  // 시계
  setInterval(()=>{
    const d = new Date();
    const hh = String(d.getHours()).padStart(2,"0");
    const mm = String(d.getMinutes()).padStart(2,"0");
    const footClock = $("footClock");
    if(footClock) footClock.textContent = `${hh}:${mm}`;
  }, 1000);

  // 리사이즈 시 마퀴 폭 재계산
  window.addEventListener("resize", ()=>{
    const track = $("photoTrack");
    if(!track) return;
    const rect = track.getBoundingClientRect();
    track.style.setProperty("--scrollW", Math.max(700, Math.floor(rect.width/2)) + "px");
  });
}

init();
