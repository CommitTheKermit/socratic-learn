import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth, githubProvider } from "../lib/firebase";

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
    });
    return unsub;
  }, []);

  const login = async (): Promise<void> => {
    await signInWithPopup(auth, githubProvider);
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
  };

  const getIdToken = async (): Promise<string | null> => {
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
