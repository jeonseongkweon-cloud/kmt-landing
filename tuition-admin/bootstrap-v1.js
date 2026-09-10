import './tuition-master-v1.js';
import { loadClassTuitionSource, buildOneStudentHouseholds } from './class-data-adapter-v1.js';

const confirmed = {
  paused: new Set(['김태은','강민준','이준범']),
  // 과거 퇴관자료는 보존하되 최신 회비대장의 비회색 수련생이 우선한다.
  withdrawn: new Set(['김예성','김예담','윤유은','윤우진','이승재']),
  dueDay: new Map([['김태은',28]]),
  extension: new Set(['김태은'])
};

// 회비대장은 학생 수가 아니라 '가정' 단위로 관리한다.
const familyGroups = [
  ['김우리','김나라','김사랑'],
  ['이해찬','이정빈'],
  ['윤우준','윤이현'],
  ['김도영','김도훈'],
  ['김시율','김건하'],
  ['백다현','백동훈'],
  ['유강령','유가령'],
  ['오승윤','오연서'],
  ['박서우','박연우'],
  ['박재희','박윤아'],
  ['이수형','이주형'],
  ['한정민','한지아'],
  ['김예성','김예담'],
  ['윤유은','윤우진']
];

const ledgerAliases = new Map([
  ['우,나,사',['김우리','김나라','김사랑']],
  ['해찬,정빈',['이해찬','이정빈']],
  ['윤우준,이현',['윤우준','윤이현']],
  ['김예성,예담',['김예성','김예담']],
  ['윤유은,우진',['윤유은','윤우진']],
  ['한정민,지아',['한정민','한지아']],
  ['김도영,도훈',['김도영','김도훈']],
  ['김시율,건하',['김시율','김건하']],
  ['백다현,동훈',['백다현','백동훈']],
  ['유강령,가령',['유강령','유가령']],
  ['오승윤,연서',['오승윤','오연서']],
  ['박서우,연우',['박서우','박연우']],
  ['박연우,서우',['박연우','박서우']],
  ['박재희,윤아',['박재희','박윤아']],
  ['이수형,주형',['이수형','이주형']],
  ['이주형,수형',['이주형','이수형']]
]);

// 테스트를 위해 만든 가상 원생. CLASS에는 남겨두되 회비 대상에서는 완전히 제외한다.
const excludedTuitionStudents = new Set(['아리아']);
const latestRoster = window.KMT_TUITION_LATEST_ROSTER_2026 || null;
const latestActiveNames = new Set(latestRoster?.activeStudents || []);

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
function ledgerNames(record){
  const alias=ledgerAliases.get(record.nameRaw);
  if(alias) return alias;
  return String(record.nameRaw||'').split(',').map(x=>x.trim()).filter(Boolean);
}
function ledgerSummary(record){
  const entries=Object.entries(record.months||{}).map(([month,v])=>{
    const m=Number(month.slice(5));
    const amount=v.amount?` ${new Intl.NumberFormat('ko-KR').format(v.amount)}원`:'';
    return `${m}월 ${v.entry||'기록'}${amount}`;
  });
  return `2026 장부원본 · 기준일 ${record.dueDay||'-'}일${entries.length?' · '+entries.join(' · '):' · 월별 기록 없음'}`;
}
function attachLegacyLedger(households){
  const ledger=Array.isArray(window.KMT_LEGACY_LEDGER_2026)?window.KMT_LEGACY_LEDGER_2026:[];
  if(!ledger.length) return households;
  return households.map(h=>{
    const students=h.students||[];
    const matches=ledger.filter(r=>ledgerNames(r).some(n=>students.includes(n)));
    if(!matches.length) return h;
    h.legacyLedger=matches;
    const summaries=matches.map(ledgerSummary);
    const baseNote=(h.note||'').trim();
    h.note=[baseNote,...summaries].filter(Boolean).join(' | ');
    return h;
  });
}
function makeRosterOnlyStudent(row){
  return {
    studentId:`latest-roster-${row.name}`,
    studentCode:'',
    name:row.name,
    tuitionStatus:'active',
    rawEnrollmentStatus:'최신 회비대장',
    statusChangedOn:null,
    monthlyFee:0,
    dueDay:row.dueDay ?? null,
    classPeriodId:null,
    classLabel:'최신 회비대장',
    guardians:[]
  };
}

(async()=>{
  try{
    const result=await loadClassTuitionSource();
    if(!result.ok){
      setBadge('demo',result.reason==='no-session'?'샘플 데이터 · CLASS 로그인 필요':'샘플 데이터 · CLASS 연결 대기');
      return;
    }

    const classStudents=(result.students||[]).filter(s=>{
      if(excludedTuitionStudents.has(s.name)) return false;
      if(latestActiveNames.size && !latestActiveNames.has(s.name)) return false;
      return true;
    });
    const classNameSet=new Set(classStudents.map(s=>s.name));
    const rosterOnly=(latestRoster?.rosterOnlyNotClass||[])
      .filter(r=>latestActiveNames.has(r.name) && !classNameSet.has(r.name))
      .map(makeRosterOnlyStudent);
    const tuitionStudents=[...classStudents,...rosterOnly];

    let households=buildOneStudentHouseholds(tuitionStudents).map(applyConfirmed);
    households=mergeFamilies(households).map(applyConfirmed);
    households=attachLegacyLedger(households);
    if(typeof window.KMT_TUITION_LOAD_HOUSEHOLDS!=='function'){
      setBadge('demo','샘플 데이터 · 화면 연결 대기');
      return;
    }
    window.KMT_TUITION_LOAD_HOUSEHOLDS(households);
    const ledgerCount=households.filter(h=>(h.legacyLedger||[]).length).length;
    if(latestActiveNames.size){
      setBadge('live',`최신 회비대장 기준 · ${tuitionStudents.length}명 · CLASS연결 ${classStudents.length}명 · 장부연결 ${ledgerCount}가정${rosterOnly.length?` · 명단보조 ${rosterOnly.length}명`:''}`);
    }else{
      const excludedCount=(result.students||[]).length-tuitionStudents.length;
      const excludedText=excludedCount?` · 가상원생 제외 ${excludedCount}명`:'';
      setBadge('live',`CLASS 실데이터 읽기전용 · ${tuitionStudents.length}명 · 장부연결 ${ledgerCount}가정${excludedText}`);
    }
  }catch(err){
    console.error('[TUITION] CLASS readonly load failed',err);
    setBadge('demo','샘플 데이터 · CLASS 연결 오류');
  }
})();
