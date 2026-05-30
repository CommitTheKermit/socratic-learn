<!-- Generated: 2026-05-24 | Updated: 2026-05-30 -->

# socratic-learn

## Purpose
소크라테스식 학습 튜터. 사용자가 입력한 개념을 Claude API로 분해·설명·확인 질문·평가한다. 브라우저(React)는 Anthropic 을 **직접 호출하지 않고** Firebase Functions 를 거친다(API 키 비노출). 단일 Git 루트에 **두 개의 npm 프로젝트**(`frontend`, `functions`)로 구성된다. (구 Kotlin/Gradle 빌드 server/shared 는 Firebase Functions 이전 후 제거됨 - `docs/firebase-migration.md`.)

## Key Files
| File | Description |
|------|-------------|
| `CLAUDE.md` | 저장소 작업 규칙(모듈 구성, 명령, 계약, 검증) |
| `firebase.json` / `.firebaserc` | Firebase Functions + emulator 설정 (프로젝트 `socratic-learn-dev`) |
| `docs/firebase-migration.md` | Ktor→Functions 이전 이력/레시피 |
| `.gitignore` | 빌드 산출물/IDE 제외 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `frontend/` | Vite + React 18 + TS SPA. `src/api/contract.ts`(계약 SoT), `src/api/claudeContent.ts`(fetch), `e2e/`(Playwright) |
| `functions/` | Firebase Functions(Node 20 / TS). 7개 `onRequest` 함수 + `src/prompts.ts`. Anthropic 호출/키 전담 |
| `.github/` | GitHub Actions(Claude Code 통합만, 빌드 CI 없음) |
| `.omc/`, `.claude/` | OMC/Claude 로컬 상태 |

## For AI Agents

### Working In This Directory
- frontend: `cd frontend && npm run dev|build`, `npx vitest run`, `node e2e/sliceN-*.cjs`
- functions: `cd functions && npm run build|serve` (emulator 포트 5001)
- 새 API 추가는 `contract.ts`(ApiPaths+DTO) + `functions/src/<fn>.ts` + `index.ts` export + `claudeContent.ts` fetch 를 **같은 PR** 에서.
- 키는 functions Secret(`defineSecret`)만 사용. 브라우저 노출 금지(`functions/.secret.local`, `frontend/.env.local` 커밋 금지).

### Testing
- frontend 단위: `cd frontend && npx vitest run`
- E2E(emulator + dev server 필요): `cd frontend && node e2e/sliceN-*.cjs` → 엔드포인트가 `127.0.0.1:5001` 으로 200 + api.anthropic.com 직호출 0건 확인

### 범위 외 (1차 MVP)
Auth/OAuth, DB/세션 저장, 토큰 제한/BYOK, 배포(Hosting), 서버 자동 회귀 테스트. 합의 없이 추가 금지.

<!-- MANUAL: -->
