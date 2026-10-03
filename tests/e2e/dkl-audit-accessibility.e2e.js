'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { withGame, assertClean } = require('./lib/browser.js');
const out = path.resolve(__dirname, '../../out/dkl-audit/accessibility');
fs.mkdirSync(out, { recursive: true });
async function main() {
  const evidence = {};
  const log = await withGame('dao-khung-long', async ({ page }) => {
    await page.waitForFunction(() => __DKL && document.querySelector('#man-tai').classList.contains('hidden'));
    await page.evaluate(async () => {
      const p = await HoSo.taoMoi({ ten: 'Kiểm thử tiếp cận', tuoi: 8, lop: 2 });
      await __DKL.chonBe(p.id); __DKL.vaoDao();
      __DKL.vaoMan(Dao.man('v2-m1'), 'ban_do', null, 4);
    });
    await page.waitForFunction(() => !document.querySelector('#dx-choices').classList.contains('hidden'));
    const labels = await page.locator('#dx-choices button').allTextContents();
    assert.ok(labels.every((x, i) => x.startsWith(['Làn trái:', 'Làn giữa:', 'Làn phải:'][i])));
    fs.writeFileSync(path.join(out, 'race-controls-aria.txt'), await page.locator('#dx-choices').ariaSnapshot());
    await page.locator('#dx-tam-dung').focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement.closest('#dx-tam'));
    const pauseFocus = await page.evaluate(() => document.activeElement.id);
    await page.keyboard.press('Shift+Tab');
    assert.ok(await page.evaluate(() => !!document.activeElement.closest('#dx-tam')));
    await page.locator('#dx-tiep').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'dx-tam-dung');
    await page.locator('#dx-tam-dung').click();
    // Mock voice availability only; these checks do not claim audible output.
    await page.evaluate(() => {
      window.__voiceFixture = [];
      Object.defineProperty(speechSynthesis, 'getVoices', { configurable: true, value: () => __voiceFixture });
      speechSynthesis.dispatchEvent(new Event('voiceschanged'));
    });
    assert.match(await page.locator('#dx-giong').textContent(), /Đang tải/);
    assert.ok(await page.locator('#dx-giong').isDisabled());
    await page.evaluate(() => { __voiceFixture.push({ lang: 'en-US' }); speechSynthesis.dispatchEvent(new Event('voiceschanged')); });
    assert.match(await page.locator('#dx-giong').textContent(), /Chưa có giọng Việt/);
    await page.evaluate(() => { __voiceFixture.push({ lang: 'vi-VN', localService: true }); speechSynthesis.dispatchEvent(new Event('voiceschanged')); });
    assert.equal(await page.locator('#dx-giong').isDisabled(), false);
    assert.match(await page.locator('#dx-giong').textContent(), /Giọng đọc: Bật/);
    await page.locator('#dx-giong').click(); assert.match(await page.locator('#dx-giong').textContent(), /Tắt/);
    await page.locator('#dx-giong').click();
    const speechEvents = await page.evaluate(() => {
      let errors = 0;
      window.addEventListener('dkl-doc-loi', () => errors++);
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: function (text) { this.text = text; } });
      for (const error of ['canceled', 'interrupted', 'audio-busy']) {
        Object.defineProperty(speechSynthesis, 'speak', { configurable: true, value: u => u.onerror({ error }) });
        AmThanh.doc('Kiểm thử sự kiện giọng đọc');
      }
      return errors;
    });
    assert.equal(speechEvents, 1, 'normal cancellation is silent; actual audio failure is announced');
    await page.evaluate(() => {
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: function (text) { this.text = text; } });
      Object.defineProperty(speechSynthesis, 'speak', { configurable: true, value: () => { throw Error('synthetic speech failure'); } });
      AmThanh.doc('Con đọc phần chữ nhé');
    });
    assert.match(await page.locator('#thong-bao').textContent(), /Chưa đọc được/);
    await page.screenshot({ path: path.join(out, 'speech-error.png') });
    evidence.voice = 'Loading → English-only → Vietnamese availability; UI refresh, preference toggle, synchronous and async speech failure; normal cancellation ignored';
    evidence.focus = 'Pause focus starts at ' + pauseFocus + ', traps Tab, and restores its activating button';
    evidence.stars = await page.evaluate(() => {
      return [0, 1, 2, 3].map(n => {
        const el = document.createElement('div'); TiepCan.sao(el, n);
        const rendered = el.querySelectorAll('i.co').length;
        if (rendered !== n || el.getAttribute('aria-label') !== n + ' trên 3 sao' || el.querySelectorAll('i[aria-hidden="true"]').length !== 3) throw Error('star semantic mismatch');
        return { earned: n, label: el.getAttribute('aria-label'), rendered };
      });
    });
    // A visible reply modal above an iframe makes the iframe inert and restores focus to it.
    await page.evaluate(() => {
      DuaXe.dung();
      document.querySelectorAll('.man').forEach(el => el.classList.toggle('hidden', el.id !== 'man-game-cu'));
      const host = document.querySelector('#man-game-cu');
      host.innerHTML = '<iframe id="audit-frame" title="Trò chơi thử nghiệm" src="about:blank"></iframe><div class="lop-phu hidden" role="dialog" aria-label="Lời giải thử nghiệm" id="audit-dialog"><button id="audit-close">Chơi tiếp</button></div>';
      document.querySelector('#audit-frame').focus();
      document.querySelector('#audit-dialog').classList.remove('hidden');
    });
    await page.waitForFunction(() => document.activeElement.id === 'audit-close');
    assert.ok(await page.evaluate(() => document.querySelector('#audit-frame').inert));
    await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.id), 'audit-close');
    await page.evaluate(() => document.querySelector('#audit-dialog').classList.add('hidden'));
    await page.waitForFunction(() => document.activeElement.id === 'audit-frame');
    evidence.iframeFocus = 'Synthetic host fixture: iframe inert during reply modal; focus restored to iframe';
    fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify(evidence, null, 2));
  }, { contextOptions: { serviceWorkers: 'block' }, reducedMotion: 'reduce' });
  assertClean(log, 'DKL accessibility'); console.log(JSON.stringify(evidence));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
