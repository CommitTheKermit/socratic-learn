package com.socraticlearn.frontend

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.window.ComposeViewport

@OptIn(ExperimentalComposeUiApi::class)
fun main() {
    ComposeViewport(viewportContainerId = "webApp") {
        App()
    }
}

@Composable
fun App() {
    MaterialTheme {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFEEF0F4)),
            contentAlignment = Alignment.Center,
        ) {
            Surface(
                modifier = Modifier.size(width = 520.dp, height = 280.dp),
                color = Color.White,
                shape = RoundedCornerShape(28.dp),
                shadowElevation = 10.dp,
            ) {
                Column(
                    modifier = Modifier.padding(32.dp),
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(
                        text = "Socratic Learn Web",
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF16181D),
                    )
                    Text(
                        modifier = Modifier.padding(top = 12.dp),
                        text = "Compose Multiplatform Web(Wasm) ?대씪?댁뼵??以鍮??꾨즺",
                        fontSize = 18.sp,
                        color = Color(0xFF5B6273),
                    )
                    Text(
                        modifier = Modifier.padding(top = 20.dp),
                        text = "?ㅼ쓬 PR?먯꽌 媛쒕뀗 ?낅젰 ?붾㈃???곌껐?⑸땲??",
                        fontSize = 14.sp,
                        color = Color(0xFF8A91A3),
                    )
                }
            }
        }
    }
}
