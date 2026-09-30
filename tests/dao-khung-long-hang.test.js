'use strict';
/* Đảo Khủng Long: Hang Khủng Long và 12 món đồ của khủng long (không cần trình duyệt).
   - Danh mục PhuKien khớp tên phụ kiện trong dao.js, đủ hình, điểm neo cho mọi hình khủng long mặc được.
   - Hồ sơ cũ (phu_kien là mảng tên) vẫn đọc được; món đang mặc phải là món bé có; chấm "Mới" cho món chưa xem.
   - Phép chỉ ở đúng vùng của món (bộ giáp ở đấu trường, vương miện ở mọi vùng) và không đổi quả mọng, sao, số câu.
   - Thời gian trong hang tính vào giờ chơi (HoSo.giayHang, themGiayHang).
   - Nhật ký 'hang' hợp lệ lược đồ; index.html và sw.js có đủ tệp mới. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadGame } = require('./lib/load.js');
const { validate } = require('./lib/schema-lite.js');

const ROOT = path.resolve(__dirname, '..');
const DKL = path.join(ROOT, 'dao-khung-long');
const SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/du-an-toan-2-3/spec/06-su-kien-v1.schema.json'), 'utf8'));
const FILES = ['js/nhat-ky.js', 'js/ngan-hang.js', 'js/cau-so-sanh.js', 'js/cau-do-luong.js', 'js/cau-tien.js', 'js/cau-thong-ke.js', 'js/cau-hinh-hoc.js', 'js/cau-thoi-gian.js', 'js/hoc-tap.js', 'js/dao.js', 'js/ho-so.js', 'js/van-choi.js', 'js/phu-kien.js', 'js/hang.js'];

function moi() {
  const w = loadGame('dao-khung-long', FILES);
  const dh = { t: Date.UTC(2026, 9, 12, 12, 4, 0), p: 1000 };
  w.NhatKy.caiDongHo({ now: () => dh.t, perf: () => dh.p });
  return { w, NK: w.NhatKy, NH: w.NganHang, DAO: w.Dao, PK: w.PhuKien, HS: w.HoSo };
}
/** Mảng, đối tượng tạo trong vm có prototype khác: chép sang realm của kiểm thử trước khi so. */
const J = (x) => JSON.parse(JSON.stringify(x));
function nkGia() {
  let n = 0;
  return {
    batDauVan: () => 'v', cauHien: () => 'c' + (++n), thaoTac: () => null, goiY: () => null, traLoi: () => null,
    msTrongCau: () => 3000, cauKetThuc: () => null, phanHoiXem: () => null, ketThucVan: () => Promise.resolve([])
  };
}

test('danh mục: 12 món, khớp tên phụ kiện của 10 vùng và 2 đấu trường, đủ hình', () => {
  const { DAO, PK } = moi();
  assert.equal(PK.DS.length, 12);
  const tenDao = [];
  DAO.VUNG.forEach((v) => {
    if (v.phu_kien) tenDao.push([v.phu_kien, v.so]);
    v.man.forEach((m) => { if (m.dau_truong && m.dau_truong.phu_kien) tenDao.push([m.dau_truong.phu_kien, v.so]); });
  });
  assert.equal(tenDao.length, 12);
  tenDao.forEach(([ten, so]) => {
    const d = PK.theoTen(ten);
    assert.ok(d, 'có trong danh mục: ' + ten);
    assert.equal(d.vung, so, ten + ' thuộc vùng ' + so);
  });
  const ma = new Set(PK.DS.map((d) => d.ma));
  assert.equal(ma.size, 12, 'mã không trùng');
  PK.DS.forEach((d) => {
    assert.ok(PK.CHO.includes(d.cho), d.ma + ' có chỗ mặc hợp lệ');
    assert.ok(fs.existsSync(path.join(DKL, 'assets/img', d.anh + '.webp')), 'có hình ' + d.anh);
    assert.ok(d.hat.length >= 2 && d.hieu_ung && d.tieng && d.lam, d.ma + ' có đủ phép');
  });
  ['hop-qua', 'bg-hang'].forEach((f) => assert.ok(fs.existsSync(path.join(DKL, 'assets/img', f + '.webp')), 'có hình ' + f));
});

test('điểm neo: mọi hình khủng long mặc được (Rex, Mây × 5 mức lớn và 3 dáng) có đủ 5 chỗ, số hợp lệ', () => {
  const { DAO, PK } = moi();
  const can = [];
  Object.values(DAO.HINH).forEach((bo) => {
    ['so_sinh', 'nhi', 'thieu_nien', 'truong_thanh', 'huyen_thoai', 'an', 'co_vu', 'goi_y'].forEach((k) => can.push(bo[k]));
    assert.equal(PK.coNeo(bo.trung), false, 'trứng không mặc đồ');
    assert.equal(PK.coNeo(bo.xe), false, 'xe đua không mặc đồ');
  });
  assert.equal(can.length, 16);
  can.forEach((ten) => {
    assert.ok(PK.coNeo(ten), 'có điểm neo: ' + ten);
    assert.ok(PK.coNeo('assets/img/' + ten + '.webp'), 'nhận cả đường dẫn');
    const n = PK.NEO[ten];
    PK.CHO.forEach((cho) => {
      const ds = Array.isArray(n[cho]) ? n[cho] : [n[cho]];
      assert.equal(ds.length, cho === 'chan' ? 2 : 1, ten + ' ' + cho);
      ds.forEach((a) => {
        assert.ok(a.x >= 0 && a.x <= 100 && a.y >= 0 && a.y <= 100, ten + ' ' + cho + ' trong hình');
        assert.ok(a.w > 5 && a.w <= 60, ten + ' ' + cho + ' cỡ vừa');
      });
    });
  });
  Object.keys(PK.NEO).forEach((ten) => assert.ok(fs.existsSync(path.join(DKL, 'assets/img', ten + '.webp')), 'hình có thật: ' + ten));
  // Giày: hai chiếc, chiếc đầu lật gương; mũ đặt đáy lên điểm neo
  const g = PK.viTri('rex-kid', 'giay-dua', 383, 560, 0.9);
  assert.equal(g.length, 2);
  assert.equal(g[0].lat, true);
  assert.equal(g[1].lat, false);
  const m = PK.viTri('rex-kid', 'mao-lua', 383, 560, 1)[0];
  assert.ok(m.y + m.h * 0.88 - m.cy < 1e-9, 'đáy mũ ở điểm neo');
  assert.deepEqual(J(PK.viTri('rex-egg', 'mao-lua', 400, 560, 1)), []);
});

test('hồ sơ: đọc hồ sơ cũ theo tên, món đang mặc phải là món bé có, chấm Mới cho món chưa xem', () => {
  const { PK } = moi();
  const p = { phu_kien: ['Mào Lửa', 'Bộ Giáp Học Kì 1', 'Món lạ'], dang_mac: 'giap-hk1' };
  assert.deepEqual(J(PK.cuaBe(p)), ['mao-lua', 'giap-hk1'], 'theo thứ tự danh mục, bỏ tên lạ');
  assert.equal(PK.dangMac(p), 'giap-hk1');
  assert.equal(PK.dangMac({ phu_kien: ['Mào Lửa'], dang_mac: 'vuong-mien' }), null, 'chưa có thì không mặc được');
  assert.equal(PK.dangMac({ phu_kien: [], dang_mac: 'khong-co' }), null);
  assert.equal(PK.dangMac({}), null, 'hồ sơ rất cũ không có trường nào');
  assert.deepEqual(J(PK.chuaXem(p)), ['mao-lua', 'giap-hk1']);
  p.phu_kien_da_xem = { 'mao-lua': '2026-10-12' };
  assert.deepEqual(J(PK.chuaXem(p)), ['giap-hk1']);
  assert.equal(PK.coMon(p, 'vuong-mien'), false);
});

test('phép: đúng vùng của món, bộ giáp ở hai đấu trường, vương miện ở mọi vùng; câu nói có tên khủng long', () => {
  const { DAO, PK } = moi();
  assert.equal(PK.coPhep('mao-lua', DAO.man('v2-m1')), true);
  assert.equal(PK.coPhep('mao-lua', DAO.man('v1-m1')), false);
  assert.equal(PK.coPhep('mao-lua', DAO.man('dt1')), false);
  assert.equal(PK.coPhep('giap-hk1', DAO.man('dt1')), true);
  assert.equal(PK.coPhep('giap-hk1', DAO.man('dt2')), true);
  assert.equal(PK.coPhep('giap-hk1', DAO.man('v4-m1')), false);
  DAO.VUNG.forEach((v) => v.man.forEach((m) => assert.equal(PK.coPhep('vuong-mien', m), true)));
  assert.equal(PK.coPhep('khong-co', DAO.man('v1-m1')), false);
  assert.match(PK.phepCua('giap-hk1', 'Mây'), /Mây thành Cú Húc Giáp Thép/);
  assert.match(PK.phepCua('giay-dua', 'Rex'), /Đường Đua Có Nhớ/);
  assert.match(PK.phepCua('vuong-mien', 'Rex'), /vùng nào/);
  PK.DS.forEach((d) => assert.doesNotMatch(PK.phepCua(d.ma, 'Rex'), /—/, 'không dùng gạch dài'));
});

test('phép không đổi ván: quả mọng, sao, số câu như nhau khi có khiDung; khiDung chỉ gọi ở câu đúng, lỗi không làm hỏng ván', async () => {
  const { w, NH, DAO } = moi();
  const man = Object.assign({}, DAO.man('v2-m1'), { dang: 'chon_dap_an' });
  async function choi(khiDung) {
    const van = new w.VanChoi({ nk: nkGia(), game: man.game, vung: man.vung, man: man, hatGiong: 5, soCau: 10, khiDung: khiDung });
    van.batDau({});
    let i = 0;
    while (van.conCau()) {
      const q = van.cauTiep();
      if (i++ % 3 === 0) {
        van.traLoi(q.lua_chon.find((x) => NH.nhanBietLoi(q.cau_truc, x.gia_tri).length).gia_tri);
        van.ketThucCauSai();
      } else van.traLoi(q.dap_an);
    }
    const kq = await van.ketThuc(false);
    return { sao: kq.sao, qua: kq.quaMong.tong, dem: JSON.stringify(kq.dem), soXong: van.soXong };
  }
  const goc = await choi(null);
  const goi = [];
  const co = await choi((kq) => goi.push(kq));
  assert.deepEqual(co, goc);
  const dung = JSON.parse(goc.dem);
  assert.equal(goi.length, dung.dungNgay + dung.nhoGoiY + dung.lan2, 'mỗi câu đúng gọi một lần');
  assert.ok(goi.every((k) => k !== 'sai'));
  const loi = await choi(() => { throw new Error('hình chưa tải'); });
  assert.deepEqual(loi, goc, 'phép lỗi thì ván vẫn chạy như thường');
});

test('thời gian trong hang: cộng dồn theo ngày, bỏ số lạ, chỉ giữ 35 ngày', () => {
  const { HS } = moi();
  const p = {};
  assert.equal(HS.giayHang(p, '2026-10-12'), 0);
  HS.themGiayHang(p, '2026-10-12', 95.4);
  HS.themGiayHang(p, '2026-10-12', 30);
  HS.themGiayHang(p, '2026-10-12', -20);
  HS.themGiayHang(p, '2026-10-12', 'abc');
  assert.equal(HS.giayHang(p, '2026-10-12'), 125);
  p.gio_hang['2026-10-11'] = 'x';
  assert.equal(HS.giayHang(p, '2026-10-11'), 0, 'giá trị hỏng coi như 0');
  for (let d = 1; d <= 40; d++) HS.themGiayHang(p, '2026-11-' + String(d).padStart(2, '0'), 10);
  assert.ok(Object.keys(p.gio_hang).length <= 35);
  assert.equal(HS.giayHang(p, '2026-10-12'), 0, 'ngày cũ nhất bị bỏ');
});

test('hang: 10 bạn khủng long, 12 cúp (10 vùng, 2 đấu trường) theo hồ sơ', () => {
  const { w, DAO } = moi();
  const p = {
    trung_vung: { 2: { no: true, ten: 'Lửa Nhỏ', luc: '2026-10-01T08:00:00+07:00' }, 4: { no: false } },
    ky_luc: { 'v1-cup': { sao: 2 } },
    dau_truong_thang: { 11: '2026-10-05T08:00:00+07:00' }
  };
  const ban = w.Hang._dsBan(p);
  assert.equal(ban.length, 10);
  assert.deepEqual(J(ban.filter((b) => b.no).map((b) => b.ten)), ['Lửa Nhỏ']);
  const cup = w.Hang._dsCup(p);
  assert.equal(cup.length, 12);
  assert.equal(cup.filter((c) => c.co).length, 2);
  const c1 = cup.find((c) => c.v.so === 1);
  assert.equal(c1.co, true);
  assert.equal(c1.sao, 2);
  DAO.VUNG.filter((v) => !v.dau_truong).forEach((v) => assert.ok(v.man.some((m) => m.cup), v.ten + ' có màn Cúp'));
  assert.match(w.Hang._viSao(w.PhuKien.theoMa('giap-hk1')), /Tam Giác Vương/);
  assert.match(w.Hang._cachNhan(w.PhuKien.theoMa('thuoc-vang')), /Xưởng Đo Lường.*Giáp Long/);
});

test('nhật ký: sự kiện hang hợp lệ lược đồ, việc lạ bị từ chối', () => {
  const ev = (du) => ({ v: 1, id: '01JB0000000000000000000000', luc: '2026-10-12T19:04:00+07:00', ms: 0, be: 'be_HANG0001', loai: 'hang', game: 'hang-khung-long', du_lieu: du });
  [{ viec: 'vao', mac: null }, { viec: 'roi', giay: 42, mac: 'mao-lua' }, { viec: 'xem_mon', ma: 'giap-hk1' }, { viec: 'mac', ma: 'giap-hk1' }, { viec: 'coi', ma: 'giap-hk1' }, { viec: 'mo_qua', ma: 'vuong-mien' }]
    .forEach((du) => assert.deepEqual(validate(SCHEMA, ev(du)), [], JSON.stringify(du)));
  assert.notDeepEqual(validate(SCHEMA, ev({ viec: 'mua' })), []);
  assert.notDeepEqual(validate(SCHEMA, ev({})), []);
});

test('index.html và sw.js: có màn hang, màn mở quà, nút Hang, tệp js, css và hình mới', () => {
  const html = fs.readFileSync(path.join(DKL, 'index.html'), 'utf8');
  ['id="man-hang"', 'id="man-qua"', 'id="bd-hang"', 'id="bd-hang-moi"', 'js/phu-kien.js', 'js/hang.js', 'css/hang.css'].forEach((x) => assert.ok(html.includes(x), x));
  assert.ok(html.indexOf('js/phu-kien.js') < html.indexOf('js/app.js') && html.indexOf('js/hang.js') < html.indexOf('js/app.js'), 'nạp trước app.js');
  const sw = fs.readFileSync(path.join(DKL, 'sw.js'), 'utf8');
  const { PK } = moi();
  ['js/phu-kien.js', 'js/hang.js', 'css/hang.css', 'assets/img/bg-hang.webp', 'assets/img/hop-qua.webp'].concat(PK.DS.map((d) => 'assets/img/' + d.anh + '.webp'))
    .forEach((x) => assert.ok(sw.includes("'./" + x + "'"), 'sw.js lưu sẵn ' + x));
});
