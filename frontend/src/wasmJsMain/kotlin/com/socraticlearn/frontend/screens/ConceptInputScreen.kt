package com.socraticlearn.frontend.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.socraticlearn.frontend.state.RecentSessions
import com.socraticlearn.frontend.state.SampleConcept

private val Background = Color(0xFFEEF0F4)
private val TextPrimary = Color(0xFF16181D)
private val TextMuted = Color(0xFF5B6273)
private val TextSoft = Color(0xFF8A91A3)
private val Accent = Color(0xFF3B6DF0)
private val SurfaceAlt = Color(0xFFF4F6FA)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConceptInputScreen(
    onStart: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var concept by remember { mutableStateOf("") }

    Row(
        modifier = modifier
            .fillMaxSize()
            .background(Background)
            .padding(20.dp),
    ) {
        Sidebar()
        Spacer(Modifier.width(20.dp))
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight(),
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                text = "무엇을 배우고 싶나요?",
                color = TextPrimary,
                fontSize = 34.sp,
                fontWeight = FontWeight.Bold,
            )
            Text(
                modifier = Modifier.padding(top = 10.dp),
                text = "한 줄로 적으면 AI가 설명과 확인 질문을 준비합니다.",
                color = TextMuted,
                fontSize = 17.sp,
            )
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 28.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(28.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
            ) {
                Column(Modifier.padding(28.dp)) {
                    Text(
                        text = "학습 주제",
                        color = TextPrimary,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    OutlinedTextField(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 12.dp),
                        value = concept,
                        onValueChange = { concept = it },
                        placeholder = { Text("예: 코루틴이 왜 필요한지 알고 싶어요") },
                        minLines = 3,
                        shape = RoundedCornerShape(18.dp),
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 18.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Button(
                            onClick = { concept = SampleConcept },
                            colors = ButtonDefaults.buttonColors(containerColor = SurfaceAlt, contentColor = TextPrimary),
                        ) {
                            Text("예시 채우기")
                        }
                        Button(
                            onClick = { onStart(concept.trim()) },
                            enabled = concept.isNotBlank(),
                            colors = ButtonDefaults.buttonColors(containerColor = Accent),
                        ) {
                            Text("학습 시작")
                        }
                    }
                    Text(
                        modifier = Modifier.padding(top = 14.dp),
                        text = "API/SSE 연결은 shared contract 머지 이후 연결하고, 지금은 UI 흐름을 먼저 만듭니다.",
                        color = TextSoft,
                        fontSize = 13.sp,
                    )
                }
            }
        }
    }
}

@Composable
private fun Sidebar() {
    Surface(
        modifier = Modifier
            .width(280.dp)
            .fillMaxHeight(),
        color = Color.White,
        shape = RoundedCornerShape(28.dp),
        shadowElevation = 6.dp,
    ) {
        Column(Modifier.padding(22.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .background(Accent, RoundedCornerShape(14.dp))
                        .padding(horizontal = 13.dp, vertical = 9.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("S", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                }
                Spacer(Modifier.width(12.dp))
                Column {
                    Text("Socratic", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Text("learn · v0.1", color = TextSoft, fontSize = 12.sp)
                }
            }

            Text(
                modifier = Modifier.padding(top = 28.dp, bottom = 10.dp),
                text = "최근 학습",
                color = TextSoft,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
            )
            RecentSessions.forEach { session ->
                val bg = if (session.active) Color(0xFFDDE4F7) else Color.Transparent
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(bg, RoundedCornerShape(16.dp))
                        .padding(14.dp),
                ) {
                    Text(session.title, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(4.dp))
                    Text("${session.topic} · ${session.time}", color = TextMuted, fontSize = 12.sp)
                }
                Spacer(Modifier.height(8.dp))
            }

            Spacer(Modifier.weight(1f))
            Text("14.2k / 60k tok", color = TextSoft, fontSize = 12.sp)
        }
    }
}
