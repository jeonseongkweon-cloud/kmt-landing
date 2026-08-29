# 계명태권도 CLASS SYSTEM · WORK 4차 작업기록

버전: CLASS v0.4.0

작업일: 2026-08-30

## 완료내용

- 오늘 수업 수업부 선택
- 수업부별 재원생 자동표시
- 사진·이름·KM번호 중심 학생카드
- 카드 클릭 즉시 출석 및 시간 자동기록
- 출석·지각·결석 상태 수정
- 출석 취소 후 재처리
- 체험생 이름·메모 기록 및 취소
- 오늘 수업별 실시간 현황 집계
- 동일 학생 중복 출석 방지
- 새로고침 후 출석기록 복원
- 출석 학생만 보기
- 수업 종료 및 다시 열기
- 월간·누적 출석 계산용 View 추가
- Google 관리자 인증과 RLS 적용
- CLASS 시스템 버전 v0.4.0 갱신

## 개인정보 보호

출석 학생카드에는 사진, 이름, KM번호, 출석상태만 표시한다.
보호자 연락처, 주소, 회비, 생년월일은 출석·TV 화면에 표시하지 않는다.

## 적용 전 필수

Supabase SQL Editor에서 `202608300400_05_attendance.sql`을 한 번 실행한 뒤 홈페이지 파일을 덮어쓴다.

Supabase Authentication → URL Configuration → Redirect URLs에
`https://xn--989awo77mtwh973a.com/class/attendance/`를 추가한다.

## 다음 차수

WORK 5차에서 CLASS STAR, 칭찬, 오늘의 챔피언 시스템을 구축한다.
