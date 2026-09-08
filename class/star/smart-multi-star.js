import {resolveStudentName,compact,decomposeHangul,levenshtein} from "./smart-name-voice.js?v=100";

// SMART MULTI STAR v1.0.1
// 여러 학생 이름을 한 문장에서 찾되 후보는 호출자가 전달한 현재 출석자만 사용한다.
// v1.0.1: 음성 문장에 실제 출석자 이름/alias가 2개 이상 직접 포함되면
// 기존 1인 후보 선택으로 내려가기 전에 다중 학생으로 우선 확정한다.

function similarity(a,b){
  a=String(a??"");b=String(b??"");
  return 1-levenshtein(a,b)/Math.max(a.length,b.length,1)
}
function localNameScore(spoken,registered){
  spoken=compact(spoken);registered=compact(registered);
  if(!spoken||!registered)return 0;
  if(spoken===registered)return 1;
  const syllable=similarity(spoken,registered);
  const jamo=similarity(decomposeHangul(spoken),decomposeHangul(registered));
  const surname=spoken[0]&&spoken[0]===registered[0]?.toLowerCase()?1:0;
  const length=spoken.length===registered.length?1:0;
  return Math.min(.99,syllable*.30+jamo*.58+surname*.08+length*.04)
}
function namesFor(student){
  return [student?.name,...(student?.kmt_student_voice_aliases||[]).map(x=>x?.alias)].map(compact).filter(Boolean)
}
function escapeRegExp(value){return String(value).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}
function stripCommand(raw,commandTerms=[]){
  let value=String(raw??"").normalize("NFC").trim();
  value=value.replace(/^[\s,，、]*(계명아|개명아|계명이야|개명이야|계명하|개명하|계명|개명)[\s,，、]*/i,"");
  const terms=[...commandTerms].filter(Boolean).sort((a,b)=>String(b).length-String(a).length);
  for(const term of terms){
    const re=new RegExp(`${escapeRegExp(term)}\\s*$`,"i");
    if(re.test(value)){value=value.replace(re,"");break}
  }
  return value.replace(/[.!?。]/g,"").trim()
}
function tokenise(raw){
  return String(raw??"")
    .replace(/[，、,/]+/g," ")
    .replace(/그리고|및|또/g," ")
    .split(/\s+/)
    .map(x=>x.replace(/(에게|한테|이한테|께|하고|이랑|랑|과|와)$/,""))
    .map(x=>x.trim()).filter(Boolean)
}
function resolveExactContained(raw,students){
  const text=compact(raw);if(!text)return [];
  const hits=[];
  for(const student of students){
    let best=null;
    for(const name of namesFor(student)){
      if(name.length<2)continue;
      const index=text.indexOf(name);
      if(index<0)continue;
      const row={student,score:1,spoken:name,index,len:name.length,registered:name};
      if(!best||row.len>best.len||row.index<best.index)best=row
    }
    if(best)hits.push(best)
  }
  hits.sort((a,b)=>a.index-b.index||b.len-a.len);
  const out=[];let end=-1;
  for(const hit of hits){
    if(hit.index<end)continue;
    out.push(hit);end=hit.index+hit.len
  }
  return out
}
function resolveTokens(tokens,students){
  const out=[];const used=new Set();
  for(const token of tokens){
    const remaining=students.filter(s=>!used.has(String(s.id)));
    if(!remaining.length)break;
    const r=resolveStudentName({alternatives:[token],students:remaining,preferredStudentIds:remaining.map(s=>s.id),commandTerms:[]});
    if(!r.student||r.level==="C")continue;
    out.push({student:r.student,score:r.candidates?.[0]?.score||1,spoken:token});used.add(String(r.student.id))
  }
  return out
}
function resolveJoined(raw,students){
  const text=compact(raw);if(text.length<4)return [];
  const out=[];const used=new Set();let pos=0,guard=0;
  while(pos<text.length&&guard++<12){
    let best=null,second=null;
    for(const student of students){
      if(used.has(String(student.id)))continue;
      for(const registered of namesFor(student)){
        const min=Math.max(2,registered.length-1),max=Math.min(text.length-pos,registered.length+1);
        for(let len=min;len<=max;len++){
          const spoken=text.slice(pos,pos+len),score=localNameScore(spoken,registered);
          const row={student,score,spoken,len,registered};
          if(!best||score>best.score){second=best;best=row}else if(!second||score>second.score)second=row
        }
      }
    }
    const margin=(best?.score||0)-(second?.score||0);
    if(!best||best.score<.66||margin<.055)break;
    out.push(best);used.add(String(best.student.id));pos+=best.len
  }
  return pos===text.length?out:[]
}
function uniqueRows(rows){
  const seen=new Set();return (rows||[]).filter(row=>{const id=String(row?.student?.id||"");if(!id||seen.has(id))return false;seen.add(id);return true})
}
export function resolveMultiStudentNames({alternatives=[],students=[],commandTerms=[]}={}){
  const roster=students||[];let best={students:[],rows:[],source:"",score:0};
  for(const raw of alternatives||[]){
    const nameArea=stripCommand(raw,commandTerms);if(!nameArea)continue;
    let rows=resolveExactContained(nameArea,roster);
    if(rows.length<2){
      const tokens=tokenise(nameArea);
      rows=tokens.length>1?resolveTokens(tokens,roster):[];
      if(rows.length<2)rows=resolveJoined(nameArea,roster)
    }
    rows=uniqueRows(rows);
    const score=rows.length?rows.reduce((sum,x)=>sum+(x.score||0),0)/rows.length:0;
    if(rows.length>best.students.length||(rows.length===best.students.length&&score>best.score)){
      best={students:rows.map(x=>x.student),rows,source:nameArea,score}
    }
  }
  return best
}
