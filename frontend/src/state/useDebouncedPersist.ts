import { useEffect, useRef } from "react";
import type { SessionState } from "./sessionState";

/**
 * `trigger` 가 바뀔 때마다 `delayMs` 만큼 디바운스 후 `persist(snapshot)` 을 1회 호출한다.
 * - 디바운스 대기 중에 trigger 가 다시 바뀌면 이전 타이머는 취소되고 새 타이머가 시작된다.
 * - 컴포넌트 언마운트/페이지 이탈(beforeunload) 시 pending 이 있으면 flush 하여 마지막 입력을 잃지 않는다.
 * - `flush()` 로 보류분을 즉시 저장할 수 있다(예: 입력 완료 신호인 textarea onBlur).
 * - 외부 즉시 트리거(예: stage 전환) 발생 시 `cancelPending()` 으로 보류분을 취소하고
 *   호출 측에서 곧장 persist 를 수행해야 한다(같은 snapshot 이 즉시 저장되므로 손실 없음).
 *
 * buildSnapshot 은 매 호출 시 React state 의 최신 값을 클로저로 캡처해 반환해야 한다.
 * persist 의 성공/실패는 호출자가 처리한다(여기서는 throw 를 그대로 전달하지 않는다).
 */
export function useDebouncedPersist(
  trigger: unknown,
  buildSnapshot: () => SessionState,
  persist: (snapshot: SessionState) => void,
  delayMs = 500,
): { cancelPending: () => void; flush: () => void } {
  const timerRef = useRef<number | null>(null);
  const pendingRef = useRef<SessionState | null>(null);
  const persistRef = useRef(persist);
  const buildRef = useRef(buildSnapshot);
  persistRef.current = persist;
  buildRef.current = buildSnapshot;

  // 보류 중인 스냅샷을 즉시 저장하고 타이머를 정리한다. pending 이 없으면 no-op.
  const flushRef = useRef(() => {
    if (timerRef.current == null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    const p = pendingRef.current;
    pendingRef.current = null;
    if (p) {
      try {
        persistRef.current(p);
      } catch {
        // 무시
      }
    }
  });

  useEffect(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
    }
    const snap = buildRef.current();
    pendingRef.current = snap;
    timerRef.current = window.setTimeout(() => {
      try {
        persistRef.current(snap);
      } catch {
        // 호출자 책임. 무시.
      }
      timerRef.current = null;
      pendingRef.current = null;
    }, delayMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  useEffect(
    () => () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        const p = pendingRef.current;
        if (p) {
          try {
            persistRef.current(p);
          } catch {
            // 무시
          }
        }
        timerRef.current = null;
        pendingRef.current = null;
      }
    },
    [],
  );

  // 페이지 이탈(탭 닫기/새로고침) 시 React 언마운트가 보장되지 않으므로 보류분을 동기 flush 한다.
  useEffect(() => {
    const onBeforeUnload = () => flushRef.current();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return {
    cancelPending: () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        pendingRef.current = null;
      }
    },
    flush: () => flushRef.current(),
  };
}
