interface Props {
    concept: string;
    level: number | null;
    answers: Record<string, string>;
    skips: Record<string, boolean>;
    onPrev: () => void;
    onRestart: () => void;
}
export declare function StageDone({ concept, level, answers, skips, onPrev, onRestart }: Props): import("react/jsx-runtime").JSX.Element;
export {};
