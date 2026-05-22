package com.socraticlearn.frontend.state

sealed interface LearningUiState {
    data object Input : LearningUiState
    data class Streaming(val concept: String, val progress: Float = 0f) : LearningUiState
    data class Answering(val concept: String) : LearningUiState
    data class Reviewed(val concept: String, val submission: AnswerSubmissionDraft) : LearningUiState
}
