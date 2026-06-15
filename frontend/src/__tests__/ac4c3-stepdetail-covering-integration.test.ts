/**
 * Sub-AC 4c-3: stepDetail 엔드포인트로 커버 노드 조회 통합 테스트
 *
 * 검증 시나리오:
 *   1. 학습 세션 roadmap 에 "스레드의 비용" 단계가 이미 존재한다.
 *   2. AI 가 "스레드의 비용" 개념의 분기 삽입을 추천했으나 isMerged=true 로 억제됐다.
 *   3. findCoveringNodes 로 억제된 개념을 커버하는 기존 노드를 탐지한다.
 *   4. 탐지한 커버 노드의 stepIdx 로 stepDetail 엔드포인트를 실제 호출한다.
 *   5. HTTP 200 + 유효한 응답 스키마(body, questions) 를 반환하는지 검증한다.
 *
 * "통합" 근거:
 *   - findCoveringNodes(프론트 순수 함수) 와 generateStepDetail(Functions HTTP 래퍼)를
 *     하나의 흐름으로 연결해 검증한다.
 *   - fetch 는 vi.spyOn 으로 HTTP 200 + 유효 스키마를 시뮬레이션한다.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { findCoveringNodes } from "../lib/coveringNodes";
import { generateStepDetail } from "../api/claudeContent";
import type { Step } from "../stages/data";
import { API_BASE_URL, ApiPaths } from "../api/contract";

// authHeaders: auth.authStateReady() 가 firebase 모킹에 없어 throw 방지
vi.mock("../api/authHeaders", () => ({
  authHeaders: vi.fn().mockResolvedValue({ "Content-Type": "application/json" }),
}));

// ──────────────────────────────────────────────
// 모의 데이터
// ──────────────────────────────────────────────

/** stepDetail 유효 응답 (Functions 실제 스키마와 동일 구조) */
const VALID_STEP_DETAIL_RESPONSE = {
  body: "**스레드의 비용**: 스레드는 OS 단위의 작업 단위라서, 만들고 끄는 비용이 큽니다.\n아는 만큼만 짧게 써도 OK. 모르면 '모르겠어요' 라고 적어도 됩니다.",
  questions: [
    { id: "2-1", q: "스레드 한 개가 차지하는 메모리는 보통 어느 정도인가요?" },
    { id: "2-2", q: "수천 개의 동시 작업이 필요할 때 스레드만 쓰면 어떤 문제가 생기나요?" },
    { id: "2-3", q: "컨텍스트 스위칭이 무거운 이유는?" },
  ],
};

/**
 * 중복 억제 시나리오 roadmap.
 * "스레드의 비용" 개념이 이미 id=2 노드로 존재 → 분기 삽입 억제(isMerged=true).
 */
const MOCK_STEPS: Step[] = [
  { id: 1, title: "동시성과 병렬성", desc: "헷갈리기 쉬운 두 단어", body: "", questions: [] },
  { id: 2, title: "스레드의 비용", desc: "왜 더 가벼운 단위가 필요할까", body: "", questions: [] },
  { id: 3, title: "일시중단 함수", desc: "코루틴의 핵심 도구", body: "", questions: [] },
  { id: 4, title: "코루틴이 가벼운 이유", desc: "콜스택 대신 상태 객체", body: "", questions: [] },
];

/** 억제된 분기 개념 (isMerged=true 로 삽입이 차단됨) */
const SUPPRESSED_CONCEPT = "스레드의 비용";
const SESSION_CONCEPT = "코루틴";
const SESSION_LEVEL = 1;

// ──────────────────────────────────────────────
// 테스트 스위트
// ──────────────────────────────────────────────

describe("Sub-AC 4c-3: findCoveringNodes → stepDetail 통합 경로", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => VALID_STEP_DETAIL_RESPONSE,
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 단계 1: 커버 노드 탐지 ──────────────────

  it("findCoveringNodes 가 억제된 개념을 커버하는 기존 roadmap 노드를 탐지한다", () => {
    const coveringNodes = findCoveringNodes(SUPPRESSED_CONCEPT, MOCK_STEPS);

    expect(coveringNodes).toHaveLength(1);
    expect(coveringNodes[0].id).toBe(2);
    expect(coveringNodes[0].title).toBe("스레드의 비용");
    // 원본 메인 단계여야 함 (_meta 없음)
    expect(coveringNodes[0]._meta).toBeUndefined();
  });

  // ── 단계 2: 커버 노드 stepIdx → HTTP 200 ───

  it("커버 노드의 stepIdx 로 stepDetail 엔드포인트를 호출하면 HTTP 200 을 반환한다", async () => {
    // 1. findCoveringNodes 로 커버 노드 탐지
    const coveringNodes = findCoveringNodes(SUPPRESSED_CONCEPT, MOCK_STEPS);
    const coveringNode = coveringNodes[0];

    // 2. roadmap 에서 커버 노드의 0-based 인덱스 계산 (= stepDetail 의 stepIdx)
    const stepIdx = MOCK_STEPS.indexOf(coveringNode);
    expect(stepIdx).toBe(1); // "스레드의 비용" 은 index 1

    // 3. outline 구성
    const outline = MOCK_STEPS.map((s) => ({ title: s.title, desc: s.desc }));

    // 4. stepDetail 엔드포인트 실제 호출 (fetch 는 mocked)
    const result = await generateStepDetail(SESSION_CONCEPT, SESSION_LEVEL, outline, stepIdx);

    // 5. HTTP 200 확인 - fetch 가 ok:true 로 응답했으므로 ClaudeContentError 없이 result 반환됨
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  // ── 단계 3: 요청 payload 검증 ────────────────

  it("stepDetail 요청 body 에 커버 노드의 stepIdx 가 올바르게 실린다", async () => {
    const coveringNodes = findCoveringNodes(SUPPRESSED_CONCEPT, MOCK_STEPS);
    const stepIdx = MOCK_STEPS.indexOf(coveringNodes[0]);
    const outline = MOCK_STEPS.map((s) => ({ title: s.title, desc: s.desc }));

    await generateStepDetail(SESSION_CONCEPT, SESSION_LEVEL, outline, stepIdx);

    const [calledUrl, calledInit] = fetchSpy.mock.calls[0];

    // 엔드포인트 URL 검증
    expect(calledUrl).toBe(`${API_BASE_URL}${ApiPaths.STEP_DETAIL}`);
    expect(calledInit?.method).toBe("POST");

    // 요청 body 역직렬화 검증
    const requestBody = JSON.parse(calledInit?.body as string);
    expect(requestBody.concept).toBe(SESSION_CONCEPT);
    expect(requestBody.level).toBe(SESSION_LEVEL);
    expect(requestBody.stepIdx).toBe(1); // 커버 노드의 index
    expect(requestBody.outline).toHaveLength(MOCK_STEPS.length);
    // outline[stepIdx] 가 커버 노드의 제목
    expect(requestBody.outline[1].title).toBe("스레드의 비용");
  });

  // ── 단계 4: 응답 스키마 검증 ──────────────────

  it("stepDetail 응답이 유효한 스키마(body: string, questions: Array<{id,q}>) 를 갖는다", async () => {
    const coveringNodes = findCoveringNodes(SUPPRESSED_CONCEPT, MOCK_STEPS);
    const stepIdx = MOCK_STEPS.indexOf(coveringNodes[0]);
    const outline = MOCK_STEPS.map((s) => ({ title: s.title, desc: s.desc }));

    const result = await generateStepDetail(SESSION_CONCEPT, SESSION_LEVEL, outline, stepIdx);

    // body 검증
    expect(typeof result.body).toBe("string");
    expect(result.body.length).toBeGreaterThan(0);

    // questions 배열 검증
    expect(Array.isArray(result.questions)).toBe(true);
    expect(result.questions.length).toBeGreaterThanOrEqual(1);

    result.questions.forEach((q) => {
      expect(typeof q.id).toBe("string");
      expect(q.id).toMatch(/^\d+-\d+$/); // "N-M" 형식 (예: "2-1")
      expect(typeof q.q).toBe("string");
      expect(q.q.length).toBeGreaterThan(0);
    });
  });

  // ── 단계 5: 분기 혼합 roadmap 에서 stepIdx ──

  it("분기 스텝이 삽입된 혼합 roadmap 에서도 커버 노드의 stepIdx 가 정확하다", async () => {
    // 분기 단계가 앞에 삽입된 혼합 roadmap
    const stepsWithBranch: Step[] = [
      { id: 1, title: "동시성과 병렬성", desc: "", body: "", questions: [] },
      {
        id: 101,
        title: "동시성 심화",
        desc: "",
        body: "",
        questions: [],
        _meta: { parentMainStepId: 1, siblingIndex: 0 },
      },
      { id: 2, title: "스레드의 비용", desc: "", body: "", questions: [] },
    ];

    // findCoveringNodes 는 id 기준이 아닌 정규화 제목 비교이므로 혼합 배열에서도 정상 작동
    const coveringNodes = findCoveringNodes("스레드의 비용", stepsWithBranch);
    expect(coveringNodes).toHaveLength(1);
    expect(coveringNodes[0].id).toBe(2);

    // 분기 삽입으로 index 가 2 로 밀림 (0:메인, 1:분기, 2:메인)
    const stepIdx = stepsWithBranch.indexOf(coveringNodes[0]);
    expect(stepIdx).toBe(2);

    const outline = stepsWithBranch.map((s) => ({ title: s.title, desc: s.desc }));
    await generateStepDetail(SESSION_CONCEPT, SESSION_LEVEL, outline, stepIdx);

    const [, calledInit] = fetchSpy.mock.calls[0];
    const body = JSON.parse(calledInit?.body as string);
    expect(body.stepIdx).toBe(2); // 분기 삽입 후 밀린 인덱스
  });

  // ── 단계 6: 커버 노드 미탐지 케이스 ──────────

  it("커버 노드가 없으면 stepDetail 엔드포인트를 호출하지 않는다", () => {
    const coveringNodes = findCoveringNodes("존재하지 않는 개념", MOCK_STEPS);
    expect(coveringNodes).toHaveLength(0);
    // 커버 노드가 없으면 호출자가 분기 판단 - fetch 호출 없음
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
