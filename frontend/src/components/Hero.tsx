import { useRef, type FormEvent, type KeyboardEvent } from "react";
import { DEPTHS } from "../stages/data";
import { I } from "./icons";

interface Props {
  depth: string;
  onDepth: (v: string) => void;
  concept: string;
  setConcept: (v: string) => void;
  onStart: () => void;
}

export function Hero({ depth, onDepth, concept, setConcept, onStart }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
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

      <form className="input-bar" onSubmit={submit}>
        <label className="depth-select">
          {DEPTHS.find((d) => d.value === depth)?.label || "0depth"}
          <span className="chev">{I.chevSmall}</span>
          <select value={depth} onChange={(e) => onDepth(e.target.value)}>
            {DEPTHS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label} · {d.hint}
              </option>
            ))}
          </select>
        </label>
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
    </section>
  );
}
