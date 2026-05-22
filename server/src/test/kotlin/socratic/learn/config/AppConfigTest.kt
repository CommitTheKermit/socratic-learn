package socratic.learn.config

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class AppConfigTest {
    @Test
    fun `uses local defaults when env is absent`() {
        val config = AppConfig.fromEnv(emptyMap())

        assertEquals(8080, config.server.port)
        assertNull(config.claude.apiKey)
        assertEquals("claude-sonnet-4-5-20250929", config.claude.model)
        assertEquals("https://api.anthropic.com/v1/messages", config.claude.apiUrl)
        assertEquals(1200, config.claude.maxTokens)
    }

    @Test
    fun `reads server and claude env values`() {
        val config = AppConfig.fromEnv(
            mapOf(
                "PORT" to "9090",
                "ANTHROPIC_API_KEY" to "test-key",
                "ANTHROPIC_MODEL" to "custom-model",
                "ANTHROPIC_API_URL" to "http://localhost/mock",
                "ANTHROPIC_MAX_TOKENS" to "300",
            ),
        )

        assertEquals(9090, config.server.port)
        assertEquals("test-key", config.claude.apiKey)
        assertEquals("custom-model", config.claude.model)
        assertEquals("http://localhost/mock", config.claude.apiUrl)
        assertEquals(300, config.claude.maxTokens)
    }
}
