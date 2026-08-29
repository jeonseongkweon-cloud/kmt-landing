# CLASS v0.9.0 · WORK9 설치순서

## 1. Supabase SQL

Supabase SQL Editor에서 `202608300900_10_android_sms_sender.sql` 전체를 한 번 실행합니다.

정상 결과는 `android_sender_rpc_ready | 3`입니다.

## 2. Google 로그인 주소

Supabase Authentication → URL Configuration → Redirect URLs에 아래 주소를 추가합니다.

`kmtclass://login-callback`

기존 홈페이지 Redirect URL은 삭제하지 않습니다.

## 3. 홈페이지·앱 소스 반영

WORK9 ZIP을 기존 홈페이지 최상위 폴더에 풀어 덮어씁니다. GitHub에 반영되면 Android APK 자동 제작 작업도 함께 시작됩니다.

## 4. APK 받기

GitHub 저장소 → Actions → `Build CLASS SMS Sender APK` → 가장 최근 성공 작업 → Artifacts에서 `KMT-CLASS-SMS-SENDER-v0.9.0`을 내려받습니다.

압축을 풀면 `app-debug.apk`가 있습니다. 이 파일을 관장님 Android 휴대폰으로 옮겨 설치합니다.

## 5. 휴대폰 설정

1. SMS 권한 허용
2. 알림 권한 허용
3. Google 관리자 계정 로그인
4. 배터리 최적화 제외 허용
5. 듀얼 SIM이면 기본 문자 SIM 지정
6. 발신기 ON
7. 알림창에 발신기 ON 알림 유지 확인

## 6. 최초 안전시험

반드시 보호자 번호를 관장님 본인 번호로 임시 변경한 학생 한 명으로 시험합니다.

1. 기존 대기 1건은 아직 실제 보호자 번호라면 발신기 ON 전에 취소합니다.
2. 시험 학생을 출석 처리합니다.
3. 약 10초 이내 본인 휴대폰에 문자가 도착하는지 확인합니다.
4. 문자 발송관리 화면에서 완료 1건인지 확인합니다.
5. 같은 출석을 다시 눌러도 문자가 다시 오지 않는지 확인합니다.

실제 학부모 대상 운영은 이 시험이 모두 통과한 뒤 시작합니다.
