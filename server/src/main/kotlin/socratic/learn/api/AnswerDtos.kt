package socratic.learn.api

import kotlinx.serialization.Serializable

@Serializable
data class AnswerSubmissionRequest(
    val sessionId: String? = null,
    val concept: String? = null,
    val answers: List<AnswerItem>,
)

@Serializable
data class AnswerItem(
    val questionId: String? = null,
    val question: String? = null,
    val answer: String? = null,
    val unknown: Boolean = false,
)

@Serializable
data class AnswerSubmissionResponse(
    val status: String,
    val receivedCount: Int,
    val message: String,
)

@Serializable
data class ErrorResponse(
    val code: String,
    val message: String,
)
