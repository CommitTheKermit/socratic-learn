# Claude Design Brief: FE 디자인 프로토타입 기획서

## Metadata
- Profile: standard
- Rounds: 6
- Final Ambiguity: 9%
- Threshold: 20%
- Context Type: brownfield
- Status: PASSED
- Context Snapshot: `.omx/context/fe-design-prototype-brief-20260521T155138Z.md`

## Source Context
이 기획서는 기존 `.omc`의 ClaudeCode 기반 실행 스펙/플랜을 FE 디자인 프로토타입 관점으로 재구성한다.

### Source Artifacts
- `.omc/specs/deep-interview-socratic-learn-web.md` — 정식 MVP 제품 스펙
- `.omc/plans/consensus-socratic-learn-web-mvp.md` — 정식 MVP 실행/검수 플랜
- `.omc/specs/deep-interview-hackathon-5h-4person.md` — 해커톤 축소 범위 스펙
- `.omc/plans/consensus-hackathon-5h-4person.md` — 5시간/4인 구현 플랜

## Clarity Breakdown
| Dimension | Score | Gap/Resolution |
|---|---:|---|
| Intent | 0.90 | `.omc`의 구현 중심 문서를 Claude Design 입력용 FE 기획서로 변환 |
| Outcome | 0.93 | 정식 MVP 전체 경험을 담되, 메인 학습 화면 몰입감을 최우선 설득 장면으로 설정 |
| Scope | 0.93 | LLM 입력 UI, 스트리밍 설명, 확인 질문 UI, 답변 UI가 1순위 |
| Constraints | 0.86 | 보조 화면은 약하게, 모바일/운영/BYOK 등은 첫 디자인에서 강조하지 않음 |
| Success | 0.90 | CLI 대비 입력 부담이 확 줄어 보이면 성공 |
| Context | 0.92 | 기존 `.omc` 문서가 제품 범위와 FE 핵심 플로우를 충분히 제공 |

## Intent
Claude Design이 바로 해석할 수 있도록, `socratic-learn-web` 정식 MVP의 FE 디자인 프로토타입 기획서를 만든다. 구현 중심의 `.omc` 계획을 디자인 중심으로 바꾸되, 제품의 핵심 차별점인 “CLI보다 적은 입력 부담”과 “학습 몰입감”이 한눈에 드러나야 한다.

## Desired Outcome
정식 MVP 전체 경험을 보여주는 디자인 프로토타입. 단, 모든 기능을 균등하게 보여주는 것이 아니라 **메인 학습 화면**을 압도적으로 중요하게 보여준다.

핵심 장면:
1. 사용자가 학습 개념을 한 줄로 입력한다.
2. AI가 설명을 스트리밍으로 생성한다.
3. 확인 질문이 문항별로 분리되어 나타난다.
4. 사용자가 각 질문에 짧게 답하거나 “모르겠어요”를 선택한다.
5. 한 번에 제출할 수 있어 CLI보다 입력 부담이 확 줄어 보인다.

## In Scope
### Primary Design Focus
- LLM/개념 입력 UI
- 스트리밍 설명 영역
- 확인 질문 카드/리스트 UI
- 질문별 답변 텍스트박스
- “모르겠어요” 토글/버튼
- 한 번에 제출 CTA
- 학습 진행감/현재 단계 표시
- 최소한의 분기 선택 카드

### Secondary, Weakly Represented Surfaces
- 로그인/OAuth 진입
- 과거 세션 목록/검색/이어하기
- 토큰 한도 안내
- 설정/BYOK API 키 영역

이 보조 화면들은 “정식 MVP에 존재한다”는 정도만 보여주고, 첫 프로토타입에서 시각적 주인공이 되면 안 된다.

## Out of Scope / Non-goals
- 로그인/OAuth 상세 플로우를 깊게 설계하지 않는다.
- 과거 세션 검색 UX를 상세 설계하지 않는다.
- BYOK/API 키 설정 화면을 상세 설계하지 않는다.
- 토큰 한도/운영 정책 화면을 상세 설계하지 않는다.
- 관리자/운영 화면은 다루지 않는다.
- 모바일 대응 디자인은 첫 프로토타입의 목표가 아니다.
- 풍부한 보조 학습 기능(힌트, 예시 보기, 질문별 메모, 상세 진행도)을 전면에 드러내지 않는다.

## Decision Boundaries
다음은 기획서 작성자가 자율 결정 가능하다.
- 화면 IA
- 메인 화면 레이아웃
- 컴포넌트 구조
- 한국어 마이크로카피
- 컬러/타이포그래피 톤
- 인터랙션 상태

단, 자율 결정은 항상 다음 원칙을 따라야 한다.
> “최소 입력/빠른 제출”이 “풍부한 학습 제어감”보다 우선이다.

## Claude Design Brief

### Product Name
Socratic Learn Web

### One-line Concept
CLI에서 하던 소크라테스식 학습 루프를 웹 UI로 옮겨, 사용자가 적은 입력으로 개념 설명을 받고 확인 질문에 답하며 학습을 이어가는 한국어 학습 서비스.

### Prototype Goal
정식 MVP 전체 경험을 표현하되, 시각적·인터랙션 중심은 메인 학습 화면에 둔다. 사용자가 보자마자 “CLI보다 답변 입력이 훨씬 편하겠다”고 느껴야 한다.

### Target User
- 개발/기술 개념을 자기 언어로 이해하고 싶은 한국어 사용자
- Claude Code/CLI 기반 학습은 가능하지만 질문 번호 입력, 반복 제출, 과거 회고가 번거롭다고 느끼는 사용자

### Core UX Principle
**읽기 → 바로 답하기 → 한 번에 제출하기**가 한 화면 안에서 자연스럽게 이어져야 한다.

### Information Architecture
1. **Main Learning Screen** — 최우선
   - 개념 입력
   - AI 스트리밍 설명
   - 확인 질문
   - 답변 입력
   - 한 번에 제출
   - 다음 분기 선택
2. **Session History** — 보조
   - 좌측 사이드바 또는 접힌 패널로 약하게 표현
   - 최근 세션 몇 개만 미리보기
3. **Auth/Account** — 매우 보조
   - 로그인 상태 뱃지 또는 간단한 진입 화면 수준
4. **Settings/Quota/BYOK** — 존재만 암시
   - 상세 설정 화면은 만들지 않거나 아주 작은 메뉴 항목으로만 표현

### Main Screen Layout Direction
권장 레이아웃: 데스크톱 웹 기준 2-column 또는 focus-centered hybrid.

- **Left / Narrow Rail**
  - 앱 이름
  - 현재 세션 제목
  - 최근 학습 세션 미니 리스트
  - 보조 기능은 작고 조용하게

- **Center / Main Learning Canvas**
  - 상단: “무엇을 배우고 싶나요?” 개념 입력 바
  - 중단: 스트리밍 설명 카드
  - 하단: 확인 질문 + 답변 영역
  - 최하단 sticky CTA: “답변 한 번에 제출”

- **Right / Optional Context Panel**
  - 현재 단계: 개념 입력 → 설명 읽기 → 질문 답변 → 제출 → 다음 선택
  - 너무 복잡하면 접힌 패널로 처리

### Main Components
#### 1. Concept Input
- Placeholder: “예: 코루틴이 왜 필요한지 알고 싶어요”
- CTA: “학습 시작”
- 느낌: 채팅창보다 “학습 주제 입력”에 가까워야 한다.

#### 2. Streaming Explanation Card
- 상태: 생성 중 / 생성 완료
- 스트리밍 중에는 문장이 부드럽게 쌓이는 느낌
- Markdown, 코드블록, 비교표, ASCII 다이어그램을 읽기 좋게 렌더링
- 과도한 장식보다 가독성 우선

#### 3. Confirmation Questions
- 질문은 반드시 문항별로 분리된 카드 또는 블록으로 표시
- 각 질문은 다음을 포함한다.
  - 문항 번호
  - 질문 본문
  - 짧은 답변 텍스트박스
  - “모르겠어요” 토글
- 질문 카드는 한눈에 “여기에 답하면 된다”가 보여야 한다.

#### 4. Answer Input
- 각 텍스트박스는 짧고 부담 없는 크기에서 시작
- 긴 답변도 가능하지만 기본 인상은 “간단히 써도 된다”여야 한다.
- CLI처럼 번호를 기억하거나 별도 포맷을 맞출 필요가 없어야 한다.

#### 5. Submit CTA
- Primary CTA: “답변 한 번에 제출”
- 보조 문구: “모든 문항을 완벽히 몰라도 괜찮아요.”
- 입력 부담을 낮추기 위해 제출 전 복잡한 검증/경고를 최소화한다.

#### 6. Branch Choice
- 제출 후 또는 채점 후 다음 학습 방향 카드 2-4개
- 첫 디자인에서는 메인 답변 경험보다 약하게 표현
- 예: “더 쉽게 설명”, “예제로 보기”, “오해한 부분 다시 보기”, “다음 개념으로 이동”

### Interaction States
- Empty: 개념 입력 전
- Streaming: 설명 생성 중
- Ready to Answer: 질문이 모두 렌더링되고 답변 가능
- Partial Answered: 일부 답변/모르겠어요 선택됨
- Submitting: 한 번에 제출 중
- Reviewed: 채점/교정 결과와 다음 분기 표시

### Microcopy Tone
- 한국어 우선
- 친절하지만 과하게 유아적이지 않게
- 사용자의 불완전한 이해를 허용하는 말투
- 예시 문구:
  - “짧게 적어도 괜찮아요.”
  - “모르면 ‘모르겠어요’를 눌러도 됩니다.”
  - “지금은 정답보다 당신의 이해 상태가 중요해요.”
  - “답변을 모아 한 번에 확인할게요.”

### Visual Tone
- 집중형 학습 도구
- 차분한 배경 + 명확한 카드 경계
- 코딩/기술 학습에 어울리는 모노스페이스 보조 사용 가능
- 컬러는 상태 전달에 사용:
  - 진행/정상: green/blue 계열
  - 주의/부분 이해: amber
  - 오해/재학습: red는 부드럽게
- 메인 화면 CTA는 확실히 보여야 한다.

### What Must Feel Better Than CLI
- 질문 번호를 따로 기억하지 않아도 된다.
- 각 질문 아래에 바로 답을 쓸 수 있다.
- 모르면 바로 표시할 수 있다.
- 모든 답변을 한 번에 제출할 수 있다.
- 설명과 질문이 같은 맥락 안에 있어 왔다 갔다 하지 않아도 된다.

## Testable Acceptance Criteria
- [ ] 첫 화면을 본 사용자가 5초 안에 “학습 개념을 입력하면 된다”고 이해할 수 있다.
- [ ] 스트리밍 설명 영역과 질문 답변 영역이 같은 학습 흐름 안에 연결되어 보인다.
- [ ] 확인 질문이 문항별로 분리되어 있고, 각 문항 아래에 바로 답변할 수 있다.
- [ ] “모르겠어요”가 각 질문의 부담을 낮추는 장치로 보인다.
- [ ] “답변 한 번에 제출” CTA가 명확하다.
- [ ] 보조 기능(Auth, History, BYOK, Quota, Admin, Mobile)이 메인 학습 화면보다 시각적으로 튀지 않는다.
- [ ] Claude Design 결과물을 봤을 때 “CLI보다 입력 부담이 확 줄었다”는 인상이 든다.

## Assumptions Exposed + Resolutions
| Assumption | Pressure / Question | Resolution |
|---|---|---|
| 정식 MVP 전체를 균등하게 보여줘야 한다 | 핵심 장면은 무엇인가? | 전체 경험은 담되 메인 학습 화면을 중심으로 한다 |
| 보조 화면도 자세히 설계해야 한다 | 무엇을 약하게 보여줄 것인가? | Auth, History, BYOK, Quota, Admin, Mobile은 약하게 처리 |
| 몰입감은 풍부한 제어 기능에서 온다 | 입력 부담을 줄이려면 무엇을 우선하나? | 최소 입력/빠른 제출이 우선, 보조 기능은 접는다 |

## Brownfield Evidence vs Inference Notes
- [from-code][auto-confirmed] `.omc`에는 정식 MVP와 5시간 해커톤 축소 범위 문서가 모두 존재한다.
- [from-code][auto-confirmed] 기존 MVP 스펙은 한 줄 개념 입력, SSE 스트리밍, 문항별 텍스트박스, 한 번에 제출, 채점/분기, 학습 이력 회고를 핵심 UX로 정의한다.
- [from-user] Claude Design용 프로토타입은 정식 MVP 전체 경험이어야 한다.
- [from-user] 디자인의 중심은 스트리밍 설명 + 확인 질문 답변의 학습 몰입감이다.
- [from-user] 첫 프로토타입의 성공 신호는 CLI보다 입력 부담이 확 줄어 보이는 것이다.

## Handoff Recommendation
다음 단계는 이 문서를 그대로 Claude Design 입력으로 사용하거나, `$ralplan`으로 디자인 산출물 검수 계획을 세우는 것이다. 구현은 아직 하지 않는다.
