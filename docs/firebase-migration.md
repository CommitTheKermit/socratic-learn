# Firebase 이전 작업 진행 노트 (핸드오프)

> 새 세션은 이 파일만 읽으면 이어서 작업할 수 있다.
> Ouroboros seed: `seed_df37ad960969` (interview_20260529_110541)
> revision audit: `~/.ouroboros/seed-revisions/interview_20260529_110541.md`

## 목표

frontend 의 브라우저 직접 Anthropic 호출 7개(JSON 6 + 스트리밍 1)를 Firebase
Functions(Node/TS)로 함수 단위로 작게 이전한다. 최종적으로 브라우저 API 키
노출(`VITE_ANTHROPIC_API_KEY` / `dangerouslyAllowBrowser`)을 제거하고, dead code
와 Ktor 서버(`server/`) 및 `shared/` Kotlin 모듈을 제거한다.

- 과도기 Ktor/Functions 병행 허용(빅뱅 금지). 미이전 함수는 기존 브라우저 직호출로 계속 동작.
- 자동 회귀 테스트는 작성하지 않음. 검증은 emulator + 브라우저 수동 주행.
- 키 관리: Google Secret Manager (`defineSecret`). emulator 는 `functions/.secret.local`.
- 범위 외: Auth / Firestore / Hosting.
- 매 슬라이스 별도 커밋.

## 이전 대상 7개 함수와 슬라이스 매핑

`frontend/src/api/claudeContent.ts` (JSON 6개) + `frontend/src/api/claudeLearnStream.ts` (스트리밍 1개).

| 슬라이스 | 함수 | UI 단계 | 상태 |
|---|---|---|---|
| 1 | detectOverwhelm | input(친숙도 0 제출) | ✅ 완료 (commit e06cff7) |
| 2 | generateProbeQuestions | probe | ✅ 완료 (commit a51c2ee) |
| 3 | generateRoadmapOutline | roadmap | ✅ 완료 (commit 2c8e78c) |
| 4 | generateStepDetail | explain 준비 | ✅ 완료 (E2E: e2e/slice4-step-detail.cjs) |
| 5 | generateAnswerEvaluation | answering | ✅ 완료 (E2E: e2e/slice5-answer-eval.cjs) |
| 6 | generateBranchEvaluation | branch 평가 | ⬜ 다음 |
| 7 | startClaudeLearnStream | explain(스트리밍) | ⬜ Functions v2 HTTP 스트리밍, 60s 내 |
| 8a | 정리: `npm run build` 후 `grep -ri ANTHROPIC dist/` 0건 | - | ⬜ slice1~7 후 |
| 8b | 정리: devtools Network 에 api.anthropic.com 직호출 0건 | - | ⬜ |
| 8c | 정리: dead code 제거 (learnStream.ts startLearnStream, answers.ts submitAnswers + 미사용 import). 단 parseEvaluationJson 은 claudeContent.ts 가 쓰므로 유지 | - | ⬜ |
| 8d | 정리: server/ 와 shared/ 제거 + 루트 Gradle 설정 정리 | - | ⬜ |

## 이전 레시피 (슬라이스1에서 확립한 패턴, 슬라이스2~6 동일 적용)

각 JSON 함수 `<fn>` 을 옮길 때:

1. **프롬프트 이동**: `frontend/src/api/prompts.ts` 에서 해당 함수의 SYSTEM 상수와
   userMessage 빌더를 `functions/src/prompts.ts` 로 옮긴다(복사 후, 프론트에서는
   미사용이 되면 slice8c 에서 정리).
2. **Function 작성**: `functions/src/<fn>.ts` 에 `onRequest({ secrets: [ANTHROPIC_API_KEY], cors: true, region: "us-central1" }, ...)`.
   - 슬라이스1 `functions/src/overwhelm.ts` 를 템플릿으로 그대로 따른다.
   - JSON schema(구조화 출력)는 claudeContent.ts 의 해당 `<fn>Schema` 를 functions 로 옮긴다.
   - `client.messages.parse({ ..., output_config: { format: jsonSchemaOutputFormat(schema) } })` 사용.
   - POST body 로 프론트 함수 인자를 받고, 응답으로 기존 반환 타입을 그대로 JSON 반환.
3. **index.ts 등록**: `functions/src/index.ts` 에 `export { <fn> } from "./<fn>";`
4. **계약 갱신**: `frontend/src/api/contract.ts` 의 `ApiPaths` 에 엔드포인트 추가(함수명=경로),
   필요한 요청/응답 DTO 추가(source of truth).
5. **프론트 함수 교체**: `claudeContent.ts` 의 `<fn>` **시그니처/반환타입은 그대로 두고**
   내부를 `fetch(\`${API_BASE_URL}${ApiPaths.X}\`, { method:"POST", ... })` 로 교체.
   호출부(컴포넌트)는 건드리지 않는다. 미사용이 된 schema 상수/프롬프트 import 제거.
6. **빌드 검증**: `cd frontend && npx tsc -b` (exit 0) + `cd functions && npx tsc` (exit 0).
7. **emulator 검증**: 아래 "로컬 검증 절차"로 emulator + dev server 를 띄우고 해당 UI
   단계까지 주행. 해당 엔드포인트가 `127.0.0.1:5001/.../<fn>` 으로 200 이고
   api.anthropic.com 직호출이 0건인지 확인. 수동 대신 Playwright E2E 자동 주행 권장(아래).
8. **커밋**: `feat(functions): Slice N - <fn> Firebase Functions 이전`.

### Playwright E2E 자동 검증 (슬라이스2에서 확립, 수동 주행 대체)

수동 브라우저 주행 대신 헤드리스 Playwright 로 UI 흐름을 자동 주행해 검증한다.

- 설치(최초/세션당 1회): 루트에서 `npm i -D playwright@1.60.0 && npx playwright install chromium`.
  검증 후 루트 오염 제거: `rm -rf node_modules package-lock.json package.json` (루트는 Gradle
  빌드라 npm 산출물이 남으면 안 됨. chromium 바이너리는 `~/Library/Caches` 에 캐시되어 재설치 빠름).
- 임시 스크립트(예: `tmp-<fn>-e2e.cjs`)를 루트에 작성해 `node tmp-<fn>-e2e.cjs` 로 실행, 끝나면 삭제.
- 검증 포인트(스크립트가 자동 판정, exit 0=통과):
  1. `page.on("response")` 로 `POST /<fn>` 응답을 잡아 `status===200` 이고 url 에 `127.0.0.1:5001` 포함.
  2. `page.on("request")` 로 `api.anthropic.com` 직호출 0건.
  3. 응답 body 형태(배열/필드) 검증 + 결과가 DOM 에 실제 렌더됐는지 `waitForFunction`.
- 주의: dev server 가 IPv6(`::1`)에만 바인딩되면 `127.0.0.1` 은 거부되니 `http://localhost:<port>` 로 접속.
  이미 5173/5001 이 점유돼 있으면 내 dev server 는 5174 등으로 뜬다(`lsof -nP -iTCP:<port> -sTCP:LISTEN` 로 확인).
- ⚠️ emulator 는 실제 키로 실제 Anthropic 을 호출하므로 주행마다 소액 과금 발생.

스트리밍(슬라이스7)은 패턴이 다름: `claudeLearnStream.ts` 의 `startClaudeLearnStream`
(현재 SSE/`stream.on("text")`)을 Functions v2 HTTP 스트리밍(`res.write` chunk)으로 옮기고,
프론트는 `learnStream.ts` 의 `fetch + ReadableStream` 파서를 재사용해 functions 엔드포인트를 읽게 한다.

## 로컬 검증 절차

```bash
# 1) emulator 용 시크릿 (프로젝트 루트에서 1회, gitignore 됨)
printf 'ANTHROPIC_API_KEY=%s\n' '<새-키>' > functions/.secret.local

# 2) emulator 기동
cd functions && npm run serve   # build + emulators:start --only functions

# 3) 프론트 (다른 터미널)
cd frontend && npm run dev       # .env.local 의 VITE_API_BASE_URL = emulator base
```

- `frontend/.env.local`:
  - `VITE_API_BASE_URL=http://127.0.0.1:5001/socratic-learn-dev/us-central1`
  - `VITE_ANTHROPIC_API_KEY=<새-키>` (아직 미이전 함수의 브라우저 직호출용. slice8 에서 제거)
- emulator/프론트는 `.env.local`/`.secret.local` 변경 후 **반드시 재시작**(Vite 는 시작 시 env 로드).
- firebase CLI 는 npm `firebase-tools` 15.x 사용(구 standalone 12.x 는 v6 build spec 파싱 실패).

## 환경/주의

- firebase CLI: `/opt/homebrew/bin/firebase` (15.x). 구 `/usr/local/bin/firebase`(12.7.0)는 무시(zsh `hash -r` 로 갱신).
- Node 23 / `@anthropic-ai/sdk ^0.98.0` / firebase-functions ^6.
- ⚠️ 보안: 노출된 적 있는 Anthropic 키는 반드시 폐기/교체. `.env.local`, `.secret.local` 은 커밋 금지(gitignore 확인됨).
- detectOverwhelm 트리거 조건: probe 첫 질문(친숙도)에서 value 0("전혀 모름") 선택 후 제출(`Probe.tsx:166`).

## 참고 파일

- 템플릿 Function: `functions/src/overwhelm.ts`
- 프론트 API 계약: `frontend/src/api/contract.ts`
- 이전 대상 함수들: `frontend/src/api/claudeContent.ts`, `frontend/src/api/claudeLearnStream.ts`
- 프롬프트 원본: `frontend/src/api/prompts.ts`
- 상태 머신: `frontend/src/App.tsx` (input → probe → roadmap → explain → questions → answering → done)
