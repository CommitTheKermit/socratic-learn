// @anthropic-ai/sdk 의 Managed Agents 도구(agent-toolset, environments worker, memory tool 등)는
// 브라우저 번들에 포함될 필요가 없다 - 우리는 messages.stream() 만 사용한다.
// vite.config.ts 에서 이 파일로 alias 해 import 그래프를 끊는다.
export {};
