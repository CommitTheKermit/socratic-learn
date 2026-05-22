package socratic.learn.api

import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.header
import io.ktor.server.response.respond
import io.ktor.server.response.respondTextWriter
import io.ktor.server.routing.Route
import io.ktor.server.routing.post
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import socratic.learn.claude.ClaudeApiException
import socratic.learn.claude.ClaudeClient
import socratic.learn.claude.MissingClaudeApiKeyException
import org.slf4j.LoggerFactory
import java.io.Writer

private val logger = LoggerFactory.getLogger("socratic.learn.api.LearnRoutes")

private val sseJson = Json {
    encodeDefaults = true
}

fun Route.learnRoutes(claudeClient: ClaudeClient) {
    post("/learn/stream") {
        val request = call.receive<LearnStreamRequest>()
        if (request.concept.isBlank()) {
            call.respond(
                HttpStatusCode.BadRequest,
                ErrorResponse(
                    code = "INVALID_CONCEPT",
                    message = "concept는 비어 있을 수 없습니다.",
                ),
            )
            return@post
        }

        call.response.header(HttpHeaders.CacheControl, "no-cache")
        call.response.header(HttpHeaders.Connection, "keep-alive")
        call.respondTextWriter(contentType = ContentType.Text.EventStream) {
            writeSse(
                event = "status",
                data = StreamStatusEvent(
                    status = "started",
                    message = "Claude 학습 스트리밍을 시작합니다.",
                ),
            )
            flush()

            try {
                val fullContent = withContext(Dispatchers.IO) {
                    claudeClient.streamLearning(
                        concept = request.concept,
                        language = request.language,
                    ) { delta ->
                        writeSse(event = "delta", data = StreamDeltaEvent(text = delta))
                        flush()
                    }
                }

                writeSse(event = "complete", data = StreamCompleteEvent(content = fullContent))
                flush()
            } catch (exception: MissingClaudeApiKeyException) {
                writeSse(
                    event = "error",
                    data = StreamErrorEvent(
                        code = "MISSING_CLAUDE_API_KEY",
                        message = exception.message ?: "ANTHROPIC_API_KEY 환경변수가 필요합니다.",
                    ),
                )
                flush()
            } catch (exception: ClaudeApiException) {
                writeSse(
                    event = "error",
                    data = StreamErrorEvent(
                        code = "CLAUDE_API_ERROR",
                        message = "Claude API 요청 실패: status=${exception.statusCode}",
                    ),
                )
                flush()
            } catch (exception: Exception) {
                logger.error("Unhandled learn stream failure", exception)
                writeSse(
                    event = "error",
                    data = StreamErrorEvent(
                        code = "INTERNAL_ERROR",
                        message = "알 수 없는 서버 오류가 발생했습니다.",
                    ),
                )
                flush()
            }
        }
    }
}

private inline fun <reified T> Writer.writeSse(event: String, data: T) {
    write("event: $event\n")
    write("data: ${sseJson.encodeToString(data)}\n\n")
}
