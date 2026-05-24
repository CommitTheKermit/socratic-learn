<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-24 | Updated: 2026-05-24 -->

# claude (Anthropic 연동)

## Purpose
Anthropic Messages API와의 통신을 캡슐화한다. `ClaudeClient` 인터페이스 + JDK `HttpClient` 기반 구현체 + 프롬프트 빌더로 구성된다. 라우트 계층(`api/`)은 이 인터페이스에만 의존해 테스트에서 fake 주입이 가능하다.

## Key Files
| File | Description |
|------|-------------|
| `ClaudeClient.kt` | `streamLearning(concept, language, onDelta) -> String` 인터페이스. `onDelta`로 chunk를 흘리고 전체 텍스트를 반환 |
| `AnthropicClaudeClient.kt` | 기본 구현. `stream: true`로 호출, `BodyHandlers.ofLines()` 라인 파싱. `content_block_delta` + `text_delta`만 사용자에게 전달. `MissingClaudeApiKeyException`, `ClaudeApiException` 정의 |
| `LearningPrompt.kt` | `systemInstruction(language)`, `userMessage(concept)`, `build(...)` - 한국어 소크라테스식 튜터 프롬프트 |

## For AI Agents

### Working In This Directory
- `parseTextDelta`는 `content_block_delta`/`text_delta`가 아닌 모든 chunk(`message_start`, `ping`, JSON 파싱 실패 등)를 **로그만 남기고 무시**해야 한다. 새 chunk type을 노출할 때만 화이트리스트 확장.
- HTTP 호출은 blocking 스트림. 라우트에서 `Dispatchers.IO`로 감싸는 책임은 호출자가 진다(이 클래스 자체는 plain `fun`).
- 새 예외 타입을 추가하면 반드시 `api/LearnRoutes.kt`의 catch 분기에도 매핑 추가.
- `anthropic-version` 헤더(`2023-06-01`)와 `x-api-key` 사용은 Messages API 규약. 변경 시 SDK 문서 재확인.
- API 키 누락은 환경변수 단계가 아니라 `streamLearning` 호출 시점에 `MissingClaudeApiKeyException`으로 던진다(서버 부팅은 키 없이도 성공).

### Common Patterns
- 생성자에 `HttpClient`, `Json` 기본값 주입 - 테스트에서 mock HttpClient로 교체 가능.
- 프롬프트는 텍스트 리터럴 대신 `LearningPrompt`의 함수를 통해 빌드. 직접 문자열 합성 금지.

## Dependencies

### Internal
- `socratic.learn.config.ClaudeConfig` - apiKey, model, apiUrl, maxTokens

### External
- `java.net.http.HttpClient`, `HttpRequest`, `HttpResponse`
- kotlinx.serialization.json (buildJsonObject, parseToJsonElement)
- org.slf4j

<!-- MANUAL: -->
