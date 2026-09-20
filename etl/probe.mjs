import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 320, height: 780 } });
await p.goto('http://127.0.0.1:4193/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
const out = await p.evaluate(() => {
  const rows = [];
  document.querySelectorAll('html, body, body *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 330 || r.right > 322) {
      rows.push({
        sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + (el.className||'').toString().trim().split(/\s+/)[0],
        w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right),
        sw: el.scrollWidth, pos: getComputedStyle(el).position, ov: getComputedStyle(el).overflowX,
      });
    }
  });
  return { docSW: document.documentElement.scrollWidth, bodySW: document.body.scrollWidth,
           canScroll: window.innerWidth < document.documentElement.scrollWidth, rows: rows.slice(0, 14) };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
