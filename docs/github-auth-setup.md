# GitHub 로그인 사전 준비 체크리스트

> 이 문서의 단계는 **콘솔에서 직접 클릭/입력**해야 하는 부분이다(코드로 대체 불가).
> 프로젝트: `socratic-learn-web` (commit3921 계정). 완료 후 `docs/github-auth-plan.md` 의 구현 슬라이스로 넘어간다.

순서가 중요하다. Firebase 가 주는 callback URL 을 GitHub 에 넣어야 하므로
**1 -> 2 를 왕복**한다.

---

## 1. GitHub OAuth App 등록

GitHub -> Settings -> Developer settings -> OAuth Apps -> **New OAuth App**

| 항목 | 값 |
|---|---|
| Application name | `Socratic Learn Web` 등 식별 가능한 이름 |
| Homepage URL | `http://localhost:5173` (개발용. 배포 시 실제 도메인) |
| Authorization callback URL | **2단계에서 Firebase 가 주는 값**을 넣는다 (아래 참고) |

- 등록하면 **Client ID** 가 나온다.
- **Generate a new client secret** 클릭 -> **Client Secret** 발급 (한 번만 표시되니 즉시 복사).

> callback URL 을 모르면 2번을 먼저 열어 Firebase 가 주는 URL 을 확인한 뒤
> 다시 여기 와서 채운다. 보통:
> `https://socratic-learn-web.firebaseapp.com/__/auth/handler`

## 2. Firebase Console - GitHub provider 활성화

Firebase Console -> 프로젝트 `socratic-learn-web` -> **Authentication**
-> (최초면) **시작하기** -> **Sign-in method** 탭 -> **GitHub** 선택

1. **사용 설정(Enable)** 토글 ON
2. 1번에서 받은 **Client ID / Client Secret** 입력
3. 여기 화면에 표시되는 **콜백 URL** 복사 -> 1번 GitHub OAuth App 의 callback URL 에 붙여넣기
4. 저장

> 개발 중 `localhost` 접속은 Firebase Auth 의 승인된 도메인에 기본 포함되어 있다.
> 배포 도메인이 생기면 Authentication -> Settings -> 승인된 도메인에 추가한다.

## 3. Firestore 활성화

Firebase Console -> **Firestore Database** -> **데이터베이스 만들기**

- 모드: **Native 모드**
- 위치: 리전 선택 (예: `asia-northeast3` 서울. Functions 와 달리 데이터 저장 위치는
  사용자 근접이 합리적. 한 번 정하면 변경 불가)
- 보안 규칙: 초기엔 잠금 모드로 두어도 된다. 본 작업은 **Functions(admin SDK)** 가
  서버에서 기록하므로 클라이언트 직접 쓰기 규칙이 필요 없다.

## 4. Firebase 웹 앱 config 값 확보

Firebase Console -> 프로젝트 설정(톱니) -> **일반** 탭 -> "내 앱" 에서
웹 앱(`</>`)이 없으면 **앱 추가 -> 웹**. config 객체가 나온다:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "socratic-learn-web.firebaseapp.com",
  projectId: "socratic-learn-web",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
```

이 값을 `frontend/.env.local` 에 아래 형식으로 넣는다(구현 슬라이스 A 에서
`.env.local.example` 에 키를 추가한다):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=socratic-learn-web.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=socratic-learn-web
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

> `apiKey` 는 비밀이 아니다(웹 클라이언트용 식별자). 번들에 인라인되어도 무방하다.
> 실제 비밀(Anthropic 키, GitHub Client Secret)은 서버/콘솔에만 존재한다.

## 5. (선택) 에뮬레이터 검증 준비

로컬에서 Auth + Firestore + Functions 를 함께 띄우려면:

```bash
cd functions && firebase emulators:start --only auth,firestore,functions
```

> Auth 에뮬레이터는 실제 GitHub OAuth 대신 테스트 로그인 UI 를 제공하므로
> GitHub OAuth App 없이도 흐름 검증이 가능하다. 실제 GitHub 로그인 확인은
> 1~4 완료 후 `npm run dev` + 실서비스 Auth 로 한다.

---

## 완료 체크

- [ ] GitHub OAuth App Client ID / Secret 확보
- [ ] Firebase Authentication GitHub provider 활성화 + callback URL 연결
- [ ] Firestore Native 모드 활성화
- [ ] Firebase 웹 config 값 확보 (`.env.local` 에 입력 준비)
