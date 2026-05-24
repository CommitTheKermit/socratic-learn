import { type ProbeAnswers } from "./data";
interface Props {
    concept: string;
    probes: ProbeAnswers;
    setProbes: (updater: (prev: ProbeAnswers) => ProbeAnswers) => void;
    estimatedLevel: number | null;
    setEstimatedLevel: (v: number) => void;
    onPrev: () => void;
    onNext: () => void;
}
export declare function StageProbe({ concept, probes, setProbes, estimatedLevel, setEstimatedLevel, onPrev, onNext, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
