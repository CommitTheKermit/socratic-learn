import { onRequest } from "firebase-functions/v2/https";
import { requireAuth, isTestMode } from "./auth";
import { CORS_ORIGINS } from "./cors";

// 테스트 모드 자격 조회. 프론트는 로그인 직후 1회 호출해 입력창 학습 모드 드롭다운에
// "테스트" 항목을 노출할지 결정한다. 판정 출처는 isTestMode(uid)(testModeUsers 컬렉션)로,
// 서버측 mode='test' 게이트와 동일한 단일 진실 출처를 공유한다.
// Anthropic 미사용이라 키/레이트리밋 없이 가벼운 GET.
export const testEligible = onRequest(
  { cors: CORS_ORIGINS, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "GET only" });
      return;
    }

    const uid = await requireAuth(req, res);
    if (!uid) return;

    res.json({ eligible: await isTestMode(uid) });
  },
);
