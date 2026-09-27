'use strict';
/* Cưỡi Hổ Vượt Lửa trong Đảo Khủng Long (cuoi-ho/js/dao.js + các hook trong cuoi-ho/js/game.js).
   1. Hợp đồng với cầu nối, dùng một DaoCauNoi giả có kịch bản: sanSang lúc khởi động, batDau khi bé bấm "Bắt đầu",
      cauTiep khi hổ dừng trước cụm vòng (3 lựa chọn, vị trí tren/giua/duoi), cham rồi traLoi, phanHoi khi can_phan_hoi,
      goiY ba cấp (cấp 3 tắt một vòng sai, ghi loai_bo), tamDung/tiepTuc, ketThuc khi hết câu, veDao từ bảng tạm dừng;
      không hết giờ, không ghi localStorage của game.
   2. Không có ?dao=1 (hoặc không nằm trong iframe của đảo): game y như cũ.
   3. Chạy thật với cầu nối và ván chơi của đảo (dao-khung-long/js/cau-noi.js): màn v1-m4 và v8-m6 (và v6-m7 khi đã có kỹ năng
      xem-gio) từ đầu đến cuối, mọi sự kiện hợp lệ lược đồ v1, mỗi câu đủ chuỗi cau_hien → thao_tac → tra_loi → cau_ket_thuc. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadGame, makeWindow, makeStorage, ROOT } = require('./lib/load.js');
const { validate } = require('./lib/schema-lite.js');

const GAME = ['js/audio.js', 'js/lessons.js', 'js/profile.js', 'js/dao.js', 'js/game.js'];
const DAO_FILES = ['js/nhat-ky.js', 'js/ngan-hang.js', 'js/cau-so-sanh.js', 'js/cau-do-luong.js', 'js/cau-tien.js', 'js/cau-thong-ke.js', 'js/cau-hinh-hoc.js',
  'js/cau-thoi-gian.js', 'js/hoc-tap.js', 'js/dao.js', 'js/ho-so.js', 'js/van-choi.js', 'js/am-thanh.js', 'js/phan-hoi.js', 'js/cau-noi.js'];
const SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/du-an-toan-2-3/spec/06-su-kien-v1.schema.json'), 'utf8'));
const J = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
// Đối tượng tạo trong vm có prototype của realm khác: so sánh sau khi chuyển về JSON
const deq = (a, b, m) => assert.deepEqual(J(a), J(b), m);
const VI_TRI = ['tren', 'giua', 'duoi'];

/** Nạp game vào một window giả; search, parent: như khi đảo mở game trong iframe. */
function napGame(o) {
  o = o || {};
  const st = o.st || makeStorage();
  const w = makeWindow({ localStorage: st });
  if (o.search != null) w.location.search = o.search;
  if (o.parent !== undefined) w.parent = o.parent;
  const ctx = vm.createContext(w);
  for (const f of GAME) vm.runInContext(fs.readFileSync(path.join(ROOT, 'cuoi-ho', f), 'utf8'), ctx, { filename: 'cuoi-ho/' + f });
  return { w, st, X: w.__CuoiHo, D: w.CuoiHoDao };
}

/** Chạy vòng lặp game (bước 50 ms) tới khi dk() đúng; nhường lượt cho Promise (màn phản hồi của đảo). */
async function choDen(X, dk, toiDa) {
  for (let i = 0; i < (toiDa || 6000); i++) {
    if (dk()) return true;
    X.update(0.05);
    if (i % 5 === 0) await new Promise((r) => setImmediate(r));
  }
  return dk();
}
const dangChon = (X) => () => X.G.state === 'playing' && X.G.phase === 'choose';

/* ---------------- Cầu nối giả có kịch bản ---------------- */

function cauMau() {
  return [
    { stt: 1, tong: 3, ma_cau: '2.1|tia-so-100|tia:30,1,6,4', ky_nang: 'tia-so-100', noi_dung: '2.1', loai: 'tia_so', dang: 'chon_dap_an',
      de: 'Số nào ở chỗ dấu ? trên tia số?', de_doc: 'Trên tia số, mỗi vạch cách nhau 1. Số nào ở chỗ dấu hỏi?',
      hinh: '<svg class="tia-so" viewBox="0 0 640 120" xmlns="http://www.w3.org/2000/svg"><line x1="16" y1="50" x2="630" y2="50" stroke="#3b2f63"/></svg>',
      dap_an: 34, dap_an_nhan: '34', giay: 8, lan_thu_toi_da: 1,
      lua_chon: [{ gia_tri: 35, nhan: '35', hinh: '', dong_ho: null, dung: false, vi_tri: 'tren' }, { gia_tri: 34, nhan: '34', hinh: '', dong_ho: null, dung: true, vi_tri: 'giua' }, { gia_tri: 24, nhan: '24', hinh: '', dong_ho: null, dung: false, vi_tri: 'duoi' }] },
    { stt: 2, tong: 3, ma_cau: '2.5|lien-truoc-sau-100|lien_sau:39', ky_nang: 'lien-truoc-sau-100', noi_dung: '2.5', loai: 'so', dang: 'chon_dap_an',
      de: 'Số liền sau của 39 là ?', de_doc: 'Số liền sau của 39 là số nào?', hinh: '', dap_an: 40, dap_an_nhan: '40', giay: 7, lan_thu_toi_da: 1,
      lua_chon: [{ gia_tri: 30, nhan: '30', dung: false, vi_tri: 'tren' }, { gia_tri: 310, nhan: '310', dung: false, vi_tri: 'giua' }, { gia_tri: 40, nhan: '40', dung: true, vi_tri: 'duoi' }] },
    { stt: 3, tong: 3, ma_cau: '2.1|tia-so-100|day:45,10,5,3', ky_nang: 'tia-so-100', noi_dung: '2.1', loai: 'tia_so', dang: 'chon_dap_an',
      de: '45, 55, 65, ?, 85', de_doc: 'Đếm thêm 10: 45, 55, 65, mấy, 85', hinh: '', dap_an: 75, dap_an_nhan: '75', giay: 8, lan_thu_toi_da: 2,
      lua_chon: [{ gia_tri: 75, nhan: '75', dung: true, vi_tri: 'tren' }, { gia_tri: 85, nhan: '85', dung: false, vi_tri: 'giua' }, { gia_tri: 65, nhan: '65', dung: false, vi_tri: 'duoi' }] }
  ];
}

function taoStub(cauHoi, o) {
  o = o || {};
  const goi = [];
  let i = 0, mo = null, cap = 0, lan = 0;
  const loiNeu = (ten) => { if (!mo) throw new Error(ten + ' khi không có câu đang mở'); };
  const stub = {
    phien_ban: 1,
    sanSang() { goi.push(['sanSang']); return { phien_ban: 1, game: 'cuoi-ho', ten_game: 'Cưỡi Hổ Vượt Lửa', man: { id: 'v1-m4', ten: 'Tia số, đếm thêm', so_cau: cauHoi.length }, be: { ten: 'An' }, am_thanh: { tieng: true, giong: !!o.giong } }; },
    thongTin() { return stub.sanSang(); },
    batDau(d) { goi.push(['batDau', J(d)]); return 'va_TEST'; },
    cauTiep(t) {
      goi.push(['cauTiep', J(t)]);
      if (mo) throw new Error('Câu trước chưa kết thúc');
      const c = cauHoi[i++] || null;
      mo = c; cap = 0; lan = 0;
      return c ? J(c) : null;
    },
    thaoTac(k, d) { loiNeu('thaoTac'); goi.push(['thaoTac', k, J(d)]); return true; },
    goiY(them) { loiNeu('goiY'); goi.push(['goiY', J(them)]); if (cap >= 3) return null; cap++; return { cap: cap, loi: 'Gợi ý cấp ' + cap }; },
    traLoi(v, them) {
      loiNeu('traLoi');
      goi.push(['traLoi', v, J(them)]);
      lan++;
      if (String(v) === String(mo.dap_an)) { mo = null; return { dung: true, loi: [], loi_noi: null, thu_lai: false, can_phan_hoi: false, ket_qua: lan > 1 ? 'dung_lan_2' : cap ? 'dung_sau_goi_y' : 'dung_ngay', qua_mong: 3, dap_an: v, dap_an_nhan: String(v) }; }
      if (lan < (mo.lan_thu_toi_da || 1)) return { dung: false, loi: ['dem-lech'], loi_noi: 'Con đếm lệch một chút rồi', thu_lai: true, can_phan_hoi: false, ket_qua: null, qua_mong: 0, dap_an: mo.dap_an };
      return { dung: false, loi: ['qua-chuc'], loi_noi: 'Sau 39 là sang chục mới: 40', thu_lai: false, can_phan_hoi: true, ket_qua: null, qua_mong: 0, dap_an: mo.dap_an };
    },
    hetGio() { loiNeu('hetGio'); goi.push(['hetGio']); mo = null; return { ket_qua: 'het_gio' }; },
    phanHoi(v, kq) { loiNeu('phanHoi'); goi.push(['phanHoi', v, J(kq)]); mo = null; return Promise.resolve(true); },
    tamDung(n) { goi.push(['tamDung', n]); return true; },
    tiepTuc(n) { goi.push(['tiepTuc', n]); return true; },
    ketThuc(t) { goi.push(['ketThuc', J(t)]); return Promise.resolve(true); },
    veDao(t) { goi.push(['veDao', J(t)]); return Promise.resolve(true); },
    doc(chu) { goi.push(['doc', chu]); return true; }
  };
  if (o.conCau) stub.conCau = function () { return i < cauHoi.length; };
  return { stub, goi, ten: () => goi.map((g) => g[0]) };
}

function moDao(cauHoi, o) {
  const s = taoStub(cauHoi, o);
  const g = napGame({ search: '?dao=1&man=v1-m4', parent: { DaoCauNoi: s.stub } });
  return Object.assign(g, { s });
}

/* ---------------- 1. Hợp đồng ---------------- */

test('cuoi-ho đảo: sanSang lúc khởi động, batDau khi bé bấm Bắt đầu; không menu, không hết giờ', async () => {
  const { D, X, s } = moDao(cauMau());
  assert.equal(D.bat, true);
  deq(s.ten(), ['sanSang'], 'chỉ báo sẵn sàng, chưa bắt đầu ván');
  assert.equal(X.G.state, 'dao', 'thẻ bắt đầu, không phải menu');
  D.batDauChoi();
  D.batDauChoi();   // bấm hai lần không mở hai ván
  deq(s.goi.filter((g) => g[0] === 'batDau').map((g) => g[1]), [{ toc_do: 0.9, so_vong_moi_cum: 3, het_gio: false }]);
  assert.equal(X.G.practice, true, 'không mất tim');
  X.G.state = 'playing';
  assert.ok(await choDen(X, dangChon(X)));
  const c = s.goi.find((g) => g[0] === 'cauTiep');
  deq(c[1], { so_lua_chon: 3, vi_tri: VI_TRI });
  // Hổ đứng chờ mãi, không hết giờ, không giục bằng tiếng
  for (let i = 0; i < 1500; i++) X.update(0.05);
  assert.equal(X.G.phase, 'choose');
  assert.ok(!s.ten().includes('hetGio'));
});

test('cuoi-ho đảo: câu hiện khi hổ dừng; chạm vòng ghi cham rồi traLoi; sai hẳn thì màn phản hồi rồi chạy tiếp; hết câu thì ketThuc', async () => {
  const st = makeStorage();
  const s = taoStub(cauMau());
  const g = napGame({ st, search: '?dao=1&man=v1-m4', parent: { DaoCauNoi: s.stub } });
  const { D, X } = g;
  D.batDauChoi();
  X.G.state = 'playing';
  // Cụm đầu hiện "?" cho tới khi hổ dừng: chưa gọi cauTiep
  assert.equal(X.G.gates.length, 1);
  assert.equal(X.G.gates[0].q, null);
  assert.ok(!s.ten().includes('cauTiep'));
  assert.ok(await choDen(X, dangChon(X)));
  let gate = X.curGate();
  assert.equal(gate.q.options.map((o) => o.text).join(','), '35,34,24');
  assert.equal(gate.q.answer, 1);
  assert.match(gate.q.prompt, /<span class="dao-hoi">\?<\/span> trên tia số\?$/, 'dấu ? đứng riêng thành ô cam, dấu hỏi cuối câu giữ nguyên');
  assert.match(gate.q.hinhHtml, /^<svg class="tia-so"/);
  assert.equal(D.vong(), 'Vòng 1/3');
  // Câu 1: đúng (vòng giữa)
  X.choose(1);
  const i1 = s.goi.findIndex((x) => x[0] === 'thaoTac');
  deq(s.goi[i1], ['thaoTac', 'cham', { doi_tuong: 'vong_lua', gia_tri: 34, vi_tri: 'giua', cach: 'cham' }]);
  deq(s.goi[i1 + 1], ['traLoi', 34, { vi_tri: 'giua' }]);
  assert.equal(X.G.phase, 'jump');
  // Câu 2: bé chọn 310 (qua chục) → nhảy qua vòng sai, vòng đúng sáng xanh, màn phản hồi của đảo
  assert.ok(await choDen(X, dangChon(X)));
  gate = X.curGate();
  assert.equal(gate.q.cau.ma_cau, '2.5|lien-truoc-sau-100|lien_sau:39');
  assert.match(gate.q.prompt, /<b>39<\/b> là <span class="dao-hoi">\?<\/span>/);
  X.choose(1);
  assert.ok(await choDen(X, () => s.ten().includes('phanHoi')), 'mở màn Gần đúng rồi');
  const ph = s.goi.find((x) => x[0] === 'phanHoi');
  assert.equal(ph[1], 310);
  assert.equal(ph[2].can_phan_hoi, true);
  assert.equal(gate.rings[2].reveal, true, 'vòng 40 sáng xanh');
  assert.equal(X.G.hearts, 3, 'không mất tim');
  // Câu 3: thử lại được (lan_thu_toi_da 2): chọn sai thì vòng tắt, hổ đứng yên; chọn lại đúng
  assert.ok(await choDen(X, dangChon(X)));
  gate = X.curGate();
  assert.equal(gate.q.loaiDe, 'day');
  X.choose(1);
  assert.equal(X.G.phase, 'choose', 'thử lại: hổ không nhảy');
  assert.equal(gate.rings[1].burst >= 0, true, 'vòng sai đã tắt');
  X.choose(1);   // vòng đã tắt: không làm gì
  assert.equal(s.goi.filter((x) => x[0] === 'traLoi').length, 3);
  X.choose(0);
  assert.equal(X.G.phase, 'jump');
  // Hết câu: cụm "?" cuối nổ pháo hoa, hổ về đích, ketThuc đúng một lần
  assert.ok(await choDen(X, () => s.ten().includes('ketThuc')));
  deq(s.ten().filter((x) => x === 'ketThuc'), ['ketThuc']);
  const kt = s.goi.find((x) => x[0] === 'ketThuc')[1];
  assert.equal(kt.diem, X.G.score);
  assert.ok(kt.diem > 0);
  assert.match(kt.dong_phu, /^Hổ nhảy qua 2 vòng lửa · [\d.]+ điểm$/);
  assert.equal(D._trangThai().quaMong, 6);
  assert.equal(D._trangThai().giaiDoan, 'het');
  // Thứ tự gọi: cauTiep chỉ sau khi câu trước đóng (cầu nối giả ném lỗi nếu sai thứ tự)
  deq(s.ten().filter((x) => x !== 'doc'), ['sanSang', 'batDau', 'cauTiep', 'thaoTac', 'traLoi', 'cauTiep', 'thaoTac', 'traLoi', 'phanHoi',
    'cauTiep', 'thaoTac', 'traLoi', 'thaoTac', 'traLoi', 'cauTiep', 'ketThuc']);
  deq(D._trangThai().loi, []);
  assert.equal(st.getItem('cuoi-ho-v1'), null, 'không ghi tiến trình riêng của game');
});

test('cuoi-ho đảo: gợi ý ba cấp, cấp 3 tắt một vòng sai (loai_bo), nút 💡 tắt sau cấp 3', async () => {
  const { D, X, s } = moDao(cauMau());
  D.batDauChoi();
  X.G.state = 'playing';
  assert.ok(await choDen(X, dangChon(X)));
  const gate = X.curGate();
  X.useHint(); X.useHint();
  assert.ok(gate.rings.every((r) => r.burst < 0), 'cấp 1, 2 chỉ là lời nhắc');
  X.useHint();
  X.useHint();   // hết cấp: không gọi nữa
  const gy = s.goi.filter((x) => x[0] === 'goiY');
  assert.equal(gy.length, 3);
  deq(gy[0][1], {});
  const lb = gy[2][1];
  assert.ok(lb.loai_bo === 35 || lb.loai_bo === 24, 'bỏ một đáp án sai');
  const lane = VI_TRI.indexOf(lb.vi_tri);
  assert.equal(gate.q.options[lane].gia_tri, lb.loai_bo);
  assert.ok(gate.rings[lane].burst >= 0, 'vòng đó tắt');
  assert.equal(gate.rings.filter((r) => r.burst < 0).length, 2, 'còn đáp án đúng và một vòng sai');
  assert.equal(D.conGoiY(gate), false);
  assert.equal(X.G.hints, 3);
  X.choose(gate.q.answer);
  assert.equal(s.goi.filter((x) => x[0] === 'traLoi').length, 1);
});

test('cuoi-ho đảo: tạm dừng ghi nguồn (nút, ẩn tab); Về đảo từ bảng tạm dừng gọi veDao một lần', async () => {
  const { D, X, s } = moDao(cauMau());
  D.batDauChoi();
  X.G.state = 'playing';
  assert.ok(await choDen(X, dangChon(X)));
  X.pauseGame();
  assert.equal(X.G.state, 'paused');
  X.resumeGame();
  X.pauseGame('an_tab');
  deq(s.goi.filter((x) => x[0] === 'tamDung' || x[0] === 'tiepTuc'), [['tamDung', 'nut'], ['tiepTuc', 'nut'], ['tamDung', 'an_tab']]);
  X.G.score = 250;
  D.veDao();
  D.veDao();
  deq(s.goi.filter((x) => x[0] === 'veDao'), [['veDao', { diem: 250 }]]);
  assert.ok(!s.ten().includes('ketThuc'));
});

test('cuoi-ho đảo: câu 2 lựa chọn tắt vòng thứ ba; câu không có lựa chọn dùng số liền kề; đồng hồ và hình nhỏ vẽ trong vòng', async () => {
  const hai = { stt: 1, tong: 4, ma_cau: '2.2|so-sanh-100|dau:5,7', de: '5 … 7', hinh: '', dap_an: '<', dap_an_nhan: '<', giay: 7,
    lua_chon: [{ gia_tri: '<', nhan: '<', dung: true, vi_tri: 'tren' }, { gia_tri: '>', nhan: '>', dung: false, vi_tri: 'giua' }] };
  const nhap = { stt: 2, tong: 4, ma_cau: '2.10|cong-100|12+3', de: '12 + 3 = ?', hinh: '', dap_an: 15, dap_an_nhan: '15', giay: 7, lua_chon: [] };
  const gio = { stt: 3, tong: 4, ma_cau: 'B2.11|xem-gio|8:30', de: 'Đồng hồ nào chỉ 8 giờ 30 phút?', hinh: '', dap_an: '8:30', dap_an_nhan: '8 giờ 30 phút', giay: 9,
    lua_chon: [{ gia_tri: '8:30', nhan: '8 giờ 30 phút', dong_ho: { h: 20, m: 30 }, dung: true, vi_tri: 'tren' }, { gia_tri: '6:40', nhan: '6 giờ 40 phút', dong_ho: { h: 6, m: 40 }, dung: false, vi_tri: 'giua' },
      { gia_tri: '9:30', nhan: '9 giờ 30 phút', dong_ho: { h: 9, m: 30 }, dung: false, vi_tri: 'duoi' }] };
  const hinh = { stt: 4, tong: 4, ma_cau: 'B2.3|hinh-tu-giac|x', de: 'Hình nào là hình tứ giác?', hinh: '', dap_an: 'a', dap_an_nhan: 'Hình A', giay: 8,
    lua_chon: [{ gia_tri: 'a', nhan: 'Hình A', hinh: '<svg viewBox="0 0 80 60"><rect width="80" height="60"/></svg>', dung: true, vi_tri: 'tren' },
      { gia_tri: 'b', nhan: 'Hình B', hinh: '<svg viewBox="0 0 80 60"><circle cx="40" cy="30" r="20"/></svg>', dung: false, vi_tri: 'giua' },
      { gia_tri: 'c', nhan: 'Hình C', hinh: '<svg viewBox="0 0 80 60"><path d="M0 0 L80 60"/></svg>', dung: false, vi_tri: 'duoi' }] };
  const { D, X, s } = moDao([hai, nhap, gio, hinh]);
  D.batDauChoi();
  X.G.state = 'playing';
  assert.ok(await choDen(X, dangChon(X)));
  let gate = X.curGate();
  assert.equal(gate.q.options.length, 2);
  assert.equal(gate.rings[2].burst, 1, 'vòng thứ ba không có đáp án: tắt hẳn');
  X.choose(2);   // chạm vòng đã tắt: không làm gì
  assert.ok(!s.ten().includes('traLoi'));
  X.choose(0);
  assert.ok(await choDen(X, dangChon(X)));
  gate = X.curGate();
  deq(gate.q.options.map((o) => o.gia_tri).sort((a, b) => a - b), [14, 15, 16]);
  assert.equal(gate.q.options[gate.q.answer].gia_tri, 15);
  X.choose(gate.q.answer);
  deq(s.goi.filter((x) => x[0] === 'traLoi')[1].slice(1), [15, { vi_tri: VI_TRI[gate.q.answer] }]);
  assert.ok(await choDen(X, dangChon(X)));
  gate = X.curGate();
  deq(J(gate.q.options.map((o) => o.clock)), [{ h: 8, m: 30 }, { h: 6, m: 40 }, { h: 9, m: 30 }], 'đồng hồ 20 giờ vẽ thành mặt 8 giờ');
  X.choose(0);
  assert.ok(await choDen(X, dangChon(X)));
  gate = X.curGate();
  assert.ok(gate.q.options.every((o) => o.img && /^data:image\/svg\+xml/.test(o.img.src)));
  assert.match(decodeURIComponent(gate.q.options[0].img.src), /<svg [^>]*width="80" height="60" viewBox/, 'SVG không có kích thước được thêm width/height theo viewBox');
  X.choose(0);
  assert.ok(await choDen(X, () => s.ten().includes('ketThuc')));
});

test('cuoi-ho đảo: cầu nối có conCau thì không cần cụm "?" cuối, hổ về đích ngay sau câu cuối', async () => {
  const { D, X, s } = moDao(cauMau().slice(0, 1), { conCau: true });
  D.batDauChoi();
  X.G.state = 'playing';
  assert.ok(await choDen(X, dangChon(X)));
  X.choose(X.curGate().q.answer);
  assert.ok(await choDen(X, () => s.ten().includes('ketThuc')));
  assert.equal(s.goi.filter((x) => x[0] === 'cauTiep').length, 1, 'không hỏi thêm câu khi đảo đã báo hết');
  assert.equal(X.G.gates.length, 1);
});

test('cuoi-ho đảo: máy chưa có giọng Việt thì đọc bằng giọng của đảo (khi đảo bật giọng); tắt giọng thì im', async () => {
  const bat = moDao(cauMau(), { giong: true });
  bat.D.batDauChoi();
  bat.X.G.state = 'playing';
  assert.ok(await choDen(bat.X, dangChon(bat.X)));
  assert.ok(bat.s.goi.some((x) => x[0] === 'doc' && /mỗi vạch cách nhau 1/.test(x[1])), 'đọc đề');
  const tat = moDao(cauMau(), { giong: false });
  tat.D.batDauChoi();
  tat.X.G.state = 'playing';
  assert.ok(await choDen(tat.X, dangChon(tat.X)));
  assert.ok(!tat.s.ten().includes('doc'));
});

/* ---------------- 2. Chơi riêng như cũ ---------------- */

test('cuoi-ho đảo: không có ?dao=1, không nằm trong iframe, hoặc trang cha khác tên miền thì game chạy như cũ', () => {
  const s = taoStub(cauMau());
  const khongThamSo = napGame({ parent: { DaoCauNoi: s.stub } });
  const khongIframe = napGame({ search: '?dao=1&man=v1-m4' });   // parent === window
  const khongCauNoi = napGame({ search: '?dao=1', parent: {} });
  const khacTenMien = napGame({ search: '?dao=1', parent: new Proxy({}, { get() { throw new Error('SecurityError: cross-origin'); } }) });
  const saiThamSo = napGame({ search: '?dao=10', parent: { DaoCauNoi: s.stub } });
  for (const g of [khongThamSo, khongIframe, khongCauNoi, khacTenMien, saiThamSo]) {
    assert.equal(g.D.bat, false);
    assert.equal(g.X.G.state, 'menu', 'menu của game');
  }
  deq(s.goi, [], 'không gọi cầu nối');
  // Ván thường vẫn dựng đủ cụm câu của màn, vẫn hết giờ, vẫn lưu tiến trình
  const st = makeStorage();
  const g = napGame({ st });
  const lv = g.w.Lessons.LEVELS[0];
  g.X.startGame(lv);
  assert.equal(g.X.G.gates.length, lv.gates);
  assert.ok(g.X.G.gates.every((x) => x.q && x.q.options.length === 3));
  assert.ok(g.X.G.finishX > 0);
  assert.equal(g.X.stageText(), 'Vòng 1/' + lv.gates);
  assert.equal(g.X.gateLimit(g.X.G.gates[0]), lv.timer);
  g.X.G.state = 'playing';
  for (let n = 0; g.X.G.phase !== 'choose' && n < 3000; n++) g.X.update(0.05);
  for (let n = 0; g.X.G.phase === 'choose' && n < 1000; n++) g.X.update(0.05);
  assert.equal(g.X.curGate().result, 'miss', 'chơi riêng vẫn hết giờ như cũ');
  g.X.G.state = 'over'; g.X.G.endReason = 'finish';
  g.X.persistResults();
  assert.ok(st.getItem('cuoi-ho-v1'), 'chơi riêng vẫn lưu tiến trình');
});

test('cuoi-ho đảo: tệp nạp đúng thứ tự, CSP không có script nội tuyến, service worker có tệp mới', () => {
  const html = fs.readFileSync(path.join(ROOT, 'cuoi-ho/index.html'), 'utf8');
  const s = html.match(/<script src="([^"]+)"><\/script>/g).map((x) => x.match(/src="([^"]+)"/)[1]);
  deq(s, ['js/audio.js', 'js/lessons.js', 'js/profile.js', 'js/dao.js', 'js/game.js'], 'dao.js trước game.js');
  assert.ok(!/<script>/.test(html) && !/\son[a-z]+=/.test(html), 'không script nội tuyến, không on*=');
  for (const id of ['dao-start', 'dao-bat-dau', 'dao-ve-dao-dau', 'btn-dao-ve', 'hud-qua-mong']) assert.ok(html.indexOf('id="' + id + '"') > 0, id);
  assert.match(html, /<link rel="stylesheet" href="dao.css">/);
  const sw = fs.readFileSync(path.join(ROOT, 'cuoi-ho/sw.js'), 'utf8');
  for (const f of ['./js/dao.js', './dao.css']) assert.ok(sw.indexOf("'" + f + "'") > 0, 'sw có ' + f);
  assert.doesNotMatch(sw, /cuoi-ho-v10'/, 'đổi phiên bản bộ nhớ đệm');
  const css = fs.readFileSync(path.join(ROOT, 'cuoi-ho/dao.css'), 'utf8');
  for (const line of css.split('\n')) if (/^[^@/\s}][^{]*\{/.test(line)) assert.match(line, /(^|,\s*)(html\.dao|\.dao-|#dao-|\.lite-fx \.dao-)/, 'bộ chọn chỉ cho đảo: ' + line.trim());
  const GACH_DAI = String.fromCharCode(0x2014);
  for (const f of ['cuoi-ho/js/dao.js', 'cuoi-ho/dao.css', 'tests/cuoi-ho-dao.test.js']) {
    assert.ok(fs.readFileSync(path.join(ROOT, f), 'utf8').indexOf(GACH_DAI) < 0, 'không dùng gạch dài trong ' + f);
  }
  const hook = fs.readFileSync(path.join(ROOT, 'cuoi-ho/js/game.js'), 'utf8').split(/\r?\n/).filter((l) => /DAO|Chế độ đảo/.test(l));
  assert.ok(hook.length >= 20, 'các hook của chế độ đảo có chú thích');
  assert.ok(hook.every((l) => l.indexOf(GACH_DAI) < 0), 'hook không dùng gạch dài');
});

/* ---------------- 3. Chạy thật với cầu nối của đảo ---------------- */

async function moDaoThat(manId, hatGiong) {
  const w = loadGame('dao-khung-long', DAO_FILES);
  const dh = { t: Date.UTC(2026, 9, 12, 12, 4, 0), p: 1000 };
  w.NhatKy.caiDongHo({ now: () => dh.t, perf: () => dh.p });
  w.performance = { now: () => dh.p };
  dh.toi = (ms) => { dh.t += ms; dh.p += ms; };
  await w.NhatKy.khoiDong({ khongDungIndexedDB: true });
  w.NhatKy.datBe('be_CUOIHO01');
  const m = w.Dao.man(manId);
  const van = new w.VanChoi({ nk: w.NhatKy, game: m.game, vung: m.vung, man: m, nguon: 'tu_chon', hatGiong: hatGiong });
  const kq = {};
  w.DaoTroChoi[m.game].batDau({ van, man: m, tenBe: 'An', tenKhungLong: 'Rex', phongCach: 'dung_manh', hinhBe: 'assets/img/rex-kid.webp', hinhCoVu: 'assets/img/rex-cheer.webp', hinhGoiY: 'assets/img/rex-think.webp',
    onXong: (k) => { kq.xong = k; }, onThoat: (k) => { kq.thoat = k; } });
  const g = napGame({ search: '?dao=1&man=' + manId, parent: w });
  return Object.assign(g, { dao: w, dh, m, kq });
}

/** Chơi hết một màn: câu 2 chọn sai, câu 3 xin đủ 3 gợi ý, còn lại chọn đúng. Trả về danh sách câu đã hỏi. */
async function choiHet(ctx) {
  const { D, X, dao, dh } = ctx;
  D.batDauChoi();
  X.G.state = 'playing';
  const hoi = [];
  for (let n = 1; n < 40; n++) {
    const ok = await choDen(X, () => dangChon(X)() || !!ctx.kq.xong, 8000);
    assert.ok(ok, 'tới cụm vòng tiếp theo');
    if (ctx.kq.xong) break;
    const gate = X.curGate();
    hoi.push(gate.q);
    dh.toi(2500);
    if (n === 3) { X.useHint(); X.useHint(); X.useHint(); }
    const lane = n === 2 ? gate.q.options.findIndex((o, i) => i !== gate.q.answer && o) : gate.q.answer;
    X.choose(lane);
    if (n === 2 && X.G.phase === 'choose') {   // câu được thử lại (dạng thao tác của kỹ năng): chọn lại vòng đúng
      dh.toi(1500);
      X.choose(gate.q.answer);
    } else if (n === 2) {
      assert.ok(await choDen(X, () => dao.CauNoi._trangThai() && dao.CauNoi._trangThai().phMo), 'màn Gần đúng rồi của đảo');
      dh.toi(3000);
      dao.CauNoi._dongPhanHoi('choi_tiep');
    }
  }
  for (let i = 0; i < 20 && !ctx.kq.xong; i++) await new Promise((r) => setImmediate(r));
  return hoi;
}

function kiemNhatKy(evs, manId) {
  const loi = [];
  evs.forEach((e, i) => validate(SCHEMA, e).forEach((m) => loi.push('#' + i + ' ' + e.loai + ' ' + m)));
  deq(loi, [], 'mọi sự kiện hợp lệ lược đồ v1');
  const theoCau = {};
  evs.filter((e) => e.cau).forEach((e) => { (theoCau[e.cau] = theoCau[e.cau] || []).push(e); });
  const ds = Object.keys(theoCau).map((k) => theoCau[k]);
  assert.ok(ds.length >= 12);
  for (const c of ds) {
    const loai = c.map((e) => e.loai);
    assert.equal(loai[0], 'cau_hien');
    assert.equal(loai[loai.length - 1], 'cau_ket_thuc');
    assert.equal(c[0].game, 'cuoi-ho');
    assert.equal(c[0].man, manId);
    const coLuaChon = c[0].du_lieu.dang === 'chon_dap_an';
    if (coLuaChon) deq(c[0].du_lieu.lua_chon.map((x) => x.vi_tri), VI_TRI, 'vị trí vòng trên, giữa, dưới');
    const tl = c.filter((e) => e.loai === 'tra_loi');
    assert.ok(tl.length >= 1 && tl.length <= (coLuaChon ? 1 : 2), 'chọn đáp án: một lần; dạng thao tác: thử được 2 lần');
    loai.forEach((l, i) => {
      if (l !== 'tra_loi') return;
      const cham = c[i - 1], tr = c[i];
      assert.equal(cham.loai, 'thao_tac');
      assert.equal(cham.du_lieu.kieu, 'cham');
      assert.equal(cham.du_lieu.doi_tuong, 'vong_lua');
      assert.equal(J(cham.du_lieu.gia_tri), J(tr.du_lieu.gia_tri), 'cham ghi đúng giá trị bé chọn');
      assert.equal(cham.du_lieu.vi_tri, tr.du_lieu.vi_tri);
      assert.ok(VI_TRI.includes(tr.du_lieu.vi_tri));
      if (coLuaChon) {
        const ch = c[0].du_lieu.lua_chon.find((x) => J(x.gia_tri) === J(tr.du_lieu.gia_tri));
        assert.equal(ch.vi_tri, tr.du_lieu.vi_tri, 'vị trí trong tra_loi khớp vị trí vòng mang giá trị đó');
      }
    });
    const cuoi = tl[tl.length - 1];
    if (!cuoi.du_lieu.dung) assert.ok(loai.includes('phan_hoi_xem'), 'sai hẳn thì xem màn phản hồi');
  }
  return ds;
}

for (const [manId, hat] of [['v1-m4', 11], ['v8-m6', 21]]) {
  test('cuoi-ho đảo, chạy thật: ' + manId + ' từ thẻ bắt đầu tới màn kết thúc của đảo', async () => {
    const ctx = await moDaoThat(manId, hat);
    assert.equal(ctx.D.bat, true);
    assert.equal(ctx.D._trangThai().tong, 12);
    const hoi = await choiHet(ctx);
    assert.ok(ctx.kq.xong, 'đảo nhận kết thúc (onXong)');
    assert.match(ctx.kq.xong.dongPhu, /^Hổ nhảy qua \d+ vòng lửa · [\d.]+ điểm$/);
    assert.equal(ctx.kq.xong.diem, ctx.X.G.score);
    assert.equal(ctx.dao.DaoCauNoi, null, 'đảo đã dọn cầu nối');
    deq(ctx.D._trangThai().loi, []);
    // Nhãn vòng: số, đủ 3 vòng, một đáp án đúng; câu sai quay lại (ôn lại) trong ván
    for (const q of hoi) {
      assert.equal(q.options.length, 3);
      assert.ok(q.options.every((o) => /^\d{1,4}$/.test(o.text)), 'nhãn là số: ' + q.options.map((o) => o.text));
      assert.equal(new Set(q.options.map((o) => o.text)).size, 3);
      assert.equal(String(q.options[q.answer].gia_tri), String(q.cau.dap_an));
    }
    assert.ok(hoi.some((q) => q.review && q.cau.ma_cau === hoi[1].cau.ma_cau), 'câu sai quay lại sau 2 câu');
    if (manId === 'v8-m6') assert.ok(hoi.every((q) => q.options.some((o) => o.text.length >= 3)), 'số có ba chữ số');
    if (manId === 'v1-m4') assert.ok(hoi.some((q) => q.hinhHtml && /class="tia-so"/.test(q.hinhHtml)) || hoi.some((q) => q.loaiDe === 'day'));
    const evs = await ctx.dao.NhatKy.docCuaBe('be_CUOIHO01');
    kiemNhatKy(evs, manId);
    const gy = evs.filter((e) => e.loai === 'goi_y');
    assert.equal(gy.length, 3);
    assert.ok(gy[2].du_lieu.loai_bo != null, 'gợi ý cấp 3 ghi vòng bị tắt');
    const vb = evs.find((e) => e.loai === 'van_bat_dau');
    deq(J(vb.du_lieu.do_kho), { game_cu: 'cuoi-ho', toc_do: 0.9, so_vong_moi_cum: 3, het_gio: false });
    const vk = evs.find((e) => e.loai === 'van_ket_thuc');
    assert.equal(vk.du_lieu.bo_do, false);
    assert.equal(vk.du_lieu.diem, ctx.X.G.score);
    assert.equal(vk.du_lieu.sai, 1);
  });
}

test('cuoi-ho đảo, chạy thật: v6-m7 đồng hồ (khi đảo đã có kỹ năng xem-gio)', async (t) => {
  const ctx = await moDaoThat('v6-m7', 31);
  if (!ctx.dao.NganHang.KY_NANG['xem-gio']) { t.skip('Kỹ năng xem-gio chưa có trong dao-khung-long/js/cau-thoi-gian.js'); return; }
  const hoi = await choiHet(ctx);
  assert.ok(ctx.kq.xong, 'đảo nhận kết thúc');
  deq(ctx.D._trangThai().loi, []);
  for (const q of hoi) {
    assert.ok(q.options.length >= 2);
    // Như game gốc: "Đồng hồ chỉ mấy giờ?" (đồng hồ trên thẻ) thì vòng ghi chữ; "Đồng hồ nào chỉ …?" thì vòng là mặt đồng hồ
    if (q.hinhHtml) assert.ok(q.options.every((o) => !o.clock && /giờ/.test(o.text)), 'đọc đồng hồ: vòng ghi chữ ' + q.options.map((o) => o.text));
    else assert.ok(q.options.every((o) => o.clock), 'chọn đồng hồ: vòng là mặt đồng hồ');
    for (const o of q.options) {
      if (o.clock) { assert.ok(o.clock.h >= 1 && o.clock.h <= 12 && o.clock.m >= 0 && o.clock.m <= 59, 'mặt đồng hồ hợp lệ'); }
      else assert.ok(o.text && o.text.length, 'nhãn chữ');
    }
  }
  kiemNhatKy(await ctx.dao.NhatKy.docCuaBe('be_CUOIHO01'), 'v6-m7');
});
