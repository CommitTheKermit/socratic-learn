export declare const SAMPLE_CONCEPT = "\uCF54\uB8E8\uD2F4\uC774 \uC65C \uD544\uC694\uD55C\uC9C0";
export type ProbeChoiceQ = {
    id: "p1";
    kind: "choice";
    q: string;
    sub?: string;
    options: {
        value: number;
        label: string;
    }[];
};
export type ProbeMultiQ = {
    id: "p2";
    kind: "multi";
    q: string;
    sub?: string;
    options: {
        value: string;
        label: string;
        correct: boolean;
    }[];
};
export type ProbeTextQ = {
    id: "p3";
    kind: "text";
    q: string;
    sub?: string;
    placeholder: string;
};
export type ProbeQuestion = ProbeChoiceQ | ProbeMultiQ | ProbeTextQ;
export interface ProbeAnswers {
    p1?: number;
    p2?: string[];
    p3?: string;
}
export declare const PROBE_QUESTIONS: ProbeQuestion[];
export declare const LEVEL_LABELS: string[];
export declare function estimateLevel(probes: ProbeAnswers, questions?: ProbeQuestion[]): number;
export declare function levelReason(probes: ProbeAnswers, level: number, questions?: ProbeQuestion[]): string;
export interface StepQuestion {
    id: string;
    q: string;
    hint: string;
}
export interface Step {
    id: number;
    title: string;
    desc: string;
    body: string;
    questions: StepQuestion[];
}
export declare const STEPS: Step[];
export type Stage = "input" | "probe" | "learn" | "done";
export declare const STAGE_LABELS: Record<Stage, string>;
export declare const DEPTHS: {
    value: string;
    label: string;
    hint: string;
}[];
export declare const ACCENT_PRESETS: string[][];
export declare const PHASES: readonly [{
    readonly id: "input";
    readonly label: "개념 입력";
}, {
    readonly id: "probe";
    readonly label: "수준 확인";
}, {
    readonly id: "learn";
    readonly label: "학습 진행";
}, {
    readonly id: "done";
    readonly label: "완료";
}];
