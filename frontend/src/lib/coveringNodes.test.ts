/**
 * coveringNodes.test.ts
 *
 * Sub-AC 4c-1: 중복 억제된 개념을 커버하는 roadmap 노드 탐지 순수 함수
 * findCoveringNodes 단위 테스트
 *
 * 검증 항목:
 *  - 중복 개념 포함 케이스: 동일 개념 노드 1개 이상 반환
 *  - 미포함 케이스: 빈 배열 반환
 *  - 정규화 비교: 부제 제거, 대소문자 무관, 공백 정규화
 *  - 복수 커버링 노드: 동일 개념이 여러 노드에 있을 때 모두 반환
 */
import { describe, test, expect } from "vitest";
import { findCoveringNodes } from "./coveringNodes";
import type { Step } from "../stages/data";

// 헬퍼: 원본(메인) 단계 생성
function mainStep(id: number, title: string): Step {
  return { id, title, desc: "", body: "", questions: [] };
}

// 헬퍼: 삽입(분기) 단계 생성
function branchStep(id: number, parentMainStepId: number, siblingIndex: number, title: string): Step {
  return {
    id,
    title,
    desc: "",
    body: "",
    questions: [],
    _meta: { parentMainStepId, siblingIndex },
  };
}

// 모의 roadmap 데이터 - 코루틴 학습 커리큘럼
const MOCK_ROADMAP: Step[] = [
  mainStep(1, "동시성과 병렬성"),
  mainStep(2, "스레드의 비용"),
  mainStep(3, "일시중단 함수"),
  mainStep(4, "코루틴이 가벼운 이유"),
  branchStep(101, 2, 0, "컨텍스트 스위칭 비용"),
];

// ──────────────────────────────────────────────────────────
// 중복 개념 포함 케이스
// ──────────────────────────────────────────────────────────
describe("findCoveringNodes - 중복 개념 포함 케이스", () => {
  test("완전히 동일한 제목이면 해당 노드를 반환한다", () => {
    const result = findCoveringNodes("동시성과 병렬성", MOCK_ROADMAP);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0].title).toBe("동시성과 병렬성");
  });

  test("suppressed concept 이 분기 노드와 일치해도 반환한다", () => {
    const result = findCoveringNodes("컨텍스트 스위칭 비용", MOCK_ROADMAP);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(101);
  });

  test("부제가 붙은 억제 개념을 정규화하면 기존 노드와 일치한다", () => {
    // "일시중단 함수: 코루틴 핵심" 억제 → 정규화 "일시중단 함수" → roadmap의 id=3 커버
    const result = findCoveringNodes("일시중단 함수: 코루틴 핵심", MOCK_ROADMAP);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });

  test("roadmap 노드에 부제가 있을 때 억제 개념 핵심만으로도 일치한다", () => {
    const roadmap = [
      mainStep(1, "스레드의 비용 - 왜 무거운가"),
      mainStep(2, "일시중단 함수"),
    ];
    // "스레드의 비용" 억제 → 정규화 "스레드의 비용" → "스레드의 비용 - 왜 무거운가" 정규화 "스레드의 비용"과 일치
    const result = findCoveringNodes("스레드의 비용", roadmap);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  test("대소문자 차이를 무시하고 커버 노드를 탐지한다", () => {
    const roadmap = [
      mainStep(1, "async await"),
      mainStep(2, "suspend 함수"),
    ];
    const result = findCoveringNodes("Async Await", roadmap);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  test("앞뒤 공백이 있는 억제 개념도 정규화 후 일치한다", () => {
    const result = findCoveringNodes("  스레드의 비용  ", MOCK_ROADMAP);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });
});

// ──────────────────────────────────────────────────────────
// 미포함 케이스 - 커버 노드 없음
// ──────────────────────────────────────────────────────────
describe("findCoveringNodes - 미포함 케이스 (빈 배열 반환)", () => {
  test("roadmap 에 없는 개념이면 빈 배열을 반환한다", () => {
    const result = findCoveringNodes("채널과 플로우", MOCK_ROADMAP);
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  test("핵심 단어가 비슷해도 정규화 결과가 다르면 빈 배열을 반환한다", () => {
    // "동시성" != "동시성과 병렬성"
    const result = findCoveringNodes("동시성", MOCK_ROADMAP);
    expect(result).toHaveLength(0);
  });

  test("빈 roadmap 이면 항상 빈 배열을 반환한다", () => {
    const result = findCoveringNodes("동시성과 병렬성", []);
    expect(result).toHaveLength(0);
  });

  test("빈 conceptName 이어도 roadmap 에 해당 없으면 빈 배열 반환", () => {
    const result = findCoveringNodes("", MOCK_ROADMAP);
    expect(result).toHaveLength(0);
  });

  test("부분 일치는 커버링으로 보지 않는다", () => {
    // "코루틴" 단독 vs "코루틴이 가벼운 이유" - 정규화 후 불일치
    const result = findCoveringNodes("코루틴", MOCK_ROADMAP);
    expect(result).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────
// 복수 커버링 노드 케이스
// (현실에서는 드물지만 같은 정규화 제목이 여러 노드에 있을 때)
// ──────────────────────────────────────────────────────────
describe("findCoveringNodes - 복수 커버링 노드", () => {
  test("정규화 결과가 동일한 노드가 여러 개면 모두 반환한다", () => {
    // "동시성과 병렬성"과 "동시성과 병렬성: 심화" 는 정규화 후 동일
    const roadmap = [
      mainStep(1, "동시성과 병렬성"),
      mainStep(2, "동시성과 병렬성: 심화"), // 정규화하면 "동시성과 병렬성"
      mainStep(3, "스레드의 비용"),
    ];
    const result = findCoveringNodes("동시성과 병렬성", roadmap);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.id)).toEqual([1, 2]);
  });

  test("반환 배열의 순서는 roadmap 순서를 따른다", () => {
    const roadmap = [
      mainStep(10, "스레드의 비용"),
      mainStep(20, "동시성과 병렬성"),
      mainStep(30, "스레드의 비용 - 상세"), // 정규화 "스레드의 비용"과 일치
    ];
    const result = findCoveringNodes("스레드의 비용", roadmap);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(10);
    expect(result[1].id).toBe(30);
  });
});

// ──────────────────────────────────────────────────────────
// 혼합 배열 (원본 + 삽입 분기) 케이스
// ──────────────────────────────────────────────────────────
describe("findCoveringNodes - 원본+삽입 혼합 roadmap", () => {
  test("삽입 분기 포함 혼합 배열에서 원본 노드를 커버로 탐지한다", () => {
    const roadmap = [
      mainStep(1, "동시성과 병렬성"),
      branchStep(101, 1, 0, "동시성 심화"),
      mainStep(2, "스레드의 비용"),
    ];
    // "동시성과 병렬성" 억제 시 id=1 반환
    const result = findCoveringNodes("동시성과 병렬성", roadmap);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0]._meta).toBeUndefined();
  });

  test("삽입 분기가 커버 노드인 경우도 탐지한다", () => {
    const roadmap = [
      mainStep(1, "동시성과 병렬성"),
      branchStep(101, 1, 0, "동시성 심화"),
      mainStep(2, "스레드의 비용"),
    ];
    const result = findCoveringNodes("동시성 심화", roadmap);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(101);
    expect(result[0]._meta).toBeDefined();
  });
});
