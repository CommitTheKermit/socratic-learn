# Socratic Learn

**아는 것과 모르는 것의 경계를 먼저 찾고, 거기서부터 한 개념씩 배웁니다.**

무엇이든 배우고 싶은 주제를 입력하면, 바로 설명을 쏟아내는 대신 소크라테스식으로 접근합니다. 먼저 몇 가지 질문으로 지금 수준을 진단하고, 주제를 작은 개념으로 나눠 배울 순서를 그린 뒤, 한 개념씩 직접 답하며 이해를 확인하고, 답변에 따라 다음 길(복습·선행·다음 단계·심화)을 추천합니다.

라이브: https://socratic-learn-web.web.app

## 어떻게 배우나요

1. **수준을 먼저 확인해요** - 몇 가지 진단 질문으로 아는 것과 모르는 것의 경계를 찾습니다. 같은 주제라도 이미 아는 범위는 사람마다 달라서, 불필요한 반복은 줄이고 빈틈은 놓치지 않습니다.
2. **배울 순서를 그려요** - 복잡한 주제를 작은 개념으로 나누고 선행 관계를 연결한 로드맵을 만듭니다. 무엇을 먼저 배워야 하는지, 지금 어디에 있는지 한눈에 보입니다.
3. **한 개념씩 이해해요** - 지금 필요한 만큼만 설명하고, 직접 답하며 이해를 확인합니다. 읽다가 막히면 문장을 골라 그 자리에서 질문하고, 필요한 선행 개념까지 이어서 학습할 수 있습니다.
4. **다음 길을 추천해요** - 답변의 정확성과 빠진 연결고리를 짚어주고, 채점 결과에 따라 복습·선행 학습·다음 단계·심화 중 지금 필요한 액션을 추천합니다.

## 주요 기능

- **학습 전 진단** - 시작 전 진단으로 나에게 맞는 시작점을 잡습니다.
- **개념 지도(로드맵)** - 개념 사이의 선행 관계와 현재 위치를 지도로 보여줍니다.
- **읽다가 바로 질문하기** - 궁금한 문장을 선택해 질문하면 답변과 함께 선행 개념·보충 단계까지 이어서 안내합니다(답변에 최대 2번 더 이어 물을 수 있음).
- **이해 중심 피드백** - 정답 여부만이 아니라 왜 그런지 자신의 언어로 설명하도록 돕습니다.
- **준비된 로드맵** - 직접 개념을 입력하는 대신, 미리 만들어 둔 학습 경로(현재 안드로이드 개념)를 골라 바로 시작할 수 있습니다.
- **로그인은 선택** - 로그인 없이 바로 시작할 수 있고, 기록을 기기 간에 잇고 싶을 때만 GitHub 로그인을 선택합니다.

## 아키텍처

```
브라우저(React SPA) → Firebase Functions(onRequest) → Anthropic Messages API
                    ↘ Firestore(세션 / 사용량), Firebase Auth(익명 기본 · GitHub 선택)
```

브라우저는 Anthropic 을 **직접 호출하지 않습니다.** 모든 Claude 호출은 Firebase Functions 를 경유하며, **API 키는 브라우저 번들에 존재하지 않습니다.** 프롬프트·모델 선택·구조화 출력은 전부 Functions 가 전담합니다.

## 모듈 구성

단일 Git 루트에 두 개의 npm 프로젝트로 구성됩니다.

| 모듈 | 내용 | 문서 |
|------|------|------|
| [`frontend/`](frontend/) | Vite + React 18 + TypeScript SPA. 단계 상태 머신(input → probe → learn → done)과 세션·로드맵 UI. | [README](frontend/README.md) · [CLAUDE.md](frontend/CLAUDE.md) |
| [`functions/`](functions/) | Firebase Functions(Node 20 / TypeScript). Anthropic Messages API 호출과 API 키를 전담. 레디메이드 로드맵 시드(`functions/seed/`) 포함. | - |

## 빠른 시작

```bash
# 프론트엔드
cd frontend && npm install && npm run dev        # dev server (기본 5173)

# Firebase Functions (로컬 emulator)
cd functions && npm install && npm run serve     # 포트 5001, UI 4000
```

- 프론트 dev server 만으로는 Claude 응답이 오지 않습니다. `VITE_API_BASE_URL` 이 가리키는 Functions(emulator 또는 배포)가 떠 있어야 합니다.
- emulator 용 Anthropic 키는 루트에서 `printf 'ANTHROPIC_API_KEY=%s\n' '<키>' > functions/.secret.local` (gitignore 됨).
- 셋업·환경 변수 상세는 [`frontend/README.md`](frontend/README.md) 와 루트 [`CLAUDE.md`](CLAUDE.md).

## 더 보기

- [`CLAUDE.md`](CLAUDE.md) - 모노레포 구성 / 런타임 아키텍처 / API 계약 / 배포 절차 / 환경 변수 전반.
- [`frontend/CLAUDE.md`](frontend/CLAUDE.md) - 프론트 내부 아키텍처(라우팅 상태 머신 / Context 계층 / 세션 영속화 모델).
