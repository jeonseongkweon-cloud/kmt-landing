/* gallery/data.js */

/**
 * ✅ 이미지 목록
 * - name: 학부모 검색용(한글 OK)
 * - src : 실제 파일 경로 (gallery/index.html 기준 "images/파일명.jpg")
 * - tags: (선택) 검색 보조 키워드 (띄어쓰기/쉼표로 아무거나)
 */
const GALLERY = [
  // 예시(이대로 두고 src만 실제 파일명으로 바꾸세요)
  { name: "이서안", src: "images/seoan01.jpg", tags: "유치부,수련" },
  { name: "이서안", src: "images/seoan02.jpg", tags: "유치부,수련" },
  { name: "유사루", src: "images/yusaru01.jpg", tags: "유치부" },
  { name: "윤겸",   src: "images/yungyeom01.jpg", tags: "학교체육" },

  // ✅ 단체/행사도 이름으로 검색 가능
  { name: "단체_유치부", src: "images/group_yu01.jpg", tags: "단체,유치부" },
];

/**
 * ✅ 동영상 목록 (사진 아래에 표시)
 * - title: 화면에 표시할 제목
 * - url  : 유튜브 주소(공유링크/일반링크 아무거나 OK)
 */
const VIDEOS = [
  { title: "계명태권도 소개", url: "https://www.youtube.com/watch?v=zuwIu8hx6bM" },
  // { title: "시범 영상", url: "https://youtu.be/D3kDXF-sNJA" },
];
