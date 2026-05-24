# Deep Interview Spec: socratic-learn 웹 서비스

## Metadata
- Interview ID: socratic-learn-web-2026-05-20
- Rounds: 6 (Round 0 topology + 6 scoring rounds)
- Final Ambiguity Score: 15%
- Type: greenfield (기존 SKILL.md는 도메인 제약 문서 역할)
- Generated: 2026-05-20
- Threshold: 20%
- Initial Context Summarized: no
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.85 | 0.40 | 0.34 |
| Constraint Clarity | 0.90 | 0.30 | 0.27 |
| Success Criteria | 0.80 | 0.30 | 0.24 |
| **Total Clarity** | | | **0.85** |
| **Ambiguity** | | | **0.15** |

## Topology

| Component | Status | Description | Coverage / Deferral Note |
|-----------|--------|-------------|--------------------------|
| 학습 대화 UI | active | 메시지/시각화(표, ASCII 다이어그램, 코드블록), 확인 질문 폼, 분기 선택 UI | 문항별 텍스트박스 분리 + 한 번에 제출. Markdown/코드 렌더 |
| 소크라테스 엔진 (LLM 백엔드) | active | SKILL.md 사이클을 그대로 수행하는 LLM 오케스트레이션 | Ktor `/api/cycle` SSE 스트리밍, Anthropic Kotlin SDK |
| 학습 세션 & 진행도 저장소 | active | 사용자별 학습 이력 영구 저장, 회고 검색 | Supabase Postgres. 세션/사이클/채점표/Concept 테이블 |
| 사용자 계정/인증 | active | 로그인 필수, 멀티유저, 개인 이력 분리 | Supabase Auth (Google OAuth) |
| 학습 자료 입력 파이프라인 | **deferred** | PR 리뷰 URL, 코드 파일/스니펫 업로드, 외부 문서 붙여넣기 처리 | MVP에서는 한 줄 텍스트 개념 입력만. 후속 확장 |

## Goal

CLI 기반 socratic-learn 스킬을 GUI 웹 서비스로 이전하여, 사용자가 한 줄 개념 입력 → 자동 수준 추정 + 1단계 설명+확인 질문 → 문항별 텍스트박스 답변 → AI 채점/교정 + 분기 선택의 사이클을 클릭과 자유 입력만으로 반복할 수 있게 한다. 모든 사이클은 로그인된 사용자 계정에 영구 저장되어 나중에 검색/재개할 수 있다.

## Constraints

- **프론트엔드**: Compose Multiplatform, 웹 타겟 (Wasm 또는 JS 컴파일)
- **백엔드**: Ktor (Kotlin), 단일 jar 배포
- **LLM**: Anthropic Claude API. Kotlin SDK 사용. SSE 스트리밍 응답
- **DB**: Supabase Postgres. JSON 컬럼으로 사이클 페이로드/채점표 보관
- **Auth**: Supabase Auth (Google OAuth)
- **도메인 모델 공유**: CMP `commonMain`과 Ktor가 공유 가능한 Kotlin data class로 Cycle/Concept/GradingRow/Answer 정의
- **운영 규모**: 50명 단기 동시 접속 가정
- **LLM key 모델**: 초기 운영자 키 단일, 사용자당 rate limit + 일일 토큰 상한 → 추후 BYOK(사용자 본인 키 등록) 전환 가능 구조
- **배포**: Fly.io 또는 Render에 Ktor jar, 단일 리전 시작
- **언어/UX**: 한국어 1차, 시각화는 SKILL.md의 ASCII 다이어그램/비교표 패턴 그대로

## Non-Goals

- PR 리뷰 URL 자동 fetch/파싱 (MVP 외, 후속 확장)
- 코드 파일/스니펫 업로드 (MVP 외)
- 외부 문서 붙여넣기 자동 분해 (MVP 외)
- 모바일 네이티브 앱 (CMP가 추후 활용은 가능하나 MVP는 웹 한정)
- 다국어(영어 등) 지원
- 다중 LLM provider 추상화 (Claude API 한 가지로 시작)
- 결제/구독
- 협업/공유 기능 (학습 세션 다른 사용자에게 공개 등)

## Acceptance Criteria

- [ ] 비로그인 사용자가 첫 화면에 접근하면 Google OAuth 로그인 화면으로 리다이렉트된다
- [ ] 로그인 후 첫 화면에서 "학습 개념 한 줄 입력" 폼이 보이고, 제출하면 첫 사이클 응답이 SSE로 스트리밍된다
- [ ] 첫 응답에 (a) 사용자 수준 추정 한두 문장, (b) 첫 1단계 분해 개념의 설명(정의/코드/시각화), (c) 3-8개 확인 질문이 한 응답에 모두 포함된다
- [ ] 확인 질문은 각 문항마다 독립 텍스트박스로 렌더링되며, "모르겠어요" 토글이 제공된다
- [ ] "한 번에 제출" 버튼 클릭 시 모든 답이 한 번에 채점되고, 🟢/🟡/🔴 신호가 문항별로 표시된다
- [ ] 채점 응답 끝에 2-4개 분기 선택지 카드가 나타나고, 카드 클릭 또는 자유 입력으로 다음 사이클을 시작할 수 있다
- [ ] Markdown(GFM 테이블, 코드 블록), ASCII 다이어그램, 비교표가 CLI보다 명확하게 시각적으로 렌더링된다
- [ ] 사용자가 좌측 사이드바에서 "내 학습 이력"을 열면 세션 목록을 볼 수 있고, 각 세션을 클릭하면 과거 사이클을 그대로 회고할 수 있다
- [ ] 과거 세션에서 "이어서 학습"을 누르면 그 세션의 마지막 사이클 끝에서 새 사이클로 진입한다
- [ ] 운영자 LLM key 모드에서 사용자당 일일 토큰 상한을 초과하면 친절한 안내와 함께 입력이 차단된다
- [ ] (추후 BYOK 활성화 시) 설정 화면에서 본인 Claude API key를 등록할 수 있고, 등록된 사용자는 운영자 토큰 상한이 적용되지 않는다
- [ ] 50명 동시 접속 부하 테스트 통과 (응답 시작까지 p95 < 3s)

## Assumptions Exposed & Resolved

| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| "웹 서비스라면 모든 기능을 다 옮겨야 한다" | Round 0 topology: 자료 입력 파이프라인은 MVP에 꼭 필요한가? | 자료 입력은 deferred. MVP는 한 줄 텍스트 개념 입력만 |
| "익명/세션 모드도 지원해야 사용자 진입 장벽이 낮다" | Round 2: 영속성 vs 진입 장벽 트레이드오프 | 로그인 필수 + 모든 이력 영구 저장으로 확정. 핵심 가치 = 이력 회고이므로 익명은 가치 훼손 |
| "백엔드는 TS/Node가 LLM 호환성 좋아 무난" | Round 3 추천 + 4: CMP commonMain과 도메인 공유 가능성 | Ktor + Kotlin으로 확정. SKILL.md의 도메인 모델(Cycle, Concept, GradingRow)을 양쪽에서 재사용 |
| "Claude Code/ChatGPT에 SKILL.md 붙여넣으면 되는데 굳이 웹?" | Round 4 contrarian: 차별화 가치가 무엇인가 | GUI 편의성(번호 입력 제거) + 이력 영구 회고가 명확한 차별화. MVP 성공 기준의 척추 |
| "확인 질문 UI는 자유 채팅이 자연스럽다" | Round 5: SKILL.md 원칙 #3(본인 언어)과 사용자 불만(번호 입력 번거로움) 충돌 | 문항별 분리 텍스트박스 + 한 번에 제출. 각 박스 안에서는 본인 언어로 자유 입력 |
| "공개 SaaS로 처음부터 만들어야 한다" | Round 6 simplifier: 가장 작은 운영 형태는? | 50명 단기 + 운영자 API key 제공 → BYOK 확장. 초기엔 rate limit으로 충분 |

## Technical Context

기존 SKILL.md(`/Users/ujeonghyeon/Desktop/dev/ao-skills/skills/socratic-learn/SKILL.md`)는 Claude Code 안에서 LLM이 직접 실행하는 프롬프트/방법론 문서다. 별도 코드베이스는 없고, 이 문서는 도메인 사양으로 차용된다. 핵심 사이클 절차(진단→분해→설명→확인 질문→채점→분기)와 원칙(사용자 페이스, 호기심 분기, 본인 언어, 원인 vs 결과, 오해 명시 교정, 선택지로 양도)은 그대로 백엔드 프롬프트로 옮긴다.

### 제안 모듈 구조

```
socratic-learn-web/
├── frontend/                   # Compose Multiplatform
│   ├── commonMain/             # 도메인 모델 (Cycle, Concept, GradingRow, Answer)
│   ├── webMain/                # Compose for Web (Wasm 타겟)
│   └── ...
├── backend/                    # Ktor
│   ├── routes/
│   │   ├── cycle.kt            # POST /api/cycle (SSE)
│   │   ├── session.kt          # GET/POST /api/sessions
│   │   └── auth.kt             # Supabase JWT verify
│   ├── llm/
│   │   ├── ClaudeClient.kt
│   │   └── prompts/            # SKILL.md → 프롬프트 템플릿
│   └── db/                     # Supabase Postgres 어댑터
├── shared/                     # commonMain과 공유 가능한 Kotlin 모델
└── .omc/specs/                 # 이 스펙
```

### 제안 DB 스키마 (요약)

- `users` (Supabase Auth 연동)
- `learning_sessions(id, user_id, initial_concept, created_at, updated_at)`
- `cycles(id, session_id, round_no, explain_md, questions_jsonb, answers_jsonb, grading_jsonb, branches_jsonb, created_at)`
- `user_api_keys(user_id, provider, encrypted_key)` (BYOK 도입 시)

## Ontology (Key Entities)

| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| User | core domain | id, email, created_at | has many LearningSession |
| LearningSession | core domain | id, user_id, initial_concept, status, updated_at | has many Cycle, belongs to User |
| Concept | core domain | name, level, parent_concept | discussed within Cycle |
| Cycle | core domain | round_no, explain_md, questions[], answers[], grading[], branches[] | belongs to LearningSession |
| Question | supporting | id, cycle_id, prompt, type (개념구분/판별/본인언어/반례) | belongs to Cycle |
| Answer | supporting | id, question_id, body, dont_know:boolean | belongs to Question |
| GradingRow | supporting | question_id, signal(🟢🟡🔴), note | belongs to Cycle |
| Branch | supporting | id, label, kind(A/B/C/D), payload | belongs to Cycle |
| ApiKeyConfig | supporting | user_id, provider, encrypted_key | belongs to User (BYOK) |
| HistoryView | supporting | user_id, filters, sort_order | computed over LearningSession |

## Ontology Convergence

| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 3 | 3 | - | - | N/A |
| 2 | 5 | 2 | 0 | 3 | 75% |
| 3 | 6 | 1 | 0 | 5 | 83% |
| 4 | 7 | 1 | 0 | 6 | 86% |
| 5 | 8 | 1 | 0 | 7 | 88% |
| 6 | 9 | 1 | 0 | 8 | 89% |

도메인 모델이 라운드를 거치며 단조 증가로 안정. 핵심 5개(User, LearningSession, Concept, Cycle, GradingRow)는 Round 2 이후 변동 없음.

## Interview Transcript

<details>
<summary>Full Q&A (Round 0 + 6 rounds)</summary>

### Round 0 — Topology Confirmation
**Q:** 5개 최상위 컴포넌트(UI/엔진/저장소/자료입력/계정) 구성이 맞을까요?
**A:** 자료 입력 파이프라인만 연기, 나머지 4개 active
**Ambiguity:** not scored yet

### Round 1 — 소크라테스 엔진 / Goal Clarity
**Q:** 서비스를 처음 열고 첫 응답을 받기까지의 흐름은?
**A:** 한 줄 개념 입력 → 추정 + 1단계 설명+질문
**Ambiguity:** 78% (Goal 0.4, Constraints 0.1, Criteria 0.1)

### Round 2 — 사용자 계정 / Goal Clarity
**Q:** 타겟 사용자와 학습 이력 영속성은?
**A:** 로그인 필수 + 모든 이력 영구 저장
**Ambiguity:** 67.5% (Goal 0.55, Constraints 0.2, Criteria 0.15)

### Round 3 — 소크라테스 엔진 / Constraint Clarity
**Q:** LLM 백엔드와 기술 스택 선호는?
**A:** 추천 원함 → 추천 제시
**Ambiguity:** 52.5% (Goal 0.55, Constraints 0.7, Criteria 0.15)

### Round 3.5 — 백엔드 스택 확정
**Q:** CMP 프론트 기준, 백엔드 스택은?
**A:** Ktor + Supabase (Postgres + Auth)

### Round 4 — CONTRARIAN — 소크라테스 엔진 / Success Criteria
**Q:** 웹 서비스가 CLI 붙여넣기보다 확실히 나아야 하는 지점은?
**A:** CLI에서 질문 번호 매기기 불편, 입력 어려움, 회고 어려움 → GUI로 편의성 + 이력 회고
**Ambiguity:** 28.5% (Goal 0.7, Constraints 0.7, Criteria 0.75)

### Round 5 — 학습 대화 UI / Goal Clarity
**Q:** 확인 질문 3-8문항 입력 UI는?
**A:** 문항별 개별 텍스트박스 + 한 번에 제출
**Ambiguity:** 21% (Goal 0.85, Constraints 0.7, Criteria 0.8)

### Round 6 — SIMPLIFIER — 사용자 계정/배포 / Constraint Clarity
**Q:** MVP 운영 규모와 배포 형태는?
**A:** 50명 단기 접속, 운영자 API key → 추후 BYOK
**Ambiguity:** 15% ✅ (Goal 0.85, Constraints 0.9, Criteria 0.8)

</details>

---

**Status: pending approval**

이 spec은 실행 승인 전 상태입니다. 다음 단계는 사용자가 명시적으로 실행 옵션을 선택해야 진행됩니다.
