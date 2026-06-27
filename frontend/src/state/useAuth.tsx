import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  linkWithPopup,
  signInWithCredential,
  GithubAuthProvider,
  signOut,
  type User,
  type AuthError,
} from "firebase/auth";
import { auth, githubProvider } from "../lib/firebase";
import { setAnalyticsUserId } from "../lib/analytics";

export interface AuthContextValue {
  /** 현재 Firebase 사용자. 익명/GitHub 모두 포함하며, 인증 전이면 null(`user.isAnonymous` 로 구분). */
  user: User | null;
  /** onAuthStateChanged 최초 응답 전까지 true (초기 인증 상태 미확정). */
  loading: boolean;
  /** GitHub 팝업 로그인. 익명 사용자면 link 로 승격해 uid(=usage/세션 추적 연속성)를 유지한다. */
  login: () => Promise<void>;
  logout: () => Promise<void>;
  /** uid 가 없으면 익명 로그인으로 발급한다(학습 시작 시 로그인 게이트 대체). 이미 있으면 no-op. */
  ensureSignedIn: () => Promise<void>;
  /** Functions 호출 시 Authorization 헤더에 실을 ID 토큰. 인증 전이면 null. */
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      // GA4 사용자 단위 분석: 로그인 시 uid 등록, 로그아웃 시 null.
      // fire-and-forget - analytics 실패가 UX 에 전파되지 않음.
      setAnalyticsUserId(u?.uid ?? null);
    });
    return unsub;
  }, []);

  // E2E 자동 로그인: 게이팅을 통과시키려 익명 로그인한다(VITE_E2E_AUTO_SIGNIN 일 때만).
  // 실서비스 빌드엔 이 변수가 없으므로 호출되지 않는다.
  useEffect(() => {
    if (import.meta.env.VITE_E2E_AUTO_SIGNIN === "true" && !loading && !user) {
      void signInAnonymously(auth);
    }
  }, [loading, user]);

  const ensureSignedIn = async (): Promise<void> => {
    await auth.authStateReady();
    if (!auth.currentUser) await signInAnonymously(auth);
  };

  const login = async (): Promise<void> => {
    await auth.authStateReady();
    const current = auth.currentUser;
    // 익명 사용자는 link 로 승격해 같은 uid 를 유지한다(익명으로 쌓인 usage/세션 추적이 끊기지 않음).
    if (current?.isAnonymous) {
      try {
        await linkWithPopup(current, githubProvider);
        return;
      } catch (e) {
        const err = e as AuthError;
        // 이미 존재하는 GitHub 계정(복귀 사용자): 익명 세션을 폐기하고 기존 계정으로 로그인한다.
        if (err.code === "auth/credential-already-in-use") {
          const cred = GithubAuthProvider.credentialFromError(err);
          if (cred) {
            await signInWithCredential(auth, cred);
            return;
          }
        }
        throw e;
      }
    }
    await signInWithPopup(auth, githubProvider);
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
  };

  const getIdToken = async (): Promise<string | null> => {
    await auth.authStateReady();
    return auth.currentUser ? auth.currentUser.getIdToken() : null;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, ensureSignedIn, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
