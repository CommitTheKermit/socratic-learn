import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GithubAuthProvider, connectAuthEmulator } from "firebase/auth";
import { getAnalytics, type Analytics } from "firebase/analytics";

// 웹 클라이언트용 config. apiKey 는 비밀이 아니라 식별자이므로 번들 인라인되어도 무방하다.
// 값은 Vite 빌드 시점에 .env.local 의 VITE_FIREBASE_* 에서 주입된다.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const githubProvider = new GithubAuthProvider();

/**
 * Analytics 초기화.
 * measurementId 가 undefined 또는 빈 문자열이면 예외 없이 null 반환.
 * getAnalytics 초기화 실패 시에도 null 반환(앱 크래시 없음).
 *
 * @internal export 는 단위 테스트 전용. 외부에서 직접 호출하지 않는다.
 */
export function initAnalytics(
  firebaseApp: FirebaseApp,
  measurementId: string | undefined,
): Analytics | null {
  if (!measurementId) return null;
  try {
    return getAnalytics(firebaseApp);
  } catch {
    // 초기화 실패 시 no-op. 앱 정상 동작 유지.
    return null;
  }
}

// Analytics: measurementId 가 없으면 조용히 null(앱 크래시 없음).
// 이 값은 src/lib/analytics.ts 의 래퍼가 사용한다.
export const analytics: Analytics | null = initAnalytics(app, firebaseConfig.measurementId);

// E2E/로컬 통합 검증용: Auth emulator 연결(VITE_AUTH_EMULATOR_URL 설정 시에만).
// 실서비스 빌드엔 이 변수가 없으므로 영향이 없다.
const authEmulatorUrl = import.meta.env.VITE_AUTH_EMULATOR_URL;
if (authEmulatorUrl) {
  connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
}
