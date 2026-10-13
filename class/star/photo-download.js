import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.KMT_STAR_CONFIG;
const db = createClient(config.supabaseUrl, config.supabasePublishableKey, {
  auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" }
});
const ownerEmail = "jeonseongkweon@gmail.com";
const button = document.getElementById("photoDownloadMenuButton");
const dialog = document.getElementById("photoDownloadDialog");
const results = document.getElementById("photoDownloadResults");
const search = document.getElementById("photoDownloadSearch");
const status = document.getElementById("photoDownloadStatus");
const bulkButton = document.getElementById("photoDownloadAll");
let students = [];
let busy = false;
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const safeName = value => String(value ?? "학생").replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").trim() || "학생";

async function ownerOnly() {
  const { data: { user }, error } = await db.auth.getUser();
  if (error || user?.email?.trim().toLowerCase() !== ownerEmail) {
    throw new Error("관장 관리자 계정으로 로그인해야 사진을 내려받을 수 있습니다.");
  }
}
function verifiedPhotoURL(value) {
  const url = new URL(String(value), location.href);
  if (url.protocol !== "https:" && url.origin !== location.origin) throw new Error("안전하지 않은 사진 주소입니다.");
  return url.href;
}
function fileExtension(url, contentType) {
  const type = (contentType || "").toLowerCase().split(";")[0];
  const match = type.match(/^image\/(jpeg|png|webp|gif|heic|heif)$/);
  if (match) return match[1] === "jpeg" ? "jpg" : match[1];
  const suffix = new URL(url).pathname.match(/\.(jpe?g|png|webp|gif|heic|heif)$/i)?.[1];
  return suffix?.toLowerCase().replace("jpeg", "jpg") || "jpg";
}
async function getPhoto(row) {
  await ownerOnly();
  const url = verifiedPhotoURL(row.photo_url);
  const response = await fetch(url, { mode: "cors", credentials: "omit", cache: "no-store" });
  if (!response.ok) throw new Error(`사진 다운로드 실패 (HTTP ${response.status})`);
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("사진 파일 형식이 아닙니다.");
  return { blob, filename: `${safeName(row.name)}_${safeName(row.student_code || row.id)}.${fileExtension(url, blob.type)}` };
}
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function visibleRows() {
  const keyword = search.value.trim().toLocaleLowerCase("ko");
  return students.filter(row => `${row.name} ${row.student_code || ""}`.toLocaleLowerCase("ko").includes(keyword));
}
function render() {
  const rows = visibleRows();
  results.replaceChildren();
  for (const row of rows) {
    const item = document.createElement("div");
    item.className = "photo-download-item";
    const img = document.createElement("img");
    img.src = verifiedPhotoURL(row.photo_url);
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    const name = document.createElement("span");
    name.textContent = row.name;
    const action = document.createElement("button");
    action.type = "button";
    action.textContent = "사진 저장";
    action.disabled = busy;
    action.addEventListener("click", async () => {
      if (busy) return;
      busy = true; action.disabled = true;
      try {
        const photo = await getPhoto(row);
        saveBlob(photo.blob, photo.filename);
        status.textContent = `${row.name} 사진을 저장했습니다.`;
      } catch (error) { status.textContent = error.message; }
      finally { busy = false; action.disabled = false; }
    });
    item.append(img, name, action);
    results.append(item);
  }
  status.textContent = `검색 결과 ${rows.length}명 · 사진 등록 ${students.length}명`;
  bulkButton.disabled = !rows.length || busy;
}
button?.addEventListener("click", async () => {
  try {
    await ownerOnly();
    status.textContent = "학생 사진 목록을 불러오는 중...";
    dialog.showModal();
    const { data, error } = await db.from("students").select("id,student_code,name,photo_url").order("name");
    if (error) throw error;
    students = (data || []).filter(row => row.photo_url);
    search.value = "";
    render();
  } catch (error) { status.textContent = error.message; }
});
document.getElementById("photoDownloadClose")?.addEventListener("click", () => dialog.close());
search?.addEventListener("input", render);
bulkButton?.addEventListener("click", async () => {
  if (busy) return;
  busy = true; bulkButton.disabled = true;
  const rows = visibleRows();
  let completed = 0;
  const failures = [];
  try {
    await ownerOnly();
    const { default: JSZip } = await import("https://esm.sh/jszip@3.10.1");
    const zip = new JSZip();
    for (const row of rows) {
      try {
        const photo = await getPhoto(row);
        zip.file(photo.filename, photo.blob);
        completed++;
      } catch (error) { failures.push(`${row.name}: ${error.message}`); }
      status.textContent = `사진 준비 중 ${completed + failures.length}/${rows.length}명`;
    }
    if (!completed) throw new Error("저장 가능한 사진이 없습니다. 저장소 접근 권한과 CORS 설정을 확인해 주세요.");
    const archive = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
    saveBlob(archive, `STAR_CLASS_학생사진_${new Date().toISOString().slice(0,10)}.zip`);
    status.textContent = `ZIP 저장: ${completed}명 성공${failures.length ? `, ${failures.length}명 실패 — ${failures.join("; ").slice(0,250)}` : ""}`;
  } catch (error) { status.textContent = error.message; }
  finally { busy = false; bulkButton.disabled = !visibleRows().length; }
});
