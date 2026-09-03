const cfg=window.KMT_STAR_CONFIG;
const MAP={CARE:"care_friend",CLEANUP:"tidy",CHALLENGE:"exercise_challenge"};
async function token(db){const {data}=await db.auth.getSession();return data?.session?.access_token||""}
async function post(db,body){
  if(!cfg?.globalSparkConnectorUrl)return {skipped:true};
  const access=await token(db);if(!access)return {skipped:true,reason:"NO_CLASS_SESSION"};
  const r=await fetch(cfg.globalSparkConnectorUrl,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${access}`},body:JSON.stringify({...body,center_code:cfg.globalSparkCenterCode||"KMT-000001"})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`SPARK ${r.status}`);return j;
}
function safeStudent(s){return {source_member_id:String(s.id),student_code:String(s.student_code||""),display_name:String(s.name||""),photo_url:String(s.photo_url||"")||null,active:true}}
export async function syncSparkRoster({db,students}){return post(db,{action:"sync_roster",students:(students||[]).map(safeStudent)})}
export async function syncSparkAward({db,student,category,event}){
  const activity_type=MAP[String(category?.code||"").toUpperCase()];
  if(!activity_type)return {skipped:true,reason:"CATEGORY_NOT_SPARK"};
  return post(db,{action:"award",student:safeStudent(student),star_event_id:String(event.id),category_code:String(category.code),activity_type,awarded_at:event.awarded_at||new Date().toISOString()});
}
export async function syncSparkUndo({db,event}){return post(db,{action:"undo",star_event_id:String(event.id)})}
