#!/usr/bin/env node
// functions/seed/officialRoadmaps/*.json (OfficialRoadmap 시드) 결정적 검증기.
// 빌드/타입체크가 못 잡는 "문법상 valid 인데 규칙 위반" 시드 콘텐츠를 막는다.
// 사용: node validate-official-roadmap.mjs <파일경로>
// 출력: ERROR/WARN 줄을 stdout 으로. ERROR 가 하나라도 있으면 exit 1, 아니면 exit 0.
//
// 검사 항목(모두 결정적. 사실 정확성 같은 의미 검증은 대상 아님):
// 1) JSON 유효성 + OfficialRoadmap 최상위 키 정확성
// 2) Step: id(int)/title/desc/body/questions, title·desc 길이, 여분 키 금지
// 3) body 마크다운 금지요소: 헤더(#)·글머리/순서 리스트·em dash·짝 $·HTML 엔티티·코드펜스 불균형
// 4) questions: 3-5개, id "단계번호-순번" 형식, q 비어있지 않음
// 5) prereqTree: {concept,reason,children} 재귀, 깊이 <= 3
// 6) step id 유일성

import { readFileSync } from "node:fs";

const path = process.argv[2];
const errors = [];
const warns = [];
const E = (m) => errors.push(m);
const W = (m) => warns.push(m);

if (!path) {
  console.log("ERROR: 파일 경로 인자가 없습니다");
  process.exit(1);
}

let raw;
try {
  raw = readFileSync(path, "utf8");
} catch (e) {
  console.log(`ERROR: 파일을 읽을 수 없습니다: ${e.message}`);
  process.exit(1);
}

let doc;
try {
  doc = JSON.parse(raw);
} catch (e) {
  console.log(`ERROR: JSON 파싱 실패: ${e.message}`);
  process.exit(1);
}

const TOP_KEYS = ["roadmapId", "title", "summary", "subject", "steps", "prereqTree", "version"];
const STEP_KEYS = ["id", "title", "desc", "body", "questions"];

function isNonEmptyStr(v) {
  return typeof v === "string" && v.trim().length > 0;
}

// ── 최상위 스키마 ──
if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
  console.log("ERROR: 최상위가 OfficialRoadmap 객체가 아닙니다");
  process.exit(1);
}
{
  const keys = Object.keys(doc);
  for (const k of TOP_KEYS) if (!(k in doc)) E(`최상위 필수 키 누락: ${k}`);
  for (const k of keys) if (!TOP_KEYS.includes(k)) E(`최상위 여분 키: ${k}`);
}
if (!isNonEmptyStr(doc.roadmapId)) E("roadmapId 는 비어있지 않은 문자열이어야 합니다");
if (!isNonEmptyStr(doc.title)) E("title 은 비어있지 않은 문자열이어야 합니다");
if (!isNonEmptyStr(doc.summary)) E("summary 는 비어있지 않은 문자열이어야 합니다");
if (!isNonEmptyStr(doc.subject)) E("subject 는 비어있지 않은 문자열이어야 합니다");
if (!Number.isInteger(doc.version) || doc.version < 1) E("version 은 1 이상의 정수여야 합니다");

// ── steps ──
if (!Array.isArray(doc.steps) || doc.steps.length === 0) {
  E("steps 는 비어있지 않은 배열이어야 합니다");
} else {
  const seenIds = new Set();
  for (let i = 0; i < doc.steps.length; i++) {
    const s = doc.steps[i];
    const tag = `steps[${i}]`;
    if (s === null || typeof s !== "object" || Array.isArray(s)) {
      E(`${tag}: 객체가 아닙니다`);
      continue;
    }
    for (const k of STEP_KEYS) if (!(k in s)) E(`${tag}: 필수 키 누락 ${k}`);
    for (const k of Object.keys(s)) if (!STEP_KEYS.includes(k)) E(`${tag}: 여분 키 ${k} (시드 단계엔 _meta 등 금지)`);

    if (!Number.isInteger(s.id)) E(`${tag}: id 는 정수여야 합니다`);
    else {
      if (seenIds.has(s.id)) E(`${tag}: 중복 id ${s.id}`);
      seenIds.add(s.id);
    }

    if (!isNonEmptyStr(s.title)) E(`${tag}: title 이 비었습니다`);
    else {
      if (s.title.length > 60) E(`${tag}: title 이 너무 김(${s.title.length}자) - 부제가 섞였을 수 있음`);
      else if (s.title.length > 40) W(`${tag}: title 길이 ${s.title.length}자(권장 <=40)`);
    }
    if (!isNonEmptyStr(s.desc)) E(`${tag}: desc 가 비었습니다`);
    else {
      if (s.desc.length > 90) E(`${tag}: desc 가 너무 김(${s.desc.length}자) - 한 줄 부제가 아님`);
      else if (s.desc.length > 45) W(`${tag}: desc 길이 ${s.desc.length}자(권장 <=45)`);
    }

    if (!isNonEmptyStr(s.body)) E(`${tag}: body 가 비었습니다`);
    else checkBody(s, tag);

    checkQuestions(s, tag);
  }
}

function checkBody(s, tag) {
  const body = s.body;
  const lines = body.split("\n");
  for (const ln of lines) {
    const st = ln.trim();
    if (/^#{1,6}\s/.test(st) || /^#{1,6}$/.test(st)) E(`${tag}: body 에 헤더(#) 사용 금지 -> "${st.slice(0, 30)}"`);
    if (/^(-|\*)\s/.test(st)) E(`${tag}: body 에 글머리 리스트 사용 금지 -> "${st.slice(0, 30)}"`);
    if (/^\d+\.\s/.test(st)) E(`${tag}: body 에 순서 리스트 사용 금지 -> "${st.slice(0, 30)}"`);
    if ((ln.match(/\$/g) || []).length >= 2) E(`${tag}: body 한 줄에 $ 2개 이상(수식 오인 렌더 위험) -> "${st.slice(0, 40)}"`);
  }
  const emDash = String.fromCharCode(0x2014), enDash = String.fromCharCode(0x2013);
  if (body.includes(emDash)) E(`${tag}: body 에 em dash(U+2014) 금지(하이픈 사용)`);
  if (body.includes(enDash)) E(`${tag}: body 에 en dash(U+2013) 금지(하이픈 사용)`);
  if (/&(lt|gt|amp|quot|#39|apos);/.test(body)) E(`${tag}: body 에 HTML 엔티티(&lt; 등) 발견 - 코드블록이 이스케이프로 깨졌을 수 있음`);
  const fences = (body.match(/```/g) || []).length;
  if (fences % 2 !== 0) E(`${tag}: body 코드펜스(\`\`\`) 개수가 홀수(${fences}) - 코드블록 미닫힘`);
}

function checkQuestions(s, tag) {
  if (!Array.isArray(s.questions)) {
    E(`${tag}: questions 는 배열이어야 합니다`);
    return;
  }
  if (s.questions.length < 3 || s.questions.length > 5) E(`${tag}: questions 개수 ${s.questions.length} (3-5개여야 함)`);
  const idRe = Number.isInteger(s.id) ? new RegExp(`^${s.id}-\\d+$`) : null;
  for (let j = 0; j < s.questions.length; j++) {
    const q = s.questions[j];
    const qt = `${tag}.questions[${j}]`;
    if (q === null || typeof q !== "object" || Array.isArray(q)) {
      E(`${qt}: 객체가 아닙니다`);
      continue;
    }
    for (const k of Object.keys(q)) if (k !== "id" && k !== "q") E(`${qt}: 여분 키 ${k}`);
    if (typeof q.id !== "string" || (idRe && !idRe.test(q.id))) E(`${qt}: id 는 "${s.id}-N" 형식이어야 합니다 (실제 "${q.id}")`);
    if (!isNonEmptyStr(q.q)) E(`${qt}: q 가 비었습니다`);
  }
}

// ── prereqTree ──
if (!Array.isArray(doc.prereqTree)) {
  E("prereqTree 는 배열이어야 합니다");
} else {
  checkPrereq(doc.prereqTree, 1, "prereqTree");
}
function checkPrereq(nodes, depth, tag) {
  if (depth > 3) {
    E(`${tag}: 선행 트리 깊이가 3 을 초과했습니다`);
    return;
  }
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const nt = `${tag}[${i}]`;
    if (n === null || typeof n !== "object" || Array.isArray(n)) {
      E(`${nt}: 노드가 객체가 아닙니다`);
      continue;
    }
    for (const k of Object.keys(n)) if (!["concept", "reason", "children"].includes(k)) E(`${nt}: 여분 키 ${k}`);
    if (!isNonEmptyStr(n.concept)) E(`${nt}: concept 가 비었습니다`);
    if (typeof n.reason !== "string") E(`${nt}: reason 은 문자열이어야 합니다`);
    if (!Array.isArray(n.children)) E(`${nt}: children 은 배열이어야 합니다`);
    else checkPrereq(n.children, depth + 1, `${nt}.children`);
  }
}

// ── 출력 ──
for (const w of warns) console.log(`WARN: ${w}`);
for (const e of errors) console.log(`ERROR: ${e}`);
if (errors.length > 0) {
  console.log(`\n검증 실패: ERROR ${errors.length}건${warns.length ? `, WARN ${warns.length}건` : ""} (${path})`);
  process.exit(1);
}
if (warns.length > 0) console.log(`검증 통과(경고 ${warns.length}건) (${path})`);
process.exit(0);
