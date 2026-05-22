package socratic.learn.claude

interface ClaudeClient {
    /**
     * Streams generated learning text through [onDelta] and returns the full collected text.
     */
    fun streamLearning(
        concept: String,
        language: String = "ko",
        onDelta: (String) -> Unit,
    ): String
}
