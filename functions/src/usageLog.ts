import * as logger from "firebase-functions/logger";

/** Anthropic 응답 usage 의 토큰 필드(SDK Usage 타입의 부분 집합). */
interface AnthropicUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

// 모델별 백만 토큰당 단가(USD). 입력/출력. (claude-api 기준: Sonnet 4.6 $3/$15, Haiku 4.5 $1/$5, Opus 4.8 $5/$25)
const PRICE_PER_MTOK: Record<string, { in: number; out: number }> = {
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
  "claude-opus-4-8": { in: 5, out: 25 },
};

/**
 * LLM 호출 1건의 토큰 사용량과 추정 비용을 구조화 로그(llm_usage)로 남긴다.
 * 동작에 영향이 없는 관측용. Cloud Logging 에서 endpoint 별 토큰/캐시/비용을 집계해 비용 회귀를 본다.
 *
 * - cacheReadTokens 가 계속 0 이면 프롬프트 캐싱이 (프리픽스 미달 등으로) 작동하지 않는 신호.
 * - 추정 비용은 캐시 읽기 = 입력가의 0.1배, 캐시 쓰기 = 1.25배로 계산. 단가 미등록 모델이면 null.
 */
export function logUsage(
  endpoint: string,
  model: string,
  usage: AnthropicUsage | null | undefined,
): void {
  if (!usage) return;
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
  const cacheWriteTokens = usage.cache_creation_input_tokens ?? 0;
  const price = PRICE_PER_MTOK[model];
  const estCostUsd = price
    ? ((inputTokens + cacheReadTokens * 0.1 + cacheWriteTokens * 1.25) * price.in +
        outputTokens * price.out) /
      1_000_000
    : null;
  logger.info("llm_usage", {
    endpoint,
    model,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    estCostUsd,
  });
}
