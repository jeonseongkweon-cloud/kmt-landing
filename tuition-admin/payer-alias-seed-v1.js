// 계명태권도 CLASS 회비관리 SYSTEM
// 울산페이 수기메모 연결표 SEED v1.0
// 2026-09-10 사용자가 제공한 수기메모 5장 중 반복해서 읽히고 최신 수련생 명단과 일치하는 연결만 기본값으로 제공한다.
// 애매한 글씨는 포함하지 않는다. 동일 마스킹 이름은 서로 다른 사람일 수 있으므로 중복 payer 자체는 허용한다.
window.KMT_TUITION_PAYER_ALIAS_SEED = Object.freeze([
  {id:'seed-hand-001',payer:'안*숙',students:['전하루'],status:'confirmed',memo:'수기메모 여러 장에서 반복 확인',source:'2026-09-10 수기메모 5장'},
  {id:'seed-hand-002',payer:'주*민',students:['정은재'],status:'confirmed',memo:'수기메모 반복 확인',source:'2026-09-10 수기메모 5장'},
  {id:'seed-hand-003',payer:'이*락',students:['이윤재'],status:'confirmed',memo:'수기메모 반복 확인',source:'2026-09-10 수기메모 5장'},
  {id:'seed-hand-004',payer:'윤*석',students:['윤겸'],status:'confirmed',memo:'수기메모 반복 확인',source:'2026-09-10 수기메모 5장'},
  {id:'seed-hand-005',payer:'이*정',students:['백다현','백동훈'],status:'confirmed',memo:'수기메모 반복 확인 · 형제 합산 기록',source:'2026-09-10 수기메모 5장'},
  {id:'seed-hand-006',payer:'김*성',students:['김강민'],status:'confirmed',memo:'수기메모 반복 확인',source:'2026-09-10 수기메모 5장'},
  {id:'seed-hand-007',payer:'김*진',students:['김시율','김건하'],status:'confirmed',memo:'수기메모에서 형제 합산 30만원 기록으로 반복 확인',source:'2026-09-10 수기메모 5장'},
  {id:'seed-hand-008',payer:'박*재',students:['방서희'],status:'confirmed',memo:'수기메모 반복 확인',source:'2026-09-10 수기메모 5장'},
  {id:'seed-hand-009',payer:'신*란',students:['최지우'],status:'confirmed',memo:'수기메모 반복 확인',source:'2026-09-10 수기메모 5장'}
]);
