# frontend (Vite + React 18 + TypeScript)

`socratic-learn` 의 단일 페이지 클라이언트. v3 시안의 단계 머신(input → probe → roadmap → explain → questions → answering → done)을 React 로 이식한다.

현재 빌드는 **로컬 개발 전용 Claude 직접 호출 모드** 로 동작한다 - 백엔드(Ktor) 없이 브라우저에서 `@anthropic-ai/sdk` 를 통해 Claude API 를 직접 호출한다.

## ⚠️ 보안 주의

- API 키를 브라우저에서 직접 사용하면 **빌드 결과물에 키가 그대로 포함**된다. 개인 로컬 개발 외 용도(공유 빌드, 배포, 데모 사이트 등)에 절대 사용하지 말 것.
- `@anthropic-ai/sdk` 의 `dangerouslyAllowBrowser: true` 가 필요하다 (이름 그대로 위험).
- `.env.local` 은 gitignore 대상이다. 키를 다른 위치에 적지 말 것.
- 키가 노출됐다면 즉시 [console.anthropic.com](https://console.anthropic.com) 에서 revoke + 재발급.

## 사전 요구
- Node.js LTS (20 이상 권장)
- Anthropic API 키 (`sk-ant-api03-...`)

## 셋업
```bash
cd frontend
cp .env.local.example .env.local
# .env.local 에 VITE_ANTHROPIC_API_KEY 값 입력
npm install            # 최초 1회
npm run dev            # 기본 5173 (FE_PORT 로 변경)
```
브라우저에서 dev server URL 접속 (기본 http://localhost:5173) → 개념 입력 → probe → roadmap → explain 단계에서 Claude 가 스트리밍 응답.

## 빌드
```bash
npm run build          # tsc -b && vite build → dist/
npm run preview        # dist 정적 서버 미리보기
```

## 환경 변수
| 변수 | 기본값 | 설명 |
|------|--------|------|
| `FE_PORT` | `5173` | Vite dev/preview 포트 |
| `VITE_ANTHROPIC_API_KEY` | (없음) | Anthropic API 키. Vite 빌드 시점에 인라인됨 - 로컬 전용 |
| `VITE_API_BASE_URL` | `http://localhost:8081` | (현재 미사용) 후속 PR 에서 Ktor 백엔드 다시 붙일 때 사용 |

## 모델 / 동작
- 모델: `claude-sonnet-4-6` (`src/api/claudeClient.ts` 의 `CLAUDE_MODEL`)
- 적응형 thinking (`thinking: {type: "adaptive"}`)
- 시스템 프롬프트 prompt caching (`cache_control: ephemeral`)
- 스트리밍: SDK `messages.stream()` + `stream.on("text", ...)` 델타

## 주요 디렉터리
| 경로 | 내용 |
|------|------|
| `src/App.tsx` | 상태 머신 진입점 |
| `src/components/` | Sidebar, Hero, ProgressBar, 인라인 SVG 아이콘 |
| `src/stages/` | 각 단계 컴포넌트 + 정적 데이터(`data.ts`) |
| `src/api/claudeClient.ts` | `@anthropic-ai/sdk` 싱글톤 (브라우저 모드) |
| `src/api/claudeLearnStream.ts` | Claude 스트리밍 클라이언트 (explain 단계에서 호출) |
| `src/api/contract.ts` | shared/ Kotlin 계약 TS 미러 (백엔드 재연동용, 현재는 타입만 사용) |
| `src/api/learnStream.ts` | (backup) Ktor `/learn/stream` SSE 클라이언트 - 현재 미사용, 백엔드 재연동 시 import 만 교체 |
| `src/api/answers.ts` | (backup) `/answers` 클라이언트 - 현재 미사용 |
| `src/lib/markdown.tsx` | 미니 markdown (**bold** / *em* / `code` / ```block```) 렌더 |
| `src/lib/errors.ts` | 에러 코드 → 사용자 메시지 매핑 |
| `src/styles/v3.css` | v3 시안 디자인 토큰 |

## 백엔드 모드로 되돌리기 (후속)
`src/stages/Explain.tsx` 의 import 한 줄을 `claudeLearnStream` → `learnStream` 로 바꾸면 Ktor `/learn/stream` SSE 모드로 복귀한다. `Done.tsx` 의 `submitAnswers` 호출도 같이 복원해야 한다.
