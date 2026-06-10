import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom 은 matchMedia 를 구현하지 않는다. App 이 사이드바 반응형 처리에 사용하므로 폴리필.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList;
}

// useAuth 를 전역 모킹한다. 이유:
// 1) src/lib/firebase.ts 는 모듈 로드 시점에 getAuth() 를 실행하는데 jsdom 테스트엔
//    VITE_FIREBASE_* env 가 없어 auth/invalid-api-key 로 터진다. 모킹하면 firebase 가
//    아예 import 되지 않는다.
// 2) App 게이팅(비로그인 시 학습 시작 차단)이 세션 테스트를 막지 않도록 로그인된
//    더미 유저를 반환한다. 게이팅 자체는 별도 테스트에서 검증한다.
// authHeaders 가 lib/firebase 를 import 하므로(모듈 로드 시 getAuth 실행) 함께 모킹.
// currentUser=null 이면 토큰 없이 호출(테스트의 fetch 는 어차피 모킹됨).
vi.mock("./src/lib/firebase", () => ({
  auth: { currentUser: null },
  app: {},
  githubProvider: {},
  analytics: null,
}));

// analytics 래퍼를 no-op 으로 대체. 테스트에서 GA4 전송 없음.
// logEvent 는 타입 안전 래퍼 - 타입 레벨 테스트에서 @ts-expect-error 로 검증하므로 포함.
vi.mock("./src/lib/analytics", () => ({
  setAnalyticsUserId: vi.fn(),
  logAnalyticsEvent: vi.fn(),
  logEvent: vi.fn(),
  isInstrumentationEnabled: vi.fn(() => false),
}));

vi.mock("./src/state/useAuth", () => ({
  useAuth: () => ({
    user: { uid: "test-uid", displayName: "테스터", email: "test@example.com" },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    getIdToken: vi.fn(async () => "test-token"),
  }),
  AuthProvider: (props: { children: unknown }) => props.children,
}));
