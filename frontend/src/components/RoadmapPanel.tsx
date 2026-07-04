import { useRef, useState } from "react";
import { ROADMAP, type RoadmapLeaf } from "../stages/roadmapData";

/** 화살표(→) 아이콘. 중주제 행의 시작 버튼용(rmap-go). */
function ArrowRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

/**
 * 중주제 행의 소주제 칩 목록. 마우스를 올리면 넘치는 칩이 왼→오로 자동 스크롤되고,
 * 벗어나면 처음으로 되돌아온다(넘치는 양에 비례한 시간, ease-out).
 */
function StepChips({ leaves }: { leaves: RoadmapLeaf[] }) {
  const ref = useRef<HTMLSpanElement>(null);
  const raf = useRef(0);

  const animateTo = (target: number, dur: number) => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    const start = el.scrollLeft;
    const delta = target - start;
    if (Math.abs(delta) < 1) {
      el.scrollLeft = target;
      return;
    }
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      el.scrollLeft = start + delta * ease;
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const onEnter = () => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 1) return;
    // 넘치는 양에 비례한 시간으로 왼→오 스크롤 (SPEED px/초, 낮을수록 느림)
    const SPEED = 55;
    animateTo(max, (max / SPEED) * 1000);
  };
  const onLeave = () => animateTo(0, 420);

  return (
    <span className="rmap-chips" ref={ref} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {leaves.map((lf, li) => (
        <span className="rmap-chip" key={li}>
          {lf.t}
        </span>
      ))}
    </span>
  );
}

interface Props {
  /** 중주제 클릭 시 그 제목으로 학습 시작을 요청한다. */
  onStart: (title: string) => void;
}

/**
 * 메인 화면 학습 로드맵 패널 (E3 - 슬림 2단).
 * 좌측 대주제 레일 → 우측 중주제 목록. 중주제를 클릭하면 그 제목으로 학습이 시작된다.
 */
export function RoadmapPanel({ onStart }: Props) {
  const [major, setMajor] = useState("android");
  const active = ROADMAP.find((x) => x.id === major) ?? ROADMAP[0];
  return (
    <div className="rmap">
      <div className="rmap-rail">
        {ROADMAP.map((x) => (
          <button
            key={x.id}
            type="button"
            className={"rmap-major" + (x.id === major ? " is-active" : "")}
            onClick={() => setMajor(x.id)}
          >
            {x.name}
          </button>
        ))}
      </div>
      <div className="rmap-map">
        {active.mids.map((m, mi) => (
          <button
            type="button"
            className="rmap-row"
            key={mi}
            onClick={() => onStart(m.t)}
            aria-label={"시작: " + m.t}
          >
            <span className="rmap-num">{String(mi + 1).padStart(2, "0")}</span>
            <span className="lbl">{m.t}</span>
            <StepChips leaves={m.leaves} />
            <span className="rmap-go">
              <ArrowRight />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
