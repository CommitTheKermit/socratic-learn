import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { CLAUDE_MODEL, getClaudeClient } from "./claudeClient";
import {
  EVAL_SYSTEM,
  OUTLINE_SYSTEM,
  PROBE_SYSTEM,
  STEP_DETAIL_SYSTEM,
  evalUserMessage,
  outlineUserMessage,
  probeUserMessage,
  stepDetailUserMessage,
} from "./prompts";
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

const probeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["p1", "p2", "p3"],
  properties: {
    p1: {
      type: "object",
      additionalProperties: false,
      required: ["id", "kind", "q", "options"],
      properties: {
        id: { type: "string", const: "p1" },
        kind: { type: "string", const: "choice" },
        q: { type: "string", description: "개념에 대한 친숙도를 묻는 한국어 질문" },
        options: {
          type: "array",
          minItems: 4,
          maxItems: 4,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["value", "label"],
            properties: {
              value: { type: "integer", minimum: 0, maximum: 3 },
              label: { type: "string" },
            },
          },
        },
      },
    },
    p2: {
      type: "object",
      additionalProperties: false,
      required: ["id", "kind", "q", "sub", "options"],
      properties: {
        id: { type: "string", const: "p2" },
        kind: { type: "string", const: "multi" },
        q: { type: "string" },
        sub: { type: "string" },
        options: {
          type: "array",
          minItems: 6,
          maxItems: 6,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["value", "label", "correct"],
            properties: {
              value: { type: "string" },
              label: { type: "string" },
              correct: { type: "boolean" },
            },
          },
        },
      },
    },
    p3: {
      type: "object",
      additionalProperties: false,
      required: ["id", "kind", "q", "placeholder"],
      properties: {
        id: { type: "string", const: "p3" },
        kind: { type: "string", const: "text" },
        q: { type: "string" },
        placeholder: { type: "string" },
      },
    },
  },
} as const;

export async function generateProbeQuestions(concept: string): Promise<ProbeQuestion[]> {
  let client: Anthropic;
  try {
    client = getClaudeClient();
  } catch (e) {
    throw new ClaudeContentError("MISSING_CLAUDE_API_KEY", (e as Error).message);
  }
  let parsed: { p1: ProbeQuestion; p2: ProbeQuestion; p3: ProbeQuestion } | undefined;
  try {
    const resp = await client.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      thinking: { type: "adaptive" },
      system: [{ type: "text", text: PROBE_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: probeUserMessage(concept),
        },
      ],
      output_config: { format: jsonSchemaOutputFormat(probeSchema) },
    });
    parsed = resp.parsed_output as typeof parsed;
  } catch (e) {
    throw mapAnthropicError(e);
  }
  if (!parsed?.p1 || !parsed?.p2 || !parsed?.p3) {
    throw new ClaudeContentError("INVALID_RESPONSE", "진단 질문 응답이 비어 있습니다.");
  }
  return [parsed.p1, parsed.p2, parsed.p3];
}

const outlineSchema = {
  type: "object",
  additionalProperties: false,
  required: ["steps"],
  properties: {
    steps: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "desc"],
        properties: {
          title: { type: "string", description: "단계 제목 (8-16자)" },
          desc: { type: "string", description: "한 줄 부제 (20자 내외)" },
        },
      },
    },
  },
} as const;

export interface RoadmapOutlineItem {
  title: string;
  desc: string;
}

export async function generateRoadmapOutline(
  concept: string,
  level: number,
): Promise<RoadmapOutlineItem[]> {
  let client: Anthropic;
  try {
    client = getClaudeClient();
  } catch (e) {
    throw new ClaudeContentError("MISSING_CLAUDE_API_KEY", (e as Error).message);
  }
  let parsed: { steps: RoadmapOutlineItem[] } | undefined;
  try {
    const resp = await client.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      system: [{ type: "text", text: OUTLINE_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: outlineUserMessage(concept, level),
        },
      ],
      output_config: { format: jsonSchemaOutputFormat(outlineSchema) },
    });
    parsed = resp.parsed_output as typeof parsed;
  } catch (e) {
    throw mapAnthropicError(e);
  }
  if (!parsed?.steps?.length) {
    throw new ClaudeContentError("INVALID_RESPONSE", "로드맵 응답이 비어 있습니다.");
  }
  return parsed.steps;
}

const stepDetailSchema = {
  type: "object",
  additionalProperties: false,
  required: ["body", "questions"],
  properties: {
    body: {
      type: "string",
      description:
        "본문 2-4문단. **굵게**, *기울임*, `인라인 코드`, 트리플 백틱 코드블록 허용. 헤더(#)/순서·글머리 리스트 금지. 비교가 필요하면 마크다운 비교표 또는 트리플 백틱 ASCII 다이어그램을 1회 허용. 마지막 줄에 \"아는 만큼만 짧게 써도 OK. 모르면 '모르겠어요' 라고 적어도 됩니다.\" 포함.",
    },
    questions: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "q"],
        properties: {
          id: { type: "string", description: "단계번호-순번 형식 (예: 1-1)" },
          q: { type: "string" },
        },
      },
    },
  },
} as const;

export interface StepDetail {
  body: string;
  questions: Step["questions"];
}

export async function generateStepDetail(
  concept: string,
  level: number,
  outline: RoadmapOutlineItem[],
  stepIdx: number,
): Promise<StepDetail> {
  let client: Anthropic;
  try {
    client = getClaudeClient();
  } catch (e) {
    throw new ClaudeContentError("MISSING_CLAUDE_API_KEY", (e as Error).message);
  }
  const cur = outline[stepIdx];
  if (!cur) throw new ClaudeContentError("INVALID_RESPONSE", "단계 정보가 없습니다.");
  const outlineText = outline
    .map((s, i) => `${i + 1}. ${s.title} - ${s.desc}${i === stepIdx ? "  ← (이번 단계)" : ""}`)
    .join("\n");
  let parsed: StepDetail | undefined;
  try {
    const resp = await client.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 2500,
      thinking: { type: "adaptive" },
      system: [{ type: "text", text: STEP_DETAIL_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: stepDetailUserMessage(
            concept,
            level,
            outlineText,
            stepIdx + 1,
            cur.title,
            cur.desc,
          ),
        },
      ],
      output_config: { format: jsonSchemaOutputFormat(stepDetailSchema) },
    });
    parsed = resp.parsed_output as StepDetail;
  } catch (e) {
    throw mapAnthropicError(e);
  }
  if (!parsed?.body || !parsed?.questions?.length) {
    throw new ClaudeContentError("INVALID_RESPONSE", "단계 상세 응답이 비어 있습니다.");
  }
  return parsed;
}

export type Grade = "correct" | "almost" | "partial" | "wrong";

export interface EvaluationItem {
  id: string;
  grade: Grade;
  feedback: string;
}

export interface EvaluationSummary {
  overallComment: string;
  nextFocus: string[];
}

export interface StepEvaluation {
  evaluations: EvaluationItem[];
  summary: EvaluationSummary;
}

const evalSchema = {
  type: "object",
  additionalProperties: false,
  required: ["evaluations", "summary"],
  properties: {
    evaluations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "grade", "feedback"],
        properties: {
          id: { type: "string" },
          grade: { type: "string", enum: ["correct", "almost", "partial", "wrong"] },
          feedback: {
            type: "string",
            description:
              "1-2 문장 한국어 피드백. 어디가 어긋났는지 구체적으로 + 정확한 한 줄 교정. wrong 인 경우 '정반대로 이해하셨네요...' 식으로 명시적 교정. 이모지 사용 금지.",
          },
        },
      },
    },
    summary: {
      type: "object",
      additionalProperties: false,
      required: ["overallComment", "nextFocus"],
      properties: {
        overallComment: {
          type: "string",
          description: "1-2문장. 잘 잡은 점/가장 위험한 오해 중심의 종합 평가. 칭찬으로 끝내지 말 것.",
        },
        nextFocus: {
          type: "array",
          minItems: 1,
          maxItems: 3,
          items: {
            type: "string",
            description: "다음 사이클에서 우선 보강할 항목. 구체적인 짧은 구절. 일반론('더 공부') 금지.",
          },
        },
      },
    },
  },
} as const;

export interface EvalQuestionInput {
  id: string;
  q: string;
  answer: string;
}

export async function generateAnswerEvaluation(
  concept: string,
  level: number,
  stepTitle: string,
  stepDesc: string,
  stepBody: string,
  questions: EvalQuestionInput[],
): Promise<StepEvaluation> {
  let client: Anthropic;
  try {
    client = getClaudeClient();
  } catch (e) {
    throw new ClaudeContentError("MISSING_CLAUDE_API_KEY", (e as Error).message);
  }
  if (questions.length === 0) {
    return { evaluations: [], summary: { overallComment: "", nextFocus: [] } };
  }
  const qaText = questions
    .map((q) => `- id: ${q.id}\n  질문: ${q.q}\n  사용자 답변: ${q.answer || "(빈 답변)"}`)
    .join("\n");
  let parsed: StepEvaluation | undefined;
  try {
    const resp = await client.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      thinking: { type: "adaptive" },
      system: [{ type: "text", text: EVAL_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: evalUserMessage(concept, level, stepTitle, stepDesc, stepBody, qaText),
        },
      ],
      output_config: { format: jsonSchemaOutputFormat(evalSchema) },
    });
    parsed = resp.parsed_output as StepEvaluation;
  } catch (e) {
    throw mapAnthropicError(e);
  }
  if (!parsed?.evaluations) {
    throw new ClaudeContentError("INVALID_RESPONSE", "평가 응답이 비어 있습니다.");
  }
  return parsed;
}
