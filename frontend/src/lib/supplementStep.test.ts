import { describe, test, expect } from "vitest";
import { computeInsertedMeta, makeSupplementStep } from "./supplementStep";
import type { Step } from "../stages/data";

const step = (id: number, _meta?: Step["_meta"]): Step => ({
  id,
  title: `t${id}`,
  desc: `d${id}`,
  body: "",
  questions: [],
  _meta,
});

describe("computeInsertedMeta", () => {
  test("원본 단계 부모: parentMainStepId=부모 id, 형제 없으면 siblingIndex=0", () => {
    const steps = [step(1), step(2), step(3)];
    expect(computeInsertedMeta(steps, 0)).toEqual({ parentMainStepId: 1, siblingIndex: 0 });
  });

  test("같은 메인 아래 이미 삽입된 형제 수만큼 siblingIndex 증가(1-1 다음은 1-2)", () => {
    const steps = [
      step(1),
      step(4, { parentMainStepId: 1, siblingIndex: 0 }),
      step(2),
    ];
    // index 0(원본 id1)을 부모로: 같은 메인(1) 아래 형제 1개 → 다음 순번 1
    expect(computeInsertedMeta(steps, 0)).toEqual({ parentMainStepId: 1, siblingIndex: 1 });
  });

  test("부모가 삽입 단계(_meta 보유)면 같은 메인으로 평탄화(3-depth 금지)", () => {
    const steps = [
      step(1),
      step(4, { parentMainStepId: 1, siblingIndex: 0 }),
      step(2),
    ];
    // index 1(삽입 단계)을 부모로 골라도 메인은 1 로 평탄화, 형제 1개 → 순번 1
    expect(computeInsertedMeta(steps, 1)).toEqual({ parentMainStepId: 1, siblingIndex: 1 });
  });

  test("빈 steps/범위 밖이면 parentMainStepId=0", () => {
    expect(computeInsertedMeta([], 0)).toEqual({ parentMainStepId: 0, siblingIndex: 0 });
  });
});

describe("makeSupplementStep", () => {
  test("title/desc 보존, body/questions 비움(=lazy 생성), id=0(재할당 예정), _meta 부착", () => {
    const meta = { parentMainStepId: 1, siblingIndex: 0 };
    expect(makeSupplementStep({ title: "보충", desc: "부제" }, meta)).toEqual({
      id: 0,
      title: "보충",
      desc: "부제",
      body: "",
      questions: [],
      _meta: meta,
    });
  });
});
