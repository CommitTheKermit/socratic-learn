<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-24 | Updated: 2026-05-24 -->

# server

## Purpose
Ktor + Netty 기반 백엔드. Claude Messages API를 SSE 스트리밍으로 중계하고 답변 제출을 받는 단일 모듈(`Application.module`). **이 디렉터리는 루트와 별개인 자체 Gradle 빌드**(`socratic-learn-server`)로, `../shared`를 `:shared`로 다시 include 한다.

## Key Files
| File | Description |
|------|-------------|
| `build.gradle.kts` | JVM target 21, Ktor 3.5.0, logback 1.5.32 의존 |
| `settings.gradle.kts` | `rootProject.name = "socratic-learn-server"`, `:shared`를 `../shared`로 경로 매핑 |
| `gradlew`, `gradlew.bat` | 서버 전용 wrapper (루트 wrapper와 별개) |
| `.env.example` | `ANTHROPIC_API_KEY` 등 환경변수 템플릿 |
| `README.md` | 로컬 실행/curl 예제/SSE 응답 포맷 |
| `.gitignore` | build/, .gradle/, logs |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `src/main/kotlin/socratic/learn/` | 백엔드 본체 (see `src/main/kotlin/socratic/learn/AGENTS.md`) |
| `src/test/kotlin/socratic/learn/` | 통합/단위 테스트 (see `src/test/kotlin/socratic/learn/AGENTS.md`) |
| `gradle/wrapper/` | Gradle wrapper jar/properties |

## For AI Agents

### Working In This Directory
- 항상 `cd server && ./gradlew ...` 패턴. 루트 wrapper로는 서버를 빌드할 수 없음.
- 환경변수는 `config/AppConfig.kt` 한 곳에서만 읽음. 새 변수 추가 시 `AppConfig.fromEnv` 확장.
- 포트 기본값은 `8081`(루트 CLAUDE.md의 8080 언급은 outdated, `AppConfig` 기준).
- CORS는 `anyHost()`로 열려 있음. 배포 시 환경별 allow-list로 좁혀야 함.

### Testing Requirements
- 전체: `./gradlew test`
- 단일 클래스: `./gradlew test --tests "socratic.learn.LearnRoutesTest"`
- shared JVM 함께: `./gradlew :shared:jvmTest`
- 통합 클린: `./gradlew clean :shared:clean :shared:jvmTest test --rerun-tasks`
- 테스트에서는 `ClaudeClient` 인터페이스에 fake를 주입 (`LearnRoutesTest` 참고).

### Common Patterns
- 라우트 등록은 `Application.module`의 `routing { ... }` 블록.
- 예외 → SSE error 매핑은 `LearnRoutes`에서 타입별 분기. 예외 타입을 임의로 통합하지 말 것.
- HTTP 클라이언트는 `java.net.http.HttpClient` + `BodyHandlers.ofLines()` (blocking) → `Dispatchers.IO`로 감쌀 것.

## Dependencies

### Internal
- `:shared` (`../shared`) - API path, DTO, SSE event 계약

### External
- Ktor 3.5.0 (server-core-jvm, netty-jvm, content-negotiation-jvm, serialization-kotlinx-json-jvm, cors-jvm, test-host-jvm)
- logback-classic 1.5.32

<!-- MANUAL: -->
