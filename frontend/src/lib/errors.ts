export function describeErrorCode(code: string, fallback: string): string {
  switch (code) {
    case "MISSING_CLAUDE_API_KEY":
      return "Claude API 키가 설정되지 않았어요. 서버에 ANTHROPIC_API_KEY 환경변수를 설정해 주세요.";
    case "CLAUDE_API_ERROR":
      return "Claude API 호출 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.";
    case "INTERNAL_ERROR":
      return "서버 내부 오류가 발생했어요. 잠시 후 다시 시도해 주세요.";
    case "INVALID_CONCEPT":
      return "입력한 개념이 비어 있거나 유효하지 않아요. 다시 입력해 주세요.";
    case "EMPTY_ANSWERS":
      return "답변이 비어 있어요. 한 문장이라도 적은 뒤 다시 제출해 주세요.";
    case "NETWORK_ERROR":
      return "백엔드 서버에 연결하지 못했어요. 서버(8081 포트)가 실행 중인지 확인해 주세요.";
    case "STREAM_ERROR":
      return "스트림을 읽는 도중 끊겼어요. 다시 시도해 주세요.";
    case "HTTP_ERROR":
      return fallback || "요청이 실패했어요.";
    default:
      return fallback || `알 수 없는 오류 (${code})`;
  }
}
