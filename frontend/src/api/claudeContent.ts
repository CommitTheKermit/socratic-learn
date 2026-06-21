import { API_BASE_URL, ApiPaths } from "./contract";
import type {
  AskRouteRequest,
  AskRouteResponse,
  EvaluationResponse,
  OverwhelmDecision,
  ParseFailure,
  PrereqNode,
  PrereqTreeResponse,
} from "./contract";
import type { ProbeQuestion, Step } from "../stages/data";
import { authHeaders } from "./authHeaders";

export class ClaudeContentError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// Firebase Functions(probe) 로 이전됨. 브라우저는 더 이상 Anthropic 을 직접 호출하지 않는다.
export async function generateProbeQuestions(
  concept: string,
  materials?: string,
  mode?: string,
): Promise<ProbeQuestion[]> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${ApiPaths.PROBE}`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ concept, materials, mode }),
    });
  } catch (e) {
    throw new ClaudeContentError("CLAUDE_API_ERROR", (e as Error)?.message ?? "네트워크 오류");
  }
  if (!res.ok) {
    let code = "CLAUDE_API_ERROR";
    let message = `진단 질문 요청 실패: HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.code) code = body.code as string;
      if (body?.message) message = body.message as string;
    } catch {
      /* ignore */
    }
    throw new ClaudeContentError(code, message);
  }
  return (await res.json()) as ProbeQuestion[];
}

// OverwhelmDecision 은 contract.ts 로 이전됨. Probe.tsx 가 이 모듈에서 import 하므로 re-export 유지.
export type { OverwhelmDecision };

// Firebase Functions(overwhelm) 로 이전됨. 브라우저는 더 이상 Anthropic 을 직접 호출하지 않는다.
export async function detectOverwhelm(
  concept: string,
  materials: string | undefined,
  probeSummary: string,
  mode?: string,
): Promise<OverwhelmDecision> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${ApiPaths.OVERWHELM}`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ concept, materials, probeSummary, mode }),
    });
  } catch (e) {
    throw new ClaudeContentError("CLAUDE_API_ERROR", (e as Error)?.message ?? "네트워크 오류");
  }
  if (!res.ok) {
    let code = "CLAUDE_API_ERROR";
    let message = `후퇴 판단 요청 실패: HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.code) code = body.code as string;
      if (body?.message) message = body.message as string;
    } catch {
      /* ignore */
    }
    throw new ClaudeContentError(code, message);
  }
  return (await res.json()) as OverwhelmDecision;
}

// PrereqNode 는 contract.ts 로부터 re-export (선행 트리 UI 가 이 모듈에서 import).
export type { PrereqNode };

/**
 * 개념이 너무 어려울 때 다단계 선행 개념 트리(이름 지도)를 생성한다.
 * 반환은 목표 개념 바로 아래 선행들의 배열(각 노드는 children 으로 더 깊은 선행 보유).
 * 빈 배열이면 선행 학습이 불필요하다는 뜻.
 *
 * stage 로 의미가 갈린다(contract.PrereqTreeRequest 참고):
 * - "probe"(기본): 본개념 전 선수지식. probeSummary 와 함께.
 * - "learn": 선택된 로드맵 단계용 선행(level/roadmapTitles/currentStepTitle/probePrereqConcepts 동반).
 */
export async function generatePrereqTree(args: {
  concept: string;
  materials?: string;
  probeSummary?: string;
  mode?: string;
  stage?: "probe" | "learn";
  level?: number;
  roadmapTitles?: string[];
  currentStepTitle?: string;
  probePrereqConcepts?: string[];
}): Promise<PrereqNode[]> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${ApiPaths.PREREQ_TREE}`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(args),
    });
  } catch (e) {
    throw new ClaudeContentError("CLAUDE_API_ERROR", (e as Error)?.message ?? "네트워크 오류");
  }
  if (!res.ok) {
    let code = "CLAUDE_API_ERROR";
    let message = `선행 개념 트리 요청 실패: HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.code) code = body.code as string;
      if (body?.message) message = body.message as string;
    } catch {
      /* ignore */
    }
    throw new ClaudeContentError(code, message);
  }
  const body = (await res.json()) as PrereqTreeResponse;
  return body.prerequisites ?? [];
}

export interface RoadmapOutlineItem {
  title: string;
  desc: string;
}

// Firebase Functions(outline) 로 이전됨. 브라우저는 더 이상 Anthropic 을 직접 호출하지 않는다.
export async function generateRoadmapOutline(
  concept: string,
  level: number,
  mode?: string,
): Promise<RoadmapOutlineItem[]> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${ApiPaths.OUTLINE}`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ concept, level, mode }),
    });
  } catch (e) {
    throw new ClaudeContentError("CLAUDE_API_ERROR", (e as Error)?.message ?? "네트워크 오류");
  }
  if (!res.ok) {
    let code = "CLAUDE_API_ERROR";
    let message = `로드맵 요청 실패: HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.code) code = body.code as string;
      if (body?.message) message = body.message as string;
    } catch {
      /* ignore */
    }
    throw new ClaudeContentError(code, message);
  }
  return (await res.json()) as RoadmapOutlineItem[];
}

export interface StepDetail {
  body: string;
  questions: Step["questions"];
}

// Firebase Functions(stepDetail) 로 이전됨. 브라우저는 더 이상 Anthropic 을 직접 호출하지 않는다.
export async function generateStepDetail(
  concept: string,
  level: number,
  outline: RoadmapOutlineItem[],
  stepIdx: number,
  mode?: string,
): Promise<StepDetail> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${ApiPaths.STEP_DETAIL}`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ concept, level, outline, stepIdx, mode }),
    });
  } catch (e) {
    throw new ClaudeContentError("CLAUDE_API_ERROR", (e as Error)?.message ?? "네트워크 오류");
  }
  if (!res.ok) {
    let code = "CLAUDE_API_ERROR";
    let message = `단계 상세 요청 실패: HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.code) code = body.code as string;
      if (body?.message) message = body.message as string;
    } catch {
      /* ignore */
    }
    throw new ClaudeContentError(code, message);
  }
  return (await res.json()) as StepDetail;
}

export type Grade = "correct" | "almost" | "partial" | "wrong";

export interface EvaluationItem {
  id: string;
  grade: Grade;
  feedback: string;
}

export interface StepEvaluation {
  evaluations: EvaluationItem[];
}

export interface EvalQuestionInput {
  id: string;
  q: string;
  answer: string;
}

// Firebase Functions(answerEval) 로 이전됨. 브라우저는 더 이상 Anthropic 을 직접 호출하지 않는다.
export async function generateAnswerEvaluation(
  concept: string,
  level: number,
  stepTitle: string,
  stepDesc: string,
  stepBody: string,
  questions: EvalQuestionInput[],
  mode?: string,
): Promise<StepEvaluation> {
  if (questions.length === 0) {
    return { evaluations: [] };
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${ApiPaths.ANSWER_EVAL}`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ concept, level, stepTitle, stepDesc, stepBody, questions, mode }),
    });
  } catch (e) {
    throw new ClaudeContentError("CLAUDE_API_ERROR", (e as Error)?.message ?? "네트워크 오류");
  }
  if (!res.ok) {
    let code = "CLAUDE_API_ERROR";
    let message = `평가 요청 실패: HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.code) code = body.code as string;
      if (body?.message) message = body.message as string;
    } catch {
      /* ignore */
    }
    throw new ClaudeContentError(code, message);
  }
  return (await res.json()) as StepEvaluation;
}

/**
 * 평가 + 추천 + 동등성을 단일 JSON 으로 받는 분기 평가 호출.
 * 네트워크 성공 시: parseEvaluationJson 결과를 그대로 반환
 *   - 성공: EvaluationResponse
 *   - 스키마 위반: ParseFailure (parseError 필드)
 * 네트워크/API 오류 시: ClaudeContentError throw (재시도는 호출자가 결정).
 */
// Firebase Functions(branchEval) 로 이전됨. structured output(messages.parse)+branchSchema 로
// 서버가 EvaluationResponse 를 검증해 반환한다(기존 수기 parseEvaluationJson 역할 대체).
// 반환 계약(EvaluationResponse | ParseFailure)은 그대로 유지: 형식 해석 실패는 200+{parseError},
// 네트워크/API 오류는 throw.
export async function generateBranchEvaluation(
  concept: string,
  level: number,
  stepTitle: string,
  stepDesc: string,
  stepBody: string,
  questions: EvalQuestionInput[],
  roadmapOutlineText: string,
): Promise<EvaluationResponse | ParseFailure> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${ApiPaths.BRANCH_EVAL}`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        concept,
        level,
        stepTitle,
        stepDesc,
        stepBody,
        questions,
        roadmapOutlineText,
      }),
    });
  } catch (e) {
    throw new ClaudeContentError("CLAUDE_API_ERROR", (e as Error)?.message ?? "네트워크 오류");
  }
  if (!res.ok) {
    let code = "CLAUDE_API_ERROR";
    let message = `분기 평가 요청 실패: HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.code) code = body.code as string;
      if (body?.message) message = body.message as string;
    } catch {
      /* ignore */
    }
    throw new ClaudeContentError(code, message);
  }
  return (await res.json()) as EvaluationResponse | ParseFailure;
}

// AskRouteResponse 는 contract.ts 로부터 re-export (Learn UI 가 이 모듈에서 import).
export type { AskRouteResponse };

/**
 * learn 단계 '질문하기': 학습자의 한 줄 질문을 prereq | newStep | none 으로 분류한다(1회성).
 * 분류 결과에 따라 프론트가 기존 선행 트리/보충 단계 기계를 재사용한다(멀티턴 채팅 아님).
 */
export async function askLearnQuestion(args: AskRouteRequest): Promise<AskRouteResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${ApiPaths.ASK_ROUTE}`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(args),
    });
  } catch (e) {
    throw new ClaudeContentError("CLAUDE_API_ERROR", (e as Error)?.message ?? "네트워크 오류");
  }
  if (!res.ok) {
    let code = "CLAUDE_API_ERROR";
    let message = `질문 분류 요청 실패: HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.code) code = body.code as string;
      if (body?.message) message = body.message as string;
    } catch {
      /* ignore */
    }
    throw new ClaudeContentError(code, message);
  }
  return (await res.json()) as AskRouteResponse;
}
