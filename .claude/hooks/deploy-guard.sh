#!/usr/bin/env bash
# PreToolUse(Bash) 가드: `firebase deploy` 는 main 브랜치에서만 허용한다.
# CLAUDE.md 배포 규칙("기본 브랜치(main)에서만 배포") 위반을 하드 차단해
# 작업 브랜치에서 배포가 새는 사고(과거 사례: 다른 브랜치 배포)를 막는다.
# 통과 = 종료코드 0 + 무출력. 차단 = permissionDecision:"deny" JSON 출력.

input="$(cat)"
cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")"

# firebase deploy 호출이 아니면 관여하지 않는다.
if ! printf '%s' "$cmd" | grep -Eq 'firebase[[:space:]].*deploy'; then
  exit 0
fi

proj="${CLAUDE_PROJECT_DIR:-$PWD}"
branch="$(git -C "$proj" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"

deny() {
  jq -n --arg r "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $r
    }
  }'
  exit 0
}

# git 저장소가 아니면(브랜치 미확인) 판단 불가 -> 차단(안전측).
if [ -z "$branch" ]; then
  deny "배포 차단: git 브랜치를 확인할 수 없습니다($proj). main 브랜치인지 확인 후 배포하세요."
fi

if [ "$branch" != "main" ]; then
  deny "배포 차단: 현재 브랜치가 '$branch' 입니다. CLAUDE.md 규칙상 firebase deploy 는 main 에서만 허용됩니다. 작업 브랜치를 main 으로 병합·push 한 뒤 main 에서 배포하세요. (deploy 스킬이 이 절차를 대신합니다)"
fi

exit 0
