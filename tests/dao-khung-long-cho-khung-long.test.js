'use strict';
/* Chợ Khủng Long (vùng 9) và câu hỏi tiền Việt Nam (B2.14, SGK Toán 2 Bài 56): kiểm thử logic không cần trình duyệt.
   - Ngân hàng: 4 kỹ năng, mỗi kỹ năng 250 câu ở dạng mặc định và 250 câu ở dạng chọn đáp án: đáp án đúng, trong phạm vi,
     mã câu ổn định, nhiễu khác nhau và mang đúng mã lỗi, có nhiễu lỗi có tên, gợi ý 3 cấp, hình SVG hợp lệ.
   - Công thức mã lỗi viết tay: dem-so-to, tra-thieu, tra-thua, nham-to-tien, nham-tien-thua, thieu-0, thua-0, so-chu-so,
     chieu-dau, dem-lech; chấm trả tiền theo tổng (nhiều cách trả đều đúng).
   - Màn vùng 9: lập danh sách câu, dạng câu theo kiểu, cùng hạt giống thì cùng câu.
   - Phát lại ván trả tiền, nhận biết tiền, tiền thừa qua VanChoi + NhatKy: chuỗi sự kiện, lược đồ v1, câu sai quay lại.
   - Game đăng ký vào DaoTroChoi, bài học 30 giây tien-viet-nam và tien-thua. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadGame, ROOT } = require('./lib/load.js');
const { validate } = require('./lib/schema-lite.js');

const FILES = ['js/nhat-ky.js', 'js/ngan-hang.js', 'js/cau-so-sanh.js', 'js/cau-do-luong.js', 'js/cau-tien.js', 'js/cau-thong-ke.js', 'js/cau-hinh-hoc.js', 'js/cau-thoi-gian.js', 'js/hoc-tap.js', 'js/dao.js', 'js/ho-so.js', 'js/van-choi.js'];
const J = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const deq = (a, b, m) => assert.deepEqual(J(a), J(b), m);
const SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/du-an-toan-2-3/spec/06-su-kien-v1.schema.json'), 'utf8'));

function moi(opts) {
  const w = loadGame('dao-khung-long', FILES, opts);
  const dh = { t: Date.UTC(2026, 9, 12, 12, 4, 0), p: 1000 };
  w.NhatKy.caiDongHo({ now: () => dh.t, perf: () => dh.p });
  dh.toi = (ms) => { dh.t += ms; dh.p += ms; };
  return { w, dh, NK: w.NhatKy, NH: w.NganHang, HT: w.HocTap, DAO: w.Dao, CT: w.CauTien };
}
function kiemLuocDo(evs) {
  const loi = [];
  evs.forEach((e, i) => { validate(SCHEMA, e).forEach((m) => loi.push('#' + i + ' ' + e.loai + ' ' + m)); });
  return loi;
}

const KY = ['nhan-biet-tien', 'tra-tien', 'doi-tien', 'tien-thua'];
const TO = [100, 200, 500, 1000];
const NBSP = String.fromCharCode(160);
const EM_DASH = String.fromCharCode(0x2014);
const LOI_MOI = ['dem-so-to', 'tra-thieu', 'tra-thua', 'nham-to-tien', 'nham-tien-thua'];
const LOI_CHUNG = ['khac', 'dem-lech'];

function laSvg(h) {
  return typeof h === 'string' && /^<svg[\s>]/.test(h) && /viewBox="[\d. ]+"/.test(h) && /<\/svg>$/.test(h) &&
    !/<script|\son[a-z]+=|href=|url\(/i.test(h) && h.split('<svg').length === 2;
}
function boTo(v) { return String(v).split(',').map(Number); }
function tong(ds) { return ds.reduce((a, b) => a + b, 0); }
/** Kiểm một giá trị (đáp án hoặc nhiễu) có nằm trong phạm vi của kiểu câu không. */
function trongPhamVi(ct, v) {
  const k = ct.kieu;
  if (k === 'chon_to' || k === 'doc_to' || k === 'lon_nhat' || k === 'be_nhat') return TO.includes(v);
  if (k === 'dem_loai') return Number.isInteger(v) && v >= 1 && v <= 8;
  if (k === 'may_to') return Number.isInteger(v) && v >= 1 && v <= 100;
  if (k === 'thua') return Number.isInteger(v) && v >= 100 && v <= 1000 && v % 100 === 0;
  const ds = boTo(v);
  return typeof v === 'string' && ds.every((x) => TO.includes(x)) && tong(ds) <= 1000 && ds.length <= 10;
}

/* ---------------- Ngân hàng ---------------- */

test('tiền: loại câu, 4 kỹ năng B2.14 có bài học, 5 mã lỗi mới có lời cho bé và mô tả cho phụ huynh', () => {
  const { NH, CT } = moi();
  assert.ok(NH.coLoai('tien'));
  for (const kn of KY) {
    const k = NH.KY_NANG[kn];
    assert.ok(k, kn);
    assert.equal(k.noi_dung, 'B2.14');
    assert.equal(k.loai, 'tien');
    assert.ok(['K1', 'K2', 'K3', 'K4'].includes(k.kieu));
    assert.ok(k.giay > 0 && k.gioi_han === 1000);
    assert.ok(k.bai_hoc === 'tien-viet-nam' || (kn === 'tien-thua' && k.bai_hoc === 'tien-thua'), kn + ' ' + k.bai_hoc);
    assert.ok(NH.THU_TU_KY_NANG.includes(kn));
  }
  for (const ma of LOI_MOI) {
    const l = NH.LOI[ma];
    assert.ok(l && l.be && l.mo_ta && l.ngan, ma);
    assert.ok(!(l.be + l.mo_ta + l.ngan).includes(EM_DASH));
  }
  deq(CT.TO, [1000, 500, 200, 100]);
  assert.equal(CT.soTien(1000), '1' + NBSP + '000');
  assert.equal(CT.dong(500), '500 đồng');
});

for (const kn of KY) {
  for (const dang of [null, 'chon_dap_an']) {
    test('tiền: ' + kn + (dang ? ' (dạng chọn đáp án cho Đấu Trường, game cũ)' : ' (dạng mặc định)') + ': 250 câu đúng, trong phạm vi, mã câu ổn định, nhiễu mang mã lỗi', () => {
      const { NH } = moi();
      const rng = NH.taoRng(dang ? 91 : 19);
      const kieuGap = {};
      let coTen = 0, coMC = 0;
      for (let i = 0; i < 250; i++) {
        const muc = dang ? { ky_nang: kn, dang: dang } : { ky_nang: kn };
        const ct = NH.sinh(kn, rng, muc);
        const q = NH.taoCau(kn, ct, rng, dang ? { dang: dang } : {});
        const ctx = kn + ' ' + JSON.stringify(ct);
        kieuGap[ct.kieu] = (kieuGap[ct.kieu] || 0) + 1;
        assert.equal(ct.loai, 'tien');
        deq(q.dap_an, NH.tinh(ct));
        deq(NH.nhanBietLoi(ct, q.dap_an), [], ctx);
        assert.ok(trongPhamVi(ct, q.dap_an), 'đáp án ngoài phạm vi ' + ctx + ' → ' + q.dap_an);
        // mã câu: ổn định, đúng mẫu, không đổi khi cấu trúc đi qua JSON (nhật ký)
        assert.match(q.ma_cau, new RegExp('^B2\\.14\\|' + kn + '\\|[a-z0-9_:,.+-]+$'), q.ma_cau);
        assert.equal(NH.maCau(kn, J(ct)), q.ma_cau);
        assert.equal(NH.deChuanHoa(ct), NH.deChuanHoa(J(ct)));
        // dạng mặc định: trả tiền, đổi tiền, tiền thừa là kéo thả; còn lại chọn đáp án
        const keoTha = ['tra', 'doi', 'thua'].includes(ct.kieu);
        assert.equal(q.dang, dang || (keoTha ? 'keo_tha' : 'chon_dap_an'));
        // chữ: đề, gợi ý 3 cấp, lời giải, kết luận; không có dấu gạch dài
        assert.ok(q.de && q.de_doc && q.the);
        assert.equal(q.goi_y.length, 3);
        q.goi_y.forEach((g) => assert.ok(typeof g === 'string' && g.length > 5));
        assert.ok(q.loi_giai && q.loi_giai.ma && Array.isArray(q.loi_giai.buoc) && q.loi_giai.buoc.length >= 1);
        deq(q.loi_giai.kq, q.dap_an);
        assert.ok(q.ket_luan);
        const chu = [q.de, q.de_doc, q.the, q.ket_luan].concat(q.goi_y, q.loi_giai.buoc).join(' ');
        assert.ok(!chu.includes(EM_DASH), ctx);
        assert.ok(!/undefined|NaN|null/.test(chu), 'chữ lỗi: ' + chu);
        if (q.loi_giai.html) assert.ok(/<svg/.test(q.loi_giai.html) && !/<script/.test(q.loi_giai.html));
        // hình của đề
        const canHinh = ['doc_to', 'dem_loai', 'may_to', 'tra', 'doi', 'thua'].includes(ct.kieu);
        if (canHinh) assert.ok(laSvg(q.hinh), 'thiếu hình hoặc SVG lạ: ' + ctx + ' ' + String(q.hinh).slice(0, 80));
        else assert.ok(!q.hinh, ctx);
        assert.ok(NH.hienGiaTriCau(ct, q.dap_an).length > 0);
        if (q.dang === 'chon_dap_an') {
          coMC++;
          const vals = q.lua_chon.map((x) => String(x.gia_tri));
          assert.ok(vals.length === 3 || vals.length === 4, ctx + ' ' + vals);
          assert.equal(new Set(vals).size, vals.length, 'trùng lựa chọn ' + ctx + ' ' + vals);
          assert.equal(vals.filter((v) => v === String(q.dap_an)).length, 1);
          for (const x of q.lua_chon) {
            deq(x.loi, NH.nhanBietLoi(ct, x.gia_tri), ctx);
            if (String(x.gia_tri) !== String(q.dap_an)) {
              assert.ok(x.loi.length > 0, 'nhiễu đúng đáp án: ' + ctx + ' ' + x.gia_tri);
              assert.ok(trongPhamVi(ct, x.gia_tri), 'nhiễu ngoài phạm vi ' + ctx + ' → ' + x.gia_tri);
              // trả tiền: nhiễu không được vừa đủ tiền (sẽ thành đúng vì chấm theo tổng)
              if (ct.kieu === 'tra') assert.notEqual(tong(boTo(x.gia_tri)), ct.gia);
            }
            const lc = NH.veLuaChon(ct, x.gia_tri);
            assert.ok(lc && typeof lc.nhan === 'string' && lc.nhan.length > 0);
            if (lc.hinh) assert.ok(laSvg(lc.hinh), ctx);
          }
          if (q.lua_chon.some((x) => x.loi.some((m) => !LOI_CHUNG.includes(m)))) coTen++;
        }
      }
      if (coMC) assert.ok(coTen / coMC > 0.9, kn + ': phần lớn câu phải có nhiễu mang lỗi có tên (' + coTen + '/' + coMC + ')');
      // đủ các kiểu câu con
      const can = { 'nhan-biet-tien': ['chon_to', 'doc_to', 'lon_nhat', 'be_nhat', 'dem_loai', 'may_to'], 'tra-tien': ['tra'], 'doi-tien': ['may_to', 'doi'], 'tien-thua': ['thua'] }[kn];
      for (const k of can) assert.ok(kieuGap[k] > 10, kn + ' thiếu kiểu ' + k + ' ' + JSON.stringify(kieuGap));
    });
  }
}

test('tiền: câu trả tiền có ví đủ tiền trả vừa đúng, ví còn tờ khác để có nhiều cách trả; câu đổi tiền, tiền thừa đúng SGK lớp 2', () => {
  const { NH, CT } = moi();
  const rng = NH.taoRng(5);
  let nhieuCach = 0, motTo = 0;
  for (let i = 0; i < 300; i++) {
    const ct = NH.sinh('tra-tien', rng, {});
    assert.equal(ct.vi.length, 4);
    assert.ok(ct.vi.every((n) => Number.isInteger(n) && n >= 0 && n <= 5), JSON.stringify(ct));
    assert.ok(ct.gia >= 100 && ct.gia <= 1000 && ct.gia % 100 === 0);
    assert.ok(CT.toHop(ct.gia, CT.soLuongVi(ct.vi)), 'ví không trả vừa đủ được ' + JSON.stringify(ct));
    const tien = ct.vi.reduce((t, n, j) => t + n * CT.TO[j], 0);
    assert.ok(tien > ct.gia, 'ví phải có nhiều hơn giá');
    if (tien - ct.gia >= 100) nhieuCach++;
    if (ct.vi.join() === '1,1,1,1') motTo++;
    assert.ok(CT.MON.some((m) => m.id === ct.mon));
  }
  assert.ok(motTo > 15, 'có câu chọn một tờ vừa đúng giá như SGK Bài 56 hoạt động 2: ' + motTo);
  assert.ok(nhieuCach > 250);
  const cap = new Set();
  for (let i = 0; i < 300; i++) {
    const ct = NH.sinh('doi-tien', rng, {});
    if (ct.sang) { assert.equal(ct.tu % ct.sang, 0); assert.ok(ct.tu / ct.sang <= 10); cap.add(ct.tu + '>' + ct.sang); } else assert.ok([200, 500, 1000].includes(ct.tu));
  }
  deq([...cap].sort(), ['1000>100', '1000>200', '1000>500', '200>100', '500>100']);
  for (let i = 0; i < 300; i++) {
    const ct = NH.sinh('tien-thua', rng, {});
    assert.ok([500, 1000].includes(ct.dua));
    assert.ok(ct.gia >= 100 && ct.gia < ct.dua && ct.gia % 100 === 0);
    assert.ok(CT.KHACH.includes(ct.khach) && ct.khach !== 'sp-mo-vit-long');
  }
});

test('tiền: muc.cach giới hạn kiểu câu con của màn', () => {
  const { NH } = moi();
  const rng = NH.taoRng(3);
  for (let i = 0; i < 60; i++) {
    assert.equal(NH.sinh('nhan-biet-tien', rng, { cach: ['dem_loai'] }).kieu, 'dem_loai');
    assert.equal(NH.sinh('doi-tien', rng, { cach: ['may_to'] }).kieu, 'may_to');
    const d = NH.sinh('doi-tien', rng, { cach: ['doi_nho'] });
    assert.ok(d.kieu === 'doi' && d.sang === 0);
    const b = NH.sinh('nhan-biet-tien', rng, { cach: ['lon_nhat', 'be_nhat'] });
    assert.ok(['lon_nhat', 'be_nhat'].includes(b.kieu) && new Set(b.ds).size === 3);
  }
});

test('tiền: công thức mã lỗi viết tay (trả tiền chấm theo tổng tiền)', () => {
  const { NH } = moi();
  const L = (ct, v) => J(NH.nhanBietLoi(Object.assign({ loai: 'tien' }, ct), v));
  // nhận biết tờ tiền: 100 và 1 000 là thiếu, thừa chữ số 0; tờ khác là nhầm tờ
  const chon1000 = { kieu: 'chon_to', gia: 1000, goi: 'chu' };
  deq(L(chon1000, 1000), []);
  deq(L(chon1000, 100), ['thieu-0']);
  deq(L({ kieu: 'chon_to', gia: 100, goi: 'so' }, 1000), ['thua-0']);
  deq(L({ kieu: 'doc_to', gia: 500 }, 200), ['nham-to-tien']);
  deq(L({ kieu: 'doc_to', gia: 500 }, 300), ['khac']);
  // tờ lớn nhất, bé nhất: 1 000 so chữ số đầu với 500 là so-chu-so; chọn ngược là chieu-dau
  deq(L({ kieu: 'lon_nhat', ds: [200, 1000, 500] }, 1000), []);
  deq(L({ kieu: 'lon_nhat', ds: [200, 1000, 500] }, 500), ['so-chu-so']);
  deq(L({ kieu: 'lon_nhat', ds: [200, 1000, 500] }, 200), ['chieu-dau']);
  deq(L({ kieu: 'be_nhat', ds: [200, 1000, 500] }, 1000), ['so-chu-so']);
  deq(L({ kieu: 'be_nhat', ds: [200, 1000, 500] }, 500), ['khac']);
  deq(L({ kieu: 'lon_nhat', ds: [100, 200, 500] }, 100), ['chieu-dau']);
  deq(L({ kieu: 'be_nhat', ds: [100, 500, 1000] }, 1000), ['chieu-dau']);
  // đếm tờ trong đống tiền: đếm nhầm loại tờ, lệch một tờ
  const dong = { kieu: 'dem_loai', gia: 500, dong: [500, 200, 500, 100, 200, 500, 1000] };
  deq(L(dong, 3), []);
  deq(L(dong, 2), ['nham-to-tien', 'dem-lech']);
  deq(L(dong, 4), ['dem-lech']);
  deq(L(dong, 1), ['nham-to-tien']);
  deq(L(dong, 7), ['khac']);
  // được mấy tờ: 10 tờ là đếm mỗi tờ như 100 đồng; 2 tờ là số tờ 500 đồng; 50 thừa chữ số 0
  const doi200 = { kieu: 'may_to', tu: 1000, sang: 200 };
  deq(L(doi200, 5), []);
  deq(L(doi200, 10), ['dem-so-to']);
  deq(L(doi200, 2), ['nham-to-tien']);
  deq(L(doi200, 50), ['thua-0']);
  deq(L(doi200, 4), ['dem-lech']);
  deq(L({ kieu: 'may_to', tu: 1000, sang: 100 }, 5), ['nham-to-tien']);
  deq(L({ kieu: 'may_to', tu: 1000, sang: 100 }, 1), ['thieu-0']);
  deq(L({ kieu: 'may_to', tu: 500, sang: 100 }, 50), ['thua-0']);
  // trả tiền: mọi cách trả đủ đều đúng; 3 tờ cho 300 đồng là đếm số tờ; thiếu, thừa ghi kèm
  const tra300 = { kieu: 'tra', mon: 'but-chi', gia: 300, vi: [0, 1, 3, 3] };
  deq(L(tra300, '200,100'), []);
  deq(L(tra300, '100,100,100'), []);
  deq(L(tra300, '100,200'), [], 'thứ tự tờ không quan trọng');
  deq(L(tra300, 300), [], 'số tiền cũng chấm được');
  deq(L(tra300, '200,200,200'), ['dem-so-to', 'tra-thua']);
  deq(L(tra300, '500,200,100'), ['dem-so-to', 'tra-thua']);
  deq(L(tra300, '200'), ['tra-thieu']);
  deq(L(tra300, '500'), ['tra-thua']);
  deq(L(tra300, ''), ['khac']);
  deq(L({ kieu: 'tra', mon: 'keo', gia: 100, vi: [1, 1, 1, 1] }, '1000'), ['nham-to-tien', 'tra-thua']);
  deq(L({ kieu: 'tra', mon: 'keo', gia: 1000, vi: [1, 1, 1, 1] }, '100'), ['nham-to-tien', 'tra-thieu']);
  deq(L({ kieu: 'tra', mon: 'keo', gia: 1000, vi: [1, 1, 1, 1] }, '1000'), []);
  // đổi tiền: đúng loại tờ được hỏi; đủ tiền mà khác loại là nhầm tờ
  const doi = { kieu: 'doi', tu: 1000, sang: 200 };
  deq(L(doi, '200,200,200,200,200'), []);
  deq(L(doi, '500,500'), ['nham-to-tien']);
  deq(L(doi, '200,200,200,200'), ['tra-thieu']);
  deq(L(doi, '200,200,200,200,200,200'), ['tra-thua']);
  const doiNho = { kieu: 'doi', tu: 1000, sang: 0 };
  deq(L(doiNho, '500,500'), []);
  deq(L(doiNho, '500,200,200,100'), []);
  deq(L(doiNho, '1000'), ['khac']);
  deq(L({ kieu: 'doi', tu: 500, sang: 0 }, '200,200,200,200,200'), ['dem-so-to', 'tra-thua']);
  // tiền thừa: 1 000 − 700 = 300; trả lại đúng giá món hàng là nhầm tiền thừa
  const thua = { kieu: 'thua', mon: 'kem', gia: 700, dua: 1000, khach: 'sp-toc-long' };
  deq(L(thua, '200,100'), []);
  deq(L(thua, '100,100,100'), []);
  deq(L(thua, 300), []);
  deq(L(thua, 700), ['nham-tien-thua', 'tra-thua']);
  deq(L(thua, '500,200'), ['nham-tien-thua', 'tra-thua']);
  deq(L(thua, '200'), ['tra-thieu']);
  deq(L(thua, '200,200,200'), ['dem-so-to', 'tra-thua']);
  deq(L(thua, 1000), ['tra-thua']);
});

test('tiền: chữ hiện cho bé và phụ huynh (nhóm ba chữ số, tên bộ tờ, lời nói kèm số tiền chênh)', () => {
  const { NH } = moi();
  const t = (ct) => Object.assign({ loai: 'tien' }, ct);
  const tra = t({ kieu: 'tra', mon: 'banh-mi', gia: 700, vi: [1, 1, 2, 3] });
  assert.equal(NH.deHien(tra), 'Bánh mì giá 700 đồng. Con trả vừa đủ bằng những tờ nào?');
  assert.equal(NH.deDoc(tra), 'Bánh mì giá bảy trăm đồng. Con trả vừa đủ bằng những tờ nào?');
  assert.equal(NH.tinh(tra), '500,200');
  assert.equal(NH.hienGiaTriCau(tra, '500,200'), '500 đồng và 200 đồng');
  assert.equal(NH.hienGiaTriCau(tra, '500,200,200,100'), '500 đồng, 2 tờ 200 đồng và 100 đồng');
  assert.equal(NH.hienGiaTriCau(tra, '1000'), '1' + NBSP + '000 đồng');
  assert.equal(NH.loiNoiVoiBe(tra, '500,100', ['tra-thieu']), 'Cộng lại là 600 đồng, còn thiếu 100 đồng');
  assert.equal(NH.loiNoiVoiBe(tra, '500,500', ['tra-thua']), 'Cộng lại là 1' + NBSP + '000 đồng, thừa 300 đồng rồi');
  assert.match(NH.loiNoiVoiBe(t({ kieu: 'tra', mon: 'keo', gia: 300, vi: [0, 1, 3, 3] }), '200,200,200', ['dem-so-to', 'tra-thua']), /đưa 3 tờ nhưng cộng lại là 600 đồng/);
  assert.equal(NH.ketLuan(tra), 'Vậy trả 500 đồng + 200 đồng = 700 đồng');
  assert.equal(NH.maCau('tra-tien', tra), 'B2.14|tra-tien|tra:700:1-1-2-3');
  const chon = t({ kieu: 'chon_to', gia: 500, goi: 'chu' });
  assert.equal(NH.deHien(chon), 'Chọn tờ năm trăm đồng');
  assert.equal(NH.maCau('nhan-biet-tien', chon), 'B2.14|nhan-biet-tien|chon:500:chu');
  assert.equal(NH.hienGiaTriCau(chon, 1000), '1' + NBSP + '000 đồng');
  const doi = t({ kieu: 'may_to', tu: 1000, sang: 200 });
  assert.equal(NH.deHien(doi), 'Tờ 1' + NBSP + '000 đồng đổi được mấy tờ 200 đồng?');
  assert.equal(NH.deDoc(doi), 'Tờ một nghìn đồng đổi được mấy tờ hai trăm đồng?');
  assert.equal(NH.hienGiaTriCau(doi, 5), '5 tờ');
  assert.equal(NH.maCau('doi-tien', t({ kieu: 'doi', tu: 1000, sang: 0 })), 'B2.14|doi-tien|doi:1000:nho');
  const thua = t({ kieu: 'thua', mon: 'kem', gia: 700, dua: 1000, khach: 'sp-giap-long' });
  assert.equal(NH.tinh(thua), 300);
  assert.equal(NH.maCau('tien-thua', thua), 'B2.14|tien-thua|thua:1000-700');
  assert.equal(NH.hienGiaTriCau(thua, '200,100'), '200 đồng và 100 đồng');
  assert.equal(NH.hienGiaTriCau(thua, 300), '300 đồng');
  assert.match(NH.goiY(thua)[1], /Đếm thêm từ 700 cho tới 1.000: 800, 900, 1.000/);
  assert.match(NH.loiNoiVoiBe(thua, 700, ['nham-tien-thua', 'tra-thua']), /giá que kem/);
  assert.equal(NH.maCau('nhan-biet-tien', t({ kieu: 'dem_loai', gia: 500, dong: [500, 200, 500, 100] })), 'B2.14|nhan-biet-tien|dem:500:0-2-1-1');
});

test('tiền: hình tờ tiền là SVG tự vẽ đơn giản (số, chữ ĐỒNG), không chân dung, không số sê-ri, không ảnh ngoài', () => {
  const { CT } = moi();
  for (const g of TO) {
    const h = CT.veTo(g);
    assert.ok(laSvg(h), h.slice(0, 100));
    assert.ok(h.includes('>' + CT.soTien(g) + '</text>'));
    assert.ok(h.includes('ĐỒNG'));
    assert.ok(!/<image|<img|href/.test(h));
  }
  // màu mỗi tờ khác nhau
  assert.equal(new Set(TO.map((g) => CT.MAU[g].nen)).size, 4);
  const h = CT.hangTo([500, 200, 200]);
  assert.ok(laSvg(h));
  assert.equal(h.split('ĐỒNG').length - 1, 3);
  const vt = CT.viTriDong([500, 200, 500, 100, 1000, 200, 100, 500]);
  assert.equal(vt.length, 8);
  vt.forEach((p) => assert.ok(p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1 && Math.abs(p.xoay) <= 12));
  deq(CT.viTriDong([500, 200, 500, 100, 1000, 200, 100, 500]), vt, 'vị trí đống tiền cố định theo đề');
});

/* ---------------- Màn vùng 9 ---------------- */

test('vùng 9: các màn Chợ Khủng Long lập đủ câu, không trùng, dạng câu theo kiểu, cùng hạt giống thì cùng câu', () => {
  const { NH, DAO } = moi();
  const v = DAO.vung(9);
  const cua = v.man.filter((m) => m.game === 'cho-khung-long');
  deq(cua.map((m) => m.id), ['v9-m1', 'v9-m2', 'v9-m3', 'v9-m4', 'v9-cup']);
  for (const m of cua) {
    for (const hat of [1, 2, 3, 77]) {
      const ds = NH.lapDanhSach(m, NH.taoRng(hat), {});
      assert.equal(ds.length, m.so_cau, m.id);
      assert.equal(new Set(ds.map((x) => NH.maCau(x.ky_nang, x.cau_truc))).size, m.so_cau, m.id + ': trùng câu');
      ds.forEach((x) => {
        const keoTha = ['tra', 'doi', 'thua'].includes(x.cau_truc.kieu);
        assert.equal(x.dang, keoTha ? 'keo_tha' : 'chon_dap_an', m.id + ' ' + JSON.stringify(x.cau_truc));
      });
      deq(NH.lapDanhSach(m, NH.taoRng(hat), {}), ds);
    }
  }
  const cup = new Set();
  for (let hat = 1; hat < 20; hat++) NH.lapDanhSach(DAO.man('v9-cup'), NH.taoRng(hat), {}).forEach((x) => cup.add(x.ky_nang));
  deq([...cup].sort(), ['doi-tien', 'tien-thua', 'tra-tien']);
  // Đấu Trường: mọi kỹ năng tiền hỏi được ở dạng chọn đáp án
  const dt = { id: 'dt2', cau: KY.map((k) => ({ ky_nang: k, dang: 'chon_dap_an' })), so_cau: 20 };
  const ds = NH.lapDanhSach(dt, NH.taoRng(9), {});
  assert.equal(ds.length, 20);
  ds.forEach((x) => {
    assert.equal(x.dang, 'chon_dap_an');
    const q = NH.taoCau(x.ky_nang, x.cau_truc, NH.taoRng(4), { dang: x.dang });
    assert.ok(q.lua_chon.length >= 3);
  });
});

/* ---------------- Phát lại một ván ---------------- */

function cauRieng(van, kn, ct) { return van.hienCau(van._taoQ({ ky_nang: kn, cau_truc: ct, dang: ct.kieu === 'tra' || ct.kieu === 'doi' || ct.kieu === 'thua' ? 'keo_tha' : 'chon_dap_an' })); }
/** Bé đặt từng tờ vào khay (dat), trả về chuỗi tờ đã chuẩn hóa. */
function datTo(van, dh, ds, tu) {
  const khay = [];
  ds.forEach((g, i) => {
    khay.push(g);
    van.thaoTac(i % 2 ? 'dat' : 'keo', { doi_tuong: 'to_tien', gia_tri: g, tu: tu || 'vi', den: 'khay', tong: tong(khay), so_to: khay.length });
    dh.toi(700);
  });
  return khay.slice().sort((a, b) => b - a).join(',');
}
function them(ds, can) { const t = tong(ds); return { to_tien: ds.slice().sort((a, b) => b - a), tong: t, can: can, chenh: t - can, so_to: ds.length }; }

test('phát lại: ván trả tiền ghi keo, dat, bo_ra kèm tổng khay; sửa được lần 2; đếm số tờ hai lần thì xem lời giải, câu quay lại sau 2 câu', async () => {
  const { w, NK, NH, HT, dh } = moi();
  await NK.khoiDong({ khongDungIndexedDB: true });
  NK.datBe('be_CHOTIEN1');
  const m = w.Dao.man('v9-m2');
  const van = new w.VanChoi({ nk: NK, game: 'cho-khung-long', vung: 9, man: m, nguon: 'tu_chon', hatGiong: 11, soCau: 4 });
  van.batDau({ che_do: 'tra_tien' });
  // Câu 1: bánh mì 700 đồng; trả 500 + 100 (thiếu 100), lấy tờ 100 ra, thêm tờ 200 là đủ
  let q = cauRieng(van, 'tra-tien', { loai: 'tien', kieu: 'tra', mon: 'banh-mi', gia: 700, vi: [1, 1, 2, 3] });
  assert.equal(q.dang, 'keo_tha');
  assert.equal(q.dap_an, '500,200');
  let v = datTo(van, dh, [500, 100]);
  const k1 = van.traLoi(v, them([500, 100], 700));
  assert.ok(k1.thuLai);
  deq(k1.loi, ['tra-thieu']);
  assert.match(k1.loiNoi, /còn thiếu 100 đồng/);
  van.thaoTac('bo_ra', { doi_tuong: 'to_tien', gia_tri: 100, tu: 'khay', den: 'vi', tong: 500, so_to: 1, cach: 'keo' });
  van.thaoTac('keo', { doi_tuong: 'to_tien', gia_tri: 200, tu: 'vi', den: 'khay', tong: 700, so_to: 2 });
  assert.equal(van.traLoi('500,200', them([500, 200], 700)).ketQua, 'dung_lan_2');
  // Câu 2: bút chì 300 đồng; đưa 3 tờ 200 (đếm số tờ), rồi 2 tờ 200 (vẫn thừa): xem lời giải
  q = cauRieng(van, 'tra-tien', { loai: 'tien', kieu: 'tra', mon: 'but-chi', gia: 300, vi: [0, 1, 3, 2] });
  const cauSai = q.cau;
  v = datTo(van, dh, [200, 200, 200]);
  const k2 = van.traLoi(v, them([200, 200, 200], 300));
  deq(k2.loi, ['dem-so-to', 'tra-thua']);
  assert.ok(k2.thuLai);
  van.thaoTac('bo_ra', { doi_tuong: 'to_tien', gia_tri: 200, tu: 'khay', den: 'vi', tong: 400, so_to: 2, cach: 'cham' });
  assert.ok(van.goiY().cap === 1);
  const k3 = van.traLoi('200,200', them([200, 200], 300));
  assert.ok(k3.canPhanHoi && k3.loiGiai && k3.loiGiai.html);
  van.phanHoiXem(6.5, 'choi_tiep');
  van.ketThucCauSai();
  // Các câu còn lại của màn: trả bằng một cách khác cách của đáp án khi được (tờ nhỏ hơn)
  let dem = 0;
  while ((q = van.cauTiep())) {
    dem++;
    const ct = q.cau_truc;
    let ds = String(q.dap_an).split(',').map(Number);
    const khac = w.CauTien.toHop(ct.gia, w.CauTien.soLuongVi(ct.vi), [200, 100]);
    if (khac && khac.length !== ds.length) ds = khac;
    v = datTo(van, dh, ds);
    assert.equal(van.traLoi(v, them(ds, ct.gia)).dung, true, JSON.stringify(ct) + ' ' + v);
  }
  assert.equal(dem, 5, '4 câu của màn + 1 câu sai quay lại');
  const kq = await van.ketThuc(false, { diem: 540, so_luot_dung: 6 });
  const evs = await NK.docCuaBe('be_CHOTIEN1');
  deq(kiemLuocDo(evs), []);
  const vanEv = evs.filter((e) => e.van);
  assert.equal(vanEv[0].loai, 'van_bat_dau');
  deq(vanEv[0].du_lieu.do_kho, { che_do: 'tra_tien' });
  assert.equal(vanEv[vanEv.length - 1].loai, 'van_ket_thuc');
  const tt = vanEv.filter((e) => e.loai === 'thao_tac');
  assert.ok(tt.every((e) => ['keo', 'dat', 'bo_ra', 'nghe_lai'].includes(e.du_lieu.kieu)));
  assert.ok(tt.every((e) => TO.includes(e.du_lieu.gia_tri) && typeof e.du_lieu.tong === 'number'));
  const tl = vanEv.filter((e) => e.loai === 'tra_loi');
  deq(tl[0].du_lieu.to_tien, [500, 100]);
  assert.equal(tl[0].du_lieu.chenh, -100);
  deq(tl[0].du_lieu.loi, ['tra-thieu']);
  assert.equal(tl[1].du_lieu.lan_thu, 2);
  const hien = vanEv.filter((e) => e.loai === 'cau_hien');
  assert.equal(hien[0].du_lieu.ma_cau, 'B2.14|tra-tien|tra:700:1-1-2-3');
  assert.equal(hien[0].du_lieu.dang, 'keo_tha');
  const lai = hien.find((e) => e.du_lieu.on_lai_cua === cauSai);
  assert.ok(lai, 'câu sai quay lại');
  assert.equal(hien.indexOf(lai) - hien.findIndex((e) => e.cau === cauSai), 3, 'quay lại sau 2 câu');
  const cau = HT.tomTatCacCau(kq.suKien);
  assert.equal(cau[0].ket_qua, 'dung_lan_2');
  deq(cau[0].cac_tra_loi, ['500,100', '500,200']);
  assert.equal(cau[1].ket_qua, 'sai');
  assert.ok(cau[1].loi.includes('dem-so-to'));
  assert.equal(cau[1].goi_y_cap, 1);
  assert.ok(cau.find((c) => c.on_lai_cua === cauSai).sua_duoc_cau === cauSai);
  assert.equal(kq.dem.sai, 1);
  assert.equal(kq.dem.lan2, 1);
  assert.equal(kq.dem.suaDuoc, 1);
  void NH;
});

test('phát lại: ván nhận biết tiền (đưa một tờ, đếm tờ trong đống tiền, gợi ý gạch một lựa chọn) hợp lệ lược đồ', async () => {
  const { w, NK, dh, HT } = moi();
  await NK.khoiDong({ khongDungIndexedDB: true });
  NK.datBe('be_CHOTIEN2');
  const m = w.Dao.man('v9-m1');
  const van = new w.VanChoi({ nk: NK, game: 'cho-khung-long', vung: 9, man: m, hatGiong: 3, soCau: 2 });
  van.batDau({ che_do: 'nhan_biet' });
  // Đưa tờ một nghìn đồng: bé đưa tờ 100 đồng (thiếu chữ số 0), chỉ một lần thử
  let q = cauRieng(van, 'nhan-biet-tien', { loai: 'tien', kieu: 'chon_to', gia: 1000, goi: 'chu' });
  assert.equal(q.lua_chon.length, 4);
  van.thaoTac('chon', { doi_tuong: 'to_tien', gia_tri: 100, vi_tri: 'ngan_2', cach: 'keo' });
  const k = van.traLoi(100, { vi_tri: 'ngan_2', to_tien: [100], tong: 100 });
  assert.ok(k.canPhanHoi);
  deq(k.loi, ['thieu-0']);
  van.phanHoiXem(4, 'choi_tiep');
  van.ketThucCauSai();
  // Đống tiền: đánh dấu, bỏ đánh dấu, xin gợi ý tới cấp 3 (gạch một lựa chọn), chọn đúng
  q = cauRieng(van, 'nhan-biet-tien', { loai: 'tien', kieu: 'dem_loai', gia: 500, dong: [500, 200, 500, 100, 200, 500, 1000] });
  assert.equal(q.dap_an, 3);
  [0, 1, 2, 5].forEach((i, j) => { van.thaoTac('dem', { doi_tuong: 'to_tien', gia_tri: q.cau_truc.dong[i], vi_tri: 'to_' + (i + 1), so_da_dem: j + 1 }); dh.toi(500); });
  van.thaoTac('bo_chon', { doi_tuong: 'to_tien', gia_tri: 200, vi_tri: 'to_2', so_da_dem: 3 });
  van.goiY(); van.goiY();
  const sai = q.lua_chon.find((x) => x.loi.length);
  van.goiY({ loai_bo: sai.gia_tri });
  van.thaoTac('chon', { doi_tuong: 'nut_dap_an', gia_tri: 3, vi_tri: 'nut_1' });
  assert.equal(van.traLoi(3, { vi_tri: 'nut_1', so_to_da_danh_dau: 3 }).ketQua, 'dung_sau_goi_y');
  while ((q = van.cauTiep())) { van.thaoTac('chon', { doi_tuong: 'nut_dap_an', gia_tri: q.dap_an }); van.traLoi(q.dap_an); }
  const kq = await van.ketThuc(false, { diem: 200 });
  const evs = await NK.docCuaBe('be_CHOTIEN2');
  deq(kiemLuocDo(evs), []);
  const gy = evs.filter((e) => e.loai === 'goi_y');
  assert.equal(gy.length, 3);
  deq(gy[2].du_lieu.loai_bo, sai.gia_tri);
  const cau = HT.tomTatCacCau(kq.suKien);
  assert.equal(cau[1].so_lan_doi_y, 1, 'bỏ đánh dấu một tờ là một lần đổi ý');
  assert.equal(cau[1].goi_y_cap, 3);
  const hien = evs.filter((e) => e.loai === 'cau_hien');
  assert.ok(hien[0].du_lieu.lua_chon.every((x) => Array.isArray(x.loi)));
});

test('phát lại: ván làm người bán (tiền thừa) ghi nhầm tiền thừa với giá, sửa lại bằng cách đếm thêm', async () => {
  const { w, NK, dh, HT } = moi();
  await NK.khoiDong({ khongDungIndexedDB: true });
  NK.datBe('be_CHOTIEN3');
  const van = new w.VanChoi({ nk: NK, game: 'cho-khung-long', vung: 9, man: w.Dao.man('v9-m4'), hatGiong: 8, soCau: 1 });
  van.batDau({ che_do: 'nguoi_ban' });
  const q = cauRieng(van, 'tien-thua', { loai: 'tien', kieu: 'thua', mon: 'kem', gia: 700, dua: 1000, khach: 'sp-toc-long' });
  assert.equal(q.dap_an, 300);
  let v = datTo(van, dh, [500, 200], 'ngan_keo');
  const k = van.traLoi(v, them([500, 200], 300));
  deq(k.loi, ['nham-tien-thua', 'tra-thua']);
  assert.ok(k.thuLai);
  van.thaoTac('bo_ra', { doi_tuong: 'to_tien', gia_tri: 500, tu: 'khay', den: 'ngan_keo', tong: 200, so_to: 1, cach: 'keo' });
  van.thaoTac('dat', { doi_tuong: 'to_tien', gia_tri: 100, tu: 'ngan_keo', den: 'khay', tong: 300, so_to: 2 });
  v = '200,100';
  assert.equal(van.traLoi(v, them([200, 100], 300)).ketQua, 'dung_lan_2');
  const kq = await van.ketThuc(false, { diem: 40 });
  deq(kiemLuocDo(kq.suKien), []);
  const cau = HT.tomTatCacCau(kq.suKien);
  deq(cau[0].tra_loi_sai, ['500,200']);
  assert.ok(cau[0].loi.includes('nham-tien-thua'));
});

/* ---------------- Game và bài học ---------------- */

test('game: Chợ Khủng Long đăng ký vào đảo (khung chung, vùng chơi ck-san); bài học tien-viet-nam, tien-thua dạy theo SGK', () => {
  const w = loadGame('dao-khung-long', FILES.concat(['js/phan-hoi.js', 'js/bai-hoc.js', 'js/khung-choi.js', 'js/cho-khung-long.js']));
  const g = w.DaoTroChoi['cho-khung-long'];
  assert.ok(g && g.khung === true && g.san === 'ck-san' && typeof g.batDau === 'function' && typeof g.ten === 'string');
  assert.ok(w.ChoKhungLong && typeof w.ChoKhungLong.batDau === 'function' && w.ChoKhungLong._trangThai() === null);
  const BH = w.BaiHoc;
  for (const kn of KY) assert.ok(BH.coBai(w.NganHang.KY_NANG[kn].bai_hoc), kn);
  for (const ma of ['tien-viet-nam', 'tien-thua']) {
    const bai = BH.BAI[ma];
    assert.ok(bai.ten && bai.buoc.length >= 3, ma);
    bai.buoc.forEach((b, i) => {
      assert.ok(b.chu && typeof b.ve === 'function', ma + ' bước ' + i);
      assert.ok(!b.chu.includes(EM_DASH));
      const h = b.ve();
      assert.ok(typeof h === 'string' && h.includes('<svg'), ma + ' bước ' + i + ' phải có hình tờ tiền');
    });
    const cuoi = bai.buoc[bai.buoc.length - 1];
    assert.ok(cuoi.thu && cuoi.thu.lua_chon.includes(cuoi.thu.dung) && cuoi.thu.dung_noi && cuoi.thu.sai_noi, ma);
  }
  // SGK Bài 56: bốn tờ 100, 200, 500, 1 000 đồng; Mai mua kẹo 1 000 đồng trả một tờ 1 000 đồng
  const tvn = BH.BAI['tien-viet-nam'];
  assert.match(tvn.buoc[0].chu, /một trăm đồng, hai trăm đồng, năm trăm đồng và một nghìn đồng/);
  assert.match(tvn.buoc[2].chu, /Mai mua kẹo hết một nghìn đồng/);
  assert.match(tvn.buoc[3].chu, /không đếm số tờ/);
});

test('tệp: không có dấu gạch dài; CSS chỉ dùng bộ chọn ck-; game không gọi Math.random trong ngân hàng', () => {
  const tep = ['dao-khung-long/js/cau-tien.js', 'dao-khung-long/js/cho-khung-long.js', 'dao-khung-long/css/cho-khung-long.css', 'tests/dao-khung-long-cho-khung-long.test.js'];
  for (const f of tep) assert.ok(!fs.readFileSync(path.join(ROOT, f), 'utf8').includes(EM_DASH), f);
  assert.ok(!/Math\.random/.test(fs.readFileSync(path.join(ROOT, 'dao-khung-long/js/cau-tien.js'), 'utf8')));
  const css = fs.readFileSync(path.join(ROOT, 'dao-khung-long/css/cho-khung-long.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const boChon = [];
  css.replace(/(^|})\s*([^{}@]+)\{/g, (m0, a, sel) => { boChon.push(sel.trim()); return m0; });
  const khongHop = boChon.filter((s) => !/^(from|to|\d+%)/.test(s)).flatMap((s) => s.split(',').map((x) => x.trim())).filter((s) => !/\.ck-/.test(s));
  deq(khongHop, [], 'bộ chọn phải có tiền tố ck-');
  // lớp trạng thái game tự gắn (dung, sai, ck-bo…) không được trùng lớp dùng chung ở gốc style.css (.nhan, .bo từng làm hỏng bố cục)
  const js = fs.readFileSync(path.join(ROOT, 'dao-khung-long/js/cho-khung-long.js'), 'utf8');
  const lopJs = new Set();
  js.replace(/classList\.(?:add|remove)\(([^)]*)\)/g, (m0, a) => { a.replace(/'([a-z0-9-]+)'/g, (m1, x) => lopJs.add(x)); return m0; });
  js.replace(/classList\.toggle\('([a-z0-9-]+)'/g, (m0, x) => { lopJs.add(x); return m0; });
  js.replace(/lop\.push\('([a-z0-9-]+)'\)/g, (m0, x) => { lopJs.add(x); return m0; });
  const goc = new Set();
  fs.readFileSync(path.join(ROOT, 'dao-khung-long/style.css'), 'utf8').replace(/(^|[},]\s*)\.([a-z0-9-]+)(?=[\s,:{.[])/gm, (m0, a, x) => { goc.add(x); return m0; });
  const trung = [...lopJs].filter((x) => goc.has(x) && x !== 'hidden' && x !== 'rung');
  deq(trung, [], 'lớp trùng lớp gốc của style.css');
});
