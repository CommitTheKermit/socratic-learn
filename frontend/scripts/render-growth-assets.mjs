import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const source = pathToFileURL(resolve(root, 'docs/growth/assets/cards.html'));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1350 }, deviceScaleFactor: 1 });
  for (const id of ['card-1', 'card-2', 'card-3', 'card-4', 'og']) {
    const url = new URL(source); url.searchParams.set('card', id);
    await page.goto(url.href);
    await page.evaluate(() => document.fonts.ready);
    const card = page.locator(`#${id}`);
    const overflow = await card.evaluate(el => el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight);
    if (overflow) throw new Error(`이미지 영역 넘침: ${id}`);
    const output = id === 'og' ? 'frontend/public/social/socratic-learn.png' : `docs/growth/assets/instagram-${id}.png`;
    await mkdir(dirname(resolve(root, output)), { recursive: true });
    await card.screenshot({ path: resolve(root, output) });
    console.log(output);
  }
} finally { await browser.close(); }
