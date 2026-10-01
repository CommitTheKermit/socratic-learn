export type OutputLanguage = "ko" | "en";

/** Older clients omit language and retain Korean output. */
export function outputLanguage(value: unknown): OutputLanguage {
  return value === "en" ? "en" : "ko";
}

export function localizedSystemPrompt(system: string, language: unknown): string {
  if (outputLanguage(language) === "ko") return system;
  return system.replaceAll("한국어", "영어").replaceAll("한글", "영어") + `

[Output language: English]
Write ALL learner-facing text in English: concept names, titles, descriptions, explanations,
questions, options, placeholders, feedback, prerequisite reasons and suggested next steps.
This applies even when the learner's concept, materials, earlier lesson, or answer is Korean.
Use natural English, not Korean examples copied from these instructions.
Preserve JSON property names, enum values, IDs, code, mathematical notation and streaming markers.
Assess the learner's conceptual understanding, not their English proficiency.
The learner may answer in any language. Do not translate or rewrite their submitted answer.`;
}

/** Translate language constraints in schema descriptions without changing the wire contract. */
export function localizedSchema<T>(schema: T, language: unknown): T {
  if (outputLanguage(language) === "ko") return schema;
  function visit(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(visit);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [
        key,
        key === "description" && typeof child === "string"
          ? child.replaceAll("한국어", "영어")
          : visit(child),
      ]));
    }
    return value;
  }
  return visit(schema) as T;
}
