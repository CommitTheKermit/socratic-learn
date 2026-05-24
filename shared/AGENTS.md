<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-24 | Updated: 2026-05-24 -->

# shared

## Purpose
프론트엔드(wasmJs)와 백엔드(jvm)가 동일한 코드로 직렬화/역직렬화하기 위한 Kotlin Multiplatform 계약 모듈. **API path, 요청/응답 DTO, SSE 이벤트 이름과 payload** 만 포함한다.

## Key Files
| File | Description |
|------|-------------|
| `build.gradle.kts` | `jvm()` + `wasmJs { browser() }` target. commonMain에 `kotlinx-serialization-json:1.11.0`만 의존 |
| `settings.gradle.kts` | shared 단독 빌드 시의 settings (실제로는 두 상위 빌드가 include) |
| `README.md` | 포함/제외 규칙, 패키지 목록, 단독/통합 테스트 명령 |
| `.gitignore` | build/ |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `src/commonMain/kotlin/socratic/learn/shared/` | 계약 본체 (api, event) (see `src/commonMain/kotlin/socratic/learn/shared/AGENTS.md`) |
| `src/commonTest/kotlin/socratic/learn/shared/` | 직렬화 회귀 테스트 (`SharedContractsTest.kt`) |

## For AI Agents

### Working In This Directory
- **제외해야 할 것**: Ktor route, HTTP 클라이언트, 환경변수/Config, 로깅, DB/Auth. wasmJs에서 컴파일 안 되는 코드(`java.*`, `kotlin.io.File` 등) 절대 금지.
- 의존은 `kotlinx-serialization-json`만. 새 의존 추가 전 반드시 wasmJs 컴파일 확인: `./gradlew :frontend:compileKotlinWasmJs`.
- 모든 DTO는 `@Serializable` 필수.
- path/이벤트 이름 변경은 서버 라우트 + 프론트 양쪽을 동시에 깨뜨림 - 영향 범위 함께 수정.

### Testing Requirements
- 단독: `cd shared && ../server/gradlew -p . build` (이 디렉터리에 wrapper 없음 - server wrapper 재사용)
- JVM target만: `cd server && ./gradlew :shared:jvmTest`
- wasmJs 컴파일: 루트에서 `./gradlew :frontend:compileKotlinWasmJs`

### Common Patterns
- `commonMain` 외 source set(jvmMain, wasmJsMain 등)을 만들 필요는 거의 없다. 만들 경우 양쪽 빌드 영향 확인.

## Dependencies

### External
- `org.jetbrains.kotlinx:kotlinx-serialization-json:1.11.0` (commonMain)
- `kotlin("test")` (commonTest)

<!-- MANUAL: -->