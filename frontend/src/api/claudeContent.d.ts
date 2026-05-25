import type { ProbeQuestion, Step } from "../stages/data";
export declare class ClaudeContentError extends Error {
    code: string;
    constructor(code: string, message: string);
}
export declare function generateProbeQuestions(concept: string): Promise<ProbeQuestion[]>;
export interface RoadmapOutlineItem {
    title: string;
    desc: string;
}
export declare function generateRoadmapOutline(concept: string, level: number): Promise<RoadmapOutlineItem[]>;
export interface StepDetail {
    body: string;
    questions: Step["questions"];
}
export declare function generateStepDetail(concept: string, level: number, outline: RoadmapOutlineItem[], stepIdx: number): Promise<StepDetail>;
export type Grade = "correct" | "almost" | "partial" | "wrong";
export interface EvaluationItem {
    id: string;
    grade: Grade;
    feedback: string;
}
export interface StepEvaluation {
    evaluations: EvaluationItem[];
}
export interface EvalQuestionInput {
    id: string;
    q: string;
    hint: string;
    answer: string;
}
export declare function generateAnswerEvaluation(concept: string, level: number, stepTitle: string, stepDesc: string, stepBody: string, questions: EvalQuestionInput[]): Promise<StepEvaluation>;
