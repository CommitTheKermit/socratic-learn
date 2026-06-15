/**
 * stepInsertGuard.test.ts
 *
 * Sub-AC 3: 분기 단계 삽입 가드
 * - isDuplicateStep=true 이면 isMerged 값과 무관하게 삽입 불가
 * - isMerged=true 중복 / isMerged=false 중복 / 비중복 케이스를 각각 검증한다
 */
import { describe, test, expect } from "vitest";
import { shouldInsertBranchStep } from "./stepInsertGuard";

// ──────────────────────────────────────────────────────────
// isMerged=true 중복 케이스
// LLM 이 "이 추천 단계는 이미 로드맵에 있다"(isMerged=true)고 신호를 줬을 때,
// 프론트가 isDuplicateStep=true 로 탐지하면 삽입을 막아야 한다.
// ──────────────────────────────────────────────────────────
describe("shouldInsertBranchStep - isMerged=true 중복 케이스", () => {
  const existingSteps = [
    { title: "동시성과 병렬성" },
    { title: "스레드의 비용" },
    { title: "일시중단 함수" },
  ];

  test("완전히 동일한 제목: isMerged=true 상황에서 삽입 불가", () => {
    // isMerged=true 는 LLM 응답 값이지만, 프론트 가드는 제목 비교로 독립 판정한다.
    // 이 테스트는 isMerged=true 였을 상황(동일 제목)을 재현한다.
    const candidate = { title: "동시성과 병렬성" };
    expect(shouldInsertBranchStep(candidate, existingSteps)).toBe(false);
  });

  test("부제가 붙은 동일 개념: 정규화 후 일치하면 삽입 불가", () => {
    // LLM 은 isMerged=true 를 주었지만, 제목에 부제가 추가된 형태
    const candidate = { title: "동시성과 병렬성: 핵심 개념 정리" };
    expect(shouldInsertBranchStep(candidate, existingSteps)).toBe(false);
  });

  test("로드맵 항목에 부제가 있고 candidate 가 핵심만인 경우도 삽입 불가", () => {
    const stepsWithSub = [{ title: "일시중단 함수 - 코루틴 핵심 도구" }];
    const candidate = { title: "일시중단 함수" };
    expect(shouldInsertBranchStep(candidate, stepsWithSub)).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────
// isMerged=false 중복 케이스
// LLM 이 "새로운 단계다"(isMerged=false)라고 잘못 판단했을 때도,
// 프론트 isDuplicateStep 이 제목 일치를 탐지하면 삽입을 막아야 한다.
// ──────────────────────────────────────────────────────────
describe("shouldInsertBranchStep - isMerged=false 중복 케이스", () => {
  const existingSteps = [
    { title: "동시성과 병렬성" },
    { title: "스레드의 비용" },
  ];

  test("LLM 이 isMerged=false 로 보냈지만 이미 삽입된 제목이면 삽입 불가", () => {
    // isMerged=false 임에도 이전 분기 선택으로 동일 단계가 이미 삽입된 상황
    const candidate = { title: "스레드의 비용" };
    expect(shouldInsertBranchStep(candidate, existingSteps)).toBe(false);
  });

  test("LLM isMerged=false + 부제 차이 있지만 정규화 후 동일: 삽입 불가", () => {
    // LLM 이 "새로운 단계"라 판단했지만 핵심 개념은 동일한 케이스
    const candidate = { title: "스레드의 비용 - 왜 무거운가" };
    expect(shouldInsertBranchStep(candidate, existingSteps)).toBe(false);
  });

  test("대소문자 차이만 있는 동일 개념: isMerged=false 상황에서도 삽입 불가", () => {
    const stepsWithEng = [{ title: "async await" }];
    const candidate = { title: "Async Await" }; // LLM 이 다른 단계라 착각
    expect(shouldInsertBranchStep(candidate, stepsWithEng)).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────
// 비중복 케이스
// isMerged=false 이고 isDuplicateStep=false 이면 삽입을 허용한다.
// ──────────────────────────────────────────────────────────
describe("shouldInsertBranchStep - 비중복 케이스 (삽입 허용)", () => {
  const existingSteps = [
    { title: "동시성과 병렬성" },
    { title: "스레드의 비용" },
    { title: "일시중단 함수" },
  ];

  test("로드맵에 없는 새 개념은 삽입 허용", () => {
    const candidate = { title: "코루틴 빌더의 종류" };
    expect(shouldInsertBranchStep(candidate, existingSteps)).toBe(true);
  });

  test("핵심 단어가 비슷해도 정규화 결과가 다르면 삽입 허용", () => {
    // "동시성" != "동시성과 병렬성"
    const candidate = { title: "동시성" };
    expect(shouldInsertBranchStep(candidate, existingSteps)).toBe(true);
  });

  test("빈 로드맵이면 항상 삽입 허용", () => {
    const candidate = { title: "동시성과 병렬성" };
    expect(shouldInsertBranchStep(candidate, [])).toBe(true);
  });

  test("분기 단계가 기삽입 단계와 다른 개념이면 삽입 허용", () => {
    // 기삽입 분기 단계가 있는 상황에서 새 분기를 삽입하는 경우
    const stepsWithBranch = [
      { title: "동시성과 병렬성" },
      { title: "코루틴 기초 - 분기 추가됨" }, // 이미 삽입된 분기
    ];
    const candidate = { title: "구조적 동시성" }; // 다른 새 개념
    expect(shouldInsertBranchStep(candidate, stepsWithBranch)).toBe(true);
  });
});
