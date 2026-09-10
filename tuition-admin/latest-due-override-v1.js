// 계명태권도 CLASS 회비관리 SYSTEM
// LATEST DUE DAY OVERRIDE v1.0
// 최신 수정 회비대장의 괄호 안 숫자를 기준 납부일로 우선 적용한다.
// Supabase 쓰기 없음. 화면에 전달되는 회비관리 가정 데이터만 보정한다.
(function(){
  const roster=window.KMT_TUITION_LATEST_ROSTER_2026||{};
  const dueMap=roster.dueDayByStudent||{};
  const original=window.KMT_TUITION_LOAD_HOUSEHOLDS;
  if(typeof original!=='function' || !dueMap) return;

  window.KMT_TUITION_LOAD_HOUSEHOLDS=function(rows){
    const next=(rows||[]).map(h=>{
      const names=h.students||[];
      const days=[...new Set(names.map(n=>Number(dueMap[n])).filter(n=>n>=1&&n<=31))];
      if(days.length===1){
        h={...h,dueDay:days[0],latestDueDaySource:roster.source||'최신 회비대장'};
      }else if(days.length>1){
        h={...h,latestDueDayConflict:days};
      }
      return h;
    });
    return original(next);
  };
})();
