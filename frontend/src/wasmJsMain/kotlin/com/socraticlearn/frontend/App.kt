package com.socraticlearn.frontend

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.socraticlearn.frontend.screens.AnswerScreen
import com.socraticlearn.frontend.screens.ConceptInputScreen
import com.socraticlearn.frontend.screens.ReviewScreen
import com.socraticlearn.frontend.screens.StreamingScreen
import com.socraticlearn.frontend.state.AnswerSubmissionDraft
import com.socraticlearn.frontend.state.LearningUiState
import kotlinx.coroutines.delay

@Composable
fun App() {
    MaterialTheme {
        var uiState by remember { mutableStateOf<LearningUiState>(LearningUiState.Input) }

        when (val state = uiState) {
            LearningUiState.Input -> ConceptInputScreen(
                onStart = { concept -> uiState = LearningUiState.Streaming(concept = concept) },
            )

            is LearningUiState.Streaming -> {
                LaunchedEffect(state.concept, state.progress) {
                    if (state.progress < 1f) {
                        delay(500)
                        uiState = state.copy(progress = (state.progress + 0.22f).coerceAtMost(1f))
                    } else {
                        delay(350)
                        uiState = LearningUiState.Answering(state.concept)
                    }
                }
                StreamingScreen(
                    concept = state.concept,
                    progress = state.progress,
                    onJumpDone = { uiState = LearningUiState.Answering(state.concept) },
                )
            }

            is LearningUiState.Answering -> AnswerScreen(
                onSubmit = { submission: AnswerSubmissionDraft ->
                    uiState = LearningUiState.Reviewed(state.concept, submission)
                },
            )

            is LearningUiState.Reviewed -> ReviewScreen(
                concept = state.concept,
                submission = state.submission,
                onRestart = { uiState = LearningUiState.Input },
            )
        }
    }
}
