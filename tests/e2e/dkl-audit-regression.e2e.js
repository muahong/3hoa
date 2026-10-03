'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { withGame, assertClean } = require('./lib/browser.js');
const out = path.resolve(__dirname, '../../out/dkl-audit/regression');
fs.mkdirSync(out, { recursive: true });
async function fixture(page) {
  await page.waitForFunction(() => window.__DKL && document.querySelector('#man-tai').classList.contains('hidden'));
  await page.evaluate(async () => {
    const p = await HoSo.taoMoi({ ten: 'Hồ sơ thử nghiệm', tuoi: 7, lop: 2 });
    p.huong_dan = { da_mo: true }; await HoSo.luu(p); await __DKL.chonBe(p.id); __DKL.vaoDao();
    const Original = window.VanChoi;
    window.VanChoi = function (options) { const v = new Original(Object.assign({}, options, { hatGiong: 7 })); window.__auditVan = v; return v; };
    window.VanChoi.prototype = Original.prototype;
  });
}
async function main() {
  const results = {};
  const log = await withGame('dao-khung-long', async ({ page }) => {
    await fixture(page);
    // All six original semester-one destinations remain available through the named mobile route.
    for (const width of [360, 390, 414]) {
      await page.setViewportSize({ width, height: 844 });
      for (let n = 1; n <= 6; n++) {
        const button = page.locator(`#bd-list [data-vung="${n}"]`);
        await button.scrollIntoViewIfNeeded();
        await button.click(); await page.waitForFunction(() => __DKL.A.man === 'man-vung');
        assert.equal(await page.evaluate(() => __DKL.A.vungDangXem), n);
        await page.evaluate(() => __DKL.vaoDao());
      }
      assert.equal(await page.evaluate(() => document.querySelector('#man-ban-do').scrollWidth), width);
    }
    results.mobileDestinations = '18/18 named region activations at 360/390/414';
    // Text and the dinosaur own distinct layout rows even with long copy and enlarged fonts.
    await page.locator('#bd-hang').click();
    for (const width of [360, 390, 414, 768]) for (const scale of [1, 1.25, 1.5]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(scale => {
        document.querySelector('#hk-noi').textContent = 'Chào bạn nhỏ có tên thật dài! Khủng long đang chờ con mang những món đồ yêu thích và cùng học thêm nhiều điều mới hôm nay.';
        document.querySelector('.hk-ten').style.fontSize = (21 * scale) + 'px';
        document.querySelector('#hk-noi').style.fontSize = (17 * scale) + 'px';
      }, scale);
      assert.ok(await page.evaluate(() => document.querySelector('#hk-noi').getBoundingClientRect().bottom <= document.querySelector('.hk-canh').getBoundingClientRect().top));
      await page.screenshot({ path: path.join(out, `cave-long-${width}-${scale}.png`) });
    }
    await page.locator('#hk-quay').click();
    results.caveLongText = '12 layouts without text/scene overlap';
    await page.setViewportSize({ width: 1280, height: 900 });
    // Real Xếp Hình Số controls; one incorrect submission and a hint, then finish all ten.
    await page.evaluate(() => __DKL.vaoMan(Dao.man('v1-m1'), 'ban_do', null, 10));
    await page.waitForFunction(() => XepHinhSo._trangThai() && XepHinhSo._trangThai().q);
    async function build(value) {
      const target = { tram: Math.floor(value / 100), chuc: Math.floor(value % 100 / 10), dv: value % 10 };
      const current = await page.evaluate(() => XepHinhSo._trangThai().dem);
      for (const slot of ['tram', 'chuc', 'dv']) {
        const diff = target[slot] - current[slot];
        for (let i = 0; i < Math.abs(diff); i++) await page.locator(`[data-${diff > 0 ? 'tha' : 'bot'}="${slot}"]`).click();
      }
    }
    for (let i = 0; i < 10; i++) {
      const q = await page.evaluate(() => ({ answer: __auditVan.q.dap_an, id: __auditVan.q.cau }));
      if (i === 0) {
        await build(q.answer === 1 ? 2 : q.answer - 1); await page.locator('#xh-xong').click();
        await page.locator('#kc-goi-y').click();
      }
      await build(q.answer); await page.locator('#xh-xong').click();
      if (i < 9) await page.waitForFunction(id => __auditVan.q.cau !== id, q.id);
    }
    await page.waitForFunction(() => __DKL.A.man === 'man-ket-thuc');
    assert.equal(await page.locator('#kt-sua').textContent(), '1');
    assert.match(await page.locator('#kt-sua-phu').textContent(), /1 sửa ngay.*0 câu quay lại/);
    assert.match(await page.locator('#kt-qua').textContent(), /28/);
    assert.match(await page.locator('#kt-ky-luc').textContent(), /940/);
    await page.screenshot({ path: path.join(out, 'same-turn-result.png') });
    const profile = await page.evaluate(() => ({ id: __DKL.A.hoSo.id, berries: __DKL.A.hoSo.khung_long.qua_mong, rounds: __DKL.A.hoSo.van_xong }));
    await page.reload(); await page.waitForFunction(() => __DKL && document.querySelector('#man-tai').classList.contains('hidden'));
    const saved = await page.evaluate(id => HoSo.lay(id), profile.id);
    assert.equal(saved.khung_long.qua_mong, profile.berries); assert.equal(saved.van_xong, 1);
    await page.evaluate(async id => { await __DKL.chonBe(id); __DKL.vaoDao(); }, profile.id);
    results.sameTurn = '940 points, 28 berries, one correction, reload kept completed progress';
    // Use deterministic questions without changing the learning thresholds.
    await page.evaluate(() => {
      const Original = window.VanChoi;
      window.VanChoi = function (options) { const v = new Original(Object.assign({}, options, { hatGiong: 7 })); window.__auditVan = v; return v; };
      const m = Object.assign({}, Dao.man('v2-m1'));
      __DKL.vaoMan(m, 'ban_do', null, 12);
    });
    await page.waitForFunction(() => document.querySelectorAll('#dx-choices button:not(:disabled)').length === 3 && !document.querySelector('#dx-choices').classList.contains('hidden'));
    await page.locator('#dx-tam-dung').click();
    await page.waitForFunction(() => document.activeElement.closest('#dx-tam'));
    assert.match(await page.locator('#dx-giong').textContent(), /Chưa có giọng Việt|Đang tải giọng Việt/);
    assert.equal(await page.locator('#dx-giong').isDisabled(), true);
    // Focus cycles within Pause; it returns to the activating control after closing.
    for (let i = 0; i < 9; i++) { await page.keyboard.press('Tab'); assert.ok(await page.evaluate(() => !!document.activeElement.closest('#dx-tam'))); }
    await page.locator('#dx-tiep').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'dx-tam-dung');
    await page.screenshot({ path: path.join(out, 'race-semantic-controls.png') });
    let handled = null, incorrect = 0;
    while (await page.evaluate(() => __DKL.A.man !== 'man-ket-thuc')) {
      await page.waitForFunction(id => __DKL.A.man === 'man-ket-thuc' || (!document.querySelector('#dx-phan-hoi').classList.contains('hidden')) || (__auditVan.q && !__auditVan.q.xong && __auditVan.q.cau !== id && !document.querySelector('#dx-choices').classList.contains('hidden')), handled);
      if (await page.evaluate(() => __DKL.A.man === 'man-ket-thuc')) break;
      if (await page.locator('#dx-phan-hoi').isVisible()) { await page.locator('#dx-ph-tiep').focus(); await page.keyboard.press('Enter'); continue; }
      const q = await page.evaluate(() => ({ id: __auditVan.q.cau, correct: __auditVan.q.lua_chon.findIndex(x => x.gia_tri === __auditVan.q.dap_an) }));
      handled = q.id;
      const lane = incorrect++ < 2 ? (q.correct + 1) % 3 : q.correct;
      await page.locator(`#dx-choices [data-lane="${lane}"]`).focus(); await page.keyboard.press('Enter');
      assert.equal(await page.locator(`#dx-choices [data-lane="${lane}"]`).getAttribute('aria-pressed'), 'true');
      await page.locator('#dx-lao').focus(); await page.keyboard.press('Enter');
    }
    assert.equal(await page.locator('#kt-sua').textContent(), '2');
    assert.match(await page.locator('#kt-sua-phu').textContent(), /0 sửa ngay.*2 câu quay lại/);
    assert.match(await page.locator('#kt-qua').textContent(), /40/);
    assert.equal(await page.locator('#kt-sao').getAttribute('aria-label'), '2 trên 3 sao');
    assert.equal(await page.locator('#kt-sao i.co').count(), 2);
    await page.screenshot({ path: path.join(out, 'race-result.png') });
    fs.writeFileSync(path.join(out, 'result-aria.txt'), await page.locator('#kt-sao').ariaSnapshot());
    results.race = 'Keyboard completed 12+2 questions; two corrections, 40 berries, numeric 2/3 stars, pause focus preserved';
    // Exact pixel checks for hidden footwear and stable canvas sizes across all 208 fixture cells.
    results.renderer = await page.evaluate(async () => {
      async function pixels(sprite, item) {
        const url = await PhuKien.anhMac(sprite, item, 'assets/img/' + sprite + '.webp', true);
        const im = new Image(); im.src = url; await im.decode(); const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight;
        const ctx = cv.getContext('2d'); ctx.drawImage(im, 0, 0); return { w: cv.width, h: cv.height, data: ctx.getImageData(0, 0, cv.width, cv.height).data };
      }
      let checked = 0;
      for (const species of ['rex', 'may']) for (const pose of ['hatchling','kid','teen','adult','legend','eating','cheer','think']) {
        const sprite = species + '-' + pose, bare = await pixels(sprite, null);
        for (const item of PhuKien.DS) {
          const dressed = await pixels(sprite, item.ma);
          if (bare.w !== dressed.w || bare.h !== dressed.h) throw Error('body frame changed: ' + sprite + '/' + item.ma);
          if ((pose === 'hatchling' && item.cho === 'chan') || (pose === 'eating' && item.cho === 'tay')) {
            if (bare.data.some((value, i) => value !== dressed.data[i])) throw Error('hidden slot changed pixels: ' + sprite + '/' + item.ma);
          }
          checked++;
        }
      }
      return { combinations: checked, hiddenSlots: 'identical pixels', frames: 'identical dimensions' };
    });
    fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify(results, null, 2));
  }, { viewport: { width: 1280, height: 900 }, contextOptions: { serviceWorkers: 'block' }, reducedMotion: 'reduce' });
  assertClean(log, 'DKL audit regression'); console.log(JSON.stringify(results));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
