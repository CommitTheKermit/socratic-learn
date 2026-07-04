#!/usr/bin/env bash
# PostToolUse(Write|Edit) 훅: functions/seed/officialRoadmaps/*.json (OfficialRoadmap 시드)이
# 쓰이면 validate-official-roadmap.mjs 로 결정적 검증한다.
# 빌드/타입체크가 못 잡는 "문법상 valid 인데 스키마/규칙 위반" 시드를 막는다.
# 실패 = 종료코드 2 + stderr 로 오류를 Claude 에게 돌려보내 스스로 고치게 한다.

input="$(cat)"
f="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")"

# 대상 경로가 아니면 통과
case "$f" in
  */functions/seed/officialRoadmaps/*.json) ;;
  *) exit 0 ;;
esac
[ -f "$f" ] || exit 0

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="$(node "$dir/validate-official-roadmap.mjs" "$f" 2>&1)"
rc=$?

if [ "$rc" -ne 0 ]; then
  {
    echo "[roadmap-seed-guard 실패] $f - 아래 검증 오류를 해결할 것"
    printf '%s\n' "$out" | head -60
  } >&2
  exit 2
fi

# 경고(WARN)만 있으면 차단하지 않고 표시만 한다.
[ -n "$out" ] && printf '%s\n' "$out"
exit 0
