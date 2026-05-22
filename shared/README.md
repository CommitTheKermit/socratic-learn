# Socratic Learn Shared

프론트엔드와 백엔드가 함께 사용하는 Kotlin 공용 계약 모듈입니다.

## 포함 범위

- API path 상수
- 요청/응답 DTO
- SSE event name 상수
- SSE event payload DTO

서버 전용 구현은 넣지 않습니다. 예를 들어 Ktor route, Claude client, DB/Auth, 환경변수 처리는 `shared`에 두지 않습니다.

## 패키지

- `socratic.learn.shared.api`
  - `ApiPaths`
  - `LearnStreamRequest`
  - `AnswerSubmissionRequest`
  - `AnswerSubmissionResponse`
  - `ErrorResponse`
- `socratic.learn.shared.event`
  - `SseEvents`
  - `StreamStatusEvent`
  - `StreamDeltaEvent`
  - `StreamCompleteEvent`
  - `StreamErrorEvent`

## 테스트

저장소에는 서버 Gradle wrapper만 있으므로, shared 단독 검증은 다음처럼 실행합니다.

```bash
cd shared
../server/gradlew -p . jvmTest
```

서버에서 shared 의존까지 함께 검증하려면 다음을 실행합니다.

```bash
cd server
./gradlew test
```
