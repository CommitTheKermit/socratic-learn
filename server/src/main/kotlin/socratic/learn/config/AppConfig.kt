package socratic.learn.config

data class AppConfig(
    val server: ServerConfig,
    val claude: ClaudeConfig,
) {
    companion object {
        fun fromEnv(env: Map<String, String> = System.getenv()): AppConfig = AppConfig(
            server = ServerConfig(
                port = env["PORT"]?.toIntOrNull() ?: 8080,
            ),
            claude = ClaudeConfig(
                apiKey = env["ANTHROPIC_API_KEY"]?.takeIf { it.isNotBlank() },
                model = env["ANTHROPIC_MODEL"]?.takeIf { it.isNotBlank() }
                    ?: "claude-sonnet-4-5-20250929",
                apiUrl = env["ANTHROPIC_API_URL"]?.takeIf { it.isNotBlank() }
                    ?: "https://api.anthropic.com/v1/messages",
                maxTokens = env["ANTHROPIC_MAX_TOKENS"]?.toIntOrNull() ?: 1200,
            ),
        )
    }
}

data class ServerConfig(
    val port: Int,
)

data class ClaudeConfig(
    val apiKey: String?,
    val model: String,
    val apiUrl: String,
    val maxTokens: Int,
)
