# 현재 웹 구조 스냅샷 (디자인 핸드오프용)

`frontend/src/` 의 실제 React 앱을 **정적 단일 페이지**로 옮긴 디자인 전달용 프로토타입입니다.
API 호출/상태 저장 없이 mock 데이터로만 동작하며, 클래스명은 실제 코드와 1:1 동일해
실제 스타일(`styles.css` = 원본 `v3.css`, `branch.css`)이 그대로 적용됩니다.

## 여는 법

CDN React + Babel 을 `<script src>` 로 불러오므로 `file://` 직접 열기로는 JSX 가 로드되지 않습니다.
간단한 정적 서버로 띄우세요.

```bash
cd socratic-learn-web-calude-design/current-snapshot
python3 -m http.server 8799
# 브라우저에서 http://127.0.0.1:8799/index.html
```

## 화면 둘러보기 (우하단 디자인 툴바)

실제 앱에는 없는 보조 툴바입니다. 디자인 검토용으로만 넣었습니다.

- STAGE: `input → probe → learn → done` 4단계 직접 전환
- 사이드바 접기 / 채점 상태(질문 채점 결과 + 피드백 표시) 토글
- 분기 다이얼로그: 학습 평가 완료 후 다음 분기 선택 모달

## 파일

| 파일 | 내용 |
|------|------|
| `index.html` | 진입점 (CDN React 18 + Babel standalone) |
| `app.jsx` | 전 화면 컴포넌트 + mock 데이터 (실제 App/Sidebar/Hero/stages/BranchDialog 이식) |
| `styles.css` | `frontend/src/styles/v3.css` 복사본 (원본) |
| `branch.css` | `frontend/src/components/branch/branch.css` 복사본 (원본) |
| `toolbar.css` | 디자인 툴바 전용 스타일 (프로토타입에만 존재) |

## 실제 앱과의 대응

- 상태머신 `input/probe/learn/done` = `frontend/src/App.tsx`
- 사이드바(브랜드/히스토리/로그인) = `components/Sidebar.tsx`
- 상단 단계바 = `components/ProgressBar.tsx`
- 입력 + 4단계 가이드 = `components/Hero.tsx`
- 수준 확인 문항 = `stages/Probe.tsx`
- 2단 학습 화면(설명/확인질문/채점) = `stages/Learn.tsx`
- 완료 요약 = `stages/Done.tsx`
- 분기 선택 모달 = `components/branch/BranchDialog.tsx`
