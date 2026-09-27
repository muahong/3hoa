'use strict';
/* Đảo Khủng Long: trang Cách chơi, thẻ cách chơi của từng trò, bước tiếp theo sau mỗi màn (không cần trình duyệt).
   - HocTap.tienDoThuoc nói đúng điều bé còn thiếu, khớp với mức Đã thuộc mà mucKyNang tính ra.
   - Dao.buocTiep: đủ phút → nghỉ; nhiệm vụ còn lại chơi lần lượt; 1 sao thì chơi lại; cúp vừa mở; màn chưa chơi cùng vùng,
     rồi vùng khác theo thứ tự bài SGK (không vượt bài đang học quá 3 bài); đấu trường; lấy thêm sao; về đảo.
   - Mọi thể loại có cách chơi, mọi chế độ màn dùng có bước riêng; 10 chương dựng được cho bé mới và bé đã chơi nhiều;
     con số trong trang (quả mọng, mức lớn, điều kiện Đã thuộc) đọc từ luật thật; không có dấu gạch dài. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadGame } = require('./lib/load.js');
/** Giá trị từ vm (khác realm) về JSON thuần để so sánh sâu. */
const J = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));

const FILES = ['js/nhat-ky.js', 'js/ngan-hang.js', 'js/cau-so-sanh.js', 'js/cau-do-luong.js', 'js/cau-tien.js', 'js/cau-thong-ke.js', 'js/cau-hinh-hoc.js',
  'js/cau-thoi-gian.js', 'js/hoc-tap.js', 'js/dao.js', 'js/ho-so.js', 'js/phan-hoi.js', 'js/huong-dan.js'];

function moi() {
  const w = loadGame('dao-khung-long', FILES);
  return { w, DAO: w.Dao, HT: w.HocTap, HD: w.HuongDan };
}

/** Tóm tắt câu tối giản cho mucKyNang, tienDoThuoc. */
function cau(i, ngay, ketQua, goiY) {
  return { cau: 'c' + i, ma_cau: '2.8|cong-qua-10|' + i, ky_nang: 'cong-qua-10', noi_dung: '2.8', ngay: ngay, luc: ngay + 'T10:' + String(i % 60).padStart(2, '0') + ':00',
    ket_qua: ketQua || 'dung_ngay', goi_y_cap: goiY || 0, loi: ketQua === 'sai' ? ['quen-nho'] : [], cac_tra_loi: [], dap_an: 1, giay: 4 };
}

function hoSo(them) {
  return Object.assign({ id: 'be_1', ten: 'An', lop: 2, bai_dang_hoc: 20, phong_cach: 'dung_manh', khung_long: { ten: 'Rex', muc: 'so_sinh', qua_mong: 120 }, ky_luc: {}, trung_vung: {}, phu_kien: [] }, them || {});
}

test('tienDoThuoc: 20 câu tự làm đúng trong 1 ngày còn thiếu 1 ngày; thêm ngày thứ hai thì đủ, khớp mức Đã thuộc', () => {
  const { HT, HD } = moi();
  const ds = [];
  for (let i = 0; i < 20; i++) ds.push(cau(i, '2026-09-20'));
  const t = HT.tienDoThuoc(ds, {}, '2026-09-20');
  assert.equal(t.tu_lam, 20);
  assert.equal(t.so_ngay, 1);
  assert.equal(t.du, false);
  assert.deepEqual(J(HD.conThieu(t)), ['chơi thêm 1 ngày nữa']);
  assert.equal(HT.mucKyNang(ds, {}, '2026-09-20').muc, 'dang_luyen');

  ds.push(cau(21, '2026-09-21'));
  const t2 = HT.tienDoThuoc(ds, {}, '2026-09-21');
  assert.equal(t2.du, true);
  assert.deepEqual(J(HD.conThieu(t2)), []);
  assert.equal(HT.mucKyNang(ds, {}, '2026-09-21').muc, 'da_thuoc');
});

test('tienDoThuoc: câu nhờ gợi ý không tính là tự làm; câu sai chưa sửa là câu nợ; tỉ lệ dưới 9 trên 10 được nêu ra', () => {
  const { HT, HD } = moi();
  const ds = [];
  for (let i = 0; i < 12; i++) ds.push(cau(i, '2026-09-20'));
  for (let i = 12; i < 16; i++) ds.push(cau(i, '2026-09-21', 'dung_sau_goi_y', 2));
  ds.push(cau(16, '2026-09-21', 'sai'));
  ds.push(cau(17, '2026-09-21', 'sai'));
  const t = HT.tienDoThuoc(ds, {}, '2026-09-21');
  assert.equal(t.tu_lam, 14);
  assert.equal(t.dung_ngay, 12);
  assert.equal(t.cau_no, 2);
  assert.equal(t.so_ngay, 2);
  const thieu = HD.conThieu(t);
  assert.ok(thieu.includes('tự làm thêm 6 câu'), thieu.join('; '));
  assert.ok(thieu.some((x) => x.startsWith('đúng ngay 9 trên 10 câu (con đang 8 trên 10)')), thieu.join('; '));
  assert.ok(thieu.includes('làm lại đúng 2 câu từng sai'), thieu.join('; '));
  // Câu đã sửa thì không còn nợ
  assert.equal(HT.tienDoThuoc(ds, { c16: true, c17: true }, '2026-09-21').cau_no, 0);
  // Ngoài cửa sổ 14 ngày thì không tính
  assert.equal(HT.tienDoThuoc(ds, {}, '2026-10-10').tu_lam, 0);
});

test('hằng số luật: sao, điều kiện thuộc, quả mọng thưởng dùng chung với hàm tính', () => {
  const { HT } = moi();
  assert.equal(HT.saoCuaVan(10, 9), 3);
  assert.equal(HT.saoCuaVan(10, 7), 2);
  assert.equal(HT.saoCuaVan(10, 6), 1);
  assert.equal(HT.SAO.ba, 0.9);
  assert.deepEqual(J(HT.DK_THUOC), { tu_lam: 20, ti_le: 0.9, so_ngay: 2 });
  assert.deepEqual(J(HT.THUONG), { ky_nang_da_thuoc: 50, xong_3_nhiem_vu: 20, thang_dau_truong: 100 });
  const app = fs.readFileSync(path.join(__dirname, '..', 'dao-khung-long', 'js', 'app.js'), 'utf8');
  for (const k of Object.keys(HT.THUONG)) assert.ok(app.includes('HT.THUONG.' + k), 'app.js trao thưởng ' + k + ' bằng HT.THUONG');
  assert.ok(!/qua_mong:\s*(50|20|100)\b/.test(app), 'app.js không còn số thưởng viết tay');
});

test('thời gian chơi: mặc định không giới hạn; chỉ phụ huynh đặt giới hạn; cho thêm riêng hôm nay, qua ngày tự hết', () => {
  const { w } = moi();
  const HS = w.HoSo;
  const nay = '2026-09-27';
  assert.equal(HS.gioiHanHomNay(hoSo(), nay), null, 'hồ sơ mới không có giới hạn');
  assert.equal(HS.gioiHanHomNay({ gioi_han_phut: null }, nay), null);
  assert.equal(HS.gioiHanHomNay({ gioi_han_phut: 30 }, nay), 30);
  assert.equal(HS.gioiHanHomNay({ gioi_han_phut: 30, them_hom_nay: { ngay: nay, phut: 15 } }, nay), 45);
  assert.equal(HS.gioiHanHomNay({ gioi_han_phut: 30, them_hom_nay: { ngay: '2026-09-26', phut: 15 } }, nay), 30, 'giờ cho thêm hôm qua đã hết');
  assert.equal(HS.gioiHanHomNay({ gioi_han_phut: 30, them_hom_nay: { ngay: nay, khong_gioi_han: true } }, nay), null);
  assert.equal(HS.sachGioiHan(''), null);
  assert.equal(HS.sachGioiHan(0), null);
  assert.equal(HS.sachGioiHan(33), 35);
  assert.equal(HS.sachGioiHan(1), 5);
  assert.equal(HS.sachGioiHan(999), 240);
  // Không có giới hạn thì không bao giờ gợi ý nghỉ
  const app = fs.readFileSync(path.join(__dirname, '..', 'dao-khung-long', 'js', 'app.js'), 'utf8');
  assert.ok(/function duPhutHomNay\(\) \{ const g = gioiHanHomNay\(\); return g != null &&/.test(app), 'duPhutHomNay chỉ đúng khi có giới hạn');
});

test('buocTiep: đủ phút thì nghỉ; còn nhiệm vụ thì chơi nhiệm vụ kế tiếp theo thứ tự', () => {
  const { DAO } = moi();
  const nv = { ds: [{ man: 'v2-m1', xong: true }, { man: 'v1-m2', xong: false }, { man: 'v1-m5', xong: false }], thuong: false };
  assert.equal(DAO.buocTiep({ hoSo: hoSo(), nhiemVu: nv, duPhut: true }).loai, 'nghi');
  const b = DAO.buocTiep({ hoSo: hoSo(), nhiemVu: nv, manVuaChoi: 'v2-m1', sao: 1 });
  assert.equal(b.loai, 'nhiem_vu');
  assert.equal(b.nhiem_vu, 1);
  assert.equal(b.man, 'v1-m2');
  assert.equal(b.nut, 'Chơi nhiệm vụ 2');
  assert.match(b.ly_do, /Còn 2 nhiệm vụ hôm nay, xong cả 3 được thêm 20 quả mọng/);
  nv.ds[1].xong = true;
  assert.match(DAO.buocTiep({ hoSo: hoSo(), nhiemVu: nv }).ly_do, /^Nhiệm vụ cuối của hôm nay/);
});

test('buocTiep: xong nhiệm vụ: 1 sao thì chơi lại, rồi màn chưa chơi kế tiếp trong vùng, cúp khi vừa mở', () => {
  const { DAO } = moi();
  const xong = { ds: [{ man: 'v2-m1', xong: true }], thuong: true };
  const p = hoSo({ ky_luc: { 'v1-m1': { sao: 1, lan_choi: 1 } } });
  assert.equal(DAO.buocTiep({ hoSo: p, nhiemVu: xong, manVuaChoi: 'v1-m1', sao: 1 }).loai, 'choi_lai');
  const b = DAO.buocTiep({ hoSo: p, nhiemVu: xong, manVuaChoi: 'v1-m1', sao: 2 });
  assert.equal(b.loai, 'man_tiep');
  assert.equal(b.man, 'v1-m2');
  // Vừa chơi màn cuối của cup_can: cúp vùng 1 mở
  p.ky_luc['v1-m2'] = { sao: 2 };
  p.ky_luc['v1-m3'] = { sao: 3 };
  const c = DAO.buocTiep({ hoSo: p, nhiemVu: xong, manVuaChoi: 'v1-m3', sao: 3 });
  assert.equal(c.loai, 'cup');
  assert.equal(c.man, 'v1-cup');
  // Cúp đã chơi: sang màn chưa chơi còn lại của vùng (vòng lại từ sau màn vừa chơi)
  p.ky_luc['v1-cup'] = { sao: 2 };
  assert.equal(DAO.buocTiep({ hoSo: p, nhiemVu: xong, manVuaChoi: 'v1-m3', sao: 3 }).man, 'v1-m4');
});

test('buocTiep: hết màn trong vùng thì sang vùng khác theo thứ tự bài, không vượt bài đang học quá 3 bài', () => {
  const { DAO } = moi();
  const xong = { ds: [], thuong: false };
  const p = hoSo({ bai_dang_hoc: 8 });
  DAO.vung(1).man.forEach((m) => { p.ky_luc[m.id] = { sao: 3 }; });
  const b = DAO.buocTiep({ hoSo: p, nhiemVu: xong, manVuaChoi: 'v1-m7', sao: 3 });
  assert.equal(b.loai, 'man_tiep');
  assert.equal(b.man, 'v2-m1', 'Bài 7 là bài kế tiếp trong sách');
  assert.match(b.ly_do, /Vùng 2/);
  // Mọi màn tới Bài 11 đã chơi: không gợi ý màn của bài quá xa (Bài 12 trở đi), mà là cúp đã mở hoặc lấy thêm sao
  DAO.VUNG.forEach((v) => v.man.forEach((m) => { if (m.bai_dau <= 11) p.ky_luc[m.id] = { sao: 3 }; }));
  const c = DAO.buocTiep({ hoSo: p, nhiemVu: xong, manVuaChoi: 'v2-m1', sao: 3 });
  assert.ok(!(c.man && DAO.man(c.man).bai_dau > 11 && c.loai === 'man_tiep'), JSON.stringify(c));
});

test('buocTiep: bé lớp 3 chơi hết màn: đấu trường chưa thắng, rồi màn chưa đủ 3 sao, rồi về đảo', () => {
  const { DAO } = moi();
  const xong = { ds: [], thuong: false };
  const p = hoSo({ lop: 3, bai_dang_hoc: 75 });
  DAO.VUNG.forEach((v) => v.man.forEach((m) => { if (!m.dau_truong) p.ky_luc[m.id] = { sao: 3 }; }));
  p.ky_luc['v3-m2'].sao = 1;
  const a = DAO.buocTiep({ hoSo: p, nhiemVu: xong });
  assert.equal(a.loai, 'dau_truong');
  assert.equal(a.man, 'dt1');
  p.dau_truong_thang = { 11: '2026-09-01', 12: '2026-09-02' };
  const b = DAO.buocTiep({ hoSo: p, nhiemVu: xong, manVuaChoi: 'dt2', sao: 3 });
  assert.equal(b.loai, 'them_sao');
  assert.equal(b.man, 'v3-m2');
  p.ky_luc['v3-m2'].sao = 3;
  const c = DAO.buocTiep({ hoSo: p, nhiemVu: xong });
  assert.equal(c.loai, 've_dao');
  assert.equal(c.man, null);
});

test('cách chơi: đủ mọi thể loại của đảo, mọi chế độ màn đang dùng có bước riêng, trạm dừng thêm một bước', () => {
  const { DAO, HD } = moi();
  for (const g of Object.keys(DAO.TEN_GAME)) {
    const cc = HD.cachChoiCua(g, null);
    assert.ok(cc && cc.buoc.length >= 3, 'thiếu cách chơi ' + g);
    cc.buoc.forEach((b) => { assert.ok(b[0] && b[1] && b[1].length > 10, g); });
  }
  DAO.VUNG.forEach((v) => v.man.forEach((m) => {
    const c = HD.CACH_CHOI[m.game];
    if (c.che_do && m.che_do) assert.ok(c.che_do[m.che_do], m.id + ': chưa có cách chơi cho chế độ ' + m.che_do);
    const cc = HD.cachChoiCua(m.game, m);
    assert.equal(cc.buoc.length, m.tram_dung && c.tram_dung ? 4 : 3, m.id);
  }));
  assert.match(HD.cachChoiCua('xuong-do-luong', DAO.man('v3-m3')).buoc[0][1], /Rót/);
  assert.match(HD.cachChoiCua('cho-khung-long', DAO.man('v9-m4')).buoc[2][1], /Trả lại khách/);
  // Thẻ lần đầu chỉ cho thể loại mới (game cũ và Đấu Trường đã có thẻ Bắt đầu riêng)
  for (const g of HD.LAN_DAU) assert.ok(HD.CACH_CHOI[g] && !DAO.THU_MUC_GAME_CU[g] && g !== 'dau-truong', g);
});

function ctx(w, p, them) {
  const DAO = w.Dao;
  return Object.assign({
    hoSo: p, hocTap: { ky_nang: [] }, cauDs: [], vanDs: [], nhiemVu: { ds: [{ loai: 'hoc_moi', man: 'v2-m1', xong: false }], thuong: false }, homNay: '2026-09-27',
    hinh: (t) => 'assets/img/' + t + '.webp',
    hinhKhungLong: (pp, loai) => DAO.HINH[pp.phong_cach][loai || pp.khung_long.muc],
    tenKhungLong: (pp) => pp.khung_long.ten,
    hinhMan: (m) => 'ic/' + m.game, hinhGame: (g) => 'ic/' + g,
    choiNhiemVu() {}, moVung() {}
  }, them || {});
}

test('trang Cách chơi: 10 chương dựng được cho bé mới và bé đã chơi nhiều; số liệu đọc từ luật thật', () => {
  const { w, HT, HD, DAO } = moi();
  assert.equal(HD.CHUONG.length, 10);
  assert.deepEqual(J(HD.GIOI_THIEU.filter((id) => HD.THU_TU.indexOf(id) < 0)), []);
  const beMoi = hoSo({ khung_long: { ten: 'Rex', muc: 'trung', qua_mong: 0 } });
  const cauDs = [];
  for (let i = 0; i < 14; i++) cauDs.push(cau(i, '2026-09-26'));
  const hocTap = HT.hoSoHocTap('be_1', cauDs, [], '2026-09-27');
  const beLon = hoSo({ lop: 3, khung_long: { ten: 'Mây', muc: 'nhi', qua_mong: 800 }, phong_cach: 'de_thuong', trung_vung: { 4: { no: true, ten: 'Tí' } }, dau_truong_thang: { 11: '2026-09-01' }, ky_luc: { 'v1-m1': { sao: 2 } } });
  for (const [p, them] of [[beMoi, null], [beLon, { hocTap: hocTap, cauDs: cauDs, vanDs: [{ vung: 1 }] }]]) {
    const c = { ctx: ctx(w, p, them), p: p, ten: p.ten, kl: p.khung_long.ten, hinh: (t) => t, hk: (l) => DAO.HINH[p.phong_cach][l || p.khung_long.muc], bang: HT.bangMuc((them && them.hocTap) || { ky_nang: [] }) };
    for (const ch of HD.CHUONG) {
      const ve = ch.ve(c);
      const n = ch.noi(c);
      assert.ok(typeof ve === 'string' && ve.length > 20, ch.id);
      assert.ok(n.tieu_de, ch.id);
      assert.ok(!/undefined|NaN|null/.test(ve + JSON.stringify(n.y) + (n.mo || '') + (n.them || '')), ch.id + ' có giá trị lỗi: ' + ve.slice(0, 200));
    }
  }
  const c0 = { ctx: ctx(w, beMoi), p: beMoi, ten: 'An', kl: 'Rex', hinh: (t) => t, hk: (l) => l || 'trung', bang: {} };
  const ch = (id) => HD.CHUONG.find((x) => x.id === id);
  const qm = ch('qua_mong').ve(c0);
  for (const s of ['+3', '+1', 'thêm +2', '+50', '+20', '+100']) assert.ok(qm.includes('<b>' + s + '</b>'), 'bảng quả mọng thiếu ' + s);
  const ll = ch('lon_len').ve(c0);
  assert.ok(ll.includes('500 quả mọng') && ll.includes('1 200 quả mọng + 3 kỹ năng Đã thuộc') && ll.includes('5 000 quả mọng + thắng 1 đấu trường'), ll);
  assert.match(ch('lon_len').noi(c0).them, /chơi xong một ván là Rex lên <b>Sơ sinh<\/b>/);
  assert.match(ch('nhiem_vu').noi(c0).hanh.nhan, /Chơi nhiệm vụ 1/);
  const dt = JSON.stringify(ch('da_thuoc').noi(c0).y);
  assert.ok(dt.includes('20 câu') && dt.includes('9 trên 10 câu') && dt.includes('2 ngày khác nhau'), dt);
});

test('chữ cho bé: không dùng dấu gạch dài trong trang Cách chơi và các chỗ chỉ đường', () => {
  const goc = path.join(__dirname, '..', 'dao-khung-long');
  for (const f of ['js/huong-dan.js', 'css/huong-dan.css']) {
    assert.ok(!fs.readFileSync(path.join(goc, f), 'utf8').includes(String.fromCharCode(0x2014)), f + ' có dấu gạch dài');
  }
});
