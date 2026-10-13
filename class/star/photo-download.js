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
async function toJPEG(source) {
  // Decode through the browser so EXIF orientation is applied before drawing.
  const objectURL = URL.createObjectURL(source);
  const image = new Image();
  const canvas = document.createElement("canvas");
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("사진을 해석하지 못했습니다. 브라우저가 지원하는 이미지인지 확인해 주세요."));
      image.src = objectURL;
    });
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    if (!canvas.width || !canvas.height) throw new Error("사진 해상도를 확인할 수 없습니다.");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이 브라우저에서 JPG 변환을 지원하지 않습니다.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    const jpeg = await new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("JPG 변환 실패: 사진 크기 또는 브라우저 메모리를 확인해 주세요.")), "image/jpeg", 0.92);
    });
    const signature = new Uint8Array(await jpeg.slice(0, 3).arrayBuffer());
    if (jpeg.type !== "image/jpeg" || signature[0] !== 0xff || signature[1] !== 0xd8 || signature[2] !== 0xff) {
      throw new Error("JPG 변환 결과가 JPEG 형식이 아닙니다.");
    }
    return jpeg;
  } finally {
    image.onload = image.onerror = null;
    image.src = "";
    URL.revokeObjectURL(objectURL);
    // Release each decoded image/canvas before converting the next ZIP entry.
    canvas.width = canvas.height = 0;
  }
}
async function getPhoto(row) {
  await ownerOnly();
  const url = verifiedPhotoURL(row.photo_url);
  let response;
  try {
    response = await fetch(url, { mode: "cors", credentials: "omit", cache: "no-store" });
  } catch {
    throw new Error("사진 접근 실패: 네트워크 연결 또는 저장소 CORS 허용 설정을 확인해 주세요.");
  }
  if (!response.ok) throw new Error(`사진 다운로드 실패 (HTTP ${response.status})`);
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("사진 파일 형식이 아닙니다.");
  return { blob: await toJPEG(blob), filename: `${safeName(row.name)}_${safeName(row.student_code || row.id)}.jpg` };
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
  let jpegBytes = 0;
  const failures = [];
  try {
    await ownerOnly();
    const { default: JSZip } = await import("https://esm.sh/jszip@3.10.1");
    const zip = new JSZip();
    for (const row of rows) {
      try {
        const photo = await getPhoto(row);
        if (jpegBytes + photo.blob.size > 128 * 1024 * 1024) {
          throw new Error("ZIP 사진 용량이 128MB를 넘습니다. 이름 검색으로 나누어 저장해 주세요.");
        }
        zip.file(photo.filename, await photo.blob.arrayBuffer());
        jpegBytes += photo.blob.size;
        completed++;
      } catch (error) { failures.push(`${row.name}: ${error.message}`); }
      status.textContent = `사진 준비 중 ${completed + failures.length}/${rows.length}명`;
    }
    if (!completed) throw new Error("저장 가능한 사진이 없습니다. 저장소 접근 권한과 CORS 설정을 확인해 주세요.");
    const archive = await zip.generateAsync({ type: "blob", compression: "STORE", streamFiles: true });
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: config.timezone || "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    saveBlob(archive, `STAR_CLASS_학생사진_${date}.zip`);
    status.textContent = `ZIP 저장: ${completed}명 성공${failures.length ? `, ${failures.length}명 실패 — ${failures.join("; ").slice(0,250)}` : ""}`;
  } catch (error) { status.textContent = error.message; }
  finally { busy = false; bulkButton.disabled = !visibleRows().length; }
});
