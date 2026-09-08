'use strict';
// Shared journeys with real DOM input; no gameplay score/health/win state writes.
const { withGame, assertClean } = require('./lib/browser');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const OUT = path.join(__dirname, 'out/gauntlet/matrix');
const games = process.argv.slice(2).length ? process.argv.slice(2) : ['math-ninja', 'cuu-chuong', 'me-cung-dong-ho', 'thap-dong-ho', 'xe-tang-thoi-gian', 'cuoi-ho'];
const views = [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 820, height: 1180 }, { width: 1180, height: 820 }];

async function waitPlaying(page) {
  await page.waitForFunction(() => {
    const x = window.__NinjaToan || window.__CuuChuong || window.__MeCung || window.__ThapDongHo || window.__XeTang || window.__CuoiHo;
    return x && x.G.state === 'playing';
  }, null, { timeout: 15000 });
}

async function enter(page, game) {
  await page.locator('#btn-play').click();
  await page.locator('.level-card').first().click();
  if (game === 'cuoi-ho') {
    for (let i = 0; i < 10 && !(await page.locator('#btn-lesson-start').isVisible()); i++) await page.locator('#btn-slide-next').click();
  }
  if (['me-cung-dong-ho', 'xe-tang-thoi-gian'].includes(game)) await page.locator('#btn-lesson-play').click();
  else if (['thap-dong-ho', 'cuoi-ho'].includes(game)) await page.locator('#btn-lesson-start').click();
  await waitPlaying(page);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const results = [];
  for (const game of games) for (const viewport of views) {
    const reducedMotion = viewport.width === 820 ? 'reduce' : 'no-preference';
    const log = await withGame(game, async ({ page, context, port }) => {
      const row = { game, viewport, dpr: 1, reducedMotion, input: viewport.width < 1000 ? 'touch' : 'mouse/keyboard' };
      const press = async selector => page.locator(selector)[viewport.width < 1000 ? 'tap' : 'click']();
      const shot = name => page.screenshot({ path: path.join(OUT, `${game}-${viewport.width}-${name}.png`) });
      await shot('menu');
      assert.equal(await page.locator('#menu .hub-home').getAttribute('href'), '../');
      const tabsBefore = context.pages().length;
      await press('#menu .hub-home');
      await page.waitForURL(`http://127.0.0.1:${port}/`);
      assert.equal(context.pages().length, tabsBefore, 'same tab home');
      await page.locator(`.game-card a[href="${game}/"]`).click();
      await page.locator('#btn-play').waitFor();
      // Mute from DOM. Root profile remains the same across the journey.
      const nameBefore = await page.locator('#btn-player').innerText();
      if (viewport.width === 390) {
        // Create/switch through the UI in this disposable context, then restore the first child.
        await press('#btn-player');
        const firstId = await page.locator('.player-item.active').getAttribute('data-id');
        await press('#btn-player-add');
        await page.locator('#player-name').fill('Bé kiểm thử');
        await press('#btn-player-save');
        await press('#btn-players-back');
        assert.match(await page.locator('#btn-player').innerText(), /Bé kiểm thử/);
        await page.reload();
        assert.match(await page.locator('#btn-player').innerText(), /Bé kiểm thử/);
        await press('#btn-player');
        await press(`.player-item[data-id="${firstId}"]`);
        if (await page.locator('#btn-players-back').isVisible()) await press('#btn-players-back');
        assert.equal(await page.locator('#btn-player').innerText(), nameBefore);
        row.profileSwitchReload = 'PASS';
      }
      const sound = '#menu .toggle[data-set="sound"]';
      if (await page.locator(sound).getAttribute('aria-pressed') === 'true') await press(sound);
      await enter(page, game);
      await shot('gameplay');
      await press('#btn-pause');
      await page.locator('#pause:not(.hidden)').waitFor();
      await shot('pause');
      await page.locator('#pause-home').click({ trial: true }); // wait for panel's opening transform to settle
      const hb = await page.locator('#pause-home').boundingBox();
      assert.ok(hb.width >= 44 && hb.height >= 44, 'home touch target');
      await press('#btn-resume');
      const blockedAfterResume = await page.evaluate(() => {
        const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
        return el && !!el.closest('.screen.hidden');
      });
      assert.equal(blockedAfterResume, false, 'fading hidden panel must not steal first gameplay input');
      await page.waitForFunction(() => document.querySelector('#pause').classList.contains('hidden'));
      // Rotate an active game and return; exceptions are captured by helper.
      await page.setViewportSize({ width: viewport.height, height: viewport.width });
      await page.waitForTimeout(160);
      await page.setViewportSize(viewport);
      await page.waitForTimeout(160);
      row.autoPausedOnRotate = await page.locator('#pause:not(.hidden)').isVisible();
      if (row.autoPausedOnRotate) await press('#btn-resume');
      await press('#btn-pause');
      await press('#btn-restart');
      await waitPlaying(page);
      await press('#btn-pause');
      await press('#pause-home');
      await page.waitForURL(`http://127.0.0.1:${port}/`);
      assert.equal(context.pages().length, tabsBefore, 'pause home same tab');
      await page.locator(`.game-card a[href="${game}/"]`).click();
      await page.locator('#btn-play').waitFor();
      assert.equal(await page.locator('#btn-player').innerText(), nameBefore, 'profile preserved');
      assert.equal(await page.locator(sound).getAttribute('aria-pressed'), 'false', 'muted setting persists after home/reenter');
      if (reducedMotion === 'reduce') assert.ok(await page.locator('#menu .toggle[data-set="fx"]').isDisabled(), 'system reduced-motion respected');
      row.home = row.pauseResume = row.restart = row.rotate = row.profile = row.mute = 'PASS';
      results.push(row);
      fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
      console.log(JSON.stringify(row));
    }, { viewport, reducedMotion, contextOptions: { hasTouch: viewport.width < 1000 } });
    assert.ok(assertClean(log, game + ' ' + viewport.width));
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
