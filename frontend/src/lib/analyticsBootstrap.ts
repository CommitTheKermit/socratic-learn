/**
 * Analytics 진입점 부트스트랩.
 *
 * 모듈 로드 시 한 번 평가되어 싱글턴 `wrapper` 인스턴스를 생성한다.
 * 이후 동일 모듈을 여러 번 import해도 ES 모듈 캐시로 인해
 * 항상 같은 `wrapper` 참조가 반환된다.
 *
 * 게이팅 로직(PROD/emulator/E2E 판별)은 analytics.ts 한 곳에 있고,
 * 이 모듈은 그 반환값을 createAnalyticsWrapper 의 enabled 인자로 전달하는
 * 진입점 역할만 한다.
 */
import { createAnalyticsWrapper, isInstrumentationEnabled } from "./analytics";
import type { AnalyticsWrapper } from "./analytics";

/**
 * 싱글턴 Analytics 래퍼.
 *
 * 모듈 최초 평가 시 한 번 생성된다.
 * isInstrumentationEnabled() 반환값에 따라:
 * - true: GA4 로 이벤트 전송하는 래퍼
 * - false: 모든 emit 이 no-op(dev/emulator/E2E 환경)
 */
export const wrapper: AnalyticsWrapper = createAnalyticsWrapper(isInstrumentationEnabled());

/**
 * 싱글턴 래퍼를 반환한다.
 *
 * 모듈 레벨 `wrapper` 상수를 그대로 반환하므로
 * 여러 번 호출해도 항상 동일한 객체 참조를 반환한다.
 */
export function bootstrapAnalytics(): AnalyticsWrapper {
  return wrapper;
}
