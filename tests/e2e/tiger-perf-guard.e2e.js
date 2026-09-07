'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { withGame, assertClean } = require('./lib/browser');
const out = path.join(__dirname, 'out/gauntlet/action-refresh/tiger-perf-guard');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const log = await withGame('cuoi-ho', async ({ page }) => {
    await page.locator('#btn-play').click();
    await page.getByText('Màn 1: Giờ đúng', { exact: true }).first().click();
    for (let n = 0; n < 8 && !(await page.locator('#btn-lesson-start').isVisible()); n++) await page.locator('#btn-slide-next').click();
    await page.locator('#btn-lesson-start').click();
    await page.waitForFunction(() => window.__CuoiHo.G.phase === 'choose');
    await page.evaluate(() => {
      window.__guardWrites = 0;
      new MutationObserver(ms => window.__guardWrites += ms.length).observe(document.getElementById('btn-learn-continue'), { attributes: true, attributeFilter: ['disabled'] });
    });
    const answer = await page.evaluate(() => window.__CuoiHo.curGate().q.answer);
    await page.keyboard.press(String((answer + 1) % 3 + 1));
    await page.waitForFunction(() => window.__CuoiHo.G.phase === 'learn');
    const snapshot = () => page.evaluate(() => {
      const g = window.__CuoiHo.G;
      return { phase: g.phase, gate: g.gateIdx, score: g.score, hearts: g.hearts, question: window.__CuoiHo.curGate().q.key };
    });
    const held = await snapshot();
    assert.equal(await page.locator('#btn-learn-continue').isDisabled(), true);
    await page.keyboard.down('Enter');
    assert.deepEqual(await snapshot(), held, 'Original early key must not continue');
    await page.waitForTimeout(11000);
    await page.keyboard.down('Enter'); // actual repeated keydown while still held
    assert.deepEqual(await snapshot(), held, 'Held/repeated key and no input must retain correction');
    await page.keyboard.up('Enter');
    assert.equal(await page.locator('#btn-learn-continue').isEnabled(), true);
    const writes = await page.evaluate(() => window.__guardWrites);
    assert.equal(writes, 2, 'Only initial disable and ready transition write the disabled attribute');
    await page.setViewportSize({ width: 780, height: 360 });
    const button = await page.locator('#btn-learn-continue').boundingBox();
    assert.ok(button && button.height >= 44 && button.y >= 0 && button.y + button.height <= 360, 'Continue remains visible after short landscape rotation');
    await page.screenshot({ path: path.join(out, 'held-short-landscape.png') });
    await page.locator('#btn-learn-continue').tap();
    await page.waitForFunction(() => window.__CuoiHo.G.gateIdx === 1);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.__CuoiHo.G.gateIdx), 1, 'One explicit tap advances one gate');
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ held, heldMs: 11000, disabledWrites: writes, button, after: await snapshot(), input: 'real keyboard down/repeat/up and touch tap; debug reads only' }, null, 2));
  }, { viewport: { width: 390, height: 844 } });
  assertClean(log, 'Tiger performance guard');
})().catch(e => { console.error(e); process.exitCode = 1; });
