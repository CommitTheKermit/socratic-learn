# Deep Interview Transcript: Claude Design FE Prototype Brief

## Metadata
- Profile: standard
- Type: brownfield
- Final ambiguity: 9%
- Threshold: 20%
- Context snapshot: `.omx/context/fe-design-prototype-brief-20260521T155138Z.md`
- Source artifacts:
  - `.omc/specs/deep-interview-socratic-learn-web.md`
  - `.omc/plans/consensus-socratic-learn-web-mvp.md`
  - `.omc/specs/deep-interview-hackathon-5h-4person.md`
  - `.omc/plans/consensus-hackathon-5h-4person.md`

## Clarity Breakdown
| Dimension | Score | Notes |
|---|---:|---|
| Intent | 0.90 | Convert engineering-oriented `.omc` specs into a Claude Design-ready FE prototype brief |
| Outcome | 0.93 | Full MVP experience, with design persuasion focused on the main learning screen |
| Scope | 0.93 | Main LLM input, streaming explanation, confirmation question, and answer UI are primary |
| Constraints | 0.86 | Secondary product surfaces intentionally weak; Korean-first; Claude Design downstream |
| Success | 0.90 | Prototype must visibly reduce CLI input burden |
| Context | 0.92 | Existing `.omc` MVP/hackathon docs establish product and FE flow context |

Weighted ambiguity: `1 - (0.90*0.25 + 0.93*0.20 + 0.93*0.20 + 0.86*0.15 + 0.90*0.10 + 0.92*0.10) = 9.2%`

## Transcript

### Round 1 — Scope
**Q:** 이번 Claude Design용 FE 디자인 프로토타입은 정식 MVP 전체 경험을 보여주는 기획서인가, 해커톤/P1 데모 범위의 핵심 학습 플로우만 보여주는 기획서인가?  
**A:** Claude Design용 FE 디자인 프로토타입은 “정식 MVP 전체 경험”을 보여주는 기획서.

### Round 2 — Outcome
**Q:** 정식 MVP 전체 경험 중 Claude Design 결과물이 가장 설득해야 하는 핵심 장면은 무엇인가?  
**A:** 스트리밍 설명 + 확인 질문 답변의 학습 몰입감.

### Round 3 — Non-goals
**Q:** 그 몰입감을 살리기 위해, 정식 MVP 전체 경험 안에서도 첫 디자인 프로토타입에서 의도적으로 약하게 보여주거나 제외할 것은 무엇인가?  
**A:** 로그인/OAuth, 과거 세션 검색, BYOK/API 키 설정, 토큰 한도 안내, 관리자/운영 화면, 모바일 대응 모두 약하게. LLM 입력 UI, 확인 질문 UI, 질문 답변 UI, 즉 메인 화면이 가장 중요함.

### Round 4 — Decision Boundaries
**Q:** Claude Design용 기획서에서 제가 자율로 결정해도 되는 디자인 범위는 어디까지인가?  
**A:** 화면 IA, 메인 화면 레이아웃, 컴포넌트 구조, 한국어 마이크로카피, 컬러/타이포 톤, 인터랙션 상태.

### Round 5 — Success Criteria / Pressure Pass
**Q:** “스트리밍 설명 + 확인 질문 답변의 학습 몰입감”이 잘 구현됐다고 판단할 수 있는 가장 중요한 관찰 신호 1개는 무엇인가?  
**A:** CLI보다 입력 부담이 확 줄어 보인다.

### Round 6 — Tradeoff Boundary
**Q:** 입력 부담을 줄이기 위해서라면, 디자인에서 어느 쪽을 더 우선해야 하나?  
**A:** 최소 입력/빠른 제출: 질문별 텍스트박스와 “모르겠어요” 중심, 보조 기능은 최대한 접기.

## Readiness Gates
- Non-goals: explicit
- Decision boundaries: explicit
- Pressure pass: complete
- Closure audit: another interview question would refine taste, not materially change the planning brief
