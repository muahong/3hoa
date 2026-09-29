'use strict';
/* Đảo Khủng Long: sửa nhóm F (và phần dữ liệu còn lại) của lần rà soát 2026-09-28.
   - F1: tên ngắn của 43 nội dung (ô bản đồ kỹ năng, chip lọc), câu "Tuần này nên luyện" ở Tổng quan, mục Nâng cao trong Cài đặt.
   - F2: gói cho trợ lý AI liệt kê đúng nội dung, tùy chọn bỏ tuổi, nhắc về công ty AI, hướng dẫn trả lời bằng chữ trước, câu hỏi mẫu.
   - F3: tên bé đã xóa không còn trong tên gợi ý, xóa mọi dữ liệu của đảo, liên kết Quyền riêng tư, giọng đọc tiếng Việt.
   - Dữ liệu: đếm sự kiện bằng chỉ mục, đọc nhật ký theo khoảng ngày, ghi ngay khi app ở nền, thời lượng phiên không âm. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadGame, ROOT } = require('./lib/load.js');

const FILES = ['js/nhat-ky.js', 'js/ngan-hang.js', 'js/cau-so-sanh.js', 'js/cau-do-luong.js', 'js/cau-tien.js', 'js/cau-thong-ke.js', 'js/cau-hinh-hoc.js', 'js/cau-thoi-gian.js', 'js/hoc-tap.js', 'js/dao.js', 'js/ho-so.js', 'js/van-choi.js', 'js/bao-cao.js'];
const J = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const cho = () => new Promise((r) => setTimeout(r, 0));

function moi(them) {
  const w = loadGame('dao-khung-long', FILES.concat(them || []));
  const dh = { t: Date.UTC(2026, 9, 12, 12, 4, 0), p: 1000 };
  w.NhatKy.caiDongHo({ now: () => dh.t, perf: () => dh.p });
  return { w, dh, NK: w.NhatKy, NH: w.NganHang, HT: w.HocTap, DAO: w.Dao, HS: w.HoSo, BC: w.BaoCao };
}

/** Hai tuần chơi giả với câu thật của ngân hàng (giống thangChoi của kiểm thử Góc phụ huynh, gọn hơn). */
function haiTuan(ctx, be, tu) {
  const { NH, HT, DAO } = ctx;
  const rng = NH.taoRng(7);
  const ky = ['cong-nho-2cs-2cs', 'tru-nho-2cs-2cs', 'bang-nhan-2-5'];
  const manCua = {};
  DAO.VUNG.forEach((v) => v.man.forEach((m) => (m.cau || []).forEach((x) => { if (!manCua[x.ky_nang]) manCua[x.ky_nang] = m; })));
  const cauDs = [], vanDs = [];
  let n = 0;
  for (let d = 0; d < 14; d++) {
    const ngay = HT.congNgay(tu, d);
    ky.forEach((kn, s) => {
      const m = manCua[kn];
      const vanId = 'va_' + ngay.replace(/-/g, '') + '_' + s;
      const ds = [];
      for (let i = 0; i < 8; i++) {
        n++;
        const q = NH.taoCau(kn, null, rng, { dang: 'chon_dap_an' });
        const sai = rng() < 0.3 ? (q.lua_chon.find((x) => x.loi.length && x.loi[0] !== 'khac') || q.lua_chon.find((x) => x.gia_tri !== q.dap_an)) : null;
        ds.push({
          cau: 'c_' + String(n).padStart(6, '0'), van: vanId, be, luc: ngay + 'T1' + s + ':' + String(i).padStart(2, '0') + ':00.000+07:00', ngay, game: 'dua-xe', vung: m.vung, man: m.id,
          ma_cau: q.ma_cau, noi_dung: q.noi_dung, ky_nang: kn, dang: 'chon_dap_an', de: q.de, cau_truc: q.cau_truc, dap_an: q.dap_an,
          on_lai: false, on_lai_cua: null, ket_qua: sai ? 'sai' : 'dung_ngay', giay: 6, cac_tra_loi: sai ? [sai.gia_tri] : [q.dap_an],
          so_lan_doi_y: 0, goi_y_cap: 0, loi: sai ? sai.loi.slice() : [], sua_duoc_cau: null, chu_dong: true, tra_loi_sai: sai ? [sai.gia_tri] : []
        });
      }
      cauDs.push(...ds);
      vanDs.push({ van: vanId, be, luc: ds[0].luc, ngay, game: 'dua-xe', vung: m.vung, man: m.id, nguon: 'tu_chon', nhiem_vu: null, giay: 300, so_cau: ds.length,
        dung_ngay: ds.filter((c) => c.ket_qua === 'dung_ngay').length, dung_sau_goi_y: 0, dung_lan_2: 0, sai: ds.filter((c) => c.ket_qua === 'sai').length, sua_duoc: 0,
        sao: 2, qua_mong: 20, cam_xuc: 'vui', bo_do: false, loi: {}, cau_sai: [], mo_ta: 'Ván Đua Xe.' });
    });
  }
  return { cauDs, vanDs };
}
function hoSoBe(o) {
  return Object.assign({ id: 'be_X', ten: 'An', tuoi_khi_nhap: 7, ngay_nhap_tuoi: '2026-09-01', nam_sinh_uoc_tinh: 2019, lop: 2, bai_dang_hoc: 23, phong_cach: 'dung_manh', khung_long: { ten: 'Rex', loai: 'rex', muc: 'nhi', qua_mong: 600 }, tao_luc: '2026-09-01T19:00:00+07:00' }, o || {});
}

/* ---------------- F1 ---------------- */

test('F1: 43 nội dung đều có tên ngắn dễ đọc; bản đồ kỹ năng và chip lọc dùng tên ngắn', () => {
  const ctx = moi();
  const { BC, NH, HT } = ctx;
  const ma = Object.keys(NH.NOI_DUNG);
  assert.equal(ma.length, 43);
  for (const m of ma) {
    const t = BC.tenNganNoiDung(m);
    assert.ok(t && t !== m && t.length <= 28, m + ': ' + t);
    assert.ok(!/\u2014/.test(t));
  }
  assert.equal(BC.tenNganNoiDung('2.11'), 'Cộng, trừ có nhớ');
  const { cauDs, vanDs } = haiTuan(ctx, 'be_X', '2026-10-01');
  const du = { hoSo: hoSoBe(), cauDs, vanDs, hocTap: null };
  const bd = BC.banDoKyNang(BC.hoSoTai(du, '2026-10-14'));
  const o = bd.vung.flatMap((v) => v.o);
  assert.equal(o.length, 43);
  assert.ok(o.every((x) => x.ten_ngan === BC.tenNganNoiDung(x.ma)));
  const nk = BC.nhatKy(du, { tu: '2026-10-01', den: '2026-10-14' });
  assert.ok(nk.chip_noi_dung.length > 0);
  assert.ok(nk.chip_noi_dung.every((x) => x.ten_ngan && x.ten_ngan === BC.tenNganNoiDung(x.ma)));
  // Thời gian chơi không âm dù dữ liệu cũ có ván ghi số âm (đồng hồ máy bị lùi)
  vanDs.push(Object.assign({}, vanDs[vanDs.length - 1], { van: 'va_am', giay: -5000 }));
  const tq = BC.tongQuanTuan(du, '2026-10-12', '2026-10-14');
  assert.ok(tq.giay >= 0 && tq.phut >= 0);
  assert.equal(BC.giayVan({ giay: -3 }), 0);
  assert.equal(HT.congNgay('2026-10-14', -27), '2026-09-17');
});

/* ---------------- F2 ---------------- */

test('F2: gói cho trợ lý AI có tùy chọn bỏ tuổi, liệt kê đúng nội dung, hướng dẫn trả lời bằng chữ trước, câu hỏi mẫu kèm gói', () => {
  const ctx = moi();
  const { BC } = ctx;
  const { cauDs, vanDs } = haiTuan(ctx, 'be_X', '2026-10-01');
  const du = { hoSo: hoSoBe(), cauDs, vanDs, hocTap: null };
  const o = { homNay: '2026-10-14', taoLuc: '2026-10-14T20:15:00.000+07:00', tuoi: 7 };
  const coTuoi = BC.goiXuat(du, [], o);
  assert.deepEqual(J(coTuoi.goi.be), { bi_danh: 'be_1', tuoi: 7, lop: 2, bai_dang_hoc: 23, phong_cach: 'dung_manh' });
  const khongTuoi = BC.goiXuat(du, [], Object.assign({ boTuoi: true }, o));
  assert.deepEqual(J(khongTuoi.goi.be), { bi_danh: 'be_1', lop: 2, bai_dang_hoc: 23, phong_cach: 'dung_manh' });
  assert.ok(!/"tuoi"/.test(khongTuoi.chuoi));
  assert.ok(khongTuoi.chuoi.indexOf('An') < 0 || !/"An"/.test(khongTuoi.chuoi), 'không có tên');
  // Hướng dẫn: trả lời bằng tiếng Việt cho phụ huynh trước, JSON tùy chọn ở cuối
  const hd = coTuoi.goi.huong_dan;
  assert.match(hd, /tiếng Việt dễ hiểu/);
  assert.match(hd, /2 đến 3 hoạt động/);
  assert.match(hd, /Chỉ sau phần chữ đó.*JSON tùy chọn/);
  assert.ok(!/Trả lời bằng JSON/.test(hd));
  assert.match(coTuoi.goi.hop_dong_dau_ra.mo_ta, /^Tùy chọn/);
  assert.ok(!/không kèm chữ nào khác/.test(coTuoi.chuoi));
  // Liệt kê đúng những gì gói có
  const nd = BC.noiDungGoi({});
  const co = nd.co.join('; ');
  for (const x of ['tuổi', 'lớp', 'phong cách khủng long', 'ngày giờ', 'múi giờ', 'thao tác']) assert.ok(co.indexOf(x) >= 0, 'thiếu ' + x);
  assert.ok(!/7 ngày/.test(co));
  assert.ok(BC.noiDungGoi({ kemNhatKy: true }).co.join(';').indexOf('7 ngày') >= 0);
  const bo = BC.noiDungGoi({ boTuoi: true });
  assert.ok(!bo.co.some((x) => /tuổi/.test(x)));
  assert.ok(bo.khong.indexOf('tuổi') >= 0);
  for (const x of ['tên của con', 'ngày sinh', 'mã thiết bị, loại máy']) assert.ok(nd.khong.indexOf(x) >= 0, x);
  // Câu hỏi mẫu: câu hỏi trước, gói sau, không đòi JSON
  const ch = BC.cauHoiMau(coTuoi.chuoi);
  assert.ok(ch.indexOf('Tôi là phụ huynh') === 0);
  assert.ok(ch.indexOf(coTuoi.chuoi) > 0);
  assert.match(ch, /Không cần viết JSON/);
  assert.match(ch, /2 đến 3 hoạt động/);
  for (const s of [ch, coTuoi.chuoi, co]) assert.ok(!/\u2014/.test(s), 'không có gạch dài');
});

/* ---------------- F3, dữ liệu ---------------- */

test('F3: tên bé đã xóa khỏi đảo không còn trong tên gợi ý (không đụng hồ sơ trang chủ)', () => {
  const { w, HS } = moi();
  const chung = JSON.stringify({ players: [{ name: 'Minh' }, { name: 'Lan Anh' }, { name: 'Bé' }] });
  w.localStorage.setItem('3hoa-players-v1', chung);
  assert.deepEqual(J(HS.tenGoiY()), ['Minh', 'Lan Anh']);
  HS.anGoiY('  lan   anh ');
  assert.deepEqual(J(HS.tenGoiY()), ['Minh']);
  HS.anGoiY(['MINH', 'Minh']);
  assert.deepEqual(J(HS.tenGoiY()), []);
  const an = JSON.parse(w.localStorage.getItem('dkl-an-goi-y'));
  assert.equal(an.length, 2, 'Minh và MINH là một tên');
  assert.ok(an.every((x) => /^[0-9a-f]{8}$/.test(x)), 'chỉ giữ dấu băm, không giữ tên');
  assert.ok(!/minh|lan/i.test(w.localStorage.getItem('dkl-an-goi-y')));
  assert.equal(w.localStorage.getItem('3hoa-players-v1'), chung, 'hồ sơ chung giữ nguyên');
});

test('dữ liệu: đếm sự kiện của bé, đọc nhật ký từ một ngày, ghi ngay khi app ở nền, thời lượng phiên không âm', async () => {
  const { w, dh, NK } = moi();
  await NK.khoiDong({ khongDungIndexedDB: true });
  NK.datBe('be_DEM01');
  for (let i = 0; i < 5; i++) { NK.ghi('ho_so_doi', { truong: 'x', cu: i, moi: i + 1 }); dh.t += 1000; }
  dh.t += 3 * 86400000; // ba ngày sau
  NK.ghi('ho_so_doi', { truong: 'x', cu: 5, moi: 6 });
  const tatCa = await NK.docCuaBe('be_DEM01');
  assert.equal(await NK.demCuaBe('be_DEM01'), tatCa.length);
  assert.equal(await NK.demCuaBe('be_KHAC'), 0);
  const tu = String(tatCa[tatCa.length - 1].luc).slice(0, 10);
  const sau = await NK.docCuaBe('be_DEM01', tu);
  assert.ok(sau.length >= 1 && sau.length < tatCa.length);
  assert.ok(sau.every((e) => String(e.luc).slice(0, 10) >= tu));
  // App ở nền: ghi ngay, không chờ hẹn giờ 2 giây (iOS đóng băng hẹn giờ ở nền)
  const truoc = (await NK.kho.theoBe('su_kien', 'be_DEM01')).length;
  w.document.visibilityState = 'hidden';
  NK.ghi('ho_so_doi', { truong: 'y', cu: 0, moi: 1 });
  await cho(); await cho();
  assert.equal((await NK.kho.theoBe('su_kien', 'be_DEM01')).length, truoc + 1);
  assert.equal(NK._trangThai.hengio, null, 'không còn hẹn giờ chờ ghi');
  w.document.visibilityState = 'visible';
  // Đồng hồ máy bị lùi giữa phiên: phien_ket_thuc không có số giây âm
  const ev = [];
  NK.nghe((e) => ev.push(e));
  dh.t -= 5 * 86400000;
  await NK.ketThucPhien('dong_app');
  const kt = ev.find((e) => e.loai === 'phien_ket_thuc');
  assert.ok(kt && kt.du_lieu.giay >= 0, 'giây phiên: ' + (kt && kt.du_lieu.giay));
  assert.ok(kt.ms >= 0);
});

test('F3: xóa mọi dữ liệu của đảo: thôi ghi, xóa khóa dkl-*, giữ mã bố mẹ, deleteDatabase (kể cả khi bị chặn)', async () => {
  const { w, NK } = moi();
  await NK.khoiDong({ khongDungIndexedDB: true });
  NK.datBe('be_XOA01');
  NK.ghi('ho_so_doi', { truong: 'x', cu: 0, moi: 1 });
  await NK.xa();
  for (const k of ['dkl-be-dang-choi-v1', 'dkl-am-thanh-v1', 'dkl-sao-luu-v1', '3hoa-het-gio-v1', '3hoa-ma-bo-me-v1', '3hoa-cong-khoa-v1', '3hoa-players-v1']) w.localStorage.setItem(k, '1');
  // IndexedDB giả: lần đầu bị cửa sổ khác chặn rồi mới xong
  const goi = [];
  w.indexedDB = {
    deleteDatabase(ten) {
      goi.push(ten);
      const yc = {};
      setTimeout(() => { yc.onblocked && yc.onblocked(); setTimeout(() => yc.onsuccess && yc.onsuccess(), 5); }, 5);
      return yc;
    }
  };
  let biChan = 0;
  const r = await NK.xoaTatCa({ biChan: () => { biChan++; } });
  assert.deepEqual(goi, ['dao-khung-long']);
  assert.equal(r.xong, true);
  assert.equal(r.bi_chan, true);
  assert.equal(biChan, 1);
  const con = [];
  for (let i = 0; i < w.localStorage.length; i++) con.push(w.localStorage.key(i));
  assert.ok(!con.some((k) => k.indexOf('dkl-') === 0), con.join(','));
  assert.ok(con.indexOf('3hoa-het-gio-v1') < 0);
  for (const k of ['3hoa-ma-bo-me-v1', '3hoa-cong-khoa-v1', '3hoa-players-v1']) assert.ok(con.indexOf(k) >= 0, 'giữ ' + k);
  // Không ghi gì nữa, kho mới rỗng
  assert.equal(NK.ghi('ho_so_doi', { truong: 'x' }), null);
  assert.equal((await NK.kho.tatCa('su_kien')).length, 0);
  await NK.kho.dat('ho_so', { id: 'be_MOI' });
  assert.equal((await NK.kho.tatCa('ho_so')).length, 0, 'không ghi vào kho sau khi xóa');
  // Cửa sổ khác giữ mãi: hết thời gian chờ thì báo chưa xong
  const b = moi();
  await b.NK.khoiDong({ khongDungIndexedDB: true });
  b.w.indexedDB = { deleteDatabase() { const yc = {}; setTimeout(() => yc.onblocked && yc.onblocked(), 1); return yc; } };
  const r2 = await b.NK.xoaTatCa({ choMs: 30 });
  assert.equal(r2.xong, false);
  assert.equal(r2.bi_chan, true);
});

/* ---------------- Giao diện với DOM giả ---------------- */

function domGia(w) {
  const els = {};
  const tao = (id) => ({
    id, innerHTML: '', textContent: '', style: {}, scrollTop: 0, disabled: false, value: '',
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, on) { if (on === undefined) on = !this._s.has(c); if (on) this._s.add(c); else this._s.delete(c); return on; }, contains(c) { return this._s.has(c); } },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {}, contains() { return true; },
    addEventListener(t, fn) { this['_' + t] = fn; },
    querySelector() { return null; }, querySelectorAll() { return []; }, scrollIntoView() {}, focus() {}
  });
  w.document.getElementById = (id) => els[id] || (els[id] = tao(id));
  w.document.querySelectorAll = () => [];
  return els;
}
/** Giả một lần chạm vào nút có data-hd (qua bộ nghe click của section). */
function bam(els, hd, attrs) {
  const a = Object.assign({ 'data-hd': hd }, attrs || {});
  const nut = { tagName: 'BUTTON', disabled: false, parentNode: { open: false }, getAttribute: (k) => (k in a ? a[k] : null), hasAttribute: (k) => k in a };
  nut.closest = () => nut;
  els['man-phu-huynh']._click({ target: nut });
}

test('giao diện nhóm F: Tổng quan, bản đồ, Cài đặt (Nâng cao, giọng đọc, Quyền riêng tư), xuất AI, xóa một bé, xóa mọi dữ liệu', async () => {
  const ctx = moi(['js/goc-phu-huynh.js']);
  const { w, NK, HT, BC, HS } = ctx;
  const els = domGia(w);
  await NK.khoiDong({ khongDungIndexedDB: true });
  const ngay = '2026-10-14';
  const p = hoSoBe({ id: 'be_GIAODIENF', ten: 'Minh' });
  const p2 = hoSoBe({ id: 'be_GIAODIENG', ten: 'Lan' });
  const { cauDs, vanDs } = haiTuan(ctx, p.id, '2026-10-01');
  const hocTap = HT.hoSoHocTap(p.id, cauDs, vanDs, ngay);
  const bao = [];
  const A = { dsBe: [p, p2], hoSo: p };
  const c = {
    A,
    hinh: (t) => 'assets/img/' + t + '.webp', hinhTen: (t) => 'assets/img/' + t + '.webp',
    hinhKhungLong: (x, loai) => 'rex-' + (loai || 'kid'), tenKhungLong: () => 'Rex', soDep: (n) => String(Math.round(n || 0)), homNay: () => ngay,
    bao: (s) => bao.push(s), hien: () => {}, tenManNgan: () => 'màn 2',
    taiDuLieuBe: (id) => Promise.resolve(id === p.id ? { hoSo: p, cauDs, vanDs, hocTap } : { hoSo: p2, cauDs: [], vanDs: [], hocTap: null }),
    tinhLai: () => Promise.resolve(null),
    thoat: () => {}, hoSoDoi: (x) => Promise.resolve(x),
    beBiXoa: (id) => { A.dsBe = A.dsBe.filter((x) => x.id !== id); if (A.hoSo && A.hoSo.id === id) A.hoSo = null; }
  };
  // Máy chưa có giọng tiếng Việt
  w.speechSynthesis = { getVoices: () => [{ lang: 'en-US', name: 'Samantha' }], addEventListener() {} };
  const G = w.GocPhuHuynh;
  G.mo('ban-do', c);
  G._quaCong();
  await cho(); await cho();
  const than = () => els['gp-than'].innerHTML;
  const sach = (ten) => assert.ok(!/undefined|NaN|\[object Object\]|>null</.test(than()), ten);
  // Tổng quan: câu "Tuần này nên luyện" từ mục đầu của kế hoạch tuần
  assert.match(than(), /id="gp-nen-luyen"/);
  const kh = BC.keHoachTuan({ hoSo: p, cauDs, vanDs, hocTap }, ngay);
  assert.ok(kh.muc.length > 0);
  assert.ok(than().indexOf('Tuần này nên luyện: <b>' + kh.muc[0].tieu_de.replace(/&/g, '&amp;') + '</b>') >= 0, than().match(/Tuần này nên luyện[^<]*<b>[^<]*/)[0]);
  sach('tổng quan');
  const D = G._dieuKhien;
  // Bản đồ kỹ năng: tên ngắn trên ô, mã nhỏ bên dưới
  D.moTab('ky_nang');
  assert.equal((than().match(/class="gp-o-kn /g) || []).length, 43);
  assert.match(than(), /<span class="gp-o-ten">Cộng, trừ có nhớ<\/span><small class="gp-o-ma">2\.11<\/small>/);
  sach('bản đồ');
  // Nhật ký: chip nội dung dùng tên, không còn "Mã 2.11"
  D.nhatKy({ loai: 'noi_dung', ma: '2.11' });
  assert.ok(!/>Mã 2\.11/.test(than()));
  assert.match(than(), /Cộng, trừ có nhớ <small>/);
  // Cài đặt: Nâng cao (đóng sẵn) chứa nút kỹ thuật và số sự kiện; giọng đọc; Quyền riêng tư; xóa mọi dữ liệu
  D.moTab('cai_dat');
  await cho(); await cho();
  const cd = than();
  const nc = cd.slice(cd.indexOf('<details class="gp-xem-truoc" id="gp-nang-cao">'), cd.indexOf('</details>', cd.indexOf('id="gp-nang-cao"')));
  assert.ok(nc.length > 50, 'có mục Nâng cao đóng sẵn');
  for (const x of ['<summary data-hd="nang-cao">Nâng cao</summary>', 'data-hd="tai-jsonl"', 'data-hd="tinh-lai"', 'id="gp-thong-ke"']) assert.ok(nc.indexOf(x) >= 0, x);
  assert.equal(cd.split('data-hd="tai-jsonl"').length, 2, 'nút JSONL chỉ ở Nâng cao');
  assert.match(cd, /<a class="gp-lien-ket" href="\/rieng-tu\/"[^>]*>Quyền riêng tư<\/a>/);
  assert.match(cd, /data-hd="xoa-tat-ca">Xóa mọi dữ liệu Đảo Khủng Long trên máy này</);
  assert.match(cd, /Máy chưa có giọng đọc tiếng Việt/);
  assert.match(cd, /Nội dung được đọc &gt; Giọng nói &gt; Tiếng Việt/);
  assert.match(cd, /“Linh”/);
  assert.match(cd, /Android/);
  sach('cài đặt');
  assert.equal(els['gp-thong-ke'].textContent.split(' ')[0], String(await NK.demCuaBe(p.id)), 'số sự kiện đếm bằng chỉ mục');
  bam(els, 'nang-cao');
  assert.equal(G._trangThai().S.nangCao, true);
  D.moTab('cai_dat');
  assert.match(than(), /id="gp-nang-cao" open>/, 'vẽ lại vẫn giữ Nâng cao mở');
  // Máy có giọng tiếng Việt thì chỉ một dòng ngắn
  w.speechSynthesis = { getVoices: () => [{ lang: 'vi-VN', name: 'Linh', localService: true }], addEventListener() {} };
  D.moTab('cai_dat');
  assert.match(than(), /Máy có giọng đọc tiếng Việt/);
  assert.ok(!/Linh”/.test(than()));
  // Danh sách giọng nạp sau (voiceschanged): lúc đầu "đang kiểm tra", có sự kiện thì vẽ lại mục đó
  let nghe = null;
  const giong = [];
  w.speechSynthesis = { getVoices: () => giong, addEventListener(t, fn) { if (t === 'voiceschanged') nghe = fn; } };
  G._trangThai().S.giongCho = false;
  D.moTab('cai_dat');
  assert.match(than(), /Đang kiểm tra giọng đọc/);
  giong.push({ lang: 'vi_VN', name: 'Linh' });
  nghe();
  assert.match(els['gp-giong'].innerHTML, /Máy có giọng đọc tiếng Việt/);

  // Xuất cho trợ lý AI
  D.moXuatAi();
  await cho(); await cho();
  const S = G._trangThai().S;
  assert.ok(S.xuat.kq);
  const xa = than();
  for (const x of ['Gói có:', 'tuổi của con', 'múi giờ', 'Gói không có:', 'tên của con', 'gửi dữ liệu này tới công ty', 'huấn luyện', 'data-hd="bo-tuoi"', 'data-hd="cau-hoi-mau"', 'Sao chép câu hỏi mẫu']) assert.ok(xa.indexOf(x) >= 0, 'thiếu ' + x);
  assert.ok(!/hop_dong_dau_ra\.<\/p>|Trợ lý sẽ trả JSON/.test(xa));
  sach('xuất AI');
  assert.equal(S.xuat.kq.goi.be.tuoi, HS.tuoiHienTai(p));
  // Bỏ tuổi: tạo lại gói không có tuổi, danh sách "Gói có" không còn tuổi
  els['man-phu-huynh']._change({ target: { getAttribute: (k) => (k === 'data-hd' ? 'bo-tuoi' : null), checked: true } });
  await cho(); await cho();
  assert.ok(!('tuoi' in S.xuat.kq.goi.be));
  const goiCo = than().slice(than().indexOf('Gói có:'), than().indexOf('Gói không có:'));
  assert.ok(goiCo.length > 100 && goiCo.indexOf('tuổi của con') < 0, 'danh sách Gói có không còn tuổi');
  assert.match(than(), /Gói không có:<\/b> tên của con, tuổi,/);
  assert.match(than(), /data-hd="bo-tuoi" checked/);
  // Máy không cho sao chép tự động: hiện ô câu hỏi mẫu (kèm gói) để bố mẹ tự sao chép
  bam(els, 'cau-hoi-mau');
  await cho(); await cho();
  assert.equal(S.xuat.hienCauHoi, true);
  assert.match(than(), /<textarea id="gp-cau-hoi" class="gp-o-cau-hoi" readonly>Tôi là phụ huynh/);
  // Có clipboard thì sao chép câu hỏi kèm gói
  let daChep = null;
  w.navigator.clipboard = { writeText: (s) => { daChep = s; return Promise.resolve(); } };
  bam(els, 'cau-hoi-mau');
  await cho(); await cho();
  assert.ok(daChep && daChep.indexOf('Tôi là phụ huynh') === 0 && daChep.indexOf(S.xuat.kq.chuoi) > 0);
  assert.match(bao[bao.length - 1], /Đã sao chép câu hỏi mẫu/);
  D.dongCon();

  // Xóa một bé (gõ lại tên): tên bé không còn trong tên gợi ý
  w.localStorage.setItem('3hoa-players-v1', JSON.stringify({ players: [{ name: 'Minh' }, { name: 'Hoa' }] }));
  bam(els, 'xoa-be');
  w.document.getElementById('gp-xoa-ten').value = 'minh';
  bam(els, 'xoa-that');
  await cho(); await cho(); await cho();
  assert.deepEqual(J(HS.tenGoiY()), ['Hoa']);
  assert.deepEqual(A.dsBe.map((x) => x.id), [p2.id]);

  // Xóa mọi dữ liệu: phải gõ XÓA; xong thì mọi khóa dkl-* mất, tên các bé bị ẩn khỏi gợi ý
  await cho(); await cho();
  w.localStorage.setItem('dkl-meo-mh-v1', '1');
  w.localStorage.setItem('3hoa-ma-bo-me-v1', JSON.stringify({ h: G.bamPin('1357') }));
  bam(els, 'xoa-tat-ca');
  assert.match(els['gp-hop'].innerHTML, /Gõ chữ <b>XÓA<\/b>/);
  assert.match(els['gp-hop'].innerHTML, /1 bé \(Lan\)/);
  w.document.getElementById('gp-xoa-het').value = 'xoá nhầm';
  bam(els, 'xoa-het-that');
  await cho();
  assert.equal(w.localStorage.getItem('dkl-meo-mh-v1'), '1', 'gõ sai thì không xóa');
  w.document.getElementById('gp-xoa-het').value = ' XÓA ';
  bam(els, 'xoa-het-that');
  for (let i = 0; i < 6; i++) await cho();
  assert.equal(w.localStorage.getItem('dkl-meo-mh-v1'), null);
  assert.ok(w.localStorage.getItem('3hoa-ma-bo-me-v1'), 'giữ mã bố mẹ');
  assert.equal(JSON.parse(w.localStorage.getItem('dkl-an-goi-y')).length, 2, 'giữ dấu tên đã ẩn trước đó, thêm tên các bé vừa xóa');
  w.localStorage.setItem('3hoa-players-v1', JSON.stringify({ players: [{ name: 'Lan' }, { name: 'Minh' }, { name: 'Hoa' }] }));
  assert.deepEqual(J(HS.tenGoiY()), ['Hoa']);
  assert.match(els['gp-xoa-tb'].innerHTML, /Đã xóa mọi dữ liệu/);
  assert.equal(NK.daNhuong(), true, 'không ghi gì nữa cho tới khi tải lại');
});

test('mã nguồn nhóm F: không có gạch dài, CSS mới chỉ có lớp gp-', () => {
  for (const f of ['js/goc-phu-huynh.js', 'js/bao-cao.js', 'js/ho-so.js', 'js/nhat-ky.js', 'css/goc-phu-huynh-f.css']) {
    const s = fs.readFileSync(path.join(ROOT, 'dao-khung-long', f), 'utf8');
    assert.ok(!/\u2014/.test(s), f);
  }
  // Kho IndexedDB (không chạy được trong Node) có đủ mọi hàm mà bocGhi và NhatKy dùng
  const nk = fs.readFileSync(path.join(ROOT, 'dao-khung-long/js/nhat-ky.js'), 'utf8');
  const idb = nk.slice(nk.indexOf('function khoIndexedDB'), nk.indexOf('let kho = khoBoNho()'));
  for (const f of ['mo', 'dong', 'lay', 'dat', 'datNhieu', 'xoa', 'tatCa', 'theoBe', 'demTheoBe', 'theoVan', 'xoaNeu', 'xoaKhoaDuoi']) {
    assert.match(idb, new RegExp('\n      ' + f + ': (function|mo)'), 'khoIndexedDB thiếu ' + f);
  }
  const css = fs.readFileSync(path.join(ROOT, 'dao-khung-long/css/goc-phu-huynh-f.css'), 'utf8');
  const lop = [...css.replace(/\/\*[^]*?\*\//g, '').matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]);
  assert.ok(lop.length && lop.every((x) => x.indexOf('gp-') === 0), lop.join(','));
});
