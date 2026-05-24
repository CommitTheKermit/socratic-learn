import {
  API_BASE_URL,
  ApiPaths,
  SseEvents,
  type LearnStreamRequest,
  type StreamCompleteEvent,
  type StreamDeltaEvent,
  type StreamErrorEvent,
  type StreamStatusEvent,
} from "./contract";

export interface LearnStreamHandlers {
  onStatus?: (e: StreamStatusEvent) => void;
  onDelta?: (e: StreamDeltaEvent) => void;
  onComplete?: (e: StreamCompleteEvent) => void;
  onError?: (e: StreamErrorEvent) => void;
}

export interface LearnStreamHandle {
  abort: () => void;
  done: Promise<void>;
}

export function startLearnStream(
  req: LearnStreamRequest,
  handlers: LearnStreamHandlers,
): LearnStreamHandle {
  const controller = new AbortController();

  const done = (async () => {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${ApiPaths.LEARN_STREAM}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ language: "ko", ...req }),
        signal: controller.signal,
      });
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      handlers.onError?.({
        code: "NETWORK_ERROR",
        message: (e as Error)?.message ?? "네트워크 오류",
      });
      return;
    }

    if (!response.ok || !response.body) {
      let code = "HTTP_ERROR";
      let message = `요청 실패: HTTP ${response.status}`;
      try {
        const body = await response.json();
        if (body?.code) code = body.code;
        if (body?.message) message = body.message;
      } catch {
        /* ignore */
      }
      handlers.onError?.({ code, message });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events delimited by blank line
        let sepIdx: number;
        while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 2);
          dispatch(rawEvent, handlers);
        }
      }
      // Flush remaining
      buffer += decoder.decode();
      if (buffer.trim()) dispatch(buffer, handlers);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      handlers.onError?.({
        code: "STREAM_ERROR",
        message: (e as Error)?.message ?? "스트림 읽기 실패",
      });
    }
  })();

  return { abort: () => controller.abort(), done };
}

function dispatch(raw: string, handlers: LearnStreamHandlers): void {
  let eventName = "message";
  const dataLines: string[] = [];
  for (const rawLine of raw.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line) continue;
    if (line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") eventName = value;
    else if (field === "data") dataLines.push(value);
  }
  if (!dataLines.length) return;
  const data = dataLines.join("\n");

  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return;
  }

  switch (eventName) {
    case SseEvents.STATUS:
      handlers.onStatus?.(parsed as StreamStatusEvent);
      return;
    case SseEvents.DELTA:
      handlers.onDelta?.(parsed as StreamDeltaEvent);
      return;
    case SseEvents.COMPLETE:
      handlers.onComplete?.(parsed as StreamCompleteEvent);
      return;
    case SseEvents.ERROR:
      handlers.onError?.(parsed as StreamErrorEvent);
      return;
  }
}
