package com.socraticlearn.frontend

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.socraticlearn.frontend.screens.ConceptInputScreen
import com.socraticlearn.frontend.screens.StreamingScreen

@Composable
fun App() {
    var activeConcept by remember { mutableStateOf<String?>(null) }
    var mockProgress by remember { mutableFloatStateOf(0.65f) }

    MaterialTheme {
        val concept = activeConcept
        if (concept == null) {
            ConceptInputScreen(
                onStart = { conceptInput ->
                    activeConcept = conceptInput
                    mockProgress = 0.65f
                },
            )
        } else {
            StreamingScreen(
                concept = concept,
                progress = mockProgress,
                onJumpDone = { mockProgress = 1f },
            )
        }
    }
}
