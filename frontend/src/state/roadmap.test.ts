import { describe, test, expect } from "vitest";
import { buildRoadmapStages } from "./roadmap";

describe("buildRoadmapStages", () => {
  test("주제 입력 후 outline -> 로드맵 단계 배열 생성", () => {
    const outline = [
      { title: "동시성과 병렬성", desc: "헷갈리기 쉬운 두 단어부터" },
      { title: "suspend 함수의 의미", desc: "코루틴 빌더와의 관계" },
      { title: "구조화된 동시성", desc: "스코프와 취소 전파" },
    ];

    const stages = buildRoadmapStages(outline);

    expect(stages.length).toBe(3);
    expect(stages.map((s) => s.title)).toEqual(outline.map((o) => o.title));
    expect(stages.map((s) => s.id)).toEqual([1, 2, 3]);
    for (const s of stages) {
      expect(s.body).toBe("");
      expect(s.questions).toEqual([]);
    }
  });

  test("빈 outline 입력 시 빈 로드맵 반환", () => {
    expect(buildRoadmapStages([])).toEqual([]);
  });
});
