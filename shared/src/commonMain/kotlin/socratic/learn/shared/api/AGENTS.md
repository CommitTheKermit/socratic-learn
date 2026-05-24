<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-24 | Updated: 2026-05-24 -->

# socratic.learn.shared.api

## Purpose
HTTP 엔드포인트 path 상수와 요청/응답 DTO. 서버 라우트와 프론트엔드 클라이언트가 동시에 import 한다.

## Key Files
| File | Description |
|------|-------------|
| `ApiPaths.kt` | `HEALTH = "/health"`, `LEARN_STREAM = "/learn/stream"`, `ANSWERS = "/answers"` |
| `LearnContracts.kt` | `LearnStreamRequest(concept, language="ko")` |
| `AnswerContracts.kt` | `AnswerSubmissionRequest(sessionId?, concept?, answers: List<AnswerItem>)`, `AnswerItem(questionId?, question?, answer?, unknown=false)`, `AnswerSubmissionResponse(status, receivedCount, message)` |
| `CommonResponses.kt` | `ErrorResponse(code, message)` |

## For AI Agents

### Working In This Directory
- 새 path는 반드시 `ApiPaths`에 상수로 추가하고 서버/프론트에서 그 상수를 import. 라우트/클라이언트 코드에 raw 문자열 금지.
- 모든 DTO는 `@Serializable` 필수. nullable/default 값을 명시해 wire format 호환성 확보.
- DTO에 필드를 추가할 때는 default 값을 제공해 기존 클라이언트와의 호환성을 깨지 않도록 한다.
- 이름이 너무 일반적인 DTO(예: `ErrorResponse`)는 사용 범위가 넓다 - 변경 시 전체 라우트 영향 확인.

### Common Patterns
- 요청 DTO는 `*Request`, 응답은 `*Response`, 내부 element는 `*Item` 접미사.

## Dependencies

### External
- `kotlinx.serialization.Serializable`

<!-- MANUAL: -->