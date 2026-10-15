import puppeteer from 'puppeteer-core';
import fs from 'fs';
const FPS = 30, DUR = Number(process.env.DUR || 45), DIR = process.env.DIR || '/workspace/mbg-kitchen/frames';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null;
fs.mkdirSync(DIR, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--window-size=1920,1080', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'],
  defaultViewport: { width: 1920, height: 1080 }, protocolTimeout: 900000 });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(process.env.URL || 'http://127.0.0.1:5420/?capture=1', { waitUntil: 'networkidle0' });
await page.waitForFunction(() => window.ready === true);
await page.evaluate(() => { __cap.setSpeed(2); __cap.jump(325); });
// timeline: [time, selector, action]
const TL = [
  [5.0, '[data-cam="action"]', "__cap.setCam('action')"],
  [15.5, '[data-tab="menu"]', "__cap.setTab('menu')"],
  [17.0, '[data-menu="1"]', '__cap.setMenu(1)'],
  [18.6, '[data-cam="tray"]', "__cap.setCam('tray')"],
  [25.5, '[data-speed="4"]', '__cap.setSpeed(4)'],
  [26.6, '[data-tab="deliveries"]', "__cap.setTab('deliveries')"],
  [28.6, '[data-cam="overview"]', "__cap.setCam('overview')"],
  [32.6, '[data-cam="van"]', "__cap.setCam('van')"],
  [39.8, '[data-cam="map"]', "__cap.setCam('map')"],
];
const pos = {};
for (const [, sel] of TL) pos[sel] = await page.evaluate((s) => __cap.rect(s), sel);
let cur = { x: 1180, y: 760 };
const N = DUR * FPS; let fired = 0;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
for (let f = 0; f < N; f++) {
  const t = f / FPS;
  while (fired < TL.length && t >= TL[fired][0]) { await page.evaluate(TL[fired][2]); cur = pos[TL[fired][1]]; fired++; }
  // cursor
  let cx = cur.x, cy = cur.y, ring = 0;
  if (fired < TL.length) { const [tt, sel] = TL[fired]; const k = (t - (tt - 0.7)) / 0.7; if (k > 0) { const e = ease(Math.min(1, k)); cx = cur.x + (pos[sel].x - cur.x) * e; cy = cur.y + (pos[sel].y - cur.y) * e; } }
  if (fired > 0) { const dtc = t - TL[fired - 1][0]; if (dtc < 0.35) ring = 1 - dtc / 0.35; }
  const show = t > 3.6;
  const FROM = Number(process.env.FROM || 0); await page.evaluate((skip) => (window.__skipRender = skip), f < FROM);
  await page.evaluate((cx, cy, ring, show) => { if (show) __cap.cursor(cx + 6, cy + 4, ring); __cap.frame(1 / 30); }, cx, cy, ring, show);
  if (f >= FROM && (!ONLY || ONLY.includes(f))) fs.writeFileSync(`${DIR}/f${String(f).padStart(5, '0')}.jpg`, await page.screenshot({ type: 'jpeg', quality: 92 }));
  if (f % 60 === 0) console.log('frame', f, new Date().toISOString());
}
await browser.close();
console.log('done');
