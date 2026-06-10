/**
 * Firebase Analytics 래퍼.
 *
 * 게이팅: import.meta.env.PROD && !VITE_AUTH_EMULATOR_URL && !VITE_E2E_AUTO_SIGNIN 일 때만 활성.
 * 그 외 환경(dev / emulator / E2E)은 전부 no-op 으로 GA4 에 데이터를 보내지 않는다.
 *
 * 계측 포인트는 이 모듈의 함수만 호출하면 되고, 환경 분기를 알 필요가 없다.
 */
import { setUserId as firebaseSetUserId, logEvent as firebaseLogEvent } from "firebase/analytics";
import { analytics } from "./firebase";

/** production 빌드이고 emulator/E2E 가 아닐 때만 true */
const isActive: boolean =
  import.meta.env.PROD === true &&
  !import.meta.env.VITE_AUTH_EMULATOR_URL &&
  !import.meta.env.VITE_E2E_AUTO_SIGNIN;

/**
 * GA4 에 사용자 ID 를 등록한다(로그인/로그아웃 시 호출).
 * 로그아웃 시에는 null 을 전달한다.
 * fire-and-forget - 예외를 UX 로 전파하지 않는다.
 */
export function setAnalyticsUserId(uid: string | null): void {
  if (!isActive || !analytics) return;
  try {
    // firebase/analytics setUserId 는 null 을 허용하지 않아 빈 문자열로 대신한다.
    firebaseSetUserId(analytics, uid ?? "");
  } catch {
    // no-op
  }
}

/**
 * GA4 커스텀 이벤트 전송 기반 함수.
 * 계측 포인트는 이 함수를 직접 쓰지 않고, 타입 안전 래퍼(각 이벤트별 함수)를 사용한다.
 * fire-and-forget - 예외를 UX 로 전파하지 않는다.
 */
export function logAnalyticsEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): void {
  if (!isActive || !analytics) return;
  try {
    firebaseLogEvent(analytics, eventName, params);
  } catch {
    // no-op
  }
}
