package socratic.learn.claude

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject
import org.slf4j.LoggerFactory
import socratic.learn.config.ClaudeConfig
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.util.stream.Collectors

class AnthropicClaudeClient(
    private val config: ClaudeConfig,
    private val httpClient: HttpClient = HttpClient.newHttpClient(),
    private val json: Json = Json { ignoreUnknownKeys = true },
) : ClaudeClient {
    private val logger = LoggerFactory.getLogger(AnthropicClaudeClient::class.java)

    override fun streamLearning(
        concept: String,
        language: String,
        onDelta: (String) -> Unit,
    ): String {
        val apiKey = config.apiKey ?: throw MissingClaudeApiKeyException()
        val requestBody = buildRequestBody(concept = concept, language = language)
        val request = HttpRequest.newBuilder(URI.create(config.apiUrl))
            .header("content-type", "application/json")
            .header("x-api-key", apiKey)
            .header("anthropic-version", "2023-06-01")
            .POST(HttpRequest.BodyPublishers.ofString(requestBody))
            .build()

        val response = httpClient.send(request, HttpResponse.BodyHandlers.ofLines())
        response.body().use { lines ->
            if (response.statusCode() !in 200..299) {
                val errorBody = lines.collect(Collectors.joining("\n"))
                throw ClaudeApiException(response.statusCode(), errorBody)
            }

            val collected = StringBuilder()
            lines.forEach { line ->
                val data = line.removePrefix("data: ").takeIf { line.startsWith("data: ") }
                    ?: return@forEach
                if (data == "[DONE]") return@forEach

                val delta = parseTextDelta(data) ?: return@forEach
                collected.append(delta)
                onDelta(delta)
            }
            return collected.toString()
        }
    }

    private fun buildRequestBody(concept: String, language: String): String = buildJsonObject {
        put("model", config.model)
        put("max_tokens", config.maxTokens)
        put("stream", true)
        put("system", LearningPrompt.systemInstruction(language = language))
        putJsonArray("messages") {
            add(
                buildJsonObject {
                    put("role", "user")
                    put("content", LearningPrompt.userMessage(concept = concept))
                },
            )
        }
    }.toString()

    private fun parseTextDelta(data: String): String? = runCatching {
        val root = json.parseToJsonElement(data).jsonObject
        if (root["type"]?.jsonPrimitive?.contentOrNull != "content_block_delta") return null

        val delta = root["delta"]?.jsonObject ?: return null
        if (delta["type"]?.jsonPrimitive?.contentOrNull != "text_delta") return null

        delta["text"]?.jsonPrimitive?.contentOrNull
    }.onFailure { exception ->
        logger.debug("Claude SSE chunk parse failed and was ignored: {}", exception.message)
    }.getOrNull()
}

class MissingClaudeApiKeyException : RuntimeException(
    "ANTHROPIC_API_KEY 환경변수가 필요합니다.",
)

class ClaudeApiException(
    val statusCode: Int,
    val errorBody: String,
) : RuntimeException("Claude API 요청 실패: status=$statusCode body=$errorBody")
