import { onRequest } from "firebase-functions/v2/https";
import { requireAuth, recordUsage } from "./auth";
import { checkRateLimit, rateLimitMessage } from "./rateLimit";
import { CORS_ORIGINS } from "./cors";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { buildBranchEvaluationPrompt } from "./prompts";

// Secret Manager 로 주입되는 Anthropic 키. 브라우저에는 절대 노출되지 않는다.
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const CLAUDE_MODEL = "claude-sonnet-4-6";

// 분기 옵션이 품는 한 단계(Step) 구조. exit 옵션은 stageContent=null.
const stageContentSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "title", "desc", "body", "questions"],
  properties: {
    id: { type: "integer" },
    title: { type: "string" },
    desc: { type: "string" },
    body: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "q"],
        properties: {
          id: { type: "string" },
          q: { type: "string" },
        },
      },
    },
  },
} as const;

// 기존 수기 파서 parseEvaluationJson 가 검증하던 EvaluationResponse 계약을 structured output 으로 강제.
// stageContent 의 조건부(exit→null) 는 anyOf [object, null] 로 표현하고, "exit→null" 정합성은
// 프롬프트가 책임진다(schema 는 null 을 허용만 함).
const branchSchema = {
  type: "object",
  additionalProperties: false,
  required: ["evaluationText", "isMerged", "branchOptions"],
  properties: {
    evaluationText: { type: "string" },
    isMerged: { type: "boolean" },
    branchOptions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "type", "isRecommended", "stageContent"],
        properties: {
          label: { type: "string" },
          type: {
            type: "string",
            enum: ["roadmap_next", "ai_recommended", "additional", "exit"],
          },
          isRecommended: { type: "boolean" },
          stageContent: { anyOf: [stageContentSchema, { type: "null" }] },
        },
      },
    },
  },
} as const;

interface EvalQuestionInput {
  id: string;
  q: string;
  answer: string;
}

export const branchEval = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: CORS_ORIGINS, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "POST only" });
      return;
    }

    const uid = await requireAuth(req, res);
    if (!uid) return;
    recordUsage(uid, "branchEval");

    const rl = await checkRateLimit(uid);
    if (!rl.allowed) {
      res.status(429).json({ code: "RATE_LIMITED", message: rateLimitMessage(rl.reason!) });
      return;
    }

    const { concept, level, stepTitle, stepDesc, stepBody, questions, roadmapOutlineText } =
      (req.body ?? {}) as {
        concept?: string;
        level?: number;
        stepTitle?: string;
        stepDesc?: string;
        stepBody?: string;
        questions?: EvalQuestionInput[];
        roadmapOutlineText?: string;
      };

    if (
      !concept ||
      typeof level !== "number" ||
      typeof stepTitle !== "string" ||
      typeof stepDesc !== "string" ||
      typeof stepBody !== "string" ||
      !Array.isArray(questions) ||
      typeof roadmapOutlineText !== "string"
    ) {
      res.status(400).json({
        code: "INVALID_REQUEST",
        message:
          "concept, level, stepTitle, stepDesc, stepBody, questions, roadmapOutlineText 가 필요합니다.",
      });
      return;
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

    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
      const resp = await client.messages.parse({
        model: CLAUDE_MODEL,
        max_tokens: 3000,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: user }],
        output_config: { format: jsonSchemaOutputFormat(branchSchema) },
      });
      const parsed = resp.parsed_output;
      if (!parsed) {
        // 기존 ParseFailure 계약 유지: 형식 해석 실패는 200 + {parseError}.
        res.json({ parseError: "응답을 분기 형식으로 해석하지 못했습니다." });
        return;
      }
      res.json(parsed);
    } catch (e) {
      logger.error("branchEval function failed", e);
      const status = e instanceof Anthropic.APIError ? e.status ?? 502 : 500;
      res.status(status).json({
        code: "CLAUDE_API_ERROR",
        message: e instanceof Error ? e.message : "알 수 없는 오류",
      });
    }
  },
);
