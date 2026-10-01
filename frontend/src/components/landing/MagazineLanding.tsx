import { LanguageSelector } from "../LanguageSelector";
import { t } from "../../i18n/translate";
import { useState } from "react";
import { Link } from "react-router-dom";
import { I } from "../icons";
import "./magazine.css";

const LEARNING_SCREENS = [
  {
    label: t("설명 읽기"),
    src: "/screens/stage-learn.png",
    alt: t("안드로이드 학습 화면. 앱이 화면에 뜨는 원리를 설명과 코드로 학습합니다."),
    caption: t("개념 하나를 설명과 코드로 살펴봅니다. 막히는 부분은 질문하거나 선행 개념으로 돌아갈 수 있어요."),
  },
  {
    label: t("직접 답하기"),
    src: "/screens/stage-questions.png",
    alt: t("확인 질문 화면. Activity와 레이아웃의 역할을 자기 말로 설명한 답변 예시입니다."),
    caption: t("읽은 내용을 자기 말로 설명해 봅니다. 답변을 제출하면 AI 피드백을 받을 수 있어요."),
  },
  {
    label: t("수준 확인하기"),
    src: "/screens/stage-probe.png",
    alt: t("학습을 시작하기 전 현재 이해 정도를 확인하는 질문 화면입니다."),
    caption: t("학습은 몇 가지 질문에서 시작합니다. 지금 아는 내용을 바탕으로 학습 순서와 설명 깊이를 맞춰요."),
  },
];

function LearningPreview() {
  const [selected, setSelected] = useState(0);
  const screen = LEARNING_SCREENS[selected];

  return (
    <figure className="ep-preview">
      <div className="ep-preview-heading">
        <span>{t("실제 학습 화면")}</span>
        <span>{t("안드로이드 학습 예시")}</span>
      </div>
      <div className="ep-preview-controls" aria-label={t("학습 화면 선택")}>
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
      <div className="ep-screen" id="learning-preview-image">
        <img src={screen.src} alt={screen.alt} />
      </div>
      <figcaption>
        <p aria-live="polite">{screen.caption}</p>
        <a href={screen.src} target="_blank" rel="noreferrer">{t("화면 크게 보기")}<span className="ep-sr-only"> {" "}{t("(새 탭)")}</span></a>
      </figcaption>
    </figure>
  );
}

const TOPICS = [
  { title: t("액티비티 생명주기"), tag: "Android", code: "onCreate()\nonStart()\nonResume()", description: t("화면을 나갔다 돌아오면 어떤 함수가 호출될까요?") },
  { title: t("코루틴과 스레드"), tag: "Kotlin", code: "launch {\n  delay(1000)\n  loadData()\n}", description: t("일시 중단된 동안 스레드는 무엇을 할까요?") },
  { title: t("상태와 재구성"), tag: "Compose", code: "var count by remember {\n  mutableStateOf(0)\n}", description: t("값 하나가 바뀌면 화면의 어디가 다시 그려질까요?") },
  { title: t("의존성 주입"), tag: "Architecture", code: "class ViewModel(\n  val repository: Repository\n)", description: t("객체를 안에서 만들지 않고 밖에서 받는 이유는 뭘까요?") },
];

function LearningPath() {
  return (
    <div className="ep-path" role="img" aria-label={t("학습 순서 예시: 현재 이해도를 확인하고 프로세스, 스레드, 비동기 처리의 기초를 살펴본 뒤 코루틴을 학습하고 직접 설명합니다.")}>
      {/* 선은 아래 노드의 중심을 연결한다. 예시 경로이며 사용자의 실제 진도를 나타내지 않는다. */}
      <svg viewBox="0 0 900 440" preserveAspectRatio="none" aria-hidden="true"><path d="M450 38 L150 158 L450 398 M450 38 L450 158 L450 278 L450 398 M450 38 L750 158 L750 278 L450 398" /></svg>
      <span className="ep-path-start">{t("현재 이해도 확인")}</span>
      <span className="ep-path-left">{t("프로세스")}</span><span className="ep-path-center">{t("스레드")}</span><span className="ep-path-right">{t("비동기 처리")}</span>
      <span className="ep-path-middle">{t("블로킹과 일시 중단")}</span><span className="ep-path-side">{t("코루틴")}</span>
      <span className="ep-path-end">{t("내 말로 설명하기")}</span>
    </div>
  );
}

/** 레퍼런스의 정보 순서만 가져오고 색상과 서체는 앱의 공통 토큰을 사용한다. */
export function MagazineLanding() {
  return (
    <div className="ep-root">
      <a className="ep-skip" href="#landing-main">{t("본문으로 건너뛰기")}</a>
      <header className="ep-header">
        <Link className="ep-brand" to="/landing"><span className="sb-brand-mark" aria-hidden="true">{I.brand}</span>Socratic</Link>
        <LanguageSelector />
        <nav aria-label={t("소개 페이지 메뉴")}><a href="#topics">{t("학습 주제")}</a><a href="#about">{t("학습 방법")}</a><a href="#faq">{t("궁금한 점")}</a><Link className="ep-login" to="/">{t("이어서 공부하기")}</Link><Link className="ep-button" to="/">{t("시작하기")}</Link></nav>
      </header>
      <main id="landing-main">
        <section className="ep-hero">
          <h1>{t("공부하다 막힌 개념을")}<br />{t("가져오세요.")}</h1>
          <Link className="ep-button" to="/">{t("개념 하나 공부하기")}{" "}<span aria-hidden="true">→</span></Link>
          <p>{t("회원가입 없이 시작할 수 있어요.")}</p>
        </section>

        <section className="ep-about" id="about">
          <div className="ep-intro">
            <p>{t("설명을 읽을 때는 알겠는데, 막상 말하려면 막히는 개념이 있죠. Socratic에서는 설명을 읽은 다음")}{" "}<strong>{t("질문에 직접 답해 봅니다.")}</strong> {" "}{t("AI가 답변을 보고 빠진 내용이나 잘못 이해한 부분을 짚어줍니다.")}</p>
            <aside><p>{t("“코루틴이 멈춰 있는 동안")}<br />{t("스레드는 뭘 하나요?”")}</p><span>{t("코루틴을 공부할 때 나올 수 있는 질문")}</span></aside>
          </div>
          <div className="ep-explanation"><h2>{t("읽고 나서, 답해 보세요.")}</h2><p>{t("처음에는 지금 아는 내용을 물어봅니다. 그 답변을 바탕으로 학습 순서를 정하고 개념을 나눠 설명합니다. 어렵다면 추가로 질문하거나 선행 개념부터 살펴볼 수 있어요.")}</p></div>
        </section>

        <section className="ep-demo" id="demo">
          <div className="ep-section-heading"><h2>{t("이렇게 공부합니다.")}</h2><p>{t("안드로이드 개념을 공부하는 실제 화면입니다.")}<br />{t("아래 버튼을 눌러 설명과 질문 화면을 살펴보세요.")}</p></div>
          <LearningPreview />
        </section>

        <section className="ep-roadmap">
          <div className="ep-roadmap-intro"><p>{t("모르는 용어가 또 나오면, 그 개념부터.")}<br />{t("이미 아는 내용이라면 다음으로 넘어가면 됩니다.")}</p><p className="ep-note">{t("학습 중 선행 개념을 따로 살펴보고 원래 공부하던 내용으로 돌아올 수 있어요.")}</p></div>
          <h2>{t("어디서부터 볼지 같이 정합니다.")}</h2><p className="ep-lead">{t("코루틴을 공부할 때의 학습 순서 예시")}</p>
          <LearningPath />
          <p className="ep-note">{t("실제 학습 순서는 입력한 개념과 수준 확인 답변에 따라 달라집니다.")}</p>
        </section>

        <section className="ep-topics" id="topics">
          <h2>{t("오늘 공부할 개념이 있나요?")}</h2><p className="ep-lead">{t("직접 입력해도 되고 홈의 안드로이드 로드맵에서 골라도 됩니다.")}</p>
          <div className="ep-topic-grid">{TOPICS.map(topic => <Link className="ep-topic" to="/" key={topic.title}><div className="ep-topic-code"><pre aria-hidden="true">{topic.code}</pre><span>{topic.tag}</span></div><div className="ep-topic-body"><h3>{topic.title}</h3><p>{topic.description}</p><span>{t("홈에서 학습 주제 선택하기")}</span></div></Link>)}</div>
        </section>

        <section className="ep-faq" id="faq"><h2>{t("시작하기 전에")}</h2>
          <details><summary>{t("안드로이드만 공부할 수 있나요?")}</summary><p>{t("다른 개발 개념도 직접 입력할 수 있습니다. 홈의 로드맵은 안드로이드 주제로 준비되어 있어요.")}</p></details>
          <details><summary>{t("답을 모르겠으면 어떻게 하나요?")}</summary><p>{t("모르겠다고 답하거나 질문을 건너뛸 수 있어요. 공부하다 막히면 추가 질문을 하거나 선행 개념을 살펴보세요.")}</p></details>
          <details><summary>{t("공부한 기록은 남나요?")}</summary><p>{t("같은 브라우저에서 학습 기록을 다시 볼 수 있어요. 다른 기기에서도 이어서 공부하려면 GitHub로 로그인해 주세요.")}</p></details>
          <details><summary>{t("AI의 설명이 틀릴 수도 있나요?")}</summary><p>{t("네. 설명과 답변 평가에 오류가 있을 수 있습니다. 중요한 내용은 공식 문서와 함께 확인해 주세요.")}</p></details>
        </section>

        <section className="ep-start"><h2>{t("방금 헷갈렸던 개념부터.")}</h2><p>{t("긴 질문이 아니어도 괜찮아요. ‘의존성 주입’처럼 개념 이름만 적어보세요.")}</p><Link className="ep-button" to="/">{t("공부 시작하기")}{" "}<span aria-hidden="true">→</span></Link></section>
      </main>
      <footer className="ep-footer"><Link className="ep-brand" to="/landing">Socratic</Link><a href="mailto:commit3921@gmail.com">{t("의견 보내기")}</a><a href="#landing-main">{t("맨 위로")}</a></footer>
    </div>
  );
}
