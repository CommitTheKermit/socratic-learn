---
name: verify-all
description: socratic-learn 전체 검증 게이트. frontend/functions 타입체크 + vitest 단위 테스트 + (요청 시) emulator Playwright E2E 를 정해진 순서로 실행하고 결과를 한 표로 보고한다. 사용자가 "검증", "전체 검증", "검증 게이트", "다 돌려봐", "verify" 같은 표현으로 변경 사항 검증을 요청하면 발동.
---

# verify-all - 전체 검증 게이트

작업 완료 보고 전에 "동작함"을 같은 기준으로 증명하는 절차. 아래 순서대로 실행하고,
실패하면 그 단계에서 멈춰 원인을 고친 뒤 처음부터 다시 돈다(fail-fast).

## 단계

루트 기준 경로. 1~3 은 무비용·결정적이라 항상 실행한다.

1. **frontend 타입체크**
   ```bash
   cd frontend && npx tsc -b --pretty false
   ```
2. **functions 타입체크+빌드** (`lib/` 산출이 emulator/배포의 전제)
   ```bash
   cd functions && npm run build
   ```
3. **frontend 단위 테스트**
   ```bash
   cd frontend && npx vitest run
   ```
   (functions 는 현재 테스트 파일이 없다. 생기면 `cd functions && npm test` 를 이 뒤에 추가할 것.)
4. **E2E (opt-in)** - 사용자가 "E2E 포함", "풀 검증" 등으로 명시했거나, 변경이
   API 계약·Functions·단계 전환 흐름을 건드렸을 때만. **실제 Anthropic API 를 호출해
   비용이 발생**하므로 실행 전 사용자에게 그 사실을 고지한다.
   ```bash
   bash frontend/e2e/run.sh                # 전체 슬라이스
   bash frontend/e2e/run.sh slice5-answer-eval.cjs   # 관련 슬라이스만
   bash frontend/e2e/run.sh --smoke        # 기동/배선만 점검(무비용)
   ```
   러너가 emulator·dev server 기동/정리를 알아서 한다. 변경 범위에 맞는 슬라이스만
   골라 비용을 줄일 것.

## 보고 형식

모든 단계가 끝나면 결과를 표로 보고한다:

| 단계 | 결과 | 비고 |
|---|---|---|
| frontend tsc | PASS/FAIL | 오류 요지 |
| functions build | PASS/FAIL | |
| vitest | PASS/FAIL | n passed / m failed |
| E2E | PASS/FAIL/SKIP | 실행한 슬라이스 |

FAIL 이 하나라도 있으면 "검증 통과"라고 말하지 않는다. 고친 뒤 전체를 재실행한다.
