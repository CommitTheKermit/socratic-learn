<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-24 | Updated: 2026-05-24 -->

# api (frontend client)

## Purpose
서버 HTTP/SSE 호출을 위한 클라이언트 자리. 현재는 shared 계약이 머지되기 전 placeholder만 있고, 실제 구현은 후속 PR에서 `window.fetch` + `ReadableStream` 기반으로 채워진다.

## Key Files
| File | Description |
|------|-------------|
| `CycleClient.kt` | placeholder. `endpointUrl()` 외에는 `error(...)` - 호출 시 실패. 주석에 후속 계획 명시 |

## For AI Agents

### Working In This Directory
- 실제 구현 시:
  - `:shared`의 `ApiPaths.LEARN_STREAM`, `LearnStreamRequest` 사용
  - `kotlinx.browser.window.fetch` + `ReadableStream` 으로 SSE 라인 파싱
  - 이벤트 이름 비교는 `SseEvents.STATUS/DELTA/COMPLETE/ERROR` 상수
  - payload는 `kotlinx.serialization.json.Json.decodeFromString<Stream*Event>(...)`
- wasmJs 환경이므로 Ktor client(jvm/js)나 OkHttp 등 JVM 의존 사용 금지.
- 엔드포인트 baseUrl은 dev/prod 분기 환경변수가 아직 없음 - 도입 시 빌드 config로 처리하고 shared가 아닌 frontend 모듈에 보관.

## Dependencies

### Internal (예정)
- `:shared` - `ApiPaths`, `LearnStreamRequest`, `SseEvents`, `Stream*Event`

### External (예정)
- `kotlinx.browser.window`, JS interop (`Promise`, `ReadableStream`)
- `kotlinx.serialization.json`

<!-- MANUAL: -->