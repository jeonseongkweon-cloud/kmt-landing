# NEXT-01 CLASS LIVE SYNC SYSTEM

## 목표
기존 Supabase 저장 로직을 유지하면서 출석 화면, STAR 화면, 수업운영 화면, LIVE BOARD가 다른 기기의 변경을 F5 없이 반영하도록 확장한다.

## 변경
- 출석: attendance / sms_outbox / class_sessions Realtime 구독
- STAR: attendance / star_events / praise_events / champions / class_sessions Realtime 구독
- 수업운영: attendance / class_plans / class_missions / team_scores / class_sessions Realtime 구독
- LIVE BOARD: 기존 감시 테이블에 praise_events / class_sessions / team_scores 추가, debounce 600ms → 250ms
- 화면을 나갈 때 채널 해제하여 중복 구독 방지
- Realtime에 필요한 기존 테이블을 publication에 안전하게 추가하는 migration 추가

## 비변경
- 로그인/Google OAuth 로직
- 학생/보호자 데이터 구조
- 문자 발신기 처리 구조
- STAR/XP/SPARK 정책
- 다중 지도자 권한

## 테스트 포인트
1. 노트북 LIVE BOARD를 연다.
2. 휴대폰 출석 화면에서 학생 1명을 출석 처리한다.
3. F5 없이 LIVE BOARD와 STAR 출석명단이 반영되는지 확인한다.
4. 다른 기기에서 STAR +1 후 STAR 화면과 LIVE BOARD가 갱신되는지 확인한다.
5. 수업운영에서 미션/팀점수를 바꾸고 다른 수업운영 화면에 즉시 반영되는지 확인한다.
6. 수업 종료/재오픈이 다른 출석/STAR/수업운영 기기에 반영되는지 확인한다.
