package socratic.learn.shared

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import socratic.learn.shared.api.ApiPaths
import socratic.learn.shared.api.AnswerItem
import socratic.learn.shared.api.LearnStreamRequest
import socratic.learn.shared.event.SseEvents

class SharedContractsTest {
    @Test
    fun `api paths are stable`() {
        assertEquals("/health", ApiPaths.HEALTH)
        assertEquals("/learn/stream", ApiPaths.LEARN_STREAM)
        assertEquals("/answers", ApiPaths.ANSWERS)
    }

    @Test
    fun `sse event names are stable`() {
        assertEquals("status", SseEvents.STATUS)
        assertEquals("delta", SseEvents.DELTA)
        assertEquals("complete", SseEvents.COMPLETE)
        assertEquals("error", SseEvents.ERROR)
    }

    @Test
    fun `dto defaults match api expectations`() {
        assertEquals("ko", LearnStreamRequest(concept = "코루틴").language)
        assertFalse(AnswerItem().unknown)
    }
}
