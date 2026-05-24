import { type AnswerSubmissionRequest, type AnswerSubmissionResponse } from "./contract";
export declare class AnswersSubmissionError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
export declare function submitAnswers(req: AnswerSubmissionRequest): Promise<AnswerSubmissionResponse>;
