import {
  API_BASE_URL,
  ApiPaths,
  type AnswerSubmissionRequest,
  type AnswerSubmissionResponse,
  type ErrorResponse,
} from "./contract";

export class AnswersSubmissionError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "AnswersSubmissionError";
  }
}

export async function submitAnswers(
  req: AnswerSubmissionRequest,
): Promise<AnswerSubmissionResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${ApiPaths.ANSWERS}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  } catch (e) {
    throw new AnswersSubmissionError(
      "NETWORK_ERROR",
      (e as Error)?.message ?? "네트워크 오류",
    );
  }

  if (!response.ok) {
    let err: ErrorResponse = { code: "HTTP_ERROR", message: `HTTP ${response.status}` };
    try {
      err = (await response.json()) as ErrorResponse;
    } catch {
      /* ignore */
    }
    throw new AnswersSubmissionError(err.code, err.message);
  }

  return (await response.json()) as AnswerSubmissionResponse;
}
