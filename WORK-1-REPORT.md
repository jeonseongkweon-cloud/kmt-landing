# 계명태권도 CLASS SYSTEM · WORK 1차 작업기록

작업일: 2026-08-30

## 작업범위

- 기존 홈페이지 구조 및 정상 기능 보존
- `/class/` 독립 개발기반 추가
- PWA manifest의 배포경로를 상대경로로 정리
- 서비스워커 아이콘 경로 수정 및 CLASS 기본파일 캐시 등록
- 기존 Google Sheet, LIVE BOARD, 성장포인트, 갤러리 데이터 로직 미변경

## 수정 파일

- `manifest.webmanifest`
- `service-worker.js`

## 추가 파일

- `class/index.html`
- `class/class.css`
- `class/config.js`
- `class/class.js`
- `WORK-1-REPORT.md`

## 이번 차수에서 하지 않은 작업

- Supabase 연결 및 테이블 생성
- 원생 68명 Import
- 기존 Google Sheet 데이터 전환
- 출석, STAR, 칭찬, 미션 기능 구현
- 기존 LIVE BOARD 또는 갤러리 내부 데이터 수정

## 확인주소

- 기존 홈페이지: `/`
- CLASS 개발기반: `/class/`

## 다음 차수

WORK 2차에서 Supabase 최종 스키마와 68명 원생 이전을 진행한다.
