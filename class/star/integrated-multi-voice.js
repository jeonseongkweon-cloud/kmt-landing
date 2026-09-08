// SMART MULTI STAR v2.0 — integrated parser for the existing STAR microphone.
// Pure name resolution only. STAR storage/execution remains inside star.js.
import { compact, decomposeHangul, levenshtein } from "./smart-name-voice.js?v=101";

const COMMANDS=/(계명아|개명아|계명이야|개명이야|칭찬별|인사별|자세별|인성별|정리별|도전별|단정별|효도별|게임별|미션별|스타|별|그리고|하고|이랑|랑|과|와|및|또)/g;
const clean=v=>String(v??"").normalize("NFC").replace(/[.!?。,，、/]/g," ").replace(COMMANDS," ").replace(/\s+/g," ").trim();
const sim=(a,b)=>1-levenshtein(a,b)/Math.max(a.length,b.length,1);
function score(spoken,name){
  spoken=compact(spoken);name=compact(name);if(!spoken||!name)return 0;if(spoken===name)return 1;
  const syllable=sim(spoken,name),jamo=sim(decomposeHangul(spoken),decomposeHangul(name));
  const surname=spoken[0]===name[0]?1:0,length=spoken.length===name.length?1:0;
  return Math.min(.99,syllable*.28+jamo*.60+surname*.08+length*.04)
}
function namesFor(student){return [student.name,...(student.kmt_student_voice_aliases||[]).map(x=>x.alias)].map(compact).filter(Boolean)}
function exactRows(raw,students){
  const text=compact(clean(raw)),rows=[];
  for(const student of students){
    let best=null;
    for(const name of namesFor(student)){const index=text.indexOf(name);if(index<0)continue;const row={student,index,end:index+name.length,spoken:name,score:1};if(!best||row.index<best.index||row.index===best.index&&row.end>best.end)best=row}
    if(best)rows.push(best)
  }
  rows.sort((a,b)=>a.index-b.index||b.end-a.end);
  const out=[];
  for(const row of rows){if(out.some(x=>Math.max(x.index,row.index)<Math.min(x.end,row.end)))continue;out.push(row)}
  return out
}
function tokenRows(raw,students){
  const tokens=clean(raw).split(/\s+/).map(compact).filter(x=>x.length>=2),used=new Set(),out=[];
  for(const token of tokens){
    let best=null,second=null;
    for(const student of students){if(used.has(student.id))continue;let s=0;for(const name of namesFor(student))s=Math.max(s,score(token,name));const row={student,spoken:token,score:s};if(!best||s>best.score){second=best;best=row}else if(!second||s>second.score)second=row}
    if(best&&best.score>=.68&&best.score-(second?.score||0)>=.045){out.push(best);used.add(best.student.id)}
  }
  return out
}
function joinedRows(raw,students){
  const text=compact(clean(raw));if(text.length<4)return [];
  const memo=new Map();
  function walk(pos,used){
    if(pos>=text.length)return {rows:[],sum:0};
    const key=`${pos}|${[...used].map(String).sort().join(",")}`;if(memo.has(key))return memo.get(key);
    let best={rows:[],sum:-999};
    for(const student of students){
      if(used.has(student.id))continue;
      for(const registered of namesFor(student)){
        const len=registered.length;
        for(const take of [len-1,len,len+1].filter(x=>x>=2)){
          if(pos+take>text.length)continue;const spoken=text.slice(pos,pos+take),s=score(spoken,registered);if(s<.67)continue;
          const nextUsed=new Set(used);nextUsed.add(student.id);const next=walk(pos+take,nextUsed);const candidate={rows:[{student,spoken,score:s},...next.rows],sum:s+next.sum};
          if(candidate.rows.length>best.rows.length||candidate.rows.length===best.rows.length&&candidate.sum>best.sum)best=candidate
        }
      }
    }
    if(best.rows.length===0&&pos+1<text.length){const skip=walk(pos+1,used);if(skip.rows.length)best={rows:skip.rows,sum:skip.sum-.20}}
    memo.set(key,best);return best
  }
  return walk(0,new Set()).rows
}
function bestRows(raw,students){
  const sets=[exactRows(raw,students),tokenRows(raw,students),joinedRows(raw,students)];
  return sets.sort((a,b)=>b.length-a.length||b.reduce((s,x)=>s+(x.score||0),0)-a.reduce((s,x)=>s+(x.score||0),0))[0]
}
export function resolveIntegratedMultiVoice({alternatives=[],students=[]}={}){
  let best=[];
  for(const raw of alternatives){const rows=bestRows(raw,students);if(rows.length>best.length||rows.length===best.length&&rows.reduce((s,x)=>s+(x.score||0),0)>best.reduce((s,x)=>s+(x.score||0),0))best=rows}
  const seen=new Set();best=best.filter(x=>!seen.has(String(x.student.id))&&seen.add(String(x.student.id)));
  const obviousMulti=alternatives.some(raw=>{
    const text=clean(raw),tokens=text.split(/\s+/).filter(x=>x.length>=2);return tokens.length>=2||compact(text).length>=5;
  });
  return {students:best.map(x=>x.student),rows:best,obviousMulti};
}
