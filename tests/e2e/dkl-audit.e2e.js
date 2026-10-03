'use strict';
// Isolated synthetic profiles and renderer fixtures. Never touches a user's browser profile.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { withGame, assertClean } = require('./lib/browser.js');
const phase = process.argv[2] || 'after';
const output = path.resolve(__dirname, '../../out/dkl-audit', phase);
fs.mkdirSync(output, { recursive: true });
async function capture() {
  const log = await withGame('dao-khung-long', async ({ page, context, port }) => {
    if (phase === 'before') {
      // Baseline text is the verified unmodified commit, never reconstructed from patched files.
      await context.route('**/dao-khung-long/**', async route => {
        const file = new URL(route.request().url()).pathname.replace(/^\//, '') || 'dao-khung-long/index.html';
        const rel = file.endsWith('/') ? file + 'index.html' : file;
        if (!/\.(html|js|css)$/.test(rel)) return route.continue();
        const body = execFileSync('git', ['show', 'HEAD:' + rel], { cwd: path.resolve(__dirname, '../..') });
        await route.fulfill({ status: 200, contentType: rel.endsWith('.js') ? 'application/javascript' : rel.endsWith('.css') ? 'text/css' : 'text/html', body });
      });
      await page.reload();
    }
    await page.waitForFunction(() => window.__DKL && document.querySelector('#man-tai').classList.contains('hidden'));
    await page.evaluate(async () => {
      const p = await HoSo.taoMoi({ ten: 'Kiểm thử đồ họa', tuoi: 7, lop: 2, phong_cach: 'dung_manh' });
      p.khung_long.muc = 'so_sinh';
      p.huong_dan = { da_mo: true, gioi_thieu: true };
      await HoSo.luu(p);
      await __DKL.chonBe(p.id);
      __DKL.vaoDao();
    });
    const metrics = [];
    for (const width of [360, 390, 414, 768, 1280]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await page.evaluate(() => __DKL.vaoDao());
      await page.screenshot({ path: path.join(output, `map-${width}.png`) });
      metrics.push(await page.evaluate(() => {
        const el = document.querySelector('#man-ban-do');
        return { viewport: innerWidth, client: el.clientWidth, scroll: el.scrollWidth, overflow: getComputedStyle(el).overflowX };
      }));
      await page.locator('#bd-hang').click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(output, `cave-${width}.png`) });
      await page.locator('#hk-quay').click();
    }
    fs.writeFileSync(path.join(output, 'layout.json'), JSON.stringify(metrics, null, 2));
    const gallery = await context.newPage();
    await gallery.goto(`http://127.0.0.1:${port}/dao-khung-long/`);
    const poses = ['hatchling', 'kid', 'teen', 'adult', 'legend', 'eating', 'cheer', 'think'];
    for (const species of ['rex', 'may']) for (const pose of poses) {
      const sprite = species + '-' + pose;
      await gallery.setViewportSize({ width: 1280, height: 1100 });
      await gallery.evaluate(async (sprite) => {
        const root = document.createElement('div');
        root.style.cssText = 'position:relative;z-index:999;background:#edf2f8;padding:16px;color:#14243c;font:16px Arial;';
        root.innerHTML = `<h2>Renderer fixture: ${sprite}</h2><p>Synthetic diagnostic: bare body + 12 earned accessories; no profile unlocks.</p><div id="gallery" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px"></div>`;
        document.body.replaceChildren(root);
        const items = [null].concat(PhuKien.DS.map(d => d.ma));
        for (const item of items) {
          const url = await PhuKien.anhMac(sprite, item, 'assets/img/' + sprite + '.webp', true);
          const cell = document.createElement('div');
          cell.style.cssText = 'height:310px;border-radius:14px;background:white;text-align:center;padding:8px;box-sizing:border-box;';
          const im = new Image(); im.src = url; await im.decode();
          im.style.cssText = 'width:100%;height:275px;object-fit:contain;';
          cell.append(item || 'Bare baseline', im); root.querySelector('#gallery').append(cell);
        }
      }, sprite);
      await gallery.screenshot({ path: path.join(output, `gallery-${sprite}.png`) });
      if (['rex-kid', 'rex-eating', 'rex-hatchling', 'may-kid', 'may-eating'].includes(sprite)) {
        for (const width of [390, 768]) {
          await gallery.setViewportSize({ width, height: 1100 });
          await gallery.evaluate(width => {
            document.documentElement.style.overflow = 'visible'; document.body.style.overflow = 'visible'; document.body.style.height = 'auto';
            document.querySelector('#gallery').style.gridTemplateColumns = `repeat(${width < 500 ? 2 : 3},1fr)`;
          }, width);
          await gallery.screenshot({ path: path.join(output, `gallery-${sprite}-${width}.png`), fullPage: true });
        }
      }
    }
    await gallery.close();
  }, { contextOptions: { serviceWorkers: 'block' }, reducedMotion: 'reduce' });
  assertClean(log, 'DKL audit ' + phase);
}
capture().catch(e => { console.error(e); process.exitCode = 1; });
