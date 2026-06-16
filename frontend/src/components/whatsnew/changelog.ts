/**
 * 업데이트 소식(What's New) - 변경 내역 데이터 (단일 출처)
 *
 * 사용자에게 보여줄 버전별 변경 내역을 한 곳에 모은다. 패널/트리거는 모두 이 데이터를
 * 읽으며, 가장 최신 항목(CHANGELOG[0])이 "현재 버전"으로 취급된다.
 *
 * ── 매 릴리스마다 할 일 (배포 절차에 포함) ─────────────────────────────────
 * 1. frontend/package.json 의 version 을 올린다.
 * 2. 이 배열 맨 앞(index 0)에 새 버전 항목 하나를 추가한다.
 *    - version 은 package.json 과 똑같이 맞춘다.
 *    - date 는 배포일을 "YYYY.MM.DD" 로.
 *    - changes 는 사용자 입장의 짧은 한 문장으로. 내부 도구/하네스 변경은 제외한다.
 *    - 분류(type)는 feature(기능 추가) / improve(개선) / fix(버그 수정) 중 하나.
 * 맨 앞 항목은 자동으로 NEW 배지가 붙고, 사용자가 아직 안 본 새 버전이면
 * 사이드바 "업데이트" 항목에 빨간 점이 표시된다(본 버전 기록은 state/whatsnewSeen.ts).
 * 즉 릴리스마다 손볼 곳은 이 파일의 항목 추가 + package.json 버전, 두 군데뿐이다.
 */

export type ChangeType = "feature" | "improve" | "fix";

export interface ChangeEntry {
  type: ChangeType;
  text: string;
}

export interface VersionEntry {
  /** package.json 의 version 과 맞춘다. */
  version: string;
  /** 배포일 "YYYY.MM.DD". */
  date: string;
  /** 짧은 버전 제목(선택). 첫 공개 등에서만 보조로 쓴다. */
  title?: string;
  changes: ChangeEntry[];
}

/** 분류 메타 - 색은 브랜드 액센트(민트·시안·라벤더)를 재사용한다. 글리프는 시안 D 배지용. */
export const CHANGE_CATEGORY: Record<
  ChangeType,
  { label: string; full: string; glyph: string }
> = {
  feature: { label: "기능", full: "기능 추가", glyph: "+" },
  improve: { label: "개선", full: "개선", glyph: "↑" },
  fix: { label: "수정", full: "버그 수정", glyph: "✓" },
};

/** 패널 내 변경 항목 표시 순서: 기능 추가 → 개선 → 버그 수정. */
export const CHANGE_TYPE_ORDER: ChangeType[] = ["feature", "improve", "fix"];

/** 전체 버전 히스토리 (최신 → 과거). 맨 앞이 현재 버전. */
export const CHANGELOG: VersionEntry[] = [
  {
    version: "0.12.0",
    date: "2026.06.16",
    title: "학습 흐름 정리와 모바일",
    changes: [
      { type: "feature", text: "마치기 전이라면 답변을 다시 제출해 피드백을 새로 받을 수 있어요." },
      { type: "improve", text: "반복되는 개념은 하나로 합치고, 단계 번호와 지금 보고 있는 위치(경로)를 또렷하게 보여줘요." },
      { type: "feature", text: "진행 바와 단계 미니 바로 학습 진행 상황을 한눈에 볼 수 있어요." },
      { type: "improve", text: "휴대폰 화면에서도 편하게 학습할 수 있도록 레이아웃을 정리했어요." },
      { type: "feature", text: "업데이트 소식을 사이드바에서 모아볼 수 있어요." },
      { type: "fix", text: "평가를 마친 분기 단계에서 다음으로 넘어가지 못하고 갇히던 문제를 고쳤어요." },
    ],
  },
  {
    version: "0.11.0",
    date: "2026.06.13",
    title: "수식과 분기 다듬기",
    changes: [
      { type: "feature", text: "학습 본문과 확인 질문, AI 피드백에 수식을 또렷하게 렌더링하기 시작했어요." },
      { type: "improve", text: "분기 모드에서 평가와 분기를 거친 뒤 다음 단계로 넘어가도록 흐름을 정리했어요." },
    ],
  },
  {
    version: "0.10.0",
    date: "2026.06.11",
    title: "안정화",
    changes: [
      { type: "improve", text: "과도한 호출로부터 서비스를 지키는 사용량 한도를 도입했어요." },
    ],
  },
  {
    version: "0.9.0",
    date: "2026.06.11",
    title: "완료 화면 새단장",
    changes: [
      { type: "improve", text: "학습을 마치는 완료 화면을 새 디자인으로 다듬었어요." },
    ],
  },
  {
    version: "0.8.0",
    date: "2026.06.11",
    title: "답변 모드",
    changes: [
      { type: "feature", text: "답변 모드(가볍게·소크라틱·깊게)를 입력바에서 고를 수 있어요." },
      { type: "improve", text: "첫 화면이 항상 개념 입력 화면으로 시작하도록 정리했어요." },
      { type: "fix", text: "다음 학습 분기 추천이 실제 로드맵과 어긋나던 문제를 고쳤어요." },
    ],
  },
  {
    version: "0.6.0",
    date: "2026.06.08",
    title: "모르겠어요",
    changes: [
      { type: "feature", text: "확인 질문에서 ‘모르겠어요’를 표시하면 부담 없이 넘어갈 수 있어요." },
      { type: "improve", text: "확인 질문 입력 안내 문구를 더 다양하게 바꿨어요." },
    ],
  },
  {
    version: "0.5.0",
    date: "2026.06.07",
    title: "히스토리 다듬기",
    changes: [
      { type: "feature", text: "학습 히스토리에서 세션을 삭제할 수 있어요." },
      { type: "improve", text: "히스토리 사이드바가 화면을 전환할 때 깜빡이던 현상을 없앴어요." },
    ],
  },
  {
    version: "0.4.0",
    date: "2026.06.04",
    title: "히스토리 저장",
    changes: [
      { type: "feature", text: "학습 세션을 저장해 언제든 이어서 학습할 수 있어요." },
    ],
  },
  {
    version: "0.3.0",
    date: "2026.06.01",
    title: "이어보기",
    changes: [
      { type: "improve", text: "주소(URL)로 단계가 복원되어 새로고침해도 진행 상황이 유지돼요." },
    ],
  },
  {
    version: "0.2.0",
    date: "2026.06.01",
    title: "레이아웃 전환",
    changes: [
      { type: "feature", text: "학습 화면을 가로·세로 레이아웃으로 전환할 수 있어요." },
      { type: "fix", text: "비교표가 표가 아닌 텍스트로 깨져 보이던 문제를 고쳤어요." },
    ],
  },
  {
    version: "0.1.0",
    date: "2026.05.31",
    title: "첫 공개",
    changes: [
      { type: "feature", text: "Socratic Learn 첫 공개 - 소크라틱식 점진 학습을 시작합니다." },
      { type: "feature", text: "GitHub 계정으로 로그인할 수 있어요." },
    ],
  },
];

/** 현재(최신) 버전 문자열. 빨간 점 노출 판단 기준이 된다. */
export const LATEST_VERSION = CHANGELOG[0]?.version ?? "";
