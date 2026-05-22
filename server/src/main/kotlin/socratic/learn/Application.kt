package socratic.learn

import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.Application
import io.ktor.server.application.call
import io.ktor.server.application.install
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.cors.routing.CORS
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import socratic.learn.api.answerRoutes
import socratic.learn.api.learnRoutes
import socratic.learn.claude.AnthropicClaudeClient
import socratic.learn.claude.ClaudeClient
import socratic.learn.config.AppConfig
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

fun main() {
    val config = AppConfig.fromEnv()
    embeddedServer(Netty, port = config.server.port, host = "0.0.0.0") {
        module(config = config)
    }.start(wait = true)
}

fun Application.module(
    config: AppConfig = AppConfig.fromEnv(),
    claudeClient: ClaudeClient = AnthropicClaudeClient(config.claude),
) {
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            ignoreUnknownKeys = true
            encodeDefaults = true
        })
    }

    install(CORS) {
        anyHost()
    }

    routing {
        get("/health") {
            call.respond(HttpStatusCode.OK, HealthResponse(status = "ok"))
        }

        learnRoutes(claudeClient)
        answerRoutes()
    }
}

@Serializable
data class HealthResponse(
    val status: String,
)
