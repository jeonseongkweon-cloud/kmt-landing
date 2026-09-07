const HANGUL_BASE=0xac00,HANGUL_END=0xd7a3;
const CHOSEONG=["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
const JUNGSEONG=["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
const JONGSEONG=["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];

export const AUTO_THRESHOLD=.84;
export const AMBIGUOUS_THRESHOLD=.76;
export const AUTO_MARGIN=.075;

export function compact(value){return String(value??"").normalize("NFC").toLowerCase().replace(/[^0-9a-z가-힣ㄱ-ㅎㅏ-ㅣ]/gi,"")}
export function decomposeHangul(value){
  return [...compact(value)].flatMap(char=>{
    const code=char.charCodeAt(0);if(code<HANGUL_BASE||code>HANGUL_END)return [char];
    const offset=code-HANGUL_BASE,cho=Math.floor(offset/588),jung=Math.floor(offset%588/28),jong=offset%28;
    return [CHOSEONG[cho],JUNGSEONG[jung],JONGSEONG[jong]].filter(Boolean)
  }).join("")
}
export function levenshtein(a,b){
  a=String(a??"");b=String(b??"");const row=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){let diagonal=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,diagonal+(a[i-1]===b[j-1]?0:1));diagonal=old}}
  return row[b.length]
}
function similarity(a,b){a=String(a??"");b=String(b??"");return 1-levenshtein(a,b)/Math.max(a.length,b.length,1)}
function commonPrefix(a,b){let i=0;while(i<a.length&&i<b.length&&a[i]===b[i])i++;return i/Math.max(a.length,b.length,1)}
function namesFor(student){return [student?.name,...(student?.kmt_student_voice_aliases||[]).map(x=>x?.alias)].map(compact).filter(Boolean)}
function nameScore(spoken,registered){
  if(spoken===registered)return 1;
  if(spoken.length>=2&&(registered.endsWith(spoken)||spoken.endsWith(registered)))return .93;
  const syllable=similarity(spoken,registered),jamo=similarity(decomposeHangul(spoken),decomposeHangul(registered));
  const surname=spoken[0]&&spoken[0]===registered[0]?1:0,prefix=commonPrefix(spoken,registered),length=spoken.length===registered.length?1:0;
  return Math.min(.99,syllable*.25+jamo*.55+surname*.08+prefix*.06+length*.04)
}
export function extractNamePhrase(transcript,commandTerms=[]){
  let value=compact(transcript);
  const wake=["계명아","개명아","계명이야","개명이야","계명하","개명하","계명","개명"].map(compact).sort((a,b)=>b.length-a.length).find(x=>value.startsWith(x));
  if(wake)value=value.slice(wake.length);
  for(const term of [...commandTerms].map(compact).filter(Boolean).sort((a,b)=>b.length-a.length)){if(value.endsWith(term)){value=value.slice(0,-term.length);break}}
  return value.replace(/^(학생|원생)/,"").replace(/(학생|원생|에게|한테|이한테|께)$/,"").trim()
}
export function resolveStudentName({alternatives,students,preferredStudentIds=[],commandTerms=[]}){
  const phrases=(alternatives||[]).map(extract=>extractNamePhrase(extract,commandTerms)).filter(Boolean);
  const preferred=new Set((preferredStudentIds||[]).map(String));
  const ranked=(students||[]).map(student=>{
    let best={score:0,spoken:"",alternativeIndex:-1,matchedName:""};
    namesFor(student).forEach((registered,nameIndex)=>phrases.forEach((spoken,alternativeIndex)=>{
      let score=nameScore(spoken,registered)-(alternativeIndex*.012)+(preferred.has(String(student.id))?.045:0);
      if(nameIndex>0&&spoken===registered)score=.995-(alternativeIndex*.012)+(preferred.has(String(student.id))?.045:0);
      if(score>best.score)best={score:Math.min(1,score),spoken,alternativeIndex,matchedName:registered}
    }));
    return {student,...best}
  }).sort((a,b)=>b.score-a.score);
  const best=ranked[0],second=ranked[1],margin=best?best.score-(second?.score||0):0;
  if(!best||best.score<AMBIGUOUS_THRESHOLD)return {level:"NONE",student:null,candidates:ranked.slice(0,3),margin,phrases};
  const exact=best.score>=.99;
  if((exact&&!second?.score)||(best.score>=AUTO_THRESHOLD&&margin>=AUTO_MARGIN))return {level:exact?"A":"B",student:best.student,candidates:ranked.slice(0,3),margin,phrases};
  const candidates=ranked.filter(x=>x.score>=AMBIGUOUS_THRESHOLD&&best.score-x.score<=.12).slice(0,3);
  return candidates.length>1?{level:"C",student:null,candidates,margin,phrases}:{level:"NONE",student:null,candidates:ranked.slice(0,3),margin,phrases}
}
