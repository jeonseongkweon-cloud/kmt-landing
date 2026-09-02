AI OFFICE 2.0 v1.4.0 · REAL OFFICE WORKFLOW

목표:
휴대폰 CONTROL 버튼이 단순 화면 이동을 넘어,
IPMA AI OFFICE에 이미 저장된 실제 업무 데이터를 읽어 Galaxy Tab에 브리핑합니다.

연결되는 업무:
- 오늘 업무: 미완료 TASK / 진행 PROJECT / 가까운 회의 / 활성 스케줄
- 이번 주: 마감 TASK / 회의 / 진행 PROJECT
- TASK: 기존 TASK 목록
- PROJECT: 기존 PROJECT 현황
- 회의 준비: 가까운 회의 + 연결 준비 TASK
- 뉴스 브리핑: 기존 검증 뉴스
- 기사 준비: 기존 기사 초안/검토 상태
- 자료 보기: 기존 등록 자료
- 미디어: 기존 등록 미디어

데이터 원칙:
- 기존 localStorage 키만 읽음
- GMS/Supabase/Auth/RLS/Realtime 구조 변경 없음
- 뉴스 자동 수집/기사 자동 발행 없음
- 최종 판단과 실행은 사람

배포:
IPMA 저장소 ai-office/ 에 index.html, app.js 두 파일만 덮어쓰기.
Mobile CONTROL v1.3.0 / 계명태권도 DISPLAY v1.2.2는 변경하지 않음.
