<!-- Parent: ../../../../../../AGENTS.md -->
<!-- Generated: 2026-05-24 | Updated: 2026-05-24 -->

# com.socraticlearn.frontend

## Purpose
프론트엔드 진입점과 최상위 `App` Composable. `LearningUiState` sealed interface 기반의 단순 화면 머신을 가지고 있다.

## Key Files
| File | Description |
|------|-------------|
| `Main.kt` | `main() { ComposeViewport("webApp") { App() } }`. **주의: 이 파일에 다른 `App` Composable도 정의되어 있어 `App.kt`의 정의와 중복** - 정리 필요 |
| `App.kt` | `LearningUiState` 분기에 따라 `ConceptInputScreen` → `StreamingScreen`(mock progress) → `AnswerScreen` → `ReviewScreen` 전환 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `api/` | 서버 HTTP/SSE 클라이언트 자리(현재 placeholder) (see `api/AGENTS.md`) |
| `screens/` | 4단계 화면 Composable (see `screens/AGENTS.md`) |
| `state/` | UI 상태/모델/mock 데이터 (see `state/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- **`Main.kt`와 `App.kt`에 같은 이름의 `App()` Composable이 충돌한다.** wasm 컴파일 시 어느 쪽이 선택되는지 확인 후 한쪽 제거가 우선 작업 후보.
- 화면 전환은 `remember { mutableStateOf<LearningUiState>(...) }` 단일 상태로 관리. 라우터 라이브러리 도입 전까지 이 패턴 유지.
- `StreamingScreen` 단계의 progress 증가는 현재 `LaunchedEffect`+`delay` mock. 실제 SSE 연동 시 `api/`의 client로 교체.

### Common Patterns
- 화면별 콜백(`onStart`, `onSubmit`, `onRestart`) 형태로 상위 state 갱신.

## Dependencies

### Internal
- `state.LearningUiState`, `state.AnswerSubmissionDraft`
- `screens.*` 4종

### External
- `androidx.compose.material3.MaterialTheme`
- `androidx.compose.ui.window.ComposeViewport`
- `kotlinx.coroutines.delay`

<!-- MANUAL: -->