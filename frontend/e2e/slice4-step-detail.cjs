// Slice 4 E2E: input -> probe -> roadmap 진입 시 자동 로드되는 첫 단계 stepDetail 검증.
// 실행: cd frontend && node e2e/slice4-step-detail.cjs  (dev server 5173 + emulator 5001 필요)
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const anthropicDirect = [];
  const anthropicPreStepDetail = [];
  let stepDetailDone = false;
  page.on("request", (req) => {
    if (req.url().includes("api.anthropic.com")) {
      anthropicDirect.push(req.url());
      // stepDetail 완료 전 직호출만 위반으로 카운트(이 주행에선 선행 함수가 모두 이전됨 → 0 기대).
      if (!stepDetailDone) anthropicPreStepDetail.push(req.url());
    }
  });

  const result = { ok: false };
  try {
    await page.goto("http://localhost:5173", { waitUntil: "networkidle" });

    // input -> probe
    const probeRespP = page.waitForResponse(
      (r) => r.url().includes("/probe") && r.request().method() === "POST",
      { timeout: 60000 },
    );
    await page.getByRole("button", { name: "학습 시작" }).click();
    const probeBody = await (await probeRespP).json();
    const p1 = Array.isArray(probeBody) ? probeBody[0] : null;
    const opt = p1 && Array.isArray(p1.options) ? p1.options.find((o) => o.value >= 1) : null;
    if (!opt) throw new Error("p1 비후퇴(value>=1) 선택지를 찾지 못함");
    await page.waitForFunction((q) => document.body.innerText.includes(q), p1.q, { timeout: 10000 });
    await page.locator(".probe-choice", { hasText: opt.label }).first().click();

    // probe -> learn: outline 후 첫 단계 stepDetail 자동 로드
    const stepDetailRespP = page.waitForResponse(
      (r) => r.url().includes("/stepDetail") && r.request().method() === "POST",
      { timeout: 60000 },
    );
    await page.getByRole("button", { name: "단계 만들기" }).click();
    const stepDetailResp = await stepDetailRespP;
    stepDetailDone = true;
    const body = await stepDetailResp.json().catch(() => null);

    result.stepDetailStatus = stepDetailResp.status();
    result.stepDetailUrl = stepDetailResp.url();
    result.usesEmulator = stepDetailResp.url().includes("127.0.0.1:5001");
    result.hasBody = !!(body && typeof body.body === "string" && body.body.trim());
    result.questionCount = body && Array.isArray(body.questions) ? body.questions.length : null;
    result.questionsValid =
      body &&
      Array.isArray(body.questions) &&
      body.questions.every((q) => q && typeof q.id === "string" && typeof q.q === "string" && q.q);
    result.anthropicPreStepDetailCount = anthropicPreStepDetail.length;
    result.anthropicTotalCount = anthropicDirect.length;

    // DOM 렌더 확인: 질문 q 텍스트 또는 본문 평문 토큰 중 하나라도 노출
    const q0 = body && body.questions && body.questions[0] ? body.questions[0].q : null;
    const plainToken =
      body && typeof body.body === "string"
        ? (body.body.replace(/[*`#>\-\n]/g, " ").match(/[가-힣A-Za-z0-9]{6,}/) || [])[0]
        : null;
    if (q0 || plainToken) {
      await page.waitForFunction(
        ([a, b]) => {
          const t = document.body.innerText;
          return (a && t.includes(a)) || (b && t.includes(b));
        },
        [q0, plainToken],
        { timeout: 10000 },
      );
      result.renderedInDom = true;
    }

    result.ok =
      result.stepDetailStatus === 200 &&
      result.usesEmulator === true &&
      result.hasBody === true &&
      typeof result.questionCount === "number" &&
      result.questionCount >= 3 &&
      result.questionsValid === true &&
      result.anthropicPreStepDetailCount === 0 &&
      result.renderedInDom === true;
  } catch (e) {
    result.error = String(e && e.message ? e.message : e);
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
})();
