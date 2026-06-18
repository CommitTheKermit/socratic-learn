# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 모듈 구성

단일 Git 루트에 **두 개의 npm 프로젝트**로 구성됩니다. (구 Kotlin/Gradle 빌드 - `server/`(Ktor), `shared/`(KMP), 루트 Gradle - 는 Firebase Functions 이전 완료 후 제거됨. 이력은 `docs/firebase-migration.md`.)

- `frontend/` - Vite + React 18 + TypeScript SPA. 브라우저는 Anthropic 을 **직접 호출하지 않고** Firebase Functions 를 `fetch` 로 호출한다. API 키는 브라우저 번들에 존재하지 않는다.
- `functions/` - Firebase Functions(Node 20 / TypeScript). Anthropic Messages API 호출과 API 키를 전담한다.

## 자주 쓰는 명령

```bash
# 프론트엔드 (Vite + React + TS)
cd frontend && npm install        # 최초 1회
cd frontend && npm run dev         # dev server (기본 5173, 점유 시 5174…)
cd frontend && npm run build       # tsc -b && vite build → dist/
cd frontend && npx vitest run      # 단위 테스트
cd frontend && node e2e/sliceN-*.cjs   # Playwright E2E (emulator + dev server 필요)

# Firebase Functions
cd functions && npm install        # 최초 1회
cd functions && npm run build      # tsc → lib/
cd functions && npm run serve      # build + emulators:start --only functions (포트 5001, UI 4000)
```

- emulator 용 키: 루트에서 `printf 'ANTHROPIC_API_KEY=%s\n' '<키>' > functions/.secret.local` (gitignore 됨).
- 새 Function 추가 시 emulator 는 hot-reload 가 아니라 트리거 재등록이라 수 초 걸린다(OPTIONS 가 404→204 로 바뀌면 준비됨).
- firebase CLI 는 npm `firebase-tools` 15.x 사용. 프로젝트는 `socratic-learn-web`(`.firebaserc`).

## 런타임 아키텍처

브라우저(React) → Firebase Functions(`onRequest`) → Anthropic Messages API.

- 인증: 브라우저는 Firebase Auth(GitHub) 로 로그인하고, 모든 Functions 호출에 ID 토큰을 `Authorization: Bearer` 로 싣는다. Functions 는 `functions/src/auth.ts` 의 `requireAuth`(POST 처리 직전, 405 체크 다음)로 검증하고 `recordUsage` 로 Firestore `usage` 에 적재한다. 비로그인/무효 토큰은 401.

- `frontend/src/App.tsx` 의 단일 상태 머신(input → probe → learn → done). 단계 본문/질문/평가/분기는 모두 Functions 호출로 생성한다(스트리밍 아님, JSON).
- `frontend/src/api/claudeContent.ts` 의 각 함수(`detectOverwhelm`/`generateProbeQuestions`/`generateRoadmapOutline`/`generateStepDetail`/`generateAnswerEvaluation`/`generateBranchEvaluation`)는 `fetch(\`${API_BASE_URL}${ApiPaths.X}\`)` 로 Functions 를 호출한다. 시그니처/반환타입은 이전 전과 동일하게 유지된다.
- `functions/src/<fn>.ts` - 각 함수는 `onRequest({ secrets: [ANTHROPIC_API_KEY], cors: true, region: "us-central1" }, ...)`. 구조화 출력은 `client.messages.parse({ ..., output_config: { format: jsonSchemaOutputFormat(schema) } })` 를 쓴다(`branchEval` 의 조건부 `stageContent` 는 `anyOf [object, null]`). `functions/src/index.ts` 가 7개 함수를 export 한다.
- 모든 프롬프트(SYSTEM 상수 + userMessage 빌더)는 `functions/src/prompts.ts` 한 곳에 모은다. 프론트에는 프롬프트가 없다.
- 키 부재/Anthropic 오류는 Function 이 `{ code, message }` + 4xx/5xx 로 응답하고, 프론트는 `ClaudeContentError` 로 변환한다.

## API 계약 (source of truth)

`frontend/src/api/contract.ts` 가 경로/DTO 의 단일 진실 출처다. (구 `shared/` Kotlin 미러는 제거됨.)

- `ApiPaths` 의 키 = Function 이름 = 경로 (`/probe`, `/outline`, `/stepDetail`, `/answerEval`, `/branchEval`, `/overwhelm`).
- 새 Function 추가 절차: `contract.ts` 에 `ApiPaths` 항목 + 요청 DTO 추가 → `functions/src/<fn>.ts` 작성 → `index.ts` export → 프론트 `claudeContent.ts` 에서 `fetch` 호출. (functions 와 contract 는 같은 PR 에서 함께 수정.)

## 환경 변수

- functions: `ANTHROPIC_API_KEY` (Secret Manager `defineSecret`. emulator 는 `functions/.secret.local`). 모델은 각 함수의 `CLAUDE_MODEL` 상수.
- frontend: `VITE_API_BASE_URL` (Functions base URL. emulator 는 `http://127.0.0.1:5001/socratic-learn-web/us-central1`. Vite 빌드 시점 인라인). `.env.local` 변경 후 dev server 재시작 필요.
- frontend: `VITE_FIREBASE_*` (GitHub 로그인용 Firebase 웹 config. `src/lib/firebase.ts` 에서 주입). `apiKey` 는 비밀이 아니라 식별자라 번들 인라인 무방. 콘솔 설정은 `docs/github-auth-setup.md`.

## 배포

Firebase 프로젝트 `socratic-learn-web`(`.firebaserc`), region `us-central1`. 로그인 계정 `commit3921@gmail.com`. 배포는 **사용자가 명시적으로 요청할 때만** 수행하며(자동 배포 금지), **기본 브랜치(`main`)에서만** 한다.

- **브랜치/푸시 (배포 전 필수)**: 배포는 다른 브랜치에서 하지 않는다. 작업 브랜치(`feat/*` 등)는 먼저 기본 브랜치(`main`)로 **병합해 모은 뒤**, `main` 에서만 배포한다. 미푸시 커밋이 있으면 `git push` 로 원격에 올린 다음 배포한다. 즉 순서는 **작업 브랜치 커밋 → `main` 로 병합 → push → 빌드 → deploy → release 커밋 → push**. (구 `develop`/이전 Kotlin 트랙은 제품 라인이 아니므로 기준으로 쓰지 않는다.)
- 대상: **functions + hosting** (필요 시 firestore rules). `firebase.json` 의 hosting public 은 `frontend/dist`, SPA rewrite `** -> /index.html`.
- 앱 버전은 **`frontend/package.json` 의 `version` 한 곳**에만 있다(functions/root 엔 버전 없음). 배포할 때마다 버전을 올리되, 증가 단위는 SemVer(`MAJOR.MINOR.PATCH`) 기준으로 변경 성격에 따라 모델이 판단한다: 호환 깨짐 = major, 호환되는 기능 추가 = minor, 호환되는 버그 수정 = patch.
- 절차: ① `cd functions && npm run build`(→`lib/`) ② `cd frontend && npm run build`(→`dist/`, `VITE_*` 빌드 시점 인라인) ③ 루트에서 `npx firebase deploy --only functions,hosting`.
- 배포 후 release 커밋을 남긴다. **포맷/작성법은 `release-commit` 스킬을 따른다**(제목 `chore(release): vX.Y.Z 배포`, 본문 = 직전 release 이후 `git log` 기반 변경 목록 + 배포 대상 + 버전 증감). 이 프로젝트 고유값: 대상은 functions/hosting(필요 시 firestore rules) 중 배포한 것, 본문 맨 끝에 `Hosting URL: https://socratic-learn-web.web.app`.
- `functions/.secret.local` 은 emulator 전용. 실배포 키는 Secret Manager(`ANTHROPIC_API_KEY`).

## 검증

서버 자동 회귀 테스트 대신 frontend 단위 테스트(vitest) + emulator Playwright E2E 로 검증한다. `frontend/e2e/sliceN-*.cjs` 가 input→해당 단계까지 주행하며 ① 해당 엔드포인트가 `127.0.0.1:5001` 으로 200, ② api.anthropic.com 직호출 0건 을 확인한다. dev server 가 IPv6 만 바인딩하면 `http://localhost:<port>` 로 접속. 상세는 `docs/firebase-migration.md`.

- E2E 는 로그인 게이팅을 우회하려 Auth emulator + 자동 익명 로그인을 쓴다. emulator 를 `--only functions,auth,firestore` 로 띄우고, dev 를 `VITE_AUTH_EMULATOR_URL=http://127.0.0.1:9099 VITE_E2E_AUTO_SIGNIN=true npm run dev` 로 실행한 뒤 `E2E_BASE_URL=http://localhost:<port> node e2e/<file>.cjs`. 두 env 는 실서비스 빌드엔 없으므로 영향이 없다(`firebase.ts` 의 `connectAuthEmulator`, `useAuth` 의 익명 로그인은 해당 env 가 있을 때만 동작).
- 위 오케스트레이션은 **`bash frontend/e2e/run.sh`** 가 한 번에 한다(functions 빌드 → emulator+dev 기동/readiness 대기 → e2e 실행 → 띄운 프로세스 정리. 인자로 슬라이스 파일명 지정 가능, `--smoke` 는 기동/배선만 점검하고 Anthropic 호출 없음). E2E 본 실행은 emulator 를 통해 실제 Anthropic API 를 호출하므로 비용이 발생한다. 전체 검증 절차(타입체크+vitest+선택적 E2E)는 `verify-all` 스킬을 따른다.

### 핸드오프 CSS 가드 (claude.ai/design export 적용 검증)

빌드/타입체크/vitest 가 못 잡는 "문법상 valid 인데 규칙이 통째로 죽는" CSS 잠복 버그(주석 안 `*/` 조기종료 등)를 막는 자동화 가드. 사람용 체크리스트는 두지 않고 **자동화 도구만** 쓴다(사람 눈 확인 항목은 TODO 에).

- **편집 즉시(훅)**: PostToolUse(`.claude/hooks/css-guard.sh`)가 수정된 `frontend/**/*.css` 를 `frontend/scripts/css-guard.mjs` 로 검사. 검사 2종 = ① 구문 무결성(주석 조기종료·미종료·괄호 불균형 + postcss 로 깨진 셀렉터 탐지) ② 누락 CSS 변수(`var(--x)` 가 정의·`setProperty` 어디에도 없고 폴백도 없음). 실패 시 **block**(exit 2).
- **핸드오프 직후(수동)**: `cd frontend && npm run validate-handoff`. 위 가드 전체 스윕 + stylelint(일반 품질, 최소 규칙) + 셀렉터 불일치 리포트(참고) + stale 번들 검사. css-guard/stylelint 오류는 실패, 셀렉터/stale 은 참고(휴리스틱).
- **stale 번들**: `npm run validate-handoff -- --live live-files.json`. node 는 MCP 를 못 부르므로 Claude 가 DesignSync `list_files` 결과(경로 배열)를 JSON 으로 저장해 `--live` 로 넘기면, 디스크 번들(`.design-handoff/`)에 없는 라이브 파일을 경고한다.

## 작업 시 유의사항

- 경로/DTO 변경은 `contract.ts` 와 `functions/` 를 같은 PR 에서 함께 수정한다.
- CORS 는 `cors: true` 로 열려 있으나 로컬/MVP 한정. 배포 시 origin allow-list 로 좁힌다.
- GitHub 로그인(Firebase Auth GitHub provider) + 사용량 기록(Firestore `usage` 컬렉션) 은 **도입됨**. 학습 시작은 로그인 필수(게이팅): 프론트는 ID 토큰을 `Authorization: Bearer` 로 싣고(`api/authHeaders.ts`), Functions 는 `requireAuth` 로 검증(무효 시 401)하며 `recordUsage(uid, endpoint)` 로 적재한다.
- 배포(Hosting + Functions)는 **도입됨**. 구조/절차는 위 "배포" 섹션 참고.
- 여전히 범위 제외(별도 합의 없이 추가 금지): 학습 세션의 서버 DB 저장(현재 세션은 localStorage), 토큰 제한/BYOK, 서버 자동 회귀 테스트, 사용량 분석 대시보드/조회 UI.
- 프론트엔드 함정(React ref 세션 복원, CSS `position:fixed` containing block 등)은 `docs/frontend-gotchas.md` 참조.

<!-- ooo:START -->
<!-- ooo:VERSION:0.39.2 -->
# Ouroboros - Specification-First AI Development

> Before telling AI what to build, define what should be built.
> As Socrates asked 2,500 years ago - "What do you truly know?"
> Ouroboros turns that question into an evolutionary AI workflow engine.

Most AI coding fails at the input, not the output. Ouroboros fixes this by
**exposing hidden assumptions before any code is written**.

1. **Socratic Clarity** - Question until ambiguity <= 0.2
2. **Ontological Precision** - Solve the root problem, not symptoms
3. **Evolutionary Loops** - Each evaluation cycle feeds back into better specs

```
Interview -> Seed -> Execute -> Evaluate
    ^                              |
    +------ Evolutionary Loop -----+
```

## ooo Commands

Each command loads its agent/MCP on-demand. Details in each skill file.

| Command | Loads |
|---------|-------|
| `ooo` | - |
| `ooo interview` | `ouroboros:socratic-interviewer` |
| `ooo seed` | `ouroboros:seed-architect` |
| `ooo run` | MCP required |
| `ooo evolve` | MCP: `evolve_step` |
| `ooo evaluate` | `ouroboros:evaluator` |
| `ooo unstuck` | `ouroboros:{persona}` |
| `ooo status` | MCP: `session_status` |
| `ooo setup` | - |
| `ooo help` | - |

## Agents

Loaded on-demand - not preloaded.

**Core**: socratic-interviewer, ontologist, seed-architect, evaluator,
wonder, reflect, advocate, contrarian, judge
**Support**: hacker, simplifier, researcher, architect
<!-- ooo:END -->
