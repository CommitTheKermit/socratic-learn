import { onRequest } from "firebase-functions/v2/https";
import { requireAuth, recordUsage } from "./auth";
import { checkRateLimit, rateLimitMessage } from "./rateLimit";
import { CORS_ORIGINS } from "./cors";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { VALIDATE_INPUT_SYSTEM, validateInputUserMessage } from "./prompts";
import { logUsage } from "./usageLog";

// Secret Manager 로 주입되는 Anthropic 키. 브라우저에는 절대 노출되지 않는다.
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

// 학습 콘텐츠용 Sonnet 과 분리된, 값싼 사전 검증 전용 모델.
const CLAUDE_MODEL = "claude-haiku-4-5";

// 자유 텍스트가 "학습에 쓸 수 있는 진지한 입력"인지 판정. kind 는 서버 내부 분류이며 응답엔 포함하지 않는다.
const validateSchema = {
  type: "object",
  additionalProperties: false,
  required: ["valid", "kind"],
  properties: {
    valid: {
      type: "boolean",
      description: "학습에 사용 가능한 입력이면 true. 애매하면 true(거짓 차단 회피).",
    },
    kind: {
      type: "string",
      enum: ["ok", "gibberish", "abusive", "non_learning"],
      description: "내부 분류. ok=적합, 그 외는 부적합 사유.",
    },
  },
} as const;

interface ValidateResult {
  valid: boolean;
  kind: "ok" | "gibberish" | "abusive" | "non_learning";
}

export const validateInput = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: CORS_ORIGINS, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "POST only" });
      return;
    }

    const uid = await requireAuth(req, res);
    if (!uid) return;
    recordUsage(uid, "validateInput");

    const rl = await checkRateLimit(uid);
    if (!rl.allowed) {
      res.status(429).json({ code: "RATE_LIMITED", message: rateLimitMessage(rl.reason!) });
      return;
    }

    const { text } = (req.body ?? {}) as { text?: string };

    if (!text || typeof text !== "string") {
      res.status(400).json({ code: "INVALID_REQUEST", message: "text 가 필요합니다." });
      return;
    }

    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
      const resp = await client.messages.parse({
        model: CLAUDE_MODEL,
        max_tokens: 128,
        system: [{ type: "text", text: VALIDATE_INPUT_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: validateInputUserMessage(text) }],
        output_config: { format: jsonSchemaOutputFormat(validateSchema) },
      });
      logUsage("validateInput", CLAUDE_MODEL, resp.usage);
      const parsed = resp.parsed_output as ValidateResult | undefined;
      if (parsed == null || typeof parsed.valid !== "boolean") {
        res.status(502).json({ code: "INVALID_RESPONSE", message: "검증 응답이 비어 있습니다." });
        return;
      }
      // kind 는 내부 분류이므로 응답에 싣지 않는다(계약: { valid }).
      res.json({ valid: parsed.valid });
    } catch (e) {
      logger.error("validateInput function failed", e);
      const status = e instanceof Anthropic.APIError ? e.status ?? 502 : 500;
      res.status(status).json({
        code: "CLAUDE_API_ERROR",
        message: e instanceof Error ? e.message : "알 수 없는 오류",
      });
    }
  },
);
