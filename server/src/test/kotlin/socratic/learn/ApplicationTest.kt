package socratic.learn

import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.http.HttpStatusCode
import io.ktor.server.testing.testApplication
import kotlin.test.Test
import kotlin.test.assertEquals
import socratic.learn.config.AppConfig

class ApplicationTest {
    @Test
    fun `health endpoint returns ok`() = testApplication {
        application {
            module(config = AppConfig.fromEnv(emptyMap()))
        }

        val response = client.get("/health")

        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals("""
            {
                "status": "ok"
            }
        """.trimIndent(), response.body<String>().trim())
    }
}
