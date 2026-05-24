<!-- Parent: ../../../../../AGENTS.md -->
<!-- Generated: 2026-05-24 | Updated: 2026-05-24 -->

# socratic.learn (server main)

## Purpose
서버 진입점과 모듈 구성 패키지. `main()`이 `AppConfig.fromEnv()`로 환경변수를 1회 읽고 Netty embeddedServer를 띄운다. `Application.module`이 ContentNegotiation/CORS 설치 후 `learnRoutes`, `answerRoutes`, `/health`를 등록한다.

## Key Files
| File | Description |
|------|-------------|
| `Application.kt` | `main()`, `Application.module(config, claudeClient)`, `/health` 라우트, `HealthResponse` DTO. `ClaudeClient`는 인터페이스로 받아 테스트 시 fake 주입 가능 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `api/` | Ktor Route 확장 함수(SSE 스트림, 답변 제출) (see `api/AGENTS.md`) |
| `claude/` | Claude API 클라이언트 + 프롬프트 정의 (see `claude/AGENTS.md`) |
| `config/` | 환경변수 → `AppConfig` 파싱 (see `config/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- 새 라우트는 `api/` 하위에 `Route.xxxRoutes()` 확장 함수로 추가하고 `Application.module`의 `routing { }`에 등록.
- `/health`처럼 trivial한 경우만 `Application.kt`에 inline. 비즈니스 라우트는 `api/`로.
- ContentNegotiation `Json` 설정(`prettyPrint`, `ignoreUnknownKeys`, `encodeDefaults`)을 변경하면 모든 응답에 영향. 신중히.
- CORS는 MVP 한정 `anyHost()` - 코드 주석에도 명시되어 있음.

### Common Patterns
- `Application.module`에 default parameter 형태로 의존 주입(`config`, `claudeClient`). 테스트에서 override.
- HTTP path는 직접 문자열 대신 `socratic.learn.shared.api.ApiPaths.HEALTH` 등 상수 사용.

## Dependencies

### Internal
- `api/learnRoutes`, `api/answerRoutes`
- `claude/AnthropicClaudeClient`, `claude/ClaudeClient`
- `config/AppConfig`
- `:shared` - `ApiPaths`

### External
- io.ktor.server.* (engine.embeddedServer, netty, contentnegotiation, cors)
- kotlinx.serialization

<!-- MANUAL: -->
