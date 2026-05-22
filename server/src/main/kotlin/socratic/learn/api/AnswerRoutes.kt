package socratic.learn.api

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.post

fun Route.answerRoutes() {
    post("/answers") {
        val request = call.receive<AnswerSubmissionRequest>()
        if (request.answers.isEmpty()) {
            call.respond(
                HttpStatusCode.BadRequest,
                ErrorResponse(
                    code = "EMPTY_ANSWERS",
                    message = "answers는 최소 1개 이상이어야 합니다.",
                ),
            )
            return@post
        }

        call.respond(
            HttpStatusCode.OK,
            AnswerSubmissionResponse(
                status = "received",
                receivedCount = request.answers.size,
                message = "답변 제출을 정상적으로 받았습니다.",
            ),
        )
    }
}
