package com.socraticlearn.frontend.api

/**
 * shared contract ?? 머지 전까지 실제 API/SSE 구현은 보류한다.
 *
 * feature/fe-stream 단계에서는 화면 컴포넌트와 통합 지점을 분리해 두고,
 * Shared의 SseEvent/AnswerSubmission 계약이 들어온 뒤 window.fetch + ReadableStream 기반으로 교체한다.
 */
class CycleClient(
    private val endpoint: String = "http://localhost:9090/cycle",
) {
    fun endpointUrl(): String = endpoint

    suspend fun startCycle(@Suppress("UNUSED_PARAMETER") concept: String): Nothing {
        error("shared contract 머지 후 window.fetch + ReadableStream 기반으로 구현합니다.")
    }
}
