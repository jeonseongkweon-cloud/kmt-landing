/* =========================================================
   Keimyung Taekwondo | LIVE BOARD
   - 랭킹 TOP10: 합계포인트 (H열)
   - 단/선배 TOP10: 단증합계 (N열)
   ========================================================= */

/* =========================
   CONFIG
   ========================= */
const CONFIG = {
  // ✅ 전총재님이 준 CSV (현재 시트)
  csvUrl:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTndQfKXAUuJaAZTbFYFhWbNhlhFmg2tNyaaRJRRLxYGCgUawZUeytRZ-aH9nusJ1SAUHtYYozgO6a0/pub?gid=0&single=true&output=csv",

  // ✅ 사진 위치 (확인 완료)
  photoBaseUrl: "/gallery/images/students/",
  photoSuffix: "_01.jpg",

  topN: 10,

  // 스크롤 속도
  scrollSecondsPoints: 22,
  scrollSecondsBelt: 24,
  photoScrollSeconds: 28,

  // ✅ 실명 표시
  privacyMode: "full",

  // 신규 등록(원하면 여기만 수정)
  newStudents: [
    { name: "신규: (이름 입력)", note: "환영합니다!" },
    { name: "신규: (이름 입력)", note: "환영합니다!" },
    { name: "신규: (이름 입력)", note: "환영합니다!" },
    { name: "신규: (이름 입력)", note: "환영합니다!" },
  ],

  // 사진 흐름에 넣을 개수 (랭킹/단선배 섞어서)
  photoCount: 18,
};

/* =========================================================
   오늘의 명예의 전당 (사무실에서 여기만 수정하면 끝!)
   - title: 항목명
   - name : 실명
   - id   : KM001 (사진 자동)
   - tag  : 짧은 칭찬
   ========================================================= */
const DAILY_AWARDS = [
  { title: "오늘의 MVP",      id: "KM001", name: "김예담", tag: "노력 최고!" },
  { title: "오늘의 출석왕",   id: "KM002", name: "이서안", tag: "시간 약속 굿!" },
  { title: "오늘의 도복왕",   id: "KM003", name: "김강민", tag: "도복이 반짝!" },
  { title: "오늘의 인사왕",   id: "KM004", name: "박민규", tag: "인사 태도 최고!" },
  { title: "오늘의 목소리왕", id: "KM005", name: "오윤후", tag: "기합 우렁차다!" },
  { title: "오늘의 정리왕",   id: "KM006", name: "윤호은", tag: "정리정돈 멋짐!" },
  { title: "오늘의 배려왕",   id: "KM007", name: "정우빈", tag: "친구 돕기 최고!" },
  { title: "오늘의 집중왕",   id: "KM008", name: "최서준", tag: "눈빛이 다르다!" },
];

/* =========================
   DOM helpers
   ========================= */
const $ = (id) => document.getElementById(id);

/* =========================
   Utils
   ========================= */
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmt(n) {
  try {
    return new Intl.NumberFormat("ko-KR").format(n);
  } catch {
    return String(n);
  }
}

function applyPrivacy(name, id) {
  if (CONFIG.privacyMode === "full") return (name || id || "-").trim();
  if (CONFIG.privacyMode === "id") return (id || name || "-").trim();

  // initial (미사용이지만 옵션 유지)
  const s = String(name ?? "").trim();
  if (!s) return id || "-";
  if (/[가-힣]/.test(s)) {
    if (s.length === 1) return s;
    if (s.length === 2) return s[0] + "*";
    return s[0] + "*" + s[s.length - 1];
  }
  return s[0] + "*";
}

function numLike(v) {
  // "1,200", "600점", "2단", "9급" 등 → 숫자만 추출
  const s = String(v ?? "")
    .replace(/\s+/g, "")
    .replace(/,/g, ""); // ✅ 천단위 콤마 제거
  const n = Number(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/* =========================
   Robust CSV parser (RFC4180-ish)
   ========================= */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  const s = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(cur);
        cur = "";
      } else if (ch === "\n") {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  row.push(cur);
  rows.push(row);

  // 빈 마지막 줄 제거
  while (
    rows.length &&
    rows[rows.length - 1].every((v) => String(v ?? "").trim() === "")
  ) {
    rows.pop();
  }

  if (rows.length <= 1) return [];

  const headers = rows[0].map((h) => String(h ?? "").trim());
  const out = [];

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const obj = {};
    headers.forEach((h, idx) => (obj[h] = String(cols[idx] ?? "").trim()));
    out.push(obj);
  }
  return out;
}

/* =========================
   Load CSV
   ========================= */
async function loadCsv(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("CSV fetch 실패: " + res.status);
  const text = await res.text();
  return parseCSV(text);
}

/* =========================
   Row getter with aliases
   ========================= */
function getField(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && String(row[k]).trim() !== "") return row[k];
  }
  return "";
}

/* =========================
   Map rows (✅ 전총재님 시트 고정)
   ========================= */
function mapRows(rows) {
  return rows
    .map((r) => {
      const id = getField(r, ["아이디", "ID", "id", "코드", "번호"]).toUpperCase();
      const name = getField(r, ["이름", "name", "성명", "학생", "수련생"]);

      // ✅ 랭킹 점수는 무조건 합계포인트(H열)
      const scoreRaw = getField(r, [
        "합계포인트",
        "합계 포인트",
        "포인트합계",
        "포인트 합계",
        "누적포인트",
        "누적 포인트",
        "총포인트",
        "총 포인트",
        "포인트",
        "points",
        "점수",
        "score",
      ]);
      const points = numLike(scoreRaw);

      // ✅ 단/선배는 무조건 단증합계(N열) (예: 2단, 6단)
      const beltRaw = getField(r, [
        "단증합계",
        "단증 합계",
        "태권도단증",
        "검도단증",
        "단",
        "급",
        "등급",
        "품",
        "rank",
        "belt",
      ]);

      const beltNum = numLike(beltRaw);
      let beltText = beltRaw ? String(beltRaw).trim() : "";
      // "2" 처럼 숫자만 들어오면 "2단"으로
      if (beltText && /^[0-9]{1,2}$/.test(beltText)) beltText = beltText + "단";

      return { id, name, points, beltRaw, beltNum, beltText };
    })
    .filter((x) => x.id || x.name);
}

/* =========================
   Speed helpers
   ========================= */
function setSpeedY(tickerEl, seconds) {
  tickerEl.style.setProperty("--speed", seconds + "s");
}
function setSpeedX(trackEl, seconds) {
  trackEl.style.setProperty("--speedX", seconds + "s");
}

/* =========================
   Render: ticker (TOP3 효과 포함)
   ========================= */
function renderTicker(listEl, items, type) {
  const top = items.slice(0, CONFIG.topN);

  const html = top
    .map((it, idx) => {
      const rankNum = idx + 1;
      const displayName = applyPrivacy(it.name, it.id);

      let meta = "-";
      if (type === "points") {
        meta = fmt(it.points) + " P";
      } else {
        meta = it.beltText || it.beltRaw || "-";
      }

      const topClass =
        rankNum === 1 ? "top1" : rankNum === 2 ? "top2" : rankNum === 3 ? "top3" : "";
      const rankClass = topClass;

      return `
        <div class="row ${topClass}">
          <div class="rank ${rankClass}">${rankNum}</div>
          <div class="name">${escapeHtml(displayName)}</div>
          <div class="meta">${escapeHtml(meta)}</div>
        </div>
      `;
    })
    .join("");

  // 끊김 없는 스크롤을 위해 2번 복제
  listEl.innerHTML = html + html;

  // 스크롤 높이 계산(원본 절반)
  requestAnimationFrame(() => {
    const children = Array.from(listEl.children);
    const half = children.length / 2;
    let h = 0;
    for (let i = 0; i < half; i++) {
      h += children[i].getBoundingClientRect().height + 10;
    }
    listEl.parentElement.style.setProperty("--scrollH", Math.max(160, Math.floor(h)) + "px");
  });
}

/* =========================
   Render: 신규 등록
   ========================= */
function renderNewList() {
  const el = $("newList");
  if (!el) return;

  el.innerHTML = (CONFIG.newStudents || [])
    .map(
      (it) => `
      <div class="row" style="grid-template-columns: 1fr auto;">
        <div class="name">${escapeHtml(it.name || "-")}</div>
        <div class="meta">${escapeHtml(it.note || "")}</div>
      </div>
    `
    )
    .join("");
}

/* =========================
   Render: 사진 흐름
   ========================= */
function renderPhotoMarquee(sourceItems) {
  const track = $("photoTrack");
  if (!track) return;

  const base = (CONFIG.photoBaseUrl || "").trim().replace(/\/?$/, "/");
  const suffix = CONFIG.photoSuffix || "_01.jpg";

  // 중복 제거해서 일정 개수 확보
  const unique = [];
  const seen = new Set();

  for (const it of sourceItems) {
    const id = (it.id || "").toUpperCase();
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push({
      id,
      label: applyPrivacy(it.name, id),
    });
    if (unique.length >= CONFIG.photoCount) break;
  }

  const arr = unique.map((x) => ({
    label: x.label,
    src: base + x.id + suffix,
  }));

  // 끊김 방지: 2배로 반복
  fillPhotoTrack(arr.concat(arr));
}

function fillPhotoTrack(arr) {
  const track = $("photoTrack");
  if (!track) return;

  track.innerHTML = arr
    .map((it) => {
      const label = escapeHtml(it.label || "KMT");
      const src = it.src ? escapeHtml(it.src) : "";
      return `
        <div class="avatar">
          ${
            src
              ? `<img src="${src}" alt="${label}" loading="lazy" onerror="this.style.display='none'" />`
              : `<div style="font-weight:1000;color:var(--gold);opacity:.9;">KM</div>`
          }
          <div class="label">${label}</div>
        </div>
      `;
    })
    .join("");

  requestAnimationFrame(() => {
    const rect = track.getBoundingClientRect();
    // 2배 반복이므로 절반만 이동하면 자연스럽게 루프
    track.style.setProperty("--scrollW", Math.max(700, Math.floor(rect.width / 2)) + "px");
  });
}

/* =========================
   Render: 명예의 전당 (사진 + 실명)
   ========================= */
function renderAwards() {
  const grid = $("awardsGrid");
  if (!grid) return;

  const base = (CONFIG.photoBaseUrl || "").trim().replace(/\/?$/, "/");
  const suffix = CONFIG.photoSuffix || "_01.jpg";

  grid.innerHTML = (DAILY_AWARDS || [])
    .map((a) => {
      const id = (a.id || "").toUpperCase();
      const showName = applyPrivacy(a.name, id);
      const src = id ? base + id + suffix : "";

      return `
        <div class="awardCard">
          <div class="awardPhoto">
            ${
              src
                ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(showName)}" loading="lazy" onerror="this.style.display='none'">`
                : `<div style="font-weight:1000;color:var(--gold);opacity:.9;">KM</div>`
            }
          </div>
          <div class="awardTxt">
            <div class="awardTitle">${escapeHtml(a.title || "오늘의 ★")}</div>
            <div class="awardName">${escapeHtml(showName)}</div>
            <div class="awardTag">${escapeHtml(a.tag || "")}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

/* =========================
   Controls (pause/fullscreen/reload)
   ========================= */
let PAUSED = false;

function wireControls() {
  const btnFullscreen = $("btnFullscreen");
  if (btnFullscreen) {
    btnFullscreen.addEventListener("click", async () => {
      const el = $("frame") || document.documentElement;
      try {
        if (!document.fullscreenElement) await el.requestFullscreen();
        else await document.exitFullscreen();
      } catch (e) {}
    });
  }

  const btnPause = $("btnPause");
  if (btnPause) {
    btnPause.addEventListener("click", () => {
      PAUSED = !PAUSED;
      const state = PAUSED ? "paused" : "running";
      document.querySelectorAll(".list, .track").forEach((el) => {
        el.style.animationPlayState = state;
      });
      btnPause.textContent = PAUSED ? "재생" : "일시정지";
    });
  }

  const btnReload = $("btnReload");
  if (btnReload) btnReload.addEventListener("click", () => location.reload());
}

/* =========================
   Clock / Header
   ========================= */
function startClock() {
  const footClock = $("footClock");
  const nowText = $("nowText");
  const monthText = $("monthText");
  const msgDate = $("msgDate");

  const tick = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    if (footClock) footClock.textContent = `${hh}:${mm}`;
  };

  const initHeader = () => {
    const d = new Date();
    if (monthText) monthText.textContent = `${d.getMonth() + 1}월`;
    if (msgDate) msgDate.textContent = `${d.getMonth() + 1}월 ${d.getDate()}일`;
    if (nowText) nowText.textContent = "LIVE";
  };

  initHeader();
  tick();
  setInterval(tick, 1000);
}

/* =========================
   Init
   ========================= */
async function init() {
  // 필수 DOM 체크(없어도 멈추지 않게)
  const required = ["pointsList", "beltList", "photoTrack", "awardsGrid", "pointsTicker", "beltTicker"];
  required.forEach((id) => {
    if (!$(id)) console.warn(`[Dashboard] missing #${id} (index.html id 확인)`);
  });

  // 속도 적용
  if ($("pointsTicker")) setSpeedY($("pointsTicker"), CONFIG.scrollSecondsPoints);
  if ($("beltTicker")) setSpeedY($("beltTicker"), CONFIG.scrollSecondsBelt);
  if ($("photoTrack")) setSpeedX($("photoTrack"), CONFIG.photoScrollSeconds);

  // 고정 렌더
  renderNewList();
  renderAwards();
  wireControls();
  startClock();

  const liveDot = $("liveDot");

  try {
    const raw = await loadCsv(CONFIG.csvUrl);
    const data = mapRows(raw);

    // ✅ 포인트 랭킹: 합계포인트 기준
    const pointsSorted = [...data].sort((a, b) => b.points - a.points);
    if ($("pointsList")) renderTicker($("pointsList"), pointsSorted, "points");

    // ✅ 단/선배 랭킹: 단증합계(단/급) 기준
    // "6단"처럼 문자가 포함되어도 beltNum으로 정렬 가능
    const beltSorted = [...data].sort(
      (a, b) => (b.beltNum - a.beltNum) || (b.points - a.points)
    );
    if ($("beltList")) renderTicker($("beltList"), beltSorted, "belt");

    // 사진 흐름: 랭킹 + 단/선배 섞어서
    renderPhotoMarquee([...pointsSorted, ...beltSorted]);

    if (liveDot) liveDot.classList.remove("warn");
  } catch (err) {
    console.error(err);
    if (liveDot) liveDot.classList.add("warn");
    if ($("nowText")) $("nowText").textContent = "오류";
  }

  // 리사이즈 시 사진 흐름 폭 재계산
  window.addEventListener("resize", () => {
    const track = $("photoTrack");
    if (!track) return;
    const rect = track.getBoundingClientRect();
    track.style.setProperty("--scrollW", Math.max(700, Math.floor(rect.width / 2)) + "px");
  });
}

init();
