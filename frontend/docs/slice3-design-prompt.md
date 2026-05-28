# Slice 3 디자인 프롬프트 — 분기 선택 UI

Claude(예: Artifacts, claude.ai)에 다음을 그대로 입력해 분기 선택 칩 + ProgressBar 동적 삽입 시안을 받는다. 결과는 React + TSX + 인라인 className 으로 받아 본 레포 `src/components/` 와 `src/stages/` 에 통합하기 쉬운 형태로.

---

## 컨텍스트 (그대로 붙여넣기)

socratic-learn 은 사용자가 입력한 개념에 대해 LLM 이 학습 로드맵(단계 목록)을 만들고, 각 단계에서 설명 → 확인 질문 → 사용자 답변 → 평가의 사이클을 반복하는 학습 웹 서비스다. React 18 + TypeScript + Vite 스택.

지금까지 분기 루프 기능이 두 슬라이스에 걸쳐 모델 레이어까지 들어왔다 (`branchReducer`, `BranchOption` 타입, `parseEvaluationJson`, `BranchPhaseState`). 이번 슬라이스 3 는 그 위에 얹는 **UI 레이어**다.

### 데이터 모델 (이미 구현됨, 그대로 사용)

```ts
type BranchOptionType = "roadmap_next" | "ai_recommended" | "additional" | "exit";

interface BranchOption {
  label: string;
  type: BranchOptionType;
  isRecommended: boolean;   // ai_recommended 는 항상 true. 머지된 roadmap_next 도 true.
  stageContent: Step | null; // exit 는 null
}

interface EvaluationResponse {
  evaluationText: string;
  isMerged: boolean;
  branchOptions: BranchOption[]; // 최대 4 + exit 1
}

interface Step {
  id: number;
  title: string;
  desc: string;
  body: string;
  questions: { id: string; q: string }[];
}
```

### 기존 UI 패턴

- 상단에 단계 진행을 표시하는 `ProgressBar` 가 있고 각 phase 가 칩으로 보임 (`pb-seg`, `pb-track`, `pb-fill`)
- 각 학습 단계는 `StageShell` 컴포넌트로 감싸 eyebrow/title/sub 와 prev/next 버튼이 있음
- 색상은 차분한 톤 (이미 디자인 시안 적용됨, `.phase-bar`, `.pb-` prefix 등 CSS 변수 기반)
- 평가 직후의 분기 선택은 새로운 stage 로 들어옴

## 만들어 줄 것

### 1. `BranchSelector` 컴포넌트

평가 직후 화면에 나오는 분기 선택 카드.

요구사항:
- `evaluationText` 를 카드 상단에 마크다운 친화적으로 표시
- 그 아래 `branchOptions` 를 칩 리스트로 렌더링
- 칩 순서: roadmap_next → ai_recommended → additional(0~2개) → exit
- `isRecommended=true` 인 칩에 "추천" 배지를 우측 상단에 부착, 약한 강조 색
- 머지된 경우(isMerged && type=roadmap_next + isRecommended) 단일 칩으로 표시되어 있음 그대로 렌더링
- exit 칩은 시각적으로 약하게(보더만, 회색 텍스트)
- 칩 클릭 시 `onChoose(option: BranchOption) => void` 호출
- 각 칩은 작은 미리보기 (stageContent?.title, stageContent?.desc 첫 1줄)를 라벨 아래에 표시. exit 는 "여기서 학습을 마치기" 같은 고정 문구
- 키보드 접근성: 화살표 키로 칩 간 이동, Enter 로 선택

Props:
```ts
interface BranchSelectorProps {
  evaluationText: string;
  branchOptions: BranchOption[];
  onChoose: (option: BranchOption) => void;
}
```

### 2. `ProgressBar` 동적 칩 삽입 변형

기존 `ProgressBar` 는 PHASES 와 stepIdx 로 진행을 표시한다. 분기 삽입을 수용하도록:
- `steps` 배열이 동적으로 늘어남(splice 삽입) 을 가정
- 삽입된 단계는 시각적으로 구분 (예: 칩 배경에 점선 보더 또는 살짝 다른 색)
- "현재 칩 - 삽입 칩 - 다음 로드맵 칩" 의 순서가 자연스럽게 보여야 함

Props 는 기존과 호환 유지하되 각 step 에 `inserted?: boolean` 플래그가 들어옴을 가정.

### 3. `BranchErrorCard` 컴포넌트

LLM 응답 파싱 실패 또는 네트워크 오류 상태에서 표시.

요구사항:
- 에러 메시지 (사용자 친화적 문구. 기술적 디테일은 `<details>` 안에)
- "다시 시도" 버튼 (primary)
- 재시도 횟수를 작게 표시 ("재시도 2회")
- "학습 종료" 보조 버튼 (secondary)

Props:
```ts
interface BranchErrorCardProps {
  message: string;
  retryCount: number;
  onRetry: () => void;
  onExit: () => void;
}
```

## 출력 형식

- 3개 컴포넌트를 별도 코드 블록으로
- 각 컴포넌트는 React + TypeScript 함수형 컴포넌트
- 스타일링은 className + 별도 CSS 파일 한 개 (`branch.css`) 로 분리, CSS 변수(`var(--accent)` 등) 우선 사용
- 인라인 SVG 아이콘은 최소로
- 의존성은 React 만 사용 (외부 라이브러리 추가 금지)

## 안 할 것

- 추천 배지에 화려한 애니메이션
- 정/부분정/오해 색 시그널(🟢🟡🔴 등)
- 랜딩 페이지나 온보딩 일러스트
- 상태 관리 라이브러리 도입

---

## 후속 적용 메모

받은 결과는 `frontend/src/components/branch/` 디렉터리에 새로 만들어 둘 예정. 통합 시 `LearnContent` 의 stage 머신에 `branch` / `branch_error` 단계 추가하고 평가 응답 핸들러에서 라우팅.
