# frontend (Vite + React 18 + TypeScript)

`socratic-learn` 의 단일 페이지 클라이언트. 백엔드 Ktor 서버(`server/`, 기본 8081 포트)의 `POST /learn/stream` SSE 와 `POST /answers` 를 호출해 소크라테스식 학습 사이클을 진행한다.

## 사전 요구
- Node.js LTS (20 이상 권장)
- 백엔드 실행 중: `cd server && export ANTHROPIC_API_KEY=... && ./gradlew run` (기본 8081)

## 실행
```bash
cd frontend
npm install            # 최초 1회
npm run dev            # Vite dev server (기본 5173, FE_PORT 로 변경 가능)
```
브라우저에서 표시되는 URL(기본 http://localhost:5173) 접속.

## 빌드
```bash
npm run build          # tsc --noEmit 후 vite build → dist/
npm run preview        # dist 정적 서버 미리보기
```

## 환경 변수
| 변수 | 기본값 | 설명 |
|------|--------|------|
| `FE_PORT` | `5173` | Vite dev/preview 포트 |
| `VITE_API_BASE_URL` | `http://localhost:8081` | 백엔드 base URL. 빌드 시점에 인라인됨 |

## 주요 디렉터리
| 경로 | 내용 |
|------|------|
| `src/App.tsx` | 상태 머신 진입점 (input → probe → roadmap → explain → questions → answering → done) |
| `src/components/` | Sidebar, Hero, ProgressBar, 인라인 SVG 아이콘 |
| `src/stages/` | 각 단계 컴포넌트 + 정적 데이터(`data.ts`) |
| `src/api/contract.ts` | `shared/` Kotlin 계약 TS 미러 (수기 동기화) |
| `src/api/learnStream.ts` | `fetch` + `ReadableStream` SSE 클라이언트 (status/delta/complete/error) |
| `src/api/answers.ts` | `POST /answers` 클라이언트 |
| `src/lib/markdown.tsx` | `**bold** / *em* / \`code\` / \`\`\`block\`\`\`` 미니 markdown 렌더 |
| `src/lib/errors.ts` | 백엔드 에러 코드 → 사용자 메시지 |
| `src/styles/v3.css` | v3 시안 디자인 토큰 (OKLCH, holographic gradient, accent preset) |

## shared 계약 동기화
`src/api/contract.ts` 는 `shared/src/commonMain/kotlin/socratic/learn/shared/...` 의 수기 미러다. shared 의 path/이벤트/DTO 가 바뀌면 같은 PR 에 TS 미러 갱신을 포함해야 한다.

## SSE 에러 코드 매핑
| code | 의미 |
|------|------|
| `MISSING_CLAUDE_API_KEY` | 서버에 ANTHROPIC_API_KEY 미설정 |
| `CLAUDE_API_ERROR` | Claude API 호출 실패 |
| `INTERNAL_ERROR` | 서버 내부 오류 |
| `INVALID_CONCEPT` | 입력 검증 실패(400) |
| `EMPTY_ANSWERS` | answers 비어있음(400) |
| `NETWORK_ERROR` / `STREAM_ERROR` / `HTTP_ERROR` | 클라이언트 측 분류 |
