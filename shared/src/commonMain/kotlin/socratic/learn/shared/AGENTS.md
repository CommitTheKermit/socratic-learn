<!-- Parent: ../../../../../../AGENTS.md -->
<!-- Generated: 2026-05-24 | Updated: 2026-05-24 -->

# socratic.learn.shared

## Purpose
공유 계약의 최상위 패키지. 하위 두 패키지(`api`, `event`)로 나뉘며 본 파일 자체에는 코드가 없다.

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `api/` | HTTP path 상수 + 요청/응답 DTO (see `api/AGENTS.md`) |
| `event/` | SSE 이벤트 이름 + payload DTO (see `event/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- 새 도메인이 생기면 추가 sub-package를 만들기보다 `api`/`event` 분류에 맞춰 배치. 진짜 분리가 필요할 때만 새 패키지 신설.
- 패키지명은 서버/프론트가 그대로 import 하므로 rename 신중.

<!-- MANUAL: -->