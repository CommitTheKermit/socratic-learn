<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-24 | Updated: 2026-05-24 -->

# frontend

## Purpose
Vite + React 18 + TypeScript SPA. `socratic-learn-web-calude-design/` 의 v3 시안을 TSX 로 이식한 단일 페이지 클라이언트. 백엔드 Ktor 서버(`/learn/stream` SSE, `/answers`)에 직접 fetch 로 연결한다. 더 이상 Gradle 모듈이 아니다 (루트 `settings.gradle.kts` 에서 제외됨).

## Key Files
| File | Description |
|------|-------------|
| `package.json` | scripts: `dev`/`build`/`preview`. deps: react 18, react-dom. devDeps: vite, typescript, @vitejs/plugin-react |
| `vite.config.ts` | `FE_PORT` env 로 포트 지정(기본 5173) |
| `tsconfig.json` | strict, jsx: react-jsx, target ES2022 |
| `index.html` | Pretendard / JetBrains Mono CDN preconnect + `<div id="root">` |
| `README.md` | 사용법, 환경변수, shared 동기화 규칙 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `src/` | 모든 TSX/TS 소스 (App, components, stages, api, lib, styles) |

## For AI Agents

### Working In This Directory
- 빌드/실행은 npm 으로: `npm install && npm run dev` (또는 `npm run build`)
- 백엔드 8081 포트가 실행 중이어야 explain/answering 단계가 동작한다.
- `src/api/contract.ts` 는 `shared/` Kotlin 모듈의 수기 미러다. shared 변경 시 같은 PR 에 갱신 포함.
- SSE 파싱은 `fetch` + `response.body.getReader()` + TextDecoder. EventSource 미사용 (POST 본문 필요).
- v3 디자인 토큰(`src/styles/v3.css`) 의 OKLCH 변수와 holographic gradient 는 임의 변경 금지.

### Testing Requirements
- 타입체크 + 번들: `npm run build`
- 로컬 수동: dev server 띄우고 사이드바/입력 hero/단계 머신 작동 확인

### 범위 외 (1차 MVP)
Auth, DB/세션, OpenAPI codegen, Ktor static hosting 통합, 자동 회귀 테스트, tweaks-panel 포팅.

## Dependencies

### Internal
- (런타임) `shared/` Kotlin 계약을 사람이 동기화한 `src/api/contract.ts`
- (런타임) 백엔드 `server/` 의 `/learn/stream`, `/answers`

### External
- react 18, react-dom 18
- vite 5, @vitejs/plugin-react, typescript 5

<!-- MANUAL: -->
