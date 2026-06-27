/**
 * useAuth 의 익명 로그인 게이트 대체 + GitHub 승격(link) 로직 단위 테스트.
 *
 * vitest.setup.ts 가 useAuth 를 전역 mock 하므로, importActual 로 실제 구현을 가져온다
 * (analytics.gating.test.ts 와 동일한 우회 패턴). firebase/auth 와 lib/firebase 를
 * doMock 으로 stub 해 jsdom 에서 실제 Firebase 호출 없이 분기만 검증한다.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import type { ReactNode } from "react";

// ── firebase/auth stub: 각 sign-in 계열 함수를 spy 로 대체 ──────────────
const linkWithPopup = vi.fn(async () => ({}));
const signInWithPopup = vi.fn(async () => ({}));
const signInWithCredential = vi.fn(async () => ({}));
const signInAnonymously = vi.fn(async () => ({}));
const credentialFromError = vi.fn(() => ({ providerId: "github.com" }));

// onAuthStateChanged 는 즉시 null(미로그인)로 콜백하고 unsub 를 돌려준다.
const onAuthStateChanged = vi.fn((_auth: unknown, cb: (u: unknown) => void) => {
  cb(null);
  return () => {};
});

// lib/firebase 의 auth 객체. currentUser 를 케이스마다 바꿔 분기를 검증한다.
const authStub: { currentUser: unknown; authStateReady: () => Promise<void> } = {
  currentUser: null,
  authStateReady: vi.fn(async () => {}),
};

vi.mock("firebase/auth", () => ({
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  linkWithPopup,
  signInWithCredential,
  signOut: vi.fn(async () => {}),
  GithubAuthProvider: { credentialFromError },
}));
vi.mock("../lib/firebase", () => ({
  auth: authStub,
  githubProvider: { providerId: "github.com" },
}));
vi.mock("../lib/analytics", () => ({ setAnalyticsUserId: vi.fn() }));

// 실제 구현 로드(전역 mock 우회).
const { AuthProvider, useAuth } = await vi.importActual<typeof import("./useAuth")>("./useAuth");

// 렌더 트리에서 context value 를 캡처하는 헬퍼.
function captureAuth(): import("./useAuth").AuthContextValue {
  let captured!: import("./useAuth").AuthContextValue;
  function Probe(): ReactNode {
    captured = useAuth();
    return null;
  }
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  return captured;
}

beforeEach(() => {
  authStub.currentUser = null;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useAuth.ensureSignedIn - 학습 시작 게이트 대체", () => {
  it("currentUser 가 없으면 익명 로그인한다", async () => {
    const auth = captureAuth();
    await act(async () => {
      await auth.ensureSignedIn();
    });
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("이미 사용자가 있으면 익명 로그인하지 않는다(no-op)", async () => {
    authStub.currentUser = { uid: "u1", isAnonymous: false };
    const auth = captureAuth();
    await act(async () => {
      await auth.ensureSignedIn();
    });
    expect(signInAnonymously).not.toHaveBeenCalled();
  });
});

describe("useAuth.login - 익명 사용자 GitHub 승격(link)", () => {
  it("익명 사용자는 linkWithPopup 으로 승격하고 signInWithPopup 은 부르지 않는다", async () => {
    authStub.currentUser = { uid: "anon", isAnonymous: true };
    const auth = captureAuth();
    await act(async () => {
      await auth.login();
    });
    expect(linkWithPopup).toHaveBeenCalledTimes(1);
    expect(signInWithPopup).not.toHaveBeenCalled();
  });

  it("link 가 credential-already-in-use 면 기존 계정으로 로그인한다(익명 폐기)", async () => {
    authStub.currentUser = { uid: "anon", isAnonymous: true };
    linkWithPopup.mockRejectedValueOnce({ code: "auth/credential-already-in-use" });
    const auth = captureAuth();
    await act(async () => {
      await auth.login();
    });
    expect(credentialFromError).toHaveBeenCalledTimes(1);
    expect(signInWithCredential).toHaveBeenCalledTimes(1);
  });

  it("비로그인/실명 사용자는 그냥 signInWithPopup 으로 로그인한다", async () => {
    authStub.currentUser = null;
    const auth = captureAuth();
    await act(async () => {
      await auth.login();
    });
    expect(signInWithPopup).toHaveBeenCalledTimes(1);
    expect(linkWithPopup).not.toHaveBeenCalled();
  });
});
