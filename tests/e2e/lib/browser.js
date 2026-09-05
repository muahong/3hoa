/* Trợ giúp kiểm thử đầu-cuối bằng Playwright (Chromium có sẵn trong sandbox).
   Chạy: NODE_PATH=/opt/node22/lib/node_modules node tests/e2e/<game>.e2e.js
   Dùng:
     const { withGame, assertClean } = require('./lib/browser.js');
     withGame('cuoi-ho', async ({ page, log, shot, hook }) => { ... }, { viewport: { width: 1180, height: 820 } })
   - Phục vụ thư mục gốc repo trên cổng ngẫu nhiên, mở /<dir>/ với màn hình cảm ứng, vi-VN.
   - log: { errors, warnings, pageErrors, failedRequests } (bỏ qua lỗi tải Google Fonts – sandbox chặn mạng).
   - shot(name): chụp màn hình vào tests/e2e/out/<dir>/<name>.png
   - hook(expr): page.evaluate trên đối tượng gỡ lỗi của game (window.__X), ví dụ hook('X.G.state').
   - opts: { viewport, initScript (chuỗi JS chạy trước khi trang nạp – gieo localStorage), reducedMotion: 'reduce', contextOptions } */
'use strict';
const path = require('path');
const fs = require('fs');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain' };

function serve() {
  const server = http.createServer((req, res) => {
    let p;
    try { p = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); res.end(); return; }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.normalize(path.join(ROOT, p));
    if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

const isFontNoise = (s) => /fonts\.g(oogleapis|static)\.com|ERR_CONNECTION_RESET|net::ERR_|Failed to load resource/.test(String(s));

async function withGame(dir, fn, opts) {
  opts = opts || {};
  const { server, port } = await serve();
  const browser = await chromium.launch();
  const context = await browser.newContext(Object.assign({
    viewport: opts.viewport || { width: 1180, height: 820 }, deviceScaleFactor: 1, hasTouch: true, isMobile: false, locale: 'vi-VN',
    reducedMotion: opts.reducedMotion || 'no-preference'
  }, opts.contextOptions || {}));
  // opts.initScript: chuỗi JS chạy trước mọi script của trang (ví dụ gieo localStorage cũ để thử di trú dữ liệu)
  if (opts.initScript) await context.addInitScript(typeof opts.initScript === 'function' ? opts.initScript : { content: String(opts.initScript) });
  const page = await context.newPage();
  const log = { errors: [], warnings: [], pageErrors: [], failedRequests: [] };
  page.on('console', (m) => { const t = m.text(); if (m.type() === 'error') { if (!isFontNoise(t)) log.errors.push(t); } else if (m.type() === 'warning') log.warnings.push(t); });
  page.on('pageerror', (e) => log.pageErrors.push(String((e && e.stack) || e)));
  page.on('requestfailed', (r) => { if (!isFontNoise(r.url())) log.failedRequests.push(r.url() + ' ' + (r.failure() && r.failure().errorText)); });
  page.on('response', (r) => { if (r.status() >= 400 && !isFontNoise(r.url())) log.failedRequests.push(r.url() + ' HTTP ' + r.status()); });
  const outDir = path.join(__dirname, '..', 'out', dir.replace(/[^a-z0-9_-]/gi, '_') || 'root');
  fs.mkdirSync(outDir, { recursive: true });
  const shot = (name) => page.screenshot({ path: path.join(outDir, name + '.png') });
  const url = `http://127.0.0.1:${port}/${dir ? dir.replace(/\/?$/, '/') : ''}`;
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(400);
  const hookName = await page.evaluate(() => Object.keys(window).find((k) => k.indexOf('__') === 0 && window[k] && typeof window[k] === 'object') || null);
  const hook = (expr) => page.evaluate(({ h, e }) => { const X = window[h]; return (new Function('X', 'return (' + e + ')'))(X); }, { h: hookName, e: expr });
  try {
    await fn({ page, log, shot, hook, hookName, port, url, outDir, context });
  } finally {
    await browser.close();
    server.close();
  }
  return log;
}

function assertClean(log, label) {
  const problems = [].concat(log.pageErrors.map((e) => 'pageerror: ' + e), log.errors.map((e) => 'console.error: ' + e), log.failedRequests.map((e) => 'request: ' + e));
  if (problems.length) {
    console.error((label || 'e2e') + ' — lỗi:\n  ' + problems.join('\n  '));
    process.exitCode = 1;
    return false;
  }
  console.log((label || 'e2e') + ' — sạch (không lỗi trang/console).' + (log.warnings.length ? ' Cảnh báo: ' + log.warnings.length : ''));
  return true;
}

module.exports = { withGame, assertClean, serve, ROOT };
