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

## 검증

서버 자동 회귀 테스트 대신 frontend 단위 테스트(vitest) + emulator Playwright E2E 로 검증한다. `frontend/e2e/sliceN-*.cjs` 가 input→해당 단계까지 주행하며 ① 해당 엔드포인트가 `127.0.0.1:5001` 으로 200, ② api.anthropic.com 직호출 0건 을 확인한다. dev server 가 IPv6 만 바인딩하면 `http://localhost:<port>` 로 접속. 상세는 `docs/firebase-migration.md`.

## 작업 시 유의사항

- 경로/DTO 변경은 `contract.ts` 와 `functions/` 를 같은 PR 에서 함께 수정한다.
- CORS 는 `cors: true` 로 열려 있으나 로컬/MVP 한정. 배포 시 origin allow-list 로 좁힌다.
- 1차 MVP 범위 제외: Auth/OAuth, DB/세션 저장, 토큰 제한/BYOK, 배포(Hosting), 서버 자동 회귀 테스트. 이 범위는 별도 합의 없이 추가하지 말 것.

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
