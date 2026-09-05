'use strict';
// Kiểm tra initScript: gieo localStorage trước khi trang nạp
const { withGame, assertClean } = require('./lib/browser.js');
(async () => {
  const log = await withGame('cuoi-ho', async ({ page }) => {
    const v = await page.evaluate(() => localStorage.getItem('e2e-seed'));
    if (v !== 'ok') throw new Error('initScript did not run: ' + v);
    console.log('initScript ok');
  }, { initScript: "localStorage.setItem('e2e-seed','ok');", reducedMotion: 'reduce' });
  assertClean(log, 'init smoke');
})().catch((e) => { console.error(e); process.exit(1); });
