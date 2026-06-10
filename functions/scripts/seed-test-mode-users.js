#!/usr/bin/env node
/**
 * testModeUsers 컬렉션 초기 seed 스크립트
 *
 * 용도: 테스트 모드 화이트리스트 초기 등록 (1회성)
 * 실행: cd functions && node scripts/seed-test-mode-users.js
 *
 * 주의: 실서비스 자격증명 필요 (gcloud auth 또는 GOOGLE_APPLICATION_CREDENTIALS)
 * 에뮬레이터 사용 시: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/seed-test-mode-users.js
 */

const admin = require("firebase-admin");

if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: "socratic-learn-web" });
}

const db = admin.firestore();

/** 화이트리스트 초기 엔트리 */
const WHITELIST = [
  {
    uid: "qQ1iKivYmUda2KnCc2UZ81fYzXx2",
    label: "CommitTheKermit",
  },
];

async function main() {
  for (const entry of WHITELIST) {
    await db.collection("testModeUsers").doc(entry.uid).set({ label: entry.label });
    const snap = await db.collection("testModeUsers").doc(entry.uid).get();
    if (snap.exists) {
      console.log(`OK: testModeUsers/${entry.uid} => ${JSON.stringify(snap.data())}`);
    } else {
      console.error(`FAIL: testModeUsers/${entry.uid} not found after set`);
      process.exit(1);
    }
  }
  console.log("seed 완료");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
