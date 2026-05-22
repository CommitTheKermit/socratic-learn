package com.socraticlearn.frontend

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import com.socraticlearn.frontend.screens.ConceptInputScreen

@Composable
fun App() {
    MaterialTheme {
        ConceptInputScreen(
            onStart = {
                // API/SSE 연동은 shared contract 머지 이후 feature/fe-stream에서 연결한다.
            },
        )
    }
}
