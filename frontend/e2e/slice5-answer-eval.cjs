// Slice 5 E2E: input -> probe -> roadmap -> 답변 입력 -> "답변 제출하기" -> /answerEval 검증.
// 실행: cd frontend && node e2e/slice5-answer-eval.cjs  (dev server 5173 + emulator 5001 필요)
// 주의: submitAnswers 는 분기 평가(slice6 generateBranchEvaluation, 아직 미이전=anthropic 직호출)도
//       동시에 시작하므로, "직호출 0" 이 아니라 answerEval 이 emulator 로 갔는지를 핵심으로 본다.
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const anthropicDirect = [];
  const answerEvalReqs = [];
  page.on("request", (req) => {
    if (req.url().includes("api.anthropic.com")) anthropicDirect.push(req.url());
  });
  page.on("response", (res) => {
    if (res.url().includes("/answerEval") && res.request().method() === "POST") {
      answerEvalReqs.push(res.url());
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

    // probe -> learn: 첫 단계 stepDetail 자동 로드 (questions 확보)
    const stepDetailRespP = page.waitForResponse(
      (r) => r.url().includes("/stepDetail") && r.request().method() === "POST",
      { timeout: 60000 },
    );
    await page.getByRole("button", { name: "단계 만들기" }).click();
    const stepDetailBody = await (await stepDetailRespP).json();
    const qCount = stepDetailBody && Array.isArray(stepDetailBody.questions)
      ? stepDetailBody.questions.length
      : 0;

    // 질문 textarea 가 렌더될 때까지 대기 후 모두 답변 입력
    await page.waitForSelector("textarea", { timeout: 15000 });
    const tas = page.locator("textarea");
    const n = await tas.count();
    for (let i = 0; i < n; i++) {
      await tas.nth(i).fill("스레드를 막지 않고 중단/재개가 가능해서 적은 자원으로 동시성을 다룰 수 있습니다.");
    }

    // "답변 제출하기" -> /answerEval
    const answerEvalRespP = page.waitForResponse(
      (r) => r.url().includes("/answerEval") && r.request().method() === "POST",
      { timeout: 60000 },
    );
    await page.getByRole("button", { name: "답변 제출하기" }).click();
    const answerEvalResp = await answerEvalRespP;
    const body = await answerEvalResp.json().catch(() => null);

    result.answerEvalStatus = answerEvalResp.status();
    result.answerEvalUrl = answerEvalResp.url();
    result.usesEmulator = answerEvalResp.url().includes("127.0.0.1:5001");
    result.evalCount = body && Array.isArray(body.evaluations) ? body.evaluations.length : null;
    const validGrades = ["correct", "almost", "partial", "wrong"];
    result.evalsValid =
      body &&
      Array.isArray(body.evaluations) &&
      body.evaluations.length > 0 &&
      body.evaluations.every(
        (e) =>
          e &&
          typeof e.id === "string" &&
          validGrades.includes(e.grade) &&
          typeof e.feedback === "string" &&
          e.feedback,
      );
    result.questionCount = qCount;
    result.anthropicDirectCount = anthropicDirect.length; // branch eval(slice6) 직호출 예상(정보용)

    // DOM 렌더: 첫 피드백 텍스트 일부 노출 확인
    const fb = body && body.evaluations && body.evaluations[0] ? body.evaluations[0].feedback : null;
    const fbToken = fb ? (fb.replace(/[*`#>\-\n]/g, " ").match(/[가-힣A-Za-z0-9]{6,}/) || [])[0] : null;
    if (fbToken) {
      await page.waitForFunction((t) => document.body.innerText.includes(t), fbToken, {
        timeout: 15000,
      });
      result.feedbackRenderedInDom = true;
    }

    result.ok =
      result.answerEvalStatus === 200 &&
      result.usesEmulator === true &&
      typeof result.evalCount === "number" &&
      result.evalCount >= 1 &&
      result.evalsValid === true &&
      result.feedbackRenderedInDom === true;
  } catch (e) {
    result.error = String(e && e.message ? e.message : e);
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
})();
