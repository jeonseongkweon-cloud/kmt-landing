# CLASS v0.8.0 문자 발송대기 설치

1. Supabase SQL Editor에서 `202608300800_09_sms_outbox.sql` 전체를 한 번 실행합니다.
2. 홈페이지 최상위 폴더에 WORK8 ZIP의 폴더와 파일을 그대로 덮어씁니다.
3. Supabase Authentication → URL Configuration → Redirect URLs에 아래 주소를 추가합니다.

`https://xn--989awo77mtwh973a.com/class/sms/`

4. `https://계명태권도.com/class/sms/`에 Google 관리자 계정으로 로그인합니다.
5. 원생관리에서 시험할 학생의 보호자 연락처와 `출석문자 수신`을 확인합니다.
6. 출석 화면에서 그 학생을 출석 처리한 뒤 문자대기 화면에 한 건이 생기는지 확인합니다.
7. 같은 학생을 다시 출석 처리해도 같은 보호자에게 대기 건수가 늘지 않는지 확인합니다.

주의: v0.8.0은 대기 요청만 생성합니다. 실제 휴대폰 SIM 문자 발송은 v0.9.0 WORK9에서 연결합니다.
