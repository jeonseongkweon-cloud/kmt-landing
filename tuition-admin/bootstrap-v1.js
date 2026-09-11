import './tuition-master-v1.js?v=3';
import './attendance-ledger-auto-v1.js?v=1';
import { loadClassTuitionSource, buildOneStudentHouseholds } from './class-data-adapter-v1.js';

const confirmed={
  paused:new Set(['김태은','강민준','이준범']),
  withdrawn:new Set(['김예성','김예담','윤유은','윤우진','이승재']),
  dueDay:new Map([['김태은',28]]),
  extension:new Set(['김태은'])
};

const familyGroups=[
  ['김우리','김나라','김사랑'],['이해찬','이정빈'],['윤우준','윤이현'],['김도영','김도훈'],['김시율','김건하'],['백다현','백동훈'],['유강령','유가령'],['오승윤','오연서'],['박서우','박연우'],['박재희','박윤아'],['이수형','이주형'],['한정민','한지아'],['김예성','김예담'],['윤유은','윤우진']
];

const ledgerAliases=new Map([
  ['우,나,사',['김우리','김나라','김사랑']],['해찬,정빈',['이해찬','이정빈']],['윤우준,이현',['윤우준','윤이현']],['김예성,예담',['김예성','김예담']],['윤유은,우진',['윤유은','윤우진']],['한정민,지아',['한정민','한지아']],['김도영,도훈',['김도영','김도훈']],['김시율,건하',['김시율','김건하']],['백다현,동훈',['백다현','백동훈']],['유강령,가령',['유강령','유가령']],['오승윤,연서',['오승윤','오연서']],['박서우,연우',['박서우','박연우']],['박연우,서우',['박연우','박서우']],['박재희,윤아',['박재희','박윤아']],['이수형,주형',['이수형','이주형']],['이주형,수형',['이주형','이수형']]
]);

const excludedTuitionStudents=new Set(['아리아']);
const latestRoster=window.KMT_TUITION_LATEST_ROSTER_2026||null;
const latestActiveNames=new Set(latestRoster?.activeStudents||[]);

function applyConfirmed(h){
  const names=h.students||[];
  if(names.some(n=>confirmed.withdrawn.has(n))) h.status='withdrawn';
  else if(names.some(n=>confirmed.paused.has(n))) h.status='paused';
  for(const n of names) if(confirmed.dueDay.has(n)) h.dueDay=confirmed.dueDay.get(n);
  h.extensionInProgress=names.some(n=>confirmed.extension.has(n));
  if(h.status==='paused') h.note=h.extensionInProgress?'휴원 중 · 납부일 연장 진행 중':'휴원 중';
  if(h.status==='withdrawn') h.note='퇴관 · 과거 회비자료 보존';
  return h;
}

function dedupeParents(items){
  const seen=new Set();
  return items.filter(p=>{const k=`${p.guardianId||''}|${p.phone||''}|${p.name||''}`;if(seen.has(k))return false;seen.add(k);return true;});
}

function mergeFamilies(rows){
  let list=rows.map(x=>({...x}));
  for(const group of familyGroups){
    const members=list.filter(h=>(h.students||[]).some(n=>group.includes(n)));
    if(members.length<2) continue;
    const ids=new Set(members.map(x=>x.id));
    const merged={
      ...members[0],
      id:`family-${group.join('-')}`,
      name:group.filter(n=>members.some(h=>(h.students||[]).includes(n))).join(' · '),
      students:[...new Set(members.flatMap(x=>x.students||[]))],
      classStudentIds:[...new Set(members.flatMap(x=>x.classStudentIds||[]))],
      studentCodes:[...new Set(members.flatMap(x=>x.studentCodes||[]))],
      parents:dedupeParents(members.flatMap(x=>x.parents||[])),
      payers:[...new Set(members.flatMap(x=>x.payers||[]))],
      dueDay:members.map(x=>x.dueDay).find(Boolean)??null,
      status:members.some(x=>x.status==='withdrawn')?'withdrawn':members.some(x=>x.status==='paused')?'paused':'active',
      payments:{},messages:[],dueHistory:[],source:'class-readonly-family'
    };
    list=list.filter(x=>!ids.has(x.id));
    list.push(merged);
  }
  return list;
}

function setBadge(kind,text){
  const el=document.getElementById('dataSourceBadge');
  if(!el)return;
  el.className=`source ${kind}`;
  el.textContent=text;
}

function ledgerNames(record){
  const alias=ledgerAliases.get(record.nameRaw);
  if(alias)return alias;
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
  if(!ledger.length)return households;
  return households.map(h=>{
    const students=h.students||[];
    const matches=ledger.filter(r=>ledgerNames(r).some(n=>students.includes(n)));
    if(!matches.length)return h;
    h.legacyLedger=matches;
    const baseNote=(h.note||'').trim();
    h.note=[baseNote,...matches.map(ledgerSummary)].filter(Boolean).join(' | ');
    return h;
  });
}

function makeRosterOnlyStudent(row){
  return {studentId:`latest-roster-${row.name}`,studentCode:'',name:row.name,tuitionStatus:'active',rawEnrollmentStatus:'최신 회비대장',statusChangedOn:null,monthlyFee:0,dueDay:row.dueDay??null,classPeriodId:null,classLabel:'최신 회비대장',guardians:[]};
}

(async()=>{
  try{
    const timeout=new Promise(resolve=>setTimeout(()=>resolve({ok:false,reason:'timeout',students:[]}),8000));
    const result=await Promise.race([loadClassTuitionSource(),timeout]);
    if(!result.ok){
      const text=result.reason==='no-session'?'샘플 데이터 · CLASS 로그인 필요':result.reason==='timeout'?'샘플 데이터 · CLASS 연결 시간초과':'샘플 데이터 · CLASS 연결 대기';
      setBadge('demo',text);
      return;
    }

    // 출석부와 동일하게 현재 '재원' 상태를 실시간 기준으로 삼는다.
    // 과거에 별도로 확정한 휴원/퇴관 학생은 자료 보존을 위해 함께 유지한다.
    const allClass=(result.students||[]).filter(s=>!excludedTuitionStudents.has(s.name));
    const attendanceStudents=allClass.filter(s=>s.rawEnrollmentStatus==='재원');
    const specialStudents=allClass.filter(s=>confirmed.paused.has(s.name)||confirmed.withdrawn.has(s.name));
    const classStudents=[...new Map([...attendanceStudents,...specialStudents].map(s=>[s.studentId,s])).values()];

    const classNameSet=new Set(classStudents.map(s=>s.name));
    const rosterOnly=(latestRoster?.rosterOnlyNotClass||[])
      .filter(r=>latestActiveNames.has(r.name)&&!classNameSet.has(r.name))
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

    // 메인 1~12월 회비대장에도 출석부 신규 원생을 자동 보완한다.
    window.dispatchEvent(new CustomEvent('kmt:tuition-households',{
      detail:{
        households,
        attendanceNames:attendanceStudents.map(s=>s.name),
        attendanceCount:attendanceStudents.length
      }
    }));

    const ledgerCount=households.filter(h=>(h.legacyLedger||[]).length).length;
    const autoCount=households.filter(h=>h.status==='active'&&!(h.legacyLedger||[]).length&&(h.students||[]).some(n=>attendanceStudents.some(s=>s.name===n))).length;
    setBadge('live',`CLASS·출석 자동연동 · 재원 ${attendanceStudents.length}명 · 회비대장 기존 ${ledgerCount}가정${autoCount?` · 자동추가 ${autoCount}가정`:''}`);
  }catch(err){
    console.error('[TUITION] CLASS live load failed',err);
    setBadge('demo','샘플 데이터 · CLASS 연결 오류');
  }
})();
