import { onRequest } from "firebase-functions/v2/https";
import { requireAuth, recordUsage, isTestMode } from "./auth";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import Anthropic from "@anthropic-ai/sdk";
import {
  STEP_DETAIL_STREAM_SYSTEM,
  STEP_DETAIL_STREAM_MARKER,
  stepDetailUserMessage,
} from "./prompts";

// Secret Manager 로 주입되는 Anthropic 키. 브라우저에는 절대 노출되지 않는다.
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const CLAUDE_MODEL = "claude-sonnet-4-6";

interface RoadmapOutlineItem {
  title: string;
  desc: string;
}

// generateStepDetail 의 스트리밍 버전. body 는 토큰 delta 로 흘리고,
// 마커(STEP_DETAIL_STREAM_MARKER) 뒤 questions JSON 은 complete 이벤트로 한 번에 보낸다.
// SSE: status → delta* → complete | error.
export const stepDetailStream = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "POST only" });
      return;
    }

    const uid = await requireAuth(req, res);
    if (!uid) return;
    recordUsage(uid, "stepDetailStream");

    const testMode = await isTestMode(uid);

    const { concept, level, outline, stepIdx } = (req.body ?? {}) as {
      concept?: string;
      level?: number;
      outline?: RoadmapOutlineItem[];
      stepIdx?: number;
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

    // SSE 스트리밍 헤더. X-Accel-Buffering: no 로 프록시 버퍼링 방지.
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    (res as unknown as { flushHeaders?: () => void }).flushHeaders?.();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      (res as unknown as { flush?: () => void }).flush?.();
    };

    send("status", { status: "started", message: "본문 생성 중" });

    const marker = STEP_DETAIL_STREAM_MARKER;
    let full = "";
    let emittedLen = 0; // body 영역에서 이미 delta 로 내보낸 길이

    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
      const stream = client.messages.stream({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        system: [
          { type: "text", text: STEP_DETAIL_STREAM_SYSTEM, cache_control: { type: "ephemeral" } },
        ],
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
      });

      stream.on("text", (delta) => {
        full += delta;
        const markerIdx = full.indexOf(marker);
        if (markerIdx === -1) {
          // 마커가 chunk 경계에 부분적으로 걸칠 수 있으니 끝에서 (marker.length-1) 만큼은 보류.
          const safeEnd = Math.max(0, full.length - (marker.length - 1));
          if (safeEnd > emittedLen) {
            send("delta", { text: full.slice(emittedLen, safeEnd) });
            emittedLen = safeEnd;
          }
        } else if (markerIdx > emittedLen) {
          // 마커 발견: 마커 전까지 남은 body 를 흘리고, 이후(questions)는 버퍼링만.
          send("delta", { text: full.slice(emittedLen, markerIdx) });
          emittedLen = markerIdx;
        }
      });

      await stream.finalMessage();

      const markerIdx = full.indexOf(marker);
      const bodyText = markerIdx === -1 ? full : full.slice(0, markerIdx);
      // 보류했던 body 잔여분 마저 내보내기.
      if (bodyText.length > emittedLen) {
        send("delta", { text: bodyText.slice(emittedLen) });
        emittedLen = bodyText.length;
      }

      let questions: { id: string; q: string }[] = [];
      if (markerIdx !== -1) {
        const jsonText = full.slice(markerIdx + marker.length).trim();
        try {
          const parsed = JSON.parse(jsonText);
          if (Array.isArray(parsed)) questions = parsed;
        } catch {
          logger.warn("stepDetailStream questions JSON 파싱 실패", { jsonText });
        }
      }
      // 테스트 모드: 확인 질문을 2개로 제한(LLM 은 그대로 생성, 표시만 축소)
      if (testMode && questions.length > 2) questions = questions.slice(0, 2);
      send("complete", { body: bodyText.trim(), questions });
      res.end();
    } catch (e) {
      logger.error("stepDetailStream function failed", e);
      send("error", {
        code: "CLAUDE_API_ERROR",
        message: e instanceof Error ? e.message : "알 수 없는 오류",
      });
      res.end();
    }
  },
);
