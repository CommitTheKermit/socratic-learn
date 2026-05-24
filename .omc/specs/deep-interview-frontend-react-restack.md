# Deep Interview Spec: Frontend Restack to Vite + React + TS (v3 Design)

## Metadata
- Interview ID: di-frontend-restack-2026-05-24
- Mode: `--quick`
- Rounds: 2 (compressed) + Round 0 topology
- Final Ambiguity Score: ~18% (PASSED, threshold 20%)
- Type: brownfield
- Generated: 2026-05-24
- Threshold: 0.2
- Initial Context Summarized: yes (design dir + 백엔드 계약)
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.90 | 0.35 | 0.315 |
| Constraint Clarity | 0.85 | 0.25 | 0.2125 |
| Success Criteria | 0.80 | 0.25 | 0.20 |
| Context Clarity (brownfield) | 0.90 | 0.15 | 0.135 |
| **Total Clarity** | | | **0.8625** |
| **Ambiguity** | | | **0.1375 (~14%)** |

## Topology
| Component | Status | Description | Coverage / Deferral Note |
|-----------|--------|-------------|--------------------------|
| Stack 선정 | active | 새 프론트엔드 기술 스택 결정 | Vite + React 18 + TypeScript 확정 |
| v3 디자인 포팅 | active | `socratic-learn-web-calude-design/` JSX/CSS-v3를 새 stack으로 이식 | v3 (Babel standalone JSX) → TSX + Vite, 디자인 토큰/스타일 그대로 |
| 기존 frontend/ 처리 | active | Compose wasmJs 모듈 정리 | 삭제 후 동일 경로에 React 프로젝트 신설, 루트 `settings.gradle.kts`에서 `:frontend` include 제거 |
| shared 계약 연동 | active | SSE/REST 호출 + 타입 동기화 | `src/api/contract.ts`에 ApiPaths/DTO/SseEvents 수기 미러링 (MVP); 변경 시 양쪽 동기화 |

## Goal
기존 Compose Multiplatform(wasmJs) 기반 `frontend/` 모듈을 폐기하고, 동일 경로에 **Vite + React 18 + TypeScript** 기반 SPA를 신설한다. UI는 `socratic-learn-web-calude-design/` 의 **v3 시안**(React 18 + Babel standalone JSX, 단계 머신 `input → probe → roadmap → explain → questions → answering → done`, Pretendard + JetBrains Mono, 4-accent preset, holographic gradient)을 거의 그대로 이식한다. 백엔드(Ktor SSE `/learn/stream`, `/answers`, `/health`)는 변경하지 않고, 프론트는 `window.fetch` + `ReadableStream`으로 SSE를 직접 파싱한다. `shared` Kotlin 모듈의 path/DTO/SSE 이벤트 계약은 `src/api/contract.ts` 에 **수기 미러링**하여 단일 진실 출처 두 곳을 사람이 동기화한다.

## Constraints
- 백엔드 코드/포트(8081)/API 계약은 변경하지 않는다. CORS는 이미 `anyHost()`로 열려 있어 Vite dev server와 함께 동작.
- Vite dev server는 독립 포트(예: 5173 또는 기존 frontend 관습대로 `FE_PORT` 환경변수)로 띄우고, Ktor가 정적 파일을 서빙하지 않는다.
- shared DTO와 TS 미러는 사람이 동기화한다 - `shared/` 변경 PR에는 TS 미러 동기화가 같은 PR에 포함되어야 한다 (PR 체크리스트 항목).
- `frontend/` 디렉터리는 **삭제 후 신설**(rename 아님). 루트 `settings.gradle.kts`의 `include(":frontend")` 제거, 루트 `build.gradle.kts`의 Compose plugin alias도 미사용 시 정리.
- 새 프론트는 wasmJs/Kotlin 의존 없음. Node 환경(LTS 권장 20+).
- 디자인 토큰(`styles-v3.css`의 OKLCH 변수, holographic gradient, Pretendard/JetBrains Mono CDN)을 보존해야 한다.
- 1차 MVP 범위는 그대로 (Auth/DB/채점 분기/배포 제외).

## Non-Goals
- 서버 측 SSR/Next.js 전환.
- Ktor에서 정적 파일 서빙(별도 PR로 미룸).
- OpenAPI/codegen 자동화(MVP 범위 외).
- 기존 Compose 코드 점진 마이그레이션(완전 교체).
- 디자인 v1/v2 시안 채택.
- 인증/세션/DB 도입.

## Acceptance Criteria
- [ ] 루트 `settings.gradle.kts`에서 `include(":frontend")` 제거되고 루트 Gradle 빌드는 `:shared`만 가지고 성공한다(`./gradlew build`).
- [ ] 기존 `frontend/` Compose 소스 트리(`src/wasmJsMain/...`, `build.gradle.kts` 등)가 삭제된 상태이다.
- [ ] 같은 경로 `frontend/`에 `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx` 가 존재하는 Vite + React 18 + TS 프로젝트가 신설되었다.
- [ ] `npm install && npm run dev` 로 Vite dev server가 기동되고, 브라우저에서 v3 시안과 동등한 화면(사이드바, 입력 hero, 단계 표시)이 보인다.
- [ ] v3 단계 머신(`input/probe/roadmap/explain/questions/answering/done`)이 동작하고, `explain` 단계에서 `POST /learn/stream` 을 호출해 실 SSE 델타를 화면에 누적 표시한다.
- [ ] `answering` 단계에서 `POST /answers` 가 호출되고 응답(`receivedCount`)이 UI에 반영된다.
- [ ] `src/api/contract.ts` 가 `shared`의 `ApiPaths.HEALTH/LEARN_STREAM/ANSWERS`, `SseEvents.STATUS/DELTA/COMPLETE/ERROR`, `LearnStreamRequest`, `Stream*Event`, `AnswerSubmissionRequest/Response`, `ErrorResponse` 와 1:1 매칭되는 상수/타입을 export 한다.
- [ ] `styles-v3.css` 의 OKLCH 토큰, holographic gradient, accent preset, Pretendard/JetBrains Mono 폰트 로딩이 신규 프로젝트에 보존된다(CSS 파일 또는 모듈 import).
- [ ] SSE 에러 케이스(`MISSING_CLAUDE_API_KEY`, `CLAUDE_API_ERROR`, `INTERNAL_ERROR`)별로 사용자에게 구분 가능한 메시지가 표시된다.
- [ ] README(루트 또는 `frontend/README.md`)에 `npm run dev` 와 `npm run build` 안내가 추가된다.
- [ ] 루트 CLAUDE.md의 "프론트엔드(wasmJs)" 명령/구조 설명이 React 기준으로 갱신된다.

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| "CMP가 웹에서 잘 안 된다"가 영구 판단인가 | 일시적 이슈일 가능성 | 사용자가 명시적으로 React 전환 결정 - CMP 폐기 확정 |
| 디자인 시안 디렉터리 이름 | 기존 `socratic-learn-web-design`과 혼동 | 실제 채택은 신규 디렉터리 `socratic-learn-web-calude-design/` 의 v3 |
| shared TS 동기화 자동화 필요 | codegen vs 수기 | MVP에서는 수기 미러 - 양쪽 PR에서 함께 수정 |
| 빌드 산출물 호스팅 통합 | Ktor가 dist 서빙? | Vite dev server 독립, 통합은 후속 PR |
| 디렉터리 이름 (frontend vs web) | JS 임을 명확화? | `frontend/` 재사용 - CLAUDE.md 관습/경로 유지 |

## Technical Context (brownfield)
- **백엔드 계약** (`server/src/main/kotlin/socratic/learn/api/LearnRoutes.kt`):
  - `POST /learn/stream` 요청: `{ "concept": string, "language": "ko" }`
  - SSE 순서: `event: status` → `event: delta` (다수) → `event: complete` 또는 `event: error`
  - error code: `MISSING_CLAUDE_API_KEY`, `CLAUDE_API_ERROR`, `INTERNAL_ERROR`, 요청 검증 실패 시 `400 INVALID_CONCEPT`
- **백엔드 계약** (`server/src/main/kotlin/socratic/learn/api/AnswerRoutes.kt`):
  - `POST /answers` 요청: `AnswerSubmissionRequest(sessionId?, concept?, answers: [{questionId?, question?, answer?, unknown}])`
  - 응답: `{ status, receivedCount, message }`. 빈 answers는 `400 EMPTY_ANSWERS`.
- **공유 계약 위치** (TS로 미러링할 원본):
  - `shared/src/commonMain/kotlin/socratic/learn/shared/api/ApiPaths.kt`
  - `shared/src/commonMain/kotlin/socratic/learn/shared/api/LearnContracts.kt`
  - `shared/src/commonMain/kotlin/socratic/learn/shared/api/AnswerContracts.kt`
  - `shared/src/commonMain/kotlin/socratic/learn/shared/api/CommonResponses.kt`
  - `shared/src/commonMain/kotlin/socratic/learn/shared/event/SseEvents.kt`
  - `shared/src/commonMain/kotlin/socratic/learn/shared/event/StreamEvents.kt`
- **v3 시안 핵심 파일** (`socratic-learn-web-calude-design/`):
  - `Socratic Learn Web v3.html` - React 18 + Babel standalone CDN, JSX 직접 로드
  - `app-v3.jsx` - 진입점, 상태 머신, TWEAK_DEFAULTS, ACCENT_PRESETS, DEPTHS, PHASES, Sidebar
  - `stages-v3.jsx` - SAMPLE_CONCEPT, PROBE_QUESTIONS, estimateLevel, 단계 컴포넌트들, markdown 렌더
  - `tweaks-panel.jsx` - 디자인 토큰 편집 패널 (개발 보조, 프로덕션 제외 가능)
  - `styles-v3.css` - OKLCH 토큰, holographic gradient, accent preset
  - 외부 CDN: Pretendard variable font, JetBrains Mono
- **삭제 대상** (`frontend/`):
  - `build.gradle.kts` (Compose plugins)
  - `src/wasmJsMain/kotlin/com/socraticlearn/frontend/` 전체 (Main.kt, App.kt, api/, screens/, state/)
  - `src/wasmJsMain/resources/index.html`
  - 부속 AGENTS.md들은 React 구조에 맞춰 재생성(deepinit) 또는 수동 갱신
- **루트 영향**:
  - `settings.gradle.kts`: `include(":frontend")` 제거
  - `build.gradle.kts`: Compose plugin alias 미사용 시 정리
  - `kotlin-js-store/`: 더 이상 필요 없음(삭제)
  - `CLAUDE.md`: 프론트 빌드 명령/모듈 설명 갱신

## Ontology (Key Entities)
| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| LearnStreamRequest | API DTO | concept, language | POST /learn/stream 요청 |
| StreamStatusEvent | SSE event | status, message | 첫 이벤트 |
| StreamDeltaEvent | SSE event | text | 본문 누적 |
| StreamCompleteEvent | SSE event | content | 종료 |
| StreamErrorEvent | SSE event | code, message | 실패 분기 키 |
| AnswerSubmissionRequest | API DTO | sessionId?, concept?, answers[] | POST /answers |
| AnswerItem | API DTO | questionId?, question?, answer?, unknown | answers의 원소 |
| StageMachine | UI state | input/probe/roadmap/explain/questions/answering/done | v3 단계 머신 |
| ProbeAnswer | UI state | p1(choice), p2(multi), p3(text) | 수준 추정 입력 |
| AccentPreset | Design token | 4-color array | 테마 스위치 |

## Implementation Outline (omc-plan에 넘길 입력)
1. **Compose 모듈 폐기**: `frontend/` 하위 코드/AGENTS.md 삭제. 루트 `settings.gradle.kts` / `build.gradle.kts` / `kotlin-js-store/` 정리. 루트 빌드 그린 유지.
2. **React 프로젝트 스캐폴딩** (`frontend/`):
   - `package.json` (vite, react, react-dom, typescript, @types/react, @types/react-dom, @vitejs/plugin-react)
   - `vite.config.ts` (port: `process.env.FE_PORT || 5173`)
   - `tsconfig.json` (strict, jsx: "react-jsx", target ES2022)
   - `index.html` (root div, font preconnect는 CSS로 이전 가능)
   - `src/main.tsx`, `src/App.tsx`
3. **디자인 자산 이식**:
   - `styles-v3.css` → `src/styles/v3.css` (그대로 복사 후 main에서 import)
   - 폰트 link → `index.html` head 유지 또는 CSS @import
   - `icons.jsx`의 Ico/I 객체 → `src/components/icons.tsx`로 TSX 변환
4. **컴포넌트 포팅** (JSX → TSX, React.useState → 그대로):
   - `app-v3.jsx` → `src/App.tsx` + `src/components/Sidebar.tsx` + 상태 머신 hook
   - `stages-v3.jsx` → `src/stages/{Input,Probe,Roadmap,Explain,Questions,Answering,Done}.tsx`
   - `tweaks-panel.jsx` → `src/dev/TweaksPanel.tsx` (dev only)
5. **API 계약 미러** (`src/api/contract.ts`):
   - `ApiPaths`, `SseEvents` 상수
   - `LearnStreamRequest`, `Stream*Event`, `AnswerSubmissionRequest`, `AnswerItem`, `AnswerSubmissionResponse`, `ErrorResponse` 인터페이스
   - baseUrl 환경변수: `VITE_API_BASE_URL` (기본 `http://localhost:8081`)
6. **SSE 클라이언트** (`src/api/learnStream.ts`):
   - `fetch(POST /learn/stream)` + `response.body.getReader()` + TextDecoder
   - `event:` / `data:` 라인 파싱, `SseEvents` 분기, 콜백(`onStatus`, `onDelta`, `onComplete`, `onError`)
   - AbortController로 취소 지원
7. **Answers 클라이언트** (`src/api/answers.ts`):
   - `fetch(POST /answers)` + JSON
8. **stage 연동**: `explain` 단계에서 learnStream 호출 → delta 누적 → markdown 렌더(`stages-v3.jsx`의 markdown 함수 포팅). `answering` 단계에서 answers 호출.
9. **에러 UI**: error code별 사용자 메시지(특히 `MISSING_CLAUDE_API_KEY` 는 API 키 설정 안내).
10. **문서 갱신**: `frontend/README.md` 신설, 루트 `CLAUDE.md` 프론트 섹션 갱신, 루트 `AGENTS.md` 및 `frontend/AGENTS.md` 트리 deepinit 재생성(또는 수동 갱신).

## Open Questions (의도적 보류)
- Vite dev server 포트의 공식 디폴트 (5173 vs 기존 8080 vs FE_PORT 환경변수 우선) - 실행 단계에서 선택.
- `tweaks-panel`을 프로덕션 빌드에서 어떻게 제외할지 (env flag vs dev-only mount).
- v3의 `markdown` 렌더가 외부 라이브러리(예: marked) 의존인지 자체 구현인지 - 포팅 시 확인 필요.
- 추후 Ktor static 서빙 통합 시점 (별도 PR).

## Interview Transcript
<details>
<summary>Compressed Q&A (Round 0 + 2 rounds, --quick)</summary>

### Round 0 — Topology
**Q (요약):** 4-component topology (Stack 선정 / v3 포팅 / 기존 frontend 처리 / shared 계약 연동) 확인.
**A:** 사용자가 quick 모드로 즉시 핵심 결정으로 진입.

### Round 1 — Core decisions
**Q1:** 프론트엔드 stack? **A1:** Vite + React + TS
**Q2:** 기존 Compose `frontend/` 처리? **A2:** 삭제 후 동일 경로에 신설
**Q3:** 디자인 + 계약 활용? **A3:** v3 + shared DTO 타입 공유

### Round 2 — Integration details
**Q1:** 새 React 프로젝트 디렉터리 이름? **A1:** `frontend/` 재사용
**Q2:** shared → TS 동기화 방식? **A2:** `src/api/contract.ts` 수기 미러링
**Q3:** 빌드 산출물 호스팅? **A3:** Vite dev server 독립 (CORS 활용)
</details>

---

**Status: pending approval** - 이 spec은 실행 승인 전 단계입니다. 아래 옵션 중 하나를 명시적으로 선택해야 다음 단계가 진행됩니다.
