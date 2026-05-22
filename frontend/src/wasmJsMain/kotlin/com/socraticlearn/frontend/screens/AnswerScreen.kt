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
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.socraticlearn.frontend.state.AnswerSubmissionDraft
import com.socraticlearn.frontend.state.CheckQuestion
import com.socraticlearn.frontend.state.MockQuestions

private val Background = Color(0xFFEEF0F4)
private val TextPrimary = Color(0xFF16181D)
private val TextMuted = Color(0xFF5B6273)
private val TextSoft = Color(0xFF8A91A3)
private val Accent = Color(0xFF3B6DF0)
private val SkipBg = Color(0xFFF1EADB)

@Composable
fun AnswerScreen(
    questions: List<CheckQuestion> = MockQuestions,
    onSubmit: (AnswerSubmissionDraft) -> Unit,
    modifier: Modifier = Modifier,
) {
    val answers = remember { mutableStateMapOf<String, String>() }
    var skipped by remember { mutableStateOf(setOf<String>()) }

    Row(
        modifier = modifier
            .fillMaxSize()
            .background(Background)
            .padding(20.dp),
    ) {
        LearningRail(stage = "질문 답변")
        Spacer(Modifier.width(20.dp))
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight(),
        ) {
            Text("확인 질문에 답해 보세요", color = TextPrimary, fontSize = 30.sp, fontWeight = FontWeight.Bold)
            Text(
                modifier = Modifier.padding(top = 8.dp),
                text = "모르는 문항은 바로 표시하고, 모든 답변은 한 번에 제출합니다.",
                color = TextMuted,
                fontSize = 16.sp,
            )
            Column(
                modifier = Modifier
                    .padding(top = 20.dp)
                    .weight(1f)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                questions.forEachIndexed { index, question ->
                    QuestionAnswerCard(
                        index = index + 1,
                        question = question,
                        answer = answers[question.id].orEmpty(),
                        skipped = question.id in skipped,
                        onAnswer = { value -> answers[question.id] = value },
                        onToggleSkip = {
                            val willSkip = question.id !in skipped
                            skipped = if (willSkip) skipped + question.id else skipped - question.id
                            if (willSkip) answers[question.id] = ""
                        },
                    )
                }
            }
            val answeredCount = questions.count { q -> answers[q.id].orEmpty().isNotBlank() || q.id in skipped }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 18.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("$answeredCount / ${questions.size} 문항 완료", color = TextMuted, fontSize = 14.sp)
                Button(
                    enabled = answeredCount == questions.size,
                    colors = ButtonDefaults.buttonColors(containerColor = Accent),
                    onClick = {
                        onSubmit(
                            AnswerSubmissionDraft(
                                answers = questions
                                    .filterNot { it.id in skipped }
                                    .associate { it.id to answers[it.id].orEmpty() },
                                skippedQuestionIds = skipped,
                            ),
                        )
                    },
                ) {
                    Text("답변 한 번에 제출")
                }
            }
        }
    }
}

@Composable
private fun QuestionAnswerCard(
    index: Int,
    question: CheckQuestion,
    answer: String,
    skipped: Boolean,
    onAnswer: (String) -> Unit,
    onToggleSkip: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(24.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 5.dp),
    ) {
        Column(Modifier.padding(22.dp)) {
            Text("Q$index", color = Accent, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            Text(
                modifier = Modifier.padding(top = 8.dp),
                text = question.text,
                color = TextPrimary,
                fontSize = 16.sp,
                lineHeight = 25.sp,
            )
            Text(
                modifier = Modifier.padding(top = 8.dp),
                text = question.hint,
                color = TextSoft,
                fontSize = 13.sp,
            )
            OutlinedTextField(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 14.dp),
                value = answer,
                onValueChange = onAnswer,
                enabled = !skipped,
                placeholder = { Text(question.placeholder) },
                minLines = 2,
                shape = RoundedCornerShape(18.dp),
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp)
                    .background(if (skipped) SkipBg else Color.Transparent, RoundedCornerShape(14.dp))
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Checkbox(checked = skipped, onCheckedChange = { onToggleSkip() })
                Text("모르겠어요", color = TextMuted, fontSize = 14.sp)
            }
        }
    }
}
