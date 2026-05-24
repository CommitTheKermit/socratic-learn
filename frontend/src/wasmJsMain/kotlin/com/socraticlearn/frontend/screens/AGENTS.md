<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-24 | Updated: 2026-05-24 -->

# screens

## Purpose
학습 사이클의 4단계 Composable 화면. 각 화면은 부모(`App`)가 주는 콜백으로 다음 상태를 트리거한다. 상태/모델은 `../state/`에서 import.

## Key Files
| File | Description |
|------|-------------|
| `ConceptInputScreen.kt` | 시작 화면 - 개념 입력 + 최근 세션 목록. `onStart(concept)` 콜백 |
| `StreamingScreen.kt` | Claude 응답 스트리밍 시각화. 현재 mock progress 시뮬레이션. `onJumpDone()` |
| `AnswerScreen.kt` | 확인 질문 답변 입력. `onSubmit(AnswerSubmissionDraft)` |
| `ReviewScreen.kt` | 제출 내용 리뷰. `onRestart()` |

## For AI Agents

### Working In This Directory
- Material3 컴포넌트(`OutlinedTextField`, `Button`, `Card`, `Surface`) 기반. 색상/shape 상수는 화면 내부에 산재 - 토큰화 작업은 별도 합의 후 진행.
- Compose에서 `remember { mutableStateOf(...) }`로 로컬 입력 상태 관리. 상위 상태와는 콜백으로만 연결.
- `AnswerSubmissionDraft` 등 모델은 `../state/`에서 import. 화면 파일에 데이터 클래스 정의 금지.
- `MockQuestions.kt`, `MockLearningContent.kt`는 SSE 연동 전까지 사용. 연동 후 점진 제거.

### Common Patterns
- 새 화면 추가 시:
  1. `LearningUiState` sealed interface에 새 case 추가
  2. `App.kt`의 `when` 분기에 등록
  3. 콜백 시그니처는 단방향(상위 state 갱신만)으로 유지

## Dependencies

### Internal
- `state.LearningUiState`, `state.AnswerSubmissionDraft`, `state.MockQuestions`, `state.MockLearningContent`, `state.RecentSessions`

### External
- `androidx.compose.foundation.*`, `material3.*`, `runtime.*`, `ui.*`

<!-- MANUAL: -->