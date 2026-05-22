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

class AnswerRoutesTest {
    @Test
    fun `answers endpoint receives submitted answers`() = testApplication {
        application {
            module()
        }

        val response = client.post("/answers") {
            header(HttpHeaders.ContentType, "application/json")
            setBody(
                """
                {
                  "sessionId": "local-session-1",
                  "concept": "코루틴",
                  "answers": [
                    {
                      "questionId": "q1",
                      "question": "코루틴은 무엇인가요?",
                      "answer": "가벼운 동시성 단위입니다.",
                      "unknown": false
                    },
                    {
                      "questionId": "q2",
                      "question": "suspend는 언제 쓰나요?",
                      "unknown": true
                    }
                  ]
                }
                """.trimIndent(),
            )
        }

        assertEquals(HttpStatusCode.OK, response.status)
        val body = response.bodyAsText()
        assertContains(body, "received")
        assertContains(body, "답변 제출을 정상적으로 받았습니다")
        assertContains(body, "2")
    }

    @Test
    fun `answers endpoint rejects empty answers`() = testApplication {
        application {
            module()
        }

        val response = client.post("/answers") {
            header(HttpHeaders.ContentType, "application/json")
            setBody("""{"answers":[]}""")
        }

        assertEquals(HttpStatusCode.BadRequest, response.status)
        assertContains(response.bodyAsText(), "EMPTY_ANSWERS")
    }
}
