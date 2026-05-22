# Deep Interview Spec: P1 데모 우선 분야별 구현 순서표

## Metadata
- Profile: standard
- Rounds: 3
- Final Ambiguity: 8%
- Threshold: 20%
- Context Type: brownfield
- Status: PASSED
- Context Snapshot: `.omx/context/implementation-sequence-by-role-20260521T160440Z.md`
- Canonical Plan Copy: `.omc/plans/p1-demo-implementation-sequence-by-role.md`

## Source Context
기존 `.omc` 문서에는 두 범위가 공존한다.

1. **정식 MVP**: Auth, SSE 학습 사이클, 답변/채점/분기, 이력 저장/회고, 토큰 제한, 배포까지 포함.
2. **P1 데모**: 로그인 없이 로컬에서 `개념 입력 → Claude/fixture SSE → 설명+질문 표시 → 답변 제출`까지 먼저 동작.

사용자는 P1 데모를 먼저 완성하고 이후 MVP로 확장하는 순서표를 요청했다.

## Intent
프로젝트 구현이 헷갈리지 않도록, FE/BE/QA/PM 분야별로 “무엇을 어떤 순서로 만들지”와 “각 단계의 목표가 무엇인지”를 분리해 정리한다.

## Desired Outcome
P1 데모를 먼저 성공시키는 실행 순서표. P1 완료 기준은 다음이다.

> FE에서 개념 입력 → BE가 실제 Claude API 또는 fixture fallback으로 SSE 응답 → 설명+확인 질문 표시 → 사용자가 질문별 답변 입력 → 답변 제출 API 200 OK.

## In Scope
- P1 데모 구현 순서
- P1 이후 정식 MVP 확장 순서
- FE, BE, QA, PM/Shared Tech Lead 역할별 기능 목록
- 각 역할별 구현 목표

## Out of Scope / Non-goals for P1
- 로그인/OAuth
- 세션 이력 검색/회고 UI
- Supabase Auth 연동
- BYOK/API 키 설정
- 토큰 한도/과금 정책 UI
- 관리자/운영 화면
- 모바일 최적화
- 완전한 채점/분기 루프
- 운영 배포

## Decision Boundaries
- PM은 Product/Project PM + Shared/Tech Lead 역할을 함께 맡는 것으로 정리한다.
- P1은 “화면만 보이는 데모”가 아니라 live Claude 호출과 fixture fallback이 모두 준비된 로컬 E2E로 본다.
- 이후 MVP 확장은 P1의 계약/화면/API를 버리지 않고 단계적으로 확장한다.

## Implementation Roadmap
아래 canonical plan을 따른다: `.omc/plans/p1-demo-implementation-sequence-by-role.md`.
