/**
 * Analytics 진입점 부트스트랩.
 *
 * 앱 시작 시 한 번 호출되어 isInstrumentationEnabled() 결과를
 * createAnalyticsWrapper 에 주입한다.
 *
 * 게이팅 로직(PROD/emulator/E2E 판별)은 analytics.ts 한 곳에 있고,
 * 이 모듈은 그 반환값을 createAnalyticsWrapper 의 enabled 인자로 전달하는
 * 진입점 역할만 한다.
 */
import { createAnalyticsWrapper, isInstrumentationEnabled } from "./analytics";
import type { AnalyticsWrapper } from "./analytics";

/**
 * Analytics 래퍼를 초기화하고 반환한다.
 *
 * isInstrumentationEnabled() 반환값이 createAnalyticsWrapper 의 enabled 인자가 된다.
 * - enabled=true: GA4 로 이벤트 전송
 * - enabled=false: 모든 emit 이 no-op(dev/emulator/E2E 환경)
 */
export function bootstrapAnalytics(): AnalyticsWrapper {
  return createAnalyticsWrapper(isInstrumentationEnabled());
}
