// Vite만 필요. 카메라는 Chromium 가상 기기, 모든 외부 API는 mock으로 검증한다.
// 실행: E2E_BASE_URL=http://localhost:5198 node e2e/camera-answer.cjs
const assert = require("node:assert/strict");
const { mkdtempSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { chromium } = require("playwright");

(async () => {
  const base = process.env.E2E_BASE_URL || "http://localhost:5198";
  const screenshots = mkdtempSync(join(tmpdir(), "camera-answer-"));
  const browser = await chromium.launch({ channel: process.env.E2E_BROWSER_CHANNEL, args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, permissions: ["camera"] });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let ocrCalls = 0;
  let submitted;
  const snapshot = {
    sessionId: "camera-test", createdAt: Date.now(), conceptSummary: "속도", concept: "속도", materials: "",
    stage: "learn", mode: "light", probes: { p1: 2 }, estimatedLevel: 2, stepIdx: 0, answers: {}, skips: {},
    probeReady: true, probeQuestions: [{ id: "p3", kind: "text", q: "속도를 설명해 보세요", placeholder: "답변" }],
    steps: [{ id: 1, title: "속도와 거리", desc: "거리와 시간으로 속도를 구해요", body: "속도는 이동 거리를 걸린 시간으로 나눈 값이에요.", questions: [{ id: "q1", q: "10초 동안 20m를 이동했다면 속도는?" }] }],
  };
  try {
    await page.addInitScript((state) => {
      localStorage.setItem("socratic:session:camera-test", JSON.stringify(state));
      localStorage.setItem("socratic:activeSessionId", "camera-test");
    }, snapshot);
    await page.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname.endsWith("/answerOcr")) {
        ocrCalls++;
        const body = request.postDataJSON();
        assert.deepEqual(Object.keys(body), ["imageBase64"]);
        assert.equal(Buffer.from(body.imageBase64, "base64")[0], 0xff);
        return route.fulfill({ json: { text: "속도는 2 m/s입니다." } });
      }
      if (url.pathname.endsWith("/answerEval")) {
        submitted = request.postDataJSON();
        return route.fulfill({ json: { evaluations: [{ id: "q1", grade: "correct", feedback: "맞아요." }] } });
      }
      if (url.pathname.endsWith("/sessionSave")) return route.fulfill({ json: { ok: true } });
      if (url.pathname.endsWith("/sessionGet")) return route.fulfill({ json: { state: null } });
      if (url.pathname.endsWith("/sessionList")) return route.fulfill({ json: { sessions: [] } });
      if (url.origin === new URL(base).origin) return route.continue();
      return route.abort();
    });
    await page.goto(`${base}/s/camera-test/learn/0`);
    await page.getByRole("button", { name: "카메라 답변", exact: true }).click();
    assert.equal(await page.locator("textarea.qa-answer").count(), 0);
    await page.screenshot({ path: join(screenshots, "mobile.png"), fullPage: true });
    await page.getByRole("button", { name: "답안 촬영", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("video")?.videoWidth > 0);
    assert.equal(await page.locator("video").evaluate((video) => video.srcObject.getAudioTracks().length), 0);
    await page.getByRole("button", { name: "촬영", exact: true }).click();
    assert.equal(ocrCalls, 0);
    await page.screenshot({ path: join(screenshots, "capture.png"), fullPage: true });
    await page.getByRole("button", { name: "인식하여 답변에 넣기" }).click();
    await page.waitForFunction(() => document.querySelector("textarea.qa-answer")?.value === "속도는 2 m/s입니다.");
    assert.equal(ocrCalls, 1);
    await page.locator("textarea.qa-answer").fill("수정한 답변: 2 m/s");
    await page.getByRole("button", { name: "답변 제출하기" }).click();
    await page.getByText("맞아요.", { exact: true }).waitFor();
    assert.equal(submitted.questions[0].answer, "수정한 답변: 2 m/s");
    assert.equal(JSON.stringify(submitted).includes("imageBase64"), false);
    await page.goto(`${base}/s/camera-test/probe`);
    await page.getByRole("button", { name: "카메라 답변", exact: true }).click();
    assert.equal(await page.locator("textarea.probe-text").count(), 0);
    await page.getByRole("button", { name: "직접 입력" }).click();
    await page.locator("textarea.probe-text").fill("거리 / 시간");
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole("button", { name: "카메라 답변", exact: true }).waitFor({ state: "hidden" });
    assert.equal(await page.locator("textarea.probe-text").inputValue(), "거리 / 시간");
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ok: true, ocrCalls, screenshots, checks: "촬영 확인, OCR 입력, 수정/채점, 수준 확인, 데스크톱 회귀" }));
  } catch (error) {
    console.error({ errors, page: (await page.locator("body").innerText()).slice(0, 2000) });
    throw error;
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
