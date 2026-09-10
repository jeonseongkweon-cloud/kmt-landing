// 계명태권도 CLASS 회비관리 SYSTEM
// DB COMPAT v1.1 — 단일 Supabase 엔진 사용
// tuition-master-v1.js가 유일한 초기 로드/동기화 엔진이다.
// 이 파일은 기존 KMTTuitionDB 호출부와의 호환만 제공하며,
// 페이지 진입 시 별도의 Supabase client 생성/원격 pull/ledger refresh를 하지 않는다.
(function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=s=>String(s||'').replace(/\s/g,'');

  async function master(){
    for(let i=0;i<80;i++){
      if(window.KMTTuitionMaster) return window.KMTTuitionMaster;
      await sleep(50);
    }
    return null;
  }

  function findRow(students,display){
    const target=norm(students||display);
    return [...document.querySelectorAll('#ledgerGridCard tbody tr')].find(row=>{
      const rs=norm(row.dataset.students||'');
      const name=norm(row.querySelector('.lg-name b')?.textContent||'');
      return rs===target || name===target || (target && (rs.includes(target)||target.includes(rs)));
    }) || null;
  }

  async function init(){
    const m=await master();
    const result={ok:Boolean(m?.ok),reason:m?.state||'master-unavailable',mode:'single-master'};
    window.dispatchEvent(new CustomEvent('kmt-tuition-db-ready',{detail:result}));
    return result;
  }

  async function saveDue(payload={}){
    const m=await master();
    if(!m?.ok || typeof m.saveDue!=='function') throw new Error('회비 중앙DB가 준비되지 않았습니다.');
    const row=findRow(payload.students,payload.display);
    const householdKey=row?.dataset.householdKey || norm(payload.students||payload.display);
    const ok=await m.saveDue({
      row,
      householdKey,
      displayName:payload.display || row?.querySelector('.lg-name b')?.textContent?.trim() || householdKey,
      studentsCsv:payload.students || row?.dataset.students || '',
      day:Number(payload.dueDay),
      reason:payload.reason||'',
      memo:payload.memo||''
    });
    if(!ok) throw new Error('납부일 중앙DB 저장 실패');
    return {ok:true};
  }

  async function saveMonth(payload={}){
    const m=await master();
    if(!m?.ok || typeof m.saveMonth!=='function') throw new Error('회비 중앙DB가 준비되지 않았습니다.');
    const row=findRow(payload.students,payload.display);
    const month=Math.max(1,Math.min(12,Number(payload.month)||1));
    const ok=await m.saveMonth({
      row,
      householdKey:row?.dataset.householdKey || norm(payload.students||payload.display),
      displayName:payload.display || row?.querySelector('.lg-name b')?.textContent?.trim() || '',
      studentsCsv:payload.students || row?.dataset.students || '',
      originalMonth:month-1,
      appliedMonth:month-1,
      paidOn:payload.paidOn||'',
      amount:payload.amountText||'',
      amountText:payload.amountText||'',
      method:payload.method||'',
      status:payload.status||'미확인',
      memo:payload.memo||'',
      entryText:''
    });
    if(!ok) throw new Error('월 회비 중앙DB 저장 실패');
    return {ok:true};
  }

  async function loadRemoteToLocal(){
    const m=await master();
    if(!m?.ok || typeof m.reload!=='function') return {ok:false,reason:'master-unavailable'};
    const ok=await m.reload();
    return {ok:Boolean(ok),mode:'manual-master-reload'};
  }

  window.KMTTuitionDB={init,saveDue,saveMonth,loadRemoteToLocal};
  // 중요: 여기서는 init()을 자동 실행하지 않는다.
  // bootstrap의 tuition-master-v1.js 초기화와 중복 원격 pull이 겹쳐
  // 약 1~2초 뒤 ledger refresh가 연쇄 발생하던 경로를 차단한다.
})();
