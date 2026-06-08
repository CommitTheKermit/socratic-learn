# 학습 세션 Firestore 영속화 - 남은 작업 (functions 엔드포인트 + frontend 배선)

## 프로젝트 위치 / 브랜치
- 경로: `/Users/ujeonghyeon/Desktop/dev/myDev/socratic-learn-2`
- 브랜치: `feat/react-restack` (HEAD `1528dd7`, develop 미병합, 워킹트리 clean)
- 모듈: `frontend/`(Vite+React18+TS), `functions/`(Firebase Functions Node20/TS). 단일 git 루트, 2개 npm 프로젝트.
- 커밋 규칙: 한 프롬프트 = 한 의미 단위 커밋. Conventional Commits(`type(scope): 요약`, 요약/본문 한글). em dash("-") 금지(hyphen 사용). Co-Authored-By 등 서명 트레일러 넣지 않음. 배포는 사용자 명시 요청 시에만.

## 무엇을 만드는가
학습 세션을 localStorage 대신 **Firestore를 진실의 출처**로 저장해 로그인 사용자가 기기를 바꿔도 이어하게 한다. 읽기/쓰기는 localStorage 캐시를 먼저 써 화면 즉시 반영, Firestore 동기화는 백그라운드 논블로킹. 다기기 충돌은 필드별 최신 updatedAt 승자로 자동 병합.
전체 명세(진실 출처): `docs/seed-session-firestore.yaml` (QA PASS 0.92). 이번에 끝낸 frontend 코어 서브시드: `docs/seed-session-merge-frontend.yaml`.

## 이번 세션에서 확정한 결정 (중요)
- 저장 경로: **Functions 경유**. 프론트 Firestore Client SDK 직접 쓰기 금지(기존 아키텍처 유지).
- 저장 모델: **Firestore = 진실의 출처, localStorage = 캐시(제거하지 않음)**. 읽기/쓰기 모두 캐시 우선(optimistic) + Firestore는 백그라운드 Promise 동기화.
- 저장 트리거: **단계 전환 시 + AI 산출물(probeQuestions/steps/stepEvaluations) 생성 API 콜 완료 시** 둘 다.
- 마이그레이션: **기존 localStorage 세션은 Firestore로 옮기지 않음**(신규 세션부터).
- 다기기 충돌: **필드별 최신 updatedAt 승자 자동 병합**. 병합 granularity = SessionState 최상위 필드 단위(answers/skips/stepEvaluations 맵은 통째 1필드, 맵 내부 키 단위 병합은 범위 밖). updatedAt 동률이면 **서버 수신 타임스탬프 tiebreaker**.
- 동기화 실패 시: 캐시값 유지, 사용자에게 안 알림, **다음 저장 트리거에서 조용히 재시도**.
- 범위 밖: 오프라인 캐시(네트워크 단절 큐잉/장기 재시도), 학습 흐름/UX 개선.

## 이미 끝난 것 (커밋됨, 검증 완료)
frontend 순수 함수 코어 (커밋 `69a4418`~`1528dd7`, 6커밋). **단위 테스트 가능한 부분만** 떼어 `ooo run`(격리 worktree)으로 구현 후 FF 병합.
- `frontend/src/state/sessionState.ts`: `FieldUpdatedAt`(=`Record<string,string>`) 타입 + `SessionState.fieldUpdatedAt?` 필드 추가. serialize/deserialize가 fieldUpdatedAt 라운드트립(누락/손상 시 `{}` 보정, 빈 맵은 직렬화 생략 = 기존 포맷 호환).
- `frontend/src/state/sessionMerge.ts` (신규): 재사용할 코어 3종.
  - `MERGEABLE_FIELDS`: 병합/스탬핑 대상 최상위 필드 목록(sessionId/createdAt 제외).
  - `stampFieldUpdatedAt(prev, next, nowIso): FieldUpdatedAt` - 변경된 필드만 nowIso로 스탬핑, 미변경 보존. 순수.
  - `mergeSessions(a, b, serverWins='a'): SessionState` - 필드별 최신 승자 병합 + 동률 tiebreaker(serverWins 'a'|'b') + 단측 보존. 순수.
- `frontend/src/state/sessionMerge.test.ts` (신규, 28 tests).
- 검증: `cd frontend && npm test` → 140 passed (23 files). `npm run build`(tsc -b && vite build) 성공.

## 다음에 할 일 (구현 단계) - 미구현/미검증
### 1. functions: 세션 저장/조회 엔드포인트 (0%)
- `frontend/src/api/contract.ts`에 `ApiPaths` 항목 + 요청 DTO 추가: `/sessions`(POST 저장 upsert), `/sessions`(GET 목록), `/sessions/:id`(GET 상세). contract.ts와 functions는 같은 PR에서 함께 수정(규약).
  - 단, 기존 ApiPaths는 함수명=경로 1:1 패턴. `:id` path param 방식이 기존 패턴과 안 맞을 수 있으니 첫 단계에서 경로 컨벤션 결정 필요(예: GET `/sessionGet?id=` vs REST style). 기존 7개 함수(`/probe` 등)는 onRequest 단일 경로.
- `functions/src/<fn>.ts` 작성: `onRequest({ secrets:[ANTHROPIC_API_KEY는 불필요], cors:true, region:"us-central1" })`. 단 이 함수들은 Anthropic 호출 없음 → ANTHROPIC_API_KEY secret 불필요. firebase-admin firestore 사용.
  - 405 체크 다음 `requireAuth`(functions/src/auth.ts)로 인증 → `uid` 확보. 비인증 401. 세션 문서는 uid로 격리(타인 세션 접근 거부). `recordUsage(uid, endpoint)` 적재 패턴 따를지 결정.
  - Firestore 컬렉션 구조 결정 필요(예: `sessions/{uid}/items/{sessionId}` 또는 top-level `sessions` 문서 + uid 필드). 목록 응답 = SessionIndex(sessionId/conceptSummary/stage/updatedAt) 경량 메타.
  - 저장 시 서버 수신 타임스탬프 기록(동률 tiebreaker용). 충돌 병합은 서버에서 `mergeSessions` 상당 로직 or 프론트 병합 후 저장 중 위치 결정 필요.
- `functions/src/index.ts`에서 새 함수 export.
- functions에는 test 스크립트 없음 → emulator로 검증(`cd functions && npm run serve`, 포트 5001). `npm test` 화이트리스트 검증 불가하므로 ooo run 대상 아님.

### 2. frontend 배선 (0%) - 만든 코어를 실제 연결
- API 호출 함수 추가(`frontend/src/api/claudeContent.ts` 패턴: `fetch(\`${API_BASE_URL}${ApiPaths.X}\`)` + `authHeaders.ts`의 Authorization Bearer). 시그니처는 기존과 동일 스타일.
- `frontend/src/App.tsx`(단일 상태머신 input/probe/learn/done)에서:
  - 쓰기: 기존 persistSession(localStorage 캐시) 먼저 → `stampFieldUpdatedAt`로 fieldUpdatedAt 갱신 → Firestore 저장은 백그라운드 Promise(논블로킹, 실패 시 다음 트리거 재시도). 트리거 = 단계 전환 + AI 산출물 API 완료.
  - 읽기/복원: localStorage 캐시 먼저 렌더 → 백그라운드로 GET /sessions(:id) → `mergeSessions(cache, remote)`로 병합 후 캐시/화면 갱신.
  - 세션 목록(사이드바)도 GET /sessions로 갱신(현재 sessionIndex.ts는 localStorage 기반).
- 기존 동기 `persistSession`/`loadSession`(`Storage` 주입 패턴) 호출부가 async Firestore 계층과 만나는 지점 흐름 조정 필요.

### 3. 통합 검증 (안 함)
- emulator(`--only functions,auth,firestore`) + dev server로 기기 간 이어하기 수동 검증.
- E2E: `frontend/e2e/sliceN-*.cjs` 패턴(Auth emulator 익명 로그인). 새 엔드포인트가 127.0.0.1:5001로 200 + api.anthropic.com 직호출 0건 확인.

## 재사용할 코어 / 건드리지 말 것
- `frontend/src/state/sessionMerge.ts` - 병합/스탬핑 코어. 그대로 재사용(다시 구현 금지).
- `frontend/src/state/sessionState.ts`의 fieldUpdatedAt 직렬화 - 보존.
- `functions/src/auth.ts` `requireAuth`/`recordUsage` - 새 함수에 동일 적용.
- `frontend/src/api/contract.ts` - DTO 단일 진실 출처. 여기 먼저 추가.
- `frontend/src/api/authHeaders.ts` - ID 토큰 헤더 빌더 재사용.

## 현재 상태
- 빌드: frontend 통과(tsc -b && vite build). functions 빌드 별도 미실행(이번 변경 없음).
- 테스트: frontend 140 passed (23 files), 신규 sessionMerge 28개 포함.
- 의존성: 새로 설치한 것 없음(firebase, firebase-admin, vitest 등 기존).

## 제약 / 함정
- **functions는 npm test 스크립트가 없음** → ooo run 자동검증 불가. emulator 수동/E2E로 검증. ooo run을 functions에 쓰면 FABRICATION_SUSPECTED.
- ooo run은 모노레포라 cwd를 단일 npm 패키지 루트로 둬야 하고 화이트리스트 테스트 명령(`npm test` 등)만 인정. `npx vitest`/`npm run test` 거부됨. frontend는 `"test":"vitest run"`이라 `npm test` OK.
- 한 번 failed된 ooo 세션은 재개 불가, 새로 시작해야 함.
- ooo run 결과는 `~/.ouroboros/worktrees/...` 격리 worktree에 생김(메인 트리 git status는 clean하게 보임). 결과는 `git worktree list`로 찾아 FF 병합 후 `git worktree remove`로 정리.
- 기기 간 이어하기/캐시 50ms/백그라운드 동기화는 단위 테스트 불가 → 통합/수동 검증 영역(아직 미검증).
- emulator 키: 루트에서 `printf 'ANTHROPIC_API_KEY=%s\n' '<키>' > functions/.secret.local`(gitignore). 단 세션 함수는 Anthropic 미사용이라 이 키 불필요.
- 참고: 이번 인터뷰 단계에서 Ouroboros MCP가 `max turns` 오류로 자주 죽었음. 인터뷰/시드 재시도 시 force 또는 Path B 대비.
