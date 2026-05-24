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

export function StageShell({
  eyebrow,
  title,
  sub,
  children,
  prev,
  prevLabel = "이전",
  next,
  nextLabel = "다음 →",
  nextDisabled,
}: Props) {
  return (
    <section className="stage">
      <header className="stage-head">
        <div className="stage-eyebrow">{eyebrow}</div>
        <h2 className="stage-title">{title}</h2>
        {sub && <p className="stage-sub">{sub}</p>}
      </header>
      <div className="stage-body">{children}</div>
      <div className="stage-actions">
        {prev ? (
          <button className="btn-ghost" type="button" onClick={prev}>
            ← {prevLabel}
          </button>
        ) : (
          <span />
        )}
        <span className="grow" />
        <button className="btn-holo" type="button" onClick={next} disabled={nextDisabled}>
          {nextLabel}
        </button>
      </div>
    </section>
  );
}
