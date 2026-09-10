// 계명태권도 CLASS 회비관리 SYSTEM
// MIGRATION AUDIT v1.4
// 최신 기준: 2026-09-10 사용자가 제공한 2026년 회비대장.xlsx의 비회색 수련생만 현재 관리대상.
// 회색 글자/최신명단 외 학생은 현재 미납 판정·문자·이관 점검 대상에서 제외한다.
window.KMT_TUITION_MIGRATION_AUDIT = {
  excludedVirtualStudents: [
    { name:'아리아', reason:'테스트용 가상 원생 · 회비 납부 대상 아님' }
  ],
  currentWithoutLegacyLedger: [
    '김관우','김서호','민서준','박서우','박연우','박윤아','박이도','박준우','서연재','송정현','이수형','이승우','황성운'
  ],
  currentGapGroups: {
    likely2026NewOrLedgerGap: [
      '김서호','박서우','박연우','박윤아','박이도','서연재','황성운'
    ],
    existingBefore2026: ['박준우'],
    autoMatchedNeedReview: ['김관우','민서준','송정현','이수형','이승우']
  },
  currentGapEvidence: {
    '김관우': { match:'자동일치', joined:'2026-03-03', feeDueDay:30 },
    '김서호': { match:'신규/누락', joined:'2026-03-11', feeDueDay:30 },
    '민서준': { match:'자동일치', joined:'2026-03-06', feeDueDay:30 },
    '박서우': { match:'신규/누락', joined:'2026-04-27', feeDueDay:7, householdHint:'박연우와 한 가정 확정' },
    '박연우': { match:'신규/누락', joined:'2026-04-27', feeDueDay:30, householdHint:'박서우와 한 가정 확정' },
    '박윤아': { match:'신규/누락', joined:'2026-04-02', feeDueDay:30, householdHint:'박재희와 한 가정 확정' },
    '박이도': { match:'신규/누락', joined:'2026-05-19', feeDueDay:19, monthlyFee:165000 },
    '박준우': { match:'신규/누락', joined:'2021-11-09', feeDueDay:9, monthlyFee:140000 },
    '서연재': { match:'신규/누락', joined:'2026-03-27', feeDueDay:30 },
    '송정현': { match:'자동일치', joined:'2026-03-03', feeDueDay:3, review:'생년월일 충돌' },
    '이수형': { match:'자동일치', joined:'2026-03-03', feeDueDay:30, householdHint:'이주형과 한 가정 확정' },
    '이승우': { match:'자동일치', joined:'2026-03-03', feeDueDay:30 },
    '황성운': { match:'신규/누락', joined:'2026-03-27', feeDueDay:30 },
    '홍나경': { match:'최신 회비대장', feeDueDay:11, review:'현재 CLASS students 테이블에는 없음' },
    '한정민': { match:'최신 회비대장', feeDueDay:8, householdHint:'한지아와 한 가정' },
    '한지아': { match:'최신 회비대장', feeDueDay:8, householdHint:'한정민과 한 가정' }
  },
  latestRosterOnlyNotClass: ['홍나경','한정민','한지아'],
  confirmedHouseholds: [
    { members:['박서우','박연우'], source:'user-confirmed' },
    { members:['박재희','박윤아'], source:'user-confirmed' },
    { members:['이수형','이주형'], source:'user-confirmed' },
    { members:['한정민','한지아'], source:'latest-roster' }
  ],
  // 회색 글자와 최신명단 외 과거 행은 현재 이관판에는 올리지 않는다. 원본 장부자료 자체는 삭제하지 않는다.
  legacyKnownWithdrawn: [],
  legacyNotInCurrentReview: [],
  ignoredLatestWorkbookGray: [
    '김규민','김예성','김예담','김재윤','김민준','백지운','윤유은','윤우진','윤희성','이서안','이승재','최태오'
  ],
  rules: {
    migrationSafety: '확정 전 이관대기 유지',
    noAutoArrears: true,
    noAutoSms: true,
    historicalRowsPreserved: true,
    candidateLabelsAreNotFinal: true,
    confirmedHouseholdsMayMerge: true,
    latestRosterOnly: true,
    ignoreGrayWorkbookRows: true
  }
};

// 이관 입력판의 보조기능은 별도 파일로 분리해 로드한다.
(function(){
  if(document.querySelector('script[data-kmt-migration-bulk-helper]')) return;
  const s=document.createElement('script');
  s.src='./migration-bulk-helper-v1.js?v=2';
  s.dataset.kmtMigrationBulkHelper='1';
  document.head.appendChild(s);
})();
