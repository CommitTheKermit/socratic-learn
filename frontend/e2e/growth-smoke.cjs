// 로컬 브라우저 회귀 검사. AI·인증·저장 API는 호출하지 않고 완료 화면은 테스트 캐시로 복원한다.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:5189';
const output = path.resolve(__dirname, '../../docs/growth/evidence');

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === new URL(base).origin || ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
      // 운영 API·분석 전송을 막고 읽기 실패가 화면을 깨지 않는 기존 폴백도 확인한다.
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
    });
    await page.goto(`${base}/landing?utm_source=threads&utm_medium=organic_social&utm_campaign=relaunch_202609&utm_content=question_01`);
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'), 'https://socratic-learn-web.web.app/social/socratic-learn.png');
    assert.equal((await page.request.get(`${base}/social/socratic-learn.png`)).status(), 200);
    await page.screenshot({ path: path.join(output, 'landing-desktop.png') });
    await page.getByRole('link', { name: '개념 하나 공부하기' }).click();
    await page.getByPlaceholder('배우고 싶은 개념을 입력해서 시작해보세요').waitFor();
    assert.equal(new URL(page.url()).pathname, '/');
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem('socratic:growth:campaign:v1')).campaign_source), 'threads');

    const fixture = {
      sessionId: 'growth-smoke', createdAt: Date.now(), conceptSummary: '의존성 주입',
      stage: 'done', mode: 'light', concept: '의존성 주입', materials: '', probes: {},
      estimatedLevel: 2, stepIdx: 0, answers: {}, skips: {},
      steps: [{ id: 1, title: '객체를 외부에서 받는 이유', desc: '테스트용 학습 요약', body: '테스트 데이터입니다.', questions: [{ id: '1-1', q: '객체를 밖에서 받으면 무엇을 바꾸기 쉬울까요?' }] }],
    };
    await page.evaluate(data => localStorage.setItem('socratic:session:growth-smoke', JSON.stringify(data)), fixture);
    await page.goto(`${base}/s/growth-smoke/done`);
    await page.getByText('이번 학습의 개념', { exact: true }).waitFor();
    assert.equal(await page.locator('.done2-lvstrip').count(), 0);
    await page.getByText('테스트용 학습 요약', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'done-desktop.png') });
    await page.getByRole('button', { name: '← 마지막 답변 다시 보기' }).click();
    await page.waitForURL('**/s/growth-smoke/learn/0');
    await page.goto(`${base}/s/growth-smoke/done`);
    await page.getByRole('button', { name: '메인으로 →' }).click();
    await page.waitForURL(`${base}/`);
    for (const width of [390, 760]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${base}/landing`);
      await page.getByRole('heading', { level: 1 }).waitFor();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, `소개 페이지 가로 넘침: ${width}`);
      await page.screenshot({ path: path.join(output, `landing-${width}.png`) });
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: 'PASS', checks: ['landing-to-home', 'campaign-preserved', 'og-image-200', 'completion-no-level-gain', 'completion-return-paths', 'responsive-390-760', 'no-page-errors'], backend: 'stubbed-no-ai-calls' }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
