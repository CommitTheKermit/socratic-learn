import { type Stage } from "../stages/data";
interface Props {
    stage: Stage;
    concept: string;
    onNewSession: () => void;
    onToggleCollapse: () => void;
}
export declare function Sidebar({ stage, concept, onNewSession, onToggleCollapse }: Props): import("react/jsx-runtime").JSX.Element;
export {};
