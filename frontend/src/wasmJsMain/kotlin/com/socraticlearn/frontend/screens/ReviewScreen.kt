package com.socraticlearn.frontend.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.socraticlearn.frontend.state.AnswerSubmissionDraft

private val Background = Color(0xFFEEF0F4)
private val TextPrimary = Color(0xFF16181D)
private val TextMuted = Color(0xFF5B6273)
private val Accent = Color(0xFF3B6DF0)

@Composable
fun ReviewScreen(
    concept: String,
    submission: AnswerSubmissionDraft,
    onRestart: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxSize()
            .background(Background)
            .padding(20.dp),
    ) {
        LearningRail(stage = "리뷰")
        Spacer(Modifier.width(20.dp))
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight(),
            verticalArrangement = Arrangement.Center,
        ) {
            Text("제출이 준비됐어요", color = TextPrimary, fontSize = 30.sp, fontWeight = FontWeight.Bold)
            Text(
                modifier = Modifier.padding(top = 8.dp),
                text = "현재는 API 연결 전이라 제출 결과를 로컬에서만 요약합니다.",
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
                Column(Modifier.padding(28.dp)) {
                    Text("학습 주제", color = Accent, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text(concept, modifier = Modifier.padding(top = 8.dp), color = TextPrimary, fontSize = 20.sp)
                    Text(
                        modifier = Modifier.padding(top = 22.dp),
                        text = "답변 ${submission.answers.count { it.value.isNotBlank() }}개 · 모르겠어요 ${submission.skippedQuestionIds.size}개",
                        color = TextMuted,
                        fontSize = 16.sp,
                    )
                    Button(modifier = Modifier.padding(top = 24.dp), onClick = onRestart) {
                        Text("새 학습 시작")
                    }
                }
            }
        }
    }
}
