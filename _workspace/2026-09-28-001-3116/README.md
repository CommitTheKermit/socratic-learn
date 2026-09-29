# 랜딩페이지 문구 윤문

- 대상: `frontend/src/components/landing/MagazineLanding.tsx`
- 원본 스킬: https://github.com/epoko77-ai/im-not-ai
- 확인한 커밋: `2f3d943d08056b612a92e12bfb72ea94dd2acd18`
- 설치 위치: `/Users/ujeonghyeon/.codex/skills/humanize-korean`
- 설치: 기본 skill-installer는 references 심볼릭 링크를 지원하지 않아 실패. 원본 `install.sh --codex-only --copy`로 설치하고 원본과 설치 파일 26개 일치를 확인했다.
- 적용 경로: light (자동 진단). 독립 에이전트에서 monolith 역할 실행.
- 결과: 본문 연결어미 뒤 쉼표 4개 제거. 제목, 기능 설명, 레이아웃, 테마 유지.
- 공통 게이트: 통과. 문자 변경률 0.12%, 문장 수정률 4.76%, 서법 소실 0건.
- 자체검증: 6/6, 자체 등급 B. 이 수치는 사람 독자가 느끼는 자연스러움이나 AI 작성 여부를 보장하지 않는다.
- 한계: 제목 보존과 최소 수정 규칙 때문에 광고 문구처럼 느껴지는 표현은 바뀌지 않았다.

`01_input.txt`는 원문, `final.md`는 윤문본, `08_gates.json`은 검증 결과다. HTML/JSX 구조와 코드 예시는 윤문 대상에서 제외했다.
