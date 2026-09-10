// 계명태권도 CLASS 회비관리 SYSTEM
// MIGRATION AUDIT v1.3
// 실제 회비 이관 전 대조용 메타데이터. 미납 판정/문자발송에는 사용하지 않는다.
window.KMT_TUITION_MIGRATION_AUDIT = {
  excludedVirtualStudents: [
    { name:'아리아', reason:'테스트용 가상 원생 · 회비 납부 대상 아님' }
  ],
  currentWithoutLegacyLedger: [
    '김관우','김서호','민서준','박서우','박연우','박윤아','박이도','박준우','서연재','송정현',
    '이서준','이서휘','이수형','이승우','이시호','이유준','이유하','이주안','이지안','최태오','황성운'
  ],
  currentGapGroups: {
    likely2026NewOrLedgerGap: [
      '김서호','박서우','박연우','박윤아','박이도','서연재','이서준','이서휘','이시호','이유준','이주안','이지안','최태오','황성운'
    ],
    existingBefore2026: ['박준우','이유하'],
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
    '이서준': { match:'신규/누락', joined:'2026-03-30', feeDueDay:30 },
    '이서휘': { match:'신규/누락', joined:'2026-05-12', feeDueDay:30 },
    '이수형': { match:'자동일치', joined:'2026-03-03', feeDueDay:30, householdHint:'이주형과 한 가정 확정' },
    '이승우': { match:'자동일치', joined:'2026-03-03', feeDueDay:30 },
    '이시호': { match:'신규/누락', joined:'2026-03-31', feeDueDay:30 },
    '이유준': { match:'신규/누락', joined:'2026-05-29', feeDueDay:30 },
    '이유하': { match:'신규/누락', joined:'2022-12-01', feeDueDay:17, monthlyFee:165000 },
    '이주안': { match:'신규/누락', joined:'2026-03-27', feeDueDay:30 },
    '이지안': { match:'신규/누락', joined:'2026-08-26', feeDueDay:30 },
    '최태오': { match:'신규/누락', joined:'2026-04-08', feeDueDay:30 },
    '황성운': { match:'신규/누락', joined:'2026-03-27', feeDueDay:30 }
  },
  confirmedHouseholds: [
    { members:['박서우','박연우'], source:'user-confirmed' },
    { members:['박재희','박윤아'], source:'user-confirmed' },
    { members:['이수형','이주형'], source:'user-confirmed' }
  ],
  legacyKnownWithdrawn: [
    ['김예성','김예담'],['윤유은','윤우진'],['한정민','한지아'],['이승재']
  ],
  legacyNotInCurrentReview: [
    '김규민','김민준','김재윤','박정민','백지운','윤희성','이서안','홍나경'
  ],
  rules: {
    migrationSafety: '확정 전 이관대기 유지',
    noAutoArrears: true,
    noAutoSms: true,
    historicalRowsPreserved: true,
    candidateLabelsAreNotFinal: true,
    confirmedHouseholdsMayMerge: true
  }
};

// 이관 입력판의 보조기능은 별도 파일로 분리해 로드한다.
(function(){
  if(document.querySelector('script[data-kmt-migration-bulk-helper]')) return;
  const s=document.createElement('script');
  s.src='./migration-bulk-helper-v1.js?v=1';
  s.dataset.kmtMigrationBulkHelper='1';
  document.head.appendChild(s);
})();
