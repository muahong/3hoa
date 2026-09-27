'use strict';
/* Đảo Khủng Long, giai đoạn 5: cầu nối cho sáu game cũ (js/cau-noi.js).
   Giả lập phía game cũ gọi window.DaoCauNoi như trong iframe: câu hỏi đi qua VanChoi của đảo, mọi sự kiện hợp lệ
   lược đồ v1, câu sai hẳn qua màn phản hồi của đảo rồi quay lại sau 2 câu, kết thúc về app. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadGame, ROOT } = require('./lib/load.js');
const { validate } = require('./lib/schema-lite.js');

const FILES = ['js/nhat-ky.js', 'js/ngan-hang.js', 'js/cau-so-sanh.js', 'js/cau-do-luong.js', 'js/cau-tien.js', 'js/cau-thong-ke.js', 'js/cau-hinh-hoc.js',
  'js/cau-thoi-gian.js', 'js/hoc-tap.js', 'js/dao.js', 'js/ho-so.js', 'js/van-choi.js', 'js/am-thanh.js', 'js/phan-hoi.js', 'js/cau-noi.js'];
const J = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/du-an-toan-2-3/spec/06-su-kien-v1.schema.json'), 'utf8'));

async function moi() {
  const w = loadGame('dao-khung-long', FILES);
  const dh = { t: Date.UTC(2026, 9, 12, 12, 4, 0), p: 1000 };
  w.NhatKy.caiDongHo({ now: () => dh.t, perf: () => dh.p });
  w.performance = { now: () => dh.p };
  dh.toi = (ms) => { dh.t += ms; dh.p += ms; };
  await w.NhatKy.khoiDong({ khongDungIndexedDB: true });
  w.NhatKy.datBe('be_CAUNOI01');
  return { w, dh, NK: w.NhatKy, NH: w.NganHang, DAO: w.Dao };
}

function moGame(ctx, manId) {
  const m = ctx.DAO.man(manId);
  const van = new ctx.w.VanChoi({ nk: ctx.NK, game: m.game, vung: m.vung, man: m, nguon: 'tu_chon', hatGiong: 42, soCau: 4 });
  const ketQua = {};
  ctx.w.DaoTroChoi[m.game].batDau({
    van, man: m, tenBe: 'An', tenKhungLong: 'Rex', phongCach: 'dung_manh', hinhBe: 'assets/img/rex-kid.webp', hinhCoVu: 'assets/img/rex-cheer.webp', hinhGoiY: 'assets/img/rex-think.webp',
    onXong: (kq) => { ketQua.xong = kq; }, onThoat: (kq) => { ketQua.thoat = kq; }
  });
  return { van, m, ketQua };
}

test('cầu nối: đăng ký đủ sáu game cũ, mở iframe đúng thư mục và mã màn', async () => {
  const ctx = await moi();
  for (const g of Object.keys(ctx.DAO.THU_MUC_GAME_CU)) {
    assert.ok(ctx.w.DaoTroChoi[g], g);
    assert.equal(ctx.w.DaoTroChoi[g].khung, false);
    assert.equal(ctx.w.DaoTroChoi[g].man, 'man-game-cu');
  }
  const { m } = moGame(ctx, 'v1-m4');
  const api = ctx.w.DaoCauNoi;
  assert.ok(api && api.phien_ban === 1);
  const tt = J(api.sanSang());
  assert.equal(tt.game, 'cuoi-ho');
  assert.equal(tt.man.id, m.id);
  assert.equal(tt.be.ten, 'An');
});

test('cầu nối: một ván qua game cũ ghi đủ chuỗi sự kiện, câu sai quay lại, kết thúc gọi onXong', async () => {
  const ctx = await moi();
  const { van, ketQua } = moGame(ctx, 'v1-m5');
  const api = ctx.w.DaoCauNoi;
  api.sanSang();
  api.batDau({ toc_do: 1 });
  const c1 = J(api.cauTiep({ so_lua_chon: 3, vi_tri: ['trai', 'giua', 'phai'] }));
  assert.equal(c1.lua_chon.length, 3);
  assert.equal(c1.lua_chon.filter((x) => x.dung).length, 1);
  assert.deepEqual(c1.lua_chon.map((x) => x.vi_tri), ['trai', 'giua', 'phai']);
  assert.throws(() => api.cauTiep({}), /chưa kết thúc/);
  const sai = c1.lua_chon.find((x) => !x.dung);
  api.thaoTac('vuot', { doi_tuong: 'qua', gia_tri: sai.gia_tri, vi_tri: sai.vi_tri });
  const kq = J(api.traLoi(sai.gia_tri, { vi_tri: sai.vi_tri }));
  assert.equal(kq.dung, false);
  assert.equal(kq.can_phan_hoi, true);
  assert.ok(kq.loi_noi);
  const hua = api.phanHoi(sai.gia_tri, kq);
  // bé nhìn lời giải 4 giây rồi bấm Chơi tiếp trên màn phản hồi của đảo
  assert.equal(ctx.w.CauNoi._trangThai().phMo, true);
  ctx.dh.toi(4000);
  ctx.w.CauNoi._dongPhanHoi('choi_tiep');
  assert.equal(await hua, true);
  let soCau = 1;
  let c;
  const maSai = c1.ma_cau;
  let gapLai = false;
  while ((c = J(api.cauTiep({ so_lua_chon: 4 })))) {
    soCau++;
    if (c.ma_cau === maSai) { gapLai = true; assert.equal(c.on_lai, true); }
    assert.ok(c.lua_chon.length >= 2 && c.lua_chon.length <= 4);
    const d = c.lua_chon.find((x) => x.dung);
    api.thaoTac('vuot', { gia_tri: d.gia_tri });
    const k = J(api.traLoi(d.gia_tri, {}));
    assert.equal(k.dung, true);
    ctx.dh.toi(2000);
  }
  assert.ok(gapLai, 'câu sai phải quay lại trong ván');
  assert.equal(soCau, 5);
  await api.ketThuc({ diem: 900, dong_phu: 'Chém được 5 quả' });
  assert.ok(ketQua.xong, 'onXong được gọi');
  assert.equal(ketQua.xong.dongPhu, 'Chém được 5 quả');
  assert.equal(ctx.w.DaoCauNoi, null, 'dọn cầu nối sau khi xong');
  const evs = await ctx.NK.docCuaBe('be_CAUNOI01');
  const loi = [];
  evs.forEach((e, i) => validate(SCHEMA, e).forEach((m) => loi.push('#' + i + ' ' + e.loai + ' ' + m)));
  assert.deepEqual(loi, []);
  const loai = evs.map((e) => e.loai);
  assert.equal(loai.filter((x) => x === 'cau_hien').length, 5);
  assert.equal(loai.filter((x) => x === 'phan_hoi_xem').length, 1);
  assert.ok(evs.filter((e) => e.loai === 'cau_hien').every((e) => e.game === 'chem-trai-cay' && e.man === 'v1-m5'));
  const kt = evs.find((e) => e.loai === 'van_ket_thuc');
  assert.equal(kt.du_lieu.bo_do, false);
  assert.equal(kt.du_lieu.diem, 900);
});

test('cầu nối: dạng nhập số không có lựa chọn, thử lại lần 2; hết giờ đóng câu và câu quay lại; về đảo là bỏ dở', async () => {
  const ctx = await moi();
  const { ketQua } = moGame(ctx, 'v4-m8');
  const api = ctx.w.DaoCauNoi;
  api.sanSang();
  const c = J(api.cauTiep({}));
  assert.equal(c.dang, 'nhap_so');
  assert.equal(c.lua_chon.length, 0);
  const k1 = J(api.traLoi(c.dap_an + 10, {}));
  assert.equal(k1.thu_lai, true);
  const k2 = J(api.traLoi(c.dap_an, {}));
  assert.equal(k2.dung, true);
  assert.equal(k2.ket_qua, 'dung_lan_2');
  const c2 = J(api.cauTiep({}));
  assert.equal(J(api.hetGio()).ket_qua, 'het_gio');
  api.cauTiep({}); api.traLoi(-1, {}); api.traLoi(-1, {});
  await api.veDao({ diem: 10 });
  assert.ok(ketQua.thoat);
  const evs = await ctx.NK.docCuaBe('be_CAUNOI01');
  const hg = evs.find((e) => e.loai === 'cau_ket_thuc' && e.du_lieu.ket_qua === 'het_gio');
  assert.ok(hg && hg.du_lieu.se_on_lai_sau_cau === 2, 'câu hết giờ quay lại sau 2 câu');
  assert.equal(evs.find((e) => e.loai === 'cau_hien' && e.cau === hg.cau).du_lieu.ma_cau, c2.ma_cau);
  const kt = evs.find((e) => e.loai === 'van_ket_thuc');
  assert.equal(kt.du_lieu.bo_do, true);
});

test('cầu nối: game xin ít lựa chọn hơn vẫn luôn giữ đáp án đúng', async () => {
  const ctx = await moi();
  moGame(ctx, 'v1-m5');
  const api = ctx.w.DaoCauNoi;
  api.sanSang();
  let c;
  let n = 0;
  while ((c = J(api.cauTiep({ so_lua_chon: 2 })))) {
    n++;
    assert.equal(c.lua_chon.length, 2);
    assert.equal(c.lua_chon.filter((x) => x.dung).length, 1, c.de);
    api.traLoi(c.lua_chon.find((x) => x.dung).gia_tri, {});
  }
  assert.ok(n >= 4);
});
