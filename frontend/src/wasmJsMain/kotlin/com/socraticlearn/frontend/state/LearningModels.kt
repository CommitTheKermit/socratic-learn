package com.socraticlearn.frontend.state

const val SampleConcept: String = "코루틴이 왜 필요한지 알고 싶어요"

val RecentSessions = listOf(
    RecentSession("코루틴이 왜 필요한지", "Concurrency", "방금", true),
    RecentSession("B+ Tree vs LSM-Tree 인덱스", "DB", "어제", false),
    RecentSession("React useEffect cleanup 시점", "React", "2일 전", false),
)

data class RecentSession(
    val title: String,
    val topic: String,
    val time: String,
    val active: Boolean,
)
