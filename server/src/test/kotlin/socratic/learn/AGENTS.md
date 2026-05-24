<!-- Parent: ../../../../../AGENTS.md -->
<!-- Generated: 2026-05-24 | Updated: 2026-05-24 -->

# socratic.learn (server tests)

## Purpose
Ktor `testApplication` 기반 통합 테스트와 도메인 단위 테스트. `ClaudeClient` fake를 주입해 외부 Anthropic API 호출 없이 SSE 흐름을 검증한다.

## Key Files
| File | Description |
|------|-------------|
| `ApplicationTest.kt` | `/health` 등 모듈 wiring 스모크 테스트 |
| `LearnRoutesTest.kt` | `POST /learn/stream` SSE 시나리오 - fake ClaudeClient로 delta/complete/error 분기 검증 |
| `AnswerRoutesTest.kt` | `POST /answers` 정상/검증 실패 케이스 |
| `claude/LearningPromptTest.kt` | 프롬프트 빌더 출력 형식 회귀 방지 |
| `config/AppConfigTest.kt` | env map → AppConfig 기본값/오버라이드 |

## For AI Agents

### Working In This Directory
- 통합 테스트는 `testApplication { application { module(config = ..., claudeClient = FakeClaudeClient(...)) } }` 패턴.
- 실제 Claude API를 호출하지 말 것. 새 시나리오를 추가하면 fake 구현을 inline으로 정의하거나 기존 fake를 재사용.
- SSE 응답은 `event:` / `data:` 라인 단위로 파싱해서 검증. 줄바꿈/공백 strict 비교 주의.
- 예외 → error code 매핑이 바뀌면(`api/LearnRoutes.kt`) 여기 assertion도 동기화.
- JUnit Platform 사용(`tasks.test { useJUnitPlatform() }`). Kotlin test annotations(`@Test`) 그대로 사용 가능.

### Testing Requirements
- 단일 테스트: `cd server && ./gradlew test --tests "socratic.learn.LearnRoutesTest.<method>"`

## Dependencies

### Internal
- `socratic.learn.Application.module`
- `socratic.learn.claude.ClaudeClient` (fake로 stub)
- `:shared` DTO/이벤트

### External
- `io.ktor:ktor-server-test-host-jvm`
- `kotlin("test")` (JUnit Platform)

<!-- MANUAL: -->