// 계명태권도 CLASS 회비관리 SYSTEM
// MIGRATION AUDIT v1.0
// 실제 회비 이관 전 대조용 메타데이터. 미납 판정/문자발송에는 사용하지 않는다.
window.KMT_TUITION_MIGRATION_AUDIT = {
  excludedVirtualStudents: [
    { name:'아리아', reason:'테스트용 가상 원생 · 회비 납부 대상 아님' }
  ],
  currentWithoutLegacyLedger: [
    '김관우','김서호','민서준','박서우','박연우','박윤아','박이도','박준우','서연재','송정현',
    '이서준','이서휘','이수형','이승우','이시호','이유준','이유하','이주안','이지안','최태오','황성운'
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
    historicalRowsPreserved: true
  }
};
