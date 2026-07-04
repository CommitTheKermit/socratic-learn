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
    version: "0.18.0",
    date: "2026.07.05",
    changes: [
      { type: "feature", text: "메인 화면에서 준비된 학습 로드맵(안드로이드)을 골라 바로 학습을 시작할 수 있어요." },
      { type: "improve", text: "로그인 없이도 바로 학습을 시작할 수 있어요. 로그인은 기록을 기기 간에 잇고 싶을 때만 선택하면 돼요." },
      { type: "improve", text: "'이렇게 학습해요' 안내를 접어두면 다음에 와도 접힌 상태로 유지돼요." },
      { type: "fix", text: "분기 선택 화면에서 설명이 한 줄로 잘리던 문제를 고쳤어요." },
      { type: "fix", text: "일부 수식이 어긋나게 표시되던 문제를 개선했어요." },
    ],
  },
  {
    version: "0.17.1",
    date: "2026.06.23",
    changes: [
      { type: "fix", text: "부적합한 입력을 거를 때 안내 창이 화면 일부만 가리던 문제를 고쳐, 전체 화면에 또렷이 보이도록 했어요." },
    ],
  },
  {
    version: "0.17.0",
    date: "2026.06.23",
    changes: [
      { type: "feature", text: "학습 주제나 '질문하기'에 학습과 무관하거나 장난·무의미한 내용을 입력하면, 보내기 전에 걸러내고 다시 입력하도록 안내해요." },
      { type: "fix", text: "분기 화면에서 추천 단계를 골랐는데 심화로 들어가지 않고 다음 단계로 넘어가던 문제를 고쳤어요." },
    ],
  },
  {
    version: "0.16.0",
    date: "2026.06.22",
    changes: [
      { type: "feature", text: "학습 중 생긴 의문을 '질문하기'로 물으면 그 자리에서 답변과 함께 선행 개념·보충 단계까지 안내해요. 답변에 이어 최대 2번 더 물어볼 수 있고, 본문을 드래그해 바로 질문할 수도 있어요." },
      { type: "improve", text: "가로형 학습 화면에서 개념 설명과 확인 질문 칸이 각각 따로 스크롤돼요." },
      { type: "improve", text: "진단 문항을 만드는 동안 그라데이션 로딩 화면으로 진행 상태를 보여줘요." },
      { type: "fix", text: "진단 문항의 선택지·칩·보조 설명에서 수식이 깨지지 않고 제대로 표시돼요." },
    ],
  },
  {
    version: "0.15.0",
    date: "2026.06.18",
    changes: [
      { type: "improve", text: "선행 개념 확인이 '배우기 전 선수지식'과 '어려운 단계용 선행'으로 역할이 나뉘어 더 정확해지고, 선행 학습 내역이 안정적으로 저장돼요." },
      { type: "improve", text: "답변 후 분기에서 AI가 불필요한 새 단계를 덜 추천하고, 기존 로드맵 이어가기를 기본으로 제안해요." },
      { type: "improve", text: "개념 설명의 세로/가로 레이아웃 선택이 저장돼 다음에도 유지되고, 접기 버튼이 분리돼 더 다루기 쉬워졌어요." },
      { type: "fix", text: "분기로 추가한 단계가 새로고침·재접속 후에도 단계 번호(1-1 등)가 어긋나지 않아요." },
      { type: "fix", text: "'다시 답변하기' 버튼에 배경을 넣어 더 또렷하게 보여요." },
    ],
  },
  {
    version: "0.14.0",
    date: "2026.06.18",
    changes: [
      { type: "feature", text: "학습 설명에서 '선행 개념 보기'로 필요한 선행 개념을 트리로 확인하고, 막히는 개념만 따로 파고들어 학습할 수 있어요." },
      { type: "feature", text: "사이드바에서 학습들이 부모-하위 관계의 트리로 정리돼, 어디서 갈라져 나온 학습인지 한눈에 보여요." },
      { type: "improve", text: "모바일에서 개념 입력창을 위쪽 전체 폭으로 키우고 모드·'학습 시작' 버튼을 아래 줄에 배치해, 좁은 화면에서 더 쓰기 편해졌어요." },
    ],
  },
  {
    version: "0.12.2",
    date: "2026.06.16",
    changes: [
      { type: "fix", text: "다른 화면으로 이동할 때마다 사이드바가 다시 미끄러져 나오던 현상을 고쳐, 페이지를 옮겨도 그대로 고정되게 했어요." },
    ],
  },
  {
    version: "0.12.1",
    date: "2026.06.16",
    changes: [
      { type: "improve", text: "학습 진행 표시를 정리했어요 - 최상단 단계 바와 단계별 로드맵 바를 디자인에 맞추고, 페이지 맨 위에 전체 진행도 라인을 추가했어요." },
      { type: "fix", text: "스크롤할 때 미니 로드맵 바가 진행 바를 덮거나, 새로고침 뒤 나타나지 않던 문제를 고쳤어요." },
      { type: "improve", text: "업데이트 소식 항목을 '기능 추가 → 개선 → 버그 수정' 순으로 정렬해 보기 쉽게 했어요." },
    ],
  },
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
