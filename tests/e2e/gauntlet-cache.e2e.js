'use strict';
// Real service-worker upgrade from committed baseline to working tree, in disposable contexts.
// No game state mutation or claimed gameplay completion. NODE_PATH must resolve playwright.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(__dirname, 'out/gauntlet/cache');
const REF = process.env.GAUNTLET_BASE || 'a1f0458';
const games = process.argv.slice(2).length ? process.argv.slice(2) : ['math-ninja', 'cuu-chuong', 'me-cung-dong-ho', 'thap-dong-ho', 'xe-tang-thoi-gian', 'cuoi-ho'];
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const baseline = new Map();
let old = true;
function read(rel) {
  if (!old) return fs.readFileSync(path.join(ROOT, rel));
  if (!baseline.has(rel)) baseline.set(rel, execFileSync('git', ['show', REF + ':' + rel], { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }));
  return baseline.get(rel);
}
const server = http.createServer((req, res) => {
  try {
    let rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    if (!rel || rel.endsWith('/')) rel += 'index.html';
    if (rel.split('/').includes('..')) throw new Error('path');
    const body = read(rel);
    res.writeHead(200, { 'Content-Type': (mime[path.extname(rel)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const game of games) {
      old = true;
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'vi-VN' });
      const page = await context.newPage();
      await page.goto(origin + '/' + game + '/');
      await page.evaluate(async () => { await navigator.serviceWorker.ready; });
      await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      const oldCache = await page.evaluate(() => caches.keys());
      const workerSource = fs.readFileSync(path.join(ROOT, game, 'sw.js'), 'utf8');
      const targetCache = workerSource.match(/const CACHE = '([^']+)'/)[1];
      const core = [...workerSource.match(/const CORE = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
      assert.ok(!oldCache.includes(targetCache), game + ': cache version really changed');
      // A second game's cache and a real profile survive activation. All in test context.
      await page.evaluate(async () => {
        await caches.open('other-game-gauntlet-sentinel');
        localStorage.setItem('gauntlet-sentinel', 'keep');
      });
      const savedBefore = await page.evaluate(() => ({ ...localStorage }));
      old = false;
      await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
      await page.waitForFunction(async ({ target, oldKeys }) => {
        const keys = await caches.keys();
        return keys.includes(target) && oldKeys.every(k => !keys.includes(k));
      }, { target: targetCache, oldKeys: oldCache }, { timeout: 20000 });
      await page.reload();
      await page.locator('#menu .game-home').waitFor({ state: 'visible' });
      const check = await page.evaluate(async ({ target, core }) => {
        const c = await caches.open(target);
        const missing = [];
        for (const url of core) if (!(await c.match(url))) missing.push(url);
        return { css: !!(await c.match('./game-shell.css')), missing, caches: await caches.keys(), storage: { ...localStorage }, scope: (await navigator.serviceWorker.getRegistration()).scope };
      }, { target: targetCache, core });
      assert.ok(check.css, game + ': new shared CSS cached');
      assert.deepEqual(check.missing, [], game + ': every CORE file cached');
      assert.ok(check.caches.includes('other-game-gauntlet-sentinel'), 'unrelated cache survives');
      for (const key of Object.keys(savedBefore)) assert.equal(check.storage[key], savedBefore[key], game + ': storage ' + key + ' preserved');
      assert.equal(new URL(check.scope).pathname, '/' + game + '/');
      await context.setOffline(true);
      await page.reload();
      await page.locator('#menu .game-home').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#menu .game-home').getAttribute('href'), '../');
      await page.screenshot({ path: path.join(OUT, game + '-offline.png') });
      results.push({ game, oldCache, targetCache, scope: check.scope, upgrade: 'PASS', offlineMenu: 'PASS', preservedKeys: Object.keys(savedBefore) });
      console.log(game + ': actual old-cache upgrade + offline menu + storage/scope PASS');
      await context.close();
    }
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ baseline: REF, browser: browser.version(), results }, null, 2));
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
