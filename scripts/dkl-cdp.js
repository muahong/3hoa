/* Chơi thử Đảo Khủng Long (hoặc bất kỳ trang nào) bằng Chrome headless qua giao thức DevTools, không cần Playwright.
   Mỗi lần chạy dùng một hồ sơ Chrome mới (không service worker cũ, IndexedDB trống).

   Dùng (Node 22, từ gốc repo, cần một máy chủ tĩnh ở gốc repo, ví dụ: python -m http.server 8788 --bind 127.0.0.1):
     node scripts/dkl-cdp.js --kich-ban <tệp.js> [--url http://127.0.0.1:8788/dao-khung-long/] [--out <thư mục ảnh>]
                             [--cong 9333] [--rong 1024] [--cao 768]

   Tệp kịch bản: module.exports = async function (t) { ... } với t gồm:
     t.eval(bieuThuc)          chạy trong trang (chờ Promise), trả về giá trị JSON
     t.cho(ms)                 chờ
     t.choDen(bieuThuc, ms)    chờ tới khi biểu thức đúng (mặc định tối đa 8 giây)
     t.cham(x, y)              chạm (chuột) tại tọa độ màn hình
     t.chamVao(selector)       chạm giữa phần tử (lỗi nếu không thấy hoặc bị ẩn)
     t.keo(x1, y1, x2, y2)     kéo thả bằng chuột
     t.phim(key)               nhấn một phím (ví dụ 'Enter', '5')
     t.anh(ten)                chụp màn hình vào <out>/<ten>.png
     t.loi                     mảng lỗi console và lỗi JS chưa bắt
     t.log(...)                in ra
   Hàm tiện cho Đảo Khủng Long: t.taoBe({ ten, tuoi, lop, phong_cach, bai_dang_hoc }) tạo hồ sơ, chọn bé rồi vào bản đồ.
*/
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const args = {};
for (let i = 2; i < process.argv.length; i += 2) args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const CONG = +(args.cong || 9333);
const URL0 = args.url || 'http://127.0.0.1:8788/dao-khung-long/';
const OUT = path.resolve(args.out || path.join(os.tmpdir(), 'dkl-cdp'));
const W = +(args.rong || 1024), H = +(args.cao || 768);
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!args['kich-ban']) { console.error('Thiếu --kich-ban'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const cho = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const hoSo = fs.mkdtempSync(path.join(os.tmpdir(), 'dkl-chrome-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + CONG, '--user-data-dir=' + hoSo, '--no-first-run', '--no-default-browser-check',
    '--window-size=' + W + ',' + H, '--autoplay-policy=no-user-gesture-required', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  let dong = false;
  const ketThuc = (ma) => {
    if (dong) return; dong = true;
    try { chrome.kill(); } catch (e) { /* bỏ qua */ }
    setTimeout(() => { try { fs.rmSync(hoSo, { recursive: true, force: true }); } catch (e) { /* bỏ qua */ } process.exit(ma); }, 400);
  };
  let tab = null;
  for (let i = 0; i < 160 && !tab; i++) {
    await cho(250);
    try {
      const ds = await (await fetch('http://127.0.0.1:' + CONG + '/json/list')).json();
      tab = ds.find((x) => x.type === 'page');
    } catch (e) { /* Chrome chưa sẵn sàng */ }
  }
  if (!tab) { console.error('Không mở được Chrome ở cổng ' + CONG); ketThuc(1); return; }
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((ok, loi) => { ws.onopen = ok; ws.onerror = loi; });
  let id = 0;
  const choTraLoi = new Map();
  const loi = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && choTraLoi.has(d.id)) { const f = choTraLoi.get(d.id); choTraLoi.delete(d.id); d.error ? f.loi(new Error(JSON.stringify(d.error))) : f.ok(d.result); return; }
    if (d.method === 'Runtime.exceptionThrown') loi.push('JS: ' + (d.params.exceptionDetails.exception ? d.params.exceptionDetails.exception.description : d.params.exceptionDetails.text));
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') loi.push('console: ' + d.params.args.map((a) => a.value || a.description || '').join(' '));
    if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error' && !/fonts\.g/.test(d.params.entry.url || '')) loi.push('log: ' + d.params.entry.text + ' ' + (d.params.entry.url || ''));
  };
  const gui = (method, params) => new Promise((ok, loiF) => { const i = ++id; choTraLoi.set(i, { ok: ok, loi: loiF }); ws.send(JSON.stringify({ id: i, method: method, params: params || {} })); });
  await gui('Runtime.enable'); await gui('Log.enable'); await gui('Page.enable');
  await gui('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await gui('Page.navigate', { url: URL0 });
  await cho(1500);

  const t = {
    loi: loi,
    log: (...a) => console.log(...a),
    cho: cho,
    async eval(expr) {
      const r = await gui('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error('eval lỗi: ' + (r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text) + '\n  ' + expr.slice(0, 200));
      return r.result.value;
    },
    async choDen(expr, ms) {
      const het = Date.now() + (ms || 8000);
      for (;;) { if (await t.eval('!!(' + expr + ')')) return true; if (Date.now() > het) throw new Error('Hết giờ chờ: ' + expr); await cho(120); }
    },
    async cham(x, y) {
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await gui('Input.dispatchMouseEvent', { type: type, x: x, y: y, button: 'left', clickCount: 1, pointerType: 'mouse' });
      await cho(60);
    },
    async chamVao(sel) {
      const r = await t.eval('(function(){var e=document.querySelector(' + JSON.stringify(sel) + ');if(!e)return null;var b=e.getBoundingClientRect();if(!b.width||!b.height)return null;return {x:b.left+b.width/2,y:b.top+b.height/2};})()');
      if (!r) throw new Error('Không thấy phần tử để chạm: ' + sel);
      await t.cham(r.x, r.y);
    },
    async keo(x1, y1, x2, y2, buoc) {
      buoc = buoc || 12;
      await gui('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1, y: y1 });
      await gui('Input.dispatchMouseEvent', { type: 'mousePressed', x: x1, y: y1, button: 'left', clickCount: 1 });
      for (let i = 1; i <= buoc; i++) { await gui('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1 + (x2 - x1) * i / buoc, y: y1 + (y2 - y1) * i / buoc, button: 'left', buttons: 1 }); await cho(16); }
      await gui('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x2, y: y2, button: 'left', clickCount: 1 });
      await cho(60);
    },
    async phim(key) {
      await gui('Input.dispatchKeyEvent', { type: 'keyDown', key: key, text: key.length === 1 ? key : undefined });
      await gui('Input.dispatchKeyEvent', { type: 'keyUp', key: key });
      await cho(40);
    },
    async anh(ten) {
      const r = await gui('Page.captureScreenshot', { format: 'png' });
      const f = path.join(OUT, ten + '.png');
      fs.writeFileSync(f, Buffer.from(r.data, 'base64'));
      console.log('Ảnh: ' + f);
      return f;
    },
    async taoBe(o) {
      o = Object.assign({ ten: 'An', tuoi: 7, lop: 2, phong_cach: 'dung_manh', bai_dang_hoc: 75 }, o || {});
      await t.choDen('window.HoSo && window.__DKL && window.NhatKy && window.NhatKy.kho && __DKL.A.man');
      return t.eval('(async function(){var p=await HoSo.taoMoi(' + JSON.stringify({ ten: o.ten, tuoi: o.tuoi, lop: o.lop, lop_nguon: 'tu_chon', phong_cach: o.phong_cach }) + ');' +
        'p.bai_dang_hoc=' + o.bai_dang_hoc + ';p.khung_long.muc="nhi";p.van_xong=1;await HoSo.luu(p);__DKL.A.dsBe.push(p);await __DKL.chonBe(p.id);return p.id;})()');
    }
  };
  let ma = 0;
  try {
    const kb = require(path.resolve(args['kich-ban']));
    await kb(t);
  } catch (e) {
    console.error('Kịch bản lỗi:', e && e.stack || e);
    ma = 1;
  }
  if (loi.length) { console.log('Lỗi trong trang (' + loi.length + '):'); loi.forEach((x) => console.log('  ' + x)); }
  else console.log('Không có lỗi JS trong trang.');
  ws.close();
  ketThuc(ma);
}
main();
