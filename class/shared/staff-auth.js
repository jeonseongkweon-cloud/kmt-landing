export async function getStaffProfile(db){
  const {data,error}=await db.rpc('kmt_get_my_staff_profile');
  if(error) throw error;
  return Array.isArray(data)?(data[0]||null):data;
}
export async function requireStaff(db, permission){
  const {data:{session}}=await db.auth.getSession();
  if(!session) return {session:null,profile:null,allowed:false};
  const profile=await getStaffProfile(db);
  if(!profile||!profile.is_active) return {session,profile:null,allowed:false};
  if(!permission) return {session,profile,allowed:true};
  const {data,error}=await db.rpc('kmt_has_permission',{p_permission:permission});
  if(error) throw error;
  return {session,profile,allowed:Boolean(data)};
}
export const roleLabel=(role)=>({owner:'관장',master:'수석사범',instructor:'사범',assistant:'보조지도자'}[role]||role||'지도자');
