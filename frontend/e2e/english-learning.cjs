// Real local-emulator integration. Requires the existing e2e/run.sh environment.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.E2E_BASE_URL || 'http://localhost:5199';
const korean = /[가-힣]/;
const assertEnglish = (value, label) => {
  assert.ok(value && !korean.test(JSON.stringify(value)), `${label} must be in English`);
};
(async () => {
  const browser = await chromium.launch();
  const result = { ok: false, directAnthropicRequests: 0, checks: [] };
  try {
    const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.setDefaultTimeout(150000);
    page.on('request', request => {
      if (request.url().includes('api.anthropic.com')) result.directAnthropicRequests++;
    });
    await page.goto(base);
    await page.getByRole('button', { name: 'Start learning', exact: true }).waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    await page.locator('.input-bar textarea').fill('Variables in programming');
    await page.getByRole('combobox', { name: 'Language / 언어' }).selectOption('ko');
    await page.getByRole('button', { name: '학습 시작', exact: true }).waitFor();
    assert.equal(await page.locator('.input-bar textarea').inputValue(), 'Variables in programming');
    await page.reload();
    await page.getByRole('button', { name: '학습 시작', exact: true }).waitFor();
    await page.getByRole('combobox', { name: 'Language / 언어' }).selectOption('en');
    await page.getByRole('button', { name: 'Start learning', exact: true }).waitFor();
    result.checks.push('browser detection, manual override, reload persistence, draft preservation');
    await page.screenshot({ path: '/tmp/socratic-english-desktop.png', fullPage: true });

    const responseFor = path => page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/' + path) && r.request().method() === 'POST');
    const readResponse = async (promise, name) => {
      const response = await promise;
      assert.equal(response.status(), 200, name + ' HTTP status');
      assert.equal(response.request().postDataJSON().language, 'en', name + ' request language');
      const body = await response.json();
      require("node:fs").writeFileSync(`/tmp/socratic-e2e-${name.replaceAll(" ", "-")}.json`, JSON.stringify(body, null, 2));
      assertEnglish(body, name);
      return body;
    };
    await page.getByRole('button', { name: 'Learning mode:' }).click();
    await page.getByRole('option', { name: /Light/ }).click();
    const probePromise = responseFor('probe');
    await page.getByRole('button', { name: 'Start learning', exact: true }).click();
    const questions = await readResponse(probePromise, 'probe');
    const familiar = questions.find(q => q.id === 'p1').options.find(o => o.value === 1);
    await page.locator('.probe-choice', { hasText: familiar.label }).click();
    const outlinePromise = responseFor('outline');
    const streamPromise = responseFor('stepDetailStream');
    await page.getByRole('button', { name: 'Build my roadmap' }).click();
    await readResponse(outlinePromise, 'outline');
    const stream = await streamPromise;
    assert.equal(stream.status(), 200);
    assert.equal(stream.request().postDataJSON().language, 'en');
    const streamText = await stream.text();
    assertEnglish(streamText, 'streamed explanation');
    assert.ok(streamText.includes('event: complete'));
    await page.locator('.qa-pair').first().waitFor();
    const pairs = page.locator('.qa-pair');
    for (let i = 0; i < await pairs.count(); i++) {
      const textarea = pairs.nth(i).locator('textarea');
      if (await textarea.count()) await textarea.fill('A variable names a value so the program can store and reuse it.');
      else await pairs.nth(i).locator('button').first().click();
    }
    const evalPromise = responseFor('answerEval');
    await page.getByRole('button', { name: 'Submit answers', exact: true }).click();
    const evaluation = await readResponse(evalPromise, 'answer evaluation');
    assert.ok(evaluation.evaluations.length > 0);
    await page.getByText('AI feedback', { exact: true }).first().waitFor();
    result.checks.push('English diagnostic questions, roadmap, streamed explanation, questions and evaluation');
    await page.screenshot({ path: '/tmp/socratic-english-lesson.png', fullPage: true });

    const askPromise = responseFor('askRoute');
    await page.getByRole('button', { name: 'Ask a question', exact: true }).click();
    await page.getByPlaceholder('For example: What exactly does ‘state’ mean here?').fill('Why do variables have names?');
    await page.getByRole('button', { name: 'Send question', exact: true }).click();
    const answer = await readResponse(askPromise, 'follow-up answer');
    assert.ok(answer.answer.length > 0);
    result.checks.push('English answer to a learner question');

    const mobile = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 }, isMobile: true });
    const mobilePage = await mobile.newPage();
    await mobilePage.goto(base);
    await mobilePage.getByRole('button', { name: 'Start learning', exact: true }).waitFor();
    assert.equal(await mobilePage.locator('html').getAttribute('lang'), 'en');
    assert.equal(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await mobilePage.screenshot({ path: '/tmp/socratic-english-mobile.png', fullPage: true });
    await mobilePage.goto(base + '/landing');
    await mobilePage.getByRole('heading', { name: /Bring a concept/ }).waitFor();
    assert.equal(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await mobilePage.getByRole('combobox', { name: 'Language / 언어' }).waitFor({ state: 'visible' });
    result.checks.push('non-Korean mobile browser defaults to English, home and landing fit the viewport');
    assert.equal(result.directAnthropicRequests, 0);
    result.ok = true;
  } catch (error) { result.error = error.message; }
  finally { await browser.close(); }
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
})();
