package socratic.learn.claude

import kotlin.test.Test
import kotlin.test.assertContains

class LearningPromptTest {
    @Test
    fun `prompt includes concept and question instruction`() {
        val prompt = LearningPrompt.build(concept = "코루틴", language = "ko")

        assertContains(prompt, "코루틴")
        assertContains(prompt, "이해 확인 질문")
        assertContains(prompt, "언어: ko")
    }
}
