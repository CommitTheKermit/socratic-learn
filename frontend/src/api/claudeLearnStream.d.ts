import type { LearnStreamRequest, StreamCompleteEvent, StreamDeltaEvent, StreamErrorEvent, StreamStatusEvent } from "./contract";
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
export declare function startClaudeLearnStream(req: LearnStreamRequest, handlers: ClaudeStreamHandlers): ClaudeStreamHandle;
