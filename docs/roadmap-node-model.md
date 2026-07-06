# 로드맵 노드 모델

학습 로드맵의 단계(Step) 노드를 다루는 순수 함수 3종을 한곳에 정리한다. 모두 `frontend/src/lib/` 에 있고 부수효과가 없다. `Step` 타입은 `src/stages/data.ts`, 삽입(분기) 단계는 `step._meta`(`parentMainStepId`, `siblingIndex`)로 원본과 구분한다.

## 1. 중복 노드 병합 (isMerged + 백스톱)

분기 평가 시 같은 개념의 단계가 로드맵에 두 번 들어가는 것을 막는 **이중 방어**다.

- 정규화 키: `stepTitle.ts` 의 `normalizeStepTitle(title)` - trim → 소문자화 → 내부 공백 단일화 → 첫 구분자(콜론 `:` 또는 공백으로 감싼 하이픈 ` - `) 이후 부제 제거. 복합어 하이픈(`co-routine`)은 보존. 중복/번호/브레드크럼이 공유하는 비교 키.
- `isDuplicateStep(candidate, roadmapSteps)` - candidate 와 기존 제목들을 같은 방식으로 정규화해 하나라도 일치하면 `true`.
- `stepInsertGuard.ts` 의 `canInsertBranchStep(optionType, isMerged, candidate, steps)` 가 삽입 여부를 최종 결정:
  - **AC2 레이어**: `optionType === "ai_recommended" && isMerged === true` → 삽입 차단. 서버(LLM)가 "이미 로드맵에 있다"고 보낸 의미 동등성 신호(`EvaluationResponse.isMerged`)를 그대로 신뢰.
  - **AC3 백스톱**: `shouldInsertBranchStep(candidate, steps)` 로 제목 정규화 중복을 재검증. LLM이 `isMerged=false` 로 잘못 판단해도 프론트가 막는다.
- 설계 의도: 서버의 "바로-다음" 신호만으로는 부족하므로, "아직 안 배운 로드맵 전체"가 아니라 **현재 steps 전체(원본 + 기삽입 분기)** 의 제목과 비교하는 백스톱을 둔다. 같은 개념이 다른 제목으로 들어오면 정규화 비교는 무력하므로 어디까지나 백스톱이고, 1차 방어는 서버 `isMerged` 다.

## 2. 계층형 십진수 번호 체계

`stepLabel.ts` 의 `getLabelForStep(steps, index)` (id 버전 `getStepLabel(steps, stepId)`).

- 원본(비삽입, `_meta` 없음) 단계: 앞쪽 원본 단계 수를 세어 정수 라벨 `1`, `2`, `3` ...
- 분기(삽입, `_meta` 있음) 단계: `부모메인정수 + "." + (siblingIndex + 1)` → `1.1`, `1.2`, `2.3` ...
- **3-depth(`1.1.1`)는 생성하지 않는다.** 분기의 분기는 같은 메인 아래 다음 형제로 평탄화. zero-pad 없음.

01/02, 1-1-1-1 식 혼재 표기를 이 계층형 십진수로 통일하는 것이 의도된 표기 규칙이다.

## 3. 브레드크럼 (현재 위치 경로)

`breadcrumb.ts` 의 `buildBreadcrumb(concept, steps, currentIndex)` 가 경로 **세그먼트 배열**을 반환한다. 라벨/문맥은 `state/stepContext.ts` 의 `resolveStepContext` 에서 가져온다.

- 메인 스텝: `[concept, "{라벨} {제목}", "n/total"]` (3 세그먼트)
- 분기 스텝: `[concept, "{부모라벨} {부모제목}", "{분기라벨} {분기제목}", "n/total"]` (4 세그먼트)
- 예: `["코루틴", "1 기초", "1.1 구조화된 동시성", "2/5"]`

**현황: 세그먼트 생성 로직과 단위 테스트(`breadcrumb.test.ts`)만 존재하고, 실제 렌더링 UI 컴포넌트는 미구현이다.** production 코드에서 `buildBreadcrumb` 호출처가 없으며, `ProgressBar.tsx` 는 현재 단계 번호만 노출한다. UI 배선이 남은 작업.
