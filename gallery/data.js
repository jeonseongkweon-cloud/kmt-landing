/* gallery/data.js */

/**
 * ✅ 이미지 목록
 * - name: 학부모 검색용(한글 OK)
 * - src : gallery/index.html 기준 "images/파일명.jpg"
 * - tags: (선택) 검색 보조 키워드
 *
 * ⚠️ 중요: index.html이 window.GALLERY를 읽으므로 window로 내보내야 함
 */
window.GALLERY = [
  { name: "샘플", src: "images/001.jpg", tags: "유치부 수련" },
  { name: "샘플", src: "images/002.jpg", tags: "유치부 수련" },
  { name: "샘플", src: "images/003.jpg", tags: "단체" },
  { name: "샘플", src: "images/004.jpg", tags: "행사" },
  { name: "샘플", src: "images/005.jpg", tags: "심사" },
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
