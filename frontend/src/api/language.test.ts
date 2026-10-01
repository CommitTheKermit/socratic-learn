import { afterEach, describe, expect, it, vi } from "vitest";
import { saveLanguage, LANGUAGE_STORAGE_KEY } from "../i18n/language";
import { generateProbeQuestions, generateRoadmapOutline, generateStepDetail, generateAnswerEvaluation,
  generateBranchEvaluation, generatePrereqTree, detectOverwhelm, askLearnQuestion, validateInput } from "./claudeContent";
import { streamStepDetail } from "./stepDetailStream";
import { listReadymadeRoadmaps, getReadymadeRoadmap } from "./readymadeRoadmapApi";

vi.mock("./authHeaders", () => ({ authHeaders: async () => ({ "Content-Type": "application/json" }) }));

afterEach(() => { localStorage.removeItem(LANGUAGE_STORAGE_KEY); vi.unstubAllGlobals(); });

describe("selected language reaches every learning request", () => {
  it.each(["en", "ko"] as const)("sends %s without rewriting the learner's input", async (language) => {
    saveLanguage(language);
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ valid: true, prerequisites: [] }) });
    vi.stubGlobal("fetch", fetch);
    const topic = "한국어로 입력한 개념";
    await generateProbeQuestions(topic);
    await generateRoadmapOutline(topic, 1);
    await generateStepDetail(topic, 1, [{ title: "기존 제목", desc: "기존 설명" }], 0);
    await generateAnswerEvaluation(topic, 1, "제목", "설명", "본문", [{ id: "q", q: "질문", answer: "내 답변" }]);
    await generateBranchEvaluation(topic, 1, "제목", "설명", "본문", [], "로드맵");
    await generatePrereqTree({ concept: topic });
    await detectOverwhelm(topic, undefined, "요약");
    await askLearnQuestion({ concept: topic, level: 1, question: "추가 질문", currentStepTitle: "제목", currentStepDesc: "설명", stepBody: "본문", roadmapTitles: [] });
    await validateInput(topic);
    for (const [, options] of fetch.mock.calls) expect(JSON.parse(options.body).language).toBe(language);
    expect(JSON.parse(fetch.mock.calls[0][1].body).concept).toBe(topic);
    expect(JSON.parse(fetch.mock.calls[3][1].body).questions[0].answer).toBe("내 답변");
  });
  it("sends English with streamed explanations and preserves stream events", async () => {
    saveLanguage("en");
    const encoder = new TextEncoder();
    const fetch = vi.fn().mockResolvedValue({ ok: true, body: new ReadableStream({ start(controller) {
      controller.enqueue(encoder.encode('event: complete\ndata: {"body":"English explanation","questions":[]}\n\n'));
      controller.close();
    } }) });
    vi.stubGlobal("fetch", fetch);
    const onComplete = vi.fn();
    await streamStepDetail({ concept: "코루틴", level: 1, outline: [{ title: "제목", desc: "설명" }], stepIdx: 0 }, { onComplete }).done;
    expect(JSON.parse(fetch.mock.calls[0][1].body).language).toBe("en");
    expect(onComplete).toHaveBeenCalledWith({ body: "English explanation", questions: [] });
  });
  it("requests the English prepared roadmap copy", async () => {
    saveLanguage("en");
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ roadmaps: [], roadmap: null }) });
    vi.stubGlobal("fetch", fetch);
    await listReadymadeRoadmaps();
    await getReadymadeRoadmap("android-local-storage");
    for (const [url] of fetch.mock.calls) expect(url).toContain("language=en");
  });
});
