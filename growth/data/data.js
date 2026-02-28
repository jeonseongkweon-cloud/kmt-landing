// growth/data/data.js
// ✅ 조회 페이지에서 window.KMT_GROWTH_DB 를 읽습니다.
// ✅ meta.updatedAt : 화면 "최신 데이터"에 표시됩니다.
// ✅ students: 수련생 데이터 배열

window.KMT_GROWTH_DB = {
  meta: {
    updatedAt: "2026-02-28 21:30"
  },
  students: [
    {
      id: "KM001",
      name: "홍길동",
      dob: "20170123",
      joined: "2025-03-01",
      totalPoints: 64300,
      streakAchieved: 2,
      lastActivity: "2026-02-28"
    },
    {
      id: "KM002",
      name: "김하늘",
      dob: "20180211",
      joined: "2025-05-12",
      totalPoints: 18250,
      streakAchieved: 0,
      lastActivity: "2026-02-27"
    }
  ]
};
