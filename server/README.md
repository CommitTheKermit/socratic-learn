# Socratic Learn Server

정식 MVP 백엔드의 로컬 1차 구현입니다.

## 목표

1. Claude API 연동
2. SSE 학습 스트리밍
3. 답변 제출 API

## 로컬 실행

```bash
cd server
./gradlew run
```

기본 포트는 `8080`입니다. 필요하면 `PORT` 환경변수로 변경합니다.

```bash
PORT=8081 ./gradlew run
```

## 헬스 체크

```bash
curl http://localhost:8080/health
```
