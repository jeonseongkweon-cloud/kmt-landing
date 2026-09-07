const originalUrl = new URL('./attendance.js?v=3201', import.meta.url);
const source = await fetch(originalUrl, { cache: 'no-store' }).then(r => {
  if (!r.ok) throw new Error(`Attendance module load failed: ${r.status}`);
  return r.text();
});
const patched = source.replace(
  'const SINGLE_OWNER_EMAIL="class-admin@ipma.kr";',
  'const SINGLE_OWNER_EMAIL="jeonseongkweon@gmail.com";'
);
const blob = new Blob([patched], { type: 'text/javascript' });
const url = URL.createObjectURL(blob);
try {
  await import(url);
} finally {
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
