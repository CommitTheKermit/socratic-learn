import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { HOW_STEPS } from "../stages/data";
import { ModeMenu } from "./ModeMenu";
import { I } from "./icons";

interface Props {
  mode: string;
  onMode: (v: string) => void;
  concept: string;
  setConcept: (v: string) => void;
  onStart: () => void;
}

export function Hero({ mode, onMode, concept, setConcept, onStart }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [guideOpen, setGuideOpen] = useState(true);
  const grow = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(120, el.scrollHeight) + "px";
  };
  const submit = (e?: FormEvent | KeyboardEvent) => {
    e?.preventDefault?.();
    if (!concept.trim()) return;
    onStart();
  };
  return (
    <section className="hero">
      <h1>
        어떤 개념을<br />
        가장 먼저 배워볼까요?
      </h1>
      <p className="sub">한 줄로 입력하시면 도와드릴게요</p>

      <form className="input-bar has-lead" onSubmit={submit}>
        <ModeMenu value={mode} onChange={onMode} />
        <textarea
          ref={ref}
          rows={1}
          autoFocus
          placeholder="배우고 싶은 개념을 입력해서 시작해보세요"
          value={concept}
          onChange={(e) => {
            setConcept(e.target.value);
            grow(e.target);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) submit(e);
          }}
        />
        <button className="btn-capture" type="submit">
          학습 시작
        </button>
      </form>

      <div className="hero-guide">
        <div className="hg-toggle-wrap">
          <button
            type="button"
            className={"hg-toggle" + (guideOpen ? " is-open" : "")}
            aria-expanded={guideOpen}
            onClick={() => setGuideOpen((v) => !v)}
          >
            Socratic은 이렇게 학습해요
            <span className="chev">{I.chevSmall}</span>
          </button>
        </div>
        {guideOpen && (
          <div className="hg-panel">
            <div className="hg-steps">
              {HOW_STEPS.map((s) => (
                <div className="hg-step" key={s.n}>
                  <span className="hg-node">{s.n}</span>
                  <span className="hg-title">{s.title}</span>
                  <span className="hg-desc">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
