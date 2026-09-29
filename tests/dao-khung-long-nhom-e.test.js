'use strict';
/* Đảo Khủng Long: kiểm thử nhóm E của lần rà soát 2026-09-28 (không cần trình duyệt).
   - AmThanh.chuanHoa: đơn vị sau một số thành chữ đầy đủ, bỏ khoảng trắng nhóm ba chữ số, chữ thường giữ nguyên.
   - AmThanh.mo: AudioContext của iOS ở trạng thái 'interrupted' được mở lại.
   - PhanHoi.loiDoc: đọc đủ tên lỗi, từng bước và câu "Vậy...".
   - Dao.tomTatTrangChu (localStorage 'dkl-tom-tat-v1' cho trang chủ), Dao.loiKetThuc (câu ngắn ở màn kết thúc).
   - VanChoi.coTienTrinh: hỏi lại trước khi về đảo chỉ khi ván đã có câu trả lời.
   - KhungChoi: hẹn giờ biết tạm dừng (chờ bé chơi tiếp), Về đảo giữa ván dở thì hỏi lại. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./lib/load.js');

const FILES = ['js/nhat-ky.js', 'js/ngan-hang.js', 'js/cau-so-sanh.js', 'js/cau-do-luong.js', 'js/cau-tien.js', 'js/cau-thong-ke.js', 'js/cau-hinh-hoc.js', 'js/cau-thoi-gian.js', 'js/hoc-tap.js', 'js/dao.js', 'js/ho-so.js', 'js/van-choi.js'];
const cho = (ms) => new Promise((r) => setTimeout(r, ms));

test('AmThanh.chuanHoa: đơn vị sau một số, nhóm ba chữ số, dấu phép tính; chữ thường không bị đụng', () => {
  const w = loadGame('dao-khung-long', ['js/am-thanh.js']);
  const f = w.AmThanh.chuanHoa;
  assert.equal(f('Xô có 5 l nước'), 'Xô có 5 lít nước');
  assert.equal(f('Túi gạo 12 kg'), 'Túi gạo 12 ki-lô-gam');
  assert.equal(f('Thước dài 25 cm, bảng dài 3 dm'), 'Thước dài 25 xăng-ti-mét, bảng dài 3 đề-xi-mét');
  assert.equal(f('Đường dài 2 km và 5 m'), 'Đường dài 2 ki-lô-mét và 5 mét');
  assert.equal(f('Quả táo nặng 200 g'), 'Quả táo nặng 200 gam');
  assert.equal(f('Giá 500đ'), 'Giá 500 đồng');
  assert.equal(f('5kg'), '5 ki-lô-gam');
  // Nhóm ba chữ số: khoảng trắng thường, không ngắt dòng, hẹp đều bỏ đi
  assert.equal(f('Tờ 1 000 đồng'), 'Tờ 1000 đồng');
  assert.equal(f('Tờ 1 000 đồng'), 'Tờ 1000 đồng');
  assert.equal(f('Số 1 000 000'), 'Số 1000000');
  assert.match(f('1 km = 1 000 m'), /^1 ki-lô-mét\s+bằng\s+1000 mét$/);
  // Chữ thường giữ nguyên: đơn vị chỉ đổi khi đứng ngay sau một số và không dính chữ cái phía sau
  for (const s of ['Có 3 máy bay', 'Con làm 5 lần', 'Rót 2 lít nước', 'Cân 3 ki-lô-gam', 'm và l, g, đ', 'Bài 5 lớp 2', 'Có 5 gói kẹo', '4 mét', '500 đồng']) assert.equal(f(s), s, s);
  // Dãy số cách nhau bằng dấu phẩy không bị gộp
  assert.equal(f('Đếm thêm: 100, 200, 300'), 'Đếm thêm: 100, 200, 300');
  // Dấu phép tính như trước
  assert.match(f('36 + 27 = 63'), /36\s+cộng\s+27\s+bằng\s+63/);
  assert.match(f('12 − 5 và 5 × 2 và 8 : 2'), /12\s+trừ\s+5 và 5\s+nhân\s+2 và 8 chia 2/);
});

test('AmThanh.mo: AudioContext đang "interrupted" (iOS) hay "suspended" thì mở lại, "running" thì thôi', () => {
  const w = loadGame('dao-khung-long', ['js/am-thanh.js']);
  const cac = [];
  w.AudioContext = function () {
    this.state = 'running'; this.resume = () => { this.soLanMo = (this.soLanMo || 0) + 1; this.state = 'running'; return Promise.resolve(); };
    this.createGain = () => ({ gain: { value: 0 }, connect() {} }); this.destination = {};
    cac.push(this);
  };
  w.AmThanh.mo();
  assert.equal(cac.length, 1);
  const ac = cac[0];
  w.AmThanh.mo();
  assert.equal(ac.soLanMo || 0, 0, 'đang chạy thì không gọi resume');
  ac.state = 'interrupted';
  w.AmThanh.mo();
  assert.equal(ac.soLanMo, 1, 'iOS interrupted thì resume');
  ac.state = 'suspended';
  w.AmThanh.mo();
  assert.equal(ac.soLanMo, 2);
  assert.equal(cac.length, 1, 'không tạo AudioContext thứ hai');
});

test('PhanHoi.loiDoc: đọc tên lỗi, từng bước rồi câu "Vậy..." theo đúng thứ tự trên thẻ', () => {
  const w = loadGame('dao-khung-long', FILES.concat(['js/am-thanh.js', 'js/phan-hoi.js']));
  const NH = w.NganHang, PH = w.PhanHoi;
  const rng = NH.taoRng(5);
  let dem = 0;
  for (const kn of ['cong-qua-10', 'tru-nho-2cs-2cs', 'cau-tao-so-1000', 'can-kg', 'kha-nang']) {
    if (!NH.KY_NANG[kn]) continue;
    for (let i = 0; i < 20; i++) {
      const q = NH.taoCau(kn, null, rng, { dang: 'chon_dap_an' });
      const sai = (q.lua_chon || []).find((x) => NH.nhanBietLoi(q.cau_truc, x.gia_tri).length);
      if (!sai) continue;
      const loi = NH.nhanBietLoi(q.cau_truc, sai.gia_tri);
      const kq = { loi: loi, loiNoi: NH.loiNoiVoiBe(q.cau_truc, sai.gia_tri, loi) };
      const ds = PH.loiDoc(q, sai.gia_tri, kq);
      const buoc = (q.loi_giai && q.loi_giai.buoc) || [];
      assert.equal(ds.length, 1 + buoc.filter((b) => String(b).trim()).length + 1, kn);
      assert.ok(ds[0].includes(kq.loiNoi.replace(/[.!\s]+$/, '')), 'câu đầu gọi tên lỗi: ' + kn);
      if (loi[0] !== 'khac') assert.match(ds[0], /^Gần đúng rồi\. /);
      assert.deepEqual(ds.slice(1, -1), buoc.map(String).filter((b) => b.trim()));
      assert.equal(ds[ds.length - 1], q.ket_luan || 'Vậy ' + q.de.replace('?', String(q.dap_an)));
      assert.ok(ds.every((c) => c.indexOf(String.fromCharCode(0x2014)) < 0), 'không có gạch dài');
      dem++;
    }
  }
  assert.ok(dem >= 40, 'đủ câu để kiểm: ' + dem);
});

test('Dao.tomTatTrangChu: { v: 1, luc, be: [{ ten, qua_mong, man_xong, sao }] } cho mọi bé; Dao.loiKetThuc ngắn', () => {
  const w = loadGame('dao-khung-long', FILES);
  const DAO = w.Dao;
  const ds = [
    { id: 'be_1', ten: 'An', khung_long: { qua_mong: 1234.4 }, ky_luc: { 'v1-m1': { lan_choi: 2, sao: 3 }, 'v2-m1': { lan_choi: 1, sao: 1, giay: 80 }, 'v2-m2': { lan_choi: 0, sao: 0 } } },
    { id: 'be_2', ten: 'Bình', khung_long: { qua_mong: 0 } },
    { id: 'be_3' } // hồ sơ hỏng: bỏ qua
  ];
  const t = DAO.tomTatTrangChu(ds, Date.UTC(2026, 8, 29, 3, 0, 0));
  assert.deepEqual(JSON.parse(JSON.stringify(t)), {
    v: 1, luc: '2026-09-29T03:00:00.000Z',
    be: [{ ten: 'An', qua_mong: 1234, man_xong: 2, sao: 4 }, { ten: 'Bình', qua_mong: 0, man_xong: 0, sao: 0 }]
  });
  assert.deepEqual(JSON.parse(JSON.stringify(DAO.tomTatTrangChu([]).be)), []);
  assert.ok(!isNaN(Date.parse(DAO.tomTatTrangChu(null).luc)));
  // Sao mỗi màn tối đa 3 (dữ liệu hỏng không làm phồng tổng)
  assert.equal(DAO.tomTatTrangChu([{ ten: 'C', ky_luc: { a: { lan_choi: 1, sao: 9 } } }]).be[0].sao, 3);
  assert.equal(DAO.loiKetThuc(2, 42), 'Con được 2 sao, 42 quả mọng!');
  assert.equal(DAO.loiKetThuc(0, 6), 'Con được 6 quả mọng!');
  assert.equal(DAO.loiKetThuc(3, 0), 'Con được 3 sao!');
  assert.equal(DAO.loiKetThuc(0, 0), 'Con chơi xong màn này rồi!');
});

test('VanChoi.coTienTrinh: chưa trả lời thì không có tiến trình; trả lời một lần (kể cả sai) là có', () => {
  const w = loadGame('dao-khung-long', FILES);
  const NH = w.NganHang;
  let n = 0;
  const nk = { batDauVan: () => 'v', cauHien: () => 'c' + (++n), thaoTac: () => null, goiY: () => null, traLoi: () => null, msTrongCau: () => 3000, cauKetThuc: () => null, phanHoiXem: () => null, ketThucVan: () => Promise.resolve([]) };
  const man = w.Dao.man('v2-m1');
  const van = new w.VanChoi({ nk: nk, game: man.game, vung: man.vung, man: man, hatGiong: 3, soCau: 4 });
  van.batDau({});
  assert.equal(van.coTienTrinh(), false);
  const q = van.cauTiep();
  van.thaoTac('doi_lan', { tu: 'lan_giua', den: 'lan_trai' });
  assert.equal(van.coTienTrinh(), false, 'đổi làn chưa phải trả lời');
  const sai = q.lua_chon.find((x) => NH.nhanBietLoi(q.cau_truc, x.gia_tri).length).gia_tri;
  van.traLoi(sai);
  assert.equal(van.coTienTrinh(), true);
});

/* ---------------- KhungChoi với một DOM giả nhỏ (ghi lại trình nghe sự kiện để bấm nút) ---------------- */

function domGia(w) {
  const theoId = {};
  function el(tag) {
    const nghe = {};
    const lop = new Set();
    const e = {
      tagName: String(tag || 'div').toUpperCase(), style: { setProperty() {} }, attributes: {}, children: [], textContent: '', innerHTML: '', src: '', disabled: false,
      classList: { add: (c) => lop.add(c), remove: (c) => lop.delete(c), contains: (c) => lop.has(c), toggle: (c, b) => { const on = b === undefined ? !lop.has(c) : !!b; if (on) lop.add(c); else lop.delete(c); return on; } },
      setAttribute(k, v) { this.attributes[k] = String(v); }, getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; }, removeAttribute(k) { delete this.attributes[k]; },
      appendChild(c) { this.children.push(c); return c; }, insertBefore(c) { this.children.push(c); return c; }, remove() {},
      addEventListener(t, f) { (nghe[t] = nghe[t] || []).push(f); }, removeEventListener() {},
      bam(ev) { (nghe.click || []).forEach((f) => f(Object.assign({ target: { closest: () => null } }, ev || {}))); },
      querySelector: () => null, querySelectorAll: () => [], closest: () => null, focus() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 })
    };
    Object.defineProperty(e, 'offsetWidth', { get: () => 100 });
    return e;
  }
  w.document.getElementById = (id) => theoId[id] || (theoId[id] = el('div'));
  w.document.createElement = (t) => el(t);
  return theoId;
}

function moKhung() {
  const w = loadGame('dao-khung-long', ['js/am-thanh.js', 'js/phan-hoi.js', 'js/khung-choi.js']);
  const theoId = domGia(w);
  const nk = [];
  w.NhatKy = { tamDung: (x) => nk.push(['tam_dung', x]), tiepTuc: (x) => nk.push(['tiep_tuc', x]) };
  return { w, theoId, nk, K: w.KhungChoi };
}
function vanGia(coTienTrinh) {
  return { tienDo: () => ({ xong: 0, tong: 4, dang: 1, onLai: false }), coTienTrinh: () => coTienTrinh, seOnLai: () => false, q: null };
}

test('KhungChoi.hen: hẹn giờ tới lúc tạm dừng thì chờ bé bấm Chơi tiếp; ván đổi thì bỏ', async () => {
  const { theoId, K } = moKhung();
  const chay = [];
  K.mo({ van: vanGia(false), game: 'lat-the', onThoat() {} });
  K.hen(() => chay.push('a'), 5);
  await cho(20);
  assert.deepEqual(chay, ['a'], 'không tạm dừng thì chạy đúng giờ');
  K.tamDung('nut');
  K.hen(() => chay.push('b'), 5);
  K.khiChoi(() => chay.push('c'));
  await cho(25);
  assert.deepEqual(chay, ['a'], 'đang tạm dừng: chưa chạy');
  theoId['kc-tiep'].bam();
  assert.deepEqual(chay, ['a', 'c', 'b'], 'Chơi tiếp thì chạy theo thứ tự tới hạn (c tới hạn ngay lúc gọi, b sau 5 ms)');
  // Hẹn giờ của ván cũ không chạy sang ván mới
  K.hen(() => chay.push('cu'), 5);
  K.mo({ van: vanGia(false), game: 'lat-the', onThoat() {} });
  await cho(20);
  assert.deepEqual(chay, ['a', 'c', 'b']);
  // Không có ván nào đang mở: khiChoi chạy ngay (hẹn giờ riêng của game tự kiểm tra ván của mình)
  const k2 = moKhung().K;
  const x = [];
  k2.khiChoi(() => x.push(1));
  assert.deepEqual(x, [1]);
});

test('KhungChoi: bấm Về đảo khi ván chưa có câu trả lời thì về luôn; ván dở thì hỏi lại, "Chơi tiếp" quay lại ván', () => {
  // Chưa làm gì: về luôn
  let m = moKhung();
  let thoat = 0;
  m.K.mo({ van: vanGia(false), game: 'lat-the', onThoat: () => thoat++ });
  m.K.tamDung('nut');
  m.theoId['kc-ve-dao'].bam();
  assert.equal(thoat, 1);

  // Ván dở: hỏi lại trước
  m = moKhung();
  thoat = 0;
  m.K.mo({ van: vanGia(true), game: 'lat-the', hinhGoiY: 'rex.webp', onThoat: () => thoat++ });
  m.K.tamDung('nut');
  m.theoId['kc-ve-dao'].bam();
  assert.equal(thoat, 0, 'chưa thoát, đang hỏi lại');
  const man = m.theoId['man-choi'];
  const hop = man._hoiVeDao;
  assert.ok(hop && !hop.el.classList.contains('hidden'), 'thẻ hỏi lại đang hiện');
  assert.match(hop.el.innerHTML, /Con muốn về đảo\?/);
  assert.ok(m.theoId['kc-tam'].classList.contains('hidden'), 'menu Tạm dừng ẩn sau thẻ hỏi lại');
  const nut = (loai) => ({ target: { closest: () => ({ getAttribute: () => loai }) } });
  hop.el.bam(nut('tiep'));
  assert.equal(thoat, 0);
  assert.ok(hop.el.classList.contains('hidden'));
  assert.equal(m.K._trangThai().tamDung, false, 'Chơi tiếp: ván chạy lại');
  assert.deepEqual(m.nk.map((x) => x[0]), ['tam_dung', 'tiep_tuc']);
  // Lần hai chọn Về đảo
  m.K.tamDung('nut');
  m.theoId['kc-ve-dao'].bam();
  hop.el.bam(nut('ve'));
  assert.equal(thoat, 1);
});
