// 2026 회비대장 보조 컨트롤 v1.1
// 이름순/납부일순 전환 + 표에서 기준 납부일 변경(브라우저 임시저장)
(function(){
const DUE_KEY='kmt_tuition_ledger_due_edits_v1';
let dueEdits={}; try{dueEdits=JSON.parse(localStorage.getItem(DUE_KEY)||'{}')}catch{}
let sortMode='name';
const norm=s=>String(s||'').replace(/\s/g,'');
function rowName(tr){return norm(tr?.querySelector('.lg-name b')?.textContent)}
function dueOf(tr){
 const name=rowName(tr); if(dueEdits[name]) return +dueEdits[name];
 const t=tr?.querySelector('.lg-name span')?.textContent||''; return +(t.match(/(\d+)일/)||[])[1]||99;
}
function applyDue(tr){
 const name=rowName(tr), span=tr?.querySelector('.lg-name span');
 if(!span)return;
 if(dueEdits[name]) span.textContent=`납부일 ${dueEdits[name]}일`;
 span.dataset.dueEditable='1';
 span.title='클릭하여 기준 납부일 변경';
 span.style.cursor='pointer';
 span.style.textDecoration='underline';
 span.style.textUnderlineOffset='2px';
}
function renumber(){
 const body=document.getElementById('ledgerGridBody'); if(!body)return;
 [...body.querySelectorAll('tr')].forEach((r,i)=>{const no=r.querySelector('.lg-no');if(no)no.textContent=i+1;});
}
function sortCurrent(){
 const body=document.getElementById('ledgerGridBody'); if(!body)return;
 const rows=[...body.querySelectorAll('tr')];
 rows.sort((a,b)=> sortMode==='due' ? (dueOf(a)-dueOf(b) || rowName(a).localeCompare(rowName(b),'ko')) : rowName(a).localeCompare(rowName(b),'ko'));
 rows.forEach(r=>{body.appendChild(r);applyDue(r)});
 renumber();
 document.querySelectorAll('[data-ledger-sort]').forEach(b=>b.classList.toggle('primary',b.dataset.ledgerSort===sortMode));
}
function editDue(tr){
 if(!tr)return;
 const label=tr.querySelector('.lg-name b')?.textContent||'해당 가정';
 const old=dueOf(tr);
 const val=prompt(`${label} 기준 납부일 변경\n1~31 사이 숫자를 입력하세요.\n변경된 날짜는 다음 달에도 계속 적용됩니다.`,old===99?'':old);
 if(val===null)return;
 const day=Number(val);
 if(!Number.isInteger(day)||day<1||day>31){alert('납부일은 1~31 사이 숫자로 입력해주세요.');return}
 dueEdits[rowName(tr)]=day;
 localStorage.setItem(DUE_KEY,JSON.stringify(dueEdits));
 applyDue(tr);
 if(sortMode==='due')sortCurrent();
}
function enhance(){
 const card=document.getElementById('ledgerGridCard'); if(!card)return;
 if(!document.getElementById('ledgerSortBar')){
  const head=card.querySelector('.ledger-head'); const bar=document.createElement('div'); bar.id='ledgerSortBar'; bar.className='toolbar'; bar.style.margin='0 16px 12px';
  bar.innerHTML='<strong style="align-self:center">보기:</strong><button class="btn primary" data-ledger-sort="name">가나다 이름순</button><button class="btn" data-ledger-sort="due">납부일순</button><span class="mini" style="align-self:center">이름 아래 밑줄 친 납부일을 클릭하면 기준 납부일 변경</span>';
  head.insertAdjacentElement('afterend',bar);
  bar.querySelectorAll('[data-ledger-sort]').forEach(b=>b.onclick=()=>{sortMode=b.dataset.ledgerSort;sortCurrent()});
 }
 card.querySelectorAll('#ledgerGridBody tr').forEach(applyDue);
 if(!card.dataset.dueDelegated){
  card.dataset.dueDelegated='1';
  card.addEventListener('click',e=>{
   const span=e.target.closest('.lg-name span[data-due-editable="1"]');
   if(!span||!card.contains(span))return;
   e.preventDefault();e.stopPropagation();
   editDue(span.closest('tr'));
  });
 }
 sortCurrent();
}
const obs=new MutationObserver(()=>setTimeout(enhance,20));
obs.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(enhance,150));else setTimeout(enhance,150);
})();
