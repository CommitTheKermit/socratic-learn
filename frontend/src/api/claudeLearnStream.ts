import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL, getClaudeClient } from "./claudeClient";
import { LEARN_STREAM_SYSTEM, learnStreamUserMessage } from "./prompts";
import type {
  LearnStreamRequest,
  StreamCompleteEvent,
  StreamDeltaEvent,
  StreamErrorEvent,
  StreamStatusEvent,
} from "./contract";

export interface ClaudeStreamHandlers {
  onStatus?: (e: StreamStatusEvent) => void;
  onDelta?: (e: StreamDeltaEvent) => void;
  onComplete?: (e: StreamCompleteEvent) => void;
  onError?: (e: StreamErrorEvent) => void;
}

export interface ClaudeStreamHandle {
  abort: () => void;
  done: Promise<void>;
}

export function startClaudeLearnStream(
  req: LearnStreamRequest,
  handlers: ClaudeStreamHandlers,
): ClaudeStreamHandle {
  const controller = new AbortController();
  let aborted = false;

  const done = (async () => {
    let client: Anthropic;
    try {
      client = getClaudeClient();
    } catch (e) {
      handlers.onError?.({
        code: "MISSING_CLAUDE_API_KEY",
        message: (e as Error).message,
      });
      return;
    }

    handlers.onStatus?.({ status: "started", message: "Claude 응답 생성 중" });

    let full = "";
    try {
      const stream = client.messages.stream(
        {
          model: CLAUDE_MODEL,
          max_tokens: 4096,
          thinking: { type: "adaptive" },
          system: [
            {
              type: "text",
              text: LEARN_STREAM_SYSTEM,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [
            {
              role: "user",
              content: learnStreamUserMessage(req.concept),
            },
          ],
        },
        { signal: controller.signal },
      );

      stream.on("text", (delta) => {
        if (aborted) return;
        full += delta;
        handlers.onDelta?.({ text: delta });
      });

      await stream.finalMessage();
      if (!aborted) {
        handlers.onComplete?.({ content: full });
      }
    } catch (e) {
      if (aborted || (e as Error)?.name === "AbortError") return;
      const { code, message } = classifyError(e);
      handlers.onError?.({ code, message });
    }
  })();

  return {
    abort: () => {
      aborted = true;
      controller.abort();
    },
    done,
  };
}

function classifyError(e: unknown): { code: string; message: string } {
  if (e instanceof Anthropic.AuthenticationError) {
    return {
      code: "MISSING_CLAUDE_API_KEY",
      message: "Claude API 키가 유효하지 않습니다. .env.local 의 VITE_ANTHROPIC_API_KEY 를 확인하세요.",
    };
  }
  if (e instanceof Anthropic.RateLimitError) {
    return { code: "CLAUDE_API_ERROR", message: "Claude API 호출 한도를 초과했습니다. 잠시 후 다시 시도해 주세요." };
  }
  if (e instanceof Anthropic.BadRequestError) {
    return { code: "INVALID_CONCEPT", message: e.message };
  }
  if (e instanceof Anthropic.APIError) {
    return { code: "CLAUDE_API_ERROR", message: `Claude API 오류 (${e.status}): ${e.message}` };
  }
  return {
    code: "INTERNAL_ERROR",
    message: (e as Error)?.message ?? "알 수 없는 오류",
  };
}
