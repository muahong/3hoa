'use strict';
/* Đảo Khủng Long: kiểm thử logic (không cần trình duyệt).
   - Nhật ký: ULID, phong bì, lược đồ sự kiện v1, phiên nghỉ 10 phút, đóng phiên dở khi app tắt ngang, xóa dữ liệu bé.
   - Ngân hàng câu: đáp án, nhiễu có mã lỗi đúng công thức 03a, mã câu ổn định, sinh theo hạt giống.
   - Phát lại một ván Đua Xe theo kịch bản: số sự kiện và thứ tự khớp (YC-03).
   - Tính lại ba lớp tóm tắt từ nhật ký gốc khớp từng byte (YC-05). Mức thành thạo, nhiệm vụ, luật mở vùng, gợi ý lớp. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadGame, makeStorage, ROOT } = require('./lib/load.js');
const { validate } = require('./lib/schema-lite.js');

const FILES = ['js/nhat-ky.js', 'js/ngan-hang.js', 'js/hoc-tap.js', 'js/dao.js', 'js/ho-so.js', 'js/van-choi.js'];
// Đối tượng tạo trong vm có prototype của realm khác: so sánh sau khi chuyển về JSON
const J = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const deq = (a, b, m) => assert.deepEqual(J(a), J(b), m);
const SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/du-an-toan-2-3/spec/06-su-kien-v1.schema.json'), 'utf8'));

/** Nạp các mô-đun vào một window mới, với đồng hồ giả điều khiển được. */
function moi(opts) {
  const w = loadGame('dao-khung-long', FILES, opts);
  const dh = { t: Date.UTC(2026, 9, 12, 12, 4, 0), p: 1000 };
  w.NhatKy.caiDongHo({ now: () => dh.t, perf: () => dh.p });
  dh.toi = (ms) => { dh.t += ms; dh.p += ms; };
  return { w, dh, NK: w.NhatKy, NH: w.NganHang, HT: w.HocTap, DAO: w.Dao, HS: w.HoSo };
}

function kiemLuocDo(evs) {
  const loi = [];
  evs.forEach((e, i) => { validate(SCHEMA, e).forEach((m) => loi.push('#' + i + ' ' + e.loai + ' ' + m)); });
  return loi;
}

/* ---------------- Nhật ký ---------------- */

test('nhật ký: ULID 26 ký tự Crockford, tăng dần kể cả trong cùng mili giây', () => {
  const { NK } = moi();
  const ds = [];
  for (let i = 0; i < 500; i++) ds.push(NK.ulid(1790000000000));
  ds.push(NK.ulid(1790000000001));
  ds.push(NK.ulid(1789999999999)); // đồng hồ lùi vẫn tăng dần
  ds.forEach((u) => assert.match(u, /^[0-9A-HJKMNP-TV-Z]{26}$/));
  for (let i = 1; i < ds.length; i++) assert.ok(ds[i] > ds[i - 1], 'ULID phải tăng dần');
});

test('nhật ký: giờ địa phương ISO 8601 có múi giờ', () => {
  const { NK } = moi();
  assert.match(NK.isoDiaPhuong(Date.now()), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
});

test('nhật ký: phong bì đủ trường, hợp lệ lược đồ; nghỉ 10 phút mở phiên mới; ghi xuống kho khi xả', async () => {
  const { NK, dh } = moi();
  await NK.khoiDong({ khongDungIndexedDB: true, phienBanApp: 'test' });
  NK.datBe('be_TEST0001');
  NK.ghi('ho_so_doi', { truong: 'lop', cu: 2, moi: 3 }, { game: 'trang-chu' });
  dh.toi(11 * 60 * 1000);
  NK.cham();
  NK.ghi('phu_huynh_mo', { man: 'cai_dat' }, { game: 'goc-phu-huynh' });
  const evs = await NK.docCuaBe('be_TEST0001');
  deq(evs.map((e) => e.loai), ['phien_bat_dau', 'ho_so_doi', 'phien_ket_thuc', 'phien_bat_dau', 'phu_huynh_mo']);
  assert.equal(evs[2].du_lieu.ly_do, 'nghi_10_phut');
  assert.equal(evs[3].du_lieu.ly_do, 'quay_lai');
  assert.notEqual(evs[1].phien, evs[4].phien, 'phiên mới sau 10 phút');
  deq(kiemLuocDo(evs), []);
  for (const e of evs) for (const k of ['v', 'id', 'luc', 'ms', 'be', 'phien', 'loai', 'du_lieu']) assert.ok(k in e, e.loai + ' thiếu ' + k);
});

test('nhật ký: app tắt ngang giữa câu thì lần mở sau đóng câu (bo_qua), ván (bo_do) và phiên (khong_ro)', async () => {
  const st = makeStorage();
  const a = moi({ localStorage: st });
  await a.NK.khoiDong({ khongDungIndexedDB: true });
  a.NK.datBe('be_TEST0002');
  a.NK.batDauVan({ game: 'dua-xe', vung: 4, man: 'v4-m2', nguon: 'tu_chon' });
  a.NK.cauHien({ ma_cau: '2.11|cong-nho-2cs-2cs|36+27', noi_dung: '2.11', ky_nang: 'cong-nho-2cs-2cs', dang: 'chon_dap_an', de: '36 + 27 = ?', dap_an: 63 });
  a.NK.thaoTac('doi_lan', { tu: 'lan_giua', den: 'lan_trai', gia_tri_duoi_xe: 53 });
  // Lần chạy sau (cùng localStorage): dấu phiên còn mở
  const b = moi({ localStorage: st });
  const bat = [];
  b.NK.nghe((e) => bat.push(e));
  await b.NK.khoiDong({ khongDungIndexedDB: true });
  deq(bat.map((e) => e.loai), ['cau_ket_thuc', 'van_ket_thuc', 'phien_ket_thuc']);
  assert.equal(bat[0].du_lieu.ket_qua, 'bo_qua');
  assert.equal(bat[1].du_lieu.bo_do, true);
  assert.equal(bat[2].du_lieu.ly_do, 'khong_ro');
  assert.equal(bat[0].be, 'be_TEST0002');
  deq(kiemLuocDo(bat), []);
});

/* ---------------- Hồ sơ ---------------- */

test('hồ sơ: gợi ý lớp từ tuổi và năm học (spec 06 mục 5.1, YC-02)', () => {
  const { HS } = moi();
  assert.equal(HS.goiYLop(7, new Date(2026, 8, 27)).lop, 2);
  assert.equal(HS.goiYLop(7, new Date(2026, 9, 12)).lop, 2, 'tuổi 7 tháng 10/2026 gợi ý lớp 2');
  assert.equal(HS.goiYLop(8, new Date(2026, 9, 12)).lop, 3);
  assert.equal(HS.goiYLop(5, new Date(2026, 9, 12)).lop, 1, 'kẹp dưới 1');
  assert.equal(HS.goiYLop(11, new Date(2026, 9, 12)).lop, 5, 'kẹp trên 5');
  assert.equal(HS.goiYLop(7, new Date(2026, 9, 12)).nam_sinh_uoc_tinh, 2019);
  assert.equal(HS.namHocBatDau(new Date(2027, 0, 5)), 2026);
});

test('hồ sơ: tạo mới kiểm tra tên, tuổi; lọc ký tự; mỗi năm học hỏi lại lớp (YC-01)', async () => {
  const { NK, HS } = moi();
  await NK.khoiDong({ khongDungIndexedDB: true });
  await assert.rejects(HS.taoMoi({ ten: '   ', tuoi: 7 }));
  await assert.rejects(HS.taoMoi({ ten: 'An', tuoi: 4 }));
  await assert.rejects(HS.taoMoi({ ten: 'An', tuoi: 12 }));
  const p = await HS.taoMoi({ ten: '  Minh <b>Anh</b> rất dài dài dài ', tuoi: 7, phong_cach: 'de_thuong' }, new Date(2026, 9, 12));
  assert.match(p.id, /^be_[A-Za-z0-9]{4,32}$/);
  assert.ok(!/[<>]/.test(p.ten) && p.ten.length <= 16);
  assert.equal(p.lop, 2);
  assert.equal(p.lop_nguon, 'goi_y_tu_tuoi_da_xac_nhan');
  assert.equal(p.khung_long.loai, 'may');
  assert.equal(p.khung_long.muc, 'trung');
  assert.equal((await HS.taiDanhSach()).length, 1);
  assert.equal(HS.tuoiHienTai(p, new Date(2027, 9, 11)), 7, 'chưa tròn một năm kể từ ngày nhập');
  assert.equal(HS.tuoiHienTai(p, new Date(2027, 9, 12)), 8);
  assert.ok(!HS.canHoiLenLop(p, new Date(2027, 4, 1)));
  assert.ok(HS.canHoiLenLop(p, new Date(2027, 8, 10)), 'sang tháng 9 năm sau thì hỏi lên lớp');
});

/* ---------------- Ngân hàng câu ---------------- */

test('ngân hàng: mọi kỹ năng sinh câu đúng đáp án, 3 lựa chọn khác nhau trong phạm vi, nhiễu mang mã lỗi đúng công thức', () => {
  const { NH } = moi();
  const rng = NH.taoRng(7);
  for (const kn of NH.THU_TU_KY_NANG) {
    const gh = NH.KY_NANG[kn].gioi_han;
    let coTen = 0;
    for (let i = 0; i < 300; i++) {
      const q = NH.taoCau(kn, null, rng);
      assert.equal(q.dap_an, NH.tinh(q.cau_truc));
      assert.match(q.ma_cau, new RegExp('^' + NH.KY_NANG[kn].noi_dung.replace('.', '\\.') + '\\|' + kn + '\\|[0-9?=+-]+$'));
      assert.ok(q.dap_an >= 0 && q.dap_an <= gh, kn + ': đáp án ngoài phạm vi ' + q.de);
      const vals = q.lua_chon.map((x) => x.gia_tri);
      assert.equal(vals.length, 3);
      assert.equal(new Set(vals).size, 3, 'trùng lựa chọn ' + q.de + ' ' + vals);
      assert.ok(vals.includes(q.dap_an));
      for (const x of q.lua_chon) {
        assert.ok(Number.isInteger(x.gia_tri) && x.gia_tri >= 0 && x.gia_tri <= gh, kn + ': nhiễu ngoài phạm vi ' + q.de + ' → ' + x.gia_tri);
        deq(x.loi, NH.nhanBietLoi(q.cau_truc, x.gia_tri));
      }
      if (q.lua_chon.some((x) => x.loi.length && !x.loi.every((m) => m === 'khac' || m === 'dem-lech'))) coTen++;
      assert.equal(q.goi_y.length, 3);
      assert.ok(q.loi_giai && q.loi_giai.ma && q.loi_giai.kq === q.dap_an);
    }
    if (kn !== 'tim-so-thieu-20') assert.ok(coTen > 200, kn + ': phần lớn câu phải có một nhiễu là lỗi có tên (' + coTen + '/300)');
  }
});

test('ngân hàng: nhận biết lỗi theo bảng mã 03a mục 3.3', () => {
  const { NH } = moi();
  const c = (phep, so, extra) => Object.assign({ phep, so, an: 'ket_qua' }, extra || {});
  const co = (ct, v, ma) => assert.ok(NH.nhanBietLoi(ct, v).includes(ma), NH.deHien(ct) + ' → ' + v + ' phải là ' + ma + ', được ' + NH.nhanBietLoi(ct, v));
  co(c('+', [36, 27]), 53, 'quen-nho');
  co(c('+', [36, 27]), 513, 'viet-ca-so-nho');
  co(c('+', [36, 27]), 9, 'nham-dau');
  co(c('+', [28, 7]), 98, 'sai-hang');
  co(c('+', [8, 7]), 5, 'quen-nho');
  co(c('+', [8, 7]), 14, 'dem-lech');
  co(c('+', [8, 7]), 16, 'dem-lech');
  co(c('-', [62, 38]), 36, 'tru-nguoc');
  co(c('-', [62, 38]), 34, 'quen-muon');
  co(c('-', [62, 38]), 100, 'nham-dau');
  co(c('-', [15, 9]), 14, 'tru-nguoc');
  co(c('-', [15, 9]), 16, 'quen-muon');
  co(c('-', [15, 9]), 4, 'bu-sai-chieu');
  co(c('-', [15, 9]), 1, 'quen-muon');
  co(c('-', [100, 36]), 74, 'quen-muon');
  co(c('+', [45, 20]), 47, 'sai-hang');
  co(c('+', [30, 40]), 7, 'thieu-0');
  co(c(['-', '+'], [20, 8, 6]), 6, 'trai-sang-phai');
  co(c(['-', '+'], [20, 8, 6]), 12, 'bo-buoc');
  co({ phep: '+', so: [null, 6], kq: 13, an: 'so_hang_1' }, 19, 'nguoc-thanh-phan');
  co({ phep: '-', so: [15, null], kq: 9, an: 'so_tru' }, 24, 'nguoc-thanh-phan');
  // 43 − 8 → 45: trừ ngược và quên mượn cùng cho một số, ghi cả hai mã
  const hai = NH.nhanBietLoi(c('-', [43, 8]), 45);
  assert.ok(hai.includes('tru-nguoc') && hai.includes('quen-muon'));
  deq(NH.nhanBietLoi(c('+', [36, 27]), 63), []);
  deq(NH.nhanBietLoi(c('+', [36, 27]), 70), ['khac']);
  assert.equal(NH.maCau('cong-nho-2cs-2cs', c('+', [36, 27])), '2.11|cong-nho-2cs-2cs|36+27');
  assert.equal(NH.maCau('tim-so-thieu-20', { phep: '-', so: [15, null], kq: 9, an: 'so_tru' }), '2.15|tim-so-thieu-20|15-?=9');
});

test('ngân hàng: cùng hạt giống thì cùng danh sách câu (phát lại được)', () => {
  const { NH, DAO } = moi();
  const m = DAO.man('v4-cup');
  const a = NH.lapDanhSach(m, NH.taoRng(123), {});
  const b = NH.lapDanhSach(m, NH.taoRng(123), {});
  deq(a, b);
  assert.equal(a.length, 15);
  assert.equal(new Set(a.map((x) => NH.maCau(x.ky_nang, x.cau_truc))).size, 15, 'không trùng câu trong ván');
  deq(a.map((x, i) => x.dang === 'nhap_so' ? i + 1 : 0).filter(Boolean), [4, 8, 12], 'trạm dừng ở câu 4, 8, 12');
});

/* ---------------- Phát lại một ván ---------------- */

/**
 * Kịch bản: ván Đua Xe màn v4-m2 (có trạm dừng), 8 câu, hạt giống cố định.
 * Câu 2 cố ý chọn sai (đổi làn 3 lần), câu 3 xin gợi ý 1 lần, trạm dừng: gõ sai rồi xóa rồi gõ đúng.
 */
async function choiKichBan(ctx) {
  const { w, NK, NH, dh } = ctx;
  await NK.khoiDong({ khongDungIndexedDB: true });
  NK.datBe('be_KICHBAN01');
  const m = w.Dao.man('v4-m2');
  const van = new w.VanChoi({ nk: NK, game: 'dua-xe', vung: 4, man: m, nguon: 'tu_chon', hatGiong: 20261012, viTri: ['lan_trai', 'lan_giua', 'lan_phai'], soCau: 8 });
  van.batDau({ he_so_thoi_gian: 1 });
  let lan = 1;
  let q;
  const sai = new Set([2]);
  while ((q = van.cauTiep())) {
    dh.toi(300);
    if (q.dang === 'nhap_so') {
      van.thaoTac('go_so', { gia_tri: 9, hien_tai: '9' }); dh.toi(400);
      van.thaoTac('xoa', { hien_tai: '' }); dh.toi(300);
      for (const ch of String(q.dap_an)) { van.thaoTac('go_so', { gia_tri: +ch, hien_tai: ch }); dh.toi(250); }
      const kq = van.traLoi(q.dap_an, { nhap: String(q.dap_an) });
      assert.ok(kq.dung);
      continue;
    }
    if (q.stt === 3) { van.goiY(); dh.toi(800); }
    const dung = q.lua_chon.findIndex((x) => x.gia_tri === q.dap_an);
    const muc = sai.has(q.stt) ? (dung + 1) % 3 : dung;
    if (sai.has(q.stt)) {
      // đổi qua lại 3 lần rồi dừng ở làn sai
      const di = [muc === 0 ? 1 : 0, dung, muc];
      for (const d of di) { if (d !== lan) { van.thaoTac('doi_lan', { tu: ['lan_trai', 'lan_giua', 'lan_phai'][lan], den: ['lan_trai', 'lan_giua', 'lan_phai'][d], gia_tri_duoi_xe: q.lua_chon[d].gia_tri }); lan = d; dh.toi(900); } }
    } else if (muc !== lan) {
      van.thaoTac('doi_lan', { tu: ['lan_trai', 'lan_giua', 'lan_phai'][lan], den: ['lan_trai', 'lan_giua', 'lan_phai'][muc], gia_tri_duoi_xe: q.lua_chon[muc].gia_tri });
      lan = muc;
    }
    dh.toi(2500);
    const kq = van.traLoi(q.lua_chon[lan].gia_tri, { lan: ['lan_trai', 'lan_giua', 'lan_phai'][lan], chu_dong: true });
    if (!kq.dung) {
      assert.ok(kq.canPhanHoi);
      dh.toi(6000);
      van.phanHoiXem(6, 'choi_tiep');
      van.ketThucCauSai();
    }
  }
  const kq = await van.ketThuc(false, { giay_dua: 42 });
  return { van, kq, evs: await NK.docCuaBe('be_KICHBAN01') };
}

test('phát lại: một ván Đua Xe sinh đủ chuỗi sự kiện cho từng câu, đúng thứ tự, hợp lệ lược đồ (YC-03)', async () => {
  const ctx = moi();
  const { kq, evs } = await choiKichBan(ctx);
  deq(kiemLuocDo(evs), []);
  const vanEv = evs.filter((e) => e.van);
  assert.equal(vanEv[0].loai, 'van_bat_dau');
  assert.equal(vanEv[vanEv.length - 1].loai, 'van_ket_thuc');
  // Mỗi câu: cau_hien đầu tiên, cau_ket_thuc cuối cùng, có tra_loi, phản hồi (nếu có) nằm giữa tra_loi và cau_ket_thuc
  const theoCau = {};
  vanEv.filter((e) => e.cau).forEach((e) => (theoCau[e.cau] = theoCau[e.cau] || []).push(e.loai));
  const cacCau = Object.keys(theoCau);
  assert.equal(cacCau.length, 9, '8 câu mới + 1 câu sai quay lại');
  for (const c of cacCau) {
    const l = theoCau[c];
    assert.equal(l[0], 'cau_hien');
    assert.equal(l[l.length - 1], 'cau_ket_thuc');
    assert.ok(l.includes('tra_loi'));
    if (l.includes('phan_hoi_xem')) assert.ok(l.indexOf('phan_hoi_xem') > l.lastIndexOf('tra_loi'));
    assert.equal(l.filter((x) => x === 'cau_hien').length, 1);
    assert.equal(l.filter((x) => x === 'cau_ket_thuc').length, 1);
  }
  // Câu sai quay lại sau đúng 2 câu và được sửa
  const hien = vanEv.filter((e) => e.loai === 'cau_hien');
  const iSai = hien.findIndex((e) => theoCau[e.cau].includes('phan_hoi_xem'));
  assert.ok(iSai >= 0);
  const onLai = hien.find((e) => e.du_lieu.on_lai_cua === hien[iSai].cau);
  assert.ok(onLai, 'câu sai phải quay lại');
  assert.equal(hien.indexOf(onLai) - iSai, 3, 'quay lại sau 2 câu');
  assert.equal(onLai.du_lieu.ma_cau, hien[iSai].du_lieu.ma_cau);
  const ktLai = vanEv.find((e) => e.cau === onLai.cau && e.loai === 'cau_ket_thuc');
  assert.equal(ktLai.du_lieu.sua_duoc_cau, hien[iSai].cau);
  // Câu sai: 3 lần đổi làn, mã lỗi, ms tăng dần trong câu
  const cauSai = vanEv.filter((e) => e.cau === hien[iSai].cau);
  const tl = cauSai.find((e) => e.loai === 'tra_loi');
  assert.equal(tl.du_lieu.dung, false);
  assert.equal(tl.du_lieu.so_lan_doi_y, cauSai.filter((e) => e.loai === 'thao_tac' && e.du_lieu.kieu === 'doi_lan').length);
  assert.ok(tl.du_lieu.loi.length >= 1);
  for (let i = 1; i < cauSai.length; i++) assert.ok(cauSai[i].ms >= cauSai[i - 1].ms);
  // Trạm dừng: go_so, xoa ghi đủ; lựa chọn có vị trí làn và mã lỗi
  assert.ok(vanEv.some((e) => e.loai === 'thao_tac' && e.du_lieu.kieu === 'xoa'));
  const lc = hien.find((e) => e.du_lieu.lua_chon).du_lieu.lua_chon;
  deq(lc.map((x) => x.vi_tri), ['lan_trai', 'lan_giua', 'lan_phai']);
  // Gợi ý câu 3 làm câu thành "đúng sau gợi ý"
  assert.ok(vanEv.some((e) => e.loai === 'goi_y' && e.du_lieu.cap === 1));
  const kt = vanEv[vanEv.length - 1].du_lieu;
  assert.equal(kt.so_cau, 9);
  assert.equal(kt.dung_sau_goi_y, 1);
  assert.equal(kt.sai, 1);
  assert.equal(kt.sua_duoc, 1);
  assert.equal(kt.dung_ngay, 7);
  assert.equal(kt.bo_do, false);
  assert.equal(kq.sao, 2, '7/8 câu mới đúng ngay → 2 sao');
  assert.equal(kt.qua_mong, 7 * 3 + 1 + 2, 'tự làm ×3, nhờ gợi ý ×1, sửa được +2');
});

test('phát lại: cùng hạt giống, cùng thao tác thì cùng chuỗi loại sự kiện và cùng đề', async () => {
  const a = await choiKichBan(moi());
  const b = await choiKichBan(moi());
  const tom = (evs) => evs.filter((e) => e.van).map((e) => e.loai + ':' + (e.du_lieu.ma_cau || e.du_lieu.kieu || e.du_lieu.ket_qua || ''));
  deq(tom(a.evs), tom(b.evs));
});

/* ---------------- Tóm tắt và hồ sơ học tập ---------------- */

test('tóm tắt: tính lại từ nhật ký gốc khớp từng byte với bản tính ngay khi hết ván (YC-05)', async () => {
  const ctx = moi();
  const { kq, evs } = await choiKichBan(ctx);
  const HT = ctx.HT;
  const tenMan = 'màn 2 (cộng có nhớ: 2 chữ số + 2 chữ số)';
  const cauNgay = HT.tomTatCacCau(kq.suKien);
  const vanNgay = HT.tomTatVan(kq.suKien, tenMan);
  const hoSoNgay = HT.hoSoHocTap('be_KICHBAN01', cauNgay, [vanNgay], '2026-10-12');
  // "xóa lớp tóm tắt", dựng lại từ toàn bộ nhật ký gốc đọc ra từ kho
  const theoVan = {};
  evs.forEach((e) => { if (e.van) (theoVan[e.van] = theoVan[e.van] || []).push(e); });
  const cauLai = [], vanLai = [];
  Object.values(theoVan).forEach((ds) => { cauLai.push(...HT.tomTatCacCau(ds)); vanLai.push(HT.tomTatVan(ds, tenMan)); });
  assert.equal(JSON.stringify(cauLai), JSON.stringify(cauNgay));
  assert.equal(JSON.stringify(vanLai), JSON.stringify([vanNgay]));
  assert.equal(JSON.stringify(HT.hoSoHocTap('be_KICHBAN01', cauLai, vanLai, '2026-10-12')), JSON.stringify(hoSoNgay));
  assert.match(vanNgay.mo_ta, /^Ván Đua Xe màn 2 \(cộng có nhớ: 2 chữ số \+ 2 chữ số\), 9 câu, đúng ngay 7, nhờ gợi ý 1, sai 1 rồi sửa được cả 1\./);
  deq(vanNgay.cau_sai, [], 'câu sai đã sửa thì không còn nợ');
  deq(hoSoNgay.cau_no, []);
});

function cau(ngay, ketQua, o) {
  cau.n = (cau.n || 0) + 1;
  return Object.assign({
    cau: 'c_' + String(cau.n).padStart(4, '0'), van: 'va_1', be: 'be_X', luc: ngay + 'T19:00:' + String(cau.n % 60).padStart(2, '0') + '.000+07:00', ngay,
    ma_cau: '2.11|cong-nho-2cs-2cs|36+27', noi_dung: '2.11', ky_nang: 'cong-nho-2cs-2cs', dap_an: 63, cau_truc: { phep: '+', so: [36, 27], an: 'ket_qua' },
    ket_qua: ketQua, giay: 8, cac_tra_loi: ketQua === 'sai' ? [53] : [63], so_lan_doi_y: 0, goi_y_cap: 0, loi: ketQua === 'sai' ? ['quen-nho'] : [], on_lai: false, on_lai_cua: null, sua_duoc_cau: null
  }, o || {});
}

test('thành thạo: chưa học, làm quen, đang luyện, đã thuộc, vững chắc và cờ cần giúp', () => {
  const { HT } = moi();
  const muc = (ds, homNay) => HT.mucKyNang(ds, HT.tapDaSua(ds), homNay || '2026-10-12');
  assert.equal(muc([]).muc, 'chua_hoc');
  assert.equal(muc(Array.from({ length: 5 }, () => cau('2026-10-12', 'dung_ngay'))).muc, 'lam_quen');
  const motNgay = Array.from({ length: 22 }, () => cau('2026-10-12', 'dung_ngay'));
  assert.equal(muc(motNgay).muc, 'dang_luyen', 'cần ít nhất 2 ngày khác nhau');
  const haiNgay = Array.from({ length: 11 }, () => cau('2026-10-11', 'dung_ngay')).concat(Array.from({ length: 11 }, () => cau('2026-10-12', 'dung_ngay')));
  const t = muc(haiNgay);
  assert.equal(t.muc, 'da_thuoc');
  assert.equal(t.on_lai_ke_tiep, '2026-10-13', 'ôn lại sau 1 ngày kể từ ngày thuộc');
  // một câu sai chưa sửa (câu nợ) thì chưa thuộc
  assert.equal(muc(haiNgay.concat([cau('2026-10-12', 'dung_ngay'), cau('2026-10-12', 'sai')])).muc, 'dang_luyen');
  // câu nhờ gợi ý không tính là tự làm
  const nhoGoiY = Array.from({ length: 22 }, (_, i) => cau(i < 11 ? '2026-10-11' : '2026-10-12', 'dung_sau_goi_y', { goi_y_cap: 2 }));
  assert.equal(muc(nhoGoiY).muc, 'dang_luyen');
  // vững chắc: ôn đạt sau 1, 3, 7, 14 ngày
  const on = [];
  ['2026-10-12', '2026-10-14', '2026-10-18', '2026-10-25'].forEach((n) => { for (let i = 0; i < 4; i++) on.push(cau(n, 'dung_ngay')); });
  assert.equal(muc(haiNgay.concat(on), '2026-10-25').muc, 'da_thuoc', 'mới ôn đạt sau 1, 3, 7 ngày');
  on.push(cau('2026-10-26', 'dung_ngay'), cau('2026-10-26', 'dung_ngay'), cau('2026-10-26', 'dung_ngay'));
  assert.equal(muc(haiNgay.concat(on), '2026-10-26').muc, 'vung_chac', 'ôn đạt cả mốc 14 ngày');
  // ôn ít câu nhưng vẫn đúng thì không tụt mức; quên (đúng dưới 85%) thì về đang luyện
  assert.equal(muc(haiNgay.concat([cau('2026-11-05', 'dung_ngay')]), '2026-11-05').muc, 'da_thuoc');
  const quen = haiNgay.concat(Array.from({ length: 6 }, (_, i) => cau('2026-11-05', i < 3 ? 'dung_ngay' : 'sai')), Array.from({ length: 3 }, () => cau('2026-11-05', 'dung_ngay', { on_lai: true })));
  quen.slice(-3).forEach((c, i) => { c.on_lai_cua = quen[quen.length - 6 + i].cau; c.sua_duoc_cau = c.on_lai_cua; });
  assert.equal(muc(quen, '2026-11-05').muc, 'dang_luyen', 'đúng 6/9 dưới 85% là quên');
  // cờ cần giúp: một lỗi có tên lặp 3 lần trong 7 ngày
  const lap = Array.from({ length: 8 }, () => cau('2026-10-12', 'dung_ngay')).concat([cau('2026-10-10', 'sai'), cau('2026-10-11', 'sai'), cau('2026-10-12', 'sai')]);
  const cg = muc(lap);
  assert.equal(cg.can_giup, true);
  assert.equal(cg.loi_hay_gap[0].ma, 'quen-nho');
  deq(cg.loi_hay_gap[0].vi_du, ['36+27→53']);
  assert.equal(cg.cau_no, 3);
});

test('phần thưởng: quả mọng mỗi câu, sao của ván, các mức lớn của khủng long', () => {
  const { HT } = moi();
  deq(HT.quaMongCau('dung_ngay', false, 'dang_luyen'), { qua_mong: 3, loai: 'tu_lam', them_sua: 0 });
  deq(HT.quaMongCau('dung_ngay', true, 'dang_luyen'), { qua_mong: 3, loai: 'tu_lam', them_sua: 2 });
  deq(HT.quaMongCau('dung_ngay', false, 'vung_chac'), { qua_mong: 1, loai: 'vung_chac', them_sua: 0 });
  assert.equal(HT.quaMongCau('dung_sau_goi_y', false, null).qua_mong, 1);
  assert.equal(HT.quaMongCau('sai', false, null).qua_mong, 0, 'sai không bao giờ bị trừ');
  assert.equal(HT.saoCuaVan(12, 11, false), 3);
  assert.equal(HT.saoCuaVan(12, 9, false), 2);
  assert.equal(HT.saoCuaVan(12, 2, false), 1, 'xong ván vẫn có 1 sao');
  assert.equal(HT.saoCuaVan(12, 12, true), 0, 'bỏ dở thì không có sao');
  const m = (o) => HT.mucLon(o).ma;
  assert.equal(m({ qua_mong: 0, van_xong: 0 }), 'trung');
  assert.equal(m({ qua_mong: 6, van_xong: 0, co_cau_dung: true }), 'lay_dong');
  assert.equal(m({ qua_mong: 30, van_xong: 1 }), 'so_sinh', 'trứng đầu tiên nở khi xong ván đầu');
  assert.equal(m({ qua_mong: 600, van_xong: 5 }), 'nhi');
  assert.equal(m({ qua_mong: 1300, van_xong: 9, so_da_thuoc: 2 }), 'nhi', 'thiếu niên cần 3 nội dung đã thuộc');
  assert.equal(m({ qua_mong: 1300, van_xong: 9, so_da_thuoc: 3 }), 'thieu_nien');
  assert.equal(m({ qua_mong: 6000, van_xong: 99, so_da_thuoc: 10, so_dau_truong: 0 }), 'truong_thanh');
  assert.equal(m({ qua_mong: 6000, van_xong: 99, so_da_thuoc: 10, so_dau_truong: 1 }), 'huyen_thoai');
});

/* ---------------- Đảo: mở vùng, nhiệm vụ ---------------- */

test('đảo: 10 vùng và 2 đấu trường; lớp 2 học kì 1 mở vùng 1 đến 6, học kì 2 khóa; lớp 3 mở hết', () => {
  const { DAO } = moi();
  assert.equal(DAO.VUNG.length, 12);
  assert.equal(DAO.VUNG.filter((v) => v.dau_truong).length, 2);
  const lop2 = { lop: 2, bai_dang_hoc: 8 };
  assert.ok(DAO.trangThaiVung(DAO.vung(4), lop2).mo);
  assert.ok(!DAO.trangThaiVung(DAO.vung(4), lop2).sap_co, 'vùng 4 có Đua Xe');
  assert.ok(DAO.trangThaiVung(DAO.vung(1), lop2).sap_co, 'vùng 1 chưa có game ở giai đoạn 1');
  assert.equal(DAO.trangThaiVung(DAO.vung(7), lop2).ly_do, 'hoc_ky_2');
  assert.ok(DAO.trangThaiVung(DAO.vung(7), { lop: 2, bai_dang_hoc: 40 }).mo);
  assert.ok(DAO.trangThaiVung(DAO.vung(10), { lop: 3, bai_dang_hoc: 1 }).mo);
  assert.equal(DAO.uocLuongBai(new Date(2026, 8, 27)), 7);
  assert.equal(DAO.uocLuongBai(new Date(2027, 6, 1)), 75);
  // mọi màn chơi được đều dùng kỹ năng có trong ngân hàng
  const NH = moi().NH;
  DAO.VUNG.forEach((v) => v.man.filter(DAO.choiDuoc).forEach((m) => m.cau.forEach((x) => assert.ok(NH.KY_NANG[x.ky_nang], m.id + ': ' + x.ky_nang))));
  deq(DAO.kyNangCuaVung(DAO.vung(4)), ['cong-nho-2cs-1cs', 'cong-nho-2cs-2cs', 'nham-tron-chuc', 'tru-nho-2cs-1cs', 'tru-nho-2cs-2cs']);
});

test('nhiệm vụ: bé mới có 3 nhiệm vụ học mới theo bài đang học; lỗi lặp lại sinh nhiệm vụ luyện lại có lý do', () => {
  const { DAO, HT } = moi();
  const be = { lop: 2, bai_dang_hoc: 7 };
  const nv = DAO.lapNhiemVu(be, null, '2026-09-27');
  assert.equal(nv.length, 3);
  deq(nv.map((x) => x.man), ['v2-m1', 'v2-m2', 'v2-m3']);
  assert.ok(nv.every((x) => x.loai === 'hoc_moi' && !x.xong));
  // bé hay quên nhớ ở cộng có nhớ 2 chữ số, và đã thuộc cộng qua 10 từ lâu
  const ds = Array.from({ length: 8 }, () => cau('2026-10-12', 'dung_ngay')).concat([cau('2026-10-10', 'sai'), cau('2026-10-11', 'sai'), cau('2026-10-12', 'sai')]);
  const thuoc = Array.from({ length: 22 }, (_, i) => cau(i < 11 ? '2026-10-01' : '2026-10-02', 'dung_ngay', { ky_nang: 'cong-qua-10', noi_dung: '2.8', ma_cau: '2.8|cong-qua-10|8+7', dap_an: 15, cau_truc: { phep: '+', so: [8, 7], an: 'ket_qua' }, cac_tra_loi: [15] }));
  const hs = HT.hoSoHocTap('be_X', ds.concat(thuoc), [], '2026-10-13');
  const nv2 = DAO.lapNhiemVu({ lop: 2, bai_dang_hoc: 22 }, hs, '2026-10-13');
  const on = nv2.find((x) => x.loai === 'on_cach_quang');
  const luyen = nv2.find((x) => x.loai === 'luyen_lai');
  assert.ok(on && on.man === 'v2-m1', 'ôn cách quãng kỹ năng đã thuộc tới hạn');
  assert.ok(luyen && luyen.man === 'v4-m2', 'luyện lại đúng màn của kỹ năng yếu');
  assert.equal(luyen.ly_do, 'Con hay quên nhớ 1');
  assert.equal(nv2.length, 3);
  assert.equal(new Set(nv2.map((x) => x.man)).size, 3, 'không lặp màn');
});

test('dữ liệu: xóa một bé bỏ hết mọi khóa của bé đó, bé khác còn nguyên (YC-08)', async () => {
  const ctx = moi();
  await choiKichBan(ctx);
  const { NK } = ctx;
  await NK.kho.dat('tom_tat_van', { van: 'va_x', be: 'be_KICHBAN01' });
  await NK.kho.dat('ho_so_hoc_tap', { be: 'be_KICHBAN01' });
  await NK.kho.dat('ho_so', { id: 'be_KICHBAN01', ten: 'A' });
  await NK.kho.dat('ho_so', { id: 'be_KHAC0001', ten: 'B' });
  await NK.kho.dat('tom_tat_van', { van: 'va_y', be: 'be_KHAC0001' });
  await NK.xoaBe('be_KICHBAN01');
  for (const ten of ['su_kien', 'tom_tat_cau', 'tom_tat_van', 'ho_so_hoc_tap', 'ho_so']) {
    const ds = await NK.kho.tatCa(ten);
    assert.ok(!ds.some((o) => o.be === 'be_KICHBAN01' || o.id === 'be_KICHBAN01'), ten + ' còn dữ liệu của bé đã xóa');
  }
  assert.equal((await NK.kho.tatCa('ho_so')).length, 1);
  assert.equal((await NK.kho.tatCa('tom_tat_van')).length, 1);
});

test('tệp: service worker liệt kê tệp có thật; index.html có CSP, không script nội tuyến, nạp đủ mô-đun', () => {
  const dir = path.join(ROOT, 'dao-khung-long');
  const sw = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8');
  const core = Array.from(sw.matchAll(/'\.\/([^']+)'/g)).map((x) => x[1]).filter(Boolean);
  assert.ok(core.length > 20);
  for (const p of core) assert.ok(fs.existsSync(path.join(dir, p)), 'CORE liệt kê tệp không tồn tại: ' + p);
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  assert.match(html, /<meta http-equiv="Content-Security-Policy"/);
  assert.doesNotMatch(html, /\son[a-z]+\s*=\s*["']/i);
  assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/i);
  const scripts = Array.from(html.matchAll(/<script[^>]+src="([^"]+)"/g)).map((m) => m[1]);
  for (const f of FILES.concat(['js/am-thanh.js', 'js/phan-hoi.js', 'js/dua-xe.js', 'js/app.js'])) assert.ok(scripts.includes(f), 'chưa nạp ' + f);
  assert.equal(scripts[scripts.length - 1], 'js/app.js');
  for (const f of scripts) assert.ok(core.includes(f), 'sw.js chưa lưu ' + f);
  // hình dùng trong mã phải có thật
  const js = fs.readdirSync(path.join(dir, 'js')).map((f) => fs.readFileSync(path.join(dir, 'js', f), 'utf8')).join('\n') + html + fs.readFileSync(path.join(dir, 'style.css'), 'utf8');
  const hinh = new Set(Array.from(js.matchAll(/['"(/]((?:rex|may|sp|bg|car)-[a-z0-9-]+|berry)(?:\.webp)?['")]/g)).map((m) => m[1]));
  for (const h of hinh) assert.ok(fs.existsSync(path.join(dir, 'assets/img', h + '.webp')), 'thiếu hình ' + h + '.webp');
});
