import { API_BASE_URL, ApiPaths } from "./contract";
import type { TestEligibleResponse } from "./contract";
import { authHeaders } from "./authHeaders";

// 테스트 모드 자격 조회. 로그인 직후 1회 호출해 입력창 학습 모드 노출 게이팅에 쓴다.
// 실패 시 throw 하지 않고 false 로 폴백한다(자격 조회 실패가 학습 흐름을 막으면 안 됨).
// (claudeContent 와 분리한 이유: 통합 테스트가 claudeContent 를 부분 mock 하므로,
//  새 export 를 거기 추가하면 기존 mock 들이 전부 깨진다.)
export async function fetchTestEligible(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}${ApiPaths.TEST_ELIGIBLE}`, {
      method: "GET",
      headers: await authHeaders(),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as TestEligibleResponse;
    return body?.eligible === true;
  } catch {
    return false;
  }
}
