import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { CLAUDE_MODEL, getClaudeClient } from "./claudeClient";
import { buildBranchEvaluationPrompt } from "./prompts";
import { parseEvaluationJson } from "./answers";
import { API_BASE_URL, ApiPaths } from "./contract";
import type { EvaluationResponse, OverwhelmDecision, ParseFailure } from "./contract";
import type { ProbeQuestion, Step } from "../stages/data";

export class ClaudeContentError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function mapAnthropicError(e: unknown): ClaudeContentError {
  if (e instanceof Anthropic.AuthenticationError) {
    return new ClaudeContentError(
      "MISSING_CLAUDE_API_KEY",
      "Claude API 키가 유효하지 않습니다. .env.local 의 VITE_ANTHROPIC_API_KEY 를 확인하세요.",
    );
  }
  if (e instanceof Anthropic.RateLimitError) {
    return new ClaudeContentError(
      "CLAUDE_API_ERROR",
      "Claude API 호출 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }
  if (e instanceof Anthropic.APIError) {
    return new ClaudeContentError(
      "CLAUDE_API_ERROR",
      `Claude API 오류 (${e.status}): ${e.message}`,
    );
  }
  return new ClaudeContentError("INTERNAL_ERROR", (e as Error)?.message ?? "알 수 없는 오류");
}

// Firebase Functions(probe) 로 이전됨. 브라우저는 더 이상 Anthropic 을 직접 호출하지 않는다.
export async function generateProbeQuestions(
  concept: string,
  materials?: string,
): Promise<ProbeQuestion[]> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${ApiPaths.PROBE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concept, materials }),
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
): Promise<OverwhelmDecision> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${ApiPaths.OVERWHELM}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concept, materials, probeSummary }),
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

export interface RoadmapOutlineItem {
  title: string;
  desc: string;
}

// Firebase Functions(outline) 로 이전됨. 브라우저는 더 이상 Anthropic 을 직접 호출하지 않는다.
export async function generateRoadmapOutline(
  concept: string,
  level: number,
): Promise<RoadmapOutlineItem[]> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${ApiPaths.OUTLINE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concept, level }),
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
): Promise<StepDetail> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${ApiPaths.STEP_DETAIL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concept, level, outline, stepIdx }),
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
): Promise<StepEvaluation> {
  if (questions.length === 0) {
    return { evaluations: [] };
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${ApiPaths.ANSWER_EVAL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concept, level, stepTitle, stepDesc, stepBody, questions }),
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
export async function generateBranchEvaluation(
  concept: string,
  level: number,
  stepTitle: string,
  stepDesc: string,
  stepBody: string,
  questions: EvalQuestionInput[],
  roadmapOutlineText: string,
): Promise<EvaluationResponse | ParseFailure> {
  let client: Anthropic;
  try {
    client = getClaudeClient();
  } catch (e) {
    throw new ClaudeContentError("MISSING_CLAUDE_API_KEY", (e as Error).message);
  }
  const qaText = questions
    .map((q) => `- id: ${q.id}\n  질문: ${q.q}\n  사용자 답변: ${q.answer || "(빈 답변)"}`)
    .join("\n");
  const { system, user } = buildBranchEvaluationPrompt({
    concept,
    level,
    stepTitle,
    stepDesc,
    stepBody,
    qaText,
    roadmapOutlineText,
  });
  let rawText = "";
  try {
    const resp = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 3000,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: user }],
    });
    const block = resp.content.find((b) => b.type === "text");
    rawText = block && "text" in block ? block.text : "";
  } catch (e) {
    throw mapAnthropicError(e);
  }
  if (!rawText.trim()) {
    return { parseError: "응답이 비어 있습니다" };
  }
  return parseEvaluationJson(rawText);
}
