# 드로워 오버레이 디자인 프롬프트 - 좁은 화면에서 사이드바 재오픈

Claude(claude.ai / Artifacts)에 아래 "그대로 붙여넣기" 블록을 입력해, 좁은 화면에서
자동으로 닫힌 드로워를 다시 열 수 있는 트리거 + 오버레이 드로워 시안을 받는다.
결과는 React 18 + TSX + className + CSS 변수 기반으로 받아 본 레포
`src/App.tsx` / `src/components/Sidebar.tsx` / `src/styles/v3.css` 에 통합한다.

---

## 컨텍스트 (그대로 붙여넣기)

socratic-learn 은 사용자가 입력한 개념에 대해 LLM 이 학습 로드맵을 만들고, 각 단계에서
설명 -> 확인 질문 -> 답변 -> 평가를 반복하는 학습 웹앱이다. React 18 + TypeScript + Vite.
스타일은 외부 UI 라이브러리 없이 단일 CSS 파일(`v3.css`) + CSS 변수 + className 으로 한다.

### 화면 셸 구조 (이미 구현됨)

좌측에 사이드바(드로워), 우측에 본문이 있는 2단 셸이다.

```
.app  (display: grid; grid-template-columns: var(--sidebar-w) 1fr; height: 100vh)
  .sidebar   (--sidebar-w: 260px. 브랜드 + 접기버튼 + nav(새로 학습하기/아카이브/폴더)
              + 학습 히스토리 리스트 + 하단 사용자 푸터(로그인/로그아웃))
  main.main  (.aurora 배경 글로우 + ProgressBar + .main-inner > .lv-board)
             학습 단계(가로 모드)에서는 .lv-board 안이 좌(개념 설명)·우(확인 질문) 2단 컬럼
```

열림/닫힘은 `.app` 의 data 속성과 CSS 로만 제어한다(이미 구현됨):

```css
.app[data-sidebar="collapsed"] { grid-template-columns: 0 1fr; }
.app[data-sidebar="collapsed"] .sidebar { transform: translateX(-100%); opacity: 0; }
.sidebar { transition: transform .25s ease, opacity .25s ease; }
```

상태는 React 에서 관리한다:

```tsx
// App.tsx - 창 너비에 양방향 반응. <=1024px 면 자동으로 닫고, >1024px 면 자동으로 연다.
const [sidebarCollapsed, setSidebarCollapsed] = useState(
  () => window.matchMedia("(max-width: 1024px)").matches,
);
useEffect(() => {
  const mql = window.matchMedia("(max-width: 1024px)");
  const onChange = (e: MediaQueryListEvent) => setSidebarCollapsed(e.matches);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}, []);

// 사이드바 안에 "접기" 버튼(.sb-collapse, aria-label="사이드바 접기")만 있고,
// onToggleCollapse 로 setSidebarCollapsed((v) => !v) 를 호출한다.
```

### 디자인 토큰 (이미 존재. 새 색/폰트 만들지 말 것)

- 폰트: `--font-sans`(Pretendard), `--font-mono`(JetBrains Mono)
- 색/선: `--bg`, `--fg`, `--fg-mut`, `--fg-dim`, `--line`, `--line-2`
- 강조: `--holo`(브랜드 마크 그라데이션), `--holo-on`
- 라운드: `--radius-sm`, `--radius-lg`(14px), `--radius-xl`(22px)
- 폭: `--sidebar-w`(260px)
- 톤: 차분한 다크 배경, 얇은 보더로 구획, 은은한 aurora 글로우. 과한 채도/그림자 금지.

## 풀려는 문제

창이 1024px 이하로 줄면 드로워가 자동으로 닫히는데, **다시 여는 트리거가 없다.**
접기 버튼(`.sb-collapse`)이 드로워 내부에 있어서, 닫히면 화면 밖으로 같이 사라지기 때문이다.
좁은 화면에서는 본문(컬럼)이 이미 폭을 꽉 쓰므로, 드로워를 다시 열 때 기존처럼
grid 한 칸을 차지해 본문을 밀어내면 컬럼이 또 좁아진다.

따라서 좁은 화면에서는 드로워를 **본문 컬럼 위에 오버레이로 띄우고 싶다.**

## 만들어 줄 것

### 1. 드로워 열기 트리거 버튼

- 드로워가 닫혀 있을 때 **항상 보이는** 작은 트리거(패널/햄버거 아이콘, `aria-label="사이드바 열기"`).
- 위치: 본문 상단 좌측(ProgressBar / 학습 상단바 `.lv-bar` 의 가장 왼쪽). 본문 콘텐츠를
  가리지 않게 작게. 드로워가 열리면 숨기거나 닫기 버튼으로 전환.
- 인라인 SVG 아이콘 1개. 기존 `.sb-collapse` 와 시각 언어(크기 ~26px, 호버 시 `--line-2` 배경)를 맞춘다.

### 2. 좁은 화면(<=1024px) 오버레이 드로워

- 드로워를 열면 grid 칸을 차지하지 않고 **본문 컬럼 위에 떠서(position: fixed/absolute, 좌측에서 슬라이드 인)** 나타난다. 본문 레이아웃은 밀리지 않는다.
- 드로워 뒤에 **스크림(backdrop)** 을 깔아 본문을 살짝 어둡게(약한 반투명 + 선택적 미세 blur). 스크림 클릭 시 닫힘.
- 닫는 방법: (a) 스크림 클릭, (b) `Esc` 키, (c) nav 항목/세션 선택 시 자동 닫힘, (d) 드로워 안 닫기 버튼.
- 모션: 슬라이드(translateX) + 페이드, 200~250ms ease. 기존 `.sidebar` 트랜지션과 동일 감각.
- 접근성: 오버레이가 열리면 포커스를 드로워로 이동(`role="dialog"` `aria-modal="true"`), `Esc` 로 닫고, 닫힐 때 트리거 버튼으로 포커스 복귀. 가능하면 포커스 트랩.

### 3. 넓은 화면(>1024px)은 기존 동작 유지

- 넓은 화면에서는 드로워가 지금처럼 **grid 한 칸(인라인)** 으로 본문과 나란히 있고, 토글 시
  폭이 0 으로 접힌다. **스크림 없음, 오버레이 아님.**
- 즉 **같은 드로워가 폭에 따라 "인라인(넓음) <-> 오버레이(좁음)" 두 모드로 동작**해야 한다.
  이 모드 분기를 어떻게 표현할지(예: `.app[data-sidebar-mode="overlay"]` 같은 추가 data 속성,
  또는 CSS 컨테이너/미디어쿼리) 가 이 시안의 핵심이다. App.tsx 의 matchMedia 결과를 그 분기에
  쓸 수 있다고 가정한다.

## 출력 형식

- **CSS**: `v3.css` 에 추가할 규칙들(오버레이 드로워, 스크림, 트리거 버튼, 모드 분기). 기존
  `.app` / `.sidebar` 규칙은 최소 변경으로 확장하고, 새 색/폰트 만들지 말고 위 토큰만 사용.
- **TSX**: 변경/추가가 필요한 최소 조각만. (a) 트리거 버튼 마크업 + 아이콘, (b) 스크림 엘리먼트,
  (c) `Esc`/포커스/모드 분기에 필요한 상태·이벤트 핸들러. 기존 `sidebarCollapsed` 상태와
  `data-sidebar` 속성을 재사용하고, 필요하면 모드용 속성/상태를 1개만 더 둔다.
- React 만 사용(외부 라이브러리/상태관리 추가 금지). 컴포넌트는 함수형 + TS.
- 모드 분기 동작을 짧은 글로 함께 설명(넓음=인라인 push, 좁음=오버레이+스크림).

## 안 할 것

- 새 색 팔레트/폰트/그림자 시스템 도입
- 화려한 애니메이션(스프링 바운스 등), 라이브러리 기반 모달
- 모바일 전용 별도 화면, 온보딩/랜딩 일러스트
- 넓은 화면에서 스크림이나 오버레이를 띄우는 것(넓은 화면은 기존 push 유지)
- 드로워 내부 정보구조(nav 항목/히스토리/푸터) 재설계 - 컨테이너 동작만 바꾼다

---

## 후속 적용 메모

- App.tsx 의 `matchMedia("(max-width: 1024px)")` 결과로 "오버레이 모드 여부"를 판단해
  `.app` 에 모드 속성을 부여한다.
- 좁은 화면 오버레이에서 nav/세션 선택(`onNewSession`/`onSelectSession`) 직후 드로워를 자동으로 닫는다.
- 트리거 버튼의 `aria-label` 은 "사이드바 열기", 닫기는 기존 "사이드바 접기" 를 재사용한다.
- 통합 후 `Sidebar.test.tsx`(접기 버튼/항목 렌더 검증)와 자동 열닫힘 동작(matchMedia)이
  깨지지 않는지 확인한다.
