# frontend (Vite + React 18 + TypeScript)

`socratic-learn` 의 단일 페이지 클라이언트. 소크라테스식 점진 학습 단계 머신(input → probe → learn → done)을 React 로 구현한다.

브라우저는 Anthropic 을 **직접 호출하지 않는다**. 모든 Claude 호출은 Firebase Functions 를 `fetch` 로 경유하며, **API 키는 브라우저 번들에 존재하지 않는다**. 학습 시작은 Firebase Auth(GitHub) 로그인이 필요하다.

```
브라우저(React) → Firebase Functions(onRequest) → Anthropic Messages API
                ↘ Firestore(세션 저장 / 사용량 기록), Firebase Auth(GitHub)
```

> 프롬프트 / 모델 선택 / 구조화 출력은 전부 `functions/` 가 전담한다. 프론트에는 프롬프트가 없다.

## 사전 요구
- Node.js LTS (20 이상 권장)
- 백엔드: Firebase Functions emulator(로컬) 또는 배포된 Functions. 키 셋업·실행은 루트 `../CLAUDE.md` 와 `../functions/` 참고.

## 셋업
```bash
cd frontend
cp .env.local.example .env.local     # 값 채우기(아래 환경 변수 표)
npm install                          # 최초 1회
npm run dev                          # dev server (기본 5173, FE_PORT 로 변경)
```
- dev server 만으로는 Claude 응답이 오지 않는다. `VITE_API_BASE_URL` 이 가리키는 Functions(emulator 또는 배포)가 떠 있어야 한다. 로컬 emulator 는 루트에서 `cd functions && npm run serve`.
- `.env.local` 은 Vite 빌드/기동 시점에 인라인되므로 값 변경 후 dev server 를 재시작해야 한다.

## 환경 변수
| 변수 | 설명 |
|------|------|
| `VITE_API_BASE_URL` | Functions base URL. emulator `http://127.0.0.1:5001/<project-id>/us-central1`, 배포 `https://us-central1-<project-id>.cloudfunctions.net`. (미설정 시 기본값 `http://localhost:8081` 은 구 백엔드 잔재이므로 반드시 설정) |
| `VITE_FIREBASE_API_KEY` 외 5개 | GitHub 로그인용 Firebase 웹 config(`AUTH_DOMAIN`/`PROJECT_ID`/`STORAGE_BUCKET`/`MESSAGING_SENDER_ID`/`APP_ID`). `src/lib/firebase.ts` 에서 주입. `apiKey` 는 비밀이 아니라 식별자라 번들 인라인 무방 |
| `FE_PORT` | Vite dev/preview 포트(기본 5173) |
| `VITE_AUTH_EMULATOR_URL`, `VITE_E2E_AUTO_SIGNIN` | E2E 전용. Auth emulator 연결 + 자동 익명 로그인으로 로그인 게이팅 우회. 실서비스 빌드엔 없어 무영향 |

## 빌드 / 테스트
```bash
npm run build                                  # tsc -b && vite build → dist/
npm run preview                                # dist 정적 미리보기
npx vitest run                                 # 단위 테스트 전체(npm test 와 동일)
npx vitest run src/state/sessionMerge.test.ts  # 파일 1개만
npx vitest run -t "이름 패턴"                    # 이름으로 1개만
node e2e/<file>.cjs                            # Playwright E2E (Functions/Auth emulator + dev server 필요)
```
앱 버전은 `package.json` 의 `version` 한 곳에만 있다(현재 `0.6.0`). 배포·버전 정책은 루트 CLAUDE.md.

## 주요 디렉터리
| 경로 | 내용 |
|------|------|
| `src/App.tsx` | 단계 상태 머신 + 라우팅(URL 이 단계/스텝의 진실 출처) |
| `src/main.tsx` | 진입점. `BrowserRouter` + `AuthProvider` 로 App 을 감싼다 |
| `src/components/` | Sidebar, Hero, ProgressBar, SessionLoadOverlay, `branch/`(분기 UI), 인라인 SVG 아이콘 |
| `src/stages/` | Probe / Learn / Done 단계 컴포넌트 + 정적 데이터(`data.ts`) |
| `src/state/` | Context(`useAuth` / `LearnContent` / `SessionListContext`) + 세션 영속화(`sessionSync`/`sessionPersist`/`sessionState`/`sessionMerge`/`sessionTombstone`/`sessionIndex`) + 훅 |
| `src/api/` | `claudeContent.ts`(학습 콘텐츠 Functions 호출) / `sessionApi.ts`(Firestore 세션 CRUD) / `contract.ts`(경로·DTO 단일 출처) / `authHeaders.ts` / `stepDetailStream.ts` |
| `src/lib/` | `firebase.ts`(웹 SDK 초기화) / `errors.ts`(에러 코드 → 메시지) / `markdown.tsx`(미니 마크다운) |
| `src/styles/v3.css` | 디자인 토큰 / 전역 스타일 |

> `@anthropic-ai/sdk` 가 의존성에 남아 있으나 브라우저에서 Anthropic 을 직접 호출하지 않는다. 일부 Node 전용 하위 모듈은 `vite.config.ts` 의 `STUB_PATTERN` 으로 빈 모듈 처리된다.

## 더 보기
- `CLAUDE.md` (이 디렉터리): 라우팅 상태 머신 / Context 3계층 / 세션 영속화 모델 / 테스트 전역 mock 등 내부 아키텍처.
- `../CLAUDE.md` (루트): 모노레포 구성 / Functions / 배포 / API 계약 변경 절차 / 환경 변수 전반.
