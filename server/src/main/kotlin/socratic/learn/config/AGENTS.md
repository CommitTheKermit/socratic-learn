<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-24 | Updated: 2026-05-24 -->

# config

## Purpose
서버의 모든 환경변수를 한 곳에서 읽고 타입 안전한 `AppConfig`로 노출한다. 다른 어떤 코드에서도 `System.getenv`를 직접 호출하지 않는다.

## Key Files
| File | Description |
|------|-------------|
| `AppConfig.kt` | `AppConfig(server, claude)` + 중첩 `ServerConfig`, `ClaudeConfig`. `companion object fun fromEnv(env)` 가 모든 변수 파싱 |

## For AI Agents

### Working In This Directory
- 새 환경변수 추가:
  1. 대응 데이터 클래스에 필드 추가
  2. `fromEnv`에서 파싱 + 기본값 처리 (`takeIf { it.isNotBlank() } ?: default`, `toIntOrNull() ?: default`)
  3. `server/.env.example`과 루트 `CLAUDE.md`의 환경변수 섹션 동기화
- `fromEnv`는 `env: Map<String, String> = System.getenv()` 형태라 테스트에서 임의 map 주입 가능.
- 기본값:
  - `PORT` → 8081
  - `ANTHROPIC_MODEL` → `claude-sonnet-4-20250514`
  - `ANTHROPIC_API_URL` → `https://api.anthropic.com/v1/messages`
  - `ANTHROPIC_MAX_TOKENS` → 1200
  - `ANTHROPIC_API_KEY` → null (호출 시점에 검증)
- `apiKey`는 nullable. 빈 문자열은 null로 정규화한다(`takeIf { it.isNotBlank() }`).

### Testing Requirements
- `AppConfigTest`에서 다양한 env map으로 기본값/오버라이드 검증.

## Dependencies

### External
- 표준 라이브러리만 사용 (의존 추가 금지)

<!-- MANUAL: -->
