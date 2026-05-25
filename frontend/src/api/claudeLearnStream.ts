import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL, getClaudeClient } from "./claudeClient";
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

const SYSTEM_PROMPT = `당신은 소크라테스식 학습 튜터입니다. 사용자가 입력한 개념을 다음 원칙에 따라 한국어로 설명하세요.

원칙:
- 짧고 명료한 문단으로 작성하세요. 한 문단은 1-3문장.
- **굵게**, *기울임*, \`인라인 코드\`, 그리고 트리플 백틱(\`\`\`)으로 감싼 코드 블록만 사용하세요. 헤더(#), 리스트(-, *, 1.), 표는 사용하지 않습니다.
- 핵심 용어는 **굵게**, 직관/은유는 *기울임*, 식별자/짧은 코드는 \`인라인 코드\` 로 강조하세요.
- 가능하면 짧은 비유 또는 작은 코드 예제 하나를 포함하세요.
- 사용자가 알려달라고 하는 "단계 제목" 한정으로 설명하고, 다른 단계로 넘어가지 마세요.
- 결론이나 정리 문장으로 마무리하세요.
- 분량은 일반적으로 4-8문단을 넘기지 마세요.`;

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
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [
            {
              role: "user",
              content: `다음 개념을 설명해 주세요.\n\n${req.concept}`,
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
