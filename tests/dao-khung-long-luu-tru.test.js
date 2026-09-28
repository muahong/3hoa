'use strict';
/* Đảo Khủng Long: giữ dữ liệu của bé (nhóm B của lần rà soát 2026-09-28), không cần trình duyệt.
   - Ván dở vì app bị tắt ngang: quả mọng bé đã kiếm được ghi vào dấu mở và cộng lại ở lần mở sau.
   - Sao lưu cả máy rồi khôi phục ở "máy" khác: đủ hồ sơ, tóm tắt, nhật ký; gộp theo mã; tệp lạ bị từ chối; giới hạn số bé.
   - Một cửa sổ giữ đảo: cửa sổ khác mở đảo thì cửa sổ này nhường, thôi ghi nhật ký, dấu mở và kho.
   - Sự kiện được chuẩn hóa qua JSON trước khi ghi (giá trị lạ không làm hỏng cả lô). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./lib/load.js');

const J = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const deq = (a, b, m) => assert.deepEqual(J(a), J(b), m);

const FILES = ['js/nhat-ky.js', 'js/ngan-hang.js', 'js/cau-so-sanh.js', 'js/cau-do-luong.js', 'js/cau-tien.js', 'js/cau-thong-ke.js', 'js/cau-hinh-hoc.js', 'js/cau-thoi-gian.js', 'js/hoc-tap.js', 'js/dao.js', 'js/ho-so.js', 'js/van-choi.js'];

function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => map.clear(),
    key: (i) => Array.from(map.keys())[i] || null,
    get length() { return map.size; }
  };
}

function moi(opts) {
  const w = loadGame('dao-khung-long', FILES, opts);
  const dh = { t: Date.UTC(2026, 9, 12, 12, 4, 0), p: 1000 };
  w.NhatKy.caiDongHo({ now: () => dh.t, perf: () => dh.p });
  dh.toi = (ms) => { dh.t += ms; dh.p += ms; };
  return { w, dh, NK: w.NhatKy, NH: w.NganHang, HT: w.HocTap, DAO: w.Dao, HS: w.HoSo };
}

/** Chơi n câu đúng của màn v2-m1 trong một ván còn mở (không kết thúc ván). */
function choiDo(ctx, n) {
  const { w, NK, DAO, dh } = ctx;
  const man = Object.assign({}, DAO.man('v2-m1'), { dang: 'chon_dap_an' });
  const van = new w.VanChoi({ nk: NK, game: man.game, vung: man.vung, man: man, hatGiong: 4, soCau: 12 });
  van.batDau({});
  for (let i = 0; i < n; i++) {
    const q = van.cauTiep();
    dh.toi(2000);
    van.traLoi(q.dap_an);
  }
  return van;
}

test('ván dở vì app bị tắt: quả mọng đã kiếm được giữ lại và ghi vào van_ket_thuc ở lần mở sau', async () => {
  const kho = makeStorage();
  const a = moi({ localStorage: kho });
  await a.NK.khoiDong({ khongDungIndexedDB: true });
  a.NK.datBe('be_TATNGANG01');
  const van = choiDo(a, 4);
  assert.equal(van.quaMong.tong, 12, '4 câu tự làm đúng, mỗi câu 3 quả mọng');
  const dau = JSON.parse(kho.getItem('dkl-phien-mo-v1'));
  assert.equal(dau.van.quaMong, 12, 'dấu mở ghi số quả mọng hiện có');
  // "Mở lại app": cửa sổ mới, cùng localStorage, đóng ván dở của lần trước
  const b = moi({ localStorage: kho });
  await b.NK.khoiDong({ khongDungIndexedDB: true });
  const ds = b.NK.layVanDongDo();
  assert.equal(ds.length, 1);
  assert.equal(ds[0].qua_mong, 12);
  const evs = await b.NK.docCuaBe('be_TATNGANG01');
  const kt = evs.find((e) => e.loai === 'van_ket_thuc');
  assert.equal(kt.du_lieu.qua_mong, 12);
  assert.equal(kt.du_lieu.bo_do, true);
  assert.equal(b.HT.tomTatVan(evs).qua_mong, 12, 'tóm tắt ván mang đúng số quả mọng');
});

test('sao lưu cả máy rồi khôi phục ở máy khác: đủ hồ sơ, tóm tắt, nhật ký; khôi phục lại lần nữa không nhân đôi', async () => {
  const a = moi();
  await a.NK.khoiDong({ khongDungIndexedDB: true });
  const p = await a.HS.taoMoi({ ten: 'Bin', tuoi: 7, lop: 2, phong_cach: 'dung_manh' });
  p.khung_long.qua_mong = 321;
  await a.HS.luu(p);
  a.NK.datBe(p.id);
  const van = choiDo(a, 3);
  a.dh.toi(1000);
  const kq = await van.ketThuc(false, {});
  const kho = a.NK.kho;
  await kho.datNhieu('tom_tat_cau', a.HT.tomTatCacCau(kq.suKien));
  await kho.dat('tom_tat_van', a.HT.tomTatVan(kq.suKien));
  await kho.dat('ho_so_hoc_tap', a.HT.hoSoHocTap(p.id, a.HT.tomTatCacCau(kq.suKien), [], '2026-10-12'));
  const g = JSON.parse(JSON.stringify(await a.NK.saoLuu()));
  assert.equal(g.dinh_dang, 'dao-khung-long-sao-luu');
  assert.equal(g.be.length, 1);
  assert.equal(g.be[0].tom_tat_cau.length, 3);
  assert.ok(g.be[0].su_kien.length > 10);

  const b = moi();
  await b.NK.khoiDong({ khongDungIndexedDB: true });
  const kt = await b.NK.kiemTraSaoLuu(g);
  assert.equal(kt.hop_le, true);
  deq(kt.be.map((x) => [x.ten, x.so_cau, x.da_co]), [['Bin', 3, false]]);
  const r = await b.NK.khoiPhuc(g, 8);
  deq([r.so_be, r.so_cau, r.so_van], [1, 3, 1]);
  const hs = await b.HS.lay(p.id);
  assert.equal(hs.khung_long.qua_mong, 321);
  assert.equal((await b.NK.kho.theoBe('tom_tat_cau', p.id)).length, 3);
  assert.equal((await b.NK.docCuaBe(p.id)).length, g.be[0].su_kien.length);
  assert.equal(await b.NK.kho.lay('ho_so_hoc_tap', p.id), null, 'hồ sơ học tập để app tính lại');
  // Khôi phục lần nữa: gộp theo mã, không nhân đôi
  await b.NK.khoiPhuc(g, 8);
  assert.equal((await b.NK.kho.theoBe('tom_tat_cau', p.id)).length, 3);
  assert.equal((await b.NK.docCuaBe(p.id)).length, g.be[0].su_kien.length);
  assert.equal((await b.NK.kiemTraSaoLuu(g)).be[0].da_co, true);
});

test('khôi phục: hồ sơ trùng mã giữ bản cập nhật sau; tệp lạ bị từ chối; máy đủ số bé thì bỏ qua bé mới', async () => {
  const { NK, HS } = moi();
  await NK.khoiDong({ khongDungIndexedDB: true });
  const p = await HS.taoMoi({ ten: 'Na', tuoi: 7, lop: 2, phong_cach: 'de_thuong' });
  const cu = Object.assign(JSON.parse(JSON.stringify(p)), { cap_nhat_luc: '2026-01-01T00:00:00.000+07:00' });
  cu.khung_long.qua_mong = 5;
  p.khung_long.qua_mong = 999;
  await HS.luu(p);
  await NK.khoiPhuc({ dinh_dang: 'dao-khung-long-sao-luu', phien_ban: 1, be: [{ ho_so: cu, tom_tat_cau: [], tom_tat_van: [], su_kien: [] }] }, 8);
  assert.equal((await HS.lay(p.id)).khung_long.qua_mong, 999, 'hồ sơ trên máy mới hơn thì giữ');
  for (const hong of [null, {}, { dinh_dang: 'khac' }, { dinh_dang: 'dao-khung-long-sao-luu', phien_ban: 2, be: [] },
    { dinh_dang: 'dao-khung-long-sao-luu', phien_ban: 1, be: [{ ho_so: { id: '../x', ten: 'A' } }] }]) {
    assert.equal((await NK.kiemTraSaoLuu(hong)).hop_le, false, JSON.stringify(hong));
  }
  await assert.rejects(NK.khoiPhuc({ dinh_dang: 'khac' }, 8));
  const moiBe = { ho_so: { id: 'be_01KMOIBE000000000000000000', ten: 'Mới', khung_long: { qua_mong: 0 } }, tom_tat_cau: [], tom_tat_van: [], su_kien: [] };
  const r = await NK.khoiPhuc({ dinh_dang: 'dao-khung-long-sao-luu', phien_ban: 1, be: [moiBe] }, 1);
  deq(r.bo_qua, ['Mới'], 'máy đã có 1 bé, tối đa 1');
  assert.equal(await HS.lay('be_01KMOIBE000000000000000000'), null);
});

test('một cửa sổ giữ đảo: cửa sổ khác mở đảo thì cửa sổ này nhường, thôi ghi nhật ký, dấu mở và kho', async () => {
  const kho = makeStorage();
  const a = moi({ localStorage: kho });
  let daNhuong = 0;
  await a.NK.giuThe(() => { daNhuong++; });
  await a.NK.khoiDong({ khongDungIndexedDB: true });
  a.NK.datBe('be_HAITHE0001');
  assert.ok(a.NK.ghi('thao_tac', { kieu: 'cham' }), 'đang giữ đảo thì ghi được');
  await a.NK.xa();
  const truoc = (await a.NK.docCuaBe('be_HAITHE0001')).length;
  // Cửa sổ thứ hai mở đảo (cùng localStorage): ghi mã thẻ của nó
  const b = moi({ localStorage: kho });
  await b.NK.giuThe(() => {});
  a.w.dispatchEvent({ type: 'storage', key: 'dkl-the-dang-mo-v1' });
  assert.equal(daNhuong, 1, 'cửa sổ cũ nhường');
  assert.equal(a.NK.daNhuong(), true);
  assert.equal(a.NK.ghi('thao_tac', { kieu: 'cham' }), null, 'nhường rồi thì không ghi sự kiện');
  const dau = kho.getItem('dkl-phien-mo-v1');
  a.NK.datBe(null);
  assert.equal(kho.getItem('dkl-phien-mo-v1'), dau, 'không động vào dấu mở của cửa sổ mới');
  await a.NK.kho.dat('ho_so', { id: 'be_HAITHE0001', ten: 'Ghi đè' });
  assert.equal(await a.NK.kho.lay('ho_so', 'be_HAITHE0001'), null, 'kho bỏ qua lần ghi của cửa sổ đã nhường');
  assert.equal((await a.NK.docCuaBe('be_HAITHE0001')).length, truoc);
  // Cửa sổ mới vẫn ghi bình thường
  await b.NK.khoiDong({ khongDungIndexedDB: true });
  b.NK.datBe('be_HAITHE0002');
  assert.ok(b.NK.ghi('thao_tac', { kieu: 'cham' }));
  assert.equal(b.NK.daNhuong(), false);
});

test('ghi nhật ký: sự kiện chuẩn hóa qua JSON (hàm, undefined bị bỏ) để một giá trị lạ không làm hỏng cả lô', async () => {
  const { NK } = moi();
  await NK.khoiDong({ khongDungIndexedDB: true });
  NK.datBe('be_CHUANHOA01');
  NK.ghi('thao_tac', { kieu: 'cham', la: function () {}, khong: undefined, so: 3 });
  await NK.xa();
  const ev = (await NK.docCuaBe('be_CHUANHOA01')).find((e) => e.loai === 'thao_tac');
  deq(Object.keys(ev.du_lieu).sort(), ['kieu', 'so']);
  assert.equal(NK.trangThaiKho().loai, 'bo_nho');
});
