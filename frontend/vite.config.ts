import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const port = Number(process.env.FE_PORT) || 5173;

// @anthropic-ai/sdk 는 Managed Agents / self-hosted environment worker 코드를 포함하고
// 그 모듈들이 node:fs / node:path / node:crypto / node:child_process / node:readline 을 import 한다.
// 우리는 messages.stream() 만 호출하므로 런타임에는 실행되지 않지만, 번들러가 정적 분석에서
// 의존성 해석에 실패한다. resolved id 가 패턴에 매칭되면 load 단계에서 빈 모듈로 대체한다.
const STUB_PATTERN = /@anthropic-ai\/sdk\/(tools\/agent-toolset\/.+|lib\/environments\/environment-worker)\.(mjs|js)$/;

export default defineConfig({
  plugins: [
    react(),
    {
      name: "stub-anthropic-agent-tools",
      enforce: "pre",
      load(id) {
        if (STUB_PATTERN.test(id)) {
          return "export {}; export default {};";
        }
        return null;
      },
    },
  ],
  server: { port, strictPort: false },
  preview: { port },
});
