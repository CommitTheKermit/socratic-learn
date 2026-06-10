import { onRequest } from "firebase-functions/v2/https";
import { requireAuth, recordUsage, isTestMode } from "./auth";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { OUTLINE_SYSTEM, outlineUserMessage } from "./prompts";

// Secret Manager 로 주입되는 Anthropic 키. 브라우저에는 절대 노출되지 않는다.
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const CLAUDE_MODEL = "claude-sonnet-4-6";

// frontend/src/api/claudeContent.ts 의 outlineSchema 를 그대로 옮겨온 것.
const outlineSchema = {
  type: "object",
  additionalProperties: false,
  required: ["steps"],
  properties: {
    steps: {
      type: "array",
      minItems: 4,
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

// 테스트 모드용: 2단계로 축소
const outlineSchemaTest = {
  type: "object",
  additionalProperties: false,
  required: ["steps"],
  properties: {
    steps: {
      type: "array",
      minItems: 2,
      maxItems: 2,
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

interface RoadmapOutlineItem {
  title: string;
  desc: string;
}

export const outline = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "POST only" });
      return;
    }

    const uid = await requireAuth(req, res);
    if (!uid) return;
    recordUsage(uid, "outline");

    const testMode = await isTestMode(uid);

    const { concept, level, mode } = (req.body ?? {}) as {
      concept?: string;
      level?: number;
      mode?: string;
    };

    if (!concept || typeof level !== "number") {
      res.status(400).json({ code: "INVALID_REQUEST", message: "concept 와 level 이 필요합니다." });
      return;
    }

    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
      const resp = await client.messages.parse({
        model: CLAUDE_MODEL,
        max_tokens: 3000,
        system: [{ type: "text", text: OUTLINE_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: outlineUserMessage(concept, level, mode) }],
        // 테스트 모드: 2단계 스키마로 LLM 호출
        output_config: { format: jsonSchemaOutputFormat(testMode ? outlineSchemaTest : outlineSchema) },
      });
      const parsed = resp.parsed_output as { steps: RoadmapOutlineItem[] } | undefined;
      if (!parsed?.steps?.length) {
        res.status(502).json({ code: "INVALID_RESPONSE", message: "로드맵 응답이 비어 있습니다." });
        return;
      }
      res.json(parsed.steps);
    } catch (e) {
      logger.error("outline function failed", e);
      const status = e instanceof Anthropic.APIError ? e.status ?? 502 : 500;
      res.status(status).json({
        code: "CLAUDE_API_ERROR",
        message: e instanceof Error ? e.message : "알 수 없는 오류",
      });
    }
  },
);
