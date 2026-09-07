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
let activeDiagnostic = { stage: 'boot', events: [], serverRequests: [] };
function stage(label) { activeDiagnostic.stage = label; activeDiagnostic.stageAt = new Date().toISOString(); event('stage', { label }); }
function event(kind, data) { activeDiagnostic.events.push({ at: Date.now(), kind, ...data }); if (activeDiagnostic.events.length > 100) activeDiagnostic.events.shift(); }
function dump(reason) {
  fs.writeFileSync(path.join(OUT, (activeDiagnostic.game || 'boot') + '-watchdog.json'), JSON.stringify({ ...activeDiagnostic, reason }, null, 2));
}
const deadline = (promise, ms, label) => { let timer; return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' exceeded Node deadline ' + ms + 'ms')), ms); })]).finally(() => clearTimeout(timer)); };
function read(rel) {
  if (!old) return fs.readFileSync(path.join(ROOT, rel));
  if (!baseline.has(rel)) baseline.set(rel, execFileSync('git', ['show', REF + ':' + rel], { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }));
  return baseline.get(rel);
}
const server = http.createServer((req, res) => {
  activeDiagnostic.serverRequests.push({ at: Date.now(), url: req.url, old });
  if (activeDiagnostic.serverRequests.length > 80) activeDiagnostic.serverRequests.shift();
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
  let prior = null;
  try { prior = JSON.parse(fs.readFileSync(path.join(OUT, 'results.json'), 'utf8')); } catch { /* first run */ }
  const results = prior && prior.baseline === REF && Array.isArray(prior.results) ? prior.results.slice() : [];
  const invocationId = new Date().toISOString();
  const writeResults = () => fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ baseline: REF, browser: browser.version(), combinedInvocations: !!(prior && prior.results && prior.results.length), latestInvocation: invocationId, latestInvocationGames: games, results }, null, 2));
  try {
    for (const game of games) {
      activeDiagnostic = { game, stage: 'starting', events: [], serverRequests: [] };
      const watchdog = setTimeout(() => { dump('Hard per-game watchdog 100s'); console.error(game + ': hard watchdog; diagnostics written'); process.exit(2); }, 100000);
      watchdog.unref();
      old = true;
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'vi-VN' });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      page.setDefaultNavigationTimeout(30000);
      const pending = new Set();
      activeDiagnostic.pending = [];
      page.on('request', r => pending.add(r.url()));
      page.on('requestfinished', r => pending.delete(r.url()));
      page.on('requestfailed', r => pending.delete(r.url()));
      page.on('request', r => { activeDiagnostic.pending = [...pending]; event('request', { url: r.url(), resourceType: r.resourceType() }); });
      page.on('response', r => event('response', { url: r.url(), status: r.status(), fromSW: r.fromServiceWorker() }));
      page.on('requestfailed', r => { activeDiagnostic.pending = [...pending]; event('requestfailed', { url: r.url(), failure: r.failure() }); });
      page.on('requestfinished', () => { activeDiagnostic.pending = [...pending]; });
      page.on('pageerror', e => event('pageerror', { error: String(e) }));
      page.on('crash', () => event('crash', {}));
      context.on('serviceworker', w => event('serviceworker', { url: w.url() }));
      stage('old-navigation');
      console.log(game + ': loading old version');
      await page.goto(origin + '/' + game + '/');
      console.log(game + ': waiting old service worker');
      await page.evaluate(async () => { await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Old service worker not ready within 20s')),20000))]); });
      await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      const oldCache = await page.evaluate(() => caches.keys());
      const workerSource = fs.readFileSync(path.join(ROOT, game, 'sw.js'), 'utf8');
      const targetCache = workerSource.match(/const CACHE = '([^']+)'/)[1];
      const core = [...workerSource.match(/const CORE = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
      assert.ok(!oldCache.includes(targetCache), game + ': cache version really changed');
      // Make the second historical child selectable, using the OLD application's UI.
      await page.locator('#btn-player').tap();
      await page.locator('#btn-player-add').tap();
      await page.locator('#player-name').fill('QA thứ hai');
      await page.locator('#btn-player-save').tap();
      await page.locator('#btn-players-back').tap();
      assert.match(await page.locator('#btn-player').innerText(), /QA thứ hai/);
      await page.locator('#btn-player').tap();
      await page.locator('.player-item[data-id="p1"]').tap();
      if (await page.locator('#btn-players-back').isVisible()) await page.locator('#btn-players-back').tap();
      // A second game's cache and a real profile survive activation. All in test context.
      await page.evaluate(async () => {
        await caches.open('other-game-gauntlet-sentinel');
        localStorage.setItem('gauntlet-sentinel', 'keep');
        // Explicit historical progress fixture, never counted as real-input completion.
        // Let the OLD version sanitize it before checking the NEW version preserves it.
        const X = window.__NinjaToan || window.__CuuChuong || window.__MeCung || window.__ThapDongHo || window.__XeTang || window.__CuoiHo;
        const S = X.Store;
        const sample = Object.assign(S.blank(), {
          unlocked: 3,
          records: { l1: { best: 900, stars: 2, passed: true, plays: 4 }, 'answer:a1:90': { best: 900, stars: 2 }, 't2:mul:90': { best: 900, stars: 2 } },
          levels: { L1: { best: 900, stars: 2, done: 1 }, l1: { best: 900, stars: 2, quiz: true } },
          stats: { plays: 4, correct: 12, wrong: 3, seconds: 180, last: 1756800000000, byTopic: {} }
        });
        S.data.players.p1 = S.sanitize(sample);
        const second = window.Players.list().find(p => p.name === 'QA thứ hai');
        if (!second) throw new Error('Missing selectable second profile');
        S.data.players[second.id] = S.sanitize(sample);
        S.save();
      });
      const savedBefore = await page.evaluate(() => ({ ...localStorage }));
      const progressBefore = await page.evaluate(() => {
        const X = window.__NinjaToan || window.__CuuChuong || window.__MeCung || window.__ThapDongHo || window.__XeTang || window.__CuoiHo;
        return X.Store.data.players;
      });
      old = false;
      console.log(game + ': updating service worker');
      stage('upgrade');
      await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await Promise.race([r.update(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Service worker update exceeded 20s')),20000))]); });
      await page.waitForFunction(async ({ target, oldKeys }) => {
        const keys = await caches.keys();
        return keys.includes(target) && oldKeys.every(k => !keys.includes(k));
      }, { target: targetCache, oldKeys: oldCache }, { timeout: 20000 });
      stage('new-online-navigation');
      await deadline(page.reload(), 35000, game + ' online reload');
      await page.locator('#menu .game-home').waitFor({ state: 'visible' });
      assert.deepEqual(await page.evaluate(() => {
        const X = window.__NinjaToan || window.__CuuChuong || window.__MeCung || window.__ThapDongHo || window.__XeTang || window.__CuoiHo;
        return X.Store.data.players;
      }), progressBefore, game + ': historical progress loaded for both children');
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
      stage('offline-navigation');
      console.log(game + ': loading offline');
      try { await deadline(page.reload(), 15000, game + ' offline reload'); } catch (error) {
        const diagnostic = { game, pending: [...pending], dom: await Promise.race([page.evaluate(() => ({ready:document.readyState, title:document.title, text:document.body.innerText.slice(0,1400)})).catch(() => null),new Promise(resolve=>setTimeout(()=>resolve('DOM diagnostic timed out after 2s'),2000))]) };
        fs.writeFileSync(path.join(OUT, game + '-offline-timeout.json'), JSON.stringify(diagnostic,null,2));
        console.error(JSON.stringify(diagnostic));
        activeDiagnostic.pending = [...pending]; dump(String(error));
        throw error;
      }
      stage('offline-profile-checks');
      await page.locator('#menu .game-home').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#menu .game-home').getAttribute('href'), '../');
      for (const id of Object.keys(progressBefore)) {
        await page.locator('#btn-player').tap();
        await page.locator(`.player-item[data-id="${id}"]`).tap();
        if (await page.locator('#btn-players-back').isVisible()) await page.locator('#btn-players-back').tap();
        const active = await page.evaluate(() => {
          const X = window.__NinjaToan || window.__CuuChuong || window.__MeCung || window.__ThapDongHo || window.__XeTang || window.__CuoiHo;
          return { id: window.Players.active().id, progress: X.Store.p() };
        });
        assert.equal(active.id, id, game + ': historical child selectable offline');
        assert.deepEqual(active.progress, progressBefore[id], game + ': selected child retains historical record');
      }
      await page.screenshot({ path: path.join(OUT, game + '-offline.png') });
      const result = { game, oldCache, targetCache, scope: check.scope, upgrade: 'PASS', offlineMenu: 'PASS', selectableHistoricalChildren: Object.keys(progressBefore).length, preservedKeys: Object.keys(savedBefore), verifiedAt: new Date().toISOString(), invocationId, browser: browser.version() };
      const priorIndex = results.findIndex(r => r.game === game);
      if (priorIndex >= 0) results.splice(priorIndex, 1);
      results.push(result);
      fs.writeFileSync(path.join(OUT, game + '-result.json'), JSON.stringify({ baseline: REF, ...result }, null, 2));
      writeResults(); // Persist each successful game even if a later navigation hangs.
      console.log(game + ': actual old-cache upgrade + offline menu + storage/scope PASS');
      stage('complete'); dump('PASS'); clearTimeout(watchdog);
      await context.close();
    }
    writeResults();
  } finally { await deadline(browser.close(), 5000, 'browser.close').catch(e => console.error(String(e))); server.closeAllConnections(); server.close(); }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
