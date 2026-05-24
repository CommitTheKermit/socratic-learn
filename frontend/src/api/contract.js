// 1:1 mirror of shared/src/commonMain/kotlin/socratic/learn/shared
// SOURCE OF TRUTH: shared/ Kotlin module. Sync manually on any shared change (PR checklist).
export const ApiPaths = {
    HEALTH: "/health",
    LEARN_STREAM: "/learn/stream",
    ANSWERS: "/answers",
};
export const SseEvents = {
    STATUS: "status",
    DELTA: "delta",
    COMPLETE: "complete",
    ERROR: "error",
};
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081";
