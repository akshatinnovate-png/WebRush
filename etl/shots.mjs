/* Visual smoke test: load the built site, walk every pass, screenshot each. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = '/home/claude/shots';
mkdirSync(OUT, { recursive: true });

const ACTS = ['overture', 'web', 'tape', 'day', 'rhythm', 'atlas', 'copy'];

const browser = await chromium.launch();

for (const [name, size] of [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844 }],
]) {
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
  const problems = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
  page.on('pageerror', (e) => problems.push(`PAGEERROR ${e.message}`));

  await page.goto('http://127.0.0.1:4178/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);

  for (let i = 0; i < ACTS.length; i += 1) {
    await page.getByRole('button', { name: new RegExp(`^0${i + 1}`) }).click();
    await page.waitForTimeout(i === 1 ? 2200 : 1200);
    await page.screenshot({ path: `${OUT}/${name}-${i + 1}-${ACTS[i]}.png`, fullPage: false });
  }

  // search palette
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(400);
  await page.keyboard.type('milk');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}-8-search.png` });

  console.log(`${name}: ${problems.length ? problems.join(' | ') : 'no console errors'}`);
  await page.close();
}

await browser.close();
