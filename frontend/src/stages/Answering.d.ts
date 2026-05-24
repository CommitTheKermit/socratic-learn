interface Props {
    stepIdx: number;
    answers: Record<string, string>;
    setAnswers: (next: Record<string, string>) => void;
    skips: Record<string, boolean>;
    setSkips: (next: Record<string, boolean>) => void;
    onPrev: () => void;
    onStepDone: () => void;
}
export declare function StageAnswering({ stepIdx, answers, setAnswers, skips, setSkips, onPrev, onStepDone, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
