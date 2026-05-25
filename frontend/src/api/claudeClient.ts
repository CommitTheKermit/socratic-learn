import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (cached) return cached;
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error(
      "VITE_ANTHROPIC_API_KEY 가 설정되지 않았습니다. frontend/.env.local 파일을 만들고 키를 입력한 뒤 dev server 를 재시작하세요.",
    );
  }
  cached = new Anthropic({
    apiKey,
    // 로컬 개발 전용 - 브라우저에서 직접 호출하면 키가 노출되므로 절대 배포 빌드에 사용 금지.
    dangerouslyAllowBrowser: true,
  });
  return cached;
}

export const CLAUDE_MODEL = "claude-sonnet-4-6";
