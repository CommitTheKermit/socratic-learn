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

function LearningBoard() {
  return (
    <figure className="bc-board-wrap">
      <div className="bc-board">
        <div className="bc-board-title">코루틴과 스레드 공부하기 <span aria-hidden="true">☆</span></div>
        <div className="bc-board-grid">
          <div className="bc-board-feature"><h3>현재 이해도</h3><div className="bc-mini bc-diagnosis"><span className="bc-mini-label">시작 전 질문</span><strong>스레드가 기다리는 동안,<br />다른 일을 할 수 있을까요?</strong><p>아는 만큼 편하게 답해 주세요.</p><div className="bc-mini-answer">“아직 잘 모르겠어요.”</div><span className="bc-mini-note">괜찮아요. 기초부터 살펴봐요.</span></div></div>
          <div className="bc-board-feature"><h3>학습 로드맵</h3><div className="bc-mini bc-roadmap"><ol><li><span>01</span>프로세스와 스레드</li><li><span>02</span>블로킹과 대기</li><li className="bc-current"><span>03</span>코루틴의 일시 중단</li><li><span>04</span>다시 실행되는 순간</li></ol><p>개념을 작은 단계로 나눠서</p></div></div>
          <div className="bc-board-feature"><h3>개념 설명</h3><div className="bc-mini"><strong>기다리는 방법의 차이</strong><p>코루틴이 일시 중단되면 스레드는 다른 작업을 실행할 수 있어요.</p><pre><code>{'delay(1000)\n// 코루틴을 일시 중단'}</code></pre><span className="bc-mini-note">설명과 코드로 하나씩 살펴보기</span></div></div>
          <div className="bc-board-feature"><h3>내 답변과 피드백</h3><div className="bc-mini"><div className="bc-answer-line"><span>내 답변</span><p>코루틴은 기다리는 동안 스레드를 놓아줘요.</p></div><div className="bc-feedback-line"><span>피드백 예시</span><p>좋아요. 그럼 다시 실행될 때도 같은 스레드일까요?</p></div></div></div>
          <div className="bc-board-feature"><h3>막히면 한 걸음 뒤로</h3><div className="bc-mini bc-prereq"><strong>먼저 알아두면 좋은 개념</strong><div>프로세스</div><span aria-hidden="true">↓</span><div>스레드</div><span aria-hidden="true">↓</span><div className="bc-current">코루틴</div></div></div>
          <div className="bc-board-feature"><h3>이어지는 학습</h3><div className="bc-mini bc-history"><p><span aria-hidden="true">✓</span> 프로세스와 스레드</p><p><span aria-hidden="true">✓</span> 블로킹과 대기</p><p><span aria-hidden="true">◉</span> 코루틴의 일시 중단</p><div className="bc-history-note">잠깐 쉬어도 괜찮아요.<br />기록에서 다시 이어가세요.</div></div></div>
        </div>
        <div className="bc-board-bottom"><span>배우고 싶은 다른 개념</span><p>액티비티 생명주기 <b>·</b> 의존성 주입 <b>·</b> 상태와 재구성</p></div>
      </div>
      {/* 실제 앱의 스크린샷과 편집한 설명용 보드를 명확하게 구분한다. */}
      <figcaption>학습 흐름을 재구성한 예시입니다. <a href="#demo">실제 화면 보기</a></figcaption>
    </figure>
  );
}

function LearningPreview() {
  const [selected, setSelected] = useState(0);
  const screen = LEARNING_SCREENS[selected];

  return (
    <figure className="bc-preview">
      <div className="bc-preview-heading">
        <span>실제 학습 화면</span>
        <span>안드로이드 학습 예시</span>
      </div>
      <div className="bc-preview-controls" aria-label="학습 화면 선택">
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
      <div className="bc-screen" id="learning-preview-image">
        <img src={screen.src} alt={screen.alt} />
      </div>
      <figcaption>
        <p aria-live="polite">{screen.caption}</p>
        <a href={screen.src} target="_blank" rel="noreferrer">화면 크게 보기<span className="bc-sr-only"> (새 탭)</span></a>
      </figcaption>
    </figure>
  );
}

/** /landing 전용. 제품 소개의 모든 시작 동작은 기존 홈으로 연결한다. */
export function MagazineLanding() {
  return (
    <div className="bc-root">
      <a className="bc-skip" href="#landing-main">본문으로 건너뛰기</a>
      <header className="bc-header">
        <Link className="bc-return" to="/">학습하던 곳으로 돌아가기</Link>
        <Link className="bc-brand" to="/landing" aria-label="Socratic 소개 페이지"><span aria-hidden="true">S</span></Link>
        <Link className="bc-top-start" to="/">처음 오셨나요? 바로 시작하기</Link>
      </header>
      <main className="bc-main" id="landing-main">
        <section className="bc-hero" aria-labelledby="landing-title">
          <LearningBoard />
          <div className="bc-hero-content">
            <nav className="bc-directory" aria-label="Socratic 둘러보기">
              <p><Link to="/">바로 시작하기</Link><span>회원가입 없이 개념 하나부터</span></p>
              <p><a href="#letter">왜 Socratic인가요?</a><span>읽고 끝나는 공부가 아쉬웠다면</span></p>
              <p><a href="#how">학습 방법</a><span>설명하고, 답하고, 다시 생각하기</span></p>
              <p><a href="#demo">실제 화면 둘러보기</a><span>어떻게 배우는지 먼저 살펴보세요</span></p>
              <p><a href="#topics">안드로이드 로드맵</a><span>무엇부터 배울지 고민될 때</span></p>
              <p><a href="#questions">궁금한 점</a><span>로그인, 학습 기록, AI 피드백</span></p>
              <p><a href="mailto:commit3921@gmail.com">만든 사람에게</a><span>불편했던 점도 편하게 알려주세요</span></p>
            </nav>
            <div className="bc-hero-actions">
              <Link className="bc-button" to="/">Socratic 시작하기</Link>
              <span className="bc-or">또는</span>
              <a className="bc-tour" href="#demo"><span className="bc-tour-thumb"><img src="/screens/stage-learn.png" alt="" /><span aria-hidden="true">↗</span></span><span><strong>학습 화면 먼저 보기</strong><small>설명부터 직접 답하기까지</small></span></a>
            </div>
            <h1 id="landing-title">읽으면 아는 개념을,<br />내 말로 설명할 수 있게.<br />질문하며 배우는<br />Socratic입니다.</h1>
          </div>
        </section>

        <article className="bc-letter" id="letter" aria-label="Socratic을 소개합니다">
          <p>안녕하세요.</p><p>혹시 이런 순간이 익숙한가요?</p>
          <p>강의를 보고, 글을 읽고, 코드를 따라 쳤습니다. 읽을 때는 분명 이해한 것 같았는데, 누군가 “그래서 그게 뭐야?”라고 물으면 어디서부터 설명해야 할지 막힙니다.</p>
          <p>다시 검색하면 또 익숙한 설명이 나옵니다. 고개는 끄덕여지지만, <strong>정말 내가 이해한 건지 확인할 기회</strong>는 좀처럼 생기지 않습니다.</p>
          <p>Socratic에서는 잠깐 멈춰 직접 답해 봅니다. 지금 아는 것을 확인하고, 개념을 작게 나누고, 설명을 읽은 뒤 자기 말로 풀어봅니다. 막히는 곳이 있다면 그 지점에서 질문을 이어갑니다.</p>
          <p>처음부터 잘 답할 필요는 없습니다. “모르겠어요”도 출발점이 됩니다. 답변에 대한 AI 피드백을 살펴보며 더 알아볼 부분을 찾아가세요.</p>
          <p>오늘 공부하다가 헷갈렸던 개념 하나를 가져와 보세요.<br /><a href="#demo">실제 학습 화면</a>을 먼저 둘러보셔도 좋습니다.</p>
          <p>여러분의 다음 공부에 도움이 되길 바랍니다.</p>
          <div className="bc-signature">Socratic</div>
          <p className="bc-letter-signoff">질문하며 배우는 개발 개념<br /><a href="mailto:commit3921@gmail.com">만든 사람에게 의견 보내기</a></p>
        </article>

        <section className="bc-section bc-topics" id="topics">
          <h2>이런 개념에서 시작해 보세요.</h2>
          <p className="bc-section-lead">무엇부터 공부할지 막막하다면, 홈에 준비된 안드로이드 로드맵을 따라가 보세요.</p>
          <div className="bc-topic-grid">
            <div><span className="bc-topic-symbol" aria-hidden="true">{'{ }'}</span><h3>앱이 실행되는 원리</h3><p>액티비티 생명주기<br />앱 컴포넌트와 인텐트</p></div>
            <div><span className="bc-topic-symbol" aria-hidden="true">⇄</span><h3>기다리는 코드의 동작</h3><p>비동기 처리와 코루틴<br />Flow와 스레드 전환</p></div>
            <div><span className="bc-topic-symbol" aria-hidden="true">⌘</span><h3>함께 맞물리는 구조</h3><p>의존성 주입<br />앱 아키텍처 패턴</p></div>
          </div>
          <Link to="/" className="bc-inline-link">내가 공부할 개념 찾아보기</Link>
        </section>

        <section className="bc-section bc-how" id="how">
          <h2>배운 내용을 직접 설명하는 시간.<br />그렇게 한 단계씩 나아갑니다.</h2>
          <div className="bc-how-grid">
            <div><span>01</span><h3>지금 아는 것 확인하기</h3><p>몇 가지 질문에 답하며 시작해요. 아는 만큼을 바탕으로 학습 순서와 설명 깊이를 맞춥니다.</p></div>
            <div><span>02</span><h3>개념 하나씩 살펴보기</h3><p>설명과 코드를 읽고 직접 답해요. 어렵다면 선행 개념을 살펴보거나 추가 질문을 할 수 있어요.</p></div>
            <div><span>03</span><h3>피드백으로 돌아보기</h3><p>내 답변에서 보완할 부분을 확인해요. 더 공부할 내용을 선택하고 다음 단계로 이어갑니다.</p></div>
          </div>
        </section>

        <section className="bc-section bc-demo" id="demo">
          <h2>말로만 설명하면 아쉬우니까.<br />실제 화면을 보여드릴게요.</h2>
          <p className="bc-section-lead">아래 버튼을 눌러 학습 화면을 바꿔 보세요. 실제 서비스는 어두운 테마로 제공됩니다.</p>
          <LearningPreview />
          <Link className="bc-button" to="/">내가 궁금한 개념으로 시작하기</Link>
        </section>

        <section className="bc-section bc-questions" id="questions">
          <h2>시작하기 전에 궁금한 것들.</h2>
          <details><summary>안드로이드만 공부할 수 있나요?</summary><p>다른 개발 개념도 직접 입력할 수 있어요. 홈에는 안드로이드 학습 로드맵이 준비되어 있습니다.</p></details>
          <details><summary>로그인해야 하나요?</summary><p>회원가입 없이 학습을 시작할 수 있어요. 기기 간에 학습 기록을 이어가고 싶다면 GitHub로 로그인해 주세요.</p></details>
          <details><summary>답을 모르겠으면 어떻게 하나요?</summary><p>모르겠다고 답하거나 질문을 건너뛸 수 있어요. 학습 중 막히는 부분은 질문하거나 선행 개념부터 살펴볼 수 있습니다.</p></details>
          <details><summary>AI의 설명과 평가는 항상 정확한가요?</summary><p>설명과 평가에는 오류가 있을 수 있어요. 중요한 내용은 공식 문서와 함께 확인하고, 이상한 피드백은 아래 연락처로 알려주세요.</p></details>
        </section>

        <section className="bc-goodbye"><h2>오늘도, 하나 더 이해하는 하루.</h2><Link className="bc-button" to="/">Socratic 시작하기</Link><p>회원가입 없이 개념 하나부터 시작하세요.</p></section>
      </main>
      <footer className="bc-footer"><Link to="/landing">Socratic</Link><span>질문하며 배우는 개발 개념</span><a href="mailto:commit3921@gmail.com">의견 보내기</a></footer>
    </div>
  );
}
