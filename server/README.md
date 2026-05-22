# Socratic Learn Server

정식 MVP 백엔드의 로컬 1차 구현입니다. 모든 서버 관련 파일은 `server/` 내부에 둡니다.

## 목표

1. Claude API 연동
2. SSE 학습 스트리밍
3. 답변 제출 API

## 로컬 실행

```bash
cd server
cp .env.example .env
# .env의 ANTHROPIC_API_KEY 값을 실제 키로 교체하거나, 아래처럼 export 합니다.
export ANTHROPIC_API_KEY="your-anthropic-api-key"
./gradlew run
```

기본 포트는 `8080`입니다. 필요하면 `PORT` 환경변수로 변경합니다.

```bash
PORT=8081 ./gradlew run
```

## 테스트

```bash
cd server
./gradlew test
```

## 헬스 체크

```bash
curl http://localhost:8080/health
```

## SSE 학습 스트리밍

```bash
curl -N \
  -H "Content-Type: application/json" \
  -X POST http://localhost:8080/learn/stream \
  -d '{"concept":"코루틴이 왜 필요한지 알고 싶어요","language":"ko"}'
```

응답은 Server-Sent Events 형식입니다.

```text
event: status
data: {"status":"started","message":"Claude 학습 스트리밍을 시작합니다."}

event: delta
data: {"text":"..."}

event: complete
data: {"content":"..."}
```

`ANTHROPIC_API_KEY`가 없거나 Claude API 요청이 실패하면 `event: error`가 내려옵니다.

## 답변 제출

현재 1차 범위에서는 저장/채점 없이 서버가 답변을 정상 수신하는지만 확인합니다.

```bash
curl \
  -H "Content-Type: application/json" \
  -X POST http://localhost:8080/answers \
  -d '{
    "sessionId": "local-session-1",
    "concept": "코루틴",
    "answers": [
      {
        "questionId": "q1",
        "question": "코루틴은 무엇인가요?",
        "answer": "가벼운 동시성 단위입니다.",
        "unknown": false
      },
      {
        "questionId": "q2",
        "question": "suspend는 언제 쓰나요?",
        "unknown": true
      }
    ]
  }'
```

예상 응답:

```json
{
  "status": "received",
  "receivedCount": 2,
  "message": "답변 제출을 정상적으로 받았습니다."
}
```

## 이번 1차 범위에서 제외

- Auth/OAuth
- DB/세션 저장/이력
- 채점/분기 고도화
- 토큰 제한/BYOK
- 배포
- 프론트엔드 구현
