'use strict';
const { withGame, assertClean } = require('./lib/browser.js');
(async () => {
  const log = await withGame('cuoi-ho', async ({ page, shot, hook, hookName }) => {
    console.log('hook =', hookName, 'state =', await hook('X.G.state'));
    await page.click('#btn-play');
    await page.waitForTimeout(300);
    console.log('after play state =', await hook('X.G.state'));
    await shot('lib-smoke-levels');
  });
  assertClean(log, 'lib smoke');
})().catch((e) => { console.error(e); process.exit(1); });
