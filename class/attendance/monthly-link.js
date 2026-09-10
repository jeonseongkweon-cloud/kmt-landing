(()=>{
  const style=document.createElement("style");
  style.textContent=`.monthly-history-link{display:grid;place-items:center;min-height:38px;padding:7px 10px;border:1px solid rgba(87,176,224,.35);border-radius:9px;background:#eef8ff;color:#147ead;text-decoration:none;font-weight:800;font-size:13px;white-space:nowrap}.monthly-history-link:hover{background:#dff2ff}.monthly-history-link:focus-visible{outline:3px solid rgba(43,157,216,.3);outline-offset:2px}`;
  document.head.appendChild(style);

  function addLinks(){
    document.querySelectorAll(".student-card").forEach(card=>{
      if(card.querySelector(".monthly-history-link"))return;
      const studentId=card.dataset.student;
      const actions=card.querySelector(".quick-actions");
      if(!studentId||!actions)return;
      const link=document.createElement("a");
      link.className="monthly-history-link";
      const monthlyUrl=new URL("monthly-v2.html",location.href);
      monthlyUrl.searchParams.set("student",studentId);
      link.href=monthlyUrl.toString();
      link.textContent="📅 월간출석";
      link.setAttribute("aria-label","이 원생의 월간 출석내역 보기");
      link.addEventListener("click",e=>e.stopPropagation());
      actions.appendChild(link);
    });
  }

  const observer=new MutationObserver(addLinks);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",addLinks,{once:true});else addLinks();
})();
