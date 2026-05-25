import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { CLAUDE_MODEL, getClaudeClient } from "./claudeClient";
export class ClaudeContentError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
function mapAnthropicError(e) {
    if (e instanceof Anthropic.AuthenticationError) {
        return new ClaudeContentError("MISSING_CLAUDE_API_KEY", "Claude API 키가 유효하지 않습니다. .env.local 의 VITE_ANTHROPIC_API_KEY 를 확인하세요.");
    }
    if (e instanceof Anthropic.RateLimitError) {
        return new ClaudeContentError("CLAUDE_API_ERROR", "Claude API 호출 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.");
    }
    if (e instanceof Anthropic.APIError) {
        return new ClaudeContentError("CLAUDE_API_ERROR", `Claude API 오류 (${e.status}): ${e.message}`);
    }
    return new ClaudeContentError("INTERNAL_ERROR", e?.message ?? "알 수 없는 오류");
}
const probeSchema = {
    type: "object",
    additionalProperties: false,
    required: ["p1", "p2", "p3"],
    properties: {
        p1: {
            type: "object",
            additionalProperties: false,
            required: ["id", "kind", "q", "options"],
            properties: {
                id: { type: "string", const: "p1" },
                kind: { type: "string", const: "choice" },
                q: { type: "string", description: "개념에 대한 친숙도를 묻는 한국어 질문" },
                options: {
                    type: "array",
                    minItems: 4,
                    maxItems: 4,
                    items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["value", "label"],
                        properties: {
                            value: { type: "integer", minimum: 0, maximum: 3 },
                            label: { type: "string" },
                        },
                    },
                },
            },
        },
        p2: {
            type: "object",
            additionalProperties: false,
            required: ["id", "kind", "q", "sub", "options"],
            properties: {
                id: { type: "string", const: "p2" },
                kind: { type: "string", const: "multi" },
                q: { type: "string" },
                sub: { type: "string" },
                options: {
                    type: "array",
                    minItems: 6,
                    maxItems: 6,
                    items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["value", "label", "correct"],
                        properties: {
                            value: { type: "string" },
                            label: { type: "string" },
                            correct: { type: "boolean" },
                        },
                    },
                },
            },
        },
        p3: {
            type: "object",
            additionalProperties: false,
            required: ["id", "kind", "q", "placeholder"],
            properties: {
                id: { type: "string", const: "p3" },
                kind: { type: "string", const: "text" },
                q: { type: "string" },
                placeholder: { type: "string" },
            },
        },
    },
};
const PROBE_SYSTEM = `당신은 소크라테스식 학습 튜터입니다. 사용자가 입력한 임의의 학습 개념에 대해 사전 수준을 빠르게 진단할 3개 질문을 만듭니다.

- 반드시 한국어로 작성하세요.
- p1 의 4개 선택지 label 은 친숙도 순서를 유지(value 0=전혀 모름 → 3=직접 다뤄봄)하되 개념에 맞춰 자연스럽게 다듬으세요.
- p2 의 6개 옵션 중 3-4개는 개념과 실제 관련 있는 단어(correct:true), 나머지는 비슷해 보이지만 무관한 단어(correct:false). value 는 영문 슬러그, label 은 한글/원어.
- p3 는 개념이 해결하려는 문제 또는 핵심 아이디어를 한 줄로 적도록 유도하세요. placeholder 는 "모르면 비워두셔도 괜찮아요" 풍의 안내.`;
export async function generateProbeQuestions(concept) {
    let client;
    try {
        client = getClaudeClient();
    }
    catch (e) {
        throw new ClaudeContentError("MISSING_CLAUDE_API_KEY", e.message);
    }
    let parsed;
    try {
        const resp = await client.messages.parse({
            model: CLAUDE_MODEL,
            max_tokens: 2000,
            thinking: { type: "adaptive" },
            system: [{ type: "text", text: PROBE_SYSTEM, cache_control: { type: "ephemeral" } }],
            messages: [
                {
                    role: "user",
                    content: `학습 개념: ${concept}\n\n이 개념에 대한 진단 질문(p1, p2, p3) 을 생성해 주세요.`,
                },
            ],
            output_config: { format: jsonSchemaOutputFormat(probeSchema) },
        });
        parsed = resp.parsed_output;
    }
    catch (e) {
        throw mapAnthropicError(e);
    }
    if (!parsed?.p1 || !parsed?.p2 || !parsed?.p3) {
        throw new ClaudeContentError("INVALID_RESPONSE", "진단 질문 응답이 비어 있습니다.");
    }
    return [parsed.p1, parsed.p2, parsed.p3];
}
const outlineSchema = {
    type: "object",
    additionalProperties: false,
    required: ["steps"],
    properties: {
        steps: {
            type: "array",
            minItems: 3,
            maxItems: 5,
            items: {
                type: "object",
                additionalProperties: false,
                required: ["title", "desc"],
                properties: {
                    title: { type: "string", description: "단계 제목 (8-16자)" },
                    desc: { type: "string", description: "한 줄 부제 (20자 내외)" },
                },
            },
        },
    },
};
const OUTLINE_SYSTEM = `당신은 소크라테스식 학습 튜터입니다. 사용자의 사전 수준(0=처음, 4=설명 가능)에 맞춰 3-5개의 학습 단계 outline 을 구성합니다.

- 반드시 한국어로 작성하세요.
- 각 단계는 제목(title)과 한 줄 부제(desc) 만 작성합니다. 본문/질문은 다음 단계에서 별도로 생성합니다.
- 수준이 낮으면 기초 정의부터, 수준이 높으면 빠르게 핵심 원리로 진입합니다.
- 단계 사이에 학습 순서가 자연스럽게 이어지도록 배열하세요.`;
export async function generateRoadmapOutline(concept, level) {
    let client;
    try {
        client = getClaudeClient();
    }
    catch (e) {
        throw new ClaudeContentError("MISSING_CLAUDE_API_KEY", e.message);
    }
    let parsed;
    try {
        const resp = await client.messages.parse({
            model: CLAUDE_MODEL,
            max_tokens: 1500,
            thinking: { type: "adaptive" },
            system: [{ type: "text", text: OUTLINE_SYSTEM, cache_control: { type: "ephemeral" } }],
            messages: [
                {
                    role: "user",
                    content: `학습 개념: ${concept}\n사용자 사전 수준: L${level} (0=처음, 4=설명 가능)\n\n로드맵 outline 을 생성해 주세요.`,
                },
            ],
            output_config: { format: jsonSchemaOutputFormat(outlineSchema) },
        });
        parsed = resp.parsed_output;
    }
    catch (e) {
        throw mapAnthropicError(e);
    }
    if (!parsed?.steps?.length) {
        throw new ClaudeContentError("INVALID_RESPONSE", "로드맵 응답이 비어 있습니다.");
    }
    return parsed.steps;
}
const stepDetailSchema = {
    type: "object",
    additionalProperties: false,
    required: ["body", "questions"],
    properties: {
        body: {
            type: "string",
            description: "본문. **굵게**, *기울임*, `인라인 코드`, 트리플 백틱 코드블록만 허용. 헤더/리스트/표 금지. 2-4문단.",
        },
        questions: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "q", "hint"],
                properties: {
                    id: { type: "string", description: "단계번호-순번 형식 (예: 1-1)" },
                    q: { type: "string" },
                    hint: { type: "string" },
                },
            },
        },
    },
};
const STEP_DETAIL_SYSTEM = `당신은 소크라테스식 학습 튜터입니다. 주어진 학습 로드맵 안에서 한 단계의 개념 설명과 확인 질문을 작성합니다.

- 반드시 한국어로 작성하세요.
- body 는 2-4문단의 마크다운. 헤더(#)/리스트(-, *, 1.)/표 금지. 핵심 용어는 **굵게**, 직관/은유는 *기울임*, 식별자/짧은 코드는 \`인라인\`, 길면 트리플 백틱 코드블록 사용.
- 해당 단계 범위만 다루고, 다른 단계의 내용을 미리 설명하지 마세요.
- questions 는 1-3개의 짧은 회상형 확인 질문 + 한 줄 힌트. id 는 "단계번호-순번" (예: 2-1).`;
export async function generateStepDetail(concept, level, outline, stepIdx) {
    let client;
    try {
        client = getClaudeClient();
    }
    catch (e) {
        throw new ClaudeContentError("MISSING_CLAUDE_API_KEY", e.message);
    }
    const cur = outline[stepIdx];
    if (!cur)
        throw new ClaudeContentError("INVALID_RESPONSE", "단계 정보가 없습니다.");
    const outlineText = outline
        .map((s, i) => `${i + 1}. ${s.title} - ${s.desc}${i === stepIdx ? "  ← (이번 단계)" : ""}`)
        .join("\n");
    let parsed;
    try {
        const resp = await client.messages.parse({
            model: CLAUDE_MODEL,
            max_tokens: 2500,
            thinking: { type: "adaptive" },
            system: [{ type: "text", text: STEP_DETAIL_SYSTEM, cache_control: { type: "ephemeral" } }],
            messages: [
                {
                    role: "user",
                    content: `학습 개념: ${concept}\n사용자 사전 수준: L${level}\n\n전체 로드맵:\n${outlineText}\n\n이번 단계(${stepIdx + 1}. ${cur.title} - ${cur.desc}) 의 본문과 확인 질문을 작성해 주세요. id 의 단계번호는 ${stepIdx + 1} 를 사용하세요.`,
                },
            ],
            output_config: { format: jsonSchemaOutputFormat(stepDetailSchema) },
        });
        parsed = resp.parsed_output;
    }
    catch (e) {
        throw mapAnthropicError(e);
    }
    if (!parsed?.body || !parsed?.questions?.length) {
        throw new ClaudeContentError("INVALID_RESPONSE", "단계 상세 응답이 비어 있습니다.");
    }
    return parsed;
}
const evalSchema = {
    type: "object",
    additionalProperties: false,
    required: ["evaluations"],
    properties: {
        evaluations: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "grade", "feedback"],
                properties: {
                    id: { type: "string" },
                    grade: { type: "string", enum: ["correct", "almost", "partial", "wrong"] },
                    feedback: { type: "string", description: "1-2 문장 한국어 피드백. 칭찬/지적/한 가지 보강 포인트." },
                },
            },
        },
    },
};
const EVAL_SYSTEM = `당신은 소크라테스식 학습 튜터입니다. 한 학습 단계의 확인 질문에 대한 사용자 답변을 평가합니다.

- 반드시 한국어로 작성하세요.
- 각 질문의 답변을 4등급으로 평가: correct(정답), almost(거의 맞음), partial(부족), wrong(오답/엉뚱).
- feedback 은 1-2문장으로 짧게. 맞은 점/놓친 점/보강 포인트 중심.
- 빈 답변이나 의미 없는 답변은 wrong 처리하고 핵심을 한 줄로 알려주세요.
- 채점은 너그럽되, 핵심 개념이 빠지면 partial/wrong 으로 명확히 표시하세요.`;
export async function generateAnswerEvaluation(concept, level, stepTitle, stepDesc, stepBody, questions) {
    let client;
    try {
        client = getClaudeClient();
    }
    catch (e) {
        throw new ClaudeContentError("MISSING_CLAUDE_API_KEY", e.message);
    }
    if (questions.length === 0)
        return { evaluations: [] };
    const qaText = questions
        .map((q) => `- id: ${q.id}\n  질문: ${q.q}\n  힌트: ${q.hint}\n  사용자 답변: ${q.answer || "(빈 답변)"}`)
        .join("\n");
    let parsed;
    try {
        const resp = await client.messages.parse({
            model: CLAUDE_MODEL,
            max_tokens: 2000,
            thinking: { type: "adaptive" },
            system: [{ type: "text", text: EVAL_SYSTEM, cache_control: { type: "ephemeral" } }],
            messages: [
                {
                    role: "user",
                    content: `학습 개념: ${concept}\n사용자 수준: L${level}\n\n현재 단계: ${stepTitle} - ${stepDesc}\n단계 본문 요약:\n${stepBody}\n\n평가할 질문/답변:\n${qaText}\n\n각 질문에 대해 grade 와 feedback 을 작성해 주세요. id 는 입력과 동일하게 유지하세요.`,
                },
            ],
            output_config: { format: jsonSchemaOutputFormat(evalSchema) },
        });
        parsed = resp.parsed_output;
    }
    catch (e) {
        throw mapAnthropicError(e);
    }
    if (!parsed?.evaluations) {
        throw new ClaudeContentError("INVALID_RESPONSE", "평가 응답이 비어 있습니다.");
    }
    return parsed;
}
