# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 모듈 구성과 빌드 그래프

이 저장소는 단일 Git 루트에 **두 개의 독립적인 Gradle 빌드와 한 개의 npm 프로젝트**가 공존하는 비표준 멀티 프로젝트 구조입니다.

- 루트 `settings.gradle.kts`는 `:shared`(Kotlin Multiplatform, JVM target만 활성)만 포함합니다. 더 이상 `:frontend` 는 Gradle 모듈이 아닙니다.
- `server/settings.gradle.kts`는 별도의 Gradle 빌드(`socratic-learn-server`)이며 `:shared`를 `../shared`로 경로 매핑해서 다시 포함합니다. 서버 개발은 항상 `server/` 디렉터리 안에서 `./gradlew`를 실행해야 합니다.
- 결과적으로 `:shared`는 두 빌드 모두에서 `:shared` 이름으로 참조되며 양쪽 다 JVM target 으로 사용됩니다.
- `frontend/` 는 Vite + React 18 + TypeScript 기반 npm 프로젝트입니다. Gradle 과 무관하게 `npm` 으로 빌드/실행합니다.
- 루트의 Gradle wrapper와 `server/gradlew`는 별개입니다. `shared` 단독 검증 시에는 `cd shared && ../server/gradlew -p . <task>` 패턴을 사용합니다(`shared` 자체에는 wrapper가 없음).

## 자주 쓰는 명령

빌드/테스트는 어느 디렉터리에서 실행하느냐가 중요합니다.

```bash
# 서버 실행 (포트 기본 8081, PORT 환경변수로 변경)
cd server && export ANTHROPIC_API_KEY=... && ./gradlew run

# 서버 테스트 전체
cd server && ./gradlew test

# 서버 단일 테스트 클래스/메서드
cd server && ./gradlew test --tests "socratic.learn.LearnRoutesTest"
cd server && ./gradlew test --tests "socratic.learn.LearnRoutesTest.<methodName>"

# shared 모듈을 서버 컨텍스트(JVM)로 검증
cd server && ./gradlew :shared:jvmTest
# shared 변경이 서버 테스트와 잘 결합되는지 클린 재실행
cd server && ./gradlew clean :shared:clean :shared:jvmTest test --rerun-tasks

# shared 모듈 단독 빌드 (server wrapper 재사용)
cd shared && ../server/gradlew -p . build

# 루트 Gradle 빌드 (shared 만)
./gradlew build

# 프론트엔드 (Vite + React + TS)
cd frontend && npm install     # 최초 1회
cd frontend && npm run dev      # 기본 포트 5173 (FE_PORT 로 변경)
cd frontend && npm run build    # tsc -b && vite build → dist/
```

## 런타임 아키텍처

서버는 Ktor + Netty 기반의 단일 모듈(`Application.module`)이며, 핵심 흐름은 다음과 같습니다.

- `Application.kt` - `AppConfig.fromEnv()`로 환경변수를 1회 읽고, 기본 구현 `AnthropicClaudeClient`를 주입한다. `ClaudeClient`는 인터페이스이므로 테스트에서는 fake를 전달한다 (`server/src/test/.../LearnRoutesTest.kt` 참고).
- `api/LearnRoutes.kt` - `POST /learn/stream`은 `respondTextWriter(ContentType.Text.EventStream)`로 SSE를 직접 작성한다. `status` → 다수의 `delta` → `complete` 또는 `error` 순서를 보장한다. 예외 종류(`MissingClaudeApiKeyException`, `ClaudeApiException`, 기타)에 따라 SSE `error` 이벤트의 `code`가 달라지므로 예외 타입을 임의로 통합하지 말 것.
- `claude/AnthropicClaudeClient.kt` - Anthropic Messages API에 `stream: true`로 호출하고, 응답 라인을 직접 파싱한다. `content_block_delta` + `text_delta`만 사용자에게 전달되며, 그 외 chunk(`message_start`, `ping`, JSON 파싱 실패 등)는 로그만 남기고 무시한다.
- SSE 호출은 `Dispatchers.IO`로 감싸야 한다(`learnRoutes` 참고). `HttpClient.send(... BodyHandlers.ofLines())`는 blocking 스트림이기 때문이다.

프론트엔드는 `frontend/src/App.tsx` 의 단일 상태 머신(input → probe → roadmap → explain → questions → answering → done)을 따라 진행하며, `explain` 단계에서 `frontend/src/api/learnStream.ts` 가 `fetch` + `ReadableStream` 으로 SSE 를 직접 파싱한다(EventSource 미사용, POST 본문 필요). `answering` 종료 시 `frontend/src/api/answers.ts` 가 `POST /answers` 를 호출한다.

## shared 계약 모듈의 경계

`shared/`는 서버(jvm)가 사용하는 직렬화 계약 모듈이며, 프론트엔드(React/TS)는 같은 계약을 `frontend/src/api/contract.ts` 에 **수기 미러**한다. 다음 규칙을 지킵니다.

- 포함: API path 상수(`ApiPaths`), 요청/응답 DTO, SSE 이벤트 이름(`SseEvents`)과 payload DTO.
- 제외: Ktor route, HTTP 클라이언트, 환경변수/Config, 로깅, DB/Auth.
- 의존: `kotlinx-serialization-json` 만 commonMain 에서 사용.
- 경로/이벤트 이름/DTO 필드를 바꾸면 서버 라우트와 `frontend/src/api/contract.ts` 가 동시에 깨지므로 **같은 PR 에서 양쪽을 함께 수정**해야 한다(PR 체크리스트 항목).

## 환경 변수

서버에서 읽는 모든 환경변수는 `config/AppConfig.kt` 한 곳에서만 처리합니다. 새 변수를 추가할 때 다른 곳에서 `System.getenv`를 직접 호출하지 말 것.

- `ANTHROPIC_API_KEY` (필수, 비어 있으면 `MissingClaudeApiKeyException` → SSE `error`)
- `ANTHROPIC_MODEL` (기본 `claude-sonnet-4-20250514`)
- `ANTHROPIC_API_URL` (기본 `https://api.anthropic.com/v1/messages`)
- `ANTHROPIC_MAX_TOKENS` (기본 1200)
- `PORT` (기본 8081)
- `FE_PORT` (프론트 Vite dev/preview, 기본 5173)
- `VITE_API_BASE_URL` (프론트가 호출할 백엔드 base URL, 기본 `http://localhost:8081` - Vite 빌드 시점에 인라인)

## 작업 시 유의사항

- 새 라우트를 추가하면 path 상수는 반드시 `shared`의 `ApiPaths`에 먼저 정의하고 서버는 그 상수를 import, 프론트는 `frontend/src/api/contract.ts` 의 `ApiPaths` 미러도 같이 갱신한다.
- SSE 이벤트 이름과 payload DTO도 동일하게 `shared`의 `event` 패키지에 추가하고 TS 미러를 갱신한다. 서버에서 raw 문자열로 이벤트를 작성하지 말 것.
- CORS는 `anyHost()`로 열려 있으나 로컬 MVP 한정이며, 배포 관련 변경 시 `Application.module`의 CORS 블록을 환경별 allow-list로 좁혀야 한다(코드 주석에 명시되어 있음).
- 1차 MVP 범위에서 제외된 것: Auth/OAuth, DB/세션 저장, 채점 분기, 토큰 제한/BYOK, 배포, Ktor 정적 호스팅 통합, v3 디자인 시안의 tweaks-panel 포팅, 자동 회귀 테스트. 이 범위에 속하는 기능은 별도 합의 없이 추가하지 말 것.
