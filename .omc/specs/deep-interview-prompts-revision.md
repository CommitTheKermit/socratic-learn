# Deep Interview Spec: prompts.ts 의 skill 충실도 보강

## Metadata
- 생성일: 2026-05-25
- 입력 자료: socratic-learn-skill.md, frontend/src/api/prompts.ts
- 활성 컴포넌트(Task 1-4): EVAL_SYSTEM(summary 삭제), OUTLINE_SYSTEM, LEARN_STREAM_SYSTEM(+markdown.tsx), PROBE_SYSTEM(+자료 입력+선제 후퇴)
- 보류 컴포넌트(B-4): 분기(Branch) - 별도 후속 작업, 메모리에 보관

## Goal
프론트엔드의 5개 LLM 프롬프트가 socratic-learn-skill.md 의 원칙(한 단계 한 개념, 메커니즘 정의, 명시적 오해 교정, 비교 시각화, 자료 기반 진단, 선제적 후퇴)을 충실히 반영하도록 보강한다.

## 합의된 결정사항 (Deep Interview 라운드 결과)
- summary 필드는 삭제 (LLM 응답에 안 그려지는 상태로 비용만 발생)
- B-1: 표/ASCII 허용 + 마크다운 파서가 미완 블록을 안전 처리
- B-2: 자료에서 개념 추출 + p1=0 일 때 LLM 으로 선제 후퇴 판단 + 다이얼로그 + 새 세션 시작
- B-3: OUTLINE 에 잘못된 분해/올바른 분해 예시 박아넣기, 단계 4-7, 입도 제약
- B-4(분기): 위 작업 완료 후 별도 진행 (프로젝트 메모리에 계획 보관)
- 자료 입력 UI: Hero 안에 토글로 펼치기
- detectOverwhelm LLM 호출 타이밍: p1=0 일 때만
- 마크다운 표: 직접 파서 확장 (react-markdown 도입 X)

## Task 별 변경 계획

### Task 1. summary 필드 전면 삭제
- frontend/src/api/prompts.ts
  - EVAL_SYSTEM 의 [summary 작성 규칙] 섹션 제거
- frontend/src/api/claudeContent.ts
  - EvaluationSummary 인터페이스 제거
  - StepEvaluation.summary 제거
  - evalSchema.properties.summary 및 required 에서 summary 제거
  - 빈 questions 분기: { evaluations: [] } 로 단순화

### Task 2. OUTLINE_SYSTEM 개선
- frontend/src/api/prompts.ts: OUTLINE_SYSTEM 재작성
  - "한 단계 = 한 개념" 명시
  - 잘못된 분해 / 올바른 분해 예시 박아넣기
  - "한 단계는 5-10분에 한 개념" 입도 제약
  - 단계 수 3-5 -> 4-7
- frontend/src/api/claudeContent.ts: outlineSchema.steps
  - minItems 3 -> 4
  - maxItems 5 -> 7

### Task 3. LEARN_STREAM 시각화 허용 + markdown 파서 안전 처리
3a. frontend/src/api/prompts.ts: LEARN_STREAM_SYSTEM 재작성
  - "표 사용 금지" 제거
  - 비교 시 마크다운 비교표 또는 ASCII 다이어그램 1회 허용
  - 헤더(#)/리스트는 계속 금지
  - 메커니즘 정의 원칙 추가
3b. frontend/src/lib/markdown.tsx: 표 파싱 추가 + 미완 블록 안전
  - Block 타입에 { kind: "table"; header: string[]; rows: string[][] } 추가
  - 파싱: |...| 패턴 + 다음 줄이 |---|---| 구분선이면 표 시작
  - 미완 코드블록은 그대로 흘러가게 두되 마지막 flush 에서 코드 블록 닫힘 가드
  - 미완 표(헤더만 있고 구분선 미도착)는 표가 아닌 문단으로 임시 렌더 -> 다음 토큰 도착 시 표로 승격
3c. frontend/src/styles/v3.css: .md-table 스타일 추가

### Task 4. PROBE 자료 입력 + 선제 후퇴 다이얼로그
4a. 자료 입력 UI 와 상태
  - frontend/src/components/Hero.tsx: materials/setMaterials props 추가, 토글 + textarea
  - frontend/src/App.tsx: materials state 추가, Hero/Probe 에 전달, newSession(suggestedConcept?, resetMaterials?) 시그니처 확장
4b. PROBE 프롬프트 + 함수 시그니처
  - frontend/src/api/prompts.ts: PROBE_SYSTEM 에 materials 분석 지침 추가, probeUserMessage(concept, materials?) 확장
  - frontend/src/api/claudeContent.ts: generateProbeQuestions(concept, materials?) 확장
  - frontend/src/state/LearnContent.tsx: loadProbe(concept, materials?) 확장
4c. 선제 후퇴 판단 함수
  - frontend/src/api/prompts.ts: OVERWHELM_SYSTEM + overwhelmUserMessage 신설
  - frontend/src/api/claudeContent.ts: detectOverwhelm(concept, materials, probes) 신설, 스키마 { shouldRetreat, reason, suggestedConcept }
4d. 후퇴 다이얼로그 UI
  - frontend/src/stages/Probe.tsx: submit 시 p1=0 휴리스틱 게이트로 detectOverwhelm 호출
  - shouldRetreat 면 RetreatDialog 렌더 (네이티브 dialog 사용)
  - "네, 새로 시작" -> newSession(suggestedConcept) 호출, "그래도 계속할게요" -> 다이얼로그 닫고 onNext()
4e. CSS (v3.css)
  - .retreat-dialog, .materials-toggle, .materials-textarea 추가

## 검증
- 각 Task 후 `cd frontend && npx tsc -b --noEmit` 통과 확인
- Task 3 후 dev 서버 실행해서 비교표 포함된 응답이 깨지지 않는지 시각 확인

## 후속(B-4): 분기 컴포넌트
프로젝트 메모리에 별도 저장. 본 spec 의 4개 task 모두 완료 후 진행.
