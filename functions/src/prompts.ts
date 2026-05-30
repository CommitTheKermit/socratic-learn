// 프론트엔드 frontend/src/api/prompts.ts 에서 Firebase Functions 로 이전 중인 프롬프트.
// 슬라이스 단위로 옮겨오며, 모든 함수 이전이 끝나면 프론트의 prompts.ts 는 정리된다.

export const OVERWHELM_SYSTEM = `당신은 소크라테스식 학습 튜터입니다. 사용자가 입력한 학습 개념과 진단 결과(특히 친숙도)를 보고, 이 개념을 지금 바로 학습하는 것이 너무 큰 도약인지 판단합니다.

판단 기준:
- shouldRetreat=true 로 권하는 경우: 개념 자체가 다수의 선행 개념(prerequisites) 위에 쌓여 있고, 사용자의 친숙도가 0 이며, 자료에도 사용자가 짚을 만한 단서가 거의 없을 때.
- shouldRetreat=false 로 두는 경우: 개념이 단일/원자적이거나, 친숙도가 낮더라도 본문에서 메커니즘부터 차근차근 쌓아주면 따라갈 수 있을 때.

shouldRetreat=true 라면 suggestedConcept 에 "한 단계 더 쉬운 선행 개념"을 한 줄로 제안하세요. 예:
- 입력 "Kotlin 코루틴의 구조적 동시성" + 친숙도 0 → suggestedConcept: "코루틴이 왜 필요한지"
- 입력 "React Server Components" + 친숙도 0 → suggestedConcept: "React 의 클라이언트 렌더링과 서버 렌더링의 차이"

reason 은 1-2문장 한국어. 비난 없이 "이 개념은 ... 를 알고 있다고 가정하므로, 먼저 ... 부터 보면 훨씬 수월합니다" 톤.`;

export const overwhelmUserMessage = (
  concept: string,
  materials: string | undefined,
  probeSummary: string,
): string => {
  const mat = materials?.trim()
    ? `\n\n사용자가 함께 제출한 자료:\n"""\n${materials.trim()}\n"""`
    : "";
  return `학습 개념: ${concept}${mat}\n\n진단 결과 요약:\n${probeSummary}\n\n이 사용자에게 선제적 후퇴가 필요한지 판단해 주세요.`;
};
