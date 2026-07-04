import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { HOW_STEPS, modesFor } from "../stages/data";
import { ModeMenu } from "./ModeMenu";
import { RoadmapPanel } from "./RoadmapPanel";
import { I } from "./icons";

interface Props {
  mode: string;
  onMode: (v: string) => void;
  concept: string;
  setConcept: (v: string) => void;
  onStart: () => void;
  /** 테스트 모드 자격 계정이면 드롭다운에 "테스트" 항목을 노출한다. */
  testEligible?: boolean;
  /** 학습 시작 실패(익명 인증 실패 등) 안내. null 이면 표시하지 않는다. */
  error?: string | null;
}

export function Hero({
  mode,
  onMode,
  concept,
  setConcept,
  onStart,
  testEligible = false,
  error = null,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [guideOpen, setGuideOpen] = useState(true);
  // 로드맵에서 주제를 고르면 입력창이 잠깐 빛나고(glow) 시작 토스트를 띄운 뒤 학습을 시작한다.
  const [glow, setGlow] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  /**
   * 로드맵 중주제 클릭 → 제목을 입력창에 채우고(glow 재생) 시작 토스트를 띄운 뒤
   * 잠깐 후 학습을 시작한다. glow 는 off→on 을 한 프레임 걸쳐 토글해 애니메이션을 재시작한다.
   */
  const startRoadmap = (title: string) => {
    setConcept(title);
    setGlow(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setGlow(true)));
    setToast(title);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast(null);
      onStart();
    }, 900);
  };
  return (
    <section className="hero">
      {/* 안내(HOW_STEPS): h1 위에 두고 위로 펼쳐진다(입력바/제목 위치 불변). */}
      <div className="hero-guide hero-guide--up">
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
      </div>

      <h1>
        어떤 개념을<br />
        가장 먼저 배워볼까요?
      </h1>
      <p className="sub">한 줄로 입력하시면 도와드릴게요</p>

      <form
        className={"input-bar has-lead" + (glow ? " is-just-filled" : "")}
        onSubmit={submit}
      >
        <ModeMenu value={mode} onChange={onMode} modes={modesFor(testEligible)} />
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

      {error && (
        <p className="hero-error" role="alert">
          {error}
        </p>
      )}

      <RoadmapPanel onStart={startRoadmap} />

      <div
        className={"rmap-toast" + (toast ? " is-shown" : "")}
        role="status"
        aria-live="polite"
      >
        <span className="badge">{I.check}</span>
        <span>
          <b>{toast}</b> 학습을 시작합니다…
        </span>
      </div>
    </section>
  );
}
