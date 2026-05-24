<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-24 | Updated: 2026-05-24 -->

# state

## Purpose
프론트엔드 UI 상태 표현과 mock 데이터. shared 계약 모듈이 아닌 **클라이언트 전용** 모델은 여기에 둔다(직렬화 대상 DTO는 `:shared`로).

## Key Files
| File | Description |
|------|-------------|
| `LearningUiState.kt` | sealed interface - `Input`, `Streaming(concept, progress)`, `Answering(concept)`, `Reviewed(concept, submission)` |
| `LearningModels.kt` | `SampleConcept` 상수, `RecentSession(title, topic, time, active)` + `RecentSessions` mock 리스트 |
| `MockLearningContent.kt` | Claude 응답 mock 텍스트(스트리밍 시뮬레이션용) |
| `MockQuestions.kt` | 확인 질문 mock |
| (외부 정의 추정) `AnswerSubmissionDraft` | screens에서 사용되는 답변 초안 모델 - 위치 확인 필요 |

## For AI Agents

### Working In This Directory
- `:shared`의 DTO(`AnswerSubmissionRequest` 등)와 화면용 모델(`AnswerSubmissionDraft`)을 구분: 화면 입력 중간 상태/UI 전용 필드는 여기, 서버로 보내는 직렬화 페이로드는 `:shared`.
- mock 파일들(`Mock*.kt`)은 실제 SSE 연동 후 점진 제거. 새 mock 추가 전에 진짜 연동이 더 빠른지 검토.
- sealed interface 분기 추가 시 `App.kt` `when`에 새 case 등록 의무.

## Dependencies

### Internal
- (외부) screens 패키지에서 import

### External
- 표준 라이브러리만

<!-- MANUAL: -->