# 계명태권도 CLASS SYSTEM · WORK 3차 작업기록

버전: CLASS v0.3.0

작업일: 2026-08-30

## 완료내용

- Google OAuth 관리자 로그인 화면 추가
- 관리자 허용계정 `jeonseongkweon@gmail.com` 등록 SQL 추가
- 원생 68명 목록 및 현황 집계
- 이름·KM번호 검색
- 재원·휴원·퇴원 상태 필터
- 수업부 필터 및 확인필요 필터
- 생년월일 확인대상 표시
- 수업부 미확정 대상 표시
- 원생 기본정보·수업·보호자·단증·성장포인트 조회 및 수정
- 신규 원생 추가 및 KM번호 자동 제안
- 완전삭제 기능 제외, 기록보존 원칙 유지
- CLASS 화면 버전 v0.3.0 및 원생관리 진입버튼 추가

## 보안

- 공개용 Supabase Publishable key만 사용
- Secret key와 service role key 미사용
- 관리자 허용목록과 기존 RLS를 함께 적용
- 등록되지 않은 Google 계정은 화면과 DB 양쪽에서 차단

## 적용 전 필수

1. Supabase SQL Editor에서 `202608300300_04_google_admin.sql` 실행
2. Supabase Authentication에서 Google Provider 활성화 확인
3. Redirect URLs에 `https://계명태권도.com/class/admin/` 추가
4. 홈페이지 파일 덮어쓰기

## 다음 차수

WORK 4차에서 CLASS 출석 시스템을 구축한다.
