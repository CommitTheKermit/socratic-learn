# Deep Interview Spec: 5시간 4인 해커톤 실행 전략 (socratic-learn-web)

## Metadata
- Interview ID: hackathon-5h-4person
- Rounds: 7 (Round 0 topology + 6 scoring rounds)
- Final Ambiguity Score: 17%
- Type: brownfield (socratic-learn-web / plan v3 pending approval)
- Generated: 2026-05-21
- Threshold: 0.20
- Initial Context Summarized: no
- Status: PASSED
- Challenge Modes Used: Contrarian (R4), Simplifier (R6)

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|---|---|---|---|
| Goal Clarity | 0.86 | 0.35 | 0.30 |
| Constraint Clarity | 0.84 | 0.25 | 0.21 |
| Success Criteria | 0.81 | 0.25 | 0.20 |
| Context Clarity | 0.75 | 0.15 | 0.11 |
| **Total Clarity** | | | **0.83** |
| **Ambiguity** | | | **0.17** |

## Topology
| Component | Status | Description | Coverage Note |
|---|---|---|---|
| Work Split | active | M0-M5 부분 범위를 수평 레이어 + 4-Role 로 분할 | 4인 매핑 확정 (FE/BE/Shared/QA) |
| Branch & PR Flow | active | 단일 repo + main/develop/feature gitflow + 레이어별 long-lived feature 브랜치 | 흐름 확정, PR 사이즈 가이드만 가벼움 |
| Merge & Integration | active | 공통 담당자 1명이 모든 PR 지정 머저, PR 즉시 머지 후 develop 에서 검증 | 검증 방식이 "동작 확인" 수준 (자동화 없음, 수동 시연) |
| Timeline | active | 마일스톤 기반 sync (P1 완료 -> P2 시작), 고정 시간 동기화 없음 | P1 done 시나리오 단일 정의로 trigger 명확 |

## Goal

5시간 / 4인 해커톤 동안 socratic-learn-web 의 plan v3 중 M0-M5 의 부분 범위 (no auth, server-provided LLM key, single-user) 를 **로컬 환경에서 데모 가능한 P1 시나리오** 까지 구현하고, 시간이 남으면 P2 (DB persist) 로 확장한다. 4인이 수평 레이어로 분담하여 단일 repo 의 gitflow (main/develop/feature) 위에서 공통 담당자 1명이 PR 을 즉시 머지하는 방식으로 통합한다.

### P1 데모 시나리오 (Done Definition)
> 사용자가 로컬에서 프론트엔드를 열고 학습 개념 1개를 입력하면 -> 백엔드가 Claude API 를 호출해 SSE 로 설명+확인질문 마크다운을 스트리밍하고 -> 사용자가 각 확인질문 텍스트박스에 답변을 입력해 제출 버튼을 누른다. **여기까지가 P1.** (채점 결과 표시와 분기 선택지는 P2 또는 이후 마일스톤)

### P2 (시간 허락 시)
> 위 P1 사이클이 in-memory 가 아니라 Supabase Postgres 에 persist 되고, 동일 세션에서 1회 이상의 이력이 조회 가능.

## Constraints

### 하드 제약
- 총 가용 시간: 5시간 (wall-clock)
- 인원: 4명 (FE x 1, BE x 1, Shared x 1, QA x 1)
- 실행 환경: 로컬 머신만 (배포/원격 인프라 X)
- 인증: 없음. user_id 는 하드코딩 anonymous (예: `"local-user"`) 로 처리
- LLM API 키: 서버 환경 변수로 운영자가 제공 (BYOK 미적용)
- 동시성: 싱글 유저 가정 (race condition, lock 설계 불필요)

### 분배 제약
- 수평 레이어 분할:
  - **FE (1명)**: CMP Wasm 프론트엔드. 개념 입력 폼, SSE 수신 / 마크다운 렌더, 답변 텍스트박스 그리드, 제출 버튼. 추가로 로컬 인프라/QA 의 일부도 겸할 수 있음.
  - **BE (1명)**: Ktor 서버. POST `/cycle` endpoint, ClaudeClient (Anthropic SDK 호출), SSE 응답 wiring. 프롬프트 빌더는 BE 가 보유 (LLM 통합 책임).
  - **Shared (1명)**: `commonMain` 도메인 모델 / DTO / SSE wire contract / GradingSignal enum / 입출력 직렬화. **0:00 직후 1시간 안에 계약을 1차 확정** 해야 BE/FE 가 의존성을 풀 수 있음.
  - **QA (1명)**: 환경 셋업 가이드 작성/검증, 로컬 통합 테스트 시나리오, 데모 리허설, 회귀 케이스 (가능하면 LLM 비결정성 fixture 1-2개).

### 워크플로우 제약
- 단일 repo (`socratic-learn-web` main repo). fork 안 함.
- Branch 모델: `main` (보호) / `develop` (통합 대상) / `feature/<layer>-<short>` (각 레이어별 long-lived)
- PR 흐름: feature -> develop. main 으로의 PR 은 데모 직전 1회만.
- 공통 담당자 (= Shared 담당자) 가 모든 PR 의 **단일 머저**. PR 올라오면 즉시 머지 후 develop 에서 검증.
- 검증 방식: develop 머지 후 로컬에서 빌드/실행 가능 여부만 확인. 단위 테스트 강제 X (QA 가 e2e 시나리오로 커버).
- PR 사이즈: 가급적 작게 (1 PR < 30분 작업). 30분 이상 작업은 중간에 WIP 라도 끊어서 PR.

### Timeline 제약
- 0:00: 킥오프 (5분). 4-Role 확정, 환경 정상 확인, Shared 가 계약 설계 시작
- 0:00 - 1:00: **Shared 계약 1차 확정 phase**. FE/BE/QA 는 환경 셋업 / 스켈레톤 코드 / 테스트 데이터 준비
- 1:00 - 4:00: **P1 구현 phase**. 4인 병렬, 공통 담당자가 PR 수시 머지
- 4:00 - 4:30: P1 통합 시연 (전 인원 모여 1회 시연, 통과 시 P2 진입)
- 4:30 - 4:45: P2 (DB persist) 도전 또는 데모 폴리시
- 4:45 - 5:00: 데모 리허설
- **고정 시간 동기화 (스탠드업, 매시간 sync 등) 없음**. P1 완료가 P2 진입 trigger.

## Non-Goals

- 사용자 인증/로그인 (M2 Auth 전체)
- BYOK 등 사용자 API key 입력 흐름
- 사이클 응답 2 (채점 결과 표시 + 분기 선택지) - **P1 범위 밖**
- LLM 비용 모니터링/rate limit (M7) - 해커톤에선 사용량 무시
- 배포 (Fly.io / Render) - 로컬만
- CI/CD - 머지 hook / GitHub Actions 셋업 X (수동 검증)
- 다중 사용자 동시성, 세션 격리
- 모바일/태블릿 반응형 (데스크탑 1해상도 OK)
- LLM 회귀 테스트 골든 케이스 (M8) - QA 가 시간 남으면 1-2 케이스만

## Acceptance Criteria

### P1 (Must)
- [ ] 4인이 각자 `feature/<layer>-*` 브랜치에서 작업하고 PR 을 develop 으로 보낸다
- [ ] 공통 담당자가 PR 을 받는 즉시 (5분 이내) 머지한다
- [ ] develop 브랜치에서 빌드 가능하다 (Gradle build green)
- [ ] 로컬 BE 서버 기동 + 로컬 FE 기동 후, 프론트엔드에서 개념 1개 입력 -> SSE 스트리밍으로 설명+확인질문 마크다운이 화면에 표시된다
- [ ] 확인질문 각각에 텍스트박스가 분리되어 있고, 사용자가 답변을 입력해 제출 버튼을 누르면 서버로 답변 payload 가 전송된다
- [ ] 0:00 - 1:00 안에 Shared 가 SSE wire contract + GradingSignal enum + 도메인 DTO 의 1차 계약을 commonMain 에 머지한다
- [ ] 4:00 시점에 P1 데모 시나리오가 end-to-end 동작한다 (1회 시연 통과)

### P2 (Should, 시간 허락 시)
- [ ] Supabase Postgres 에 cycle 1건이 persist 된다 (anonymous user_id)
- [ ] 동일 세션 내 1회 이상의 이력 조회가 가능하다

### Quality (Should)
- [ ] 모든 PR 이 develop 으로 통하며 main 직푸시는 없다 (데모 직전 main 머지 1회는 예외)
- [ ] develop 머지 후 빌드 깨지는 사고는 0회 또는 5분 이내 hotfix
- [ ] 데모 리허설을 한 번 이상 수행한다

## Assumptions Exposed & Resolved

| Assumption | Challenge | Resolution |
|---|---|---|
| "각자 알아서 만들고 합친다" 가 가능하다 | Round 1: 5시간/4인 (20인시) 안에 plan v3 의 어디까지가 현실적인가? | M0-M5 부분 범위 (no auth + server key) 로 축소 |
| 분할 단위가 자유롭다 | Round 2: 수직 슬라이스 vs 수평 레이어 (충돌 패턴이 정반대) | 수평 레이어 + FE 가 인프라/QA 일부 겸임. 이후 QA 별도 1인 |
| 모든 PR 에 정식 리뷰 필요 | Round 4 Contrarian: 4명 같은 방에 있으면 PR 리뷰 비용이 구두 확인보다 비쌈 | gitflow + 공통 담당자 단일 머저 (지정 머저). 즉시 머지 후 develop 검증 |
| 중간 동기화 시점을 정해야 한다 | Round 0: trigger 정의 어려움 | 고정 시간 sync 없음. P1 완료가 유일한 sync trigger (이벤트 기반) |
| P1 done = 사이클 전체 동작 | Round 6 Simplifier: 가장 단순한 done 정의 | P1 = 응답 1 까지 (설명+질문 스트리밍 + 답변 텍스트박스 제출). 채점/분기는 P2 이후 |
| FE 가 인프라+QA 겸임 가능 | Round 7: 4인 정확 매핑 재확인 | QA 를 별도 1인으로 분리. FE 는 인프라 일부만 |

## Technical Context

### 기반 산출물 (이미 존재)
- `socratic-learn-web/.omc/plans/consensus-socratic-learn-web-mvp.md` v3 (pending approval)
- `socratic-learn-web/.omc/specs/deep-interview-socratic-learn-web.md` (PASSED, 15%)
- README 에 스택 표 (CMP Wasm / Ktor / Anthropic SDK / Supabase Postgres / Auth deferred)

### 해커톤에서 채택하는 plan v3 부분 범위
- **M0 PoC (3건)**: SDK SSE streaming, CMP Markdown 렌더, Supabase OAuth Wasm
  - 해커톤 한정으로 OAuth 항목은 **drop**. 대신 anonymous user_id 사용
- **M1 monorepo**: Gradle multi-module (shared/commonMain + backend + frontend). FE 가 0:00 - 1:00 사이 스켈레톤 준비
- **M2 Auth+DB**: **Auth drop**. DB 스키마는 Shared 가 cycles 테이블 1개만 선언 (P2 대비)
- **M3a (BE)** 프롬프트 + ClaudeClient non-stream -> 해커톤에선 **SSE 부터 시작** (M3a/M3b 통합)
- **M3b (Shared)** SSE wire contract OpenAPI -> Shared 가 0:00 - 1:00 1차 확정
- **M3c (FE)** CMP 마크다운 렌더 + 답변 텍스트박스
- M4 (DB persist), M5 (이력 조회 read-side) 는 P2 / 시간 허락 시
- M6, M7, M8 은 해커톤 범위 밖

### Plan v3 와의 충돌/완화
- plan v3 의 prompt cost guard, $300 예산 알람: 해커톤에선 무시 (소비량 < $1 예상)
- plan v3 의 LLM 회귀 5케이스 게이트: 시간 남으면 QA 가 1-2건만
- plan v3 의 M3 게이트 `man-hour/LoC >= 0.05`: 해커톤 빠른 단발이라 측정 안 함

## Ontology (Key Entities)

| Entity | Type | Fields | Relationships |
|---|---|---|---|
| Hackathon | core | duration=5h, members=4, env=local | hosts Members |
| Member (Role) | core | name, role in {FE, BE, Shared, QA} | owns FeatureBranch |
| Layer | core | id in {fe, be, shared, qa}, ownerMember | maps to FeatureBranch |
| Milestone (M0-M5) | supporting | id, included in {true,false,partial} | scoped by Hackathon |
| Phase | core | id in {P1, P2}, doneDefinition | gates next Phase |
| Phase1Done | trigger | scenario (개념 입력 -> SSE -> 답변 제출) | triggers P2 |
| FeatureBranch | core | name=feature/<layer>-<short>, owner | merges into Develop |
| DevelopBranch | core | name=develop, validated by QA | merges into Main at demo |
| MainBranch | core | name=main, protected | demo cut |
| PR | core | source=feature, target=develop, sizeHint<30min | merged by DesignatedMerger |
| DesignatedMerger | core | role=Shared, mergePolicy="immediate" | owns all PR merges |
| ContractArtifact | supporting | SSE wire contract, GradingSignal enum, DTO | produced by Shared at 0:00-1:00 |
| DemoScenario | core | input=개념1, output=SSE스트리밍+답변제출 | acceptance for P1 |
| Cycle.Response1 | scope | explanation + check questions | in-scope for P1 |
| Cycle.Response2 | deferred | grading + branching | out-of-scope for P1 |

## Ontology Convergence

| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|---|---|---|---|---|---|
| 1 | 6 | 6 | - | - | N/A |
| 2 | 8 | 2 (Layer, Phase) | 0 | 6 | 67% |
| 3 | 11 | 3 (Branch, PR, Reviewer) | 0 | 8 | 80% |
| 4 | 12 | 1 (DesignatedMerger; Reviewer renamed/folded) | 1 | 10 | 80% |
| 5 | 13 | 1 (Phase1Done) | 0 | 12 | 92% |
| 6 | 15 | 2 (Cycle.Response1, Cycle.Response2) | 0 | 13 | 87% |
| 7 | 15 | 0 | 0 | 15 | 100% |

## 분배 매트릭스 (Quick Reference)

| Layer | Owner | 0:00-1:00 | 1:00-4:00 (P1) | 4:00-5:00 (P2/데모) |
|---|---|---|---|---|
| FE | FE 담당 | CMP Wasm 스켈레톤, 빌드 환경 | 입력 폼, SSE 수신/렌더, 답변 텍스트박스, 제출 | DB persist 연동 또는 폴리시 |
| BE | BE 담당 | Ktor 스켈레톤, Anthropic SDK 의존성 | `/cycle` endpoint, ClaudeClient, SSE wire | DB write 추가 |
| Shared | Shared 담당 (= 머저) | **SSE wire contract + GradingSignal enum + DTO 1차 확정** | 계약 갱신 + 모든 PR 즉시 머지 + develop 검증 | DB DTO/마이그레이션 |
| QA | QA 담당 | 환경 셋업 가이드, 로컬 테스트 데이터 | 통합 시나리오 수동 검증, 회귀 fixture 1-2건 | 데모 리허설, 폴백 시연 시나리오 |

## Interview Transcript

<details>
<summary>Full Q&A (Round 0 + 6 scoring rounds)</summary>

### Round 0 - Topology
**Q:** 4개 컴포넌트 (Work Split, Branch & PR Flow, Merge & Integration, Timeline) 구성이 맞나요?
**A:** 1,2,3번 그대로 추가. Timeline 의 "중간 동기화" 시점 정하기 어려움.

### Round 1 - work-split / Goal
**Q:** 5시간 끝에 "완성" 으로 정의할 목표는?
**A:** M0-M5 까지 수행하되 로그인/인증 없이, 서버측에서 LLM API key 제공.
**Ambiguity:** 50%

### Round 2 - work-split / Constraints
**Q:** 4인에게 어떤 단위로 나누나?
**A:** 수평 레이어. 현장 시연 위한 로컬, FE 가 인프라/QA 겸임, 싱글 유저, 1차 로컬 -> 2차 DB.
**Ambiguity:** 39%

### Round 3 - branch-pr-flow / Goal
**Q:** PR 흐름은?
**A:** 단일 repo + 레이어별 long-lived branch + 수시 PR 리뷰/머지.
**Ambiguity:** 35%

### Round 4 - merge-integration / Goal (Contrarian)
**Q:** 4명 같은 방인데 GitHub PR 리뷰가 정말 이득인가?
**A:** 공통 담당자가 머저, PR 올리자마자 머지, 머지된 브랜치에서 계속 검증. gitflow (main/develop/feature) 채택.
**Ambiguity:** 27%

### Round 5 - timeline / Goal
**Q:** 중간 동기화 trigger 는?
**A:** 마일스톤 기반만 (P1 -> P2), 고정 시간 동기화 없음.
**Ambiguity:** 27%

### Round 6 - All / Criteria (Simplifier)
**Q:** P1 완료의 가장 단순한 정의는?
**A:** 개념 입력 -> SSE 스트리밍 -> 답변 텍스트박스 제출까지. 채점/분기는 다음 목표.
**Ambiguity:** 21%

### Round 7 - work-split / Constraints
**Q:** FE 외 3명 매핑은?
**A:** FE x 1, BE x 1, Shared (공통) x 1, QA x 1.
**Ambiguity:** 17% (PASSED)

</details>
