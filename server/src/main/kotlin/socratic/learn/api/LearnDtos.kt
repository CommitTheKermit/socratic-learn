package socratic.learn.api

import kotlinx.serialization.Serializable

@Serializable
data class LearnStreamRequest(
    val concept: String,
    val language: String = "ko",
)

@Serializable
data class StreamStatusEvent(
    val status: String,
    val message: String,
)

@Serializable
data class StreamDeltaEvent(
    val text: String,
)

@Serializable
data class StreamCompleteEvent(
    val content: String,
)

@Serializable
data class StreamErrorEvent(
    val code: String,
    val message: String,
)
