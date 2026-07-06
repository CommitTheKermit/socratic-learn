// ready-made 로드맵 시드 적재 스크립트 (운영자 전용, Admin SDK).
//
// functions/seed/readymadeRoadmaps/*.json 를 읽어 Firestore readymadeRoadmaps/{roadmapId} 에 upsert 한다.
// 브라우저에는 쓰기 경로가 없으므로(공개 읽기 전용), 라이브러리에 로드맵을 넣는 유일한 통로가 이 스크립트다.
//
// 실행:
//   # 에뮬레이터(로컬):
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=socratic-learn-web \
//     node scripts/seedReadymadeRoadmaps.mjs
//   # 실배포(주의: 운영 DB 에 씀. gcloud ADC 또는 GOOGLE_APPLICATION_CREDENTIALS 필요):
//   GCLOUD_PROJECT=socratic-learn-web node scripts/seedReadymadeRoadmaps.mjs --prod
//
// FIRESTORE_EMULATOR_HOST 가 없고 --prod 도 없으면 안전을 위해 실행을 거부한다.

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = join(__dirname, "..", "seed", "readymadeRoadmaps");
const COLLECTION = "readymadeRoadmaps";

const isEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const isProd = process.argv.includes("--prod");

if (!isEmulator && !isProd) {
  console.error(
    "거부: FIRESTORE_EMULATOR_HOST 가 없고 --prod 도 지정되지 않았습니다.\n" +
      "로컬은 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 을, 실배포는 --prod 를 명시하세요.",
  );
  process.exit(1);
}

/** 시드 문서의 최소 형태를 검증한다. 어긋나면 파일명과 함께 throw. */
function validateRoadmap(doc, file) {
  const errors = [];
  if (typeof doc.roadmapId !== "string" || !doc.roadmapId) errors.push("roadmapId");
  if (typeof doc.title !== "string" || !doc.title) errors.push("title");
  if (typeof doc.summary !== "string") errors.push("summary");
  if (typeof doc.subject !== "string" || !doc.subject) errors.push("subject");
  if (typeof doc.order !== "number" || !Number.isFinite(doc.order)) errors.push("order");
  if (!Array.isArray(doc.steps) || doc.steps.length === 0) errors.push("steps");
  if (!Array.isArray(doc.prereqTree)) errors.push("prereqTree");
  if (typeof doc.version !== "number") errors.push("version");
  if (errors.length) {
    throw new Error(`${file}: 유효하지 않은 필드 [${errors.join(", ")}]`);
  }
}

async function main() {
  const projectId = process.env.GCLOUD_PROJECT || "socratic-learn-web";
  initializeApp({ projectId });
  const db = getFirestore();

  const target = isEmulator
    ? `emulator(${process.env.FIRESTORE_EMULATOR_HOST})`
    : `PRODUCTION(${projectId})`;
  console.log(`시드 대상: ${target}`);
  console.log(`시드 디렉터리: ${SEED_DIR}`);

  const files = (await readdir(SEED_DIR)).filter((f) => f.endsWith(".json")).sort();
  if (files.length === 0) {
    console.error("시드 파일이 없습니다.");
    process.exit(1);
  }

  // 먼저 전부 파싱·검증한 뒤(부분 적재 방지) upsert 한다.
  const docs = [];
  for (const file of files) {
    const raw = await readFile(join(SEED_DIR, file), "utf8");
    let doc;
    try {
      doc = JSON.parse(raw);
    } catch (e) {
      throw new Error(`${file}: JSON 파싱 실패 - ${e.message}`);
    }
    validateRoadmap(doc, file);
    docs.push({ file, doc });
  }

  const seen = new Set();
  const batch = db.batch();
  for (const { file, doc } of docs) {
    if (seen.has(doc.roadmapId)) {
      throw new Error(`${file}: roadmapId 중복 - ${doc.roadmapId}`);
    }
    seen.add(doc.roadmapId);
    batch.set(db.collection(COLLECTION).doc(doc.roadmapId), doc);
    console.log(`  upsert ${doc.roadmapId.padEnd(34)} steps=${doc.steps.length} prereq=${doc.prereqTree.length}`);
  }
  await batch.commit();
  console.log(`완료: ${docs.length}건 적재`);
}

main().catch((e) => {
  console.error("시드 실패:", e.message);
  process.exit(1);
});
