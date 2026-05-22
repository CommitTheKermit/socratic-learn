package com.socraticlearn.frontend.state

val MockQuestions = listOf(
    CheckQuestion(
        id = "q1",
        text = "OS 스레드 1만 개를 만드는 건 어려운데 코루틴 1만 개는 보통 어렵지 않아요. 가장 큰 이유 하나를 한 줄로 적어 주세요.",
        placeholder = "예: 코루틴은 스택을 통째로 갖지 않아서…",
        hint = "메모리/스택 관점에서 생각해 보세요.",
    ),
    CheckQuestion(
        id = "q2",
        text = "await를 만났을 때 정확히 어떤 일이 일어나나요? 스레드가 멈춘다는 말은 왜 부정확한지 함께 적어 보세요.",
        placeholder = "코루틴은 …, 그동안 스레드는 …",
        hint = "주체를 분리해서 적으면 쉬워요.",
    ),
    CheckQuestion(
        id = "q3",
        text = "CPU를 계속 쓰는 무거운 계산 작업을 코루틴으로 바꾸면 빨라질까요? Yes/No와 이유 한 줄을 적어 주세요.",
        placeholder = "예: 아니오. 왜냐하면…",
        hint = "코루틴이 해결하는 문제와 그렇지 않은 문제를 구분해 보세요.",
    ),
)

data class CheckQuestion(
    val id: String,
    val text: String,
    val placeholder: String,
    val hint: String,
)

data class AnswerSubmissionDraft(
    val answers: Map<String, String>,
    val skippedQuestionIds: Set<String>,
)
