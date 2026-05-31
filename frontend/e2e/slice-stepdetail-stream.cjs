// 스트리밍 E2E: roadmap 진입 시 stepDetailStream 으로 개념 설명(body)이 점진적으로 쌓이는지 검증.
// 실행: cd frontend && node e2e/slice-stepdetail-stream.cjs  (dev server + emulator 필요)
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

    const probeRespP = page.waitForResponse(
      (r) => r.url().includes("/probe") && r.request().method() === "POST",
      { timeout: 60000 },
    );
    await page.getByRole("button", { name: "학습 시작" }).click();
    const probeBody = await (await probeRespP).json();
    const p1 = Array.isArray(probeBody) ? probeBody[0] : null;
    const opt = p1 && Array.isArray(p1.options) ? p1.options.find((o) => o.value >= 1) : null;
    if (!opt) throw new Error("p1 비후퇴 선택지 없음");
    await page.waitForFunction((q) => document.body.innerText.includes(q), p1.q, { timeout: 10000 });
    await page.locator(".probe-choice", { hasText: opt.label }).first().click();

    // probe -> learn: 첫 단계 stepDetailStream 자동 시작
    const streamRespP = page.waitForResponse(
      (r) => r.url().includes("/stepDetailStream") && r.request().method() === "POST",
      { timeout: 60000 },
    );
    await page.getByRole("button", { name: "단계 만들기" }).click();
    const streamResp = await streamRespP;
    result.streamStatus = streamResp.status();
    result.usesEmulator = streamResp.url().includes("127.0.0.1:5001");

    // body 영역 길이를 폴링해 점진 증가를 관찰.
    const left = page.locator(".lv2-left-inner");
    const samples = [];
    for (let i = 0; i < 40; i++) {
      const len = await left.evaluate((el) => el.innerText.length).catch(() => 0);
      samples.push(len);
      const ready = await page.locator(".qa-pair").count();
      if (ready > 0 && i > 1) break;
      await page.waitForTimeout(400);
    }
    const finalLen = samples[samples.length - 1];
    // 중간 시점에 body 일부가 보였고(0<mid<final), 단조 증가했는가
    result.maxSample = Math.max(...samples);
    result.sawPartial = samples.some((v) => v > 20 && v < result.maxSample);
    result.sampleCount = samples.length;

    // 최종: questions 렌더 + 제출 버튼
    await page.waitForSelector(".qa-pair", { timeout: 30000 });
    result.questionCount = await page.locator(".qa-pair").count();
    result.submitVisible = (await page.getByRole("button", { name: "답변 제출하기" }).count()) > 0;
    result.anthropicDirectCount = anthropicDirect.length;

    result.ok =
      result.streamStatus === 200 &&
      result.usesEmulator === true &&
      result.sawPartial === true &&
      result.questionCount >= 3 &&
      result.submitVisible === true &&
      result.anthropicDirectCount === 0;
  } catch (e) {
    result.error = String(e && e.message ? e.message : e);
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
})();
