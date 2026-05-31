# GitHub 로그인 + 사용량 분석 구현 계획

> 목적: 사용자 구분 및 사용량 분석을 위해 GitHub 로그인을 도입한다.
> 결정 사항: ① Firebase Auth(GitHub provider) ② Firestore `usage` 컬렉션 ③ 로그인 필수(게이팅).
> UI 시안 출처: `socratic-learn-web-calude-design/app-v3.jsx` 의 `loggedIn` 분기 (사이드바 `sb-foot`).

## 범위 메모 (CLAUDE.md 정책과의 관계)

기존 `CLAUDE.md` 의 "1차 MVP 범위 제외: Auth/OAuth, DB/세션 저장" 정책을
사용자 합의로 일부 해제한다. 이 작업으로 **Auth(Firebase) + DB(Firestore usage)** 가
범위에 추가된다. 작업 완료 후 `CLAUDE.md` 범위 문구를 갱신할 것.

## 런타임 흐름 (변경 후)

```
브라우저(React) --signInWithPopup(GitHub)--> Firebase Auth
브라우저 --fetch + Authorization: Bearer <ID 토큰>--> Functions
Functions --verifyIdToken--> uid 확보 (무효/부재 시 401)
Functions --기록--> Firestore usage 컬렉션 {uid, endpoint, timestamp}
Functions --> Anthropic Messages API (기존과 동일)
```

## 사전 준비 (사용자가 직접 수행 - 코드로 대체 불가)

`docs/github-auth-setup.md` 의 체크리스트를 따른다. 요약:

1. GitHub OAuth App 등록 → Client ID / Client Secret
2. Firebase Console → Authentication → GitHub provider 활성화 (위 값 입력)
3. Firestore 활성화 (Native 모드)
4. Firebase 웹 앱 config 값 → 프론트 `.env.local` 의 `VITE_FIREBASE_*`

## 구현 슬라이스 (각 통과 시 커밋)

### A. 프론트 인증 레이어
- `npm install firebase`
- `frontend/src/lib/firebase.ts` - `initializeApp` + `getAuth`, config 는 `VITE_FIREBASE_*` env
- `frontend/src/state/useAuth.tsx` - Context: `onAuthStateChanged` 구독, `login()`(`signInWithPopup` + `GithubAuthProvider`), `logout()`, `user`, `getIdToken()`
- `frontend/.env.local.example` 에 `VITE_FIREBASE_*` 키 추가

### B. UI (디자인 시안 반영)
- `frontend/src/components/Sidebar.tsx` - `sb-foot` 을 `loggedIn` 분기로 교체
  - 로그아웃: 유저 아이콘 + "학습 시작을 위해 로그인이 필요해요" + `로그인` 버튼
  - 로그인: 아바타 + 사용자명 + (hover) 로그아웃 버튼
  - 기존 플랜/쿼터(`sb-quota`, `sb-upgrade`) 제거
- `frontend/src/styles/v3.css` - `sb-auth`/`sb-auth-row`/`sb-auth-avatar`/`sb-auth-title`/`sb-login`/`sb-signout` 스타일 이식
- `frontend/src/components/icons.tsx` - `signout`, `userOutline` 아이콘 추가
- `frontend/src/App.tsx` - `useAuth` 연결, 게이팅: 비로그인 시 `Hero onStart` 에서 `probe` 진입 차단(로그인 유도)

### C. 프론트 -> Functions 토큰 전달
- `frontend/src/api/claudeContent.ts` - 7개 fetch 에 `Authorization: Bearer <idToken>` 추가 (공통 헬퍼로 중복 제거)
- `frontend/src/api/stepDetailStream.ts` - 동일 적용

### D. Functions 검증 + 사용량 기록
- `functions` 에 `firebase-admin` 추가, `initializeApp()` 1회
- `functions/src/auth.ts` - `Authorization` 헤더 ID 토큰 `verifyIdToken` -> `uid`. 부재/무효 시 401
- `functions/src/usage.ts` - Firestore `usage` 컬렉션에 `{uid, endpoint, timestamp}` 기록
- 7개 함수에 적용 (OPTIONS preflight 통과, POST 만 검증)

## 검증

- vitest: `useAuth`, Sidebar 로그인/로그아웃 분기, App 게이팅
- emulator(Auth + Firestore + Functions) + 수동: 로그인 -> 학습 -> Firestore `usage` 문서 생성 확인, 비로그인 401 확인

## 후속/주의

- CORS: 현재 `cors: true`. 배포 시 origin allow-list 로 좁힐 것(기존 메모 유지).
- 사용량 분석 대시보드/조회 UI 는 이번 범위 밖. Firestore 적재까지만.
