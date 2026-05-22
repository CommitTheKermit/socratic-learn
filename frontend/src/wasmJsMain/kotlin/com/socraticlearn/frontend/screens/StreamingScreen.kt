package com.socraticlearn.frontend.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.socraticlearn.frontend.state.ExplanationBlock
import com.socraticlearn.frontend.state.MockExplanationBlocks

private val Background = Color(0xFFEEF0F4)
private val TextPrimary = Color(0xFF16181D)
private val TextMuted = Color(0xFF5B6273)
private val Accent = Color(0xFF3B6DF0)
private val CodeBg = Color(0xFF16181D)

@Composable
fun StreamingScreen(
    concept: String,
    progress: Float,
    onJumpDone: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxSize()
            .background(Background)
            .padding(20.dp),
    ) {
        LearningRail(stage = "설명 생성 중")
        Spacer(Modifier.width(20.dp))
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight(),
            verticalArrangement = Arrangement.Center,
        ) {
            Text("설명을 생성하고 있어요", color = TextPrimary, fontSize = 30.sp, fontWeight = FontWeight.Bold)
            Text(
                modifier = Modifier.padding(top = 8.dp),
                text = concept.ifBlank { "코루틴이 왜 필요한지 알고 싶어요" },
                color = TextMuted,
                fontSize = 16.sp,
            )
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 22.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(28.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
            ) {
                Column(Modifier.padding(26.dp)) {
                    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Text("설명 생성 중", color = Accent, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        Button(onClick = onJumpDone) { Text("끝으로") }
                    }
                    LinearProgressIndicator(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 12.dp),
                        progress = { progress.coerceIn(0f, 1f) },
                    )
                    Column(
                        modifier = Modifier
                            .padding(top = 18.dp)
                            .height(420.dp)
                            .verticalScroll(rememberScrollState()),
                    ) {
                        val visibleCount = ((MockExplanationBlocks.size * progress.coerceIn(0f, 1f)).toInt() + 1)
                            .coerceIn(1, MockExplanationBlocks.size)
                        MockExplanationBlocks.take(visibleCount).forEach { block ->
                            ExplanationBlockView(block)
                            Spacer(Modifier.height(14.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ExplanationBlockView(block: ExplanationBlock) {
    when (block) {
        is ExplanationBlock.Paragraph -> Text(block.text, color = TextPrimary, fontSize = 17.sp, lineHeight = 28.sp)
        is ExplanationBlock.Heading -> Text(block.text, color = TextPrimary, fontSize = 21.sp, fontWeight = FontWeight.Bold)
        is ExplanationBlock.Code -> Surface(color = CodeBg, shape = RoundedCornerShape(16.dp)) {
            Text(
                modifier = Modifier.padding(16.dp),
                text = block.code,
                color = Color(0xFFE9ECF2),
                fontFamily = FontFamily.Monospace,
                fontSize = 13.sp,
                lineHeight = 20.sp,
            )
        }
    }
}

@Composable
fun LearningRail(stage: String) {
    Surface(
        modifier = Modifier
            .width(220.dp)
            .fillMaxHeight(),
        color = Color.White,
        shape = RoundedCornerShape(28.dp),
        shadowElevation = 6.dp,
    ) {
        Column(Modifier.padding(22.dp)) {
            Text("Socratic", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 20.sp)
            Text("현재 단계", modifier = Modifier.padding(top = 28.dp), color = TextMuted, fontSize = 13.sp)
            Text(stage, modifier = Modifier.padding(top = 8.dp), color = Accent, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }
    }
}
