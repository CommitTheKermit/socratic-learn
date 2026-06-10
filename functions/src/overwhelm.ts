import { onRequest } from "firebase-functions/v2/https";
import { requireAuth, recordUsage, isTestMode } from "./auth";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { OVERWHELM_SYSTEM, overwhelmUserMessage } from "./prompts";

// Secret Manager 로 주입되는 Anthropic 키. 브라우저에는 절대 노출되지 않는다.
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const CLAUDE_MODEL = "claude-sonnet-4-6";

// frontend/src/api/claudeContent.ts 의 overwhelmSchema 를 그대로 옮겨온 것.
const overwhelmSchema = {
  type: "object",
  additionalProperties: false,
  required: ["shouldRetreat", "reason", "suggestedConcept"],
  properties: {
    shouldRetreat: { type: "boolean" },
    reason: { type: "string", description: "1-2문장 한국어. 왜 후퇴를 권하는지 또는 왜 계속해도 되는지." },
    suggestedConcept: {
      type: "string",
      description: "shouldRetreat=true 일 때 한 단계 더 쉬운 선행 개념. false 이면 빈 문자열.",
    },
  },
} as const;

interface OverwhelmDecision {
  shouldRetreat: boolean;
  reason: string;
  suggestedConcept: string;
}

export const overwhelm = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "POST only" });
      return;
    }

    const uid = await requireAuth(req, res);
    if (!uid) return;
    recordUsage(uid, "overwhelm");

    const testMode = await isTestMode(uid);

    const { concept, materials, probeSummary } = (req.body ?? {}) as {
      concept?: string;
      materials?: string;
      probeSummary?: string;
    };

    if (!concept || typeof probeSummary !== "string") {
      res.status(400).json({ code: "INVALID_REQUEST", message: "concept 와 probeSummary 가 필요합니다." });
      return;
    }

    // 테스트 모드: LLM 호출 없이 즉시 shouldRetreat=false 반환
    if (testMode) {
      res.json({ shouldRetreat: false, reason: "테스트 모드: 후퇴 판단 생략", suggestedConcept: "" });
      return;
    }

    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
      const resp = await client.messages.parse({
        model: CLAUDE_MODEL,
        max_tokens: 1500,
        system: [{ type: "text", text: OVERWHELM_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: overwhelmUserMessage(concept, materials, probeSummary) }],
        output_config: { format: jsonSchemaOutputFormat(overwhelmSchema) },
      });
      const parsed = resp.parsed_output as OverwhelmDecision | undefined;
      if (!parsed) {
        res.status(502).json({ code: "INVALID_RESPONSE", message: "후퇴 판단 응답이 비어 있습니다." });
        return;
      }
      res.json(parsed);
    } catch (e) {
      logger.error("overwhelm function failed", e);
      const status = e instanceof Anthropic.APIError ? e.status ?? 502 : 500;
      res.status(status).json({
        code: "CLAUDE_API_ERROR",
        message: e instanceof Error ? e.message : "알 수 없는 오류",
      });
    }
  },
);
