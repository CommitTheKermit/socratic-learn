package com.socraticlearn.frontend

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import com.socraticlearn.frontend.screens.ConceptInputScreen

@Composable
fun App() {
    MaterialTheme {
        ConceptInputScreen(
            onStart = {
                // API/SSE wiring is deferred until shared contracts are merged.
            },
        )
    }
}
