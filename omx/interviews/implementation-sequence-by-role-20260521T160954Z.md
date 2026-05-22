# Deep Interview Transcript: 분야별 구현 순서표

## Metadata
- Profile: standard
- Type: brownfield
- Final ambiguity: 8%
- Threshold: 20%
- Context snapshot: `.omx/context/implementation-sequence-by-role-20260521T160440Z.md`
- Source artifacts:
  - `.omc/specs/deep-interview-socratic-learn-web.md`
  - `.omc/plans/consensus-socratic-learn-web-mvp.md`
  - `.omc/specs/deep-interview-hackathon-5h-4person.md`
  - `.omc/plans/consensus-hackathon-5h-4person.md`

## Transcript

### Round 1 — Scope
**Q:** 분야별 구현 순서표는 정식 MVP 전체, P1 데모 우선, 둘 다 중 어떤 기준으로 만들까?  
**A:** P1 데모 우선 로드맵 — 먼저 동작하는 최소 버전, 이후 MVP 확장.

### Round 2 — Success Criteria / Pressure Pass
**Q:** P1 데모의 완료는 어디까지로 잡을까?  
**A:** 라이브 Claude 포함 완료: 로컬 E2E + 실제 Claude API 호출 성공 + fixture fallback까지 준비.

### Round 3 — Decision Boundary
**Q:** 분야별 정리에서 PM은 어떤 역할로 잡을까?  
**A:** Shared/Tech Lead 포함 PM: 목표·범위·우선순위·데모 시나리오·일정 관리 + 공통 계약/브랜치/머지/통합 게이트까지 관리.

## Readiness Gates
- Non-goals: explicit — P1에서는 Auth/History/BYOK/Quota/배포/모바일을 제외하고 이후 MVP 확장으로 보냄
- Decision boundaries: explicit — PM은 Shared/Tech Lead 책임까지 포함
- Pressure pass: complete — P1 done을 단순 화면 데모가 아니라 live Claude + fixture fallback까지 포함하도록 잠금
