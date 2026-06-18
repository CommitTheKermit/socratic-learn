import { onRequest } from "firebase-functions/v2/https";
import { requireAuth, recordUsage, isTestMode } from "./auth";
import { checkRateLimit, rateLimitMessage } from "./rateLimit";
import { CORS_ORIGINS } from "./cors";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { STEP_DETAIL_SYSTEM, stepDetailUserMessage } from "./prompts";
import { logUsage } from "./usageLog";

// Secret Manager 로 주입되는 Anthropic 키. 브라우저에는 절대 노출되지 않는다.
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const CLAUDE_MODEL = "claude-sonnet-4-6";

// frontend/src/api/claudeContent.ts 의 stepDetailSchema 를 그대로 옮겨온 것.
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
      maxItems: 5,
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

// 테스트 모드용: 질문 2개로 축소
const stepDetailSchemaTest = {
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
      minItems: 2,
      maxItems: 2,
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

interface RoadmapOutlineItem {
  title: string;
  desc: string;
}

interface StepDetail {
  body: string;
  questions: { id: string; q: string }[];
}

export const stepDetail = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: CORS_ORIGINS, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "POST only" });
      return;
    }

    const uid = await requireAuth(req, res);
    if (!uid) return;
    recordUsage(uid, "stepDetail");

    const rl = await checkRateLimit(uid);
    if (!rl.allowed) {
      res.status(429).json({ code: "RATE_LIMITED", message: rateLimitMessage(rl.reason!) });
      return;
    }

    const { concept, level, outline, stepIdx, mode } = (req.body ?? {}) as {
      concept?: string;
      level?: number;
      outline?: RoadmapOutlineItem[];
      stepIdx?: number;
      mode?: string;
    };

    if (
      !concept ||
      typeof level !== "number" ||
      !Array.isArray(outline) ||
      typeof stepIdx !== "number"
    ) {
      res.status(400).json({
        code: "INVALID_REQUEST",
        message: "concept, level, outline, stepIdx 가 필요합니다.",
      });
      return;
    }

    const cur = outline[stepIdx];
    if (!cur) {
      res.status(400).json({ code: "INVALID_REQUEST", message: "단계 정보가 없습니다." });
      return;
    }
    const outlineText = outline
      .map((s, i) => `${i + 1}. ${s.title} - ${s.desc}${i === stepIdx ? "  ← (이번 단계)" : ""}`)
      .join("\n");

    // 테스트 모드는 사용자가 직접 mode='test' 를 골랐을 때만, 그리고 자격(testModeUsers)이 있을 때만 적용.
    const testMode = mode === "test" && (await isTestMode(uid));

    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
      const resp = await client.messages.parse({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
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
              mode,
            ),
          },
        ],
        // 테스트 모드: 질문 2개 스키마로 LLM 호출
        output_config: { format: jsonSchemaOutputFormat(testMode ? stepDetailSchemaTest : stepDetailSchema) },
      });
      logUsage("stepDetail", CLAUDE_MODEL, resp.usage);
      const parsed = resp.parsed_output as StepDetail | undefined;
      if (!parsed?.body || !parsed?.questions?.length) {
        res.status(502).json({ code: "INVALID_RESPONSE", message: "단계 상세 응답이 비어 있습니다." });
        return;
      }
      res.json(parsed);
    } catch (e) {
      logger.error("stepDetail function failed", e);
      const status = e instanceof Anthropic.APIError ? e.status ?? 502 : 500;
      res.status(status).json({
        code: "CLAUDE_API_ERROR",
        message: e instanceof Error ? e.message : "알 수 없는 오류",
      });
    }
  },
);
