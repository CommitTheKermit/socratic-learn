package socratic.learn

import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.server.testing.testApplication
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import socratic.learn.claude.ClaudeClient
import socratic.learn.config.AppConfig

class LearnRoutesTest {
    @Test
    fun `learn stream returns sse deltas from claude client`() = testApplication {
        application {
            module(
                config = AppConfig.fromEnv(emptyMap()),
                claudeClient = FakeClaudeClient(listOf("코루틴은 ", "가벼운 동시성입니다.")),
            )
        }

        val response = client.post("/learn/stream") {
            header(HttpHeaders.ContentType, "application/json")
            setBody("""{"concept":"코루틴","language":"ko"}""")
        }

        assertEquals(HttpStatusCode.OK, response.status)
        val body = response.bodyAsText()
        assertContains(body, "event: status")
        assertContains(body, "event: delta")
        assertContains(body, "코루틴은 ")
        assertContains(body, "event: complete")
    }

    @Test
    fun `learn stream rejects blank concept`() = testApplication {
        application {
            module(
                config = AppConfig.fromEnv(emptyMap()),
                claudeClient = FakeClaudeClient(emptyList()),
            )
        }

        val response = client.post("/learn/stream") {
            header(HttpHeaders.ContentType, "application/json")
            setBody("""{"concept":"   ","language":"ko"}""")
        }

        assertEquals(HttpStatusCode.BadRequest, response.status)
        assertContains(response.bodyAsText(), "INVALID_CONCEPT")
    }
}

private class FakeClaudeClient(
    private val deltas: List<String>,
) : ClaudeClient {
    override fun streamLearning(
        concept: String,
        language: String,
        onDelta: (String) -> Unit,
    ): String {
        deltas.forEach(onDelta)
        return deltas.joinToString(separator = "")
    }
}
