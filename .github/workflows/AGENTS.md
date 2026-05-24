<!-- Parent: ../../AGENTS.md -->
<!-- Generated: 2026-05-24 | Updated: 2026-05-24 -->

# .github/workflows

## Purpose
GitHub Actions 워크플로우. 현재는 Claude Code 통합(자동 리뷰/응답) 워크플로우만 존재한다.

## Key Files
| File | Description |
|------|-------------|
| `claude.yml` | `issue_comment`, `pull_request_review_comment`, `issues`, `pull_request_review` 이벤트에 반응하는 Claude 작업 |
| `claude-code-review.yml` | PR 자동 코드 리뷰 |

## For AI Agents

### Working In This Directory
- 워크플로우 트리거 변경은 비용/리뷰 빈도에 직접 영향. PR 전 팀 합의.
- secrets 참조(`ANTHROPIC_API_KEY` 등)는 저장소 secrets에 등록되어야 한다 - 신규 변수는 README 동기화.
- 빌드/테스트 CI는 아직 추가되지 않았다. 추가 시 server/frontend 빌드 명령이 분리되어 있음에 유의(matrix 또는 두 job).

<!-- MANUAL: -->