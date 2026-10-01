import { describe, expect, it } from "vitest";
import * as prompts from "../prompts";
import { localizedSchema, localizedSystemPrompt, outputLanguage } from "../outputLanguage";
import { localizeRoadmap } from "../englishRoadmaps";

describe("learning output language", () => {
  it("keeps Korean for older clients and unrecognized values", () => {
    expect(outputLanguage(undefined)).toBe("ko");
    expect(outputLanguage("fr")).toBe("ko");
    expect(localizedSystemPrompt(prompts.PROBE_SYSTEM, undefined)).toBe(prompts.PROBE_SYSTEM);
  });
  it("removes Korean-only constraints from all system prompts for English output", () => {
    const systems = Object.entries(prompts).filter(([key, value]) => key.includes("SYSTEM") && typeof value === "string");
    expect(systems.length).toBeGreaterThan(8);
    for (const [, prompt] of systems) {
      const localized = localizedSystemPrompt(prompt as string, "en");
      expect(localized).not.toContain("한국어");
      expect(localized).not.toContain("한글");
      expect(localized).toContain("Write ALL learner-facing text in English");
      expect(localized).toContain("The learner may answer in any language");
    }
  });
  it("localizes nested schema constraints without changing keys or enum values", () => {
    const schema = { properties: { grade: { enum: ["correct", "wrong"] }, feedback: { description: "한국어 피드백" } }, anyOf: [{ description: "한국어 질문" }] };
    const localized = localizedSchema(schema, "en");
    expect(localized.properties.feedback.description).toBe("영어 피드백");
    expect(localized.anyOf[0].description).toBe("영어 질문");
    expect(localized.properties.grade.enum).toEqual(schema.properties.grade.enum);
    expect(schema.properties.feedback.description).toBe("한국어 피드백");
  });
  it("preserves Korean roadmaps, while English starts with translated steps to generate", () => {
    const source = { title: "로컬 데이터 저장소", steps: [{ id: 1, body: "원문", questions: [] }], prereqTree: [{ concept: "원문" }] };
    expect(localizeRoadmap("android-local-storage", source, "ko")).toBe(source);
    const english = localizeRoadmap("android-local-storage", source, "en")!;
    expect(english.title).toBe("Local data storage");
    expect(english.steps).toHaveLength(6);
    expect(english.steps[0].body).toBe("");
    expect(source.steps[0].body).toBe("원문");
    expect(localizeRoadmap("unknown", source, "en")).toBeNull();
  });
});
