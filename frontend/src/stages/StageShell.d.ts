import type { ReactNode } from "react";
interface Props {
    eyebrow: ReactNode;
    title: ReactNode;
    sub?: ReactNode;
    children: ReactNode;
    prev?: () => void;
    prevLabel?: string;
    next?: () => void;
    nextLabel?: string;
    nextDisabled?: boolean;
}
export declare function StageShell({ eyebrow, title, sub, children, prev, prevLabel, next, nextLabel, nextDisabled, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
