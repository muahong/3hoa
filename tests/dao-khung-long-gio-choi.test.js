'use strict';
/* Đảo Khủng Long: thời gian chơi và đồng hồ máy (nhóm C của lần rà soát 2026-09-28), không cần trình duyệt.
   - Thời gian của ván là thời gian chơi thật: không tính lúc tạm dừng, lúc app ở nền; đo bằng đồng hồ perf nên chỉnh giờ máy không đổi được.
   - Ván dở vì app bị tắt: thời gian chơi lấy từ dấu mở (không phải từ lúc mở tới lúc tắt).
   - Dọn nhật ký gốc: bé chỉnh ngày của máy sang năm sau thì không dọn mất nhật ký thật; đồng hồ lùi thì không dọn. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./lib/load.js');

const FILES = ['js/nhat-ky.js', 'js/ngan-hang.js', 'js/hoc-tap.js', 'js/dao.js', 'js/van-choi.js'];

function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => { map.set(k, String(v)); }, removeItem: (k) => { map.delete(k); },
    clear: () => map.clear(), key: (i) => Array.from(map.keys())[i] || null, get length() { return map.size; }
  };
}
function moi(opts) {
  const w = loadGame('dao-khung-long', FILES, opts);
  const dh = { t: Date.UTC(2026, 9, 12, 12, 4, 0), p: 1000 };
  w.NhatKy.caiDongHo({ now: () => dh.t, perf: () => dh.p });
  dh.toi = (ms) => { dh.t += ms; dh.p += ms; };
  return { w, dh, NK: w.NhatKy };
}
const an = (w, bi) => {
  w.document.visibilityState = bi ? 'hidden' : 'visible';
  w.document.dispatchEvent({ type: 'visibilitychange' });
};

test('thời gian ván: không tính lúc tạm dừng và lúc app ở nền; chỉnh giờ máy giữa ván không làm sai (đo bằng perf)', async () => {
  const { w, dh, NK } = moi();
  // document giả của bộ nạp không giữ trình nghe: thay bằng một bộ nghe nhỏ để thử visibilitychange
  const nghe = {};
  w.document.addEventListener = (t, f) => { (nghe[t] = nghe[t] || []).push(f); };
  w.document.dispatchEvent = (ev) => { (nghe[ev.type] || []).forEach((f) => f(ev)); return true; };
  await NK.khoiDong({ khongDungIndexedDB: true });
  NK.datBe('be_GIOCHOI001');
  NK.batDauVan({ game: 'dua-xe', vung: 2, man: 'v2-m1' });
  dh.toi(60000); // chơi 1 phút
  NK.tamDung('nut');
  dh.toi(40 * 60000); // ăn tối 40 phút, menu tạm dừng vẫn mở
  NK.tiepTuc('nut');
  dh.toi(30000); // chơi thêm 30 giây
  an(w, true);
  dh.toi(10 * 60000); // app ở nền 10 phút
  an(w, false);
  dh.toi(30000);
  assert.equal(Math.round(NK.msChoi() / 1000), 120, 'chỉ tính 2 phút chơi thật');
  dh.t -= 3 * 3600000; // bé lùi giờ máy 3 tiếng giữa ván: perf không đổi
  const evs = await NK.ketThucVan({ bo_do: false });
  const kt = evs.find((e) => e.loai === 'van_ket_thuc').du_lieu;
  assert.equal(kt.giay, 120, 'giay là thời gian chơi thật');
  assert.ok(kt.giay_tong >= 0, 'giay_tong không âm dù đồng hồ lùi');
});

test('ván dở vì app bị tắt: thời gian chơi lấy từ dấu mở, không tính khoảng từ lúc tắt tới lúc mở lại', async () => {
  const kho = makeStorage();
  const a = moi({ localStorage: kho });
  await a.NK.khoiDong({ khongDungIndexedDB: true });
  a.NK.datBe('be_GIOCHOI002');
  a.NK.batDauVan({ game: 'dua-xe', vung: 2, man: 'v2-m1' });
  a.dh.toi(90000);
  a.NK.ghi('thao_tac', { kieu: 'cham' }); // dấu mở ghi lại sau mỗi sự kiện
  const b = moi({ localStorage: kho });
  b.dh.t = a.dh.t + 5 * 3600000; // mở lại sau 5 tiếng
  await b.NK.khoiDong({ khongDungIndexedDB: true });
  const kt = (await b.NK.docCuaBe('be_GIOCHOI002')).find((e) => e.loai === 'van_ket_thuc').du_lieu;
  assert.equal(kt.giay, 90);
  assert.equal(kt.ly_do, 'dong_app');
});

test('dọn nhật ký: bé chỉnh ngày máy sang năm sau thì không dọn mất nhật ký thật; đồng hồ lùi thì không dọn', async () => {
  const kho = makeStorage();
  const ngay = 86400000;
  const a = moi({ localStorage: kho });
  const goc = a.dh.t;
  a.dh.t = goc - 30 * ngay;
  await a.NK.khoiDong({ khongDungIndexedDB: true });
  a.NK.datBe('be_DONGHO0001');
  a.NK.ghi('thao_tac', { kieu: 'cham', moc: 'cu' });
  a.dh.t = goc;
  a.NK.ghi('thao_tac', { kieu: 'cham', moc: 'moi' });
  await a.NK.xa();
  assert.equal(Number(kho.getItem('dkl-luc-cuoi-v1')), goc, 'ghi mốc lần ghi gần nhất');
  // Lần mở sau: đồng hồ máy bị chỉnh nhảy tới 1 năm sau. Cùng kho sự kiện (a) nhưng đọc mốc lúc khởi động
  a.dh.t = goc + 365 * ngay;
  await a.NK.khoiDong({ khongDungIndexedDB: true });
  assert.equal(await a.NK.donNhatKyCu(), 0, 'mốc dọn tính từ lần ghi gần nhất + 1 ngày: không xóa gì');
  const con = (await a.NK.docCuaBe('be_DONGHO0001')).filter((e) => e.du_lieu && e.du_lieu.moc).length;
  assert.equal(con, 2);
  // Đồng hồ lùi về trước lần ghi gần nhất: không dọn
  kho.setItem('dkl-luc-cuoi-v1', String(goc + 365 * ngay));
  a.dh.t = goc;
  await a.NK.khoiDong({ khongDungIndexedDB: true });
  assert.equal(await a.NK.donNhatKyCu(0), 0);
});
