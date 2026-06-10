import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ANSWER_MODES } from "../stages/data";
import { I } from "./icons";

interface Props {
  value: string;
  onChange: (id: string) => void;
}

// 입력바 왼쪽 답변 모드 드롭다운 (미니멀 알약 + 팝오버 listbox).
// 선택 모드가 --accent-pick 을 정해 트리거 텍스트·선택표시·학습 시작 버튼 색에 반영된다.
export function ModeMenu({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const sel = ANSWER_MODES.find((m) => m.id === value) ?? ANSWER_MODES[1];

  const close = useCallback((focusBtn: boolean) => {
    setOpen(false);
    if (focusBtn) btnRef.current?.focus();
  }, []);
  const choose = useCallback(
    (id: string) => {
      onChange(id);
      close(true);
    },
    [onChange, close],
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) setActive(Math.max(0, ANSWER_MODES.findIndex((m) => m.id === value)));
  }, [open, value]);

  // 선택 모드가 전역 시그니처 액센트를 결정한다.
  useEffect(() => {
    document.documentElement.style.setProperty("--accent-pick", `var(${sel.cvar})`);
  }, [sel.cvar]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % ANSWER_MODES.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + ANSWER_MODES.length) % ANSWER_MODES.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(ANSWER_MODES.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(ANSWER_MODES[active].id);
    }
  };

  return (
    <div className={"mode-dd" + (open ? " is-open" : "")} ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className="mode-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={"답변 모드: " + sel.name}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKey}
      >
        <span className="mode-name" style={{ color: `var(${sel.cvar})` }}>
          {sel.name}
        </span>
        <span className="mode-chev">{I.chevSmall}</span>
      </button>
      {open && (
        <div className="mode-menu" role="listbox" aria-label="답변 모드">
          {ANSWER_MODES.map((m, i) => (
            <button
              key={m.id}
              type="button"
              role="option"
              aria-selected={m.id === value}
              className={
                "mode-opt" +
                (m.id === value ? " is-selected" : "") +
                (i === active ? " is-active" : "")
              }
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(m.id)}
            >
              <span className="mode-opt-body">
                <span
                  className="mode-opt-label"
                  style={m.id === value ? { color: `var(${m.cvar})` } : undefined}
                >
                  {m.name}
                </span>
                <span className="mode-opt-desc">{m.desc}</span>
              </span>
              <span className="mode-check" style={{ color: `var(${m.cvar})` }}>
                {I.check}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
