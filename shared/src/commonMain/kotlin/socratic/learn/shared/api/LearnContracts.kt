package socratic.learn.shared.api

import kotlinx.serialization.Serializable

@Serializable
data class LearnStreamRequest(
    val concept: String,
    val language: String = "ko",
)
