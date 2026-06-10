/**
 * analytics.ts EventMap 타입 레벨 테스트.
 *
 * @ts-expect-error 주석으로 "잘못된 호출은 컴파일 에러여야 한다"를 검증한다.
 * @ts-expect-error 가 붙은 줄 아래가 실제로 에러가 아니면 tsc/vitest 가 실패한다.
 */
import { describe, it } from "vitest";
import { logEvent } from "./analytics";
import type {
  SlEventMap,
  SlSessionStartParams,
  SlStageEnterParams,
  SlStepEnterParams,
  SlAnswerSubmitParams,
  SlAnswerEditParams,
  SlBranchSelectParams,
  SlStepNavigateParams,
} from "./analytics";

// ─────────────────────────────────────────────────────
// 타입 유틸: 타입 동일성 검사용 AssertEqual
// ─────────────────────────────────────────────────────
type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
function assertType<T extends true>(_: T) {}

// ─────────────────────────────────────────────────────
// 1. EventMap 키 집합이 정확히 7개인지 확인
// ─────────────────────────────────────────────────────
type ExpectedKeys =
  | "sl_session_start"
  | "sl_stage_enter"
  | "sl_step_enter"
  | "sl_answer_submit"
  | "sl_answer_edit"
  | "sl_branch_select"
  | "sl_step_navigate";

assertType<AssertEqual<keyof SlEventMap, ExpectedKeys>>(true);

// ─────────────────────────────────────────────────────
// 2. 각 이벤트 파라미터 타입이 SlEventMap 에 올바르게 연결됨
// ─────────────────────────────────────────────────────
assertType<AssertEqual<SlEventMap["sl_session_start"], SlSessionStartParams>>(true);
assertType<AssertEqual<SlEventMap["sl_stage_enter"], SlStageEnterParams>>(true);
assertType<AssertEqual<SlEventMap["sl_step_enter"], SlStepEnterParams>>(true);
assertType<AssertEqual<SlEventMap["sl_answer_submit"], SlAnswerSubmitParams>>(true);
assertType<AssertEqual<SlEventMap["sl_answer_edit"], SlAnswerEditParams>>(true);
assertType<AssertEqual<SlEventMap["sl_branch_select"], SlBranchSelectParams>>(true);
assertType<AssertEqual<SlEventMap["sl_step_navigate"], SlStepNavigateParams>>(true);

// ─────────────────────────────────────────────────────
// 3. 유효한 호출 - 컴파일 에러 없어야 함
// ─────────────────────────────────────────────────────
describe("EventMap 타입 레벨 테스트", () => {
  it("유효한 이벤트 호출은 타입 에러 없음", () => {
    // sl_session_start
    logEvent("sl_session_start", { session_id: "s1", concept: "TypeScript", mode: "socratic" });

    // sl_stage_enter
    logEvent("sl_stage_enter", { session_id: "s1", stage: "learn" });
    logEvent("sl_stage_enter", { session_id: "s1", stage: "done" });

    // sl_step_enter
    logEvent("sl_step_enter", { session_id: "s1", step_idx: 0 });

    // sl_answer_submit
    logEvent("sl_answer_submit", { session_id: "s1", step_idx: 1, question_id: "q1" });

    // sl_answer_edit
    logEvent("sl_answer_edit", { session_id: "s1", step_idx: 2, question_id: "q2" });

    // sl_branch_select
    logEvent("sl_branch_select", { session_id: "s1", step_idx: 3, choice: "roadmap_next" });

    // sl_step_navigate
    logEvent("sl_step_navigate", { session_id: "s1", from_idx: 0, to_idx: 1, direction: "next" });
  });

  // ─────────────────────────────────────────────────────
  // 4. 잘못된 이벤트명 - 컴파일 에러여야 함
  // ─────────────────────────────────────────────────────
  it("존재하지 않는 이벤트명은 타입 에러", () => {
    // @ts-expect-error sl_unknown 은 SlEventMap 에 없음
    logEvent("sl_unknown", { session_id: "s1" });

    // @ts-expect-error prefix 없는 이름
    logEvent("session_start", { session_id: "s1" });
  });

  // ─────────────────────────────────────────────────────
  // 5. 필수 파라미터 누락 - 컴파일 에러여야 함
  // ─────────────────────────────────────────────────────
  it("필수 파라미터 누락은 타입 에러", () => {
    // session_id 누락
    // @ts-expect-error session_id 필수
    logEvent("sl_session_start", { concept: "TypeScript", mode: "socratic" });

    // concept 누락
    // @ts-expect-error concept 필수
    logEvent("sl_session_start", { session_id: "s1", mode: "socratic" });

    // mode 누락
    // @ts-expect-error mode 필수
    logEvent("sl_session_start", { session_id: "s1", concept: "TypeScript" });

    // stage 누락
    // @ts-expect-error stage 필수
    logEvent("sl_stage_enter", { session_id: "s1" });

    // question_id 누락 (sl_answer_submit)
    // @ts-expect-error question_id 필수
    logEvent("sl_answer_submit", { session_id: "s1", step_idx: 0 });

    // choice 누락 (sl_branch_select)
    // @ts-expect-error choice 필수
    logEvent("sl_branch_select", { session_id: "s1", step_idx: 0 });

    // direction 누락 (sl_step_navigate)
    // @ts-expect-error direction 필수
    logEvent("sl_step_navigate", { session_id: "s1", from_idx: 0, to_idx: 1 });
  });

  // ─────────────────────────────────────────────────────
  // 6. 파라미터 타입 불일치 - 컴파일 에러여야 함
  // ─────────────────────────────────────────────────────
  it("파라미터 타입 불일치는 타입 에러", () => {
    // mode 는 LearnMode("light"|"socratic"|"deep")여야 함
    // @ts-expect-error "hard" 는 LearnMode 에 없음
    logEvent("sl_session_start", { session_id: "s1", concept: "TS", mode: "hard" });

    // stage 는 "input"|"probe"|"learn"|"done" 이어야 함
    // @ts-expect-error "quiz" 는 stage 유니온에 없음
    logEvent("sl_stage_enter", { session_id: "s1", stage: "quiz" });

    // step_idx 는 number 여야 함
    // @ts-expect-error "0" 은 string, number 필요
    logEvent("sl_step_enter", { session_id: "s1", step_idx: "0" });

    // direction 는 "next"|"back"|"skip" 이어야 함
    // @ts-expect-error "forward" 는 direction 유니온에 없음
    logEvent("sl_step_navigate", { session_id: "s1", from_idx: 0, to_idx: 1, direction: "forward" });
  });
});
