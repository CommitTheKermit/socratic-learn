import { useEffect, useRef } from "react";
import "./magazine.css";

/**
 * SOCRATIC 학습 매거진 랜딩 (/landing).
 *
 * claude.ai/design 핸드오프 "Socratic Magazine Landing.html" + magazine.css 를
 * 그대로 이식한 것. 원본의 스크롤 리빌 + 워드마크 타이핑 스크립트를 컴포넌트
 * 루트로 스코핑한 useEffect 로 옮겼다(전역 document 오염 방지). get 섹션 스크린샷은
 * base64 를 public/landing-app-shot.jpg 로 추출해 참조한다.
 */
export function MagazineLanding() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;

    // [selector, mode, staggerStepMs (0 = none)]
    const groups: [string, string, number][] = [
      [".hero .lead h1", "rise", 0],
      [".hero .lead .dek", "rise", 0],
      [".toc-h", "up", 0],
      [".toc-row", "up", 70],
      [".toc-new", "wipe", 0],
      [".shead", "rise", 0],
      [".how-head", "rise", 0],
      [".feature .body h2", "rise", 0],
      [".feature .cols p", "rise", 90],
      [".where", "wipe", 0],
      [".itv h2", "rise", 0],
      [".itv-grid .qa", "up", 80],
      [".pull", "wipe", 0],
      [".why h2", "rise", 0],
      [".why-col", "rise", 110],
      [".how-cell", "up", 90],
      [".get .k", "rise", 0],
      [".get h2", "rise", 0],
      [".get .dek", "rise", 0],
      [".mag-shot", "rise", 0],
      [".foot", "up", 0],
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
      const word = root.querySelector<HTMLElement>(".word");
      if (word) {
        word.classList.add("typing");
        const caret = document.createElement("span");
        caret.className = "caret";
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

  return (
    <div className="mag-root" ref={rootRef}>
      <div className="page">
        {/* ── masthead ── */}
        <header className="masthead">
          <nav>
            <a href="#why">왜</a>
            <span className="sep">·</span>
            <a href="#how">작동 방식</a>
            <span className="sep">·</span>
            <a href="#get">시작</a>
          </nav>
        </header>

        {/* ── giant wordmark ── */}
        <div className="word">
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
        <section className="hero">
          <div className="lead">
            <h1>정답을 주지 않는다</h1>
            <p className="dek">지금 아는 것에서 출발해, 질문을 따라 스스로 이해에 이르는 대화형 학습.</p>
          </div>
          <aside className="toc">
            <div className="toc-row">
              <span className="n">01</span>
              <span className="t">정답을 주지 않는 수업</span>
            </div>
            <div className="toc-row">
              <span className="n">02</span>
              <span className="t">스레드는 왜 비싼가 - 대화 전문</span>
            </div>
            <div className="toc-row">
              <span className="n">03</span>
              <span className="t">네 단계 학습법</span>
            </div>
            <div className="toc-row">
              <span className="n">04</span>
              <span className="t">깊이 조절 모드</span>
            </div>
            <div className="toc-new">
              <div className="h">
                <b>New</b> 무료 체험
              </div>
              <p>결제 없이 지금 바로 첫 학습을 시작하세요.</p>
            </div>
          </aside>
        </section>

        {/* ── FEATURE ── */}
        <div className="shead">
          <span className="kick">Feature</span>
        </div>
        <section className="feature">
          <div className="body">
            <h2>
              설명을 듣는 것이 아니라,
              <br />
              스스로 설명하게 되는 학습
            </h2>
            <div className="cols">
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
          <aside className="where">
            <span className="k">Where it starts</span>
            <span className="big">1</span>
            <span className="cap">개념 하나면 시작된다</span>
          </aside>
        </section>

        {/* ── INTERVIEW ── */}
        <div className="shead">
          <span className="kick">Interview</span>
        </div>
        <section className="sec itv">
          <h2>정답 대신 질문으로. 스레드가 왜 비싼지를 둘러싼 한 토막.</h2>
          <div className="itv-grid">
            <div className="l">
              <div className="qa">
                <p className="q">
                  <span className="m">Q</span>스레드 하나를 만들 때 OS는 무엇을 미리 확보하나요?
                </p>
                <p className="a">
                  <span className="m">A</span>콜 스택을 위한 메모리요.
                </p>
              </div>
              <div className="qa">
                <p className="q">
                  <span className="m">Q</span>그럼 스레드가 1만 개면 그 메모리는 얼마가 될까요?
                </p>
                <p className="a">
                  <span className="m">A</span>스레드당 약 1MB니까… 약 10GB요.
                </p>
              </div>
            </div>
            <div className="r">
              <div className="qa">
                <p className="q">
                  <span className="m">Q</span>바로 그 지점이에요. 그래서 코루틴이 필요합니다.
                </p>
              </div>
              <div className="pull">
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
        <div className="shead" id="why" />
        <section className="sec why">
          <h2>설명을 쌓는 대신, 아는 곳에서 시작한다</h2>
          <div className="why-grid">
            <div className="why-col old">
              <div className="ch">기존의 강의</div>
              <ul>
                <li>
                  <span className="s">-</span>설명을 일방적으로 쏟아붓는다
                </li>
                <li>
                  <span className="s">-</span>모두에게 같은 진도로 간다
                </li>
                <li>
                  <span className="s">-</span>읽고 넘어가면 이해로 친다
                </li>
                <li>
                  <span className="s">-</span>답을 외운다
                </li>
              </ul>
            </div>
            <div className="why-col new">
              <div className="ch">소크라틱 학습</div>
              <ul>
                <li>
                  <span className="s">→</span>질문으로 스스로 답에 이른다
                </li>
                <li>
                  <span className="s">→</span>지금 수준에서 시작한다
                </li>
                <li>
                  <span className="s">→</span>직접 답하며 확인한다
                </li>
                <li>
                  <span className="s">→</span>스스로 설명하게 된다
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <div className="how-head" id="how">
          <span className="kick l">
            <span className="n">03</span>작동 방식
          </span>
          <span className="kick">How it works</span>
        </div>
        <section className="how-grid">
          <div className="how-cell">
            <span className="num">01</span>
            <h3>수준 확인</h3>
            <p>몇 가지 질문으로 지금 아는 만큼을 가늠한다.</p>
          </div>
          <div className="how-cell">
            <span className="num">02</span>
            <h3>단계 제시</h3>
            <p>개념을 작은 단계로 나눠 학습 순서를 그린다.</p>
          </div>
          <div className="how-cell on">
            <span className="num">03</span>
            <h3>학습 진행</h3>
            <p>설명을 읽고, 직접 답하며 이해를 확인한다.</p>
          </div>
          <div className="how-cell">
            <span className="num">04</span>
            <h3>완료</h3>
            <p>무엇을 알게 됐는지 정리한다.</p>
          </div>
        </section>

        {/* ── GET STARTED ── */}
        <section className="get" id="get">
          <div className="in">
            <h2>
              개념 한 줄로
              <br />
              지금 시작하세요.
            </h2>
            <p className="dek">계정도, 준비물도 필요 없어요. 궁금한 개념 한 줄이면 됩니다. 지금 만나는 실제 화면입니다.</p>
            <figure className="mag-shot">
              <figcaption>
                <span className="dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="u">socratic.learn</span>
              </figcaption>
              <img src="/landing-app-shot.jpg" alt="Socratic 학습 화면 미리보기" />
            </figure>
          </div>
        </section>

        {/* ── footer ── */}
        <footer className="foot">
          <span className="mid">- 08 -</span>
          <span>© 2026 · 왜 · 작동 방식 · 시작</span>
        </footer>
      </div>
    </div>
  );
}
