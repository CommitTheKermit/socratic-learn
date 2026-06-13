/**
 * 일회성 usage 집계 리포트 (prod Firestore, admin SDK, 읽기 전용).
 * 실행: cd functions && node scripts/usage-report.cjs
 * 자격증명: ADC (~/.config/gcloud/application_default_credentials.json).
 *
 * 현재 usage 문서: { uid, endpoint, timestamp }. sessionId 없이
 * uid + timestamp 간격(기본 30분)으로 세션을 재구성해 퍼널/이탈을 추정한다.
 */
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const PROJECT_ID = "socratic-learn-web";
const SESSION_GAP_MS = 30 * 60 * 1000; // 30분 공백 = 새 세션
// 학습 퍼널 순서 (세션 CRUD 등 부수 호출은 제외)
const FUNNEL = ["overwhelm", "probe", "outline", "stepDetail", "stepDetailStream", "answerEval", "branchEval"];

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();

function pct(n, d) {
  return d === 0 ? "-" : ((n / d) * 100).toFixed(1) + "%";
}
function dayKey(d) {
  return d.toISOString().slice(0, 10);
}

(async () => {
  const snap = await db.collection("usage").orderBy("timestamp", "asc").get();
  const docs = [];
  snap.forEach((doc) => {
    const x = doc.data();
    const ts = x.timestamp && x.timestamp.toDate ? x.timestamp.toDate() : null;
    if (ts) docs.push({ uid: x.uid, endpoint: x.endpoint, ts });
  });

  if (docs.length === 0) {
    console.log("usage 컬렉션이 비어 있습니다 (아직 기록된 호출 없음).");
    return;
  }

  const first = docs[0].ts, last = docs[docs.length - 1].ts;
  console.log("=".repeat(56));
  console.log(`총 이벤트: ${docs.length}건`);
  console.log(`기간: ${first.toISOString().slice(0, 16)} ~ ${last.toISOString().slice(0, 16)} (UTC)`);

  // 1. 엔드포인트별 호출 수
  const byEndpoint = {};
  for (const d of docs) byEndpoint[d.endpoint] = (byEndpoint[d.endpoint] || 0) + 1;
  console.log("\n[엔드포인트별 호출 수]");
  Object.entries(byEndpoint).sort((a, b) => b[1] - a[1]).forEach(([e, c]) => console.log(`  ${e.padEnd(18)} ${c}`));

  // 2. 사용자 / DAU
  const uids = new Set(docs.map((d) => d.uid));
  const byDay = {}; // day -> Set(uid)
  for (const d of docs) (byDay[dayKey(d.ts)] ||= new Set()).add(d.uid);
  console.log(`\n[사용자]`);
  console.log(`  고유 사용자(uid): ${uids.size}명`);
  console.log(`  활동일 수: ${Object.keys(byDay).length}일`);
  console.log("  날짜별 활성 사용자(DAU):");
  Object.entries(byDay).sort().forEach(([day, s]) => console.log(`    ${day}  ${s.size}명`));

  // 3. uid별 timestamp 간격으로 세션 재구성
  const eventsByUid = {};
  for (const d of docs) (eventsByUid[d.uid] ||= []).push(d);
  const sessions = []; // { uid, events: [{endpoint, ts}], durationMs }
  for (const [uid, evs] of Object.entries(eventsByUid)) {
    evs.sort((a, b) => a.ts - b.ts);
    let cur = null;
    for (const e of evs) {
      if (!cur || e.ts - cur.events[cur.events.length - 1].ts > SESSION_GAP_MS) {
        cur = { uid, events: [] };
        sessions.push(cur);
      }
      cur.events.push(e);
    }
  }
  for (const s of sessions) {
    s.durationMs = s.events[s.events.length - 1].ts - s.events[0].ts;
  }
  console.log(`\n[세션] (uid + ${SESSION_GAP_MS / 60000}분 공백 기준 재구성)`);
  console.log(`  추정 세션 수: ${sessions.length}개`);
  const durs = sessions.map((s) => s.durationMs).filter((m) => m > 0).sort((a, b) => a - b);
  if (durs.length) {
    const median = durs[Math.floor(durs.length / 2)];
    console.log(`  세션 길이 중앙값: ${(median / 60000).toFixed(1)}분 (1건짜리 세션 제외 n=${durs.length})`);
  }

  // 4. 스테이지 퍼널 (세션 단위: 해당 엔드포인트에 도달한 세션 비율)
  console.log(`\n[스테이지 퍼널] (세션 ${sessions.length}개 중 각 단계 도달)`);
  const reach = {};
  for (const stage of FUNNEL) {
    reach[stage] = sessions.filter((s) => s.events.some((e) => e.endpoint === stage)).length;
  }
  const total = sessions.length;
  let prev = total;
  for (const stage of FUNNEL) {
    const r = reach[stage];
    if (r === 0) continue;
    console.log(`  ${stage.padEnd(18)} ${String(r).padStart(5)}  (전체 ${pct(r, total)}, 직전대비 ${pct(r, prev)})`);
    prev = r;
  }

  // 5. 핵심 이탈: 본문은 봤는데 채점까지 안 간 세션
  const sawDetail = sessions.filter((s) =>
    s.events.some((e) => e.endpoint === "stepDetail" || e.endpoint === "stepDetailStream")
  );
  const detailNoEval = sawDetail.filter((s) => !s.events.some((e) => e.endpoint === "answerEval"));
  console.log(`\n[핵심 이탈]`);
  console.log(`  단계 본문 열람: ${sawDetail.length}세션`);
  console.log(`  └ 그중 채점(answerEval) 미도달: ${detailNoEval.length}세션 (${pct(detailNoEval.length, sawDetail.length)})`);

  console.log("=".repeat(56));
})().catch((e) => {
  console.error("\n[ERROR]", e.message);
  if (/credential|auth|UNAUTHENTICATED|invalid_grant|token/i.test(e.message)) {
    console.error("\nADC 만료/누락 가능. 갱신: gcloud auth application-default login");
    console.error("(gcloud 미설치 시 설치 후 위 명령. 또는 서비스계정 키를 GOOGLE_APPLICATION_CREDENTIALS 로 지정.)");
  }
  process.exit(1);
});
