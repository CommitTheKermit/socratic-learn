import { API_BASE_URL, ApiPaths, } from "./contract";
export class AnswersSubmissionError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "AnswersSubmissionError";
    }
}
export async function submitAnswers(req) {
    let response;
    try {
        response = await fetch(`${API_BASE_URL}${ApiPaths.ANSWERS}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req),
        });
    }
    catch (e) {
        throw new AnswersSubmissionError("NETWORK_ERROR", e?.message ?? "네트워크 오류");
    }
    if (!response.ok) {
        let err = { code: "HTTP_ERROR", message: `HTTP ${response.status}` };
        try {
            err = (await response.json());
        }
        catch {
            /* ignore */
        }
        throw new AnswersSubmissionError(err.code, err.message);
    }
    return (await response.json());
}
