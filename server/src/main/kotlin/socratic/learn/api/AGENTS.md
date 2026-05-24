<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-24 | Updated: 2026-05-24 -->

# api (server routes)

## Purpose
Ktor `Route` 확장 함수 집합. HTTP/SSE 엔드포인트만 정의하고, 도메인 로직은 `claude/` 패키지에 위임한다.

## Key Files
| File | Description |
|------|-------------|
| `LearnRoutes.kt` | `POST /learn/stream` - `respondTextWriter(ContentType.Text.EventStream)`로 SSE 직접 작성. `status` → 다수의 `delta` → `complete`/`error` 순. 예외 종류(`MissingClaudeApiKeyException`, `ClaudeApiException`, 기타)에 따라 SSE `error.code`를 분기 |
| `AnswerRoutes.kt` | `POST /answers` - 1차 MVP에서는 저장/채점 없이 수신 확인만 (`AnswerSubmissionResponse`) |

## For AI Agents

### Working In This Directory
- **SSE 호출은 반드시 `withContext(Dispatchers.IO)`**. `HttpClient.send(... BodyHandlers.ofLines())`는 blocking 스트림이라 IO dispatcher 필요.
- SSE 이벤트 이름은 raw 문자열 대신 `SseEvents.STATUS/DELTA/COMPLETE/ERROR` 사용. payload는 shared의 `Stream*Event` DTO 직렬화.
- 예외 → `error.code` 매핑을 임의로 통합하지 말 것. 클라이언트가 code별로 다른 UI 분기를 한다.
  - `MissingClaudeApiKeyException` → `MISSING_CLAUDE_API_KEY`
  - `ClaudeApiException` → `CLAUDE_API_ERROR` (status code 노출)
  - 기타 → `INTERNAL_ERROR` (메시지 마스킹, logger.error로 stack 기록)
- 요청 검증 실패는 SSE 전에 `call.respond(BadRequest, ErrorResponse(...))`로 짧게 응답.
- `writeSse` 호출 후 매번 `flush()`. 빠뜨리면 클라이언트로 즉시 전달되지 않음.

### Common Patterns
- 새 라우트 추가 시:
  1. `shared/.../api/ApiPaths.kt`에 path 상수 추가
  2. 요청/응답 DTO는 `shared`에 `@Serializable`로 정의
  3. `Application.module`에 라우트 등록 함수 호출

## Dependencies

### Internal
- `socratic.learn.claude.ClaudeClient`, `MissingClaudeApiKeyException`, `ClaudeApiException`
- `:shared` - `ApiPaths`, `LearnStreamRequest`, `AnswerSubmissionRequest/Response`, `ErrorResponse`, `SseEvents`, `Stream*Event`

### External
- io.ktor.server.routing, request, response
- kotlinx.coroutines (Dispatchers, withContext)
- org.slf4j

<!-- MANUAL: -->
