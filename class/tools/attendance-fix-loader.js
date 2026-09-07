const originalUrl = new URL('./tools.js?v=2611', import.meta.url);
const source = await fetch(originalUrl, { cache: 'no-store' }).then(r => {
  if (!r.ok) throw new Error(`TOOLS module load failed: ${r.status}`);
  return r.text();
});

const patched = source
  .replace(
    'function roster(){const ids=new Set(state.attendance.filter(a=>["present","late"].includes(a.status)).map(a=>a.student_id));return state.students.filter(s=>enrollment(s).class_period_id===state.period.id&&ids.has(s.id))}',
    'function roster(){const ids=new Set(state.attendance.filter(a=>["present","late"].includes(a.status)&&!a.checked_out_at).map(a=>a.student_id));return state.students.filter(s=>ids.has(s.id))}'
  )
  .replace(
    'db.from("attendance").select("student_id,status").eq("session_id",state.session.id)',
    'db.from("attendance").select("student_id,status,checked_out_at").eq("attendance_date",date())'
  );

const blob = new Blob([patched], { type: 'text/javascript' });
const url = URL.createObjectURL(blob);
try {
  await import(url);
} finally {
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
