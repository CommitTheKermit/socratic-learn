<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-24 | Updated: 2026-05-24 -->

# socratic.learn.shared.event

## Purpose
Server-Sent Events 이벤트 이름 상수와 payload DTO. 서버는 이 상수와 DTO만으로 SSE를 작성하고, 프론트는 동일 상수로 파싱한다.

## Key Files
| File | Description |
|------|-------------|
| `SseEvents.kt` | `STATUS="status"`, `DELTA="delta"`, `COMPLETE="complete"`, `ERROR="error"` |
| `StreamEvents.kt` | `StreamStatusEvent(status, message)`, `StreamDeltaEvent(text)`, `StreamCompleteEvent(content)`, `StreamErrorEvent(code, message)` |

## For AI Agents

### Working In This Directory
- 서버 `LearnRoutes`에서 raw 문자열("status", "delta" 등)을 직접 쓰지 말고 항상 `SseEvents.*` 사용.
- 새 이벤트 추가 시:
  1. `SseEvents`에 상수 추가
  2. `StreamEvents.kt`에 `@Serializable data class` 추가
  3. 서버 라우트에서 `writeSse(event=SseEvents.X, data=...)` 등록
  4. 프론트엔드 파서 분기 업데이트
- 이벤트 stream 순서 계약: `status` → `delta`(0..n) → (`complete` | `error`). 새 이벤트 추가 시 순서 영향 명시.
- `StreamErrorEvent.code`는 클라이언트가 분기 키로 쓴다 - 코드 값 추가/변경 시 서버 catch 분기와 클라 처리 모두 동기화 필요.

## Dependencies

### External
- `kotlinx.serialization.Serializable`

<!-- MANUAL: -->