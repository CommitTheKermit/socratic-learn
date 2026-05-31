import { auth } from "../lib/firebase";

/**
 * Functions 호출용 헤더. 로그인 상태면 Firebase ID 토큰을 Authorization: Bearer 로 싣는다.
 * 토큰 검증/게이팅(401)은 Functions 측에서 수행한다.
 * 비로그인 시 Authorization 을 생략하므로 서버가 401 로 거른다.
 */
export async function authHeaders(
  extra: Record<string, string> = {},
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...extra };
  // 크롬 재시작 직후엔 persistence(IndexedDB)에서 토큰을 복원하는 비동기 과정이 끝나기 전
  // auth.currentUser 가 null 이다. 복원 완료를 기다린 뒤 읽어야 헤더 누락(→401)을 막는다.
  await auth.authStateReady();
  const u = auth.currentUser;
  if (u) {
    headers.Authorization = `Bearer ${await u.getIdToken()}`;
  }
  return headers;
}
