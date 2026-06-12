#!/usr/bin/env bash
# E2E 원커맨드 러너: functions 빌드 -> emulator(functions,auth,firestore) + dev server 기동
# -> readiness 대기 -> Playwright e2e 실행 -> 이 스크립트가 띄운 프로세스만 정리.
#
# 사용법 (frontend/ 또는 아무 데서나):
#   bash e2e/run.sh                       # e2e/*.cjs 전체 실행
#   bash e2e/run.sh slice5-answer-eval.cjs  # 지정 슬라이스만
#   bash e2e/run.sh --smoke               # 기동/readiness 만 점검하고 e2e 는 건너뜀(무비용)
#
# 주의: e2e 본 실행은 emulator 를 통해 실제 Anthropic API 를 호출한다
#       (functions/.secret.local 의 키 사용, 비용 발생). --smoke 는 호출 없음.

set -u
FRONT="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$FRONT/.." && pwd)"
PROJECT_ID="socratic-learn-web"
FN_BASE="http://127.0.0.1:5001/$PROJECT_ID/us-central1"
DEV_PORT=5199   # 평소 개발용 5173 과 충돌하지 않도록 E2E 전용 포트
EMU_LOG="$(mktemp -t e2e-emulator)"
DEV_LOG="$(mktemp -t e2e-dev)"

SMOKE=0
FILES=()
for a in "$@"; do
  case "$a" in
    --smoke) SMOKE=1 ;;
    *) FILES+=("$a") ;;
  esac
done
if [ "${#FILES[@]}" -eq 0 ]; then
  for f in "$FRONT"/e2e/*.cjs; do FILES+=("$(basename "$f")"); done
fi

STARTED_EMU=0
STARTED_DEV=0
EMU_PID=""
DEV_PID=""

kill_port() { lsof -ti "tcp:$1" 2>/dev/null | xargs kill 2>/dev/null; }

cleanup() {
  if [ "$STARTED_DEV" = "1" ]; then
    [ -n "$DEV_PID" ] && kill "$DEV_PID" 2>/dev/null
    kill_port "$DEV_PORT"
  fi
  if [ "$STARTED_EMU" = "1" ]; then
    # firebase CLI 는 INT 를 받으면 자식 emulator(java 포함)를 직접 정리한다.
    [ -n "$EMU_PID" ] && kill -INT "$EMU_PID" 2>/dev/null
    sleep 3
    [ -n "$EMU_PID" ] && kill "$EMU_PID" 2>/dev/null
    # 잔존 리스너 정리(hub 4400 / ui 4000 포함)
    for p in 5001 9099 8080 4400 4000; do kill_port "$p"; done
  fi
}
trap cleanup EXIT

# url, expected_code, timeout_sec, label [, method]
wait_http() {
  local url="$1" want="$2" t="$3" label="$4" method="${5:-GET}" code="" i
  for ((i = 0; i < t; i++)); do
    code="$(curl -s -o /dev/null -w '%{http_code}' -X "$method" --max-time 2 "$url" 2>/dev/null)"
    [ "$code" = "$want" ] && return 0
    sleep 1
  done
  echo "[run.sh] $label readiness 실패 (마지막 응답: ${code:-none}, ${t}s 초과)" >&2
  return 1
}

# 0) 사전 조건: emulator 용 Anthropic 키
if [ ! -f "$ROOT/functions/.secret.local" ]; then
  echo "[run.sh] functions/.secret.local 없음. 루트 CLAUDE.md 절차로 emulator 용 키를 만들 것" >&2
  exit 1
fi

# 1) functions 빌드 (emulator 는 lib/ 를 서빙)
echo "[run.sh] functions 빌드..."
(cd "$ROOT/functions" && npm run build) || { echo "[run.sh] functions 빌드 실패" >&2; exit 1; }

# 2) emulator: 5001 이 이미 떠 있으면 재사용, 아니면 기동
if lsof -nP -iTCP:5001 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[run.sh] 5001 사용 중 -> 기존 emulator 재사용(종료하지 않음)"
else
  echo "[run.sh] emulator 기동 (functions,auth,firestore)... 로그: $EMU_LOG"
  (cd "$ROOT" && npx firebase emulators:start --only functions,auth,firestore >"$EMU_LOG" 2>&1) &
  EMU_PID=$!
  STARTED_EMU=1
fi
wait_http "$FN_BASE/probe" 204 120 "functions emulator" OPTIONS \
  || { tail -30 "$EMU_LOG" >&2; exit 1; }
wait_http "http://127.0.0.1:9099" 200 30 "auth emulator" \
  || { tail -30 "$EMU_LOG" >&2; exit 1; }

# 3) dev server: E2E 전용 포트 + 빌드타임 env 주입
#    (shell env 가 .env.local 보다 우선하므로 prod URL 이 적혀 있어도 emulator 로 override 된다)
if lsof -nP -iTCP:"$DEV_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[run.sh] $DEV_PORT 사용 중 -> 기존 dev server 재사용(E2E 용 env 가 아니면 실패할 수 있음)"
else
  echo "[run.sh] dev server 기동 (포트 $DEV_PORT)... 로그: $DEV_LOG"
  (cd "$FRONT" && \
    VITE_API_BASE_URL="$FN_BASE" \
    VITE_AUTH_EMULATOR_URL="http://127.0.0.1:9099" \
    VITE_E2E_AUTO_SIGNIN=true \
    npm run dev -- --port "$DEV_PORT" --strictPort >"$DEV_LOG" 2>&1) &
  DEV_PID=$!
  STARTED_DEV=1
fi
# dev 가 IPv6 만 바인딩하는 경우가 있어 localhost 로 접근한다.
wait_http "http://localhost:$DEV_PORT" 200 60 "dev server" \
  || { tail -30 "$DEV_LOG" >&2; exit 1; }

# env override 검증: dev 가 변환해 서빙하는 contract.ts 에 emulator URL 이 인라인됐는지 확인
if curl -s "http://localhost:$DEV_PORT/src/api/contract.ts" | grep -q "127.0.0.1:5001"; then
  echo "[run.sh] VITE_API_BASE_URL override 확인됨 (emulator 지향)"
else
  echo "[run.sh] 경고: contract.ts 에서 emulator URL 미확인. dev server env 를 점검할 것" >&2
  [ "$SMOKE" = "1" ] && exit 1
fi

if [ "$SMOKE" = "1" ]; then
  echo "[run.sh] SMOKE OK: emulator + dev server readiness 통과 (e2e 미실행, Anthropic 호출 없음)"
  exit 0
fi

# 4) e2e 실행 (실 Anthropic 호출 발생)
fail=0
for f in "${FILES[@]}"; do
  echo "=== e2e: $f ==="
  if (cd "$FRONT" && E2E_BASE_URL="http://localhost:$DEV_PORT" node "e2e/$f"); then
    echo "=== e2e: $f PASS ==="
  else
    echo "=== e2e: $f FAIL ===" >&2
    fail=1
  fi
done
exit "$fail"
