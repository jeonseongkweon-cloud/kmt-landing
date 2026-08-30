# NEXT-02 완료 보고 · CLASS v1.6.0

[완료 차수]
NEXT-02 MULTI STAFF & PERMISSION SYSTEM

[핵심 변경]
- OWNER / MASTER / INSTRUCTOR / ASSISTANT 4단계 지도자 역할 추가
- Google 이메일 기반 지도자 등록·활성/중지 화면 추가: /class/staff/
- 기존 관장 관리자 계정을 OWNER로 자동 승계
- 화면별 권한 검사 RPC 추가
- 지도자 변경 audit log 추가
- 마지막 OWNER 비활성화 방지

[기본 권한]
- OWNER: 전체 + 지도자관리
- MASTER: 출석, STAR, 미션, SPARK, MVP, 수업운영, 원생관리, 문자관리
- INSTRUCTOR: 출석, STAR, 미션, SPARK, MVP, 수업운영
- ASSISTANT: 출석, LIVE BOARD

[DB 변경]
- kmt_staff_members
- kmt_staff_audit_log
- kmt_my_staff_role(), kmt_is_owner(), kmt_is_staff(), kmt_has_permission()
- kmt_get_my_staff_profile(), kmt_list_staff(), kmt_save_staff(), kmt_set_staff_active()
- 출석/STAR/수업운영 관련 역할별 RLS 정책 추가

[기존 기능 영향]
- NEXT-01 Realtime 유지
- 기존 출석/STAR/문자/SPARK 저장 로직 재작성 없음
- 기존 관장 계정은 OWNER로 유지

[테스트]
- 수정 JavaScript node --check 통과
- 지도자 관리 신규 JS 문법검사 통과
- 마지막 OWNER 보호 로직 포함

[주의]
- SQL migration을 실제 Supabase에 먼저 적용해야 새 역할 로그인이 작동함
- 기존 legacy kmt_is_admin() 의존 RPC와의 호환을 위해 OWNER/MASTER/INSTRUCTOR를 legacy admin-compatible로 유지함. 이후 각 엔진별 권한이 고도화되면 개별 permission 함수로 단계적으로 좁힐 수 있음.
