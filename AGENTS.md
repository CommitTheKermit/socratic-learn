<!-- Generated: 2026-05-24 | Updated: 2026-05-24 -->

# socratic-learn

## Purpose
소크라테스식 학습 튜터를 위한 Kotlin 풀스택 프로젝트. 사용자가 입력한 개념을 Claude API로 설명·확인 질문 형태로 SSE 스트리밍하고, 답변을 수집한다. 단일 Git 루트에 **두 개의 독립적인 Gradle 빌드**(루트 + `server/`)와 `shared` Kotlin Multiplatform 모듈로 구성된다.

## Key Files
| File | Description |
|------|-------------|
| `CLAUDE.md` | 저장소 작업 시 지켜야 할 규칙(모듈 구성, 명령, 경계) |
| `settings.gradle.kts` | 루트 빌드: `:frontend`(wasmJs) + `:shared`만 포함. 서버 미포함 |
| `build.gradle.kts` | 루트 plugin alias 등록(applied false) |
| `gradle.properties` | JVM/Kotlin 빌드 옵션 |
| `gradlew` | 루트 wrapper - frontend/shared(wasmJs) 용 |
| `.gitignore` | Gradle/IDE 산출물 제외 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `server/` | Ktor + Netty 백엔드, 별도 Gradle 빌드 (see `server/AGENTS.md`) |
| `shared/` | Kotlin Multiplatform 계약 모듈(API path, DTO, SSE event) (see `shared/AGENTS.md`) |
| `frontend/` | Compose Multiplatform(wasmJs) 웹 클라이언트 (see `frontend/AGENTS.md`) |
| `socratic-learn-web-design/` | HTML/JSX 디자인 시안 참고 자료 (see `socratic-learn-web-design/AGENTS.md`) |
| `client/` | placeholder (현재 `gitkeep`만 있음) |
| `.github/` | GitHub Actions 워크플로우 (see `.github/workflows/AGENTS.md`) |
| `gradle/`, `kotlin-js-store/` | Gradle wrapper / Kotlin/JS lockfile (touch하지 말 것) |
| `.omc/`, `.omx/`, `.claude/` | OMC/Claude 도구 로컬 상태(커밋 대상 아님이 기본) |

## For AI Agents

### Working In This Directory
- 빌드/테스트는 **반드시 어느 디렉터리에서 실행하는지** 확인할 것:
  - 서버 작업: `cd server && ./gradlew ...`
  - 프론트/shared(wasmJs): 루트 `./gradlew :frontend:... / build`
  - shared 단독 JVM 검증: `cd server && ./gradlew :shared:jvmTest`
- `:shared`는 컨텍스트에 따라 다른 target이 활성화된다(루트 → wasmJs/jvm, 서버 → jvm 강조). `commonMain` 외 source set 추가 시 양쪽 빌드 영향 확인.
- 새 환경변수는 `server/.../config/AppConfig.kt` 한 곳에서만 처리. `System.getenv` 직접 호출 금지.
- 새 API path/SSE 이벤트는 `shared` 모듈에 상수로 먼저 정의 후 양쪽에서 import.

### Testing Requirements
- 서버: `cd server && ./gradlew test`
- shared(JVM): `cd server && ./gradlew :shared:jvmTest`
- shared(wasmJs 컴파일 확인): `./gradlew :frontend:compileKotlinWasmJs`
- 통합 클린 재실행: `cd server && ./gradlew clean :shared:clean :shared:jvmTest test --rerun-tasks`

### Common Patterns
- DI는 생성자 주입(Application.module이 `ClaudeClient` 받기) - 테스트에서 fake 주입.
- SSE는 `respondTextWriter` + 수동 `event:`/`data:` 작성. 이벤트 이름/payload는 shared 사용.
- Coroutine: blocking I/O는 `withContext(Dispatchers.IO)`로 감쌀 것.

### 범위 외 (1차 MVP)
Auth/OAuth, DB/세션 저장, 채점 분기, 토큰 제한/BYOK, 배포, 프론트 기능 구현. 합의 없이 추가 금지.

## Dependencies

### External
- Kotlin 2.3.21 (multiplatform, jvm, serialization)
- Ktor 3.5.0 (server-core, netty, content-negotiation, cors)
- Compose Multiplatform (wasmJs)
- kotlinx-serialization-json 1.11.0
- logback-classic 1.5.32
- JDK 21 toolchain

<!-- MANUAL: -->
