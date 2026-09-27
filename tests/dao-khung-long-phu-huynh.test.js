'use strict';
/* Đảo Khủng Long GĐ 3: Góc phụ huynh (js/bao-cao.js là hàm thuần, js/goc-phu-huynh.js dựng giao diện).
   - Ngày, định nghĩa "tự làm đúng", tổng quan tuần, chọn câu sai làm ví dụ Cần giúp, game con thích nhất, xu hướng 4 tuần.
   - Nhật ký chi tiết theo ngày, ván, câu; bộ lọc câu sai, mã nội dung, mã lỗi.
   - Câu mô tả cho từng kiểu thao tác; dòng thời gian của một câu từ nhật ký gốc thật (ván Đua Xe phát lại), kể cả câu làm lại.
   - Bản đồ kỹ năng đúng 43 ô trong 10 vùng; chi tiết một nội dung; kế hoạch tuần tới; việc làm cùng con cho đủ 43 nội dung.
   - Gói xuất cho trợ lý AI (spec 06 mục 5.9): không có tên thật, đủ khóa, dưới 30 000 token với một tháng chơi nặng, ổn định.
   - Giao diện chạy với DOM giả: mọi màn vẽ được, chỉ ghi phu_huynh_* (YC-09), đổi cài đặt đi qua hoSoDoi. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadGame, ROOT } = require('./lib/load.js');
const { validate } = require('./lib/schema-lite.js');

const FILES = ['js/nhat-ky.js', 'js/ngan-hang.js', 'js/cau-so-sanh.js', 'js/cau-do-luong.js', 'js/cau-tien.js', 'js/cau-thong-ke.js', 'js/cau-hinh-hoc.js', 'js/cau-thoi-gian.js', 'js/hoc-tap.js', 'js/dao.js', 'js/ho-so.js', 'js/van-choi.js', 'js/bao-cao.js'];
const J = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const deq = (a, b, m) => assert.deepEqual(J(a), J(b), m);
const SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/du-an-toan-2-3/spec/06-su-kien-v1.schema.json'), 'utf8'));
const KIEU_THAO_TAC = SCHEMA.allOf.find((x) => x.if.properties.loai.const === 'thao_tac').then.properties.du_lieu.properties.kieu.enum;

function moi(opts, them) {
  const w = loadGame('dao-khung-long', FILES.concat(them || []), opts);
  const dh = { t: Date.UTC(2026, 9, 12, 12, 4, 0), p: 1000 };
  w.NhatKy.caiDongHo({ now: () => dh.t, perf: () => dh.p });
  dh.toi = (ms) => { dh.t += ms; dh.p += ms; };
  return { w, dh, NK: w.NhatKy, NH: w.NganHang, HT: w.HocTap, DAO: w.Dao, HS: w.HoSo, BC: w.BaoCao };
}
function kiemLuocDo(evs) {
  const loi = [];
  evs.forEach((e, i) => { validate(SCHEMA, e).forEach((m) => loi.push('#' + i + ' ' + e.loai + ' ' + m)); });
  return loi;
}

/* ---------------- Dữ liệu giả ---------------- */

let dem = 0;
/** Một tóm tắt câu (giống HocTap.tomTatCau). */
function cau(ngay, ketQua, o) {
  dem++;
  const sai = ketQua === 'sai' || ketQua === 'dung_lan_2';
  return Object.assign({
    cau: 'c_' + String(dem).padStart(5, '0'), van: 'va_' + ngay, be: 'be_X', luc: ngay + 'T19:' + String(Math.floor(dem / 60) % 60).padStart(2, '0') + ':' + String(dem % 60).padStart(2, '0') + '.000+07:00', ngay,
    game: 'dua-xe', vung: 4, man: 'v4-m5', ma_cau: '2.11|tru-nho-2cs-2cs|62-38', noi_dung: '2.11', ky_nang: 'tru-nho-2cs-2cs', dang: 'chon_dap_an',
    de: '62 − 38 = ?', cau_truc: { phep: '-', so: [62, 38], an: 'ket_qua' }, dap_an: 24, on_lai: false, on_lai_cua: null,
    ket_qua: ketQua, giay: 8, cac_tra_loi: sai ? (ketQua === 'dung_lan_2' ? [34, 24] : [34]) : ketQua === 'het_gio' || ketQua === 'bo_qua' ? [] : [24],
    so_lan_doi_y: 0, goi_y_cap: ketQua === 'dung_sau_goi_y' ? 1 : 0, loi: sai ? ['quen-muon'] : [], sua_duoc_cau: null, chu_dong: true, tra_loi_sai: sai ? [34] : []
  }, o || {});
}
function van(ngay, o) {
  return Object.assign({ van: 'va_' + ngay, be: 'be_X', luc: ngay + 'T19:00:00.000+07:00', ngay, game: 'dua-xe', vung: 4, man: 'v4-m5', nguon: 'tu_chon', nhiem_vu: null, giay: 300, so_cau: 10, dung_ngay: 8, dung_sau_goi_y: 1, dung_lan_2: 0, sai: 1, sua_duoc: 0, sao: 2, qua_mong: 20, cam_xuc: null, bo_do: false, loi: {}, cau_sai: [], mo_ta: 'Ván Đua Xe màn 5, 10 câu, đúng ngay 8.' }, o || {});
}
function hoSoBe(o) {
  return Object.assign({ id: 'be_X', ten: 'An', tuoi_khi_nhap: 7, ngay_nhap_tuoi: '2026-09-01', nam_sinh_uoc_tinh: 2019, lop: 2, bai_dang_hoc: 23, phong_cach: 'dung_manh', khung_long: { ten: 'Rex', loai: 'rex', muc: 'nhi', qua_mong: 600 }, tao_luc: '2026-09-01T19:00:00+07:00' }, o || {});
}

/** Một tháng chơi giả với câu thật của ngân hàng (đề, cấu trúc, nhiễu mang mã lỗi), để thử tổng quan, bản đồ và gói xuất. */
function thangChoi(ctx, o) {
  const { NH, HT, DAO } = ctx;
  const rng = NH.taoRng(o.hat || 11);
  const kyDs = o.ky;
  const manCua = {};
  DAO.VUNG.forEach((v) => v.man.forEach((m) => { if (m.ky_nang_chinh && !manCua[m.ky_nang_chinh]) manCua[m.ky_nang_chinh] = m; }));
  DAO.VUNG.forEach((v) => v.man.forEach((m) => (m.cau || []).forEach((x) => { if (!manCua[x.ky_nang]) manCua[x.ky_nang] = m; })));
  const cauDs = [], vanDs = [];
  let n = 0;
  for (let d = 0; d < o.soNgay; d++) {
    const ngay = HT.congNgay(o.tu, d);
    for (let s = 0; s < o.vanMoiNgay; s++) {
      const kn = kyDs[(d * o.vanMoiNgay + s) % kyDs.length];
      const m = manCua[kn];
      const vanId = 'va_' + ngay.replace(/-/g, '') + '_' + s;
      const game = m.game === 'truyen-tranh' ? 'truyen-tranh' : ['dua-xe', 'lat-the'][s % 2];
      const ds = [];
      for (let i = 0; i < o.cauMoiVan; i++) {
        n++;
        const q = NH.taoCau(kn, null, rng, { dang: 'chon_dap_an' });
        const r = rng();
        const pSai = (o.pSai && o.pSai[kn]) || 0.12;
        const kq = r < pSai ? 'sai' : r < pSai + 0.06 ? 'dung_sau_goi_y' : 'dung_ngay';
        const sai = kq === 'sai' ? (q.lua_chon.find((x) => x.loi.length && x.loi[0] !== 'khac') || q.lua_chon.find((x) => x.gia_tri !== q.dap_an)) : null;
        const luc = ngay + 'T' + String(16 + s).padStart(2, '0') + ':' + String(i).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0') + '.000+07:00';
        ds.push({
          cau: 'c_' + String(n).padStart(6, '0'), van: vanId, be: o.be, luc, ngay, game, vung: m.vung, man: m.id,
          ma_cau: q.ma_cau, noi_dung: q.noi_dung, ky_nang: kn, dang: 'chon_dap_an', de: q.de, cau_truc: q.cau_truc, dap_an: q.dap_an,
          on_lai: false, on_lai_cua: null, ket_qua: kq, giay: 4 + Math.round(rng() * 90) / 10,
          cac_tra_loi: sai ? [sai.gia_tri] : [q.dap_an], so_lan_doi_y: Math.floor(rng() * 3), goi_y_cap: kq === 'dung_sau_goi_y' ? 1 : 0,
          loi: sai ? sai.loi.slice() : [], sua_duoc_cau: null, chu_dong: true, tra_loi_sai: sai ? [sai.gia_tri] : []
        });
      }
      cauDs.push(...ds);
      const loi = {};
      ds.forEach((c) => c.loi.forEach((x) => { loi[x] = (loi[x] || 0) + 1; }));
      const t = {
        van: vanId, be: o.be, luc: ds[0].luc, ngay, game, vung: m.vung, man: m.id, nguon: s === 0 ? 'tu_chon' : 'hoc_moi', nhiem_vu: null, giay: 240 + Math.round(rng() * 200),
        so_cau: ds.length, dung_ngay: ds.filter((c) => c.ket_qua === 'dung_ngay').length, dung_sau_goi_y: ds.filter((c) => c.ket_qua === 'dung_sau_goi_y').length, dung_lan_2: 0,
        sai: ds.filter((c) => c.ket_qua === 'sai').length, sua_duoc: 0, sao: 2, qua_mong: 20, cam_xuc: s % 2 ? 'vui' : 'binh_thuong', bo_do: false, loi, cau_sai: ds.filter((c) => c.ket_qua === 'sai').map((c) => c.cau), mo_ta: ''
      };
      t.mo_ta = HT.moTaVan(t, 'màn ' + m.so + ' (' + m.ten.toLowerCase() + ')');
      vanDs.push(t);
    }
  }
  return { cauDs, vanDs };
}

/**
 * Ván Đua Xe v4-m2 phát lại qua VanChoi + NhatKy (như kiểm thử chính): câu 2 cố ý sai sau 3 lần đổi làn (có ghé làn đúng),
 * xem lời giải, câu quay lại sau 2 câu và làm đúng; câu 3 xin gợi ý; trạm dừng gõ sai, xóa, gõ đúng.
 */
async function choiKichBan(ctx, be) {
  const { w, NK, dh } = ctx;
  await NK.khoiDong({ khongDungIndexedDB: true });
  NK.datBe(be || 'be_KICHBAN01');
  const LAN = ['lan_trai', 'lan_giua', 'lan_phai'];
  const m = w.Dao.man('v4-m2');
  const van = new w.VanChoi({ nk: NK, game: 'dua-xe', vung: 4, man: m, nguon: 'tu_chon', hatGiong: 20261012, viTri: LAN, soCau: 8 });
  van.batDau({ he_so_thoi_gian: 1 });
  let lan = 1;
  let q;
  while ((q = van.cauTiep())) {
    dh.toi(300);
    if (q.dang === 'nhap_so') {
      van.thaoTac('go_so', { gia_tri: 9, hien_tai: '9' }); dh.toi(400);
      van.thaoTac('xoa', { hien_tai: '' }); dh.toi(300);
      for (const ch of String(q.dap_an)) { van.thaoTac('go_so', { gia_tri: +ch, hien_tai: ch }); dh.toi(250); }
      van.traLoi(q.dap_an, { nhap: String(q.dap_an) });
      continue;
    }
    if (q.stt === 3) { van.goiY(); dh.toi(800); }
    const dung = q.lua_chon.findIndex((x) => x.gia_tri === q.dap_an);
    const saiO = q.stt === 2;
    const muc = saiO ? q.lua_chon.findIndex((x) => x.loi.length && x.loi[0] !== 'khac' && x.loi[0] !== 'dem-lech') : dung;
    const chon = saiO && muc < 0 ? (dung + 1) % 3 : muc;
    if (saiO) {
      for (const d of [chon, dung, chon]) { if (d !== lan) { van.thaoTac('doi_lan', { tu: LAN[lan], den: LAN[d], gia_tri_duoi_xe: q.lua_chon[d].gia_tri }); lan = d; dh.toi(900); } }
    } else if (chon !== lan) {
      van.thaoTac('doi_lan', { tu: LAN[lan], den: LAN[chon], gia_tri_duoi_xe: q.lua_chon[chon].gia_tri });
      lan = chon;
    }
    dh.toi(2500);
    const kq = van.traLoi(q.lua_chon[lan].gia_tri, { lan: LAN[lan], chu_dong: true });
    if (!kq.dung) {
      dh.toi(6000);
      van.phanHoiXem(6.4, 'que_tinh');
      van.ketThucCauSai();
    }
  }
  const kq = await van.ketThuc(false, { giay_dua: 42 });
  NK.ghiSauVan('cam_xuc', { muc: 'vui' });
  await NK.xa();
  return { van, kq, evs: await NK.docCuaBe(be || 'be_KICHBAN01') };
}

/* ---------------- Ngày, số, định nghĩa ---------------- */

test('báo cáo: tuần thứ Hai đến Chủ nhật, ngày dạng "Thứ Hai 12/10", số kiểu Việt Nam', () => {
  const { BC } = moi();
  assert.equal(BC.dauTuan('2026-10-12'), '2026-10-12', '12/10/2026 là thứ Hai');
  assert.equal(BC.dauTuan('2026-10-18'), '2026-10-12', 'Chủ nhật thuộc tuần bắt đầu thứ Hai trước đó');
  assert.equal(BC.dauTuan('2026-09-27'), '2026-09-21');
  assert.equal(BC.dauTuan('2027-01-01'), '2026-12-28', 'tuần qua năm mới');
  assert.equal(BC.thuNgay('2026-10-12'), 'Thứ Hai 12/10');
  assert.equal(BC.thuNgay('2026-10-18'), 'Chủ nhật 18/10');
  assert.equal(BC.thuNgay('2026-10-07'), 'Thứ Tư 7/10');
  assert.equal(BC.khoangTuan('2026-09-28'), '28/9 đến 4/10');
  assert.equal(BC.giayChu(6.5), '6,5 giây');
  assert.equal(BC.giayChu(9), '9 giây');
  assert.equal(BC.phanTram(0.855), '86%');
  assert.equal(BC.phutChu(20), 'dưới 1 phút');
  assert.equal(BC.phutChu(250), '4 phút');
});

test('báo cáo: "tự làm đúng" = câu đúng ngay không gợi ý / câu tự làm (không gợi ý, không bỏ dở), khớp HocTap', () => {
  const { BC, HT } = moi();
  const ds = [
    cau('2026-10-12', 'dung_ngay'), cau('2026-10-12', 'dung_ngay'), cau('2026-10-12', 'dung_ngay'),
    cau('2026-10-12', 'dung_sau_goi_y'), // nhờ gợi ý: không vào mẫu số
    cau('2026-10-12', 'dung_lan_2'), // tự làm nhưng không đúng ngay
    cau('2026-10-12', 'sai'), cau('2026-10-12', 'het_gio'),
    cau('2026-10-12', 'bo_qua') // bỏ dở: không tính
  ];
  deq(BC.tiLeTuLam(ds), { tu_lam: 6, dung: 3, ti_le: 0.5 });
  assert.equal(BC.tiLeTuLam([]).ti_le, null);
  const m = HT.mucKyNang(ds, HT.tapDaSua(ds), '2026-10-12');
  assert.equal(m.tu_lam_14_ngay, 6);
  assert.equal(m.tu_lam_dung_14_ngay, 0.5, 'cùng định nghĩa với mức thành thạo');
  assert.ok(BC.laCauSai(cau('2026-10-12', 'dung_lan_2')), 'đúng lần 2 vẫn có một lần chốt sai');
  assert.ok(BC.laCauSai(cau('2026-10-12', 'het_gio')));
  assert.ok(!BC.laCauSai(cau('2026-10-12', 'dung_sau_goi_y')));
});

/* ---------------- Tổng quan tuần ---------------- */

function duLieuTuan() {
  // Tuần 12/10 đến 18/10 (hôm nay 14/10) và tuần trước 5/10 đến 11/10
  const cauDs = [], vanDs = [];
  const them = (ngay, kn, ketQuaDs, o) => {
    ketQuaDs.forEach((kq) => cauDs.push(cau(ngay, kq, Object.assign({ ky_nang: kn, van: 'va_' + ngay + '_' + kn }, o || {}))));
  };
  // Tuần trước: trừ có nhớ, 10 câu, 6 đúng
  them('2026-10-06', 'tru-nho-2cs-2cs', ['dung_ngay', 'dung_ngay', 'dung_ngay', 'dung_ngay', 'dung_ngay', 'dung_ngay', 'sai', 'sai', 'sai', 'sai']);
  vanDs.push(van('2026-10-06', { van: 'va_2026-10-06_tru-nho-2cs-2cs', giay: 400, nguon: 'hoc_moi' }));
  // Tuần này: trừ có nhớ yếu (quên mượn lặp lại), cộng qua 10 đã thuộc, lật thẻ cộng có nhớ đang luyện
  them('2026-10-12', 'tru-nho-2cs-2cs', ['dung_ngay', 'sai', 'sai', 'dung_sau_goi_y', 'bo_qua']);
  them('2026-10-13', 'tru-nho-2cs-2cs', ['sai', 'dung_ngay', 'dung_ngay']);
  vanDs.push(van('2026-10-12', { van: 'va_2026-10-12_tru-nho-2cs-2cs', giay: 330, cam_xuc: 'vui' }));
  vanDs.push(van('2026-10-13', { van: 'va_2026-10-13_tru-nho-2cs-2cs', giay: 270, cam_xuc: 'vui' }));
  const cq = { ma_cau: '2.8|cong-qua-10|8+5', noi_dung: '2.8', de: '8 + 5 = ?', cau_truc: { phep: '+', so: [8, 5], an: 'ket_qua' }, dap_an: 13, cac_tra_loi: [13], tra_loi_sai: [], loi: [] };
  for (const n of ['2026-10-05', '2026-10-06', '2026-10-12']) them(n, 'cong-qua-10', Array(11).fill('dung_ngay'), Object.assign({ game: 'lat-the' }, cq));
  vanDs.push(van('2026-10-12', { van: 'va_2026-10-12_cong-qua-10', game: 'lat-the', giay: 180, cam_xuc: 'binh_thuong', luc: '2026-10-12T19:30:00.000+07:00' }));
  vanDs.push(van('2026-10-05', { van: 'va_2026-10-05_cong-qua-10', game: 'lat-the', giay: 200 }));
  vanDs.push(van('2026-10-06', { van: 'va_2026-10-06_cong-qua-10', game: 'lat-the', giay: 200 }));
  const cn = { ma_cau: '2.11|cong-nho-2cs-2cs|36+27', noi_dung: '2.11', de: '36 + 27 = ?', cau_truc: { phep: '+', so: [36, 27], an: 'ket_qua' }, dap_an: 63, game: 'lat-the' };
  them('2026-10-13', 'cong-nho-2cs-2cs', ['dung_ngay', 'dung_ngay', 'dung_ngay', 'dung_lan_2'], Object.assign({}, cn, { cac_tra_loi: [63], tra_loi_sai: [], loi: [] }));
  cauDs[cauDs.length - 1].cac_tra_loi = [53, 63]; cauDs[cauDs.length - 1].tra_loi_sai = [53]; cauDs[cauDs.length - 1].loi = ['quen-nho'];
  vanDs.push(van('2026-10-13', { van: 'va_2026-10-13_cong-nho-2cs-2cs', game: 'lat-the', giay: 150, luc: '2026-10-13T19:40:00.000+07:00' }));
  cauDs.sort((a, b) => (a.luc < b.luc ? -1 : 1));
  vanDs.sort((a, b) => (a.luc < b.luc ? -1 : 1));
  return { hoSo: hoSoBe(), cauDs, vanDs, hocTap: null };
}

test('tổng quan tuần: phút, ngày chơi, câu đã làm, tỉ lệ, giỏi, đang luyện, cần giúp, thích nhất, 4 tuần', () => {
  const { BC } = moi();
  const du = duLieuTuan();
  const t = BC.tongQuanTuan(du, '2026-10-14', '2026-10-14');
  assert.equal(t.tu, '2026-10-12');
  assert.equal(t.den, '2026-10-18');
  assert.equal(t.giay, 330 + 270 + 180 + 150);
  assert.equal(t.phut, 16);
  assert.equal(t.so_ngay_choi, 2);
  deq(t.ngay_choi, ['2026-10-12', '2026-10-13']);
  const cauTuan = du.cauDs.filter((c) => c.ngay >= '2026-10-12');
  assert.equal(t.so_cau, cauTuan.length - 1, 'câu bỏ dở không tính là đã làm');
  // tự làm: 8 câu trừ (bỏ 1 gợi ý, 1 bỏ dở) + 11 cộng qua 10 + 4 cộng có nhớ; đúng ngay: 3 + 11 + 3
  assert.equal(t.tu_lam, 6 + 11 + 4);
  assert.equal(t.tu_lam_dung, 3 + 11 + 3);
  assert.equal(t.ti_le, Math.round(17 / 21 * 100) / 100);
  assert.ok(t.gioi.some((x) => x.ky_nang === 'cong-qua-10'), 'cộng qua 10 đã thuộc (33 câu đúng qua 3 ngày)');
  const cg = t.can_giup.find((x) => x.ky_nang === 'tru-nho-2cs-2cs');
  assert.ok(cg, 'trừ có nhớ: quên mượn lặp 3 lần trong 7 ngày thì Cần giúp');
  assert.equal(cg.loi, 'quen-muon');
  assert.ok(cg.vi_du, 'có câu sai thật làm ví dụ');
  assert.equal(cg.vi_du.chu, 'Hay quên mượn 1: 62 − 38, con ra 34');
  assert.ok(cg.vi_du.ngay >= '2026-10-12', 'ví dụ lấy trong tuần đang xem');
  assert.ok(du.cauDs.find((c) => c.cau === cg.vi_du.cau), 'ví dụ trỏ tới một câu có thật');
  assert.ok(t.dang_luyen.some((x) => x.ky_nang === 'cong-nho-2cs-2cs' && x.ti_le_tuan === 0.75));
  assert.ok(!t.dang_luyen.some((x) => x.ky_nang === 'tru-nho-2cs-2cs'), 'kỹ năng Cần giúp không lặp ở Đang luyện');
  assert.equal(t.thich_nhat.game, 'dua-xe', '2 ván tự chọn + 2 lần Vui');
  assert.equal(t.thich_nhat.vui, 2);
  deq(t.xu_huong.map((w) => w.tu), ['2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12']);
  assert.equal(t.xu_huong[0].ti_le, null, 'tuần chưa chơi');
  assert.equal(t.xu_huong[2].tu_lam, 10 + 22);
  assert.equal(t.xu_huong[2].ti_le, Math.round(28 / 32 * 100) / 100);
  assert.equal(t.xu_huong[3].ti_le, t.ti_le);
  assert.equal(t.trong, false);
  // Tuần trước: mức thành thạo tính tới Chủ nhật của tuần đó
  const tt = BC.tongQuanTuan(du, '2026-10-05', '2026-10-14');
  assert.equal(tt.moc, '2026-10-11');
  assert.equal(tt.so_cau, 10 + 22);
  // Bé mới, tuần trống
  const trong = BC.tongQuanTuan({ hoSo: hoSoBe(), cauDs: [], vanDs: [], hocTap: null }, '2026-10-14', '2026-10-14');
  assert.equal(trong.chua_choi, true);
  assert.equal(trong.ti_le, null);
  assert.equal(trong.thich_nhat, null);
  assert.equal(BC.tongQuanTuan(du, '2026-09-21', '2026-10-14').trong, true);
});

test('Cần giúp: ví dụ ưu tiên câu trong tuần, câu chưa sửa, rồi câu gần nhất; đúng lỗi chính', () => {
  const { BC, HT } = moi();
  const a = cau('2026-10-05', 'sai', { luc: '2026-10-05T19:00:00.000+07:00' }); // tuần trước
  const b = cau('2026-10-12', 'sai', { luc: '2026-10-12T19:00:00.000+07:00', de: '51 − 27 = ?', cau_truc: { phep: '-', so: [51, 27], an: 'ket_qua' }, dap_an: 24, tra_loi_sai: [34], cac_tra_loi: [34] });
  const c = cau('2026-10-13', 'sai', { luc: '2026-10-13T19:00:00.000+07:00', de: '70 − 45 = ?', cau_truc: { phep: '-', so: [70, 45], an: 'ket_qua' }, dap_an: 25, tra_loi_sai: [35], cac_tra_loi: [35] });
  const sua = cau('2026-10-13', 'dung_ngay', { luc: '2026-10-13T19:05:00.000+07:00', on_lai: true, on_lai_cua: c.cau, sua_duoc_cau: c.cau, de: '70 − 45 = ?' });
  const khac = cau('2026-10-13', 'sai', { luc: '2026-10-13T19:06:00.000+07:00', loi: ['tru-nguoc'], tra_loi_sai: [36], cac_tra_loi: [36] });
  const ds = [a, b, c, sua, khac];
  const daSua = HT.tapDaSua(ds);
  assert.equal(BC.viDuCauSai(ds, 'tru-nho-2cs-2cs', 'quen-muon', '2026-10-12', '2026-10-14', daSua).cau, b.cau, 'câu c đã sửa nên chọn b (chưa sửa)');
  assert.equal(BC.viDuCauSai(ds, 'tru-nho-2cs-2cs', 'tru-nguoc', '2026-10-12', '2026-10-14', daSua).cau, khac.cau, 'đúng lỗi được hỏi');
  assert.equal(BC.viDuCauSai([a], 'tru-nho-2cs-2cs', 'quen-muon', '2026-10-12', '2026-10-14', {}).cau, a.cau, 'không có trong tuần thì lấy trong 14 ngày');
  assert.equal(BC.viDuCauSai([a], 'tru-nho-2cs-2cs', 'quen-muon', '2026-10-26', '2026-10-28', {}), null, 'quá 14 ngày thì không có');
  assert.equal(BC.conRa(b), 'con ra 34');
});

/* ---------------- Nhật ký chi tiết ---------------- */

test('nhật ký: ngày mới nhất trước, ván theo giờ, câu có lựa chọn, lỗi, giây, đã sửa hay chưa; lọc câu sai, mã nội dung, mã lỗi', () => {
  const { BC } = moi();
  const du = duLieuTuan();
  const nk = BC.nhatKy(du, { tu: '2026-10-12', den: '2026-10-18' });
  deq(nk.ngay.map((n) => n.ngay), ['2026-10-13', '2026-10-12']);
  assert.equal(nk.ngay[0].thu, 'Thứ Ba 13/10');
  const n12 = nk.ngay[1];
  deq(n12.van.map((v) => v.gio), ['19:00', '19:30'], 'ván trong ngày theo giờ');
  assert.equal(n12.so_van, 2);
  const v = n12.van[0];
  assert.equal(v.ten_game, 'Đua Xe');
  assert.equal(v.ten_man_ngan, 'vùng 4 màn 5');
  assert.equal(v.ten_cam_xuc, 'Vui');
  assert.equal(v.cau.length, 5);
  const dong = v.cau.find((r) => r.ket_qua === 'sai');
  assert.equal(dong.de, '62 − 38');
  deq(dong.tra_loi, [{ chu: '34', sai: true }]);
  deq(dong.loi.map((l) => l.ten), ['quên mượn 1']);
  assert.equal(dong.nhan_trang_thai, 'chưa sửa');
  assert.equal(v.cau.find((r) => r.ket_qua === 'bo_qua').nhan_trang_thai, 'bỏ dở');
  // Lọc
  const sai = BC.nhatKy(du, { tu: '2026-10-12', den: '2026-10-18', loc: { loai: 'sai' } });
  assert.ok(sai.so_khop > 0 && sai.ngay.every((n) => n.van.every((x) => x.cau.every((r) => r.sai))));
  assert.equal(sai.so_khop, nk.so_sai);
  assert.ok(sai.ngay.every((n) => n.van.every((x) => x.cau.length)), 'ván không có câu khớp thì ẩn');
  const nd = BC.nhatKy(du, { tu: '2026-10-12', den: '2026-10-18', loc: { loai: 'noi_dung', ma: '2.8' } });
  assert.equal(nd.so_khop, 11);
  const loi = BC.nhatKy(du, { tu: '2026-10-12', den: '2026-10-18', loc: { loai: 'loi', ma: 'quen-nho' } });
  assert.equal(loi.so_khop, 1);
  assert.equal(loi.ngay[0].van[0].cau[0].nhan_trang_thai, 'đúng lần 2');
  deq(nk.chip_noi_dung.map((x) => x.ma), ['2.8', '2.11'], 'chip mã nội dung theo thứ tự số');
  assert.equal(nk.chip_loi[0].ma, 'quen-muon');
  // Một ngày
  const mot = BC.nhatKy(du, { tu: '2026-10-13', den: '2026-10-13' });
  deq(mot.ngay.map((n) => n.ngay), ['2026-10-13']);
});

/* ---------------- Thao tác và dòng thời gian ---------------- */

test('thao tác: mỗi kiểu trong lược đồ có câu tiếng Việt; đổi làn biết đổi sang, đổi về, lại sang; kiểu lạ có câu chung', () => {
  const { BC } = moi();
  const ct = { phep: '+', so: [36, 27], an: 'ket_qua' };
  for (const k of KIEU_THAO_TAC) {
    const s = BC.moTaThaoTac({ kieu: k, doi_tuong: 'qua_can', gia_tri: 5, den: 'dia_trai', tu: 'dia_phai' }, { ct, dap_an: 63 });
    assert.ok(typeof s === 'string' && s.length > 3, k);
    assert.ok(!/undefined|null|NaN|\[object/.test(s), k + ': ' + s);
    assert.ok(!/^Thao tác “/.test(s), k + ' phải có câu riêng: ' + s);
  }
  const nc = { ct, dap_an: 63 };
  assert.equal(BC.moTaThaoTac({ kieu: 'doi_lan', tu: 'lan_giua', den: 'lan_trai', gia_tri_duoi_xe: 53 }, nc), 'Đổi sang làn 53');
  assert.equal(BC.moTaThaoTac({ kieu: 'doi_lan', tu: 'lan_trai', den: 'lan_giua', gia_tri_duoi_xe: 63 }, nc), 'Đổi về làn 63 (đáp án đúng)');
  assert.equal(BC.moTaThaoTac({ kieu: 'doi_lan', tu: 'lan_giua', den: 'lan_trai', gia_tri_duoi_xe: 53 }, nc), 'Lại sang làn 53');
  assert.equal(BC.moTaThaoTac({ kieu: 'go_so', gia_tri: 3, hien_tai: '3' }, {}), 'Gõ 3, ô số: 3');
  assert.equal(BC.moTaThaoTac({ kieu: 'xoa', hien_tai: '' }, {}), 'Xóa hết số đã gõ');
  assert.equal(BC.moTaThaoTac({ kieu: 'xoa', hien_tai: '3' }, {}), 'Xóa một chữ số, còn 3');
  assert.equal(BC.moTaThaoTac({ kieu: 'tha', doi_tuong: 'khoi_don_vi', den: 'cot_dv', gia_tri: 30, gop: '10 đơn vị thành 1 chục' }, {}), 'Thả 1 khối đơn vị vào cột Đơn vị, thành 30 (10 đơn vị thành 1 chục)');
  assert.equal(BC.moTaThaoTac({ kieu: 'bo_chon', doi_tuong: 'thanh_chuc', tu: 'cot_chuc', gia_tri: 25 }, {}), 'Lấy ra 1 thanh chục ở cột Chục, còn 25');
  assert.equal(BC.moTaThaoTac({ kieu: 'lat', doi_tuong: 'the_phep', vi_tri: 'the_phep_2', gia_tri: '35 − 8' }, {}), 'Lật thẻ phép tính (thứ 2): 35 − 8');
  assert.equal(BC.moTaThaoTac({ kieu: 'chon', doi_tuong: 'the_kq', vi_tri: 'the_kq_3', gia_tri: 27 }, { dap_an: 27 }), 'Chọn thẻ kết quả 27 (đáp án đúng)');
  assert.equal(BC.moTaThaoTac({ kieu: 'chon', doi_tuong: 'the_phep', gia_tri: '36+27' }, { ct: { loai: 'loi_van' } }), 'Chọn phép tính 36 + 27');
  assert.equal(BC.moTaThaoTac({ kieu: 'cham', doi_tuong: 'nut_lao_toi', gia_tri: 63, lan: 'lan_giua' }, nc), 'Chạm “Lao tới” ở làn 63');
  assert.equal(BC.moTaThaoTac({ kieu: 'cham', doi_tuong: 'nut_que_tinh' }, nc), 'Mở cách xem bằng que tính');
  assert.equal(BC.moTaThaoTac({ kieu: 'nghe_lai', doi_tuong: 'de' }, nc), 'Nghe lại đề');
  assert.equal(BC.moTaThaoTac({ kieu: 'rot', gia_tri: 1, don_vi: 'l', tong: 3 }, {}), 'Rót nước: 1 l, trong bình có 3 l');
  assert.equal(BC.moTaThaoTac({ kieu: 'keo', doi_tuong: 'to_tien', gia_tri: 500, den: 'khay', tong: 700 }, {}), 'Kéo tờ tiền 500 tới khay (tổng 700)');
  assert.match(BC.moTaThaoTac({ kieu: 'lam_phep_thuat', mau: 'xanh' }, {}), /^Thao tác “lam phep thuat”: mau xanh$/);
});

test('dòng thời gian: ván Đua Xe thật: mốc giây, đổi làn, chốt sai có tên lỗi, xem lời giải, câu làm lại 2 câu sau, nhận xét', async () => {
  const ctx = moi();
  const { BC, HT } = ctx;
  const { evs } = await choiKichBan(ctx);
  deq(kiemLuocDo(evs), []);
  const hien = evs.filter((e) => e.loai === 'cau_hien');
  const hSai = hien[1];
  const vanEv = evs.filter((e) => e.van === hSai.van);
  const cauDs = HT.tomTatCacCau(vanEv);
  const tl = BC.dongThoiGian(vanEv, hSai.cau, { cauDs });
  assert.ok(tl);
  assert.equal(tl.stt, 2);
  assert.equal(tl.tong, hien.length);
  assert.equal(tl.muc[0].moc, '0 s');
  assert.equal(tl.muc[0].kieu, 'hien');
  assert.match(tl.muc[0].chu, /^Câu hiện: /);
  assert.match(tl.muc[0].chu, new RegExp('\\*\\*' + hSai.du_lieu.dap_an + '\\*\\*'), 'đáp án đúng in đậm');
  const doiLan = tl.muc.filter((m) => /làn/.test(m.chu) && m.kieu === 'thao_tac');
  assert.ok(doiLan.length >= 2);
  assert.ok(doiLan.some((m) => /\(đáp án đúng\)/.test(m.chu)), 'con có lúc đứng ở làn đúng');
  const chot = tl.muc.find((m) => m.loai === 'tra_loi');
  assert.equal(chot.kieu, 'sai');
  assert.match(chot.chu, /^Vào cổng \*\*\d+\*\* · sai · \*\*/);
  assert.ok(tl.muc.some((m) => m.loai === 'phan_hoi_xem' && /Xem cách làm 6,4 giây, có mở que tính/.test(m.chu)));
  assert.ok(tl.muc.some((m) => m.loai === 'cau_ket_thuc' && /quay lại sau 2 câu/.test(m.chu)));
  for (let i = 1; i < tl.muc.length; i++) assert.ok(tl.muc[i].ms >= tl.muc[i - 1].ms, 'mốc giây tăng dần');
  assert.equal(tl.lam_lai.length, 1);
  assert.equal(tl.lam_lai[0].moc, '2 câu sau');
  assert.equal(tl.lam_lai[0].dung, true);
  assert.match(tl.lam_lai[0].chu, /^Làm lại \d+ \+ \d+: đúng ngay trong [\d,]+ giây$/);
  assert.equal(tl.duong.loai, 'lan');
  assert.match(tl.duong.chu, /^Đường xe của con: (trái|giữa|phải)( → (trái|giữa|phải))+, vào cổng \d+$/);
  assert.ok(tl.lua_chon.some((x) => x.dung) && tl.lua_chon.some((x) => x.be_chot && !x.dung));
  assert.match(tl.nhan_xet, /chần chừ giữa/);
  assert.match(tl.nhan_xet, /Khi câu quay lại \(2 câu sau\), con làm đúng/);
  assert.match(tl.nhan_xet, /xem cách làm 6,4 giây và mở cả que tính/i);
  // Câu làm lại biết nó là lần làm lại của câu nào
  const lai = hien.find((e) => e.du_lieu.on_lai_cua === hSai.cau);
  const tl2 = BC.dongThoiGian(vanEv, lai.cau, { cauDs });
  assert.ok(tl2.la_lam_lai_cua && tl2.la_lam_lai_cua.cung_van);
  assert.equal(tl2.la_lam_lai_cua.cau, hSai.cau);
  assert.match(tl2.muc[0].chu, /^Câu hiện lại để con làm lại/);
  assert.ok(tl2.muc.some((m) => /sửa được câu đã sai/.test(m.chu)));
  // Câu có gợi ý
  const tl3 = BC.dongThoiGian(vanEv, hien[2].cau, { cauDs });
  assert.ok(tl3.muc.some((m) => m.kieu === 'goi_y' && /^Xin gợi ý cấp 1: “/.test(m.chu)));
  // Làm lại ở ván sau (tóm tắt câu của ván khác)
  const sau = Object.assign({}, cauDs.find((c) => c.cau === hSai.cau), { cau: 'c_SAU', van: 'va_SAU', ngay: '2026-10-14', luc: '2026-10-14T19:00:00.000+07:00', on_lai: true, on_lai_cua: hSai.cau, ket_qua: 'dung_ngay', giay: 4.2 });
  const tl4 = BC.dongThoiGian(vanEv, hSai.cau, { cauDs: cauDs.concat([sau]) });
  assert.equal(tl4.lam_lai.length, 2);
  assert.equal(tl4.lam_lai[1].moc, 'Thứ Tư 14/10 19:00');
  assert.equal(tl4.lam_lai[1].cung_van, false);
  // Câu không có trong nhật ký gốc
  assert.equal(BC.dongThoiGian(vanEv, 'c_KHONG_CO', {}), null);
});

test('dòng thời gian: sự kiện lạ và kiểu thao tác chưa biết không làm vỡ; nhận xét giải thích quên mượn theo SGK', () => {
  const { BC } = moi();
  const b = { v: 1, be: 'be_X', phien: 'ph_1', van: 'va_1', game: 'ban-thien-thach', vung: 4, man: 'v4-m8' };
  const luc = (ms) => '2026-10-12T19:09:' + String(Math.floor(ms / 1000)).padStart(2, '0') + '.' + String(ms % 1000).padStart(3, '0') + '+07:00';
  const ev = (i, loai, ms, du, cauId) => Object.assign({}, b, { id: '01J0000000000000000000000' + i, luc: luc(ms), ms, loai, du_lieu: du }, cauId === null ? {} : { cau: cauId || 'c_1' });
  const evs = [
    ev('A', 'cau_hien', 0, { ma_cau: '2.11|tru-nho-2cs-2cs|62-38', noi_dung: '2.11', ky_nang: 'tru-nho-2cs-2cs', dang: 'nhap_so', de: '62 − 38 = ?', cau_truc: { phep: '-', so: [62, 38], an: 'ket_qua' }, dap_an: 24, on_lai: false, lan_gap_thu: 1 }),
    ev('B', 'thao_tac', 2100, { kieu: 'go_so', gia_tri: 3, hien_tai: '3' }),
    ev('C', 'tam_dung', 3000, { nguon: 'nut' }, null),
    ev('D', 'tiep_tuc', 5000, { nguon: 'nut' }, null),
    ev('E', 'thao_tac', 6000, { kieu: 'kieu_moi_la', thu: 1 }),
    ev('F', 'thao_tac', 7000, { kieu: 'go_so', gia_tri: 4, hien_tai: '34' }),
    ev('G', 'tra_loi', 12000, { gia_tri: 34, dung: false, loi: ['quen-muon'], lan_thu: 1, so_lan_doi_y: 0, goi_y_cap: 0, nhap: '34' }),
    ev('H', 'cau_ket_thuc', 12100, { ket_qua: 'sai', tong_giay: 12 })
  ];
  const tl = BC.dongThoiGian(evs, 'c_1', { cauDs: [] });
  deq(tl.muc.map((m) => m.chu), [
    'Câu hiện', 'Gõ 3, ô số: 3', 'Tạm dừng', 'Chơi tiếp', 'Thao tác “kieu moi la”: thu 1', 'Gõ 4, ô số: 34',
    'Gõ xong: **34** · sai · **quên mượn 1**', 'Xong câu: chưa đúng'
  ]);
  deq(tl.muc.map((m) => m.moc), ['0 s', '2,1 s', '3 s', '5 s', '6 s', '7 s', '12 s', '12,1 s']);
  assert.equal(tl.duong.chu, 'Con gõ lần lượt: 3, 4');
  assert.match(tl.nhan_xet, /Con tính đúng hàng đơn vị \(12 − 8 = 4\) nhưng quên nhớ 1 ở hàng chục \(3 thêm 1 bằng 4, rồi 6 − 4\)\./);
  assert.match(tl.nhan_xet, /Câu này chưa được làm lại/);
});

test('dòng thời gian: bài toán có lời văn gộp dòng chọn phép trùng, nhận xét giải thích phép tính bên trong, xem lời giải ở lúc mở', () => {
  const { BC } = moi();
  const b = { v: 1, be: 'be_X', phien: 'ph_1', van: 'va_2', game: 'truyen-tranh', vung: 4, man: 'v4-m6', cau: 'c_2' };
  const ev = (i, loai, ms, du) => Object.assign({}, b, { id: '01J00000000000000000000B0' + i, luc: '2026-09-24T15:11:0' + Math.floor(ms / 1000) + '.000+07:00', ms, loai, du_lieu: du });
  const ct = { loai: 'loi_van', mau: 'x', dang: 'them', phep: '+', so: [29, 2], nv: {} };
  const tl = BC.dongThoiGian([
    ev('A', 'cau_hien', 0, { ma_cau: '2.18|toan-loi-van-100|x:29+2', noi_dung: '2.18', ky_nang: 'toan-loi-van-100', dang: 'hai_buoc', de: 'Trên khay có 29 quả trứng...', cau_truc: ct, dap_an: 31, lua_chon: [{ gia_tri: '29+2', loi: [] }, { gia_tri: '29-2', loi: ['sai-phep'] }], on_lai: false }),
    ev('B', 'thao_tac', 3600, { kieu: 'chon', doi_tuong: 'the_phep', gia_tri: '29+2' }),
    ev('C', 'tra_loi', 3610, { gia_tri: '29+2', dung: true, loi: [], lan_thu: 1, buoc: 1, so_lan_doi_y: 0, goi_y_cap: 0 }),
    ev('D', 'thao_tac', 5100, { kieu: 'go_so', gia_tri: 2, hien_tai: '2' }),
    ev('E', 'thao_tac', 5600, { kieu: 'go_so', gia_tri: 1, hien_tai: '21' }),
    ev('F', 'tra_loi', 6200, { gia_tri: 21, dung: false, loi: ['quen-nho'], lan_thu: 2, buoc: 2, so_lan_doi_y: 0, goi_y_cap: 0, nhap: '21' }),
    ev('G', 'phan_hoi_xem', 9800, { ma_loi_giai: 'dat-tinh', giay_xem: 3.5, nut: 'choi_tiep' }),
    ev('H', 'cau_ket_thuc', 9810, { ket_qua: 'sai', tong_giay: 6.2 })
  ], 'c_2', { cauDs: [] });
  deq(tl.muc.map((m) => m.chu).slice(0, 2), ['Câu hiện: **29 + 2** · 29 − 2', 'Chọn phép tính **29 + 2** · đúng'], 'không lặp dòng "Chọn phép tính"');
  assert.equal(tl.muc.find((m) => m.loai === 'phan_hoi_xem').moc, '6,3 s', 'mốc ở lúc màn lời giải mở (9,8 − 3,5)');
  assert.match(tl.nhan_xet, /Con cộng hàng đơn vị đúng \(9 \+ 2 = 11, viết 1\) nhưng quên nhớ 1 sang hàng chục\./);
  assert.equal(tl.de_ngan, 'Bài toán 29 + 2');
});

/* ---------------- Bản đồ kỹ năng ---------------- */

test('bản đồ kỹ năng: đúng 43 ô trong 10 vùng theo thứ tự đảo; mức ô là mức thấp nhất đã luyện; chấm đỏ Cần giúp', () => {
  const { BC, NH, DAO } = moi();
  const hs = {
    ky_nang: [
      { ma: '2.11', ky_nang: 'cong-nho-2cs-2cs', muc: 'da_thuoc', can_giup: false, so_cau: 40 },
      { ma: '2.11', ky_nang: 'tru-nho-2cs-2cs', muc: 'dang_luyen', can_giup: true, so_cau: 30 },
      { ma: '2.8', ky_nang: 'cong-qua-10', muc: 'vung_chac', can_giup: false, so_cau: 90 },
      { ma: '2.5', ky_nang: 'lien-truoc-sau-100', muc: 'lam_quen', can_giup: false, so_cau: 6 }
    ]
  };
  const bd = BC.banDoKyNang(hs);
  assert.equal(bd.so_o, 43);
  assert.equal(bd.vung.length, 10);
  deq(bd.vung.map((v) => v.so), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const tatCa = bd.vung.flatMap((v) => v.o.map((o) => o.ma));
  assert.equal(new Set(tatCa).size, 43);
  deq(tatCa.slice().sort(), Object.keys(NH.NOI_DUNG).sort(), 'đủ 43 nội dung của ngân hàng');
  const o = (ma) => bd.vung.flatMap((v) => v.o).find((x) => x.ma === ma);
  assert.equal(o('2.11').muc, 'dang_luyen', 'mức thấp nhất trong các kỹ năng đã luyện');
  assert.equal(o('2.11').can_giup, true);
  assert.equal(o('2.8').muc, 'vung_chac');
  assert.equal(o('2.5').muc, 'lam_quen');
  assert.equal(o('B2.14').muc, 'chua_hoc');
  assert.equal(o('B2.14').ten_muc, 'Chưa học');
  assert.equal(BC.banDoKyNang(null).so_o, 43);
  deq(bd.vung.find((v) => v.so === 4).o.map((x) => x.ma), DAO.vung(4).noi_dung);
  deq(bd.chu_giai.map((x) => x.ten), ['Chưa học', 'Làm quen', 'Đang luyện', 'Đã thuộc', 'Vững chắc']);
});

test('chi tiết nội dung: tỉ lệ 14 ngày, số câu, giây trung vị, lỗi hay gặp, câu sai gần đây, màn và thể loại luyện nó', () => {
  const { BC } = moi();
  const du = duLieuTuan();
  const d = BC.chiTietNoiDung('2.11', du, '2026-10-14');
  assert.equal(d.ten, 'Cộng, trừ có nhớ trong phạm vi 100');
  assert.equal(d.vung, 4);
  const cua = du.cauDs.filter((c) => c.noi_dung === '2.11');
  assert.equal(d.so_cau, cua.filter((c) => c.ket_qua !== 'bo_qua').length);
  const tl = BC.tiLeTuLam(cua);
  assert.equal(d.ti_le_14, tl.ti_le);
  assert.equal(d.giay_trung_vi, 8);
  assert.equal(d.loi[0].ma, 'quen-muon');
  assert.equal(d.loi[0].ten, 'Quên mượn 1');
  deq(d.cau_sai_gan_day.map((c) => c.de), ['36 + 27', '62 − 38'], 'mỗi mã câu một lần, mới nhất trước');
  assert.ok(d.cau_sai_gan_day[0].ngay >= d.cau_sai_gan_day[d.cau_sai_gan_day.length - 1].ngay, 'mới nhất trước');
  deq(d.cau_sai_gan_day.find((c) => c.de === '62 − 38').sai, ['34']);
  const game = new Set(d.man.map((m) => m.game));
  assert.ok(game.has('dua-xe') && game.has('lat-the') && game.has('ban-thien-thach'), 'một nội dung, nhiều thể loại');
  assert.ok(d.man.some((m) => m.id === 'v4-m7'));
  deq(d.tien_quyet.map((x) => x.ma), ['2.8', '2.9', '2.10']);
  deq(d.ky_nang.map((k) => k.ky_nang).sort(), ['cong-nho-2cs-2cs', 'tru-nho-2cs-2cs'], 'các kỹ năng đã luyện của nội dung');
  assert.ok(BC.VIEC_CUNG_CON['2.11']);
});

/* ---------------- Kế hoạch tuần tới ---------------- */

test('kế hoạch tuần: luyện lại khác thể loại lần trước kèm lỗi chính, ôn nền theo tiên quyết, học mới theo bài đang học', () => {
  const { BC, DAO } = moi();
  const du = duLieuTuan();
  const kh = BC.keHoachTuan(du, '2026-10-14');
  assert.equal(kh.tu, '2026-10-19', 'thứ Hai tuần sau');
  assert.equal(kh.den, '2026-10-25');
  const ll = kh.muc.filter((m) => m.loai === 'luyen_lai');
  assert.ok(ll.length >= 1);
  const tru = ll.find((m) => m.ky_nang === 'tru-nho-2cs-2cs');
  assert.ok(tru, 'kỹ năng Cần giúp được luyện lại');
  assert.notEqual(DAO.man(tru.man).game, 'dua-xe', 'lần trước luyện bằng Đua Xe nên đổi thể loại');
  assert.ok(DAO.kyNangCuaMan(DAO.man(tru.man)).indexOf('tru-nho-2cs-2cs') >= 0);
  assert.equal(tru.ly_do, 'Con hay quên mượn 1');
  assert.match(tru.chi_tiet, /^Hay quên mượn 1 \(\d+ lần trong 14 ngày\)\. Đang Cần giúp/);
  assert.match(tru.choi, /^(Lật Thẻ Anh Em|Bắn Thiên Thạch) · (Đường Đua Có Nhớ, màn \d|Cúp)/);
  assert.match(tru.choi, /\(lần trước con luyện bằng Đua Xe\)$/);
  const nen = kh.muc.filter((m) => m.loai === 'on_nen');
  assert.ok(nen.length >= 1 && nen.length <= 2);
  assert.ok(nen.every((m) => ['2.8', '2.9', '2.10'].indexOf(m.noi_dung) >= 0), 'nền của 2.11');
  const moiDs = kh.muc.filter((m) => m.loai === 'hoc_moi');
  assert.ok(moiDs.length >= 1 && moiDs.length <= 2);
  assert.ok(moiDs.every((m) => DAO.man(m.man).bai_dau <= 23 + 3), 'theo bài đang học (Bài 23)');
  assert.ok(new Set(kh.muc.map((m) => m.man)).size === kh.muc.length, 'không trùng màn');
  deq(Object.keys(kh.ke_hoach_tuan), ['tu', 'den', 'muc']);
  assert.ok(kh.ke_hoach_tuan.muc.every((m) => deqKeys(m, ['loai', 'man', 'ky_nang', 'ly_do'])));
  assert.ok(kh.viec_cung_con.length >= 1 && kh.viec_cung_con.length <= 3);
  assert.equal(kh.viec_cung_con[0].ma, '2.11');
  // Bé mới: chỉ có học mới, vẫn có việc làm cùng con
  const moiBe = BC.keHoachTuan({ hoSo: hoSoBe({ bai_dang_hoc: 1 }), cauDs: [], vanDs: [], hocTap: null }, '2026-10-14');
  assert.ok(moiBe.muc.length && moiBe.muc.every((m) => m.loai === 'hoc_moi'));
  assert.ok(moiBe.viec_cung_con.length >= 1);
});
function deqKeys(o, k) { return JSON.stringify(Object.keys(o)) === JSON.stringify(k); }

test('làm cùng con: có việc cho đủ 43 nội dung, câu tiếng Việt không có gạch dài', () => {
  const { BC, NH } = moi();
  for (const ma of Object.keys(NH.NOI_DUNG)) {
    assert.ok(BC.VIEC_CUNG_CON[ma] && BC.VIEC_CUNG_CON[ma].length > 30, ma);
    assert.ok(!/\u2014/.test(BC.VIEC_CUNG_CON[ma]), ma);
  }
});

/* ---------------- Gói xuất cho trợ lý AI ---------------- */

const KY_THANG = ['cong-qua-10', 'tru-qua-10', 'tim-so-thieu-20', 'cong-tru-khong-nho-100', 'cong-nho-2cs-1cs', 'cong-nho-2cs-2cs', 'tru-nho-2cs-1cs', 'tru-nho-2cs-2cs', 'nham-tron-chuc',
  'bieu-thuc-2-dau', 'cau-tao-so-100', 'lien-truoc-sau-100', 'nhan-y-nghia', 'bang-nhan-2-5', 'bang-chia-2-5', 'cau-tao-so-1000', 'doc-so-1000', 'cong-tru-1000'];

test('gói xuất: đủ khóa theo spec 06 mục 5.9, không có tên thật, dưới 30 000 token với một tháng chơi nặng, ổn định', () => {
  const ctx = moi();
  const { BC } = ctx;
  const TEN = 'Zyxkhuê Bích';
  const p = hoSoBe({ id: 'be_TENTHAT01', ten: TEN, khung_long: { ten: 'Rồng Qwxyz', loai: 'rex', muc: 'thieu_nien', qua_mong: 1400 }, trung_vung: { 1: { ten: 'Bé Vbnmq' } } });
  const t = thangChoi(ctx, { tu: '2026-09-17', soNgay: 28, vanMoiNgay: 6, cauMoiVan: 12, be: p.id, ky: KY_THANG, pSai: { 'tru-nho-2cs-2cs': 0.4, 'cong-nho-2cs-2cs': 0.3, 'bang-nhan-2-5': 0.25 } });
  assert.equal(t.cauDs.length, 28 * 6 * 12);
  const du = { hoSo: p, cauDs: t.cauDs, vanDs: t.vanDs, hocTap: null };
  const o = { homNay: '2026-10-14', taoLuc: '2026-10-14T20:15:00.000+07:00', tuoi: 7 };
  const kq = BC.goiXuat(du, [], o);
  const s = kq.chuoi;
  // Riêng tư (YC-07)
  for (const x of [TEN, 'Zyxkhuê', p.id, 'TENTHAT', 'Qwxyz', 'Vbnmq']) assert.ok(s.indexOf(x) < 0, 'gói không được chứa ' + x);
  const g = JSON.parse(s);
  deq(Object.keys(g), ['loai_goi', 'phien_ban', 'tao_luc', 'be', 'huong_dan', 'tu_dien', 'ho_so', 'van_gan_day', 'cau_sai_tieu_bieu', 'hop_dong_dau_ra']);
  assert.equal(g.loai_goi, 'dao-khung-long/ho-so-hoc-tap');
  assert.equal(g.phien_ban, 1);
  deq(g.be, { bi_danh: 'be_1', tuoi: 7, lop: 2, bai_dang_hoc: 23, phong_cach: 'dung_manh' });
  for (const k of ['noi_dung', 'loi', 'muc', 'tien_quyet']) assert.ok(k in g.tu_dien, 'tu_dien.' + k);
  deq(g.tu_dien.muc, ['chua_hoc', 'lam_quen', 'dang_luyen', 'da_thuoc', 'vung_chac']);
  for (const k of ['ky_nang', 'so_thich', 'nhip']) assert.ok(k in g.ho_so, 'ho_so.' + k);
  assert.ok(g.ho_so.ky_nang.length === KY_THANG.length);
  for (const k of g.ho_so.ky_nang) for (const f of ['ma', 'ky_nang', 'muc', 'so_cau', 'tu_lam_dung_14_ngay', 'giay_trung_vi', 'loi_hay_gap', 'on_lai_ke_tiep']) assert.ok(f in k, f);
  assert.equal(g.van_gan_day.length, 20);
  assert.match(g.van_gan_day[0], /^2026-10-14 \d\d:\d\d: Ván /);
  assert.ok(g.cau_sai_tieu_bieu.length > 0 && g.cau_sai_tieu_bieu.length <= 30);
  for (const c of g.cau_sai_tieu_bieu) {
    for (const f of ['ma_cau', 'de', 'dap_an', 'be_chon', 'loi', 'thao_tac', 'giay', 'ngay']) assert.ok(f in c, f);
    assert.ok(c.thao_tac.length > 5);
    assert.ok(c.ngay >= '2026-09-17' && c.ngay <= '2026-10-14');
  }
  assert.equal(new Set(g.cau_sai_tieu_bieu.map((c) => c.ma_cau)).size, g.cau_sai_tieu_bieu.length, 'mỗi mã câu một lần');
  // Ưu tiên lỗi lặp lại: lỗi của câu đầu tiên là lỗi gặp nhiều nhất
  const tan = {};
  t.cauDs.filter((c) => c.ngay >= '2026-09-17' && c.loi.length).forEach((c) => c.loi.forEach((m) => { if (m !== 'khac') tan[m] = (tan[m] || 0) + 1; }));
  const nhieuNhat = Object.keys(tan).sort((a, b) => tan[b] - tan[a])[0];
  assert.ok(g.cau_sai_tieu_bieu[0].loi.indexOf(nhieuNhat) >= 0);
  // Từ điển chỉ có mã đã dùng
  const maDung = new Set(g.ho_so.ky_nang.map((k) => k.ma).concat(g.cau_sai_tieu_bieu.map((c) => c.ma_cau.split('|')[0])));
  const coTienQuyet = new Set([...maDung].flatMap((m) => ctx.NH.TIEN_QUYET[m] || []));
  for (const m of Object.keys(g.tu_dien.noi_dung)) assert.ok(maDung.has(m) || coTienQuyet.has(m), 'mã nội dung thừa: ' + m);
  assert.ok(Object.keys(g.tu_dien.noi_dung).length < 43);
  const loiDung = new Set();
  g.ho_so.ky_nang.forEach((k) => k.loi_hay_gap.forEach((l) => loiDung.add(l.ma)));
  g.cau_sai_tieu_bieu.forEach((c) => c.loi.forEach((m) => loiDung.add(m)));
  t.vanDs.slice(-20).forEach((v) => Object.keys(v.loi).forEach((m) => loiDung.add(m)));
  for (const m of Object.keys(g.tu_dien.loi)) assert.ok(loiDung.has(m), 'mã lỗi thừa: ' + m);
  for (const m of loiDung) assert.ok(g.tu_dien.loi[m], 'thiếu giải nghĩa lỗi ' + m);
  // Hợp đồng đầu ra
  for (const k of ['khuon', 'vi_du', 'quy_tac', 'gia_tri_hop_le']) assert.ok(k in g.hop_dong_dau_ra, k);
  deq(Object.keys(g.hop_dong_dau_ra.khuon), ['nhan_xet_cho_phu_huynh', 'nhiem_vu_de_xuat', 'bai_hoc_goi_y', 'loi_nhan_cho_be']);
  assert.equal(g.hop_dong_dau_ra.gia_tri_hop_le.noi_dung.length, 43);
  for (const x of g.hop_dong_dau_ra.vi_du.nhiem_vu_de_xuat) {
    assert.ok(g.hop_dong_dau_ra.gia_tri_hop_le.ky_nang.indexOf(x.ky_nang) >= 0);
    assert.ok(g.hop_dong_dau_ra.gia_tri_hop_le.game.indexOf(x.game) >= 0);
  }
  // Cỡ gói
  assert.equal(kq.token, BC.uocLuongToken(s));
  assert.equal(kq.token, Math.ceil(Buffer.byteLength(s, 'utf8') / 3), 'ước lượng = byte UTF-8 / 3');
  assert.ok(kq.token <= 30000, 'gói mặc định dưới 30 000 token, được ' + kq.token);
  assert.ok(!/\u2014/.test(s), 'không có gạch dài');
  // Ổn định
  assert.equal(BC.goiXuat(du, [], o).chuoi, s, 'cùng đầu vào thì cùng chuỗi');
});

test('gói xuất: câu thao tác dựng từ nhật ký gốc; tùy chọn kèm nhật ký 7 ngày không có mã bé, phiên, thiết bị', async () => {
  const ctx = moi();
  const { BC, HT } = ctx;
  const { evs } = await choiKichBan(ctx, 'be_XUATGOI1');
  const theoVan = {};
  evs.forEach((e) => { if (e.van) (theoVan[e.van] = theoVan[e.van] || []).push(e); });
  const cauDs = [], vanDs = [];
  Object.values(theoVan).forEach((ds) => { cauDs.push(...HT.tomTatCacCau(ds)); vanDs.push(HT.tomTatVan(ds, 'màn 2')); });
  const ngay = HT.ngayCua(evs[0].luc);
  const du = { hoSo: hoSoBe({ id: 'be_XUATGOI1', ten: 'Qưerty' }), cauDs, vanDs, hocTap: null };
  const kq = BC.goiXuat(du, evs, { homNay: ngay, taoLuc: ngay + 'T20:00:00.000+07:00', tuoi: 7 });
  const sai = kq.goi.cau_sai_tieu_bieu.find((c) => c.loi.length);
  assert.ok(sai, 'có câu sai');
  assert.match(sai.thao_tac, /^Đua Xe: đổi làn \d lần giữa \d+ và \d+, chọn \d+ sau [\d,]+ giây, xem cách làm 6,4 giây có mở que tính$/);
  assert.equal(sai.da_sua, true);
  const co = BC.goiXuat(du, evs, { homNay: ngay, taoLuc: ngay + 'T20:00:00.000+07:00', tuoi: 7, kemNhatKy: true });
  assert.ok(Array.isArray(co.goi.nhat_ky_7_ngay) && co.goi.nhat_ky_7_ngay.length > 20);
  assert.ok(co.token > kq.token);
  for (const e of co.goi.nhat_ky_7_ngay) {
    assert.ok(!('be' in e) && !('phien' in e) && !('id' in e), 'không có mã bé, phiên, mã sự kiện');
    assert.ok(!/^phien_|^phu_huynh_/.test(e.loai));
  }
  assert.ok(co.chuoi.indexOf('be_XUATGOI1') < 0 && co.chuoi.indexOf('Qưerty') < 0);
  assert.ok(co.chuoi.indexOf('thiet_bi') < 0, 'không có thông tin thiết bị');
});

/* ---------------- Hiệu năng ---------------- */

test('hiệu năng: bé chơi nặng (khoảng 5 000 sự kiện) tính tổng quan, bản đồ, nhật ký dưới 300 ms', () => {
  const ctx = moi();
  const { BC } = ctx;
  const t = thangChoi(ctx, { tu: '2026-09-17', soNgay: 28, vanMoiNgay: 3, cauMoiVan: 12, be: 'be_X', ky: KY_THANG });
  assert.ok(t.cauDs.length * 5 >= 5000, 'khoảng 5 câu cho mỗi sự kiện câu: ' + t.cauDs.length + ' câu');
  const du = { hoSo: hoSoBe(), cauDs: t.cauDs, vanDs: t.vanDs, hocTap: null };
  const t0 = process.hrtime.bigint();
  const tq = BC.tongQuanTuan(du, '2026-10-14', '2026-10-14');
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  BC.banDoKyNang(BC.hoSoTai(du, '2026-10-14'));
  BC.nhatKy(du, { tu: '2026-10-12', den: '2026-10-18', loc: { loai: 'sai' } });
  const tong = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(tq.so_cau > 0);
  assert.ok(ms < 300, 'tổng quan ' + ms.toFixed(1) + ' ms');
  assert.ok(tong < 600, 'tổng quan + bản đồ + nhật ký ' + tong.toFixed(1) + ' ms');
});

/* ---------------- Giao diện với DOM giả ---------------- */

function domGia(w) {
  const els = {};
  const tao = (id) => ({
    id, innerHTML: '', textContent: '', style: {}, scrollTop: 0, disabled: false,
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, on) { if (on === undefined) on = !this._s.has(c); if (on) this._s.add(c); else this._s.delete(c); return on; }, contains(c) { return this._s.has(c); } },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {}, addEventListener() {}, contains() { return true; },
    querySelector() { return null; }, querySelectorAll() { return []; }, scrollIntoView() {}, focus() {}
  });
  w.document.getElementById = (id) => els[id] || (els[id] = tao(id));
  w.document.querySelectorAll = () => [];
  return els;
}
const cho = () => new Promise((r) => setTimeout(r, 0));

test('giao diện: cổng phép tính, mọi màn vẽ được không có "undefined", chỉ ghi phu_huynh_* (YC-09), cài đặt qua hoSoDoi', async () => {
  const ctx = moi(null, ['js/goc-phu-huynh.js']);
  const { w, NK, HT, BC } = ctx;
  const els = domGia(w);
  const { evs } = await choiKichBan(ctx, 'be_GIAODIEN1');
  const theoVan = {};
  evs.forEach((e) => { if (e.van) (theoVan[e.van] = theoVan[e.van] || []).push(e); });
  const cauDs = [], vanDs = [];
  Object.values(theoVan).forEach((ds) => { cauDs.push(...HT.tomTatCacCau(ds)); vanDs.push(HT.tomTatVan(ds, 'màn 2')); });
  const ngay = HT.ngayCua(evs[0].luc);
  const p = hoSoBe({ id: 'be_GIAODIEN1', ten: 'Minh' });
  const hocTap = HT.hoSoHocTap(p.id, cauDs, vanDs, ngay);
  const luu = [], bao = [];
  let thoat = 0;
  const c = {
    A: { dsBe: [p], hoSo: p },
    hinh: (t) => 'assets/img/' + t + '.webp', hinhTen: (t) => (/[/.]/.test(t) ? t : 'assets/img/' + t + '.webp'),
    hinhKhungLong: (x, loai) => 'rex-' + (loai || 'kid'), tenKhungLong: () => 'Rex', soDep: (n) => String(Math.round(n || 0)), homNay: () => ngay,
    bao: (s) => bao.push(s), hien: () => {}, tenManNgan: () => 'màn 2',
    taiDuLieuBe: () => Promise.resolve({ hoSo: p, cauDs, vanDs, hocTap }),
    tinhLai: () => Promise.resolve({ so_van: 1, so_cau: cauDs.length, so_su_kien: evs.length, khop: true }),
    thoat: () => { thoat++; }, hoSoDoi: (x) => { luu.push(J(x)); return Promise.resolve(x); }, beBiXoa: () => {}
  };
  const truoc = (await NK.docCuaBe(p.id)).length;
  const G = w.GocPhuHuynh;
  G.mo('ban-do', c);
  const hoi = els['gp-hoi'].textContent;
  assert.match(hoi, /^\d\d × \d = \?$/, 'phép nhân của người lớn');
  // 3 lần sai thì thoát
  for (let i = 0; i < 3; i++) { G._dieuKhien.congGo('1'); G._dieuKhien.congGo('xong'); }
  assert.equal(thoat, 1);
  G.mo('ban-do', c);
  G._quaCong();
  await cho(); await cho();
  const than = () => els['gp-than'].innerHTML;
  const sach = (ten) => { assert.ok(than().length > 200, ten + ' trống'); assert.ok(!/undefined|NaN|\[object Object\]|>null</.test(than()), ten + ': ' + (than().match(/.{60}(undefined|NaN|\[object Object\]|>null<).{20}/) || [''])[0]); };
  assert.match(than(), /Tổng quan tuần/);
  assert.match(than(), /phút chơi/);
  sach('tổng quan');
  const D = G._dieuKhien;
  D.moTab('nhat_ky'); sach('nhật ký');
  assert.match(than(), /Nhật ký chi tiết/);
  assert.match(than(), /data-hd="xem-lai"/);
  D.nhatKy({ loai: 'sai' }); sach('nhật ký câu sai');
  const hSai = evs.filter((e) => e.loai === 'cau_hien')[1];
  D.moXemLai(hSai.cau, hSai.van);
  await cho(); await cho();
  sach('xem lại');
  assert.match(than(), /Nhận xét/);
  assert.match(than(), /2 câu sau/);
  assert.match(than(), /class="gp-lan"/, 'hình ba làn đường');
  D.dongCon();
  D.moTab('ky_nang'); sach('bản đồ kỹ năng');
  assert.equal((than().match(/class="gp-o-kn /g) || []).length, 43);
  D.kyNang('2.11'); sach('chi tiết 2.11');
  assert.match(than(), /Cộng, trừ có nhớ trong phạm vi 100/);
  D.moTab('ke_hoach'); sach('kế hoạch');
  assert.match(than(), /Kế hoạch tuần tới/);
  D.moTab('cai_dat'); sach('cài đặt');
  // Thời gian chơi: mặc định không giới hạn; có giới hạn thì cho thêm giờ riêng hôm nay (cộng dồn) hoặc không giới hạn hôm nay
  assert.match(than(), /Đang để không giới hạn \(mặc định\)/);
  assert.ok(!/Riêng hôm nay/.test(than()), 'chưa có giới hạn thì không có mục Riêng hôm nay');
  D.doiCaiDat('gioi_han_phut', 20);
  assert.match(than(), /Riêng hôm nay/);
  D.doiCaiDat('them_hom_nay', 15);
  D.doiCaiDat('them_hom_nay', 15);
  deq(J(p.them_hom_nay), { ngay: ngay, phut: 30 });
  assert.match(than(), /Hôm nay con được chơi 50 phút \(20 \+ 30 phút cho thêm\)/);
  D.doiCaiDat('them_hom_nay', 'vo_han');
  assert.equal(p.them_hom_nay.khong_gioi_han, true);
  assert.match(than(), /Hôm nay: không giới hạn/);
  D.doiCaiDat('them_hom_nay', null);
  assert.equal(p.them_hom_nay, null);
  sach('cài đặt có giới hạn');
  D.doiCaiDat('mo_khoa_vung', true);
  D.doiCaiDat('bai_dang_hoc', 30);
  D.doiCaiDat('lop', 3);
  assert.equal(luu[luu.length - 1].gioi_han_phut, 20);
  assert.equal(luu[luu.length - 1].mo_khoa_vung, true);
  assert.equal(luu[luu.length - 1].bai_dang_hoc, 30);
  assert.equal(luu[luu.length - 1].lop, 3);
  D.moTab('ke_hoach');
  D.dungKeHoach();
  const kh = luu[luu.length - 1].ke_hoach_tuan;
  assert.ok(kh && kh.tu && kh.den && kh.muc.length);
  assert.ok(kh.muc.every((m) => ['luyen_lai', 'on_nen', 'hoc_moi'].indexOf(m.loai) >= 0 && m.man && m.ky_nang && 'ly_do' in m));
  D.moXuatAi();
  await cho(); await cho();
  sach('xuất AI');
  const S = G._trangThai().S;
  assert.ok(S.xuat.kq && S.xuat.kq.token <= 30000);
  assert.match(than(), /Khoảng [\d ]+ token/);
  assert.ok(than().indexOf('Minh') < 0 || !/<pre>[^]*Minh/.test(than()), 'bản xem trước không có tên');
  // Chỉ ghi phu_huynh_*, hợp lệ lược đồ, không đổi thống kê của bé
  await NK.xa();
  const sau = (await NK.docCuaBe(p.id)).slice(truoc);
  assert.ok(sau.length >= 8);
  assert.ok(sau.every((e) => /^phu_huynh_(mo|cai_dat)$/.test(e.loai) || /^phien_/.test(e.loai)), sau.map((e) => e.loai).join(','));
  deq(kiemLuocDo(sau), []);
  const mo = sau.filter((e) => e.loai === 'phu_huynh_mo').map((e) => e.du_lieu.man);
  for (const m of ['tong_quan', 'nhat_ky', 'xem_lai', 'ky_nang', 'ke_hoach', 'cai_dat', 'xuat_ai']) assert.ok(mo.indexOf(m) >= 0, 'mở ' + m);
  const cd = sau.filter((e) => e.loai === 'phu_huynh_cai_dat');
  deq(cd.find((e) => e.du_lieu.truong === 'gioi_han_phut').du_lieu, { truong: 'gioi_han_phut', cu: null, moi: 20 });
  deq(cd.find((e) => e.du_lieu.truong === 'mo_khoa_vung').du_lieu, { truong: 'mo_khoa_vung', cu: false, moi: true });
  deq(cd.find((e) => e.du_lieu.truong === 'bai_dang_hoc').du_lieu, { truong: 'bai_dang_hoc', cu: 23, moi: 30 });
  assert.ok(cd.find((e) => e.du_lieu.truong === 'ke_hoach_tuan').du_lieu.moi.so_muc >= 1);
  const tomSau = HT.tomTatCacCau((await NK.docCuaBe(p.id)).filter((e) => e.van));
  assert.equal(tomSau.length, cauDs.length, 'mở báo cáo không thêm câu nào');
  assert.equal(BC.dauTuan(ngay), S.tuan);
  // Bé hết giờ nhờ bố mẹ cho chơi thêm: qua cổng là vào thẳng Cài đặt
  G.mo('ban-do', c, 'cai_dat');
  G._quaCong();
  await cho(); await cho();
  assert.equal(S.tab, 'cai_dat');
  assert.match(than(), /Thời gian chơi mỗi ngày/);
  assert.match(than(), /Riêng hôm nay/);
  // "Cho thêm 15 phút" tính từ bây giờ, kể cả khi bé đã chơi quá giờ (bé được chơi nốt ván dở)
  vanDs.push({ van: 'van_gia', ngay: ngay, giay: 25 * 60, luc: ngay + 'T20:00:00' });
  D.doiCaiDat('gioi_han_phut', 5);
  D.doiCaiDat('them_hom_nay', 15);
  const daChoi = vanDs.reduce((s, v) => s + (v.ngay === ngay ? v.giay || 0 : 0), 0) / 60;
  assert.equal(w.HoSo.gioiHanHomNay(p, ngay), Math.ceil(daChoi) + 15);
  assert.match(than(), /còn khoảng 1[56] phút/);
  // Bỏ giới hạn thì giờ cho thêm cũng bỏ
  D.doiCaiDat('gioi_han_phut', null);
  assert.equal(p.them_hom_nay, null);
  assert.equal(w.HoSo.gioiHanHomNay(p, ngay), null);
});

test('mã nguồn Góc phụ huynh: chỉ ghi phu_huynh_*, không gọi hàm ghi ván, câu, thao tác; không có gạch dài', () => {
  const src = fs.readFileSync(path.join(ROOT, 'dao-khung-long/js/goc-phu-huynh.js'), 'utf8');
  const bc = fs.readFileSync(path.join(ROOT, 'dao-khung-long/js/bao-cao.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'dao-khung-long/css/goc-phu-huynh.css'), 'utf8');
  const goi = [...src.matchAll(/\bghi\('([a-z_]+)'/g)].map((m) => m[1]);
  assert.ok(goi.length > 5);
  assert.ok(goi.every((l) => l === 'phu_huynh_mo' || l === 'phu_huynh_cai_dat'), goi.join(','));
  for (const f of ['batDauVan', 'cauHien', 'cauKetThuc', 'thaoTac(', 'traLoi(', 'ghiSauVan', 'datBe(']) assert.ok(src.indexOf('NK.' + f) < 0, f);
  assert.ok(!/NK\.ghi\((?!loai)/.test(src), 'mọi NK.ghi đi qua hàm ghi có kiểm tra loại');
  for (const s of [src, bc, css]) assert.ok(!/\u2014/.test(s), 'không có gạch dài');
  assert.ok(!/[\s'"]on[a-z]+="/.test(src), 'không có thuộc tính on*= (CSP)');
  const lop = [...css.replace(/\/\*[^]*?\*\//g, '').matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]).filter((x) => !/^(man-ph|hidden)$/.test(x));
  assert.ok(lop.every((x) => x.indexOf('gp-') === 0), 'mọi lớp CSS mới bắt đầu bằng gp-: ' + lop.filter((x) => x.indexOf('gp-') !== 0).join(','));
});
