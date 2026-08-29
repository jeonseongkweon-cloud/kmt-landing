# 계명태권도 CLASS v0.3.0 관리자 연결

## 1. 관리자 권한 SQL

Supabase SQL Editor에서 다음 파일을 한 번 실행한다.

`supabase/migrations/202608300300_04_google_admin.sql`

실행결과에 다음 계정이 active로 표시되면 정상이다.

`jeonseongkweon@gmail.com`

## 2. Google 로그인 확인

Supabase Dashboard에서 Authentication → Providers → Google이 활성화되어 있는지 확인한다.

## 3. Redirect URL 등록

Authentication → URL Configuration → Redirect URLs에 다음 주소를 등록한다.

- `https://계명태권도.com/class/admin/`
- `https://xn--989awo77mtwh973a.com/class/admin/`

## 4. 관리자 화면

`https://계명태권도.com/class/admin/`

Google 로그인에서 `jeonseongkweon@gmail.com` 계정을 선택한다.

등록되지 않은 다른 Google 계정은 원생정보를 읽거나 수정할 수 없다.
