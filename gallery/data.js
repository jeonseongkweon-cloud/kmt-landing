/* gallery/data.js */

/**
 * ✅ 이미지 목록
 * - name: 검색용(한글 OK)  ※ 동명이인은 같은 이름 여러 장 OK
 * - src : 실제 파일 경로 (gallery/index.html 기준 "images/파일명.jpg")
 * - tags: (선택) 검색 보조 키워드 (띄어쓰기/쉼표로 아무거나)
 *
 * ⚠️ 중요:
 * - 지금 GitHub에 올라간 파일은 001.jpg ~ 005.jpg 입니다.
 * - 그래서 src는 반드시 "images/001.jpg" 이런 식으로 맞춰야 합니다.
 */
const GALLERY = [
  { name: "001", src: "images/001.jpg", tags: "샘플,1" },
  { name: "002", src: "images/002.jpg", tags: "샘플,2" },
  { name: "003", src: "images/003.jpg", tags: "샘플,3" },
  { name: "004", src: "images/004.jpg", tags: "샘플,4" },
  { name: "005", src: "images/005.jpg", tags: "샘플,5" },
];

/**
 * ✅ 동영상 목록 (사진 아래에 표시)
 * - title: 화면에 표시할 제목
 * - url  : 유튜브 주소(공유링크/일반링크 아무거나 OK)
 */
const VIDEOS = [
  { title: "계명태권도 소개", url: "https://www.youtube.com/watch?v=zuwIu8hx6bM" },
  // 필요하면 여기에 추가하세요:
  // { title: "시범 영상", url: "https://youtu.be/D3kDXF-sNJA" },
];
