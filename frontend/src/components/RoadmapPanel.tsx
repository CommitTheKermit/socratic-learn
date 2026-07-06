import { useEffect, useRef, useState } from "react";
import { listReadymadeRoadmaps } from "../api/readymadeRoadmapApi";
import type { ReadymadeRoadmapListEntry } from "../api/contract";

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
 * 로드맵 행의 단계 칩 목록. 마우스를 올리면 넘치는 칩이 왼→오로 자동 스크롤되고,
 * 벗어나면 처음으로 되돌아온다(넘치는 양에 비례한 시간, ease-out).
 */
function StepChips({ titles }: { titles: string[] }) {
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
      {titles.map((t, li) => (
        <span className="rmap-chip" key={li}>
          {t}
        </span>
      ))}
    </span>
  );
}

/** 로딩 중 자리 예약 스켈레톤(레이아웃 점프 방지). 실제 rmap 과 같은 2단 골격. */
function RoadmapSkeleton() {
  return (
    <div className="rmap rmap--skel" aria-hidden>
      <div className="rmap-rail">
        {/* 대주제 레일 placeholder 2개. */}
        {[0, 1].map((i) => (
          <span className="rmap-skel-bar rmap-skel-major" key={i} />
        ))}
      </div>
      <div className="rmap-map">
        {/* 실제 맵이 보여주는 행 수(3개)와 같은 높이를 예약해 로드 시 점프를 막는다. */}
        {[0, 1, 2].map((i) => (
          <span className="rmap-skel-bar rmap-skel-row" key={i} />
        ))}
      </div>
    </div>
  );
}

type Status = "loading" | "ready" | "empty" | "error";

interface Props {
  /** 로드맵 행 클릭 시 그 readymade 로드맵을 학습 시작한다(roadmapId, 표시용 title). */
  onStart: (roadmapId: string, title: string) => void;
}

/**
 * 메인 화면 학습 로드맵 패널 (E3 - 슬림 2단).
 * readymade 로드맵을 subject(대주제) → 로드맵(중주제)로 보여준다. 행 클릭 시 그 로드맵을 학습 시작.
 * 공개 읽기 엔드포인트라 로그인 전에도 목록을 불러온다. 비면/오류면 조용히 숨긴다(입력창은 정상 동작).
 */
export function RoadmapPanel({ onStart }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [entries, setEntries] = useState<ReadymadeRoadmapListEntry[]>([]);
  const [subject, setSubject] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listReadymadeRoadmaps()
      .then((list) => {
        if (!alive) return;
        if (!list.length) {
          setStatus("empty");
          return;
        }
        setEntries(list);
        setSubject(list[0].subject);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  if (status === "loading") return <RoadmapSkeleton />;
  // 비어있거나 오류면 패널을 숨긴다(입력창으로 계속 학습 가능).
  if (status !== "ready") return null;

  // 대주제 = 등장 순서를 보존한 고유 subject 목록.
  const subjects = [...new Set(entries.map((e) => e.subject))];
  const active = subject ?? subjects[0];
  const mids = entries.filter((e) => e.subject === active);

  return (
    <div className="rmap">
      <div className="rmap-rail">
        {subjects.map((s) => (
          <button
            key={s}
            type="button"
            className={"rmap-major" + (s === active ? " is-active" : "")}
            onClick={() => setSubject(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="rmap-map">
        {mids.map((m, mi) => (
          <button
            type="button"
            className="rmap-row"
            key={m.roadmapId}
            onClick={() => onStart(m.roadmapId, m.title)}
            aria-label={"시작: " + m.title}
          >
            <span className="rmap-num">{String(mi + 1).padStart(2, "0")}</span>
            <span className="lbl">{m.title}</span>
            <StepChips titles={m.stepTitles} />
            <span className="rmap-go">
              <ArrowRight />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
