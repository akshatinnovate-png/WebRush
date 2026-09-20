import { chromium } from 'playwright';

const WIDTHS = [320, 360, 390, 414, 480, 640, 768, 900, 1024, 1280, 1440, 1920];
const ACTS = 8;
const b = await chromium.launch();

for (const w of WIDTHS) {
  const p = await b.newPage({ viewport: { width: w, height: 780 } });
  await p.goto('http://127.0.0.1:4196/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  const problems = [];

  for (let i = 1; i <= ACTS; i++) {
    await p.getByRole('button', { name: new RegExp(`^0${i}`) }).click();
    await p.waitForTimeout(i === 2 ? 1500 : 650);

    const r = await p.evaluate((vw) => {
      const out = { scrollW: document.documentElement.scrollWidth, wide: [], tiny: [], overlap: 0 };
      document.querySelectorAll('body *').forEach((el) => {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) return;
        if (b.right > vw + 1.5 || b.left < -1.5) {
          const cs = getComputedStyle(el);
          if (cs.overflowX !== 'auto' && cs.overflowX !== 'scroll' && cs.position !== 'fixed') {
            out.wide.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} w=${Math.round(b.width)} r=${Math.round(b.right)}`);
          }
        }
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (el.children.length === 0 && el.textContent.trim() && fs < 11) {
          out.tiny.push(`${(el.className||'').toString().split(' ')[0]||el.tagName} ${fs}px`);
        }
      });
      return out;
    }, w);

    if (r.scrollW > w + 1) problems.push(`act${i} BODY SCROLL ${r.scrollW}>${w}`);
    if (r.wide.length) problems.push(`act${i} overflow: ${[...new Set(r.wide)].slice(0, 4).join(' | ')}`);
    if (r.tiny.length) problems.push(`act${i} tiny-text: ${[...new Set(r.tiny)].slice(0, 3).join(' | ')}`);
  }
  console.log(`\n=== ${w}px ===`);
  console.log(problems.length ? problems.join('\n') : 'clean');
  await p.close();
}
await b.close();
