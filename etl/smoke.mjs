import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
p.on('console', m => m.type() === 'error' && !m.text().includes('ERR_CERT') && errs.push(m.text()));
await p.goto('http://127.0.0.1:4196/', { waitUntil: 'networkidle' });
await p.waitForTimeout(2000);
for (let i = 1; i <= 8; i++) {
  await p.getByRole('button', { name: new RegExp(`^0${i}`) }).click();
  await p.waitForTimeout(i === 2 ? 2500 : 1300);
  await p.screenshot({ path: `/home/claude/shots/v2-${i}.png` });
}
console.log('errors:', errs.length ? errs.join(' | ') : 'none');
await b.close();
