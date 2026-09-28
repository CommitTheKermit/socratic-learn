import { useState } from "react";
import { Link } from "react-router-dom";
import "./magazine.css";

const LEARNING_SCREENS = [
  {
    label: "설명 읽기",
    src: "/screens/stage-learn.png",
    alt: "안드로이드 학습 화면. 앱이 화면에 뜨는 원리를 설명과 코드로 학습합니다.",
    caption: "개념 하나를 설명과 코드로 살펴봅니다. 막히는 부분은 질문하거나 선행 개념으로 돌아갈 수 있어요.",
  },
  {
    label: "직접 답하기",
    src: "/screens/stage-questions.png",
    alt: "확인 질문 화면. Activity와 레이아웃의 역할을 자기 말로 설명한 답변 예시입니다.",
    caption: "읽은 내용을 자기 말로 설명해 봅니다. 답변을 제출하면 AI 피드백을 받을 수 있어요.",
  },
  {
    label: "수준 확인하기",
    src: "/screens/stage-probe.png",
    alt: "학습을 시작하기 전 현재 이해 정도를 확인하는 질문 화면입니다.",
    caption: "학습은 몇 가지 질문에서 시작합니다. 지금 아는 내용을 바탕으로 학습 순서와 설명 깊이를 맞춰요.",
  },
];

function LearningPreview() {
  const [selected, setSelected] = useState(0);
  const screen = LEARNING_SCREENS[selected];

  return (
    <figure className="lp-preview">
      <div className="lp-preview-heading">
        <span>실제 학습 화면</span>
        <span>안드로이드 학습 예시</span>
      </div>
      <div className="lp-preview-controls" aria-label="학습 화면 선택">
        {LEARNING_SCREENS.map((item, index) => (
          <button
            key={item.src}
            type="button"
            aria-pressed={selected === index}
            aria-controls="learning-preview-image"
            onClick={() => setSelected(index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {/* 원본 화면의 색과 비율을 유지해 소개 페이지와 실제 제품의 차이를 숨기지 않는다. */}
      <div className="lp-screen" id="learning-preview-image">
        <img src={screen.src} alt={screen.alt} />
      </div>
      <figcaption>
        <p aria-live="polite">{screen.caption}</p>
        <a href={screen.src} target="_blank" rel="noreferrer">화면 크게 보기<span className="lp-sr-only"> (새 탭)</span></a>
      </figcaption>
    </figure>
  );
}

/** /landing 전용 소개 화면. 시작 링크는 기존 홈으로 연결하고 학습 상태는 만들지 않는다. */
export function MagazineLanding() {
  return (
    <div className="lp-root">
      <a className="lp-skip" href="#landing-main">본문으로 건너뛰기</a>
      <header className="lp-header lp-container">
        <Link to="/landing" className="lp-brand" aria-label="Socratic 소개 페이지">Socratic<span>질문하며 배우기</span></Link>
        <nav aria-label="서비스 소개">
          <a className="lp-about-link" href="#how-it-works">학습 방법</a>
          <Link to="/" className="lp-header-start">학습 시작하기</Link>
        </nav>
      </header>

      <main id="landing-main">
        <section className="lp-intro lp-container" aria-labelledby="landing-title">
          <LearningPreview />
          <div className="lp-intro-copy">
            <h1 id="landing-title">읽으면 알겠는데,<br />설명하려면<br className="lp-desktop-break" /> 막히나요?</h1>
            <p className="lp-lead">개발 개념을 직접 설명해 보세요.<br />Socratic이 질문과 답변 피드백으로<br className="lp-desktop-break" /> 이해를 점검하도록 도와드려요.</p>
            <Link to="/" className="lp-button">개념 하나 시작하기</Link>
            <p className="lp-start-note">회원가입 없이 시작할 수 있어요.</p>
            <a className="lp-text-link" href="#how-it-works">어떻게 학습하는지 살펴보기</a>
          </div>
        </section>

        <section className="lp-explanation lp-container" id="how-it-works" aria-labelledby="how-title">
          <div className="lp-section-intro">
            <h2 id="how-title">아는 것과 설명할 수 있는 것.<br />그 사이를 함께 공부해요.</h2>
            <p>읽을 때는 익숙했던 개념도 직접 설명하면 빈틈이 보여요. 그 지점에서 다음 질문을 이어갑니다.</p>
          </div>
          <ol className="lp-steps">
            <li><h3>지금 아는 것에서 출발해요</h3><p>배우고 싶은 개념을 입력하고 수준 확인 질문에 답해요. 처음 접하는 내용이라면 모른다고 답해도 괜찮아요.</p></li>
            <li><h3>한 번에 개념 하나씩 살펴봐요</h3><p>작은 단계로 나눈 설명을 읽고 확인 질문에 직접 답해요. 이해가 안 되는 부분은 추가로 질문할 수 있어요.</p></li>
            <li><h3>답변을 돌아보고 이어가요</h3><p>AI 피드백에서 보완할 부분을 확인해요. 필요한 개념을 더 공부하거나 다음 단계로 넘어갈 수 있어요.</p></li>
          </ol>
        </section>

        <section className="lp-invitation" aria-labelledby="invitation-title">
          <div className="lp-container lp-invitation-inner">
            <div>
              <h2 id="invitation-title">오늘 헷갈렸던 개념 하나면 충분해요.</h2>
              <p>코루틴과 스레드의 차이, 액티비티 생명주기, 의존성 주입.<br />공부하다 멈췄던 곳에서 시작해 보세요.</p>
            </div>
            <Link to="/" className="lp-button">내가 궁금한 개념으로 시작</Link>
          </div>
        </section>

        <section className="lp-questions lp-container" aria-labelledby="questions-title">
          <h2 id="questions-title">시작하기 전에 궁금한 것</h2>
          <div>
            <details><summary>안드로이드만 공부할 수 있나요?</summary><p>다른 개발 개념도 직접 입력할 수 있어요. 무엇부터 공부할지 고민된다면 홈에 준비된 안드로이드 로드맵에서 시작해 보세요.</p></details>
            <details><summary>로그인해야 하나요?</summary><p>회원가입 없이 학습을 시작할 수 있어요. 기기 간에 학습 기록을 이어가고 싶다면 GitHub로 로그인해 주세요.</p></details>
            <details><summary>AI의 설명과 평가는 항상 정확한가요?</summary><p>설명과 평가에는 오류가 있을 수 있어요. 중요한 내용은 공식 문서와 함께 확인해 주세요. 이상한 피드백을 발견하면 서비스 안의 피드백 링크로 알려주세요.</p></details>
          </div>
        </section>
      </main>

      <footer className="lp-footer lp-container">
        <span>Socratic · 질문하며 배우는 개발 개념</span>
        <a href="mailto:commit3921@gmail.com?subject=Socratic%20Learn%20피드백">의견 보내기</a>
      </footer>
    </div>
  );
}
