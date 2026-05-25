# Deep Interview Spec: 학습 진행 단계 답변 평가 추가

## Metadata
- Rounds: 8 (Round 0 + 7 scoring rounds)
- Final Ambiguity: ~10%
- Type: brownfield (frontend/socratic-learn)
- Threshold: 20%
- Status: PASSED
- Status flag: pending approval

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|---|---|---|---|
| Goal | 0.95 | 0.35 | 0.3325 |
| Constraints | 0.90 | 0.25 | 0.2250 |
| Success Criteria | 0.85 | 0.25 | 0.2125 |
| Context | 0.75 | 0.15 | 0.1125 |
| **Total Clarity** | | | **0.88** |
| **Ambiguity** | | | **0.12** |

## Topology

| Component | Status | Description | Coverage Note |
|---|---|---|---|
| scoring-api | active | Claude 호출로 한 단계의 답변들을 일괄 평가 | AC1, AC2, AC8 |
| eval-in-qa-column | active | 기존 lv2-right(우측 컬럼) 안에 등급/피드백 UI 통합 | AC3-AC7 |

`3-col-layout`, `collapse-ux`, `3rd-column-ui`는 Round 4 Contrarian에서 사용자에 의해 제거됨. lv2-body는 2컬럼 유지.

## Goal
학습 진행 단계의 우측 컬럼(`lv2-right`) 안에 답변 평가 흐름을 통합한다. 사용자는 각 질문에 답한 뒤 우측 컬럼 상단에 sticky/floating으로 떠 있는 "답변 제출" 버튼을 눌러 한 단계의 답변들을 일괄 평가받는다. 평가 결과는 각 `qa-pair` 헤더 우측에 4등급(정답/거의/부족/오답) 뱃지와 textarea 아래 피드백 박스로 표시된다. "다음 개념" 버튼은 평가 완료 전까지 비활성이며, 평가 없이 클릭 시 토스트로 "답변 제출이 필요합니다"를 안내한다.

## Constraints
- API 호출은 단계당 1회만 (캐시). 이전 개념으로 돌아가도 이미 평가된 단계의 결과/상태는 그대로 유지.
- skip(`skips[qid]=true`)된 질문은 API 요청에서 아예 제외(LLM에 전달하지 않음). UI에는 기존 `is-skipped` 스타일만 유지, 등급 뱃지 표시 안 함.
- 빈 답변은 그대로 API에 전송(LLM이 평가, 보통 "부족" 또는 "오답"으로 분류됨).
- 평가 응답 표시 직후 해당 단계의 모든 답변 textarea를 readonly로 전환. 모범답안/다시 작성 버튼은 만들지 않음.
- 등급은 정답/거의/부족/오답 4단계로 고정. 점수 숫자나 단계 종합 overallScore/summary는 UI에 노출하지 않음(API 응답에 포함하지 않아도 됨).
- 3컬럼 레이아웃 도입 X, 컬럼 접기 UX 도입 X. lv2-body의 `grid-template-columns: 1fr 1fr` 유지.
- 백엔드(`server/`), shared 계약 변경 없음. 평가 호출은 `frontend/src/api/claudeContent.ts`에 Anthropic SDK 직접 호출 패턴으로 추가.
- 토스트/스낵바는 기존 컴포넌트가 없으면 가벼운 자체 구현 가능(단일 메시지, auto-dismiss 2-3초).

## Non-Goals
- 3번째 컬럼 추가, 3컬럼 레이아웃, 어떤 형태의 컬럼 접기 UX
- 모범답안 보기, 다시 작성, 재평가 흐름
- 점수 숫자 노출, 단계 종합 점수/요약 카드
- Done 단계 변경(이번 작업 범위 밖, 기존 그대로)
- 백엔드 라우트 추가, shared DTO 변경
- 평가 결과 영속화(서버 저장/로컬 스토리지) - 메모리(useState)에만 보관

## Acceptance Criteria
- [ ] AC1: `frontend/src/api/claudeContent.ts`에 `generateAnswerEvaluation(concept, level, step, answers)` 함수 추가. 입력: `step.questions` 중 skip 제외한 항목들 + 사용자의 답변, 단계 title/desc 컨텍스트. 출력 스키마: `{ evaluations: [{ id: string, grade: "correct"|"almost"|"partial"|"wrong", feedback: string }] }`. Anthropic SDK `messages.parse` + JSON schema 사용. ClaudeContentError 매핑은 기존 패턴 재사용.
- [ ] AC2: 우측 컬럼(`lv2-right`) 상단에 "답변 제출하고 평가받기" 버튼을 sticky(스크롤해도 보이게)로 배치. 버튼 클릭 시 현재 step의 skip 제외 질문/답변을 API로 전송. 로딩 중 버튼 spinner + disabled.
- [ ] AC3: 평가 응답 수신 시, 각 `qa-pair` 헤더 우측에 4등급 뱃지 표시(`correct`=green, `almost`=lime, `partial`=orange, `wrong`=red). textarea 아래에 피드백 박스(라벨 "AI 피드백" + 응답 텍스트) 추가.
- [ ] AC4: 평가 표시 직후 해당 step의 모든 textarea를 `readOnly` 처리(skip 질문 포함, skip은 평가 뱃지 없이 기존 스타일 유지).
- [ ] AC5: 평가 전에는 하단 "다음 개념"/"학습 마치기" 버튼 disabled. 클릭 시 토스트 "답변 제출이 필요합니다" 노출(2-3초 auto-dismiss). "이전 개념" 버튼은 평가 여부와 무관하게 항상 활성.
- [ ] AC6: 평가 완료 후 "다음 개념"/"학습 마치기" 활성화. 클릭 시 기존 흐름(setStepIdx+1 또는 onDone).
- [ ] AC7: 평가 캐시 - 이미 평가된 step으로 돌아왔을 때(stepIdx 변경) 등급/피드백/readonly 상태가 그대로 복원. API 재호출 없음.
- [ ] AC8: skip 질문은 평가 요청 페이로드에서 제외(`questions.filter(q => !skips[q.id])`). 응답의 `evaluations`에도 포함되지 않음. UI는 `is-skipped` 스타일만 표시.
- [ ] AC9: `cd frontend && npm run build`(tsc -b + vite) 통과.
- [ ] AC10: 평가 API 에러 시 `describeErrorCode`로 메시지 표시 + "다시 시도" 버튼 (단계 detail 에러 처리와 동일 패턴). 에러 후엔 textarea 잠금 해제 유지, "다음 개념" 계속 disabled.

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|---|---|---|
| "3개 컬럼으로 확장한다" | Contrarian: 정말 3번째 컬럼이 필요한가? | 우측 컬럼에 평가 정보를 통합하는 쪽이 더 단순 - 3컬럼/접기 모두 제거 |
| "수직 방향으로 접힌다" | 어떤 동작인지 확인 | 사용자가 의미를 재고하여 컬럼 접기 자체를 폐기 |
| "다음 개념 클릭이 평가 트리거" | Simplifier: 이미지엔 별도 제출 버튼이 있음 | 명시적 floating "답변 제출" 버튼 + "다음 개념"은 평가 후 활성화 (gating) |
| "모범답안 보기 + 다시 작성 버튼 필요" | 정말 필요한가 | 둘 다 제거 (1회성 평가, readonly로 단순화) |
| "점수 숫자(0-100) + 종합 카드 필요" | UI에 노출하는가 | 4등급 뱃지만, 점수/종합은 UI에 노출하지 않음 |

## Technical Context
- 파일: `frontend/src/stages/Learn.tsx`(주 수정), `frontend/src/api/claudeContent.ts`(함수 추가), `frontend/src/state/LearnContent.tsx`(평가 상태/액션 추가), `frontend/src/styles/v3.css`(뱃지/피드백 박스/sticky 버튼/토스트 스타일).
- 패턴 재사용: `generateRoadmapOutline` / `generateStepDetail`과 동일하게 `messages.parse` + `jsonSchemaOutputFormat` + `ClaudeContentError` 매핑.
- 상태 위치: 단계별 평가 결과는 `LearnContent` 컨텍스트에 `stepEvaluations: Record<number, Evaluation>` + `stepEvalStatus: Record<number, "idle"|"loading"|"ready"|"error">`로 관리(기존 `stepDetailStatus`와 같은 모양). 이렇게 하면 stepIdx 캐시/재방문이 자연스럽게 동작.
- 토스트는 `Learn.tsx` 내부 useState로 단순 구현(단일 메시지 + setTimeout 클리어).
- skip은 기존 `App.tsx`의 `skips: Record<string, boolean>` 그대로 사용.

## Ontology (Key Entities)
| Entity | Type | Fields | Relationships |
|---|---|---|---|
| Step | core domain (기존) | id, title, desc, body, questions | has many StepQuestion |
| StepQuestion | core domain (기존) | id, q, hint | 하나의 Step에 속함 |
| Answer | core domain (기존) | qId, text | 하나의 StepQuestion에 대한 사용자 답변 |
| SkipFlag | supporting (기존) | qId, true/false | 하나의 StepQuestion에 대한 skip 상태 |
| Evaluation | core domain (신규) | stepId, items: EvaluationItem[] | 하나의 Step에 대한 일괄 평가 결과 |
| EvaluationItem | core domain (신규) | qId, grade(correct/almost/partial/wrong), feedback | 한 Step의 한 질문에 대한 평가 |
| SubmitFloatingButton | UI (신규) | sticky 위치, loading state | lv2-right 상단에 위치 |
| GradeBadge | UI (신규) | grade, color | qa-pair 헤더 우측 |
| FeedbackBox | UI (신규) | text | textarea 하단 |
| Toast | UI (신규) | message, autoDismissMs | Learn 페이지 전역(우측 하단) |

## Interview Transcript
<details>
<summary>Round 0 - Topology</summary>

**Q:** 4개 컴포넌트 구성 확인 (Scoring API, 3번째 컬럼 UI, 3컬럼 레이아웃, 컬럼 접기 UX)
**A:** 4개 그대로 맞음
</details>

<details>
<summary>Round 1 - 평가 트리거 단위</summary>

**Q:** 평가는 언제, 어떤 단위로 호출되나요?
**A:** 단계별 일괄 평가 (다음 개념 클릭 시) - 이후 Round 6에서 명시적 제출 버튼으로 변경됨
</details>

<details>
<summary>Round 2 - 출력 스키마</summary>

**Q:** 평가 결과의 출력 구조는 어떤 형식이 좋을까요?
**A:** 질문별 점수 + 피드백 + 단계 종합 - 이후 Round 6에서 4등급 + 피드백 + 종합 미노출로 변경됨
</details>

<details>
<summary>Round 3 - 경계 조건</summary>

**Q:** 평가의 경계 조건들은 어떻게 처리할까요?
**A:** 일반적 기본값 (skip 제외, 빈답 score:0, 한 번 평가 후 캐시, 답변 수정 후 재평가) - skip 처리는 Round 8에서 "API 요청에서 제외"로 명확화, 재평가는 Round 7에서 폐기
</details>

<details>
<summary>Round 4 - Contrarian: 수직 접힘 검증</summary>

**Q:** "수직 방향으로 접힌다"는 구체적으로 어떤 동작인가요?
**A:** 사용자가 의도를 재고: "수평이 의도였는데, 애초에 질문 답변 컬럼에 정보를 추가/변경하는 게 낫겠다" - 3컬럼/접기 컴포넌트 모두 제거
</details>

<details>
<summary>Round 5 - 우측 컬럼 내 배치</summary>

**Q:** 평가 결과를 lv2-right 안에 어떻게 압축해 넣을까요?
**A:** answer_example.png 참조 - qa-pair 헤더 우측 등급 뱃지, textarea 아래 피드백, 우측 상단 진행률, 하단 액션 버튼, 종합 카드 없음
</details>

<details>
<summary>Round 6 - Simplifier: 트리거 + 등급</summary>

**Q:** 평가 트리거 + 등급 체계 확정
**A:** 4등급(정답/거의/부족/오답) + "답변 제출" 버튼을 우측 컬럼 상단 sticky/floating + "다음 개념" 평가 전 비활성 + 클릭 시 토스트 안내
</details>

<details>
<summary>Round 7 - 피드백 액션</summary>

**Q:** "모범답안 보기"/"다시 작성" 동작
**A:** 둘 다 없애기 (제거)
</details>

<details>
<summary>Round 8 - 제출 직후 상태</summary>

**Q:** 제출 직후 textarea + skip 처리
**A:** textarea readonly + skip은 API 요청에서 제외
</details>

## Next Step (pending approval)
이 spec은 `pending approval` 상태입니다. 어떻게 진행할지 선택해 주세요.
