import {
  API_BASE_URL,
  ApiPaths,
  type AnswerSubmissionRequest,
  type AnswerSubmissionResponse,
  type BranchOption,
  type BranchOptionType,
  type ErrorResponse,
  type EvaluationResponse,
  type ParseFailure,
} from "./contract";

const VALID_BRANCH_TYPES: ReadonlySet<BranchOptionType> = new Set<BranchOptionType>([
  "roadmap_next",
  "ai_recommended",
  "additional",
  "exit",
]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateBranchOption(v: unknown): BranchOption | string {
  if (!isPlainObject(v)) return "branchOption must be object";
  const { label, type, isRecommended, stageContent } = v;
  if (typeof label !== "string") return "branchOption.label must be string";
  if (typeof type !== "string" || !VALID_BRANCH_TYPES.has(type as BranchOptionType)) {
    return "branchOption.type invalid";
  }
  if (typeof isRecommended !== "boolean") return "branchOption.isRecommended must be boolean";
  if (stageContent !== null && !isPlainObject(stageContent)) {
    return "branchOption.stageContent must be object or null";
  }
  return {
    label,
    type: type as BranchOptionType,
    isRecommended,
    // Treat stageContent as opaque Step | null at the parser boundary.
    stageContent: stageContent as BranchOption["stageContent"],
  };
}

/**
 * Pure parser: never throws.
 * Accepts a JSON string or pre-parsed object and returns either a validated
 * EvaluationResponse or a ParseFailure with `parseError` describing the issue.
 */
export function parseEvaluationJson(
  input: string | unknown,
): EvaluationResponse | ParseFailure {
  let raw: unknown;
  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch (e) {
      return { parseError: `invalid JSON: ${(e as Error).message}` };
    }
  } else {
    raw = input;
  }

  if (!isPlainObject(raw)) {
    return { parseError: "root must be an object" };
  }

  const { evaluationText, isMerged, branchOptions } = raw;

  if (typeof evaluationText !== "string") {
    return { parseError: "evaluationText must be string" };
  }
  if (typeof isMerged !== "boolean") {
    return { parseError: "isMerged must be boolean" };
  }
  if (!Array.isArray(branchOptions)) {
    return { parseError: "branchOptions must be array" };
  }

  const validated: BranchOption[] = [];
  for (let i = 0; i < branchOptions.length; i++) {
    const r = validateBranchOption(branchOptions[i]);
    if (typeof r === "string") {
      return { parseError: `branchOptions[${i}]: ${r}` };
    }
    validated.push(r);
  }

  return { evaluationText, isMerged, branchOptions: validated };
}

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
