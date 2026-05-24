export const SAMPLE_CONCEPT = "코루틴이 왜 필요한지";
export const PROBE_QUESTIONS = [
    {
        id: "p1",
        kind: "choice",
        q: "이 개념을 들었을 때 어떤 느낌이 드시나요?",
        options: [
            { value: 0, label: "단어 자체가 처음이에요" },
            { value: 1, label: "어디서 들어본 적은 있어요" },
            { value: 2, label: "어떤 맥락에서 쓰이는지 알아요" },
            { value: 3, label: "직접 다뤄본 적이 있어요" },
        ],
    },
    {
        id: "p2",
        kind: "multi",
        q: "연관 있어 보이는 단어를 모두 골라주세요",
        sub: "정확하지 않아도 괜찮아요. 감으로 골라도 됩니다.",
        options: [
            { value: "thread", label: "스레드", correct: true },
            { value: "suspend", label: "suspend", correct: true },
            { value: "async", label: "async/await", correct: true },
            { value: "callback", label: "콜백", correct: true },
            { value: "index", label: "DB 인덱스", correct: false },
            { value: "shader", label: "셰이더", correct: false },
        ],
    },
    {
        id: "p3",
        kind: "text",
        q: "이 개념이 해결하려는 문제를 한 줄로 적어볼까요?",
        placeholder: "모르면 비워두셔도 괜찮아요",
    },
];
export const LEVEL_LABELS = [
    "처음 만나는 단계",
    "단어를 알고 있는 단계",
    "맥락을 이해하는 단계",
    "직접 다뤄본 단계",
    "설명할 수 있는 단계",
];
export function estimateLevel(probes) {
    let score = 0;
    if (typeof probes.p1 === "number")
        score += probes.p1 * 1.2;
    const picks = probes.p2 ?? [];
    const opts = PROBE_QUESTIONS[1].options;
    for (const v of picks) {
        const o = opts.find((o) => o.value === v);
        if (o)
            score += o.correct ? 0.8 : -1;
    }
    const len = (probes.p3 ?? "").trim().length;
    if (len > 8)
        score += 0.5;
    if (len > 25)
        score += 0.7;
    return Math.max(0, Math.min(4, Math.round(score / 1.6)));
}
export function levelReason(probes, level) {
    const parts = [];
    const p1 = PROBE_QUESTIONS[0].options.find((o) => o.value === probes.p1);
    if (p1)
        parts.push(`"${p1.label}"라고 답하셨고`);
    const picks = probes.p2 ?? [];
    const opts = PROBE_QUESTIONS[1].options;
    const correct = picks.filter((v) => opts.find((o) => o.value === v)?.correct).length;
    const wrong = picks.length - correct;
    if (picks.length) {
        parts.push(`연관 단어 ${correct}개를 정확히 고르셨어요${wrong ? ` (관련 없는 단어 ${wrong}개 포함)` : ""}`);
    }
    if ((probes.p3 ?? "").trim().length > 8)
        parts.push("문장으로도 적어주셨네요");
    void level;
    return parts.length ? parts.join(", ") + "." : "답변을 기준으로 추정한 결과입니다.";
}
export const STEPS = [
    {
        id: 1,
        title: "동시성과 병렬성",
        desc: "헷갈리기 쉬운 두 단어부터",
        body: `**동시성(concurrency)**은 여러 일을 *번갈아* 다루는 능력입니다. 한 번에 하나씩 처리하더라도, 여러 일을 진행 중인 상태로 둘 수 있다면 동시성이 있다고 봅니다.

**병렬성(parallelism)**은 여러 일을 *같은 시각*에 처리하는 것을 말합니다. 코어가 두 개 이상 필요해요.

비유로 보면, 한 명이 양손으로 번갈아 일을 하면 동시성, 두 명이 따로 하면 병렬성입니다. 코루틴은 이 중 **동시성**을 다루기 위한 도구입니다.`,
        questions: [
            { id: "1-1", q: "동시성과 병렬성의 차이를 한 줄로 정리해보세요.", hint: "코어 개수 관점에서" },
            { id: "1-2", q: "단일 코어 CPU에서도 동시성이 가능한 이유는?", hint: "번갈아…" },
        ],
    },
    {
        id: 2,
        title: "스레드의 비용",
        desc: "왜 더 가벼운 단위가 필요할까",
        body: `스레드는 OS 단위의 작업 단위라서, 만들고 끄는 비용이 큽니다. 한 스레드는 자기 **콜스택**을 통째로 들고 있고, 메모리로는 보통 \`1MB\` 정도를 차지합니다.

수천 개의 일을 동시에 다루려면 스레드를 그만큼 만들어야 할까요? 그건 너무 비싼 선택이에요. *컨텍스트 스위칭* 비용도 무시할 수 없습니다.

그래서 더 가벼운 단위가 필요해졌습니다.`,
        questions: [
            { id: "2-1", q: "스레드 한 개가 차지하는 메모리는 보통 어느 정도인가요?", hint: "MB 단위" },
            { id: "2-2", q: "수천 개의 동시 작업이 필요할 때 스레드만 쓰면 어떤 문제가 생기나요?", hint: "메모리와 스위칭 비용" },
        ],
    },
    {
        id: 3,
        title: "일시중단 함수",
        desc: "코루틴의 핵심 도구 - suspend",
        body: `\`suspend\` 함수는 *언제든 멈췄다가 이어서 실행될 수 있는* 함수입니다. 멈춤 지점은 컴파일러가 *상태 머신*으로 변환해 둡니다.

\`\`\`kotlin
suspend fun fetchUser(id: Int): User {
  val token = getToken()        // 멈춤 가능
  return api.user(id, token)    // 멈춤 가능
}
\`\`\`

코루틴이 멈춰 있는 동안 스레드는 다른 코루틴을 돌리면 됩니다. **스레드는 멈추지 않습니다.**`,
        questions: [
            { id: "3-1", q: "suspend 함수의 핵심 특징을 한 단어로 표현한다면?", hint: "멈춤 …" },
        ],
    },
    {
        id: 4,
        title: "코루틴이 가벼운 이유",
        desc: "콜스택 대신 상태 객체",
        body: `스레드처럼 콜스택을 통째로 들고 있는 대신, 코루틴은 **자기 상태를 작은 객체 하나**로 들고 갑니다.

그래서 한 스레드 위에서 *수천 개*의 코루틴을 굴릴 수 있어요. 새 스레드를 만들지 않고도 동시성을 얻는 것이 코루틴의 본질입니다.`,
        questions: [
            { id: "4-1", q: "코루틴이 자기 상태를 어떻게 들고 있나요?", hint: "단어 하나로도 OK" },
            { id: "4-2", q: "한 스레드 위에 코루틴을 여러 개 둘 수 있는 이유는?", hint: "콜스택 vs …" },
        ],
    },
];
export const STAGE_LABELS = {
    input: "개념 입력",
    probe: "수준 확인",
    roadmap: "단계 제시",
    explain: "개념 설명",
    questions: "확인 질문",
    answering: "질문 답변",
    done: "완료",
};
export const DEPTHS = [
    { value: "0depth", label: "0depth", hint: "한 줄로 핵심만" },
    { value: "1depth", label: "1depth", hint: "맥락과 흐름까지" },
    { value: "2depth", label: "2depth", hint: "깊은 원리까지" },
];
export const ACCENT_PRESETS = [
    ["#A8FFC9", "#7DE3FF", "#C8B6FF", "#FFB3D9"],
    ["#FFD6A5", "#FFADAD", "#FFC6FF", "#BDB2FF"],
    ["#A8FFD9", "#A0E7E5", "#B5DEFF", "#CABFFF"],
    ["#FFE5B4", "#FFB997", "#FF9AA2", "#FFC9DE"],
    ["#E2F89C", "#A8FFC9", "#7DE3FF", "#B6CEFA"],
    ["#FBC2EB", "#A6C1EE"],
    ["#FDE68A", "#FCA5A5", "#F9A8D4"],
    ["#C7D2FE", "#A5F3FC", "#BBF7D0"],
];
export const PHASES = [
    { id: "probe", label: "수준 확인" },
    { id: "roadmap", label: "단계 제시" },
    { id: "learn", label: "학습 진행" },
    { id: "done", label: "완료" },
];
export const LEARN_STAGES = ["explain", "questions", "answering"];
export function phaseOf(stage) {
    if (LEARN_STAGES.includes(stage))
        return "learn";
    if (stage === "input")
        return null;
    return stage;
}
