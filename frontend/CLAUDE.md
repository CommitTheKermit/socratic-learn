# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

이 파일은 `frontend/` 내부 아키텍처에 집중한다. 모노레포 구성 / 배포 / 환경변수 / Functions 쪽 / API 계약 변경 절차 / 런타임 개요는 **루트 `../CLAUDE.md`** 가 단일 출처이므로 중복 서술하지 않는다. 충돌 시 루트 CLAUDE.md 와 실제 코드가 우선한다.

`frontend/README.md` 는 셋업·실행 가이드(사람용), 이 파일은 내부 아키텍처(에이전트용)로 역할이 다르다. 둘 다 현재 Firebase 구조 기준이다.

## 명령

```bash
npm run dev          # Vite dev server (기본 5173)
npm run build        # tsc -b && vite build → dist/
npm run preview      # dist 정적 미리보기
npx vitest run       # 단위 테스트 전체 (npm test 와 동일)
npx vitest run src/state/sessionMerge.test.ts      # 파일 1개만
npx vitest run -t "원격 전용"                        # 이름 패턴으로 1개만
npx vitest                                          # watch 모드
```

E2E(`e2e/*.cjs`, Playwright)는 Functions emulator + dev server 가 떠 있어야 하고, Auth emulator + 자동 익명 로그인으로 로그인 게이팅을 우회한다(절차는 루트 CLAUDE.md "검증" 절). 두 env(`VITE_AUTH_EMULATOR_URL`, `VITE_E2E_AUTO_SIGNIN`)는 실서비스 빌드엔 없어 무영향.

## UI 표기/UX 규칙 (사용자 확정 사항)

- 학습 본문에서 비유 문구는 이탤릭(`*...*`)이 아니라 백틱(`` `...` ``)으로 감싼다.
- 분기 다이얼로그의 첫 번째 옵션은 항상 "다음 로드맵"이어야 한다. 로드맵이 더 없으면 다음 단계 옵션을 만들어내지 않는다.
- 평가 완료 직후 분기 다이얼로그를 바로 띄우지 않는다. 하단 스티키 버튼을 "평가 보기"로 바꾸고, 평가+분기 응답 로딩이 끝날 때까지 로딩 효과를 보여준 뒤 버튼 클릭 시 다이얼로그를 연다.
- 기존 분기를 벗어난 분기를 선택하면 칩 리스트에 1-1, 1-2 식으로 추가한다(하단에 단계 중복 표시 금지).

## 라우팅 = 단계 상태 머신 (`src/App.tsx`)

URL 이 단계/스텝의 **진실 출처**다. 별도 stage state 가 아니라 라우트 매칭이 단계를 결정한다.

```
Routes
 └ /s/:sessionId(/probe|/learn/:stepIdx|/done)  → AppShell(stage)        // 단계별로 다른 Route element
     └ AppSession  key={sessionId}              // 세션 전환 시 통째 재마운트
         └ AppWorkspace                          // 실제 작업 공간
```

- 단계 전환(probe→learn 등)은 **다른 Route element** 라 `AppShell`~`AppWorkspace` 가 재마운트된다. 이 재마운트에 깨지면 안 되는 전역 상태는 Routes 바깥(아래 Context)에 둬야 한다.
- 세션 전환은 `AppSession` 의 `key={sessionId}` 변경으로 재마운트되며, 저장된 산출물을 `LearnContentProvider` 의 `initial` 로 첫 렌더에 한 번만 시드한다.
- `learn` 단계의 `stepIdx` 도 URL 이 진실 출처(그 외 단계는 0).
- `HomeRedirect`: 루트("/") 진입 시 `socratic:activeSessionId` + 본문 캐시로 마지막 세션의 단계 URL 로 redirect.
- `branchReducer`/`useBranchPhase`/`components/branch/` 는 learn 단계 안에서 "다른 갈래로 분기" UX. 분기 평가는 `/branchEval` Function.

## Context 3계층 (배치 위치가 곧 생존 범위)

```
AuthProvider          (main.tsx, 최외곽)              → Firebase Auth user / login·logout / getIdToken
 └ App
    └ SessionListProvider (App, Routes 바깥)          → 사이드바 세션 목록(sessions) + upsert/remove
       └ Routes → AppShell → AppSession
           └ LearnContentProvider (AppSession, 세션별 key)  → 생성 산출물(probe 문항 / steps / 평가)
```

- **SessionListProvider** (`state/SessionListContext.tsx`): 사이드바 목록이 단계 전환 재마운트에 깜빡이지 않도록 Routes **바깥**에 둔다. `useAuth().user?.uid` 를 구독해 로그인 시 원격 목록을 fetch 한다(mount-only 아님). 노출 API 는 `sessions`(undefined=로딩) / `upsertSession(snapshot)` / `removeSession(id)` 3개뿐(`refreshList` 없음 - 재로그인이 자연 재시도). user 의존성은 객체가 아니라 **uid** 로 안정화한다(테스트 mock 이 매 렌더 새 user 객체를 반환하므로 `[user]` 면 무한 fetch).
- **LearnContentProvider** (`state/LearnContent.tsx`): 세션별이라 `AppSession` 안. Claude 가 생성한 본문/문항/평가의 로드 상태 머신(idle→loading→ready)을 관리.
- `useAuth`/`useSessionList`/`useLearnContent` 는 모두 Provider 밖에서 호출하면 throw.

## 세션 영속화 모델 (여러 파일이 얽힌 핵심)

**Firestore = 세션 본문과 사이드바 목록 양쪽의 진실 출처. localStorage = 본문 캐시(빠른 복원)일 뿐.** (구 `socratic:sessions:index` 목록 인덱스는 제거됨 - 이중 출처 버그의 원인이었다.)

localStorage 키:
- `socratic:session:{id}` - 세션 본문 캐시(`SessionState` 직렬화). 단계/세션 전환·새로고침 즉시 복원용.
- `socratic:activeSessionId` - 마지막 활성 세션(루트 진입 복원).
- `socratic:draft:concept` - 학습 시작 전 입력 초안.
- `socratic:sessions:tombstones` - 낙관적 삭제 재시도용 묘비.

파일별 책임:
- `sessionState.ts` - `SessionState` 정의 + serialize/deserialize. **`fieldUpdatedAt`**(필드별 ISO 타임스탬프)가 병합의 기준.
- `sessionMerge.ts` - 순수 코어. `mergeSessions(a,b)` 는 `fieldUpdatedAt` 기준 **필드별 last-write-wins**. `stampFieldUpdatedAt` 으로 변경 필드만 스탬핑.
- `sessionSync.ts` - 캐시 우선 + 백그라운드 동기화. `persistWithSync`(캐시 저장 + 변경 시 원격 save), `fetchAndMerge`(원격 본문을 캐시와 병합), `mergeSessionLists`(메모리 목록 + 원격 entry 병합, 사이드바용).
- `sessionPersist.ts` - 본문 캐시 read/write(`loadSession`/`persistSession`) + quota 시 evict/cap. evict 는 목록 인덱스가 없으므로 `socratic:session:*` 키를 스캔해 가장 오래된 비활성 세션을 제거.
- `sessionTombstone.ts` - 낙관적 삭제. `removeSession` 은 즉시 목록/캐시 제거 + tombstone 기록, 원격 삭제 성공 시 tombstone 해제, 실패 시 유지(다음 접속 재시도). tombstone 은 원격 목록 fetch 시 필터링되어 재출현을 막는다(롤백 없음).
- `sessionIndex.ts` - 사이드바 항목 타입 `SessionMeta` + `sessionListsEqual`(setState 참조 안정성용) + `getSessionItemKey`. (목록을 localStorage 에서 읽는 함수는 더 이상 없다.)
- `api/sessionApi.ts` - Firestore CRUD 를 Functions 경유로(`saveSessionRemote`/`listSessionsRemote`/`getSessionRemote`/`deleteSessionRemote`). 브라우저는 Firestore 직접 접근 안 함.

저장 트리거(App.tsx): answers 는 `useDebouncedPersist`(3초 + onBlur flush), 그 외 상태/산출물 변경은 즉시 effect. 둘 다 `persistWithSync` 로 캐시+원격 저장하고 `upsertSession(snapshot)` 으로 사이드바 메모리 목록을 갱신한다(`input` 단계는 히스토리 미노출).

## 로드맵 노드 모델

학습 단계 노드의 중복 병합(isMerged + 정규화 백스톱), 계층형 십진수 번호(`1`/`1.1`), 브레드크럼 경로 - 상세는 [`docs/roadmap-node-model.md`](docs/roadmap-node-model.md) 참조 (`lib/stepTitle.ts`/`stepInsertGuard.ts`/`stepLabel.ts`/`breadcrumb.ts`).

## API 클라이언트 계층

- `src/api/contract.ts` 가 경로/DTO 의 단일 출처(`ApiPaths` 키 = Function 이름 = 경로, `API_BASE_URL`). functions 와 같은 PR 에서 함께 수정(절차는 루트 CLAUDE.md).
- `src/api/claudeContent.ts` - 각 학습 콘텐츠 Function 을 `fetch` 호출(probe/overwhelm/outline/stepDetail/answerEval). 프롬프트는 프론트에 없다(전부 functions).
- `src/api/stepDetailStream.ts` - stepDetail 만 스트리밍 변형.
- `src/api/authHeaders.ts` - 모든 Functions 호출에 `Authorization: Bearer <idToken>` 부착(`useAuth.getIdToken`).
- 키 부재/Anthropic 오류는 Function 이 `{ code, message }` 로 응답 → 프론트가 `ClaudeContentError`(`lib/errors.ts`)로 변환.

## 테스트 구조 (`vitest.setup.ts` 전역 mock 을 먼저 이해할 것)

- `vitest.setup.ts` 가 **전역으로** `useAuth` 를 mock(항상 로그인된 더미 user, `loading:false`) 하고 `AuthProvider` 를 pass-through 로, `lib/firebase` 를 stub 한다(jsdom 에서 `getAuth()` 가 터지는 걸 막고 게이팅을 우회). 그래서 통합 테스트는 `<MemoryRouter><App/></MemoryRouter>` 만 렌더해도 로그인 상태로 돈다.
- 사이드바 목록의 출처는 원격이므로, 통합 테스트는 `vi.mock("../api/sessionApi")` + `listSessionsRemote` 를 `mockResolvedValue([...entries])` 로 채워 목록을 주입한다(`upsertSessionMeta` 같은 로컬 인덱스 주입은 더 이상 없다). 활성 세션의 concept 은 본문에도 보이므로 항목은 `.sb-history-item` 으로 한정해 찾는다.
- 순수 코어(`sessionMerge`/`sessionSync`/`sessionState`/`sessionPersist*`/`sessionTombstone`/`branchReducer`)는 storage mock 을 주입하는 직접 단위 테스트가 있다.
- `src/__tests__/ac*.test.tsx` 는 App 통합 시나리오(세션 전환/삭제/저장/원격 실패)별 AC 테스트.
