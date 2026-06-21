import { onRequest } from "firebase-functions/v2/https";
import { requireAuth, recordUsage, isTestMode } from "./auth";
import { checkRateLimit, rateLimitMessage } from "./rateLimit";
import { CORS_ORIGINS } from "./cors";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { logUsage } from "./usageLog";
import { ASK_ROUTE_SYSTEM, askRouteUserMessage } from "./prompts";

// Secret Manager 로 주입되는 Anthropic 키. 브라우저에는 절대 노출되지 않는다.
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const CLAUDE_MODEL = "claude-sonnet-4-6";

// 보충 단계 제안. route=newStep 일 때만 객체, 그 외엔 null(anyOf). body/questions 는 만들지 않는다:
// 학습자가 진입하면 프론트 loadStepDetail(stepDetailStream)이 lazy 생성하므로(분기 단계와 동일),
// 여기서 만들면 그대로 폐기되는 출력 토큰일 뿐이다.
const suggestedStepSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "desc"],
  properties: {
    title: { type: "string", description: "보충 단계 제목(한 줄, 그대로 학습 주제로 쓸 제목)." },
    desc: { type: "string", description: "보충 단계 한 줄 부제." },
  },
} as const;

// learn 단계 '질문하기' 라우터의 구조화 출력. 분류 전용이라 본문/질문은 만들지 않는다.
const askRouteSchema = {
  type: "object",
  additionalProperties: false,
  required: ["route", "message", "suggestedStep"],
  properties: {
    route: {
      type: "string",
      enum: ["prereq", "newStep", "none"],
      description: "질문 분류. prereq=선행 개념, newStep=보충 단계, none=별도 학습 불필요.",
    },
    message: { type: "string", description: "학습자에게 보여줄 1-2문장 한국어 안내(이모지 금지)." },
    suggestedStep: { anyOf: [suggestedStepSchema, { type: "null" }] },
  },
} as const;

interface AskRouteResult {
  route: "prereq" | "newStep" | "none";
  message: string;
  suggestedStep: { title: string; desc: string } | null;
}

export const askRoute = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: CORS_ORIGINS, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "POST only" });
      return;
    }

    const uid = await requireAuth(req, res);
    if (!uid) return;
    recordUsage(uid, "askRoute");

    const rl = await checkRateLimit(uid);
    if (!rl.allowed) {
      res.status(429).json({ code: "RATE_LIMITED", message: rateLimitMessage(rl.reason!) });
      return;
    }

    const {
      question,
      concept,
      level,
      currentStepTitle,
      currentStepDesc,
      stepBody,
      roadmapTitles,
      mode,
    } = (req.body ?? {}) as {
      question?: string;
      concept?: string;
      level?: number;
      currentStepTitle?: string;
      currentStepDesc?: string;
      stepBody?: string;
      roadmapTitles?: string[];
      mode?: string;
    };

    if (!question || !concept) {
      res.status(400).json({ code: "INVALID_REQUEST", message: "question, concept 가 필요합니다." });
      return;
    }

    // 테스트 모드(자격 계정 한정): LLM 호출 없이 안내만.
    const testMode = mode === "test" && (await isTestMode(uid));
    if (testMode) {
      res.json({
        route: "none",
        message: "테스트 모드에서는 질문 분류를 사용할 수 없어요.",
        suggestedStep: null,
      });
      return;
    }

    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
      const resp = await client.messages.parse({
        model: CLAUDE_MODEL,
        max_tokens: 700,
        system: [{ type: "text", text: ASK_ROUTE_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [
          {
            role: "user",
            content: askRouteUserMessage(
              question,
              concept,
              level,
              currentStepTitle,
              currentStepDesc,
              stepBody,
              roadmapTitles,
            ),
          },
        ],
        output_config: { format: jsonSchemaOutputFormat(askRouteSchema) },
      });
      logUsage("askRoute", CLAUDE_MODEL, resp.usage);
      const parsed = resp.parsed_output as AskRouteResult | undefined;
      if (!parsed?.route) {
        res.status(502).json({ code: "INVALID_RESPONSE", message: "질문 분류 응답이 비어 있습니다." });
        return;
      }
      // newStep 이 아니면 suggestedStep 은 무시(null 강제)해 계약을 단순화한다.
      res.json({
        route: parsed.route,
        message: parsed.message ?? "",
        suggestedStep: parsed.route === "newStep" ? parsed.suggestedStep ?? null : null,
      });
    } catch (e) {
      logger.error("askRoute function failed", e);
      const status = e instanceof Anthropic.APIError ? e.status ?? 502 : 500;
      res.status(status).json({
        code: "CLAUDE_API_ERROR",
        message: e instanceof Error ? e.message : "알 수 없는 오류",
      });
    }
  },
);
