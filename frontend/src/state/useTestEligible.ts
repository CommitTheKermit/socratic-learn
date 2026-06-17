import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { fetchTestEligible } from "../api/testEligible";

// uid 별 자격 캐시 키. 값은 "1"(자격 있음)/"0"(없음).
const keyFor = (uid: string) => `socratic:testEligible:${uid}`;

function readCache(uid: string): boolean {
  try {
    return localStorage.getItem(keyFor(uid)) === "1";
  } catch {
    return false;
  }
}

/**
 * 현재 로그인 사용자가 테스트 모드 자격 대상인지 반환한다(입력창 드롭다운 노출 게이팅용).
 * - localStorage 캐시를 먼저 반영해 입력 화면에서 깜빡임 없이 즉시 표시한다.
 * - 로그인(uid 변경) 직후 /testEligible 를 1회 호출해 캐시를 갱신한다.
 * - 이 값은 UI 힌트일 뿐이며, 서버도 mode='test' 를 isTestMode(uid) 로 게이트하므로
 *   캐시를 조작해 항목을 띄워도 실제 테스트 모드는 적용되지 않는다.
 */
export function useTestEligible(): boolean {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [eligible, setEligible] = useState<boolean>(() => (uid ? readCache(uid) : false));

  useEffect(() => {
    if (!uid) {
      setEligible(false);
      return;
    }
    // uid 가 바뀌었을 수 있으니 캐시를 동기 재반영한 뒤, 서버 조회로 갱신한다.
    setEligible(readCache(uid));
    let cancelled = false;
    void fetchTestEligible().then((ok) => {
      if (cancelled) return;
      setEligible(ok);
      try {
        localStorage.setItem(keyFor(uid), ok ? "1" : "0");
      } catch {
        /* ignore */
      }
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  return eligible;
}
