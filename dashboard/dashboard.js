/* =========================================================
   Keimyung Taekwondo | LIVE BOARD
   - Points TOP10: '합계포인트' 기준
   - Senior/Belt TOP10: 'rank_score' 기준(정렬용) + '단증합계'(표시용)
   ========================================================= */

const CONFIG = {
  csvUrl:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTndQfKXAUuJaAZTbFYFhWbNhlhFmg2tNyaaRJRRLxYGCgUawZUeytRZ-aH9nusJ1SAUHtYYozgO6a0/pub?gid=0&single=true&output=csv",
  photoBaseUrl: "/gallery/images/students/",
  photoSuffix: "_01.jpg",
  topN: 10,
  scrollSecondsPoints: 22,
  scrollSecondsBelt: 24,
  photoScrollSeconds: 28,
  privacyMode: "full",
  photoCount: 18,
};

const DAILY_AWARDS = [
  { title: "어제의 MVP",      id: "KM003", name: "김민규", tag: "노력 최고!" },
  { title: "어제의 웃음왕",   id: "KM001", name: "김예담", tag: "시간 약속 굿!" },
  { title: "어제의 도복왕",   id: "KM055", name: "최기영", tag: "도복이 반짝!" },
  { title: "어제의 인사왕",   id: "KM011", name: "김동언", tag: "인사 태도 최고!" },
  { title: "어제의 목소리왕", id: "KM048", name: "이주형", tag: "기합 우렁차다!" },
  { title: "어제의 정리왕",   id: "KM017", name: "김우리", tag: "정리정돈 멋짐!" },
  { title: "어제의 배려왕",   id: "KM016", name: "김시율", tag: "친구 돕기 최고!" },
  { title: "어제의 집중왕",   id: "KM057", name: "하석진", tag: "눈빛이 다르다!" },
];

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
  try { return new Intl.NumberFormat("ko-KR").format(n); }
  catch { return String(n); }
}
function applyPrivacy(name, id) {
  if (CONFIG.privacyMode === "full") return (name || id || "-").trim();
  if (CONFIG.privacyMode === "id") return (id || name || "-").trim();
  const s = String(name ?? "").trim();
  return s ? (s[0] + "*") : (id || "-");
}
function numLike(v) {
  const s = String(v ?? "").replace(/\s+/g, "").replace(/,/g, "");
  const n = Number(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/* =========================
   URL sanitize (csv가 2번 붙어도 첫 url만 사용)
   ========================= */
function sanitizeCsvUrl(url) {
  const s = String(url || "");
  const idx = s.indexOf("https://docs.google.com/spreadsheets/");
  if (idx === -1) return s.trim();
  const cut = s.indexOf("https://docs.google.com/spreadsheets/", idx + 10);
  return (cut > -1 ? s.slice(idx, cut) : s.slice(idx)).trim();
}

/* =========================
   CSV parse
   ========================= */
function parseCSV(text) {
  const rowsArr = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  const s = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n") { row.push(cur); rowsArr.push(row); row = []; cur = ""; }
      else cur += ch;
    }
  }
  row.push(cur);
  rowsArr.push(row);

  while (rowsArr.length && rowsArr[rowsArr.length - 1].every(v => String(v ?? "").trim() === "")) rowsArr.pop();
  if (rowsArr.length <= 1) return [];

  const headers = rowsArr[0].map(h => String(h ?? "").trim());

  const out = [];
  for (let r = 1; r < rowsArr.length; r++) {
    const cols = rowsArr[r];
    const obj = { __cols: cols, __headers: headers };
    headers.forEach((h, idx) => (obj[h] = String(cols[idx] ?? "").trim()));
    out.push(obj);
  }
  return out;
}

async function loadCsv(url) {
  const clean = sanitizeCsvUrl(url);
  const res = await fetch(clean, { cache: "no-store" });
  if (!res.ok) throw new Error("CSV fetch 실패: " + res.status);
  return parseCSV(await res.text());
}

/* =========================
   Header matching (느슨하게)
   ========================= */
function cleanKey(k) {
  return String(k ?? "")
    .replace(/\uFEFF/g, "")
    .replace(/[\u200B-\u200D\u2060]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}
function findColIndexByHeader(headers, candidates) {
  const norm = headers.map(h => cleanKey(h));
  const want = candidates.map(c => cleanKey(c));
  for (let i = 0; i < norm.length; i++) {
    for (const w of want) {
      if (norm[i] === w) return i;
    }
  }
  for (let i = 0; i < norm.length; i++) {
    for (const w of want) {
      if (norm[i].includes(w) || w.includes(norm[i])) return i;
    }
  }
  return -1;
}
function getByKeys(row, keys) {
  const map = new Map();
  for (const [k, v] of Object.entries(row)) map.set(cleanKey(k), v);
  for (const k of keys) {
    const v = map.get(cleanKey(k));
    if (v !== undefined && String(v).trim() !== "") return v;
  }
  return "";
}

/* =========================
   Rows mapping
   - Points: 합계포인트
   - Belt display: 단증합계 (N열)
   - Belt sort: rank_score (O열)
   ========================= */
function mapRows(rows) {
  if (!rows.length) return [];

  const headers = rows[0].__headers || [];

  const pointIdx = findColIndexByHeader(headers, [
    "합계포인트", "합계 포인트", "포인트합계", "총포인트", "누적포인트", "포인트"
  ]);

  const beltLabelIdx = findColIndexByHeader(headers, [
    "단증합계", "단증 합계"
  ]);

  const rankScoreIdx = findColIndexByHeader(headers, [
    "rank_score", "rankscore", "정렬점수", "단급점수", "단급스코어"
  ]);

  return rows.map(r => {
    const cols = Array.isArray(r.__cols) ? r.__cols : [];

    const id = String(getByKeys(r, ["아이디","id","ID","코드","번호"]) || "").toUpperCase().trim();
    const name = String(getByKeys(r, ["이름","name","성명","학생","수련생"]) || "").trim();

    // 포인트
    let scoreRaw = getByKeys(r, ["합계포인트","합계 포인트","포인트합계","총포인트","누적포인트","포인트"]);
    if (!scoreRaw && pointIdx >= 0 && cols[pointIdx] != null) scoreRaw = cols[pointIdx];
    const points = numLike(scoreRaw);

    // 표시용 단증합계
    let beltLabel = getByKeys(r, ["단증합계","단증 합계"]);
    if (!beltLabel && beltLabelIdx >= 0 && cols[beltLabelIdx] != null) beltLabel = cols[beltLabelIdx];
    beltLabel = String(beltLabel ?? "").trim();

    // 정렬용 rank_score
    let beltScoreRaw = getByKeys(r, ["rank_score","rankscore","정렬점수","단급점수","단급스코어"]);
    if (!beltScoreRaw && rankScoreIdx >= 0 && cols[rankScoreIdx] != null) beltScoreRaw = cols[rankScoreIdx];
    const beltScore = numLike(beltScoreRaw);

    return {
      id,
      name,
      points,
      beltLabel: beltLabel || "-",
      beltScore: beltScore || 0,
    };
  }).filter(x => x.id || x.name);
}

/* =========================
   Render helpers
   ========================= */
function setSpeedY(tickerEl, seconds) { tickerEl.style.setProperty("--speed", seconds + "s"); }
function setSpeedX(trackEl, seconds) { trackEl.style.setProperty("--speedX", seconds + "s"); }

function renderTicker(listEl, items, type) {
  const top = items.slice(0, CONFIG.topN);
  const html = top.map((it, idx) => {
    const rankNum = idx + 1;
    const displayName = applyPrivacy(it.name, it.id);
    const meta = (type === "points")
      ? `${fmt(it.points)} P`
      : (it.beltLabel || "-");

    const topClass = rankNum === 1 ? "top1" : rankNum === 2 ? "top2" : rankNum === 3 ? "top3" : "";
    return `
      <div class="row ${topClass}">
        <div class="rank ${topClass}">${rankNum}</div>
        <div class="name">${escapeHtml(displayName)}</div>
        <div class="meta">${escapeHtml(meta)}</div>
      </div>
    `;
  }).join("");

  listEl.innerHTML = html + html;
}

function renderAwards() {
  const grid = $("awardsGrid");
  if (!grid) return;

  const base = (CONFIG.photoBaseUrl || "").trim().replace(/\/?$/, "/");
  const suffix = CONFIG.photoSuffix || "_01.jpg";

  grid.innerHTML = (DAILY_AWARDS || []).map(a => {
    const id = (a.id || "").toUpperCase();
    const showName = applyPrivacy(a.name, id);
    const src = id ? base + id + suffix : "";
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

function renderPhotoMarquee(items) {
  const track = $("photoTrack");
  if (!track) return;

  const base = (CONFIG.photoBaseUrl || "").trim().replace(/\/?$/, "/");
  const suffix = CONFIG.photoSuffix || "_01.jpg";

  const seen = new Set();
  const picked = [];
  for (const it of items) {
    const id = (it.id || "").toUpperCase();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    picked.push({ id, label: applyPrivacy(it.name, id) });
    if (picked.length >= CONFIG.photoCount) break;
  }

  const arr = picked.map(x => ({ label: x.label, src: base + x.id + suffix }));
  const doubled = arr.concat(arr);

  track.innerHTML = doubled.map(it => `
    <div class="avatar">
      <img src="${escapeHtml(it.src)}" alt="${escapeHtml(it.label)}" loading="lazy"
           onerror="this.style.display='none'" />
      <div class="label">${escapeHtml(it.label)}</div>
    </div>
  `).join("");
}

function wireControls() {
  const btnFullscreen = $("btnFullscreen");
  if (btnFullscreen) {
    btnFullscreen.addEventListener("click", async () => {
      const el = $("frame") || document.documentElement;
      try {
        if (!document.fullscreenElement) await el.requestFullscreen();
        else await document.exitFullscreen();
      } catch (_) {}
    });
  }
  const btnReload = $("btnReload");
  if (btnReload) btnReload.addEventListener("click", () => location.reload());
}

function startClock() {
  const footClock = $("footClock");
  const monthText = $("monthText");
  const msgDate = $("msgDate");
  const nowText = $("nowText");

  const initHeader = () => {
    const d = new Date();
    if (monthText) monthText.textContent = `${d.getMonth() + 1}월`;
    if (msgDate) msgDate.textContent = `${d.getMonth() + 1}월 ${d.getDate()}일`;
    if (nowText) nowText.textContent = "LIVE";
  };
  const tick = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    if (footClock) footClock.textContent = `${hh}:${mm}`;
  };

  initHeader();
  tick();
  setInterval(tick, 1000);
}

/* =========================
   Init
   ========================= */
async function init() {
  if ($("pointsTicker")) setSpeedY($("pointsTicker"), CONFIG.scrollSecondsPoints);
  if ($("beltTicker")) setSpeedY($("beltTicker"), CONFIG.scrollSecondsBelt);
  if ($("photoTrack")) setSpeedX($("photoTrack"), CONFIG.photoScrollSeconds);

  renderAwards();
  wireControls();
  startClock();

  const raw = await loadCsv(CONFIG.csvUrl);
  const data = mapRows(raw);

  // ✅ 포인트 TOP10
  const pointsSorted = [...data].sort((a, b) => b.points - a.points);
  if ($("pointsList")) renderTicker($("pointsList"), pointsSorted, "points");

  // ✅ 단/선배 TOP10: rank_score 내림차순(핵심!)
  const beltSorted = [...data].sort((a, b) => (b.beltScore - a.beltScore) || (b.points - a.points));
  if ($("beltList")) renderTicker($("beltList"), beltSorted, "belt");

  renderPhotoMarquee([...pointsSorted, ...beltSorted]);
}

init().catch(console.error);
