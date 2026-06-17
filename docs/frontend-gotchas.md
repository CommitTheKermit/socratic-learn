# 프론트엔드 함정 노트

세션 복원/리로드, 레이아웃 고정 등에서 반복적으로 부딪힌 함정을 기록한다.

## React ref - 세션 복원/리로드 경로

- **callback ref 는 세션 복원·리로드 경로에서 신뢰도가 낮다.** 마운트 타이밍에 따라 호출이 누락/중복될 수 있다.
- 이런 경로에서는 **`useEffect` + ref object(`useRef`) 패턴**을 쓴다. effect 안에서 `ref.current` 를 다뤄 타이밍을 명시적으로 통제한다.
- 검증: 2026-06-16 (교정 0회).

## CSS `position: fixed` 와 containing block

- `position: fixed` 엘리먼트는 보통 viewport 기준으로 배치되지만, 조상에 **`container-type` 또는 `contain`** 속성이 걸리면 그 조상이 새 containing block 이 되어 `fixed` 위치가 틀어진다.
- 사이드바·스티키 같은 고정 요소가 어긋나면 조상의 `container-type`/`contain` 설정을 먼저 의심한다.
- 검증: Chromium 테스트됨, 2026-06-16.
