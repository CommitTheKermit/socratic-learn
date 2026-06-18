import { onRequest } from "firebase-functions/v2/https";
import { requireAuth, recordUsage } from "./auth";
import { checkRateLimit, rateLimitMessage } from "./rateLimit";
import { CORS_ORIGINS } from "./cors";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { EVAL_SYSTEM, evalUserMessage } from "./prompts";
import { logUsage } from "./usageLog";

// Secret Manager 로 주입되는 Anthropic 키. 브라우저에는 절대 노출되지 않는다.
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const CLAUDE_MODEL = "claude-sonnet-4-6";

// frontend/src/api/claudeContent.ts 의 evalSchema 를 그대로 옮겨온 것.
const evalSchema = {
  type: "object",
  additionalProperties: false,
  required: ["evaluations"],
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
  },
} as const;

interface EvalQuestionInput {
  id: string;
  q: string;
  answer: string;
}

interface StepEvaluation {
  evaluations: { id: string; grade: string; feedback: string }[];
}

export const answerEval = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: CORS_ORIGINS, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "POST only" });
      return;
    }

    const uid = await requireAuth(req, res);
    if (!uid) return;
    recordUsage(uid, "answerEval");

    const rl = await checkRateLimit(uid);
    if (!rl.allowed) {
      res.status(429).json({ code: "RATE_LIMITED", message: rateLimitMessage(rl.reason!) });
      return;
    }

    const { concept, level, stepTitle, stepDesc, stepBody, questions, mode } = (req.body ?? {}) as {
      concept?: string;
      level?: number;
      stepTitle?: string;
      stepDesc?: string;
      stepBody?: string;
      questions?: EvalQuestionInput[];
      mode?: string;
    };

    if (
      !concept ||
      typeof level !== "number" ||
      typeof stepTitle !== "string" ||
      typeof stepDesc !== "string" ||
      typeof stepBody !== "string" ||
      !Array.isArray(questions)
    ) {
      res.status(400).json({
        code: "INVALID_REQUEST",
        message: "concept, level, stepTitle, stepDesc, stepBody, questions 가 필요합니다.",
      });
      return;
    }

    // 질문이 없으면 빈 평가를 그대로 반환(프론트 generateAnswerEvaluation 동작과 동일).
    if (questions.length === 0) {
      res.json({ evaluations: [] });
      return;
    }

    const qaText = questions
      .map((q) => `- id: ${q.id}\n  질문: ${q.q}\n  사용자 답변: ${q.answer || "(빈 답변)"}`)
      .join("\n");

    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
      const resp = await client.messages.parse({
        model: CLAUDE_MODEL,
        max_tokens: 3000,
        system: [{ type: "text", text: EVAL_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [
          {
            role: "user",
            content: evalUserMessage(concept, level, stepTitle, stepDesc, stepBody, qaText, mode),
          },
        ],
        output_config: { format: jsonSchemaOutputFormat(evalSchema) },
      });
      logUsage("answerEval", CLAUDE_MODEL, resp.usage);
      const parsed = resp.parsed_output as StepEvaluation | undefined;
      if (!parsed?.evaluations) {
        res.status(502).json({ code: "INVALID_RESPONSE", message: "평가 응답이 비어 있습니다." });
        return;
      }
      res.json(parsed);
    } catch (e) {
      logger.error("answerEval function failed", e);
      const status = e instanceof Anthropic.APIError ? e.status ?? 502 : 500;
      res.status(status).json({
        code: "CLAUDE_API_ERROR",
        message: e instanceof Error ? e.message : "알 수 없는 오류",
      });
    }
  },
);
