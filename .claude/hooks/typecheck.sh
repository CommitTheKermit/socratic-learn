#!/usr/bin/env bash
# PostToolUse(Edit|Write) 훅: 수정된 .ts/.tsx 파일이 속한 패키지(frontend/functions 등)를 타입체크.
# "구현했다"고 보고했는데 타입 오류로 동작하지 않는 미완성 보고를 막는다.
# 실패 = 종료코드 2 + stderr 로 오류를 Claude 에게 돌려보내 스스로 고치게 한다.

input="$(cat)"
f="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")"

case "$f" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac
case "$f" in
  */node_modules/*|*/dist/*|*/lib/*) exit 0 ;;
esac

# 파일 위치에서 위로 올라가며 tsconfig.json + package.json 이 있는 가장 가까운 패키지 루트를 찾는다.
d="$(dirname "$f")"
pkg=""
while [ -n "$d" ] && [ "$d" != "/" ]; do
  if [ -f "$d/tsconfig.json" ] && [ -f "$d/package.json" ]; then pkg="$d"; break; fi
  d="$(dirname "$d")"
done
[ -z "$pkg" ] && exit 0

# 솔루션 스타일(references)이면 tsc -b(증분), 아니면 tsc --noEmit.
if grep -q '"references"' "$pkg/tsconfig.json"; then
  out="$(cd "$pkg" && npx tsc -b --pretty false 2>&1)"
else
  out="$(cd "$pkg" && npx tsc --noEmit --pretty false 2>&1)"
fi

if [ $? -ne 0 ]; then
  {
    echo "[typecheck 실패] $pkg - 아래 타입 오류를 해결할 것"
    printf '%s\n' "$out" | head -40
  } >&2
  exit 2
fi
exit 0
