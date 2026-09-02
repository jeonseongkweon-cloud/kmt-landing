(function(){
  'use strict';
  const VERSION='1.4.0';
  const SEOUL_TZ='Asia/Seoul';
  const meetingDate=new Date('2026-09-04T00:00:00+09:00');

  const panels={
    briefing:{eyebrow:'MORNING BRIEFING',title:'출근 브리핑',foot:'오늘 · 주간 · 월간 화면에서 같은 업무 흐름을 이어봅니다.',rows:[['오늘 주요 일정','서울 전략회의 준비를 첫 PROJECT 기준으로 관리합니다.','확인'],['이번 주 핵심','AI 사무국 HOME 기반을 확립하고 일정 → TASK → PROJECT 순으로 확장합니다.','진행'],['기존 시스템 보호','GMS · IDP · SPARK · 인증 · Supabase · Realtime은 이번 단계에서 수정하지 않습니다.','보호'],['AI 사무국 제안','새 기능을 만들기 전에 기존 기능과 데이터 연결을 먼저 확인합니다.','원칙']]},
    today:{eyebrow:'TODAY',title:'오늘',foot:'오늘 화면은 일정 · 업무 · 준비사항을 한곳에 모으는 3차 업무판입니다.',rows:[['가장 중요한 일','서울 전략회의 준비','우선'],['다음 중요 일정','2026년 9월 4일 국제드론순찰대 서울 전략회의','D-DAY'],['오늘의 운영','등록된 일정/TASK 저장 기능 연결 전까지 임의 업무를 생성하지 않습니다.','안전'],['확인할 것','다음 단계에서 기존 일정 기능 존재 여부를 조사한 뒤 연결합니다.','NEXT']]},
    week:{eyebrow:'THIS WEEK',title:'이번 주',foot:'주간 화면은 핵심목표 · 마감 · 프로젝트 진행 흐름을 연결하기 위한 기반입니다.',rows:[['주간 핵심목표','AI 사무국 HOME의 업무운영 기반 확립','핵심'],['개발 흐름','오늘/주간/월간 → 일정/D-Day → TASK → PROJECT','순서'],['첫 실전 적용','서울 전략회의 준비를 PROJECT 테스트 사례로 사용','PROJECT'],['보호영역','인증 · Supabase · RLS · Realtime · GMS · IDP · SPARK','보호']]},
    month:{eyebrow:'THIS MONTH',title:'이번 달',foot:'월간 화면은 주요행사 · 프로젝트 · D-Day · 조직별 핵심업무를 연결하는 상위 보드입니다.',rows:[['월간 중심','중요 일정 · PROJECT · D-Day를 한 화면에서 확인','목표'],['첫 PROJECT','국제드론순찰대 서울 전략회의','실전'],['연결 준비','PROJECT · 회의 · 자료 · 아리아 브리핑 구조 준비','연결'],['데이터 원칙','기존 데이터가 있으면 재사용하고 없을 때만 최소 확장','원칙']]},
    schedule:{eyebrow:'SCHEDULE',title:'일정',foot:'4차 일정 화면은 현재 확인된 일정만 읽기 중심으로 표시합니다. 일정 DB 생성·수정은 하지 않습니다.',rows:[['오늘','2026년 9월 2일 · AI 사무국 일정/D-Day 기반 구축','진행'],['다음 일정','2026년 9월 4일 국제드론순찰대 서울 전략회의','중요'],['연결 원칙','일정 → D-Day → TASK → PROJECT 순으로 연결합니다.','연결'],['데이터 원칙','기존 일정 기능이 없으므로 이번 단계에서는 UI/읽기 구조만 구축합니다.','보호']]},
    dday:{eyebrow:'D-DAY',title:'D-Day',foot:'D-Day는 Asia/Seoul 날짜 기준으로 자동 계산하며 첫 실전 PROJECT 일정과 연결됩니다.',rows:[['기준 일정','국제드론순찰대 서울 전략회의','PROJECT'],['목표일','2026년 9월 4일','DATE'],['계산 기준','Asia/Seoul 자정 기준 날짜 차이','자동'],['연결 예정','향후 일정 데이터의 중요일정을 D-Day 카드에 자동 반영','NEXT']]},
    task:{eyebrow:'TASK',title:'TASK 업무관리',foot:'5차 TASK는 AI OFFICE 전용 localStorage에 저장하며 기존 Supabase/GMS에는 쓰지 않습니다.',rows:[['구조','해야 할 일 · 마감 · 중요도 · 완료/미완료','운영'],['연결','TASK마다 관련 PROJECT를 지정할 수 있습니다.','PROJECT'],['미완료','완료되지 않은 TASK는 자동 삭제하지 않습니다.','유지'],['저장','현재 브라우저의 AI OFFICE 전용 localStorage만 사용','안전']]},
    project:{eyebrow:'PROJECT',title:'PROJECT 업무관리',foot:'6차 PROJECT는 AI OFFICE 전용 localStorage에서 동작하며 기존 TASK를 프로젝트 단위로 연결합니다.',rows:[['첫 PROJECT','국제드론순찰대 서울 전략회의','실전'],['연결','목적 · 일정 · 참석자 · TASK · 자료','운영'],['프로젝트 기록','결정사항 · 미결사항 · 후속업무를 한 프로젝트에 보존','기록'],['진행률','연결 TASK의 완료율을 기준으로 자동 계산','자동']]},
    meeting:{eyebrow:'MEETING',title:'회의관리',foot:'7차 회의관리는 AI OFFICE 전용 localStorage에서 동작하며 PROJECT와 연결합니다.',rows:[['회의 전','목적 · 참석자 · 안건 · 자료 · 질문 · 결정 필요사항','준비'],['회의 후','결정사항 · 미결사항 · 담당 · 후속업무 · 다음회의','기록'],['PROJECT 연결','회의 결과를 서울 전략회의 PROJECT 기록으로 반영할 수 있습니다.','연결'],['저장','현재 브라우저의 AI OFFICE 전용 localStorage만 사용','안전']]},
    library:{eyebrow:'RESOURCE',title:'자료',foot:'기존 자료 저장 위치와 호출 방식을 먼저 확인한 뒤 AI OFFICE에서 연결합니다.',rows:[['저장 원칙','AI 사무국에 기존 자료를 중복 저장하지 않습니다.','원칙'],['역할','검색 · 분류 · 호출 · DISPLAY 연결','연결'],['이미지','기존 이미지 전송/표시 기능을 우선 재사용','재사용'],['현재 단계','기존 자료 저장 위치 조사 후 연결 예정','NEXT']]},
    aria:{eyebrow:'ARIA · AI SECRETARY',title:'아리아 업무분장',foot:'9차에서는 아리아의 메뉴와 음성 명령을 하나의 공통 ACTION으로 실행합니다.',rows:[['전략·기획','조직운영과 의사결정 준비를 지원합니다.','전략'],['일정·업무','오늘 · 주간 · 월간 · D-Day · TASK를 연결합니다.','업무'],['PROJECT·회의','프로젝트 진행과 회의 전후 기록을 브리핑합니다.','연결'],['권한 원칙','최종 판단·승인·결정·집행은 사람이 담당합니다.','보호']]},
    gen:{eyebrow:'GEN · AI SECRETARY',title:'젠 업무분장',foot:'9차에서는 젠의 메뉴와 음성 명령을 하나의 공통 ACTION으로 실행합니다. 자동 발행은 하지 않습니다.',rows:[['뉴스','주요 뉴스 모니터링과 기사 아이디어를 준비합니다.','NEWS'],['기사·콘텐츠','기사 초안 · SNS · 홍보 · 발표자료를 준비합니다.','MEDIA'],['이미지·미디어','이미지 · 영상 · 음악 등 기존 콘텐츠 호출을 준비합니다.','CONTENT'],['발행 원칙','기사 및 공식 콘텐츠 최종 발행은 사람이 승인합니다.','보호']]}
  };

  function seoulParts(date){
    const parts=new Intl.DateTimeFormat('ko-KR',{timeZone:SEOUL_TZ,year:'numeric',month:'long',day:'numeric',weekday:'short'}).formatToParts(date);
    const get=t=>parts.find(p=>p.type===t)?.value||'';
    return {year:get('year'),month:get('month'),day:get('day'),weekday:get('weekday')};
  }

  function getSeoulYmd(date){
    return new Intl.DateTimeFormat('en-CA',{timeZone:SEOUL_TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  }

  function getWeekRangeLabel(now){
    const ymd=getSeoulYmd(now);
    const d=new Date(ymd+'T00:00:00+09:00');
    const day=d.getDay();
    const monday=new Date(d); monday.setDate(d.getDate()-(day===0?6:day-1));
    const sunday=new Date(monday); sunday.setDate(monday.getDate()+6);
    const fmt=x=>new Intl.DateTimeFormat('ko-KR',{timeZone:SEOUL_TZ,month:'numeric',day:'numeric'}).format(x);
    return `${fmt(monday)} ~ ${fmt(sunday)}`;
  }

  function updateClock(){
    const now=new Date();
    const sp=seoulParts(now);
    document.getElementById('todayLabel').textContent=`${sp.month} ${sp.day} (${sp.weekday})`;
    document.getElementById('clock').textContent=new Intl.DateTimeFormat('ko-KR',{timeZone:SEOUL_TZ,hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
    const seoulToday=new Date(getSeoulYmd(now)+'T00:00:00+09:00');
    const days=Math.ceil((meetingDate-seoulToday)/86400000);
    const dText=days>0?'D-'+days:days===0?'D-DAY':'D+'+Math.abs(days);
    document.getElementById('dday').textContent=dText;
    const dl=document.getElementById('ddayLarge'); if(dl) dl.textContent=dText;
    const ds=document.getElementById('ddayState'); if(ds) ds.textContent=days>0?`${days}일 남음 · Asia/Seoul`:days===0?'오늘 · Asia/Seoul':`${Math.abs(days)}일 지남 · Asia/Seoul`;
    document.getElementById('todayCardTitle').textContent=`${sp.month} ${sp.day}`;
    document.getElementById('weekCardTitle').textContent=getWeekRangeLabel(now);
    document.getElementById('monthCardTitle').textContent=`${sp.year} ${sp.month}`;
  }

  function currentPeriodDate(key){
    const now=new Date();
    const sp=seoulParts(now);
    if(key==='today') return `${sp.year} ${sp.month} ${sp.day} (${sp.weekday}) · Asia/Seoul`;
    if(key==='week') return `${getWeekRangeLabel(now)} · 주간 업무판`;
    if(key==='month') return `${sp.year} ${sp.month} · 월간 업무판`;
    if(key==='schedule') return `${sp.year} ${sp.month} ${sp.day} (${sp.weekday}) · 일정 보드`;
    if(key==='dday') return `목표일 2026.09.04 · Asia/Seoul`;
    return `AI OFFICE 2.0 · v${VERSION}`;
  }

  function renderPanel(key){
    const p=panels[key]; if(!p)return;
    document.getElementById('panelEyebrow').textContent=p.eyebrow;
    document.getElementById('panelTitle').textContent=p.title;
    document.getElementById('panelDate').textContent=currentPeriodDate(key);
    document.getElementById('panelBody').innerHTML=p.rows.map((r,i)=>`<div><span>${String(i+1).padStart(2,'0')}</span><p><b>${r[0]}</b><small>${r[1]}</small></p><em>${r[2]||''}</em></div>`).join('');
    document.getElementById('panelFoot').textContent=`※ ${p.foot}`;
    document.querySelectorAll('.work-card').forEach(b=>b.classList.toggle('active',b.dataset.panel===key));
    document.querySelectorAll('.period-card').forEach(c=>c.classList.toggle('selected',c.dataset.jump===key));
  }

  document.querySelectorAll('.work-card').forEach(btn=>btn.addEventListener('click',()=>renderPanel(btn.dataset.panel)));
  document.querySelectorAll('.period-card').forEach(card=>card.addEventListener('click',()=>{
    renderPanel(card.dataset.jump);
    document.getElementById('detailPanel').scrollIntoView({behavior:'smooth',block:'center'});
  }));


  document.querySelectorAll('[data-panel-target]').forEach(btn=>btn.addEventListener('click',()=>{
    renderPanel(btn.dataset.panelTarget);
    document.getElementById('detailPanel').scrollIntoView({behavior:'smooth',block:'center'});
  }));

  document.querySelectorAll('.ai-action').forEach(btn=>btn.addEventListener('click',()=>{
    const aria=btn.dataset.ai==='aria';
    document.getElementById('panelEyebrow').textContent=aria?'ARIA · AI SECRETARY':'GEN · AI SECRETARY';
    document.getElementById('panelTitle').textContent=aria?'아리아 업무영역':'젠 업무영역';
    document.getElementById('panelDate').textContent=`AI OFFICE 2.0 · v${VERSION}`;
    const rows=aria
      ?[['전략·기획','조직운영과 의사결정 준비를 지원합니다.','전략'],['일정·업무','오늘 · 주간 · 월간 · D-Day · 미완료 업무를 연결합니다.','업무'],['PROJECT·회의','프로젝트 준비와 회의 전후 기록을 지원합니다.','PROJECT'],['원칙','AI는 조사·정리·추천·준비를 하고 최종 판단은 사람이 합니다.','원칙']]
      :[['뉴스','Global News24 뉴스 모니터링과 기사 준비를 지원합니다.','NEWS'],['콘텐츠','기사 · 이미지 · SNS · 홍보 · 발표자료를 준비합니다.','MEDIA'],['미디어','영상 · 음악 등 기존 콘텐츠 호출을 지원합니다.','CONTENT'],['원칙','기사는 자동 발행하지 않고 사람이 최종 승인합니다.','원칙']];
    document.getElementById('panelBody').innerHTML=rows.map((r,i)=>`<div><span>${String(i+1).padStart(2,'0')}</span><p><b>${r[0]}</b><small>${r[1]}</small></p><em>${r[2]}</em></div>`).join('');
    document.getElementById('panelFoot').textContent='※ AI 사무국장은 기존 운영시스템을 대신하지 않고 업무를 읽고 연결하고 준비하는 역할입니다.';
    document.querySelectorAll('.work-card').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.period-card').forEach(c=>c.classList.remove('selected'));
    document.getElementById('detailPanel').scrollIntoView({behavior:'smooth',block:'center'});
  }));


  // ===== HOME 9차 · 공통 OFFICE ACTION 라우터 =====
  function scrollDetail(){
    const panel=document.getElementById('detailPanel');
    if(panel) panel.scrollIntoView({behavior:'smooth',block:'center'});
  }

  function renderGenAction(action){
    const rows=genActionRows[action]||genActionRows.news;
    const names={news:'뉴스',article:'기사',content:'콘텐츠',image:'이미지',media:'미디어',library:'자료'};
    document.getElementById('panelEyebrow').textContent='GEN · ACTION';
    document.getElementById('panelTitle').textContent=names[action]||'뉴스';
    document.getElementById('panelDate').textContent=`AI OFFICE 2.0 · v${VERSION} · 9차`;
    document.getElementById('panelBody').innerHTML=rows.map((r,i)=>`<div><span>${String(i+1).padStart(2,'0')}</span><p><b>${r[0]}</b><small>${r[1]}</small></p><em>${r[2]}</em></div>`).join('');
    document.getElementById('panelFoot').textContent='※ GEN ACTION은 준비·연결 단계이며 기사 자동 발행이나 외부 시스템 쓰기를 실행하지 않습니다.';
    document.querySelectorAll('.work-card').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.period-card').forEach(c=>c.classList.remove('selected'));
  }

  // ===== HOME 10차 · CONTROL ↔ DISPLAY SAFE BRIDGE =====
  // 실제 CONTROL/DISPLAY transport는 원본 확인 전 연결하지 않는다.
  // 기존 시스템은 추후 window.AIOfficeBridge.registerTransport(sendFn)만 호출하면 된다.
  let displayTransport=null;
  const bridgeStatus=document.getElementById('bridgeStatus');
  const bridgeDetail=document.getElementById('bridgeDetail');
  const bridgeLastAction=document.getElementById('bridgeLastAction');
  const bridgeLastSource=document.getElementById('bridgeLastSource');
  function updateBridgeUi(actionId,source){
    if(bridgeLastAction)bridgeLastAction.textContent=actionId||'아직 없음';
    if(bridgeLastSource)bridgeLastSource.textContent=(source||'menu').toUpperCase()+' ACTION';
  }
  function emitDisplayBridge(actionId,source,payload={}){
    const detail={version:VERSION,actionId,source,timestamp:new Date().toISOString(),payload};
    updateBridgeUi(actionId,source);
    window.dispatchEvent(new CustomEvent('ai-office:display-action',{detail}));
    if(typeof displayTransport==='function'){
      try{displayTransport(detail);return {sent:true,detail};}
      catch(error){if(bridgeStatus)bridgeStatus.textContent='transport 오류';if(bridgeDetail)bridgeDetail.textContent=String(error?.message||error);return {sent:false,error,detail};}
    }
    return {sent:false,reason:'transport-not-registered',detail};
  }
  window.AIOfficeBridge=Object.freeze({
    version:VERSION,
    registerTransport(fn){
      if(typeof fn!=='function')return false;
      displayTransport=fn;
      if(bridgeStatus)bridgeStatus.textContent='연결 준비 완료 · transport 등록됨';
      if(bridgeDetail)bridgeDetail.textContent='기존 CONTROL/DISPLAY transport를 사용합니다.';
      return true;
    },
    unregisterTransport(){displayTransport=null;if(bridgeStatus)bridgeStatus.textContent='대기 · transport 미연결';if(bridgeDetail)bridgeDetail.textContent='기존 CONTROL/DISPLAY 원본 확인 후 연결';},
    emit:emitDisplayBridge
  });

  function executeOfficeAction(actionId,source='menu'){
  const realWorkflows={
    "aria:today":todayWorkflow,
    "aria:week":weekWorkflow,
    "aria:task":taskWorkflow,
    "aria:project":projectWorkflow,
    "aria:meeting":meetingWorkflow,
    "gen:news":newsWorkflow,
    "gen:article":articleWorkflow,
    "gen:library":libraryWorkflow,
    "gen:media":mediaWorkflow
  };
  if(realWorkflows[actionId]){
    try{ realWorkflows[actionId](); }catch(err){ console.error("REAL WORKFLOW",err); }
  }

    if(!actionId)return false;
    const [agent,action]=actionId.includes(':')?actionId.split(':',2):['aria',actionId];
    if(agent==='gen') renderGenAction(action);
    else renderPanel(action);
    const state=document.getElementById('voiceState');
    if(state) state.textContent=(source==='voice'?'음성 ACTION 실행':'메뉴 ACTION 실행')+' · '+actionId;
    if(source!=='display') emitDisplayBridge(actionId,source,{agent,action});
    if(agent==='gen'&&action==='news'){const board=document.getElementById('newsBriefingBoard');if(board)board.scrollIntoView({behavior:'smooth',block:'start'});}
    else if(agent==='gen'&&action==='article'){const board=document.getElementById('articleDeskBoard');if(board)board.scrollIntoView({behavior:'smooth',block:'start'});}
    else if(agent==='gen'&&action==='media'){const board=document.getElementById('mediaCallBoard');if(board)board.scrollIntoView({behavior:'smooth',block:'start'});}
    else if(agent==='gen'&&(action==='image'||action==='library')){const board=document.getElementById('resourceDisplayBoard');if(board)board.scrollIntoView({behavior:'smooth',block:'start'});}
    else scrollDetail();
    return true;
  }

  // v0.16.1 PINPOINT: 기존 공통 ACTION 라우터를 자체점검/향후 연동에서
  // 동일 함수로 참조할 수 있도록 안전하게 공개합니다. 실행 로직은 변경하지 않습니다.
  window.executeOfficeAction = executeOfficeAction;

  // HOME 17차: DISPLAY가 동일 AI OFFICE 화면을 열었을 때 해당 ACTION만 실행하고
  // Realtime으로 다시 되돌려 보내지 않아 루프를 방지합니다.
  const displayParams=new URLSearchParams(location.search);
  const displayAction=displayParams.get('displayAction');
  if(displayParams.get('display')==='1'&&displayAction){
    setTimeout(()=>executeOfficeAction(displayAction,'display'),0);
  }

  document.querySelectorAll('[data-ai-action]').forEach(btn=>btn.addEventListener('click',()=>executeOfficeAction('aria:'+btn.dataset.aiAction,'menu')));
  document.querySelectorAll('[data-office-action]').forEach(btn=>btn.addEventListener('click',()=>executeOfficeAction(btn.dataset.officeAction,'menu')));

  const genActionRows={
    news:[['뉴스 브리핑','확인한 뉴스 항목을 중요도 순으로 정리합니다.','BRIEF'],['뉴스함','제목 · 출처 · 한줄요약을 직접 등록해 브리핑 근거로 사용합니다.','SOURCE'],['현재 단계','외부 뉴스 자동수집과 기사 자동발행은 연결하지 않습니다.','안전']],
    article:[['기사 초안','제목 · 부제 · 요약 · 본문 초안을 준비합니다.','DRAFT'],['자료조사','기사 근거와 관련자료를 정리합니다.','RESEARCH'],['발행','자동 발행하지 않고 사람의 최종 승인을 받습니다.','승인']],
    content:[['SNS','기사·행사·프로젝트 홍보문을 준비합니다.','SNS'],['발표자료','회의 및 대외 발표용 콘텐츠 준비를 지원합니다.','PRESENT'],['원칙','기존 콘텐츠 시스템을 중복 개발하지 않습니다.','REUSE']],
    image:[['이미지 DISPLAY','등록한 기존 이미지 위치를 선택해 SAFE BRIDGE로 표시 명령을 보냅니다.','DISPLAY'],['보호','파일을 AI OFFICE에 중복 저장하지 않습니다.','REUSE'],['현재 단계','transport 미연결 시 내부 Bridge 이벤트까지만 발생합니다.','SAFE']],
    media:[['영상','기존 영상 URL/경로를 등록해 호출합니다.','VIDEO'],['음악','사람이 눌러 재생하며 자동재생하지 않습니다.','AUDIO'],['DISPLAY','SAFE BRIDGE에 미디어 payload를 전달합니다.','READY']],
    library:[['자료 호출함','기존 자료 위치를 등록·선택해 DISPLAY 준비 명령을 만듭니다.','RESOURCE'],['중복저장 금지','AI OFFICE에는 URL/경로와 메모만 저장합니다.','REUSE'],['연결','선택 자료를 SAFE BRIDGE payload로 전달합니다.','DISPLAY']]
  };
  document.querySelectorAll('[data-gen-action]').forEach(btn=>btn.addEventListener('click',()=>executeOfficeAction('gen:'+btn.dataset.genAction,'menu')));


  const bridgeTest=document.getElementById('bridgeTest');
  if(bridgeTest)bridgeTest.addEventListener('click',()=>{
    const result=emitDisplayBridge('aria:today','bridge-test',{test:true});
    const note=document.getElementById('bridgeTestNote');
    if(note)note.textContent=result.sent?'등록된 transport로 테스트 ACTION을 전달했습니다.':'정상: 내부 이벤트 발생 · 실제 DISPLAY 전송 없음 (transport 미연결)';
  });


  // ===== HOME 13차 · 자료·이미지 DISPLAY SAFE RESOURCE BRIDGE =====
  const MEDIA_STORAGE_KEY='ipma_ai_office_media_library_v1';
  const MEDIA_LAST_KEY='ipma_ai_office_media_last_v1';
  let selectedMediaId='';
  function loadMedia(){try{const raw=localStorage.getItem(MEDIA_STORAGE_KEY);const rows=raw?JSON.parse(raw):[];return Array.isArray(rows)?rows:[];}catch(e){return [];}}
  function saveMedia(rows){try{localStorage.setItem(MEDIA_STORAGE_KEY,JSON.stringify(rows));}catch(e){}}
  function mediaTypeLabel(v){return v==='audio'?'AUDIO':'VIDEO';}
  function safeMediaSrc(v){const x=String(v||'').trim();return /^(https?:|blob:|data:audio|data:video)/i.test(x)?x:'';}
  function mediaTime(v){if(!v)return '아직 없음';try{return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v));}catch(e){return '기록됨';}}
  function renderMedia(){
    const rows=loadMedia().sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));const list=document.getElementById('mediaList');
    const total=document.getElementById('mediaTotal'),count=document.getElementById('mediaCount'),selected=document.getElementById('mediaSelected'),last=document.getElementById('mediaLastSent');
    if(total)total.textContent=String(rows.length);if(count)count.textContent=rows.length+'개';const item=rows.find(x=>x.id===selectedMediaId);if(selected)selected.textContent=item?item.title:'없음';
    try{const x=JSON.parse(localStorage.getItem(MEDIA_LAST_KEY)||'null');if(last)last.textContent=x?mediaTime(x.at):'아직 없음';}catch(e){if(last)last.textContent='아직 없음';}
    if(list)list.innerHTML=rows.length?rows.map(x=>`<div class="media-item${x.id===selectedMediaId?' selected':''}" data-media-id="${esc(x.id)}"><div class="media-kind">${mediaTypeLabel(x.type)}</div><div class="media-main"><b>${esc(x.title)}</b><small>${esc(x.url)}</small>${x.note?`<p>${esc(x.note)}</p>`:''}</div><div class="media-controls"><button type="button" data-media-select>선택</button><button type="button" class="send" data-media-send>DISPLAY 준비</button><button type="button" class="delete" data-media-delete>삭제</button></div></div>`).join(''):'<p class="media-empty">등록된 음악·영상이 없습니다.</p>';
    renderMediaPreview(item);
  }
  function renderMediaPreview(item){const box=document.getElementById('mediaPreview');if(!box)return;if(!item){box.innerHTML='<p>미디어를 선택하면 여기에서 호출정보를 확인합니다.</p>';return;}const src=safeMediaSrc(item.url);let player='';if(src){player=item.type==='audio'?`<audio controls preload="metadata" src="${esc(src)}"></audio>`:`<video controls preload="metadata" playsinline src="${esc(src)}"></video>`;}else{player='<div class="media-external">직접 재생 미지원 경로 · DISPLAY 호출정보로만 사용</div>';}box.innerHTML=`<div class="media-preview-meta"><span>${mediaTypeLabel(item.type)} · ${esc((item.agent||'gen').toUpperCase())}</span><b>${esc(item.title)}</b><small>${esc(item.url)}</small>${item.note?`<p>${esc(item.note)}</p>`:''}</div>${player}`;}
  function sendMedia(item){if(!item)return;const actionId=(item.agent==='aria'?'aria':'gen')+':display-media';const payload={media:{id:item.id,title:item.title,type:item.type,url:item.url,note:item.note||'',agent:item.agent||'gen'},mode:'display',autoplay:false};const result=window.AIOfficeDisplayBridge?.send?window.AIOfficeDisplayBridge.send(actionId,'media',payload):null;const at=new Date().toISOString();try{localStorage.setItem(MEDIA_LAST_KEY,JSON.stringify({id:item.id,title:item.title,at,sent:!!result?.sent}));}catch(e){}const note=document.getElementById('mediaTransportNote');if(note)note.textContent=result?.sent?'기존 transport로 전달됨':'SAFE BRIDGE 내부 이벤트 완료 · 실제 DISPLAY transport는 아직 미연결';renderMedia();}
  const mediaForm=document.getElementById('mediaForm');if(mediaForm)mediaForm.addEventListener('submit',e=>{e.preventDefault();const title=document.getElementById('mediaTitle').value.trim(),url=document.getElementById('mediaUrl').value.trim();if(!title||!url)return;const rows=loadMedia();const item={id:'media-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),title,type:document.getElementById('mediaType').value,agent:document.getElementById('mediaAgent').value,url,note:document.getElementById('mediaNote').value.trim(),createdAt:new Date().toISOString()};rows.push(item);saveMedia(rows);selectedMediaId=item.id;mediaForm.reset();renderMedia();});
  const mediaList=document.getElementById('mediaList');if(mediaList)mediaList.addEventListener('click',e=>{const row=e.target.closest('[data-media-id]');if(!row)return;const rows=loadMedia(),item=rows.find(x=>x.id===row.dataset.mediaId);if(!item)return;if(e.target.closest('[data-media-delete]')){saveMedia(rows.filter(x=>x.id!==item.id));if(selectedMediaId===item.id)selectedMediaId='';renderMedia();return;}selectedMediaId=item.id;if(e.target.closest('[data-media-send]'))sendMedia(item);else renderMedia();});
  const mediaClear=document.getElementById('mediaClearSelection');if(mediaClear)mediaClear.addEventListener('click',()=>{selectedMediaId='';renderMedia();});
  const RESOURCE_STORAGE_KEY='ipma_ai_office_display_resources_v1';
  const RESOURCE_LAST_KEY='ipma_ai_office_display_resource_last_v1';
  let selectedResourceId=null;
  function loadResources(){try{const raw=localStorage.getItem(RESOURCE_STORAGE_KEY);const v=raw?JSON.parse(raw):[];return Array.isArray(v)?v:[];}catch(e){return [];}}
  function saveResources(v){try{localStorage.setItem(RESOURCE_STORAGE_KEY,JSON.stringify(v));}catch(e){}}
  function escapeHtml(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}
  function typeLabel(v){return v==='image'?'이미지':v==='document'?'문서':v==='chart'?'그래프':'링크';}
  function safePreviewUrl(url){try{const u=new URL(url,location.href);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch(e){return '';}}
  function renderResourcePreview(item){
    const preview=document.getElementById('resourcePreview');if(!preview)return;
    if(!item){preview.innerHTML='<p>자료를 선택하면 여기에서 호출 내용을 확인합니다.</p>';return;}
    const url=safePreviewUrl(item.url);
    const image=item.type==='image'&&url?`<img src="${escapeHtml(url)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.style.display='none'">`:'';
    preview.innerHTML=`${image}<div><span>${typeLabel(item.type)} · ${item.agent==='aria'?'ARIA':'GEN'}</span><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.url)}</small>${item.note?`<p>${escapeHtml(item.note)}</p>`:''}</div>`;
  }
  function renderResources(){
    const rows=loadResources();const list=document.getElementById('resourceList');
    const count=document.getElementById('resourceCount'),total=document.getElementById('resourceTotal'),selected=document.getElementById('resourceSelected');
    if(count)count.textContent=rows.length+'개';if(total)total.textContent=String(rows.length);
    const picked=rows.find(x=>x.id===selectedResourceId)||null;if(!picked)selectedResourceId=null;
    if(selected)selected.textContent=picked?picked.title.slice(0,16):'없음';renderResourcePreview(picked);
    if(!list)return;
    if(!rows.length){list.innerHTML='<p class="resource-empty">등록된 자료가 없습니다. 기존 자료의 URL 또는 경로를 등록하세요.</p>';return;}
    list.innerHTML=rows.map(item=>`<div class="resource-item${item.id===selectedResourceId?' selected':''}" data-resource-id="${escapeHtml(item.id)}"><div class="resource-kind">${typeLabel(item.type)}</div><div class="resource-main"><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.url)}</small>${item.note?`<p>${escapeHtml(item.note)}</p>`:''}</div><div class="resource-controls"><button type="button" data-resource-select="${escapeHtml(item.id)}">선택</button><button type="button" class="send" data-resource-send="${escapeHtml(item.id)}">DISPLAY 준비</button><button type="button" class="delete" data-resource-delete="${escapeHtml(item.id)}">삭제</button></div></div>`).join('');
  }
  function sendResourceToDisplay(item,source='resource'){
    if(!item)return false;selectedResourceId=item.id;renderResources();
    const actionId=(item.agent==='aria'?'aria':'gen')+':display-resource';
    const payload={resource:{id:item.id,title:item.title,type:item.type,url:item.url,note:item.note||'',agent:item.agent||'gen'},mode:'display'};
    const result=emitDisplayBridge(actionId,source,payload);
    const last=document.getElementById('resourceLastSent');if(last)last.textContent=new Intl.DateTimeFormat('ko-KR',{timeZone:SEOUL_TZ,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
    try{localStorage.setItem(RESOURCE_LAST_KEY,JSON.stringify({id:item.id,title:item.title,at:new Date().toISOString(),sent:!!result.sent}));}catch(e){}
    const note=document.getElementById('resourceTransportNote');if(note)note.textContent=result.sent?'등록된 기존 transport로 DISPLAY 명령을 전달했습니다.':'정상: SAFE BRIDGE 내부 이벤트까지 완료 · 실제 DISPLAY transport는 아직 미연결';
    return result.sent;
  }
  const resourceForm=document.getElementById('resourceForm');
  if(resourceForm)resourceForm.addEventListener('submit',e=>{
    e.preventDefault();
    const title=document.getElementById('resourceTitle').value.trim(),url=document.getElementById('resourceUrl').value.trim();if(!title||!url)return;
    const rows=loadResources();rows.unshift({id:'res-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),title,type:document.getElementById('resourceType').value,agent:document.getElementById('resourceAgent').value,url,note:document.getElementById('resourceNote').value.trim(),createdAt:new Date().toISOString()});
    saveResources(rows);resourceForm.reset();renderResources();
  });
  const resourceList=document.getElementById('resourceList');
  if(resourceList)resourceList.addEventListener('click',e=>{
    const select=e.target.closest('[data-resource-select]'),send=e.target.closest('[data-resource-send]'),del=e.target.closest('[data-resource-delete]');const rows=loadResources();
    if(select){selectedResourceId=select.dataset.resourceSelect;renderResources();return;}
    if(send){const item=rows.find(x=>x.id===send.dataset.resourceSend);sendResourceToDisplay(item,'resource-button');return;}
    if(del){const id=del.dataset.resourceDelete;saveResources(rows.filter(x=>x.id!==id));if(selectedResourceId===id)selectedResourceId=null;renderResources();}
  });
  const clearResourceSelection=document.getElementById('resourceClearSelection');if(clearResourceSelection)clearResourceSelection.addEventListener('click',()=>{selectedResourceId=null;renderResources();});
  renderMedia();
  renderResources();


  // ===== HOME 11차 · 예약업무 (브라우저 내 LOCAL SCHEDULER) =====
  const SCHEDULE_STORAGE_KEY='ipma_ai_office_schedules_v1';
  const SCHEDULE_LAST_KEY='ipma_ai_office_scheduler_last_v1';
  const scheduleActions={
    aria:[
      ['briefing','출근 브리핑'],['today','오늘'],['schedule','일정'],['dday','D-Day'],
      ['task','TASK'],['project','PROJECT'],['meeting','회의']
    ],
    gen:[
      ['news','뉴스'],['article','기사'],['content','콘텐츠'],['image','이미지'],['media','미디어'],['library','자료']
    ]
  };
  function loadSchedules(){try{const raw=localStorage.getItem(SCHEDULE_STORAGE_KEY);const v=raw?JSON.parse(raw):[];return Array.isArray(v)?v:[];}catch(e){return [];}}
  function saveSchedules(v){try{localStorage.setItem(SCHEDULE_STORAGE_KEY,JSON.stringify(v));}catch(e){}}
  function localSeoulParts(date=new Date()){
    const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:SEOUL_TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false,weekday:'short'});
    const p=fmt.formatToParts(date);const g=t=>p.find(x=>x.type===t)?.value||'';
    return {date:`${g('year')}-${g('month')}-${g('day')}`,time:`${g('hour')}:${g('minute')}`,year:+g('year'),month:+g('month'),day:+g('day'),weekday:g('weekday')};
  }
  function repeatLabel(v){return v==='daily'?'매일':v==='weekly'?'매주':v==='monthly'?'매월':'한 번';}
  function actionLabel(s){const rows=scheduleActions[s.agent]||[];const hit=rows.find(x=>x[0]===s.action);return `${s.agent==='gen'?'GEN · 젠':'ARIA · 아리아'} · ${hit?hit[1]:s.action}`;}
  function scheduleMatchesToday(s,p){
    if(!s.enabled)return false;
    if(s.repeat==='once')return s.date===p.date;
    if(s.repeat==='daily')return !s.date||p.date>=s.date;
    if(!s.date)return false;
    const start=new Date(s.date+'T00:00:00+09:00');
    const today=new Date(p.date+'T00:00:00+09:00');
    if(today<start)return false;
    if(s.repeat==='weekly')return start.getDay()===today.getDay();
    if(s.repeat==='monthly')return start.getDate()===today.getDate();
    return false;
  }
  function nextOccurrence(s,now=new Date()){
    if(!s.enabled||!s.time)return null;
    const p=localSeoulParts(now);const candidates=[];
    for(let i=0;i<370;i++){
      const d=new Date(p.date+'T00:00:00+09:00');d.setDate(d.getDate()+i);
      const dp=localSeoulParts(d);
      if(scheduleMatchesToday(s,dp)){
        const when=new Date(dp.date+'T'+s.time+':00+09:00');
        if(when>=now){candidates.push(when);break;}
      }
      if(s.repeat==='once'&&i>1&&s.date<p.date)break;
    }
    return candidates[0]||null;
  }
  function updateActionOptions(){
    const agent=document.getElementById('scheduleAgent'),sel=document.getElementById('scheduleAction');if(!agent||!sel)return;
    sel.innerHTML=(scheduleActions[agent.value]||[]).map(x=>`<option value="${x[0]}">${x[1]}</option>`).join('');
  }
  function formatNext(when){if(!when)return ['없음','실행 가능한 활성 예약 없음'];const p=localSeoulParts(when);return [`${p.month}.${String(p.day).padStart(2,'0')} ${p.time}`,`${p.date} · Asia/Seoul`];}
  function renderSchedules(){
    const list=document.getElementById('scheduleList');if(!list)return;const schedules=loadSchedules();
    const active=schedules.filter(s=>s.enabled).length;const ae=document.getElementById('schedulerActive');if(ae)ae.textContent=active;
    const cnt=document.getElementById('schedulerCount');if(cnt)cnt.textContent=schedules.length+'개';
    let next=null;for(const s of schedules){const n=nextOccurrence(s);if(n&&(!next||n.when<next.when))next={s,when:n};}
    const [nt,nd]=formatNext(next?.when);const ne=document.getElementById('schedulerNext');if(ne)ne.textContent=nt;const ned=document.getElementById('schedulerNextDetail');if(ned)ned.textContent=next?`${next.s.title} · ${nd}`:nd;
    try{const last=JSON.parse(localStorage.getItem(SCHEDULE_LAST_KEY)||'null');if(last){const le=document.getElementById('schedulerLast');if(le)le.textContent=last.title||last.actionId;const ld=document.getElementById('schedulerLastDetail');if(ld)ld.textContent=`${last.atLabel} · ${last.actionId}`;}}catch(e){}
    if(!schedules.length){list.innerHTML='<div class="schedule-empty">등록된 예약업무가 없습니다.</div>';return;}
    list.innerHTML=schedules.map(s=>{const n=nextOccurrence(s);const nextText=n?formatNext(n)[0]:'예정 없음';return `<div class="schedule-item ${s.enabled?'':'disabled'}" data-schedule-id="${esc(s.id)}"><button type="button" class="schedule-toggle" data-schedule-toggle aria-label="활성 전환"><span></span></button><div class="schedule-main"><b>${esc(s.title)}</b><small>${esc(actionLabel(s))} · ${repeatLabel(s.repeat)} · ${esc(s.time)}${s.date?' · 시작 '+esc(s.date):''}</small></div><em>${esc(nextText)}</em><button type="button" class="schedule-delete" data-schedule-delete>삭제</button></div>`;}).join('');
  }
  function runScheduleTick(){
    const schedules=loadSchedules();if(!schedules.length){renderSchedules();return;}const p=localSeoulParts();let changed=false;
    schedules.forEach(s=>{
      if(!s.enabled||!scheduleMatchesToday(s,p)||s.time!==p.time)return;
      const runKey=`${p.date}T${p.time}`;if(s.lastRunKey===runKey)return;
      const actionId=`${s.agent}:${s.action}`;executeOfficeAction(actionId,'schedule');
      s.lastRunKey=runKey;s.lastRunAt=new Date().toISOString();if(s.repeat==='once')s.enabled=false;changed=true;
      try{localStorage.setItem(SCHEDULE_LAST_KEY,JSON.stringify({title:s.title,actionId,at:s.lastRunAt,atLabel:`${p.date} ${p.time}`}));}catch(e){}
    });
    if(changed)saveSchedules(schedules);renderSchedules();
  }
  const scheduleAgent=document.getElementById('scheduleAgent');if(scheduleAgent)scheduleAgent.addEventListener('change',updateActionOptions);updateActionOptions();
  const scheduleRepeat=document.getElementById('scheduleRepeat');
  function syncScheduleDateRequired(){const d=document.getElementById('scheduleDate');if(!d||!scheduleRepeat)return;d.required=scheduleRepeat.value!=='daily';}
  if(scheduleRepeat)scheduleRepeat.addEventListener('change',syncScheduleDateRequired);syncScheduleDateRequired();
  const scheduleForm=document.getElementById('scheduleForm');if(scheduleForm)scheduleForm.addEventListener('submit',e=>{
    e.preventDefault();const title=document.getElementById('scheduleTitle').value.trim();const date=document.getElementById('scheduleDate').value;const time=document.getElementById('scheduleTime').value;const repeat=document.getElementById('scheduleRepeat').value;const agent=document.getElementById('scheduleAgent').value;const action=document.getElementById('scheduleAction').value;if(!title||!time)return;if(repeat!=='daily'&&!date)return;
    const items=loadSchedules();items.push({id:'sch-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),title,date,time,repeat,agent,action,enabled:true,lastRunKey:'',createdAt:new Date().toISOString()});saveSchedules(items);scheduleForm.reset();updateActionOptions();syncScheduleDateRequired();renderSchedules();
  });
  const scheduleList=document.getElementById('scheduleList');if(scheduleList)scheduleList.addEventListener('click',e=>{
    const row=e.target.closest('[data-schedule-id]');if(!row)return;const id=row.dataset.scheduleId;const items=loadSchedules();const i=items.findIndex(x=>x.id===id);if(i<0)return;
    if(e.target.closest('[data-schedule-toggle]'))items[i].enabled=!items[i].enabled;
    else if(e.target.closest('[data-schedule-delete]'))items.splice(i,1);else return;
    saveSchedules(items);renderSchedules();
  });
  renderSchedules();runScheduleTick();setInterval(runScheduleTick,30000);


  // ===== HOME 12차 · GEN 뉴스 브리핑 (확인된 항목 localStorage) =====
  const NEWS_STORAGE_KEY='ipma_ai_office_news_brief_v1';
  const NEWS_BRIEF_TIME_KEY='ipma_ai_office_news_brief_time_v1';
  let newsFilter='all';
  function loadNews(){try{const raw=localStorage.getItem(NEWS_STORAGE_KEY);const v=raw?JSON.parse(raw):[];return Array.isArray(v)?v:[];}catch(e){return [];}}
  function saveNews(v){try{localStorage.setItem(NEWS_STORAGE_KEY,JSON.stringify(v));}catch(e){}}
  function newsPriorityLabel(v){return String(v)==='3'?'긴급':String(v)==='2'?'중요':'일반';}
  function newsSort(items){return [...items].sort((a,b)=>(+b.priority-+a.priority)||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));}
  function formatNewsTime(iso){try{return new Intl.DateTimeFormat('ko-KR',{timeZone:SEOUL_TZ,month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(iso));}catch(e){return '';}}
  function buildNewsBrief(recordTime=false){
    const items=newsSort(loadNews()).slice(0,5);const box=document.getElementById('newsBriefTop');if(!box)return;
    if(!items.length){box.innerHTML='<p>뉴스 항목을 등록하면 중요도 순으로 최대 5건을 브리핑합니다.</p>';}
    else box.innerHTML=items.map((n,i)=>`<div><span>${i+1}</span><p><b>${esc(n.title)}</b><small>${esc(n.summary)}${n.source?' · 출처 '+esc(n.source):''}</small></p><em class="p${esc(n.priority)}">${newsPriorityLabel(n.priority)}</em></div>`).join('');
    if(recordTime){try{localStorage.setItem(NEWS_BRIEF_TIME_KEY,new Date().toISOString());}catch(e){}}
    const t=localStorage.getItem(NEWS_BRIEF_TIME_KEY);const te=document.getElementById('newsBriefTime');if(te)te.textContent=t?'마지막 정리 · '+formatNewsTime(t):'자동수집 없음 · 직접 확인 뉴스 기준';
  }
  function renderNews(){
    const all=loadNews(), sorted=newsSort(all), list=document.getElementById('newsBriefList');
    const total=document.getElementById('newsTotal'),urgent=document.getElementById('newsUrgent'),important=document.getElementById('newsImportant');
    if(total)total.textContent=all.length;if(urgent)urgent.textContent=all.filter(x=>String(x.priority)==='3').length;if(important)important.textContent=all.filter(x=>String(x.priority)==='2').length;
    if(list){const shown=newsFilter==='all'?sorted:sorted.filter(x=>String(x.priority)===newsFilter);list.innerHTML=shown.length?shown.map(n=>`<div class="news-item" data-news-id="${esc(n.id)}"><div class="news-priority p${esc(n.priority)}">${newsPriorityLabel(n.priority)}</div><div class="news-item-main"><div><b>${esc(n.title)}</b><span>${esc(n.category||'종합')}</span></div><p>${esc(n.summary)}</p><small>${esc(n.source||'출처 미입력')} · ${esc(formatNewsTime(n.createdAt))}</small></div><div class="news-item-actions"><button type="button" data-news-article>기사 준비</button><button type="button" data-news-delete>삭제</button></div></div>`).join(''):'<div class="news-empty">해당 조건의 뉴스 항목이 없습니다.</div>';}
    buildNewsBrief(false);
  }
  const newsForm=document.getElementById('newsBriefForm');if(newsForm)newsForm.addEventListener('submit',e=>{
    e.preventDefault();const title=document.getElementById('newsTitle').value.trim(),summary=document.getElementById('newsSummary').value.trim();if(!title||!summary)return;
    const items=loadNews();items.push({id:'news-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),title,summary,source:document.getElementById('newsSource').value.trim(),category:document.getElementById('newsCategory').value,priority:document.getElementById('newsPriority').value,createdAt:new Date().toISOString()});saveNews(items);newsForm.reset();renderNews();
  });
  document.querySelectorAll('[data-news-filter]').forEach(btn=>btn.addEventListener('click',()=>{newsFilter=btn.dataset.newsFilter;document.querySelectorAll('[data-news-filter]').forEach(x=>x.classList.toggle('active',x===btn));renderNews();}));
  const newsList=document.getElementById('newsBriefList');if(newsList)newsList.addEventListener('click',e=>{
    const row=e.target.closest('[data-news-id]');if(!row)return;
    if(e.target.closest('[data-news-delete]')){saveNews(loadNews().filter(x=>x.id!==row.dataset.newsId));renderNews();renderArticleNewsOptions();return;}
    if(e.target.closest('[data-news-article]')){prepareArticleFromNews(row.dataset.newsId);return;}
  });
  const newsBuild=document.getElementById('newsBuildBrief');if(newsBuild)newsBuild.addEventListener('click',()=>buildNewsBrief(true));
  renderNews();


  // ===== HOME 14차 · GEN 기사 준비 (사람 최종 승인) =====
  const ARTICLE_STORAGE_KEY='ipma_ai_office_article_drafts_v1';
  let selectedArticleId='';
  function loadArticles(){try{const raw=localStorage.getItem(ARTICLE_STORAGE_KEY);const v=raw?JSON.parse(raw):[];return Array.isArray(v)?v:[];}catch(e){return [];}}
  function saveArticles(v){try{localStorage.setItem(ARTICLE_STORAGE_KEY,JSON.stringify(v));}catch(e){}}
  function articleStatusLabel(v){return v==='approval'?'승인대기':v==='review'?'검토중':'초안';}
  function formatArticleTime(iso){try{return new Intl.DateTimeFormat('ko-KR',{timeZone:SEOUL_TZ,month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(iso));}catch(e){return '';}}
  function renderArticleNewsOptions(){
    const select=document.getElementById('articleSourceNews');if(!select)return;const current=select.value;
    const rows=newsSort(loadNews());select.innerHTML='<option value="">직접 작성 · 뉴스 연결 없음</option>'+rows.map(n=>`<option value="${esc(n.id)}">${esc(n.title)}</option>`).join('');
    if([...select.options].some(o=>o.value===current))select.value=current;
  }
  function resetArticleEditor(){
    const form=document.getElementById('articleDraftForm');if(form)form.reset();selectedArticleId='';
    const id=document.getElementById('articleDraftId');if(id)id.value='';const st=document.getElementById('articleEditState');if(st)st.textContent='새 초안';
    renderArticlePreview(null);renderArticleNewsOptions();
  }
  function fillArticleEditor(item){
    if(!item)return;selectedArticleId=item.id;document.getElementById('articleDraftId').value=item.id||'';document.getElementById('articleSourceNews').value=item.sourceNewsId||'';
    document.getElementById('articleTitle').value=item.title||'';document.getElementById('articleSubtitle').value=item.subtitle||'';document.getElementById('articleSummary').value=item.summary||'';document.getElementById('articleBody').value=item.body||'';document.getElementById('articleStatus').value=item.status||'draft';document.getElementById('articleTags').value=item.tags||'';document.getElementById('articleImageBrief').value=item.imageBrief||'';
    const st=document.getElementById('articleEditState');if(st)st.textContent='수정 중 · '+formatArticleTime(item.updatedAt||item.createdAt);renderArticlePreview(item);
    const board=document.getElementById('articleDeskBoard');if(board)board.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function prepareArticleFromNews(newsId){
    const n=loadNews().find(x=>x.id===newsId);if(!n)return;resetArticleEditor();renderArticleNewsOptions();
    const source=document.getElementById('articleSourceNews');if(source)source.value=n.id;
    document.getElementById('articleTitle').value=n.title||'';document.getElementById('articleSummary').value=n.summary||'';
    const body=document.getElementById('articleBody');if(body)body.value=(n.source?'[확인 출처] '+n.source+'\n\n':'')+'[확인된 핵심]\n'+(n.summary||'')+'\n\n[본문 초안]\n';
    const st=document.getElementById('articleEditState');if(st)st.textContent='뉴스에서 새 기사 준비 · '+(n.source||'출처 미입력');
    const board=document.getElementById('articleDeskBoard');if(board)board.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function renderArticlePreview(item){
    const box=document.getElementById('articlePreview');if(!box)return;if(!item){box.innerHTML='<p>저장된 초안을 선택하면 기사 구성을 미리 확인할 수 있습니다.</p>';return;}
    box.innerHTML=`<span>${articleStatusLabel(item.status)}</span><h4>${esc(item.title)}</h4>${item.subtitle?`<h5>${esc(item.subtitle)}</h5>`:''}<p>${esc(item.summary)}</p>${item.tags?`<small>태그 · ${esc(item.tags)}</small>`:''}<em>자동 발행 없음 · 사람 최종 승인</em>`;
  }
  function renderArticles(){
    renderArticleNewsOptions();const rows=loadArticles().sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
    const total=document.getElementById('articleTotal'),review=document.getElementById('articleReview'),approval=document.getElementById('articleApproval'),count=document.getElementById('articleCount'),list=document.getElementById('articleDraftList');
    if(total)total.textContent=rows.length;if(review)review.textContent=rows.filter(x=>x.status==='review').length;if(approval)approval.textContent=rows.filter(x=>x.status==='approval').length;if(count)count.textContent=rows.length+'개';
    const picked=rows.find(x=>x.id===selectedArticleId)||null;renderArticlePreview(picked);
    if(!list)return;if(!rows.length){list.innerHTML='<p class="article-empty">저장된 기사 초안이 없습니다. 뉴스 브리핑의 “기사 준비” 또는 직접 작성으로 시작하세요.</p>';return;}
    list.innerHTML=rows.map(a=>`<div class="article-draft-item${a.id===selectedArticleId?' selected':''}" data-article-id="${esc(a.id)}"><div class="article-status status-${esc(a.status||'draft')}">${articleStatusLabel(a.status)}</div><div class="article-draft-main"><b>${esc(a.title)}</b>${a.subtitle?`<p>${esc(a.subtitle)}</p>`:''}<small>${esc(formatArticleTime(a.updatedAt||a.createdAt))}${a.tags?' · '+esc(a.tags):''}</small></div><div class="article-item-actions"><button type="button" data-article-edit>열기</button><button type="button" data-article-copy>복사</button><button type="button" class="delete" data-article-delete>삭제</button></div></div>`).join('');
  }
  function articleText(item){return [item.title,item.subtitle,item.summary,item.body,item.tags?'태그: '+item.tags:'',item.imageBrief?'이미지 요청: '+item.imageBrief:''].filter(Boolean).join('\n\n');}
  const articleForm=document.getElementById('articleDraftForm');if(articleForm)articleForm.addEventListener('submit',e=>{
    e.preventDefault();const title=document.getElementById('articleTitle').value.trim(),summary=document.getElementById('articleSummary').value.trim();if(!title||!summary)return;
    const rows=loadArticles(),now=new Date().toISOString(),id=document.getElementById('articleDraftId').value||('article-'+Date.now()+'-'+Math.random().toString(36).slice(2,7));
    const old=rows.find(x=>x.id===id);const item={id,sourceNewsId:document.getElementById('articleSourceNews').value,title,subtitle:document.getElementById('articleSubtitle').value.trim(),summary,body:document.getElementById('articleBody').value.trim(),status:document.getElementById('articleStatus').value,tags:document.getElementById('articleTags').value.trim(),imageBrief:document.getElementById('articleImageBrief').value.trim(),createdAt:old?.createdAt||now,updatedAt:now};
    const i=rows.findIndex(x=>x.id===id);if(i>=0)rows[i]=item;else rows.push(item);saveArticles(rows);selectedArticleId=id;document.getElementById('articleDraftId').value=id;const st=document.getElementById('articleEditState');if(st)st.textContent='저장 완료 · '+formatArticleTime(now);renderArticles();
  });
  const articleSource=document.getElementById('articleSourceNews');if(articleSource)articleSource.addEventListener('change',()=>{if(articleSource.value&&!document.getElementById('articleDraftId').value)prepareArticleFromNews(articleSource.value);});
  const articleReset=document.getElementById('articleReset');if(articleReset)articleReset.addEventListener('click',resetArticleEditor);
  const articleList=document.getElementById('articleDraftList');if(articleList)articleList.addEventListener('click',async e=>{
    const row=e.target.closest('[data-article-id]');if(!row)return;const items=loadArticles(),item=items.find(x=>x.id===row.dataset.articleId);if(!item)return;
    if(e.target.closest('[data-article-edit]')){fillArticleEditor(item);return;}
    if(e.target.closest('[data-article-delete]')){saveArticles(items.filter(x=>x.id!==item.id));if(selectedArticleId===item.id)resetArticleEditor();renderArticles();return;}
    if(e.target.closest('[data-article-copy]')){try{await navigator.clipboard.writeText(articleText(item));const st=document.getElementById('articleEditState');if(st)st.textContent='기사 초안 복사 완료';}catch(err){fillArticleEditor(item);}return;}
  });
  renderArticles();


  // ===== HOME 9차 · 브라우저 음성인식 → 공통 ACTION =====
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  const voiceMic=document.getElementById('voiceMic');
  const voiceSupport=document.getElementById('voiceSupport');
  const voiceState=document.getElementById('voiceState');
  const voiceTranscript=document.getElementById('voiceTranscript');
  const voiceDot=document.getElementById('voiceStateDot');
  let recognition=null;
  let voiceListening=false;

  function normalizeVoice(text){return String(text||'').toLowerCase().replace(/\s+/g,' ').trim();}
  function resolveVoiceAction(text){
    const q=normalizeVoice(text);
    const isGen=/젠|gen/.test(q);
    if(isGen){
      if(/기사/.test(q))return 'gen:article';
      if(/이미지|사진/.test(q))return 'gen:image';
      if(/영상|음악|미디어/.test(q))return 'gen:media';
      if(/자료/.test(q))return 'gen:library';
      if(/콘텐츠|홍보|sns|발표/.test(q))return 'gen:content';
      if(/뉴스|소식/.test(q))return 'gen:news';
      return 'gen:news';
    }
    if(/회의/.test(q))return 'aria:meeting';
    if(/프로젝트|서울회의|서울 회의/.test(q))return 'aria:project';
    if(/task|태스크|할 일|할일|미완료/.test(q))return 'aria:task';
    if(/d-day|디데이/.test(q))return 'aria:dday';
    if(/일정/.test(q))return 'aria:schedule';
    if(/이번 주|주간/.test(q))return 'aria:week';
    if(/이번 달|월간/.test(q))return 'aria:month';
    if(/브리핑|출근/.test(q))return 'aria:briefing';
    if(/오늘/.test(q))return 'aria:today';
    return null;
  }
  function setVoiceUi(mode,message){
    if(voiceMic)voiceMic.classList.toggle('listening',mode==='listening');
    if(voiceMic)voiceMic.setAttribute('aria-pressed',mode==='listening'?'true':'false');
    if(voiceDot)voiceDot.classList.toggle('on',mode==='listening');
    if(voiceState)voiceState.textContent=message;
  }
  if(SpeechRecognition&&voiceMic){
    recognition=new SpeechRecognition();
    recognition.lang='ko-KR';
    recognition.interimResults=false;
    recognition.continuous=false;
    recognition.maxAlternatives=1;
    if(voiceSupport)voiceSupport.textContent='음성인식 사용 가능 · 마이크 권한이 필요할 수 있습니다.';
    recognition.onstart=()=>{voiceListening=true;setVoiceUi('listening','듣고 있습니다…');if(voiceTranscript)voiceTranscript.textContent='명령을 말씀하세요.';};
    recognition.onresult=e=>{
      const text=e.results?.[0]?.[0]?.transcript||'';
      if(voiceTranscript)voiceTranscript.textContent='인식: '+text;
      const action=resolveVoiceAction(text);
      if(action){setVoiceUi('ready','명령 인식 · '+action);executeOfficeAction(action,'voice');}
      else setVoiceUi('ready','명령을 찾지 못했습니다');
    };
    recognition.onerror=e=>{setVoiceUi('ready','음성인식 오류');if(voiceTranscript)voiceTranscript.textContent=e.error==='not-allowed'?'마이크 권한을 확인해 주세요.':'다시 눌러 말씀해 주세요. ('+e.error+')';};
    recognition.onend=()=>{voiceListening=false;if(voiceMic)voiceMic.classList.remove('listening');if(voiceDot)voiceDot.classList.remove('on');};
    voiceMic.addEventListener('click',()=>{try{if(voiceListening)recognition.stop();else recognition.start();}catch(e){}});
  }else{
    if(voiceSupport)voiceSupport.textContent='이 브라우저는 Web Speech 음성인식을 지원하지 않습니다. 메뉴 ACTION은 정상 사용 가능합니다.';
    if(voiceMic){voiceMic.disabled=true;voiceMic.classList.add('unsupported');}
  }

  // ===== HOME 5차 · TASK 업무관리 (AI OFFICE 전용 localStorage) =====
  const TASK_STORAGE_KEY='ipma_ai_office_tasks_v1';
  let taskFilter='all';

  const taskSeed=[
    {id:'seed-member-plan',title:'회원등급안 준비',due:'2026-09-04',priority:'high',project:'서울 전략회의',done:false,createdAt:'2026-09-02T00:00:00+09:00'},
    {id:'seed-fee-plan',title:'회비 A/B/C안 작성',due:'2026-09-04',priority:'high',project:'서울 전략회의',done:false,createdAt:'2026-09-02T00:00:00+09:00'},
    {id:'seed-org-chart',title:'조직도 준비',due:'2026-09-04',priority:'normal',project:'서울 전략회의',done:false,createdAt:'2026-09-02T00:00:00+09:00'},
    {id:'seed-spark-vision',title:'SPARK 비전 준비',due:'2026-09-04',priority:'normal',project:'서울 전략회의',done:false,createdAt:'2026-09-02T00:00:00+09:00'},
    {id:'seed-tab-check',title:'Galaxy Tab 자료 점검',due:'2026-09-04',priority:'normal',project:'서울 전략회의',done:false,createdAt:'2026-09-02T00:00:00+09:00'}
  ];

  function loadTasks(){
    try{
      const raw=localStorage.getItem(TASK_STORAGE_KEY);
      if(!raw){ localStorage.setItem(TASK_STORAGE_KEY,JSON.stringify(taskSeed)); return [...taskSeed]; }
      const parsed=JSON.parse(raw);
      return Array.isArray(parsed)?parsed:[...taskSeed];
    }catch(e){ return [...taskSeed]; }
  }
  function saveTasks(tasks){
    try{ localStorage.setItem(TASK_STORAGE_KEY,JSON.stringify(tasks)); }catch(e){}
  }
  function esc(v){ return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function priorityLabel(v){ return v==='high'?'중요':v==='low'?'낮음':'보통'; }
  function renderTasks(){
    const list=document.getElementById('taskList'); if(!list)return;
    const tasks=loadTasks();
    const visible=tasks.filter(t=>taskFilter==='all'||(taskFilter==='done'?t.done:!t.done));
    document.getElementById('taskTotal').textContent=tasks.length;
    document.getElementById('taskOpen').textContent=tasks.filter(t=>!t.done).length;
    document.getElementById('taskDone').textContent=tasks.filter(t=>t.done).length;
    if(!visible.length){ list.innerHTML='<div class="task-empty">표시할 TASK가 없습니다.</div>'; return; }
    list.innerHTML=visible.map(t=>`<div class="task-item ${t.done?'done':''}" data-task-id="${esc(t.id)}">
      <label class="task-check"><input type="checkbox" ${t.done?'checked':''} data-task-toggle><span></span></label>
      <div class="task-copy"><b>${esc(t.title)}</b><small>${t.due?'마감 '+esc(t.due):'마감일 없음'} · ${esc(t.project||'일반')}</small></div>
      <em class="priority ${esc(t.priority||'normal')}">${priorityLabel(t.priority)}</em>
      <button type="button" class="task-delete" data-task-delete aria-label="TASK 삭제">삭제</button>
    </div>`).join('');
  }
  function addTask(data){ const tasks=loadTasks(); tasks.unshift(data); saveTasks(tasks); renderTasks(); }
  function updateTask(id,patch){ const tasks=loadTasks().map(t=>t.id===id?{...t,...patch}:t); saveTasks(tasks); renderTasks(); }
  function deleteTask(id){ const tasks=loadTasks().filter(t=>t.id!==id); saveTasks(tasks); renderTasks(); }

  const taskForm=document.getElementById('taskForm');
  if(taskForm) taskForm.addEventListener('submit',e=>{
    e.preventDefault();
    const title=document.getElementById('taskTitle').value.trim(); if(!title)return;
    addTask({id:'task-'+Date.now(),title,due:document.getElementById('taskDue').value,priority:document.getElementById('taskPriority').value,project:document.getElementById('taskProject').value,done:false,createdAt:new Date().toISOString()});
    taskForm.reset(); document.getElementById('taskPriority').value='normal'; document.getElementById('taskProject').value='서울 전략회의';
  });
  const taskList=document.getElementById('taskList');
  if(taskList) taskList.addEventListener('change',e=>{
    const row=e.target.closest('[data-task-id]'); if(row&&e.target.matches('[data-task-toggle]')) updateTask(row.dataset.taskId,{done:e.target.checked});
  });
  if(taskList) taskList.addEventListener('click',e=>{
    const row=e.target.closest('[data-task-id]'); if(row&&e.target.matches('[data-task-delete]')) deleteTask(row.dataset.taskId);
  });
  document.querySelectorAll('[data-task-filter]').forEach(btn=>btn.addEventListener('click',()=>{
    taskFilter=btn.dataset.taskFilter; document.querySelectorAll('[data-task-filter]').forEach(x=>x.classList.toggle('active',x===btn)); renderTasks();
  }));
  renderTasks();

  // ===== HOME 6차 · PROJECT 업무관리 (AI OFFICE 전용 localStorage) =====
  const PROJECT_STORAGE_KEY='ipma_ai_office_project_seoul_v1';
  const PROJECT_RECORDS_KEY='ipma_ai_office_project_seoul_records_v1';
  const projectSeed={purpose:'국제드론순찰대의 정체성 · 조직체계 · 회원제도 · 회비 · AI 사무국 · SPARK · 향후 공동사업을 검토하고 실행 방향을 정리한다.',status:'준비',location:'서울',participants:'확정 후 입력',materials:'조직도 · 회원등급안 · 회비안 · SPARK 비전 · Galaxy Tab 자료'};
  const recordSeed={decisions:[],unresolved:[],followups:[]};

  function loadProject(){
    try{const raw=localStorage.getItem(PROJECT_STORAGE_KEY);return raw?{...projectSeed,...JSON.parse(raw)}:{...projectSeed};}catch(e){return {...projectSeed};}
  }
  function saveProject(data){try{localStorage.setItem(PROJECT_STORAGE_KEY,JSON.stringify(data));}catch(e){}}
  function loadProjectRecords(){
    try{const raw=localStorage.getItem(PROJECT_RECORDS_KEY);const parsed=raw?JSON.parse(raw):{};return {...recordSeed,...parsed};}catch(e){return {...recordSeed};}
  }
  function saveProjectRecords(data){try{localStorage.setItem(PROJECT_RECORDS_KEY,JSON.stringify(data));}catch(e){}}

  function renderProjectBasics(){
    const p=loadProject();
    const map={projectPurpose:'purpose',projectStatus:'status',projectLocation:'location',projectParticipants:'participants',projectMaterials:'materials'};
    Object.entries(map).forEach(([id,key])=>{const el=document.getElementById(id);if(el)el.value=p[key]||'';});
    const badge=document.getElementById('projectStatusBadge'); if(badge)badge.textContent=p.status||'준비';
  }
  function renderProjectTasks(){
    const tasks=loadTasks().filter(t=>t.project==='서울 전략회의');
    const done=tasks.filter(t=>t.done).length;
    const total=tasks.length;
    const progress=total?Math.round(done/total*100):0;
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    set('projectTaskTotal',total);set('projectTaskDone',done);set('projectProgressText',progress+'%');
    const bar=document.getElementById('projectProgressBar'); if(bar)bar.style.width=progress+'%';
    const list=document.getElementById('projectTaskList'); if(!list)return;
    list.innerHTML=tasks.length?tasks.map(t=>`<div class="project-task-row ${t.done?'done':''}"><span>${t.done?'✓':'○'}</span><p><b>${esc(t.title)}</b><small>${t.due?'마감 '+esc(t.due):'마감일 없음'} · ${priorityLabel(t.priority)}</small></p><em>${t.done?'완료':'진행'}</em></div>`).join(''):'<div class="task-empty">연결된 TASK가 없습니다.</div>';
  }
  function renderProjectRecords(){
    const records=loadProjectRecords();
    document.querySelectorAll('[data-record-kind]').forEach(col=>{
      const kind=col.dataset.recordKind;
      const list=col.querySelector('.record-list');
      const items=Array.isArray(records[kind])?records[kind]:[];
      list.innerHTML=items.length?items.map((item,i)=>`<div class="record-item"><span>${String(i+1).padStart(2,'0')}</span><p>${esc(item.text)}</p><button type="button" data-record-delete="${i}" aria-label="삭제">삭제</button></div>`).join(''):'<div class="record-empty">아직 기록이 없습니다.</div>';
    });
  }
  const projectSave=document.getElementById('projectSave');
  if(projectSave)projectSave.addEventListener('click',()=>{
    const data={purpose:document.getElementById('projectPurpose').value.trim(),status:document.getElementById('projectStatus').value,location:document.getElementById('projectLocation').value.trim(),participants:document.getElementById('projectParticipants').value.trim(),materials:document.getElementById('projectMaterials').value.trim()};
    saveProject(data);renderProjectBasics();
    const note=document.getElementById('projectSaveNote');if(note){note.textContent='저장 완료 · AI OFFICE 전용 localStorage';setTimeout(()=>note.textContent='AI OFFICE 전용 localStorage 저장 · Supabase 쓰기 없음',1800);}
  });
  document.querySelectorAll('.record-form').forEach(form=>form.addEventListener('submit',e=>{
    e.preventDefault();const col=form.closest('[data-record-kind]');const kind=col.dataset.recordKind;const input=form.querySelector('input');const text=input.value.trim();if(!text)return;
    const records=loadProjectRecords();records[kind]=Array.isArray(records[kind])?records[kind]:[];records[kind].push({text,createdAt:new Date().toISOString()});saveProjectRecords(records);input.value='';renderProjectRecords();
  }));
  document.querySelectorAll('.record-list').forEach(list=>list.addEventListener('click',e=>{
    const btn=e.target.closest('[data-record-delete]');if(!btn)return;const col=list.closest('[data-record-kind]');const kind=col.dataset.recordKind;const records=loadProjectRecords();const i=Number(btn.dataset.recordDelete);if(Array.isArray(records[kind]))records[kind].splice(i,1);saveProjectRecords(records);renderProjectRecords();
  }));

  // TASK 변경 시 PROJECT 진행률도 즉시 갱신
  if(taskList){taskList.addEventListener('change',()=>setTimeout(renderProjectTasks,0));taskList.addEventListener('click',()=>setTimeout(renderProjectTasks,0));}
  if(taskForm)taskForm.addEventListener('submit',()=>setTimeout(renderProjectTasks,0));
  renderProjectBasics();renderProjectTasks();renderProjectRecords();


  // ===== HOME 7차 · 회의관리 (AI OFFICE 전용 localStorage) =====
  const MEETING_STORAGE_KEY='ipma_ai_office_meeting_seoul_v1';
  const MEETING_RECORDS_KEY='ipma_ai_office_meeting_seoul_records_v1';
  const meetingSeed={date:'2026-09-04',time:'13:30',location:'서울',status:'준비',purpose:'국제드론순찰대의 정체성 · 조직체계 · 회원제도 · 회비 · AI 사무국 · SPARK · 향후 공동사업의 실행 방향을 정리한다.',participants:'확정 후 입력',materials:'조직도 · 회원등급안 · 회비안 · SPARK 비전 · Galaxy Tab 자료',nextMeetingDate:'',nextMeetingMemo:''};
  const meetingRecordSeed={
    agenda:[
      {text:'국제드론순찰대 정체성과 조직체계 검토'},
      {text:'무료회원 · 유료회원 · 회비 운영안 검토'},
      {text:'AI 사무국 · SPARK · 향후 공동사업 검토'}
    ],
    questions:[],decisionNeeds:[
      {text:'회원등급 및 회비 운영 방향'},
      {text:'임원 종류 · 권한 · 책임 · 임기 운영 방향'}
    ],decisions:[],unresolved:[],followups:[]
  };
  function loadMeeting(){try{const raw=localStorage.getItem(MEETING_STORAGE_KEY);return raw?{...meetingSeed,...JSON.parse(raw)}:{...meetingSeed};}catch(e){return {...meetingSeed};}}
  function saveMeeting(data){try{localStorage.setItem(MEETING_STORAGE_KEY,JSON.stringify(data));}catch(e){}}
  function loadMeetingRecords(){try{const raw=localStorage.getItem(MEETING_RECORDS_KEY);const parsed=raw?JSON.parse(raw):{};const out={...meetingRecordSeed,...parsed};Object.keys(meetingRecordSeed).forEach(k=>out[k]=Array.isArray(out[k])?out[k]:[]);return out;}catch(e){return JSON.parse(JSON.stringify(meetingRecordSeed));}}
  function saveMeetingRecords(data){try{localStorage.setItem(MEETING_RECORDS_KEY,JSON.stringify(data));}catch(e){}}
  function renderMeetingBasics(){
    const m=loadMeeting();
    const map={meetingDate:'date',meetingTime:'time',meetingLocation:'location',meetingStatus:'status',meetingPurpose:'purpose',meetingParticipants:'participants',meetingMaterials:'materials',nextMeetingDate:'nextMeetingDate',nextMeetingMemo:'nextMeetingMemo'};
    Object.entries(map).forEach(([id,key])=>{const el=document.getElementById(id);if(el)el.value=m[key]||'';});
    const badge=document.getElementById('meetingStatusBadge');if(badge)badge.textContent=m.status||'준비';
  }
  function renderMeetingRecords(){
    const records=loadMeetingRecords();
    document.querySelectorAll('[data-meeting-kind]').forEach(box=>{
      const kind=box.dataset.meetingKind;const list=box.querySelector('.meeting-item-list');const items=records[kind]||[];
      list.innerHTML=items.length?items.map((item,i)=>{
        const detail=kind==='followups'?`<small>${item.owner?'담당 '+esc(item.owner):'담당 미정'}${item.due?' · 마감 '+esc(item.due):''}</small>`:'';
        return `<div class="meeting-item"><span>${String(i+1).padStart(2,'0')}</span><p><b>${esc(item.text)}</b>${detail}</p><button type="button" data-meeting-delete="${i}">삭제</button></div>`;
      }).join(''):'<div class="meeting-empty">아직 기록이 없습니다.</div>';
    });
  }
  const meetingSave=document.getElementById('meetingSave');
  if(meetingSave)meetingSave.addEventListener('click',()=>{
    const old=loadMeeting();const data={...old,date:document.getElementById('meetingDate').value,time:document.getElementById('meetingTime').value,location:document.getElementById('meetingLocation').value.trim(),status:document.getElementById('meetingStatus').value,purpose:document.getElementById('meetingPurpose').value.trim(),participants:document.getElementById('meetingParticipants').value.trim(),materials:document.getElementById('meetingMaterials').value.trim()};
    saveMeeting(data);renderMeetingBasics();const n=document.getElementById('meetingSaveNote');if(n){n.textContent='저장 완료 · AI OFFICE 전용 localStorage';setTimeout(()=>n.textContent='AI OFFICE 전용 localStorage · Supabase 쓰기 없음',1800);}
  });
  document.querySelectorAll('.meeting-item-form').forEach(form=>form.addEventListener('submit',e=>{
    e.preventDefault();const box=form.closest('[data-meeting-kind]');const kind=box.dataset.meetingKind;const input=form.querySelector('input');const text=input.value.trim();if(!text)return;const records=loadMeetingRecords();records[kind].push({text,createdAt:new Date().toISOString()});saveMeetingRecords(records);input.value='';renderMeetingRecords();
  }));
  document.querySelectorAll('.meeting-followup-form').forEach(form=>form.addEventListener('submit',e=>{
    e.preventDefault();const text=form.querySelector('.followup-text').value.trim();if(!text)return;const records=loadMeetingRecords();records.followups.push({text,owner:form.querySelector('.followup-owner').value.trim(),due:form.querySelector('.followup-due').value,createdAt:new Date().toISOString()});saveMeetingRecords(records);form.reset();renderMeetingRecords();
  }));
  document.querySelectorAll('.meeting-item-list').forEach(list=>list.addEventListener('click',e=>{
    const btn=e.target.closest('[data-meeting-delete]');if(!btn)return;const box=list.closest('[data-meeting-kind]');const kind=box.dataset.meetingKind;const records=loadMeetingRecords();records[kind].splice(Number(btn.dataset.meetingDelete),1);saveMeetingRecords(records);renderMeetingRecords();
  }));
  const nextMeetingSave=document.getElementById('nextMeetingSave');
  if(nextMeetingSave)nextMeetingSave.addEventListener('click',()=>{const m=loadMeeting();m.nextMeetingDate=document.getElementById('nextMeetingDate').value;m.nextMeetingMemo=document.getElementById('nextMeetingMemo').value.trim();saveMeeting(m);nextMeetingSave.textContent='저장 완료';setTimeout(()=>nextMeetingSave.textContent='다음 회의 저장',1500);});

  const meetingSyncProject=document.getElementById('meetingSyncProject');
  if(meetingSyncProject)meetingSyncProject.addEventListener('click',()=>{
    const mr=loadMeetingRecords();const pr=loadProjectRecords();
    const merge=(target,items,mapper)=>{const existing=new Set(target.map(x=>String(x.text||'').trim()));items.forEach(item=>{const v=mapper(item);if(v.text&&!existing.has(v.text.trim())){target.push(v);existing.add(v.text.trim());}});};
    merge(pr.decisions,mr.decisions,x=>({text:x.text,source:'meeting',createdAt:x.createdAt||new Date().toISOString()}));
    merge(pr.unresolved,mr.unresolved,x=>({text:x.text,source:'meeting',createdAt:x.createdAt||new Date().toISOString()}));
    merge(pr.followups,mr.followups,x=>({text:`${x.text}${x.owner?' · 담당 '+x.owner:''}${x.due?' · 마감 '+x.due:''}`,source:'meeting',createdAt:x.createdAt||new Date().toISOString()}));
    saveProjectRecords(pr);renderProjectRecords();const note=document.getElementById('meetingSyncNote');if(note){note.textContent='PROJECT 기록 반영 완료';setTimeout(()=>note.textContent='중복 문구는 자동으로 건너뜁니다.',2000);}
  });
  renderMeetingBasics();renderMeetingRecords();

  updateClock();
  renderPanel('today');
  setInterval(updateClock,30000);
})();

/* =========================================================
   AI OFFICE 2.0 v1.4.0 / HOME 17차
   Read-only integration self-check.
   ========================================================= */
function runIntegrationSelfCheck(){
  const results = [];
  const add = (name, ok, detail) => results.push({name, ok:!!ok, detail});

  add("HOME 화면", !!document.querySelector("main"), "메인 DOM");
  add("공통 ACTION", typeof window.executeOfficeAction === "function",
      "VOICE·MENU·예약 공통 실행함수");
  add("SAFE BRIDGE", typeof window.dispatchDisplayBridge === "function" ||
      typeof window.sendToDisplayBridge === "function" ||
      document.body.innerText.includes("SAFE BRIDGE"), "DISPLAY 연결 보호계층");
  add("TASK", document.body.innerText.includes("TASK"), "TASK UI");
  add("PROJECT", document.body.innerText.includes("PROJECT"), "PROJECT UI");
  add("회의", document.body.innerText.includes("회의"), "MEETING UI");
  add("예약업무", document.body.innerText.includes("예약"), "예약엔진 UI");
  add("뉴스 브리핑", document.body.innerText.includes("브리핑") || document.body.innerText.includes("뉴스"), "GEN NEWS UI");
  add("기사 준비", document.body.innerText.includes("기사"), "GEN ARTICLE UI");
  add("자료·이미지", document.body.innerText.includes("이미지") || document.body.innerText.includes("자료"), "DISPLAY 자료 UI");
  add("음악·영상", document.body.innerText.includes("음악") || document.body.innerText.includes("영상") || document.body.innerText.includes("미디어"), "MEDIA UI");

  let storageOK = false;
  try{
    const k="__ai_office_v016_probe__";
    localStorage.setItem(k,"1");
    storageOK = localStorage.getItem(k)==="1";
    localStorage.removeItem(k);
  }catch(e){}
  add("localStorage", storageOK, "기존 업무 데이터 저장소 접근");

  const box = document.getElementById("integrationResults");
  const summary = document.getElementById("integrationSummary");
  if(box){
    box.innerHTML = results.map(r =>
      `<div class="integration-result"><strong>${r.ok ? "정상" : "확인 필요"} · ${r.name}</strong><span>${r.detail}</span></div>`
    ).join("");
  }
  const pass = results.filter(r=>r.ok).length;
  if(summary){
    summary.textContent = `자체점검 ${results.length}항목 중 ${pass}항목 정상 · ${results.length-pass}항목 확인 필요`;
  }
  return results;
}

document.addEventListener("DOMContentLoaded", ()=>{
  const run = document.getElementById("runIntegrationCheck");
  const clear = document.getElementById("clearIntegrationCheck");
  if(run) run.addEventListener("click", runIntegrationSelfCheck);
  if(clear) clear.addEventListener("click", ()=>{
    const box=document.getElementById("integrationResults");
    const summary=document.getElementById("integrationSummary");
    if(box) box.innerHTML="";
    if(summary) summary.textContent="아직 점검하지 않았습니다.";
  });
});


/* =========================================================
   v1.4.0 REAL OFFICE WORKFLOW
   Read-only summaries from existing AI OFFICE localStorage data.
   No GMS/Supabase/Auth/RLS rewrite.
   ========================================================= */
function readJsonStore(key,fallback=[]){
  try{
    const raw=localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch(_){ return fallback; }
}
function fmtDateText(v){
  if(!v) return "-";
  try{
    const d=new Date(v);
    if(Number.isNaN(d.getTime())) return String(v);
    return new Intl.DateTimeFormat("ko-KR",{month:"numeric",day:"numeric",weekday:"short"}).format(d);
  }catch(_){ return String(v); }
}
function pickUpcoming(items,dateFields=["date","dueDate","startAt","scheduledAt"]){
  const now=Date.now();
  return [...items].sort((a,b)=>{
    const av=dateFields.map(k=>a?.[k]).find(Boolean);
    const bv=dateFields.map(k=>b?.[k]).find(Boolean);
    return (new Date(av||0).getTime()||0)-(new Date(bv||0).getTime()||0);
  }).filter(x=>{
    const v=dateFields.map(k=>x?.[k]).find(Boolean);
    if(!v) return true;
    const t=new Date(v).getTime();
    return !Number.isNaN(t) && t >= now-86400000;
  });
}
function ensureWorkflowPanel(){
  let el=document.getElementById("realWorkflowPanel");
  if(el) return el;
  el=document.createElement("section");
  el.id="realWorkflowPanel";
  el.className="office-card";
  el.style.marginTop="14px";
  const host=document.querySelector("main")||document.body;
  host.appendChild(el);
  return el;
}
function renderWorkflow(title,kicker,rows,footer=""){
  const el=ensureWorkflowPanel();
  const safeRows=(rows&&rows.length?rows:[["안내","현재 등록된 데이터가 없습니다."]]);
  el.innerHTML=`
    <div class="section-head">
      <div><span class="eyebrow">${kicker}</span><h2>${title}</h2></div>
      <span class="version-chip">v1.4.0</span>
    </div>
    <div class="workflow-grid">
      ${safeRows.map(([a,b,c])=>`<article class="workflow-row"><strong>${escapeHtml(String(a??""))}</strong><span>${escapeHtml(String(b??""))}</span>${c?`<small>${escapeHtml(String(c))}</small>`:""}</article>`).join("")}
    </div>
    ${footer?`<p class="safe-note">${escapeHtml(footer)}</p>`:""}
  `;
  el.scrollIntoView({behavior:"smooth",block:"start"});
}
function todayWorkflow(){
  const tasks=readJsonStore("ipma_ai_office_tasks_v1",[]);
  const projects=readJsonStore("ipma_ai_office_projects_v1",[]);
  const meetings=readJsonStore("ipma_ai_office_meetings_v1",[]);
  const schedules=readJsonStore("ipma_ai_office_schedules_v1",[]);
  const activeTasks=tasks.filter(x=>!["done","completed","완료"].includes(String(x.status||"").toLowerCase()));
  const rows=[
    ["오늘 핵심 TASK", activeTasks[0]?.title || activeTasks[0]?.name || "등록된 TASK 없음", activeTasks[0]?.dueDate?`마감 ${fmtDateText(activeTasks[0].dueDate)}`:""],
    ["진행 PROJECT", projects.find(x=>!["done","completed","완료"].includes(String(x.status||"").toLowerCase()))?.title || projects[0]?.title || "등록된 PROJECT 없음",""],
    ["다가오는 회의", pickUpcoming(meetings)[0]?.title || "등록된 회의 없음", pickUpcoming(meetings)[0]?.date?fmtDateText(pickUpcoming(meetings)[0].date):""],
    ["예약 실행", schedules.filter(x=>x.active!==false).length+"건 활성",""]
  ];
  renderWorkflow("오늘의 실제 업무","ARIA · TODAY WORKFLOW",rows,"기존 AI 사무국 데이터만 읽어 요약합니다. 최종 판단과 실행은 사람이 합니다.");
}
function weekWorkflow(){
  const tasks=pickUpcoming(readJsonStore("ipma_ai_office_tasks_v1",[]),["dueDate","date"]);
  const meetings=pickUpcoming(readJsonStore("ipma_ai_office_meetings_v1",[]));
  const projects=readJsonStore("ipma_ai_office_projects_v1",[]);
  const rows=[];
  tasks.slice(0,3).forEach(x=>rows.push(["TASK",x.title||x.name||"제목 없음",x.dueDate?fmtDateText(x.dueDate):""]));
  meetings.slice(0,2).forEach(x=>rows.push(["회의",x.title||"회의",x.date?fmtDateText(x.date):""]));
  const active=projects.find(x=>!["done","completed","완료"].includes(String(x.status||"").toLowerCase()));
  if(active) rows.push(["PROJECT",active.title||"PROJECT",active.status||"진행"]);
  renderWorkflow("이번 주 중요 업무","ARIA · WEEKLY PRIORITIES",rows,"TASK·회의·PROJECT의 기존 등록정보를 우선순위용으로 모아 보여줍니다.");
}
function taskWorkflow(){
  const tasks=readJsonStore("ipma_ai_office_tasks_v1",[]);
  const rows=tasks.slice(0,8).map(x=>[x.title||x.name||"TASK",x.status||"대기",x.dueDate?`마감 ${fmtDateText(x.dueDate)}`:""]);
  renderWorkflow("TASK 업무판","ARIA · TASK",rows,"TASK 저장 구조는 변경하지 않습니다.");
}
function projectWorkflow(){
  const projects=readJsonStore("ipma_ai_office_projects_v1",[]);
  const rows=projects.slice(0,8).map(x=>[x.title||"PROJECT",x.status||"진행",x.summary||x.description||""]);
  renderWorkflow("PROJECT 현황","ARIA · PROJECT",rows,"PROJECT와 연결 TASK는 기존 저장 데이터를 그대로 사용합니다.");
}
function meetingWorkflow(){
  const meetings=pickUpcoming(readJsonStore("ipma_ai_office_meetings_v1",[]));
  const m=meetings[0];
  const tasks=readJsonStore("ipma_ai_office_tasks_v1",[]);
  const rows=[];
  if(m){
    rows.push(["회의",m.title||"회의",m.date?fmtDateText(m.date):""]);
    if(m.location) rows.push(["장소",m.location,""]);
    if(m.attendees) rows.push(["참석",Array.isArray(m.attendees)?m.attendees.join(", "):m.attendees,""]);
    if(m.agenda) rows.push(["안건",Array.isArray(m.agenda)?m.agenda.join(" · "):m.agenda,""]);
    tasks.filter(t=>String(t.meetingId||"")===String(m.id||"")).slice(0,4).forEach(t=>rows.push(["준비 TASK",t.title||t.name||"TASK",t.status||""]));
  }
  renderWorkflow("회의 준비 브리핑","ARIA · MEETING PREP",rows,"가장 가까운 회의와 연결 TASK를 읽어 준비사항을 한 화면에 모읍니다.");
}
function newsWorkflow(){
  const news=readJsonStore("ipma_ai_office_news_brief_v1",[]);
  const rows=news.slice(0,5).map(x=>[x.title||"뉴스",x.summary||x.source||"",x.priority?`우선순위 ${x.priority}`:""]);
  renderWorkflow("뉴스 브리핑","GEN · NEWS BRIEF",rows,"등록·검증된 뉴스 항목만 사용합니다. 외부 기사 자동수집·자동발행은 하지 않습니다.");
}
function articleWorkflow(){
  const drafts=readJsonStore("ipma_ai_office_article_drafts_v1",[]);
  const rows=drafts.slice(0,6).map(x=>[x.title||"기사 초안",x.status||"draft",x.summary||""]);
  renderWorkflow("기사 준비 현황","GEN · ARTICLE PREP",rows,"초안·검토·승인 단계까지만 지원하며 자동 발행하지 않습니다.");
}
function libraryWorkflow(){
  const items=readJsonStore("ipma_ai_office_display_resources_v1",[]);
  const rows=items.slice(0,8).map(x=>[x.title||x.name||"자료",x.type||"RESOURCE",x.url||x.path||""]);
  renderWorkflow("자료 보기","ARIA · RESOURCE LIBRARY",rows,"기존 등록 경로를 보여주며 원본 파일을 복제하지 않습니다.");
}
function mediaWorkflow(){
  const items=readJsonStore("ipma_ai_office_media_library_v1",[]);
  const rows=items.slice(0,8).map(x=>[x.title||x.name||"미디어",x.type||"MEDIA",x.url||x.path||""]);
  renderWorkflow("미디어 호출","GEN · MEDIA",rows,"자동재생하지 않습니다. 사용자가 선택한 항목만 실행합니다.");
}

