'use strict';
// Observation harness: uses actual pointer/key events, never mutates gameplay state.
const { withGame } = require('./lib/browser');
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, 'out/gauntlet/baseline-action');
fs.mkdirSync(out, { recursive: true });
(async () => {
  for (const game of process.env.GAUNTLET_GAME ? [process.env.GAUNTLET_GAME] : ['xe-tang-thoi-gian', 'cuoi-ho']) {
    for (const viewport of process.env.GAUNTLET_LANDSCAPE ? [{ width: 844, height: 390 }] : [{ width: 1180, height: 820 }, { width: 390, height: 844 }]) {
      await withGame(game, async ({ page, log }) => {
        const key = `${game}-${viewport.width}`;
        await page.screenshot({ path: path.join(out, `${key}-menu.png`) });
        await page.locator('#btn-play').click();
        await page.waitForTimeout(500);
        await page.getByText(game === 'cuoi-ho' ? 'Màn 1: Giờ đúng' : 'Giờ đúng', { exact: true }).first().click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(out, `${key}-lesson.png`) });
        if (game === 'xe-tang-thoi-gian') {
          await page.locator('#btn-lesson-play').click();
          await page.waitForTimeout(4500);
          await page.screenshot({ path: path.join(out, `${key}-gameplay.png`) });
          if (viewport.width < 500) await page.touchscreen.tap(96, 325);
          else await page.keyboard.press('1');
          await page.waitForTimeout(700);
          await page.screenshot({ path: path.join(out, `${key}-after-choice.png`) });
        } else {
          for (let n = 0; n < 8 && !(await page.locator('#btn-lesson-start').isVisible()); n++) {
            await page.locator('#btn-slide-next').click();
            await page.waitForTimeout(200);
          }
          await page.locator('#btn-lesson-start').click();
          await page.waitForTimeout(5000);
          await page.screenshot({ path: path.join(out, `${key}-gameplay.png`) });
          if (viewport.width < 500) await page.touchscreen.tap(285, 450);
          else await page.keyboard.press('1');
          await page.waitForTimeout(1400);
          await page.screenshot({ path: path.join(out, `${key}-after-choice.png`) });
        }
        console.log(key, await page.locator('body').innerText());
        if (game === 'cuoi-ho') console.log('TAP TIP', await page.locator('.tap-tip').evaluate(el => ({ display:getComputedStyle(el).display, text:el.textContent, rect:el.getBoundingClientRect().toJSON() })));
        fs.writeFileSync(path.join(out, `${key}-after-choice.txt`), await page.locator('body').innerText());
        if (game === 'cuoi-ho') {
          await page.waitForTimeout(4000);
          await page.screenshot({ path: path.join(out, `${key}-no-input-4sec-later.png`) });
          fs.writeFileSync(path.join(out, `${key}-no-input-4sec-later.txt`), await page.locator('body').innerText());
        }
        console.log('BUTTONS', await page.locator('button:visible').evaluateAll(bs => bs.map(b => ({id:b.id,text:b.innerText}))));
        fs.writeFileSync(path.join(out, `${key}-log.json`), JSON.stringify(log, null, 2));
      }, { viewport });
    }
  }
})();
