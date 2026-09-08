import assert from "node:assert/strict";
import {resolveMultiStudentNames} from "./smart-multi-star.js";

const student=(id,name,aliases=[])=>({id,name,kmt_student_voice_aliases:aliases.map((alias,i)=>({id:`a${i}`,alias}))});
const roster=[student(1,"박윤아"),student(2,"김성찬"),student(3,"아리아"),student(4,"이서준")];
const terms=["도전별","인사별","자세별","효도별","STAR","스타","별"];

let r=resolveMultiStudentNames({alternatives:["박윤아 김성찬 아리아 별"],students:roster,commandTerms:terms});
assert.deepEqual(r.students.map(x=>x.name),["박윤아","김성찬","아리아"]);

r=resolveMultiStudentNames({alternatives:["박윤하 김성찬 아리야 별"],students:roster,commandTerms:terms});
assert.deepEqual(r.students.map(x=>x.name),["박윤아","김성찬","아리아"]);

r=resolveMultiStudentNames({alternatives:["박윤아김성찬아리아 별"],students:roster,commandTerms:terms});
assert.deepEqual(r.students.map(x=>x.name),["박윤아","김성찬","아리아"]);

r=resolveMultiStudentNames({alternatives:["박윤아 별"],students:roster,commandTerms:terms});
assert.equal(r.students.length,0); // 1명은 기존 SMART NAME VOICE 경로가 처리한다.

r=resolveMultiStudentNames({alternatives:["박윤아 박윤아 김성찬 별"],students:roster,commandTerms:terms});
assert.deepEqual(r.students.map(x=>x.name),["박윤아","김성찬"]);

console.log("SMART MULTI STAR v1.0 tests: 5 passed");
