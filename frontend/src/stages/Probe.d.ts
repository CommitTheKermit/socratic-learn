import { type ProbeAnswers } from "./data";
interface Props {
    concept: string;
    probes: ProbeAnswers;
    setProbes: (updater: (prev: ProbeAnswers) => ProbeAnswers) => void;
    setEstimatedLevel: (v: number) => void;
    onPrev: () => void;
    onNext: () => void;
    onRetry: () => void;
}
export declare function StageProbe({ concept, probes, setProbes, setEstimatedLevel, onPrev, onNext, onRetry, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
