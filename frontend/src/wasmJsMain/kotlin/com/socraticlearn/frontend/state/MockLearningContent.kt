package com.socraticlearn.frontend.state

val MockExplanationBlocks = listOf(
    ExplanationBlock.Paragraph("코루틴은 함수를 도중에 멈췄다가 다시 이어서 실행할 수 있는 도구예요."),
    ExplanationBlock.Paragraph("네트워크 요청이나 외부 API 호출처럼 기다리는 시간이 긴 작업에서 스레드를 낭비하지 않도록 도와줍니다."),
    ExplanationBlock.Heading("스레드와 비교"),
    ExplanationBlock.Paragraph("OS 스레드는 생성과 전환 비용이 크지만, 코루틴은 필요한 상태만 작게 저장했다가 다시 이어갈 수 있습니다."),
    ExplanationBlock.Code("""suspend fun loadProfile(id: Long) = coroutineScope {
    val user = async { api.user(id) }
    val posts = async { api.posts(id) }
    Profile(user.await(), posts.await())
}"""),
)

sealed interface ExplanationBlock {
    data class Paragraph(val text: String) : ExplanationBlock
    data class Heading(val text: String) : ExplanationBlock
    data class Code(val code: String) : ExplanationBlock
}
