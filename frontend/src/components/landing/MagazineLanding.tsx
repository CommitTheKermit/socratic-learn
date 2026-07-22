import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./magazine.css";

/**
 * SOCRATIC 학습 매거진 랜딩 (/landing).
 *
 * claude.ai/design 핸드오프 "Socratic Magazine Landing.html" + magazine.css 를
 * 이식한 것. 원본의 스크롤 리빌 + 워드마크 타이핑 스크립트를 컴포넌트 루트로
 * 스코핑한 useEffect 로 옮겼다(전역 document 오염 방지). get 섹션 스크린샷은
 * base64 를 public/landing-app-shot.jpg 로 추출해 참조한다.
 *
 * "작동 방식" 섹션은 스크롤 고정(scrollytelling) 스텝퍼다. 섹션이 뷰포트에 pin
 * 되고, 스크롤 진행도에 따라 활성 스텝(수준 확인 → 개념 학습 → 확인 질문 → 완료)이
 * 1→2→3→4 로 전환되며 각 단계 스크린샷 + 설명이 크로스페이드된다. 모바일/reduced-
 * motion 에서는 pin 없이 세로 카드로 나열(compact).
 *
 * 클래스명은 전부 `m-` 접두사를 쓴다. 앱 전역 CSS(v3.css 의 `.hero` 등)가
 * 같은 이름 규칙으로 `.mag-root` 안 레이아웃을 덮어쓰는 것을 막기 위함.
 */

const STEPS = [
  {
    num: "01",
    kicker: "Diagnose",
    title: "수준 확인",
    desc: "몇 가지 질문으로 지금 아는 만큼을 가늠해요. 답을 보고 이후 단계와 설명 깊이를 맞춰요.",
    shot: "/screens/stage-probe.png",
    url: "socratic.learn - 수준 확인",
  },
  {
    num: "02",
    kicker: "Learn",
    title: "개념 학습",
    desc: "필요한 만큼만 설명을 읽어요. 표와 코드로 개념 하나를 차근차근 짚어 나가요.",
    shot: "/screens/stage-learn.png",
    url: "socratic.learn - 학습 진행",
  },
  {
    num: "03",
    kicker: "Answer",
    title: "확인 질문",
    desc: "직접 답하며 이해를 확인해요. 막히면 모르겠다고 넘겨도 괜찮아요.",
    shot: "/screens/stage-questions.png",
    url: "socratic.learn - 확인 질문",
  },
  {
    num: "04",
    kicker: "Done",
    title: "완료",
    desc: "오늘 익힌 것과 도달한 수준을 정리해요. 이해도에 맞춰 다음 학습으로 이어가요.",
    shot: "/screens/stage-done.png",
    url: "socratic.learn - 완료",
  },
];

function BrowserFrame({ activeShot }: { activeShot: number | "all" }) {
  // 완료(마지막) 스크린샷은 원본이 넓고 짧아, 프레임 자체를 더 작게(짧은 비율) 표시한다.
  const isDone = activeShot !== "all" && activeShot === STEPS.length - 1;
  return (
    <div className={`m-frame${isDone ? " is-sm" : ""}`}>
      <div className="m-frame-bar">
        <span className="m-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="m-u">{activeShot === "all" ? "socratic.learn" : STEPS[activeShot].url}</span>
      </div>
      <div className="m-shots">
        {STEPS.map((s, i) => (
          <img
            key={s.num}
            src={s.shot}
            alt={`${s.title} 화면`}
            loading="lazy"
            className={activeShot === "all" || i === activeShot ? "is-on" : ""}
          />
        ))}
      </div>
    </div>
  );
}

export function MagazineLanding() {
  const rootRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  // compact = pin 없이 세로 카드(모바일/reduced-motion). 초기값을 동기로 산정해 깜빡임 방지.
  const [compact, setCompact] = useState(
    () =>
      typeof window !== "undefined" &&
      (matchMedia("(prefers-reduced-motion:reduce)").matches || matchMedia("(max-width:820px)").matches),
  );

  // compact 여부 추적(reduced-motion / 화면폭 변화)
  useEffect(() => {
    const rm = matchMedia("(prefers-reduced-motion:reduce)");
    const narrow = matchMedia("(max-width:820px)");
    const update = () => setCompact(rm.matches || narrow.matches);
    update();
    rm.addEventListener("change", update);
    narrow.addEventListener("change", update);
    return () => {
      rm.removeEventListener("change", update);
      narrow.removeEventListener("change", update);
    };
  }, []);

  // 스크롤 진행도 → 활성 스텝(pin 모드에서만)
  useEffect(() => {
    if (compact) return;
    const section = stepsRef.current;
    if (!section) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const range = section.offsetHeight - window.innerHeight;
        if (range <= 0) return;
        const p = Math.min(1, Math.max(0, -section.getBoundingClientRect().top / range));
        const idx = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
        setActiveStep((prev) => (prev === idx ? prev : idx));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [compact]);

  // 스텝 네비 클릭 → 해당 스텝 구간으로 부드럽게 스크롤
  const scrollToStep = (i: number) => {
    const section = stepsRef.current;
    if (!section) return;
    const range = section.offsetHeight - window.innerHeight;
    const y = window.scrollY + section.getBoundingClientRect().top + (i / STEPS.length) * range + 4;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;

    // [selector, mode, staggerStepMs (0 = none)]
    const groups: [string, string, number][] = [
      [".m-hero .m-lead h1", "rise", 0],
      [".m-hero .m-lead .m-dek", "rise", 0],
      [".m-toc-row", "up", 70],
      [".m-toc-new", "wipe", 0],
      [".m-shead", "rise", 0],
      [".m-how-head", "rise", 0],
      [".m-feature .m-body h2", "rise", 0],
      [".m-feature .m-cols p", "rise", 90],
      [".m-where", "wipe", 0],
      [".m-itv h2", "rise", 0],
      [".m-itv-grid .m-qa", "up", 80],
      [".m-pull", "wipe", 0],
      [".m-why h2", "rise", 0],
      [".m-why-col", "rise", 110],
      [".m-get .m-k", "rise", 0],
      [".m-get h2", "rise", 0],
      [".m-get .m-dek", "rise", 0],
      [".m-shot", "rise", 0],
      [".m-foot", "up", 0],
    ];
    groups.forEach((g) => {
      root.querySelectorAll<HTMLElement>(g[0]).forEach((el, i) => {
        el.setAttribute("data-rv", g[1]);
        if (g[2]) el.style.setProperty("--d", i * g[2] + "ms");
      });
    });

    let io: IntersectionObserver | undefined;
    if (!reduce) {
      io = new IntersectionObserver(
        (ents) => {
          ents.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("in");
              io!.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
      );
      root.querySelectorAll("[data-rv]").forEach((el) => io!.observe(el));

      // masthead wordmark: type in letter-by-letter (real glyph boundaries)
      const word = root.querySelector<HTMLElement>(".m-word");
      if (word) {
        word.classList.add("m-typing");
        const caret = document.createElement("span");
        caret.className = "m-caret";
        word.appendChild(caret);
        const svg = word.querySelector("svg");
        const txt = svg && svg.querySelector("text");
        const run = () => {
          if (!svg || !txt) return;
          const VB = 1000;
          const n = (txt as SVGTextElement).getNumberOfChars();
          const b = [0];
          for (let i = 0; i < n; i++) {
            try {
              b.push((txt as SVGTextElement).getEndPositionOfChar(i).x / VB);
            } catch {
              b.push((i + 1) / n);
            }
          }
          const per = 150;
          const total = per * n;
          const ck: Keyframe[] = [];
          const sk: Keyframe[] = [];
          b.forEach((f, i) => {
            const off = i / n;
            sk.push({ clipPath: "inset(0 " + (1 - f) * 100 + "% 0 0)", offset: off, easing: "steps(1)" });
            ck.push({ left: "calc(" + f * 100 + "% - 6px)", opacity: 1, offset: off, easing: "steps(1)" });
          });
          svg.animate(sk, { duration: total, fill: "forwards" });
          const ca = caret.animate(ck, { duration: total, fill: "forwards" });
          ca.onfinish = () => caret.remove();
        };
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (txt && (txt as SVGTextElement).getNumberOfChars) run();
            else if (svg) svg.style.clipPath = "none";
          }),
        );
      }
    }

    return () => io?.disconnect();
  }, []);

  const active = STEPS[activeStep];

  return (
    <div className="mag-root" ref={rootRef}>
      <div className="m-page">
        {/* ── masthead ── */}
        <header className="m-masthead">
          <nav>
            <a href="#why">왜</a>
            <span className="m-sep">·</span>
            <a href="#how">작동 방식</a>
            <span className="m-sep">·</span>
            <a href="#get">시작</a>
          </nav>
        </header>

        {/* ── giant wordmark ── */}
        <div className="m-word">
          <svg viewBox="0 0 1000 168" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="SOCRATIC">
            <defs>
              <linearGradient id="holoword" x1="0" y1="0" x2="1" y2="0.35">
                <stop offset="0" stopColor="#A8FFC9" />
                <stop offset="0.35" stopColor="#7DE3FF" />
                <stop offset="0.7" stopColor="#C8B6FF" />
                <stop offset="1" stopColor="#FFB3D9" />
              </linearGradient>
            </defs>
            <text x="0" y="150" textLength="1000" lengthAdjust="spacingAndGlyphs">
              SOCRATIC
            </text>
          </svg>
        </div>

        {/* ── hero ── */}
        <section className="m-hero">
          <div className="m-lead">
            <h1>정답을 주지 않는다</h1>
            <p className="m-dek">지금 아는 것에서 출발해, 질문을 따라 스스로 이해에 이르는 대화형 학습.</p>
          </div>
          <aside className="m-toc">
            <div className="m-toc-row">
              <span className="m-n">01</span>
              <span className="m-t">정답을 주지 않는 수업</span>
            </div>
            <div className="m-toc-row">
              <span className="m-n">02</span>
              <span className="m-t">스레드는 왜 비싼가 - 대화 전문</span>
            </div>
            <div className="m-toc-row">
              <span className="m-n">03</span>
              <span className="m-t">네 단계 학습법</span>
            </div>
            <div className="m-toc-row">
              <span className="m-n">04</span>
              <span className="m-t">깊이 조절 모드</span>
            </div>
            <div className="m-toc-new">
              <div className="m-h">
                <b>New</b> 무료 체험
              </div>
              <p>결제 없이 지금 바로 첫 학습을 시작하세요.</p>
            </div>
          </aside>
        </section>

        {/* ── FEATURE ── */}
        <div className="m-shead">
          <span className="m-kick">Feature</span>
        </div>
        <section className="m-feature">
          <div className="m-body">
            <h2>
              설명을 듣는 것이 아니라,
              <br />
              스스로 설명하게 되는 학습
            </h2>
            <div className="m-cols">
              <p>
                강의는 모두에게 같은 진도를 밀어붙인다. 소크라틱은 먼저 질문으로 지금의 이해를 확인하고, 딱 그 지점에서 한
                걸음씩 나아간다.
              </p>
              <p>
                그래서 남는 것은 <b>외운 지식이 아니라 설명할 수 있는 이해</b>다. 개념 하나를 스스로의 말로 풀어낼 수 있을
                때까지 대화가 이어진다.
              </p>
            </div>
          </div>
          <aside className="m-where">
            <span className="m-k">Where it starts</span>
            <span className="m-big">1</span>
            <span className="m-cap">개념 하나면 시작된다</span>
          </aside>
        </section>

        {/* ── INTERVIEW ── */}
        <div className="m-shead">
          <span className="m-kick">Interview</span>
        </div>
        <section className="m-itv">
          <h2>정답 대신 질문으로. 스레드가 왜 비싼지를 둘러싼 한 토막.</h2>
          <div className="m-itv-grid">
            <div className="m-l">
              <div className="m-qa">
                <p className="m-q">
                  <span className="m-m">Q</span>스레드 하나를 만들 때 OS는 무엇을 미리 확보하나요?
                </p>
                <p className="m-a">
                  <span className="m-m">A</span>콜 스택을 위한 메모리요.
                </p>
              </div>
              <div className="m-qa">
                <p className="m-q">
                  <span className="m-m">Q</span>그럼 스레드가 1만 개면 그 메모리는 얼마가 될까요?
                </p>
                <p className="m-a">
                  <span className="m-m">A</span>스레드당 약 1MB니까… 약 10GB요.
                </p>
              </div>
            </div>
            <div className="m-r">
              <div className="m-qa">
                <p className="m-q">
                  <span className="m-m">Q</span>바로 그 지점이에요. 그래서 코루틴이 필요합니다.
                </p>
              </div>
              <div className="m-pull">
                <p>
                  “답을 주면 외우고,
                  <br />
                  질문을 주면 이해한다.”
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── WHY ── */}
        <div className="m-shead" id="why" />
        <section className="m-why">
          <h2>설명을 쌓는 대신, 아는 곳에서 시작한다</h2>
          <div className="m-why-grid">
            <div className="m-why-col m-old">
              <div className="m-ch">기존의 강의</div>
              <ul>
                <li>
                  <span className="m-s">-</span>설명을 일방적으로 쏟아붓는다
                </li>
                <li>
                  <span className="m-s">-</span>모두에게 같은 진도로 간다
                </li>
                <li>
                  <span className="m-s">-</span>읽고 넘어가면 이해로 친다
                </li>
                <li>
                  <span className="m-s">-</span>답을 외운다
                </li>
              </ul>
            </div>
            <div className="m-why-col m-new">
              <div className="m-ch">소크라틱 학습</div>
              <ul>
                <li>
                  <span className="m-s">→</span>질문으로 스스로 답에 이른다
                </li>
                <li>
                  <span className="m-s">→</span>지금 수준에서 시작한다
                </li>
                <li>
                  <span className="m-s">→</span>직접 답하며 확인한다
                </li>
                <li>
                  <span className="m-s">→</span>스스로 설명하게 된다
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS · 스크롤 고정 스텝퍼 ── */}
        <div className="m-how-head" id="how">
          <span className="m-kick m-l">
            <span className="m-n">03</span>작동 방식
          </span>
          <span className="m-kick">How it works</span>
        </div>

        {compact ? (
          <div className="m-step-cards">
            {STEPS.map((s, i) => (
              <article className="m-step-card" key={s.num}>
                <div className="m-sc-head">
                  <span className="m-sc-num">{s.num}</span>
                  <h3>{s.title}</h3>
                </div>
                <BrowserFrame activeShot={i} />
                <p className="m-sc-desc">{s.desc}</p>
              </article>
            ))}
          </div>
        ) : (
          <section className="m-steps" ref={stepsRef} aria-label="작동 방식 4단계">
            <div className="m-steps-sticky">
              <div className="m-steps-nav" role="tablist">
                {STEPS.map((s, i) => (
                  <button
                    type="button"
                    key={s.num}
                    role="tab"
                    aria-selected={i === activeStep}
                    className={i === activeStep ? "is-on" : ""}
                    onClick={() => scrollToStep(i)}
                  >
                    <span className="m-sn-bar" aria-hidden="true" />
                    <span className="m-sn-num">{s.num}</span>
                    <span className="m-sn-label">{s.title}</span>
                  </button>
                ))}
              </div>
              <div className="m-steps-stage">
                <BrowserFrame activeShot={activeStep} />
                <div className="m-steps-copy" key={activeStep}>
                  <span className="m-steps-kick">
                    Step {active.num} · {active.kicker}
                  </span>
                  <h3>{active.title}</h3>
                  <p>{active.desc}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── GET STARTED ── */}
        <section className="m-get" id="get">
          <div className="m-in">
            <h2>
              개념 한 줄로
              <br />
              지금 시작하세요.
            </h2>
            <p className="m-dek">계정도, 준비물도 필요 없어요. 궁금한 개념 한 줄이면 됩니다. 지금 만나는 실제 화면입니다.</p>
            <figure className="m-shot">
              <Link to="/" className="m-shot-link" aria-label="Socratic 서비스 메인으로 이동해 학습 시작하기">
                <figcaption>
                  <span className="m-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="m-u">socratic.learn</span>
                </figcaption>
                <img src="/landing-app-shot.jpg" alt="Socratic 학습 화면 미리보기 - 눌러서 시작" />
              </Link>
            </figure>
          </div>
        </section>

        {/* ── footer ── */}
        <footer className="m-foot">
          <span className="m-mid">- 08 -</span>
          <span>© 2026 · 왜 · 작동 방식 · 시작</span>
        </footer>
      </div>
    </div>
  );
}
