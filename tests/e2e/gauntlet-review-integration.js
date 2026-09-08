'use strict';
// Independent integration review. UI inputs only; read-only game state for movement observations.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ORIGIN = process.env.BASE_URL || 'http://127.0.0.1:8787';
const OUT = path.join(__dirname, 'out/gauntlet/review-integration');
const results = [];
async function start(page, mode) {
  const activate = async selector => mode === 'touch' ? page.locator(selector).tap() : page.locator(selector).press('Enter');
  await activate('#btn-play');
  await activate('.level-card.current');
  await activate('#btn-lesson-play');
  await page.waitForFunction(() => window.__MeCung.G.state === 'playing');
}
async function nextDirection(page) {
  return page.evaluate(() => {
    const g = window.__MeCung.G, p = g.player;
    const r = Math.floor(p.y), c = Math.floor(p.x);
    const d = [{name:'up',key:'ArrowUp',dr:-1,dc:0},{name:'right',key:'ArrowRight',dr:0,dc:1},{name:'down',key:'ArrowDown',dr:1,dc:0},{name:'left',key:'ArrowLeft',dr:0,dc:-1}].find(d => !g.maze.wall[r+d.dr][c+d.dc]);
    return {...d, x:p.x, y:p.y};
  });
}
(async () => {
  fs.mkdirSync(OUT, {recursive:true});
  const browser = await chromium.launch();
  try {
    for (const mode of ['touch', 'keyboard']) {
      const context = await browser.newContext({viewport:{width:390,height:844},hasTouch:mode==='touch',locale:'vi-VN'});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const activate = async selector => mode === 'touch' ? page.locator(selector).tap() : page.locator(selector).press('Enter');
      await page.goto(ORIGIN + '/me-cung-dong-ho/');
      await activate('#menu .hub-home');
      await page.waitForURL(ORIGIN + '/');
      assert.equal(context.pages().length, 1, 'menu home same tab');
      results.push({mode,check:'menu-home-same-tab',result:'PASS'});
      await page.goto(ORIGIN + '/me-cung-dong-ho/');
      await start(page, mode);
      await activate('#btn-pause');
      await page.locator('#btn-resume').waitFor({state:'visible'});
      const d = await nextDirection(page);
      await activate('#btn-resume');
      // No animation wait: the first following input must work.
      if (mode === 'touch') await page.locator('[data-dir="'+d.name+'"]').tap();
      else { await page.keyboard.down(d.key); await page.waitForTimeout(110); await page.keyboard.up(d.key); }
      await page.waitForFunction(({x,y}) => { const p=window.__MeCung.G.player; return p.x!==x || p.y!==y; },d,{timeout:1500});
      results.push({mode,check:'immediate-resume-input',result:'PASS'});
      await activate('#btn-pause');
      await activate('#pause-home');
      await page.waitForURL(ORIGIN + '/');
      assert.equal(context.pages().length, 1, 'pause home same tab');
      results.push({mode,check:'pause-home-same-tab',result:'PASS'});
      assert.deepEqual(errors, []);
      await context.close();
    }
    const context = await browser.newContext({viewport:{width:390,height:844},hasTouch:true,locale:'vi-VN'});
    const page = await context.newPage();
    await page.goto(ORIGIN + '/');
    await page.locator('#btn-player').tap();
    await page.locator('#btn-player-add').tap();
    await page.locator('#player-name').fill('QA Linh');
    await page.locator('#btn-player-save').tap();
    await page.locator('#btn-players-back').tap();
    assert.match(await page.locator('#btn-player').innerText(),/QA Linh/);
    await page.reload();
    assert.match(await page.locator('#btn-player').innerText(),/QA Linh/);
    await page.goto(ORIGIN + '/me-cung-dong-ho/');
    assert.match(await page.locator('#btn-player').innerText(),/QA Linh/);
    await page.locator('#menu .hub-home').tap();
    await page.waitForURL(ORIGIN + '/');
    await page.locator('#btn-player').tap();
    await page.locator('.player-item').filter({hasText:'Bé'}).tap();
    await page.locator('#btn-players-back').tap();
    await page.reload();
    assert.match(await page.locator('#btn-player').innerText(),/Bé/);
    await page.goto(ORIGIN + '/me-cung-dong-ho/');
    assert.match(await page.locator('#btn-player').innerText(),/Bé/);
    results.push({check:'hub-profile-create-switch-reload-and-maze-propagation',result:'PASS'});
    await page.setViewportSize({width:667,height:375});
    await start(page, 'touch');
    const boxes = await page.locator('[data-dir], #btn-pause, #btn-hud-hint, #btn-hud-speak').evaluateAll(es=>es.map(e=>({id:e.id||e.dataset.dir,...e.getBoundingClientRect().toJSON()})));
    for(const b of boxes) { assert.ok(b.width>=44 && b.height>=44,b.id+' touch size'); assert.ok(b.left>=0 && b.top>=0 && b.right<=667 && b.bottom<=375,b.id+' within viewport'); }
    const direction = await nextDirection(page);
    await page.locator('[data-dir="'+direction.name+'"]').tap();
    await page.waitForFunction(({x,y})=>{const p=window.__MeCung.G.player;return p.x!==x||p.y!==y;},direction,{timeout:1500});
    await page.screenshot({path:path.join(OUT,'landscape.png')});
    results.push({check:'667x375-touch-controls-fit-and-move',result:'PASS',boxes});
    await page.locator('#btn-pause').tap();
    await page.locator('#pause-home').scrollIntoViewIfNeeded();
    await page.locator('#pause-home').click({trial:true});
    await page.waitForTimeout(400); // Screenshot only: let pause-panel transition finish.
    await page.screenshot({path:path.join(OUT,'landscape-pause.png')});
    await page.locator('#pause-home').tap();
    await page.waitForURL(ORIGIN + '/');
    results.push({check:'short-landscape-pause-home-reachable',result:'PASS'});
    await context.close();
    console.log(JSON.stringify({result:'PASS',results},null,2));
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({result:'PASS',results},null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
