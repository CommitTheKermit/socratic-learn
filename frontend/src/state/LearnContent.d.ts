import { type ReactNode } from "react";
import { type ProbeQuestion, type Step } from "../stages/data";
import { type StepEvaluation } from "../api/claudeContent";
type LoadStatus = "idle" | "loading" | "ready" | "error";
type ErrInfo = {
    code: string;
    message: string;
};
interface LearnContentValue {
    probeQuestions: ProbeQuestion[];
    probeStatus: LoadStatus;
    probeError: ErrInfo | null;
    probeFromFallback: boolean;
    loadProbe: (concept: string) => Promise<void>;
    steps: Step[];
    outlineStatus: LoadStatus;
    outlineError: ErrInfo | null;
    loadOutline: (concept: string, level: number) => Promise<void>;
    stepDetailStatus: Record<number, LoadStatus>;
    stepDetailErrors: Record<number, ErrInfo | null>;
    loadStepDetail: (concept: string, level: number, stepIdx: number) => Promise<void>;
    stepEvaluations: Record<number, StepEvaluation>;
    stepEvalStatus: Record<number, LoadStatus>;
    stepEvalErrors: Record<number, ErrInfo | null>;
    submitEvaluation: (concept: string, level: number, stepIdx: number, answers: Record<string, string>, skips: Record<string, boolean>) => Promise<void>;
    reset: () => void;
}
export declare function LearnContentProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useLearnContent(): LearnContentValue;
export {};
