# Deep Interview Spec: 학습 stage 단순화 (roadmap 흡수 + learn 통합)

## Metadata
- Rounds: 5 (+ Round 0 topology)
- Final Ambiguity Score: ~12%
- Type: brownfield (frontend/, React 18 + TS + Vite)
- Threshold: 20%
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.85 | 0.35 | 0.298 |
| Constraint Clarity | 0.85 | 0.25 | 0.213 |
| Success Criteria | 0.90 | 0.25 | 0.225 |
| Context Clarity | 0.85 | 0.15 | 0.128 |
| **Total Clarity** | | | **0.864** |
| **Ambiguity** | | | **0.136 (~14%)** |

## Topology
| Component | Status | Description | Coverage |
|-----------|--------|-------------|----------|
| roadmap-merge | active | 단독 `roadmap` 페이지 제거, 로드맵 컨텐츠를 `learn` 화면 상단에 흡수 | AC #1, #2, #6 |
| learning-unify | active | `explain` + `questions` + `answering` 3페이지를 한 `learn` 페이지의 좌우 2컬럼으로 통합 | AC #3, #4, #5, #6, #7 |

## Goal
프론트엔드 학습 흐름의 stage 머신을 `input | probe | learn | done` 4단계로 단순화한다. 기존 `roadmap` 페이지는 제거하되 로드맵(단계 목록) 정보는 `learn` 화면 상단에 설명+단계칩 형태로 노출한다. 한 step의 `explain` → `questions` → `answering` 3단계 페이지는 좌우 2컬럼 단일 페이지(`side-columns.html` 레이아웃 참고)로 통합하여 한 화면에서 설명을 보면서 확인 질문과 답변을 진행할 수 있게 한다.

## Constraints
- `Stage` 타입을 `"input" | "probe" | "learn" | "done"` 4개로 축소한다.
- step 간 이동은 step 단위로만 발생한다. 페이지 내부 micro-step은 두지 않는다.
- "건너뛰기" 버튼은 항상 노출되며, 누르면 해당 step의 모든 질문이 `skips[stepId] = true`로 저장되고 다음 step으로 이동한다.
- "다음" 버튼은 빈 답변이어도 진행을 막지 않는다(스킵 아님, 정상 진행).
- 로드맵 단계칩과 본문 2컬럼은 `learn` 화면 안에서 함께 렌더된다.
- 좌우 2컬럼 레이아웃은 `socratic-learn-web-calude-design/side-columns.html`의 디자인 토큰/구조를 참고한다.
- SSE 호출 시점 (`loadProbe`는 `probe` 진입 시, `loadSteps`는 `learn` 진입 시 추정 레벨로 1회)은 그대로 유지한다.

## Non-Goals
- 백엔드(`server/`) 변경 없음. `shared` API 계약 변경 없음.
- Probe/Done 단계 UI 변경 없음.
- 새로운 채점 로직, 인증, 세션 저장 추가 없음.
- v3 디자인 시안의 tweaks-panel 포팅 없음.

## Acceptance Criteria
- [ ] AC1: `frontend/src/stages/data.ts`의 `Stage` 타입이 `"input" | "probe" | "learn" | "done"` 4개로 축소되고 빌드(`tsc -b`)가 통과한다.
- [ ] AC2: `learn` stage 진입 시 화면 상단에 단계 설명 + 단계칩(step 목록, 현재 step 하이라이트)이 표시된다.
- [ ] AC3: `learn` 화면 본문이 좌우 2컬럼이다. 좌측은 현재 step의 설명 텍스트, 우측은 확인 질문 목록과 각 질문별 답변 textarea다.
- [ ] AC4: 각 step에서 "이전 / 건너뛰기 / 다음" 3개 버튼이 노출된다. "건너뛰기"는 `skips[stepId] = true`를 기록하고 다음 step으로 이동한다. "다음"은 답변이 비어있어도 진행을 허용한다(스킵으로 기록하지 않음).
- [ ] AC5: 마지막 step에서 "다음"을 누르면 `done` stage로 이동한다. "이전"을 처음 step에서 누르면 `probe`로 돌아간다.
- [ ] AC6: `Roadmap.tsx`, `Explain.tsx`, `Questions.tsx`, `Answering.tsx` 4개 stage 파일은 제거되거나 새 `Learn.tsx` 한 파일로 통합된다. `ProgressBar`는 4단계(`input | probe | learn | done`)로 갱신되고 `learn` 내부에서는 stepIdx 진행도(N/M)를 함께 표시한다.
- [ ] AC7: SSE 호출 흐름이 유지된다. `probe` 진입 시 `loadProbe(concept)` 1회, `learn` 진입 시 `loadSteps(concept, estimatedLevel)` 1회 호출. `estimatedLevel`이 바뀌면 재호출.

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| 로드맵을 그냥 사이드바에 넣으면 된다 | 사이드바와 본문 어느 쪽이 first-class인지 모호 | 학습 페이지 상단에 설명+단계칩으로 노출(사이드바 아님) |
| 한 페이지에 그냥 합치면 된다 | 좌우/세로/탭 어떤 레이아웃? | side-columns.html 기반 좌우 2컬럼 (좌: 설명, 우: 질문+답변) |
| 통합 후 스킵 동작은 자동 추론 | 빈 답변=스킵으로 보면 사용자 의도와 충돌 | 명시적 "건너뛰기" 버튼 분리, "다음"은 빈 답변도 허용 |
| Stage 타입은 살리고 컨텐츠만 흡수 | 타입이 살아있으면 ProgressBar/네비 로직이 복잡 | Stage 타입 자체를 4개로 단순화 (보수적 옵션 거부) |

## Technical Context
관련 파일:
- `frontend/src/App.tsx` - stage 상태 머신, stepIdx, onStepDone/onPrevFromExplain
- `frontend/src/stages/data.ts` - `Stage` 타입
- `frontend/src/stages/{Roadmap,Explain,Questions,Answering}.tsx` - 통합/폐기 대상
- `frontend/src/components/ProgressBar.tsx` - 4단계로 재구성
- `frontend/src/state/LearnContent.tsx` - SSE 컨텐츠 로더(변경 없음)
- `socratic-learn-web-calude-design/side-columns.html` - 2컬럼 레이아웃 디자인 참고
- `frontend/src/styles/v3.css` - 필요한 토큰/유틸 클래스 추가

빌드: `cd frontend && npm run build` (tsc -b → vite build).

## Interview Transcript
<details>
<summary>Q&A 5 rounds</summary>

**Round 0 — Topology**
Q: 2개 컴포넌트 topology가 맞나요?
A: 맞음 - 2개 그대로 진행

**Round 1 — roadmap-merge / Goal**
Q: 로드맵(단계 목록)은 '학습 진행' 화면에서 어떻게 노출되나요?
A: 학습 페이지 상단에 설명+단계칩 같이

**Round 2 — learning-unify / Goal**
Q: 한 step의 통합 화면 구조는 어떤 모양?
A: 좌우 2컬럼(side-columns.html 활용)

**Round 3 — learning-unify / Constraints**
Q: 이전/다음/스킵 동작은?
A: step 단위 이동, 명시적 '건너뛰기' 버튼 제공

**Round 4 — roadmap-merge / Constraints (Contrarian)**
Q: Stage 타입을 완전 제거할지, 이름만 유지할지?
A: Stage = input | probe | learn | done 으로 단순화

**Round 5 — Both / Success Criteria**
Q: 7개 acceptance 기준 충분?
A: 충분 - 이대로 스펙 확정
</details>
