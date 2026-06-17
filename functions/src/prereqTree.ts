import { onRequest } from "firebase-functions/v2/https";
import { requireAuth, recordUsage, isTestMode } from "./auth";
import { checkRateLimit, rateLimitMessage } from "./rateLimit";
import { CORS_ORIGINS } from "./cors";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { PREREQ_TREE_SYSTEM, prereqTreeUserMessage } from "./prompts";

// Secret Manager 로 주입되는 Anthropic 키. 브라우저에는 절대 노출되지 않는다.
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const CLAUDE_MODEL = "claude-sonnet-4-6";

// 선행 개념 트리 스키마. 구조화 출력은 재귀($ref)를 보장하기 어려워, 깊이를 3단계로 고정해 펼친다.
// 가장 깊은(3단계) 노드의 children 은 빈 배열(maxItems:0)로 강제한다.
const NODE_PROPS = (children: object) =>
  ({
    type: "object",
    additionalProperties: false,
    required: ["concept", "reason", "children"],
    properties: {
      concept: { type: "string", description: "선행 개념 이름. 그대로 학습 주제로 쓸 한 줄(설명문 아님)." },
      reason: { type: "string", description: "왜 이것이 선행인지 1문장 한국어." },
      children,
    },
  }) as const;

const leafChildren = { type: "array", maxItems: 0, items: { type: "object", additionalProperties: false } } as const;
const nodeL3 = NODE_PROPS(leafChildren);
const nodeL2 = NODE_PROPS({ type: "array", maxItems: 4, items: nodeL3 });
const nodeL1 = NODE_PROPS({ type: "array", maxItems: 4, items: nodeL2 });

const prereqTreeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["prerequisites"],
  properties: {
    prerequisites: {
      type: "array",
      maxItems: 5,
      items: nodeL1,
      description: "목표 개념 바로 아래 선행들(각자 하위 트리 보유). 선행이 불필요하면 빈 배열.",
    },
  },
} as const;

interface PrereqNode {
  concept: string;
  reason: string;
  children: PrereqNode[];
}

export const prereqTree = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: CORS_ORIGINS, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "POST only" });
      return;
    }

    const uid = await requireAuth(req, res);
    if (!uid) return;
    recordUsage(uid, "prereqTree");

    const rl = await checkRateLimit(uid);
    if (!rl.allowed) {
      res.status(429).json({ code: "RATE_LIMITED", message: rateLimitMessage(rl.reason!) });
      return;
    }

    const { concept, materials, probeSummary, mode } = (req.body ?? {}) as {
      concept?: string;
      materials?: string;
      probeSummary?: string;
      mode?: string;
    };

    if (!concept) {
      res.status(400).json({ code: "INVALID_REQUEST", message: "concept 가 필요합니다." });
      return;
    }

    // 테스트 모드는 사용자가 직접 mode='test' 를 골랐을 때만, 그리고 자격(testModeUsers)이 있을 때만 적용.
    const testMode = mode === "test" && (await isTestMode(uid));

    // 테스트 모드: LLM 호출 없이 빈 트리 반환
    if (testMode) {
      res.json({ prerequisites: [] });
      return;
    }

    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
      const resp = await client.messages.parse({
        model: CLAUDE_MODEL,
        max_tokens: 2500,
        system: [{ type: "text", text: PREREQ_TREE_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: prereqTreeUserMessage(concept, materials, probeSummary) }],
        output_config: { format: jsonSchemaOutputFormat(prereqTreeSchema) },
      });
      const parsed = resp.parsed_output as { prerequisites: PrereqNode[] } | undefined;
      if (!parsed) {
        res.status(502).json({ code: "INVALID_RESPONSE", message: "선행 개념 트리 응답이 비어 있습니다." });
        return;
      }
      res.json({ prerequisites: parsed.prerequisites ?? [] });
    } catch (e) {
      logger.error("prereqTree function failed", e);
      const status = e instanceof Anthropic.APIError ? e.status ?? 502 : 500;
      res.status(status).json({
        code: "CLAUDE_API_ERROR",
        message: e instanceof Error ? e.message : "알 수 없는 오류",
      });
    }
  },
);
