import puppeteer from 'puppeteer-core';
const [,, url, ...cmds] = process.argv;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--window-size=1920,1080', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  defaultViewport: { width: 1920, height: 1080 }, protocolTimeout: 600000 });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text(), m.location()?.url); });
await page.goto(url, { waitUntil: 'networkidle0' });
await page.waitForFunction(() => window.ready === true, { timeout: 60000 });
for (const c of cmds) { if (c.startsWith('SHOT:')) { await page.screenshot({ path: c.slice(5) }); console.log('shot', c.slice(5)); } else await page.evaluate(c); }
await browser.close();
