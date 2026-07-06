import { onRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { CORS_ORIGINS } from "./cors";

// ready-made 로드맵 라이브러리 조회 엔드포인트(Anthropic 미사용 → ANTHROPIC_API_KEY secret 불필요).
//
// 저장 모델: Firestore 최상위 컬렉션 readymadeRoadmaps/{roadmapId}. uid 격리가 아니라 전체 공개(읽기 전용).
// 적재(쓰기)는 운영자만 수행하며 Admin SDK 시드 스크립트(scripts/seedReadymadeRoadmaps.mjs)로만 이뤄진다.
//
// 공개 읽기: 이 두 조회 엔드포인트는 로그인 없이도 접근 가능하다(홈 화면 로드맵 패널이 로그인 전에
// 목록을 보여줘야 하기 때문). 쓰기 경로는 제공하지 않으므로 노출되는 것은 운영자가 적재한 공개
// 콘텐츠뿐이고 사용자 데이터는 없다. 브라우저는 Firestore 에 직접 접근하지 않고(firestore.rules 는
// 클라이언트 접근 전면 차단) Functions(Admin SDK)만 이 컬렉션을 읽는다.

/** readymadeRoadmaps 문서 1건의 저장 형태(= 시드 JSON 전체). */
interface RoadmapDoc {
  roadmapId: string;
  title: string;
  summary: string;
  subject: string;
  /** 같은 subject 안에서의 학습 권장 순서(작을수록 먼저). 없으면 맨 뒤로. */
  order: number;
  steps: unknown[];
  prereqTree: unknown[];
  version: number;
}

function roadmapsCol() {
  return getFirestore().collection("readymadeRoadmaps");
}

function asStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

/** order 필드를 정렬 키로. 숫자가 아니면 맨 뒤(Infinity). */
function orderOf(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : Number.POSITIVE_INFINITY;
}

/** steps 배열에서 단계 제목만 뽑는다(문자열 title 만 신뢰). */
function stepTitlesOf(steps: unknown): string[] {
  if (!Array.isArray(steps)) return [];
  return steps
    .map((s) => (s && typeof s === "object" ? (s as { title?: unknown }).title : undefined))
    .filter((t): t is string => typeof t === "string" && t.length > 0);
}

/**
 * GET /readymadeRoadmapList - 공개 로드맵 경량 메타 목록을 반환한다(본문 미포함).
 * 응답: { roadmaps: ReadymadeRoadmapListEntry[] }. subject → title 순 정렬. 공개(인증 불필요).
 */
export const readymadeRoadmapList = onRequest(
  { cors: CORS_ORIGINS, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "GET only" });
      return;
    }

    try {
      const snap = await roadmapsCol().get();
      const roadmaps = snap.docs
        .map((d) => {
          const data = d.data() as Partial<RoadmapDoc>;
          return {
            roadmapId: d.id,
            title: asStr(data.title),
            summary: asStr(data.summary),
            subject: asStr(data.subject),
            order: orderOf(data.order),
            stepCount: Array.isArray(data.steps) ? data.steps.length : 0,
            hasPrereq: Array.isArray(data.prereqTree) && data.prereqTree.length > 0,
            stepTitles: stepTitlesOf(data.steps),
          };
        })
        .sort((a, b) => {
          if (a.subject !== b.subject) return a.subject.localeCompare(b.subject, "ko");
          if (a.order !== b.order) return a.order - b.order;
          return a.title.localeCompare(b.title, "ko");
        });
      res.json({ roadmaps });
    } catch (e) {
      logger.error("readymadeRoadmapList failed", e);
      res.status(500).json({
        code: "PERSIST_ERROR",
        message: e instanceof Error ? e.message : "로드맵 목록 조회 실패",
      });
    }
  },
);

/**
 * GET /readymadeRoadmapGet?id=<roadmapId> - 단일 로드맵 전체 본문을 반환한다.
 * 응답: { roadmap: ReadymadeRoadmap | null }(없으면 null). 공개(인증 불필요).
 */
export const readymadeRoadmapGet = onRequest(
  { cors: CORS_ORIGINS, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "GET only" });
      return;
    }

    const id = req.query.id;
    if (typeof id !== "string" || id.length === 0) {
      res.status(400).json({ code: "INVALID_REQUEST", message: "id 쿼리 파라미터가 필요합니다." });
      return;
    }

    try {
      const doc = await roadmapsCol().doc(id).get();
      if (!doc.exists) {
        res.json({ roadmap: null });
        return;
      }
      const data = doc.data() as Partial<RoadmapDoc>;
      const roadmap = {
        roadmapId: doc.id,
        title: asStr(data.title),
        summary: asStr(data.summary),
        subject: asStr(data.subject),
        order: orderOf(data.order),
        steps: Array.isArray(data.steps) ? data.steps : [],
        prereqTree: Array.isArray(data.prereqTree) ? data.prereqTree : [],
        version: typeof data.version === "number" ? data.version : 1,
      };
      res.json({ roadmap });
    } catch (e) {
      logger.error("readymadeRoadmapGet failed", e);
      res.status(500).json({
        code: "PERSIST_ERROR",
        message: e instanceof Error ? e.message : "로드맵 조회 실패",
      });
    }
  },
);
