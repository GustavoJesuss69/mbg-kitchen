import puppeteer from 'puppeteer-core';
const [,, url, out, ...cmds] = process.argv;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--window-size=1920,1080', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  defaultViewport: { width: 1920, height: 1080 }, protocolTimeout: 600000 });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type()==='warning') console.log('[console]', m.text()); });
await page.goto(url, { waitUntil: 'networkidle0' });
await page.waitForFunction(() => window.ready === true, { timeout: 60000 });
for (const c of cmds) { await page.evaluate(c); }
const t = Date.now();
await page.screenshot({ path: out });
console.log('ok', Date.now() - t);
await browser.close();
