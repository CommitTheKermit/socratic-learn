import { type LearnStreamRequest, type StreamCompleteEvent, type StreamDeltaEvent, type StreamErrorEvent, type StreamStatusEvent } from "./contract";
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
export declare function startLearnStream(req: LearnStreamRequest, handlers: LearnStreamHandlers): LearnStreamHandle;
