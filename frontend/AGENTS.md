<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-24 | Updated: 2026-05-24 -->

# frontend

## Purpose
Compose Multiplatform 기반 Kotlin/Wasm 웹 클라이언트. 루트 Gradle 빌드의 `:frontend` 모듈로, `:shared` 계약을 import 해 학습 사이클(개념 입력 → 스트리밍 → 답변 → 리뷰) UI를 그린다.

## Key Files
| File | Description |
|------|-------------|
| `build.gradle.kts` | `wasmJs { browser { ... } }` target. devServer 포트 `FE_PORT` env(기본 8080), output `frontend.js`. Compose runtime/foundation/material3/ui 의존 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `src/wasmJsMain/kotlin/com/socraticlearn/frontend/` | Compose 진입점 + 화면/상태/API (see `src/wasmJsMain/kotlin/com/socraticlearn/frontend/AGENTS.md`) |
| `src/wasmJsMain/resources/` | `index.html` - `<div id="webApp">` 컨테이너 + 번들 로딩 |

## For AI Agents

### Working In This Directory
- 빌드/실행은 루트 wrapper로: `./gradlew :frontend:compileKotlinWasmJs`, `./gradlew :frontend:wasmJsBrowserDevelopmentRun`
- dev server 포트 충돌 시 `FE_PORT=8090 ./gradlew :frontend:wasmJsBrowserDevelopmentRun`.
- wasmJs 타겟이므로 JVM API(`java.*`, `kotlin.io.File`, JDK HTTP 등) 사용 불가. HTTP는 `window.fetch` interop으로 작성.
- shared의 DTO/path만 사용 - 서버 코드 import 시도하면 컴파일 실패.
- 1차 MVP에서는 실제 SSE 연결 없이 mock state 진행(`App.kt`의 `delay` 시뮬레이션). 실연동은 후속 PR.

### Testing Requirements
- 컴파일 검증: `./gradlew :frontend:compileKotlinWasmJs`
- 전체 빌드: `./gradlew build`

## Dependencies

### Internal
- `:shared` - API path/DTO/SSE event

### External
- `compose.runtime`, `compose.foundation`, `compose.material3`, `compose.ui`
- Kotlin/Wasm browser target

<!-- MANUAL: -->