import {
  API_BASE_URL,
  ApiPaths,
  StreamEvents,
  type StepDetailRequest,
  type StepDetailStreamComplete,
  type StreamDeltaPayload,
  type StreamErrorPayload,
  type StreamStatusPayload,
} from "./contract";
import { authHeaders } from "./authHeaders";

export interface StepDetailStreamHandlers {
  onStatus?: (e: StreamStatusPayload) => void;
  onDelta?: (text: string) => void;
  onComplete?: (e: StepDetailStreamComplete) => void;
  onError?: (e: StreamErrorPayload) => void;
}

export interface StreamHandle {
  abort: () => void;
  done: Promise<void>;
}

// stepDetailStream Function 의 SSE 를 fetch + ReadableStream 으로 읽는다(EventSource 미사용 - POST 본문 필요).
export function streamStepDetail(
  req: StepDetailRequest,
  handlers: StepDetailStreamHandlers,
): StreamHandle {
  const controller = new AbortController();

  const done = (async () => {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${ApiPaths.STEP_DETAIL_STREAM}`, {
        method: "POST",
        headers: await authHeaders({ Accept: "text/event-stream" }),
        body: JSON.stringify(req),
        signal: controller.signal,
      });
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      handlers.onError?.({ code: "NETWORK_ERROR", message: (e as Error)?.message ?? "네트워크 오류" });
      return;
    }

    if (!response.ok || !response.body) {
      let code = "CLAUDE_API_ERROR";
      let message = `본문 스트리밍 요청 실패: HTTP ${response.status}`;
      try {
        const body = await response.json();
        if (body?.code) code = body.code as string;
        if (body?.message) message = body.message as string;
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
        let sep: number;
        // SSE 이벤트는 빈 줄(\n\n)로 구분.
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          dispatch(rawEvent, handlers);
        }
      }
      buffer += decoder.decode();
      if (buffer.trim()) dispatch(buffer, handlers);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      handlers.onError?.({ code: "STREAM_ERROR", message: (e as Error)?.message ?? "스트림 읽기 실패" });
    }
  })();

  return { abort: () => controller.abort(), done };
}

function dispatch(raw: string, handlers: StepDetailStreamHandlers): void {
  let eventName = "message";
  const dataLines: string[] = [];
  for (const rawLine of raw.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") eventName = value;
    else if (field === "data") dataLines.push(value);
  }
  if (!dataLines.length) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(dataLines.join("\n"));
  } catch {
    return;
  }

  switch (eventName) {
    case StreamEvents.STATUS:
      handlers.onStatus?.(parsed as StreamStatusPayload);
      return;
    case StreamEvents.DELTA:
      handlers.onDelta?.((parsed as StreamDeltaPayload).text);
      return;
    case StreamEvents.COMPLETE:
      handlers.onComplete?.(parsed as StepDetailStreamComplete);
      return;
    case StreamEvents.ERROR:
      handlers.onError?.(parsed as StreamErrorPayload);
      return;
  }
}
