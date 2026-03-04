/* =========================================================
   ✅ CONFIG (전총재님이 주신 값 반영 완료)
   - pointsCsvUrl: 단증합계 시트 CSV
   - photoBaseUrl: /gallery/images/students/ 폴더 (KM001_01.jpg 형식)
   ========================================================= */
const CONFIG = {
  // ✅ 전총재님 제공 CSV
  pointsCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTndQfKXAUuJaAZTbFYFhWbNhlhFmg2tNyaaRJRRLxYGCgUawZUeytRZ-aH9nusJ1SAUHtYYozgO6a0/pub?gid=0&single=true&output=csv",

  // ✅ 사진 폴더(권장: 도메인 루트 기준 절대경로)
  // 커스텀 도메인(계명태권도.com)에서 가장 안정적: "/gallery/images/students/"
  photoBaseUrl: "/gallery/images/students/",

  // 표시 옵션
  topN: 10,
  scrollSecondsPoints: 22,
  scrollSecondsBelt: 24,
  photoScrollSeconds: 28,

  // 개인정보 모드: "initial"(김*담) | "id"(KM001) | "full"(실명-권장X)
  privacyMode: "initial",

  // 사진 파일 규칙
  // 현재 폴더에 KM001_01.jpg 형태가 있으므로 "_01.jpg" 기본 사용
  photoSuffix: "_01.jpg",

  // 신규 등록(수시로 수정)
  newStudents: [
    { name: "신규: (이름 입력)", note: "환영합니다!" },
    { name: "신규: (이름 입력)", note: "환영합니다!" },
    { name: "신규: (이름 입력)", note: "환영합니다!" },
    { name: "신규: (이름 입력)", note: "환영합니다!" },
  ],
};

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
function toInitial(name){
  const s = String(name ?? "").trim();
  if(!s) return "";
  if(/[가-힣]/.test(s)){
    if(s.length===1) return s;
    if(s.length===2) return s[0]+"*";
    return s[0]+"*"+s[s.length-1];
  }
  return s[0]+"*";
}
function applyPrivacy(name, id){
  if(CONFIG.privacyMode === "full") return name || id || "-";
  if(CONFIG.privacyMode === "id") return id || toInitial(name) || "-";
  return toInitial(name) || id || "-";
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
   Render blocks
   ========================= */
function renderTicker(listEl, items, type){
  const top = items.slice(0, CONFIG.topN);

  const html = top.map((it, idx) => {
    const rank = idx + 1;
    const displayName = applyPrivacy(it.name, it.id);

    let meta = "-";
    if(type === "points"){
      meta = fmt(it.points) + " P";
    }else if(type === "belt"){
      // 표시할 텍스트
      meta = it.beltText || it.beltRaw || "-";
    }

    return `
      <div class="row">
        <div class="rank">${rank}</div>
        <div class="name">${escapeHtml(displayName)}</div>
        <div class="meta">${escapeHtml(meta)}</div>
      </div>
    `;
  }).join("");

  // 끊김 없는 스크롤용 복제
  listEl.innerHTML = html + html;

  // scroll 높이 계산 (원본 절반 기준)
  requestAnimationFrame(() => {
    const children = Array.from(listEl.children);
    const half = children.length / 2;
    let h = 0;
    for(let i=0;i<half;i++){
      h += children[i].getBoundingClientRect().height + 8; // gap
    }
    listEl.parentElement.style.setProperty("--scrollH", Math.max(120, Math.floor(h)) + "px");
  });
}

function renderNewList(){
  $("newList").innerHTML = (CONFIG.newStudents || []).map(it => `
    <div class="row" style="grid-template-columns: 1fr auto;">
      <div class="name">${escapeHtml(it.name || "-")}</div>
      <div class="meta">${escapeHtml(it.note || "")}</div>
    </div>
  `).join("");
}

function renderPhotoMarquee(fromItems){
  // fromItems: 랭킹 데이터 기반으로 사진 자동 생성 (KM001_01.jpg)
  const base = (CONFIG.photoBaseUrl || "").trim().replace(/\/?$/, "/");
  const suffix = CONFIG.photoSuffix || "_01.jpg";

  // 사진은 랭킹 TOP N + 벨트 TOP N 섞어서 다양하게
  const unique = [];
  const seen = new Set();

  for(const it of fromItems){
    const key = (it.id || "").toUpperCase();
    if(!key) continue;
    if(seen.has(key)) continue;
    seen.add(key);
    unique.push({
      id: key,
      label: key,
      name: it.name || ""
    });
    if(unique.length >= Math.max(12, CONFIG.topN * 2)) break;
  }

  // fallback (ID가 없을 경우)
  if(unique.length === 0){
    const fb = Array.from({length: 12}).map((_,i)=>({label:"KMT", src:""}));
    fillPhotoTrack(fb.concat(fb));
    return;
  }

  const arr = unique.map(x => ({
    label: (CONFIG.privacyMode === "full" ? (x.name || x.label) : x.label),
    src: base + x.id + suffix
  }));

  // 끊김 방지로 2번 반복
  fillPhotoTrack(arr.concat(arr));
}

function fillPhotoTrack(arr){
  $("photoTrack").innerHTML = arr.map(it => {
    const label = escapeHtml(it.label || "KMT");
    const src = it.src ? escapeHtml(it.src) : "";
    if(src){
      return `
        <div class="avatar">
          <img src="${src}" alt="${label}" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.add('noimg')" />
          <div class="label">${label}</div>
        </div>
      `;
    }
    return `
      <div class="avatar">
        <div style="font-weight:1000;color:var(--gold);opacity:.9;">KM</div>
        <div class="label">${label}</div>
      </div>
    `;
  }).join("");

  requestAnimationFrame(() => {
    const trackEl = $("photoTrack");
    const rect = trackEl.getBoundingClientRect();
    trackEl.style.setProperty("--scrollW", Math.max(600, Math.floor(rect.width/2)) + "px");
  });
}

/* =========================
   Column mapping (유연)
   ========================= */
function mapRows(rows){
  // 가능한 컬럼명 후보들(시트 구조가 바뀌어도 잡히게)
  const get = (r, keys) => {
    for(const k of keys){
      if(r[k] !== undefined && String(r[k]).trim() !== "") return r[k];
    }
    return "";
  };

  return rows.map(r => {
    const name = get(r, ["이름","name","학생","수련생","성명"]);
    const id   = get(r, ["아이디","ID","id","student_id","코드","번호"]).toUpperCase();

    // 랭킹 점수(우선순위)
    // ✅ 전총재님 말씀: "단증합계"를 불러와서 랭킹 반영
    const scoreRaw = get(r, ["단증합계","단증 합계","합계","총합","누적","포인트","points","점수","score"]);
    const points = numLike(scoreRaw);

    // 단/급 표시(있으면 사용)
    const beltRaw = get(r, ["단","급","등급","벨트","품","단계","rank","belt"]);

    // belt 정렬용(숫자 있으면 그것으로 정렬)
    const beltNum = numLike(beltRaw);

    // 보기용 텍스트
    let beltText = beltRaw ? String(beltRaw) : "";
    // "2"만 들어오면 "2단"처럼 보정(선택)
    if(beltText && /^[0-9]{1,2}$/.test(beltText)) beltText = beltText + "단";

    return { name, id, points, beltRaw, beltNum, beltText };
  })
  .filter(x => x.name || x.id);
}

/* =========================
   Init
   ========================= */
let PAUSED = false;

async function init(){
  // 상단 날짜/시간
  const now = new Date();
  $("monthText").textContent = `${now.getMonth()+1}월`;
  $("msgDate").textContent = `${now.getMonth()+1}월 ${now.getDate()}일`;

  // 스크롤 속도
  setSpeedY($("pointsTicker"), CONFIG.scrollSecondsPoints);
  setSpeedY($("beltTicker"), CONFIG.scrollSecondsBelt);
  setSpeedX($("photoTrack"), CONFIG.photoScrollSeconds);

  renderNewList();

  // 데이터 로드
  try{
    const rows = await loadCsv(CONFIG.pointsCsvUrl);
    const data = mapRows(rows);

    // 1) 랭킹 TOP10: points 내림차순
    const pointsSorted = [...data].sort((a,b)=> b.points - a.points);
    renderTicker($("pointsList"), pointsSorted, "points");
    $("pointsSub").textContent = "업데이트: CSV 연결됨";

    // 2) 단/선배 TOP10:
    //    - beltNum이 있으면 beltNum 내림차순
    //    - 없으면 points로 대체(최소한 “선배 TOP”처럼 계속 보여지게)
    const hasBelt = data.some(x => x.beltRaw && String(x.beltRaw).trim() !== "");
    const beltSorted = hasBelt
      ? [...data].sort((a,b)=> (b.beltNum - a.beltNum) || (b.points - a.points))
      : [...pointsSorted];

    // beltText가 없으면 points를 대신 표기(안 비게)
    const beltRender = beltSorted.map(x => ({
      ...x,
      beltText: x.beltText || (x.points ? (fmt(x.points) + " (합계)") : "-")
    }));
    renderTicker($("beltList"), beltRender, "belt");
    $("beltSub").textContent = hasBelt ? "업데이트: CSV 연결됨" : "업데이트: (단 정보 없음 → 합계로 표시)";

    // 사진 흐름: points + belt 섞어서 자동 구성
    renderPhotoMarquee([...pointsSorted, ...beltSorted]);

    // 상태 표시
    $("sourceState").innerHTML = `CSV 연결됨<br><small>랭킹 기준: 단증합계(우선) / 단 정보 있으면 단/선배도 반영</small>`;
    $("modeState").textContent = `TV 공개 모드 (${CONFIG.privacyMode === "id" ? "ID" : "이니셜"} 표시)`;
    $("liveDot").classList.remove("warn");
    $("nowText").textContent = "LIVE";

  }catch(err){
    // 실패하면 안내
    $("sourceState").innerHTML = `CSV 연결 실패<br><small>${escapeHtml(err?.message || err)}</small>`;
    $("pointsSub").textContent = "업데이트: 실패";
    $("beltSub").textContent = "업데이트: 실패";
    $("liveDot").classList.add("warn");
    $("nowText").textContent = "오류";
  }

  // 버튼들
  $("btnFullscreen").addEventListener("click", async ()=>{
    const el = $("frame");
    try{
      if(!document.fullscreenElement) await el.requestFullscreen();
      else await document.exitFullscreen();
    }catch(e){}
  });

  $("btnPause").addEventListener("click", ()=>{
    PAUSED = !PAUSED;
    const state = PAUSED ? "paused" : "running";
    document.querySelectorAll(".list, .track").forEach(el=>{
      el.style.animationPlayState = state;
    });
    $("btnPause").textContent = PAUSED ? "재생" : "일시정지";
  });

  $("btnReload").addEventListener("click", ()=> location.reload());

  // 시계
  setInterval(()=>{
    const d = new Date();
    const hh = String(d.getHours()).padStart(2,"0");
    const mm = String(d.getMinutes()).padStart(2,"0");
    $("footClock").textContent = `${hh}:${mm}`;
  }, 1000);

  // 리사이즈 시 마퀴 폭 재계산
  window.addEventListener("resize", ()=>{
    const trackEl = $("photoTrack");
    const rect = trackEl.getBoundingClientRect();
    trackEl.style.setProperty("--scrollW", Math.max(600, Math.floor(rect.width/2)) + "px");
  });
}

init();
