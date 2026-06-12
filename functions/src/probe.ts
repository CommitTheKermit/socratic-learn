import { onRequest } from "firebase-functions/v2/https";
import { requireAuth, recordUsage, isTestMode } from "./auth";
import { checkRateLimit, rateLimitMessage } from "./rateLimit";
import { CORS_ORIGINS } from "./cors";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import Anthropic from "@anthropic-ai/sdk";
import { parseStructured } from "./llm";
import { PROBE_SYSTEM, probeUserMessage } from "./prompts";

// Secret Manager 로 주입되는 Anthropic 키. 브라우저에는 절대 노출되지 않는다.
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const CLAUDE_MODEL = "claude-sonnet-4-6";

// frontend/src/api/claudeContent.ts 의 probeSchema 를 그대로 옮겨온 것.
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

interface ProbeQuestions {
  p1: unknown;
  p2: unknown;
  p3: unknown;
}

export const probe = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: CORS_ORIGINS, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "POST only" });
      return;
    }

    const uid = await requireAuth(req, res);
    if (!uid) return;
    recordUsage(uid, "probe");

    const rl = await checkRateLimit(uid);
    if (!rl.allowed) {
      res.status(429).json({ code: "RATE_LIMITED", message: rateLimitMessage(rl.reason!) });
      return;
    }

    const testMode = await isTestMode(uid);

    const { concept, materials, mode } = (req.body ?? {}) as {
      concept?: string;
      materials?: string;
      mode?: string;
    };

    if (!concept) {
      res.status(400).json({ code: "INVALID_REQUEST", message: "concept 가 필요합니다." });
      return;
    }

    try {
      const parsed = (await parseStructured({
        apiKey: ANTHROPIC_API_KEY.value(),
        model: CLAUDE_MODEL,
        maxTokens: 3000,
        system: PROBE_SYSTEM,
        user: probeUserMessage(concept, materials, mode),
        schema: probeSchema,
      })) as ProbeQuestions | undefined;
      if (!parsed?.p1 || !parsed?.p2 || !parsed?.p3) {
        res.status(502).json({ code: "INVALID_RESPONSE", message: "진단 질문 응답이 비어 있습니다." });
        return;
      }
      // 테스트 모드: p1만 반환
      res.json(testMode ? [parsed.p1] : [parsed.p1, parsed.p2, parsed.p3]);
    } catch (e) {
      logger.error("probe function failed", e);
      const status = e instanceof Anthropic.APIError ? e.status ?? 502 : 500;
      res.status(status).json({
        code: "CLAUDE_API_ERROR",
        message: e instanceof Error ? e.message : "알 수 없는 오류",
      });
    }
  },
);
