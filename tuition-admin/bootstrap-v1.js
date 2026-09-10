import { loadClassTuitionSource, buildOneStudentHouseholds } from './class-data-adapter-v1.js';

const confirmed = {
  paused: new Set(['김태은','강민준','이준범']),
  withdrawn: new Set(['김예성','김예담','윤유은','윤우진','한정민','한지아','이승재']),
  dueDay: new Map([['김태은',28]]),
  extension: new Set(['김태은'])
};

const familyGroups = [
  ['김우리','김나라','김사랑'],
  ['이해찬','이정빈'],
  ['윤우준','윤이현'],
  ['김예성','김예담'],
  ['윤유은','윤우진'],
  ['한정민','한지아']
];

function applyConfirmed(h){
  const names=h.students||[];
  if(names.some(n=>confirmed.withdrawn.has(n))) h.status='withdrawn';
  else if(names.some(n=>confirmed.paused.has(n))) h.status='paused';
  for(const n of names){ if(confirmed.dueDay.has(n)) h.dueDay=confirmed.dueDay.get(n); }
  h.extensionInProgress=names.some(n=>confirmed.extension.has(n));
  if(h.status==='paused') h.note=h.extensionInProgress?'휴원 중 · 납부일 연장 진행 중':'휴원 중';
  if(h.status==='withdrawn') h.note='퇴관 · 과거 회비자료 보존';
  return h;
}

function mergeFamilies(rows){
  let list=rows.map(x=>({...x}));
  for(const group of familyGroups){
    const members=list.filter(h=>h.students.some(n=>group.includes(n)));
    if(members.length<2) continue;
    const ids=new Set(members.map(x=>x.id));
    const merged={
      ...members[0],
      id:`family-${group.join('-')}`,
      name:group.filter(n=>members.some(h=>h.students.includes(n))).join(' · '),
      students:[...new Set(members.flatMap(x=>x.students))],
      classStudentIds:[...new Set(members.flatMap(x=>x.classStudentIds||[]))],
      studentCodes:[...new Set(members.flatMap(x=>x.studentCodes||[]))],
      parents:dedupeParents(members.flatMap(x=>x.parents||[])),
      payers:[...new Set(members.flatMap(x=>x.payers||[]))],
      dueDay:members.map(x=>x.dueDay).find(Boolean) ?? null,
      status:members.some(x=>x.status==='withdrawn')?'withdrawn':members.some(x=>x.status==='paused')?'paused':'active',
      payments:{},messages:[],dueHistory:[],source:'class-readonly-family'
    };
    list=list.filter(x=>!ids.has(x.id));
    list.push(merged);
  }
  return list;
}
function dedupeParents(items){
  const seen=new Set();
  return items.filter(p=>{const k=`${p.guardianId||''}|${p.phone||''}|${p.name||''}`;if(seen.has(k))return false;seen.add(k);return true;});
}
function setBadge(kind,text){
  const el=document.getElementById('dataSourceBadge');
  if(!el)return; el.className=`source ${kind}`; el.textContent=text;
}

(async()=>{
  try{
    const result=await loadClassTuitionSource();
    if(!result.ok){
      setBadge('demo',result.reason==='no-session'?'샘플 데이터 · CLASS 로그인 필요':'샘플 데이터 · CLASS 연결 대기');
      return;
    }
    let households=buildOneStudentHouseholds(result.students).map(applyConfirmed);
    households=mergeFamilies(households).map(applyConfirmed);
    if(typeof window.KMT_TUITION_LOAD_HOUSEHOLDS!=='function'){
      setBadge('demo','샘플 데이터 · 화면 연결 대기');
      return;
    }
    window.KMT_TUITION_LOAD_HOUSEHOLDS(households);
    setBadge('live',`CLASS 실데이터 읽기전용 · ${result.students.length}명`);
  }catch(err){
    console.error('[TUITION] CLASS readonly load failed',err);
    setBadge('demo','샘플 데이터 · CLASS 연결 오류');
  }
})();
