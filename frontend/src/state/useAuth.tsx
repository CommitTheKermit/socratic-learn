import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth, githubProvider } from "../lib/firebase";
import { setAnalyticsUserId } from "../lib/analytics";

export interface AuthContextValue {
  /** 로그인된 Firebase 사용자. 비로그인 시 null. */
  user: User | null;
  /** onAuthStateChanged 최초 응답 전까지 true (초기 인증 상태 미확정). */
  loading: boolean;
  /** GitHub 팝업 로그인. */
  login: () => Promise<void>;
  logout: () => Promise<void>;
  /** Functions 호출 시 Authorization 헤더에 실을 ID 토큰. 비로그인 시 null. */
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

  const login = async (): Promise<void> => {
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
    <AuthContext.Provider value={{ user, loading, login, logout, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
