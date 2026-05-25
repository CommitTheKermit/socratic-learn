interface Props {
    concept: string;
    level: number | null;
    stepIdx: number;
    setStepIdx: (n: number) => void;
    answers: Record<string, string>;
    setAnswers: (next: Record<string, string>) => void;
    skips: Record<string, boolean>;
    setSkips: (next: Record<string, boolean>) => void;
    onPrev: () => void;
    onDone: () => void;
    onRetry: () => void;
}
export declare function StageLearn({ concept, level, stepIdx, setStepIdx, answers, setAnswers, skips, setSkips, onPrev, onDone, onRetry, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
