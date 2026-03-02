/* gallery/data.js */

/**
 * ✅ 이미지 목록
 * - name: 학부모 검색용(한글 OK)
 * - src : 실제 파일 경로 (gallery/index.html 기준 "images/파일명.jpg")
 * - tags: (선택) 검색 보조 키워드
 */
window.GALLERY = [
  // 지금 올려둔 파일(001~005) 기준 예시
  // ✅ name은 학부모가 검색할 “한글 이름”으로 바꾸면 됩니다.
  { name: "001", src: "images/001.jpg", tags: "유치부 수련" },
  { name: "002", src: "images/002.jpg", tags: "유치부 수련" },
  { name: "003", src: "images/003.jpg", tags: "유치부 수련" },
  { name: "004", src: "images/004.jpg", tags: "유치부 수련" },
  { name: "005", src: "images/005.jpg", tags: "유치부 수련" },

  // 예)
  // { name: "김우리", src: "images/kimwoori01.jpg", tags: "심사" },
  // { name: "단체_유치부", src: "images/group_yu01.jpg", tags: "단체 유치부" },
];

/**
 * ✅ 동영상 목록 (사진 아래에 표시)
 * - title: 화면에 표시할 제목
 * - url  : 유튜브 주소(공유링크/일반링크 아무거나 OK)
 */
window.VIDEOS = [
  { title: "계명태권도 소개", url: "https://www.youtube.com/watch?v=zuwIu8hx6bM" },
  // { title: "시범 영상", url: "https://youtu.be/D3kDXF-sNJA" },
];
