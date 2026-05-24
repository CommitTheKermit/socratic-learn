export declare const ApiPaths: {
    readonly HEALTH: "/health";
    readonly LEARN_STREAM: "/learn/stream";
    readonly ANSWERS: "/answers";
};
export declare const SseEvents: {
    readonly STATUS: "status";
    readonly DELTA: "delta";
    readonly COMPLETE: "complete";
    readonly ERROR: "error";
};
export type SseEventName = (typeof SseEvents)[keyof typeof SseEvents];
export interface LearnStreamRequest {
    concept: string;
    language?: string;
}
export interface StreamStatusEvent {
    status: string;
    message: string;
}
export interface StreamDeltaEvent {
    text: string;
}
export interface StreamCompleteEvent {
    content: string;
}
export interface StreamErrorEvent {
    code: string;
    message: string;
}
export interface AnswerItem {
    questionId?: string;
    question?: string;
    answer?: string;
    unknown?: boolean;
}
export interface AnswerSubmissionRequest {
    sessionId?: string;
    concept?: string;
    answers: AnswerItem[];
}
export interface AnswerSubmissionResponse {
    status: string;
    receivedCount: number;
    message: string;
}
export interface ErrorResponse {
    code: string;
    message: string;
}
export declare const API_BASE_URL: string;
