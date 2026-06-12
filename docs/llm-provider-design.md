# LLM Provider 설계 (배포까지 고려)

> 2026-06-13. codex CLI 어댑터 실험(커밋 2b80800) 결과를 바탕으로,
> 로컬 실험을 넘어 배포 환경까지 포괄하는 LLM 호출 구조를 정의한다.

## 1. 실험이 확정한 사실

- `functions/src/llm.ts` 의 `parseStructured()` 가 구조화 출력 6개 함수의 **단일 LLM 호출 지점**이 됐다. provider 교체는 이제 이 한 곳의 분기 문제다.
- codex CLI(ChatGPT 구독 인증)는 stdin 닫기 + reasoning none + 도구 비활성 조건에서 **호출당 5~10초**로 동작한다. 단, 인증(`~/.codex/auth.json`)과 바이너리가 개발자 머신에만 있으므로 **로컬 전용**이다.
- ChatGPT 구독을 배포 서버에서 재활용하는 공식 경로는 없다. 릴레이(로컬 머신을 LLM 백엔드로 노출)는 ToS 위반 + 단일 장애점이라 채택하지 않는다.
- 시스템 프롬프트가 전부 250~700토큰으로 Sonnet 4.6 캐시 최소치(2048토큰) 미만. 기존 `cache_control` 은 무동작이므로 모델 변경에 따른 캐시 손실은 없다.

## 2. 설계 원칙

**Provider 는 환경의 속성이다.** 코드가 아니라 환경 설정이 provider 를 결정한다.

| 환경 | provider | 인증 | 비용 부담 |
|---|---|---|---|
| 로컬 dev/emulator | `codex` (opt-in) | ChatGPT 구독 | 0 (구독 재활용) |
| 로컬 dev/emulator | `anthropic` (기본) | `.secret.local` | 개발자 |
| 배포(prod) | `anthropic` | Secret Manager | 서비스 운영자 |
| 배포(향후 BYOK) | `anthropic` + 사용자 키 | 요청 스코프 키 | 사용자 |

게이팅은 환경별로 구조적으로 강제한다. codex 는 `FUNCTIONS_EMULATOR=true` AND `LLM_PROVIDER=codex` 둘 다 충족해야 하며, 배포 런타임엔 전자가 없고 바이너리/인증도 없어 3중으로 차단된다(구현 완료).

## 3. 배포 트랙: 모델 티어링으로 원가 절감

배포 환경의 비용 레버는 provider 교체가 아니라 **엔드포인트별 모델 차등**이다.
현재 6개 함수 모두 `claude-sonnet-4-6` 고정인데, 작업 난이도가 균일하지 않다.

가격(1M 토큰당, 2026-05 기준): Sonnet 4.6 입력 $3 / 출력 $15, Haiku 4.5 입력 $1 / 출력 $5. **Haiku 가 1/3 비용.**

| 엔드포인트 | 작업 성격 | 권장 모델 | 근거 |
|---|---|---|---|
| `overwhelm` | 후퇴 여부 이진 판단 + 짧은 사유 (max 1.5k) | **haiku-4-5** | 단순 분류. 1/3 비용 |
| `probe` | 진단 질문 3개 생성 | **haiku-4-5 후보** | 정형 패턴. 품질 검증 후 전환 |
| `outline` | 로드맵 4~5단계 설계 | sonnet-4-6 유지 | 학습 경로 품질이 UX 핵심 |
| `stepDetail`(+stream) | 본문 + 소크라테스 질문 생성 | sonnet-4-6 유지 | 제품의 코어 |
| `answerEval` | 답변 채점 + 교정 피드백 | sonnet-4-6 유지 | 오채점 비용이 큼 |
| `branchEval` | 분기 판단 + 조건부 콘텐츠 | sonnet-4-6 유지 | 복합 추론 |

구현: 각 함수의 `CLAUDE_MODEL` 상수를 env 기반으로 외부화한다.
`functions/.env.socratic-learn-web` (배포 시 자동 로드) 에 `MODEL_OVERWHELM=claude-haiku-4-5` 식으로
선언하고, 미설정 시 기존 상수로 폴백한다. 코드 변경 없이 env 만으로 티어 조정/롤백이 가능해진다.

## 4. 로컬 트랙: codex provider (완료)

- 켜기: `functions/.env.local` 에 `LLM_PROVIDER=codex` (emulator 전용 로드, gitignore).
- 선택 env: `CODEX_MODEL`, `CODEX_REASONING`(기본 none), `CODEX_BIN`.
- `stepDetailStream`(SSE) 은 codex 가 델타 스트리밍을 못 하므로 모든 provider 에서 Anthropic 경로 유지.

**E2E 비용 0 가능**: 기존 E2E 는 emulator 경유로 실제 Anthropic 을 호출해 비용이 발생했다.
codex provider 를 켜고 돌리면 **배선/플로우 검증이 구독 비용만으로** 가능하다.
단 모델이 다르므로(gpt-5.5) 프롬프트 품질 회귀 검증은 여전히 anthropic 경로로 돌린다.
용도 구분: `run.sh` 기본(배선 검증) = codex 허용, 릴리스 전 최종 게이트 = anthropic.

## 5. 수익화 트랙: BYOK provider (다음 결정)

이전 수익화 조사 결론(BYOK 1순위)과 TODO `llm-auth-strategy`(6/15 Anthropic 정책 재확인) 가 이 설계에 접속한다.

- 사용자가 본인 Anthropic 키를 입력하면, 프론트가 요청에 키를 동봉(전송 구간 TLS, 저장은 브라우저 로컬)하고
  Functions 는 Secret Manager 키 대신 **요청 스코프 키**로 `parseStructured` 를 호출한다.
- 어댑터 시그니처가 이미 `apiKey` 를 파라미터로 받으므로 **구조 변경 없이** 키 출처만 바뀐다.
  스트리밍 함수도 같은 Anthropic SDK 라 BYOK 가 그대로 적용된다.
- 서버 키 사용자는 rate limit(기존 `rateLimit.ts`)으로 캡, BYOK 사용자는 캡 해제. 이것이 free tier / 파워유저 분리다.

## 6. 단계별 로드맵

| 단계 | 내용 | 상태 | 배포 영향 |
|---|---|---|---|
| 0 | `parseStructured` 어댑터 + codex 로컬 게이팅 | **완료** (2b80800) | 없음 (내부 리팩터) |
| 1 | `CLAUDE_MODEL` env 외부화 + `overwhelm` 을 haiku 로 티어링 | 다음 | patch~minor. env 만으로 롤백 가능 |
| 2 | E2E 를 codex provider 로 돌리는 옵션 (`run.sh --provider codex`) | 대기 | 없음 (검증 인프라) |
| 3 | BYOK provider (키 입력 UI + 요청 스코프 키 + 캡 분리) | 6/15 정책 확인 후 | minor. 수익화 결정과 연동 |

## 7. 배포 절차에 추가되는 체크 (deploy 스킬 보강 후보)

- 배포 전: `functions/.env.local` 이 번들에 포함되지 않음을 확인(Firebase 가 `.env.local` 을 배포에 싣지 않는 것이 기본 동작이지만, `firebase deploy --only functions` 출력의 env 로드 목록으로 더블 체크).
- 배포 후 스모크: `overwhelm` 1회 호출로 응답 모델 확인(티어링 적용 검증).
