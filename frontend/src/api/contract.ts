// SOURCE OF TRUTH: 이 파일이 API 경로/DTO 의 단일 진실 출처다.
// (구 shared/ Kotlin 미러는 Firebase Functions 이전 후 제거됨.)
// ApiPaths 의 키 = Function 이름 = 경로. functions/src/<fn>.ts 와 같은 PR 에서 함께 수정한다.

export const ApiPaths = {
  // Firebase Functions 로 이전된 엔드포인트 (함수명 = 경로)
  OVERWHELM: "/overwhelm",
  // 개념이 너무 어려울 때 다단계 선행 개념 트리(이름 지도)를 생성한다.
  PREREQ_TREE: "/prereqTree",
  PROBE: "/probe",
  OUTLINE: "/outline",
  STEP_DETAIL: "/stepDetail",
  ANSWER_EVAL: "/answerEval",
  BRANCH_EVAL: "/branchEval",
  // learn 단계 '질문하기' 라우터. 한 줄 질문을 prereq|newStep|none 으로 분류(분류 전용 LLM 콜).
  ASK_ROUTE: "/askRoute",
  // 자유 텍스트 입력(학습 주제/질문)이 학습에 쓸 수 있는 입력인지 사전 검증(값싼 Haiku 게이트).
  VALIDATE_INPUT: "/validateInput",
  STEP_DETAIL_STREAM: "/stepDetailStream",
  // 테스트 모드 자격 조회(Anthropic 미사용). 로그인 직후 1회 호출해 입력창 모드 노출 게이팅에 쓴다.
  TEST_ELIGIBLE: "/testEligible",
  // 학습 세션 Firestore 영속화 (Anthropic 미사용. 함수명=경로, :id 대신 query param).
  SESSION_SAVE: "/sessionSave",
  SESSION_LIST: "/sessionList",
  SESSION_GET: "/sessionGet",
  SESSION_DELETE: "/sessionDelete",
  // ready-made 로드맵 라이브러리 (Anthropic 미사용, 공개 읽기). 운영자가 시드로 적재한 로드맵을
  // 인증 사용자(익명 포함) 누구나 조회한다. 쓰기 엔드포인트는 없다(적재는 Admin SDK 시드 스크립트만).
  READYMADE_ROADMAP_LIST: "/readymadeRoadmapList",
  READYMADE_ROADMAP_GET: "/readymadeRoadmapGet",
} as const;

// stepDetailStream SSE 이벤트. body 는 delta 로 흘리고 questions 는 complete 에 담긴다.
export const StreamEvents = {
  STATUS: "status",
  DELTA: "delta",
  COMPLETE: "complete",
  ERROR: "error",
} as const;

export interface StreamStatusPayload {
  status: string;
  message: string;
}
export interface StreamDeltaPayload {
  text: string;
}
export interface StepDetailStreamComplete {
  body: string;
  questions: { id: string; q: string }[];
}
export interface StreamErrorPayload {
  code: string;
  message: string;
}

export interface OverwhelmRequest {
  concept: string;
  materials?: string;
  probeSummary: string;
  mode?: LearnMode;
}

export interface OverwhelmDecision {
  shouldRetreat: boolean;
  reason: string;
  suggestedConcept: string;
}

/**
 * POST /prereqTree 요청. 개념이 너무 어려울 때 다단계 선행 개념 트리(이름 지도)를 생성한다.
 *
 * stage 로 두 가지 의미를 분리한다:
 * - "probe"(기본): 본개념을 배우기 전에 알아야 할 선수지식. probeSummary 만 함께 쓴다.
 * - "learn": 선택된 로드맵 단계가 (이 사용자 수준에) 너무 어려울 때 그 단계를 이해하기 위한 선행.
 *   level/roadmapTitles/currentStepTitle 를 함께 주고, 로드맵에 이미 있는 개념은 제외한다.
 */
export interface PrereqTreeRequest {
  concept: string;
  materials?: string;
  probeSummary?: string;
  mode?: LearnMode;
  /** 선행의 의미를 가르는 단계. 누락 시 "probe" 로 취급. */
  stage?: "probe" | "learn";
  /** learn 단계: 사용자 추정 수준(0=입문 ~ 3=능숙). */
  level?: number;
  /** learn 단계: 전체 로드맵 단계 제목 목록(이미 다루는 개념을 선행에서 제외하는 근거). */
  roadmapTitles?: string[];
  /** learn 단계: 선택된(현재) 로드맵 단계 제목. 선행은 이 단계 한 점을 위한 디딤돌만. */
  currentStepTitle?: string;
  /** learn 단계: probe 단계에서 만든 본개념 선행 개념명(평탄화). 중복 분석을 줄여 토큰 절감. */
  probePrereqConcepts?: string[];
}

/** 선행 개념 트리 노드. children 으로 '선행의 선행'을 표현한다(서버는 최대 3단계로 제한). */
export interface PrereqNode {
  /** 선행 개념 이름. 설명이 아니라 그대로 학습 주제로 쓸 한 줄. */
  concept: string;
  /** 왜 이것이 선행인지 1문장. */
  reason: string;
  /** 더 깊은 선행 개념들. 가장 깊은 노드는 빈 배열. */
  children: PrereqNode[];
}

/** POST /prereqTree 응답. prerequisites 가 비면 선행 학습이 불필요하다는 뜻. */
export interface PrereqTreeResponse {
  prerequisites: PrereqNode[];
}

/**
 * 답변 모드. 학습 강도(질문 난이도·분기·채점·설명 깊이)를 정한다. frontend ANSWER_MODES id 와 동일.
 * "test" 는 빠른 점검용 축소 모드로, testModeUsers 자격 계정에만 입력창 드롭다운에 노출되고
 * 서버도 isTestMode(uid) 로 게이트한다(자격 없는 uid 가 보내면 무시되고 일반 모드로 처리).
 */
export type LearnMode = "light" | "socratic" | "deep" | "test";

/** GET /testEligible 응답. uid 가 testModeUsers 컬렉션에 있으면 eligible=true. */
export interface TestEligibleResponse {
  eligible: boolean;
}

export interface ProbeRequest {
  concept: string;
  materials?: string;
  mode?: LearnMode;
}

export interface OutlineRequest {
  concept: string;
  level: number;
  mode?: LearnMode;
}

export interface StepDetailRequest {
  concept: string;
  level: number;
  outline: { title: string; desc: string }[];
  stepIdx: number;
  mode?: LearnMode;
}

export interface AnswerEvalRequest {
  concept: string;
  level: number;
  stepTitle: string;
  stepDesc: string;
  stepBody: string;
  questions: { id: string; q: string; answer: string }[];
  mode?: LearnMode;
}

export interface BranchEvalRequest {
  concept: string;
  level: number;
  stepTitle: string;
  stepDesc: string;
  stepBody: string;
  questions: { id: string; q: string; answer: string }[];
  roadmapOutlineText: string;
}

/** 질문하기 한 턴(이전 질문 + 그에 대한 산문 답변). 후속 질문 맥락 전달용. */
export interface AskTurn {
  question: string;
  answer: string;
}

/**
 * POST /askRoute 요청. learn 단계에서 학습자의 한 줄 질문에 "답변 + 안내"로 응답한다.
 * 답변은 항상 산문으로 생성하고(현재 개념/로드맵 범위 안), 필요 시 route 로 기존
 * 선행 트리(prereq)·보충 단계(newStep) 기계를 '안내'로 병행한다. 후속은 프론트가 최대 2회로 캡한다.
 */
export interface AskRouteRequest {
  question: string;
  concept: string;
  level?: number;
  currentStepTitle?: string;
  currentStepDesc?: string;
  /** 현재 단계 본문(이미 다루는 내용인지·답변 근거 판단용). 서버가 길이를 적당히 자른다. */
  stepBody?: string;
  roadmapTitles?: string[];
  mode?: LearnMode;
  /** 후속 질문용 직전 턴들(질문+답변). 프론트가 최대 2개(총 3턴)로 보낸다. */
  priorTurns?: AskTurn[];
}

/** POST /askRoute 응답. 답변(산문) + 안내(라우팅) 구조. */
export interface AskRouteResponse {
  /**
   * 흐름 안내(라우팅) 분류.
   * prereq=선행 개념 트리, newStep=보충 단계, none=별도 학습 불필요(답변으로 충분),
   * offtopic=현재 학습 범위 밖이라 답변하지 않고 복귀만 안내.
   */
  route: "prereq" | "newStep" | "none" | "offtopic";
  /** 학습자 질문에 대한 산문 답변(한국어). route=offtopic 이면 빈 문자열. */
  answer: string;
  /** 답변에 곁들이는 1-2문장 흐름 안내(이 단계와의 연결/다음 학습). offtopic 이면 복귀 안내. */
  message: string;
  /** route=newStep 일 때만 보충 단계 제안(title/desc). 본문/질문은 진입 시 기존 기계가 생성. 그 외엔 null. */
  suggestedStep: { title: string; desc: string } | null;
}

/**
 * POST /validateInput 요청. 자유 텍스트 입력(학습 주제 또는 질문) 한 덩어리를 검증한다.
 * 검증 로직은 호출 지점(Hero/Learn)과 무관하게 공통이다(무의미·장난·욕설·비학습성 차단).
 * 맥락 관련성(오프토픽)은 여기서 보지 않으며 기존 askRoute 가 담당한다.
 */
export interface ValidateInputRequest {
  text: string;
}

/** POST /validateInput 응답. valid=false 면 프론트가 우회 없는 차단 모달로 진행을 막는다. */
export interface ValidateInputResponse {
  valid: boolean;
}

import type { Stage, Step } from "../stages/data";
import type { SessionState } from "../state/sessionState";

export type BranchOptionType =
  | "roadmap_next"
  | "ai_recommended"
  | "additional"
  | "exit"
  // 클라이언트 주입 전용(LLM 미출력). 분기 다이얼로그에서 현재 단계를 다시 답변하기.
  | "reanswer";

export interface BranchOption {
  label: string;
  type: BranchOptionType;
  isRecommended: boolean;
  stageContent: Step | null;
}

export type BranchPhaseStage =
  | "idle"
  | "evaluating"
  | "awaiting_choice"
  | "merged"
  | "error";

export interface EvaluationResponse {
  evaluationText: string;
  isMerged: boolean;
  branchOptions: BranchOption[];
}

export interface ParseFailure {
  parseError: string;
}

export interface BranchPhaseState {
  stage: BranchPhaseStage;
  parseError: boolean;
  retryCount: number;
  lastErrorMessage: string | null;
}

// ── 학습 세션 Firestore 영속화 DTO ──
// 서버는 state 본문을 불투명 JSON 으로 저장하고 serverUpdatedAt 만 덧붙인다(병합은 클라이언트 코어가 수행).

/** POST /sessionSave 요청. state.sessionId 로 uid 격리 컬렉션에 upsert 한다. */
export interface SessionSaveRequest {
  state: SessionState;
}

/** 세션 목록 1건. 사이드바 렌더링용 경량 메타(본문 미포함). updatedAt 은 서버 수신 millis. */
export interface SessionIndexEntry {
  sessionId: string;
  conceptSummary: string;
  stage: Stage;
  updatedAt: number;
  /** 선행 개념 하위 세션이면 부모 세션 id(서버가 state 에서 평면화해 실어 보낸다). */
  parentSessionId?: string;
}

/** GET /sessionList 응답. updatedAt 내림차순 정렬된 메타 목록. */
export interface SessionListResponse {
  sessions: SessionIndexEntry[];
}

/** GET /sessionGet?id= 응답. 없으면 state=null. */
export interface SessionGetResponse {
  state: SessionState | null;
}

/** POST /sessionDelete 요청. uid 격리 컬렉션에서 해당 세션을 영구 삭제한다. */
export interface SessionDeleteRequest {
  sessionId: string;
}

// ── ready-made 로드맵 라이브러리 DTO ──
// 운영자가 시드 JSON 으로 적재해 모든 사용자에게 공개되는 준비된 학습 로드맵.
// steps/prereqTree 는 일반 세션과 동일한 구조(Step/PrereqNode)라, 시작 시 그대로 새 세션에 복사된다.

/** ready-made 로드맵 1건(전체 본문). Firestore readymadeRoadmaps/{roadmapId} 문서 형태와 동일. */
export interface ReadymadeRoadmap {
  /** 로드맵 고유 식별자(문서 ID). */
  roadmapId: string;
  /** 라이브러리/세션에 표시할 제목. */
  title: string;
  /** 라이브러리 목록용 짧은 설명. */
  summary: string;
  /** 학습 주제(예: "안드로이드"). 라이브러리에서 주제별 그룹의 기준. */
  subject: string;
  /** 로드맵 단계들. body/questions 가 채워진 완성 콘텐츠(일반 세션 steps 와 동일 구조). */
  steps: Step[];
  /** 선행 개념 트리. 시작 시 새 세션의 prereqTree 로 복사된다. */
  prereqTree: PrereqNode[];
  /** 시드 콘텐츠 버전(적재/갱신 추적용). */
  version: number;
}

/** 라이브러리/로드맵 패널 목록 1건(경량 메타, 본문 미포함). 카드/행 렌더링용. */
export interface ReadymadeRoadmapListEntry {
  roadmapId: string;
  title: string;
  summary: string;
  subject: string;
  /** 단계 수(카드 메타 "N단계"). */
  stepCount: number;
  /** 선행 개념 트리 보유 여부(카드 메타 "선행 개념 포함"). */
  hasPrereq: boolean;
  /** 단계 제목 목록(메인 화면 로드맵 행의 칩). 본문은 제외한 제목만. */
  stepTitles: string[];
}

/** GET /readymadeRoadmapList 응답. subject→title 순 정렬된 경량 메타 목록. */
export interface ReadymadeRoadmapListResponse {
  roadmaps: ReadymadeRoadmapListEntry[];
}

/** GET /readymadeRoadmapGet?id= 응답. 없으면 roadmap=null. */
export interface ReadymadeRoadmapGetResponse {
  roadmap: ReadymadeRoadmap | null;
}

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8081";
