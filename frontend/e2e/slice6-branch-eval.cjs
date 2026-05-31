// Slice 6 E2E: answering 에서 "답변 제출하기" -> answerEval + branchEval 둘 다 emulator 로.
// 핵심: 이번 주행 anthropic 직호출 0건(slice5 에서 남았던 branch eval 직호출이 emulator 로 이전됨).
// 실행: cd frontend && node e2e/slice6-branch-eval.cjs  (dev server 5173 + emulator 5001 필요)
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const anthropicDirect = [];
  page.on("request", (req) => {
    if (req.url().includes("api.anthropic.com")) anthropicDirect.push(req.url());
  });

  const result = { ok: false };
  try {
    await page.goto(process.env.E2E_BASE_URL || "http://localhost:5173", {
      waitUntil: "networkidle",
    });

    // 게이팅: E2E 자동 익명 로그인(VITE_E2E_AUTO_SIGNIN) 완료까지 대기.
    // 로그인되면 사이드바에 로그아웃 버튼이 렌더된다.
    await page.waitForSelector('[aria-label="로그아웃"]', { timeout: 20000 });

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

    // probe -> learn: 첫 단계는 stepDetailStream(SSE)으로 생성된다. questions(textarea) 렌더까지 대기.
    await page.getByRole("button", { name: "단계 만들기" }).click();
    await page.waitForSelector("textarea", { timeout: 60000 });
    const tas = page.locator("textarea");
    const n = await tas.count();
    for (let i = 0; i < n; i++) {
      await tas.nth(i).fill("스레드를 막지 않고 중단/재개가 가능해서 적은 자원으로 동시성을 다룰 수 있습니다.");
    }

    // "답변 제출하기" -> answerEval + branchEval 동시 발생
    const answerEvalRespP = page.waitForResponse(
      (r) => r.url().includes("/answerEval") && r.request().method() === "POST",
      { timeout: 60000 },
    );
    const branchEvalRespP = page.waitForResponse(
      (r) => r.url().includes("/branchEval") && r.request().method() === "POST",
      { timeout: 60000 },
    );
    await page.getByRole("button", { name: "답변 제출하기" }).click();
    const [answerEvalResp, branchEvalResp] = await Promise.all([answerEvalRespP, branchEvalRespP]);
    const branchBody = await branchEvalResp.json().catch(() => null);

    result.answerEvalStatus = answerEvalResp.status();
    result.answerEvalEmulator = answerEvalResp.url().includes("127.0.0.1:5001");
    result.branchEvalStatus = branchEvalResp.status();
    result.branchEvalUrl = branchEvalResp.url();
    result.branchEvalEmulator = branchEvalResp.url().includes("127.0.0.1:5001");

    const validTypes = ["roadmap_next", "ai_recommended", "additional", "exit"];
    result.branchValid =
      branchBody &&
      typeof branchBody.evaluationText === "string" &&
      branchBody.evaluationText &&
      typeof branchBody.isMerged === "boolean" &&
      Array.isArray(branchBody.branchOptions) &&
      branchBody.branchOptions.length > 0 &&
      branchBody.branchOptions.every(
        (o) =>
          o &&
          typeof o.label === "string" &&
          validTypes.includes(o.type) &&
          typeof o.isRecommended === "boolean" &&
          (o.stageContent === null || (o.stageContent && typeof o.stageContent.title === "string")),
      );
    result.branchOptionCount = branchBody && Array.isArray(branchBody.branchOptions)
      ? branchBody.branchOptions.length
      : null;
    result.anthropicDirectCount = anthropicDirect.length;

    // answerEval 피드백이 DOM 에 렌더되는지(평가 결과 표시)
    await page.waitForFunction(
      () => /정확|핵심|메커니즘|짚|설명|이해|답변/.test(document.body.innerText),
      { timeout: 15000 },
    );
    result.feedbackAreaRendered = true;

    result.ok =
      result.answerEvalStatus === 200 &&
      result.answerEvalEmulator === true &&
      result.branchEvalStatus === 200 &&
      result.branchEvalEmulator === true &&
      result.branchValid === true &&
      result.anthropicDirectCount === 0 &&
      result.feedbackAreaRendered === true;
  } catch (e) {
    result.error = String(e && e.message ? e.message : e);
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
})();
