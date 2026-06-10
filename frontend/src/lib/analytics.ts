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
import type { LearnMode } from "../api/contract";

// ─────────────────────────────────────────────────────────
// EventMap: 7개 sl_ 이벤트명 → 파라미터 타입 매핑
//
// 이 맵이 타입 안전성의 단일 출처다.
// logEvent 래퍼가 이 맵을 통해 컴파일 타임에 오타/파라미터 누락을 잡는다.
// ─────────────────────────────────────────────────────────

/** 모든 sl_ 이벤트에 공통으로 포함되는 필수 파라미터 */
interface SlCommonParams {
  session_id: string;
}

/** sl_session_start: 학습 세션 시작. concept + mode 가 핵심. */
export interface SlSessionStartParams extends SlCommonParams {
  concept: string;
  mode: LearnMode;
}

/** sl_stage_enter: 단계(input/probe/learn/done) 진입. done 이 완료 마커. */
export interface SlStageEnterParams extends SlCommonParams {
  stage: "input" | "probe" | "learn" | "done";
}

/** sl_step_enter: learn 단계 내 스텝 진입. */
export interface SlStepEnterParams extends SlCommonParams {
  step_idx: number;
}

/** sl_answer_submit: 답변 제출. question_id 필수. */
export interface SlAnswerSubmitParams extends SlCommonParams {
  step_idx: number;
  question_id: string;
}

/** sl_answer_edit: 이미 제출된 답변 수정. question_id 필수. */
export interface SlAnswerEditParams extends SlCommonParams {
  step_idx: number;
  question_id: string;
}

/** sl_branch_select: 분기 선택. choice 가 선택지. */
export interface SlBranchSelectParams extends SlCommonParams {
  step_idx: number;
  choice: string;
}

/** sl_step_navigate: 스텝 간 이동(next/back/skip). */
export interface SlStepNavigateParams extends SlCommonParams {
  from_idx: number;
  to_idx: number;
  direction: "next" | "back" | "skip";
}

/**
 * 7개 sl_ 이벤트명 → 파라미터 타입 맵.
 * 계측 포인트가 사용하는 logEvent 의 타입 인자 출처.
 */
export interface SlEventMap {
  sl_session_start: SlSessionStartParams;
  sl_stage_enter: SlStageEnterParams;
  sl_step_enter: SlStepEnterParams;
  sl_answer_submit: SlAnswerSubmitParams;
  sl_answer_edit: SlAnswerEditParams;
  sl_branch_select: SlBranchSelectParams;
  sl_step_navigate: SlStepNavigateParams;
}

// ─────────────────────────────────────────────────────────
// 게이팅 + 래퍼 함수
// ─────────────────────────────────────────────────────────

/**
 * 계측 활성 여부를 반환한다.
 *
 * 세 조건을 AND 로 평가:
 *   1. PROD 빌드(import.meta.env.PROD === true)
 *   2. Auth emulator 비활성(!VITE_AUTH_EMULATOR_URL)
 *   3. E2E 자동 로그인 비활성(!VITE_E2E_AUTO_SIGNIN)
 *
 * 호출 시점에 env 를 읽으므로 테스트에서 vi.stubEnv 로 각 조합을 쉽게 검증할 수 있다.
 * 프로덕션 Vite 빌드 시 import.meta.env.* 는 인라인 리터럴로 치환된다.
 */
export function isInstrumentationEnabled(): boolean {
  return (
    import.meta.env.PROD === true &&
    !import.meta.env.VITE_AUTH_EMULATOR_URL &&
    !import.meta.env.VITE_E2E_AUTO_SIGNIN
  );
}

/**
 * Analytics 계측 활성 여부를 반환한다(isInstrumentationEnabled 의 보완 함수).
 *
 * 세 조건 중 하나라도 해당하면 false(no-op):
 *   1. DEV 빌드(import.meta.env.DEV === true)
 *   2. VITE_API_BASE_URL 이 localhost 또는 127.0.0.1 을 포함(로컬 에뮬레이터 환경)
 *   3. E2E 자동 로그인 활성(VITE_E2E_AUTO_SIGNIN === 'true')
 *
 * 위 세 조건이 모두 false 일 때만 true 를 반환한다.
 * 호출 시점에 env 를 읽으므로 테스트에서 vi.stubEnv 로 각 조합을 검증할 수 있다.
 */
export function isAnalyticsEnabled(): boolean {
  const apiBaseUrl: string = import.meta.env.VITE_API_BASE_URL ?? "";
  return (
    !import.meta.env.DEV &&
    !apiBaseUrl.includes("localhost") &&
    !apiBaseUrl.includes("127.0.0.1") &&
    import.meta.env.VITE_E2E_AUTO_SIGNIN !== "true"
  );
}

/**
 * GA4 에 사용자 ID 를 등록한다(로그인/로그아웃 시 호출).
 * 로그아웃 시에는 null 을 전달한다.
 * fire-and-forget - 예외를 UX 로 전파하지 않는다.
 */
export function setAnalyticsUserId(uid: string | null): void {
  if (!isInstrumentationEnabled() || !analytics) return;
  try {
    // firebase/analytics setUserId 는 null 을 허용하지 않아 빈 문자열로 대신한다.
    firebaseSetUserId(analytics, uid ?? "");
  } catch {
    // no-op
  }
}

/**
 * 타입 안전 logEvent 래퍼.
 *
 * - 이벤트명은 SlEventMap 의 키로 제한(오타는 컴파일 에러).
 * - params 는 해당 이벤트의 파라미터 타입으로 제한(누락/타입 불일치는 컴파일 에러).
 * - 게이팅 조건 불충족 시 no-op.
 * - 예외는 모두 무시(fire-and-forget). UX 에 영향 없음.
 *
 * @example
 * logEvent("sl_session_start", { session_id: "s1", concept: "TypeScript", mode: "socratic" });
 */
export function logEvent<K extends keyof SlEventMap>(
  eventName: K,
  params: SlEventMap[K],
): void {
  if (!isInstrumentationEnabled() || !analytics) return;
  try {
    firebaseLogEvent(analytics, eventName, params as unknown as Record<string, unknown>);
  } catch {
    // no-op
  }
}

// ─────────────────────────────────────────────────────────
// createAnalyticsWrapper: enabled 기반 emit 팩토리
// ─────────────────────────────────────────────────────────

/**
 * createAnalyticsWrapper 가 반환하는 래퍼 인터페이스.
 * 계측 포인트는 이 타입을 통해 emit 한다(환경 분기 불필요).
 */
export interface AnalyticsWrapper {
  logEvent<K extends keyof SlEventMap>(eventName: K, params: SlEventMap[K]): void;
  setUserId(uid: string | null): void;
}

/**
 * Analytics emit 팩토리.
 *
 * enabled=false → 모든 emit 메서드가 no-op(호출 횟수 0).
 * enabled=true  → Firebase Analytics 로 실제 emit 위임.
 *
 * 게이팅 조건(isInstrumentationEnabled)은 이 팩토리 외부에서 결정.
 * 팩토리 자체는 enabled 파라미터만 본다.
 *
 * @example
 * const wrapper = createAnalyticsWrapper(isInstrumentationEnabled());
 * wrapper.logEvent("sl_session_start", { session_id: "s1", concept: "TS", mode: "socratic" });
 */
export function createAnalyticsWrapper(enabled: boolean): AnalyticsWrapper {
  if (!enabled) {
    return {
      logEvent: () => undefined,
      setUserId: () => undefined,
    };
  }

  return {
    logEvent<K extends keyof SlEventMap>(eventName: K, params: SlEventMap[K]) {
      if (!analytics) return;
      try {
        firebaseLogEvent(
          analytics,
          eventName,
          params as unknown as Record<string, unknown>,
        );
      } catch {
        // no-op
      }
    },
    setUserId(uid: string | null) {
      if (!analytics) return;
      try {
        firebaseSetUserId(analytics, uid ?? "");
      } catch {
        // no-op
      }
    },
  };
}

/**
 * GA4 커스텀 이벤트 전송 기반 함수(non-typed fallback).
 * @deprecated 타입 안전한 logEvent 를 사용할 것.
 * 계측 포인트에서는 직접 쓰지 않는다.
 */
export function logAnalyticsEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): void {
  if (!isInstrumentationEnabled() || !analytics) return;
  try {
    firebaseLogEvent(analytics, eventName, params);
  } catch {
    // no-op
  }
}
