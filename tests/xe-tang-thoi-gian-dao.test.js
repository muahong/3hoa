'use strict';
/* Kiểm thử chế độ Đảo Khủng Long của Xe Tăng Thời Gian (xe-tang-thoi-gian/js/dao.js + các móc [ĐẢO] trong game.js).
   Nạp cả game vào một window giả có window.parent.DaoCauNoi là bản giả theo kịch bản (hợp đồng dao-khung-long/js/cau-noi.js),
   rồi lái vòng chơi bằng __XeTang.update(dt), fireAt, useHint, pauseGame… để kiểm tra:
   - sanSang khi khởi động, thẻ bắt đầu, batDau khi bấm "Bắt đầu", vòng cauTiep (so_lua_chon, vi_tri theo cột)
   - mỗi phát bắn: xoay_nong (một lần mỗi mục tiêu), ban (giá trị robot), rồi traLoi(giá trị, { vi_tri, cach })
   - sai hẳn → phanHoi (Promise) rồi câu kế tiếp; còn lượt (thu_lai) → robot bị gạch, bé chọn lại
   - gợi ý 3 cấp (cấp 3 gửi loai_bo và robot đó bay đi), tạm dừng/tiếp tục, về đảo, ketThuc khi cauTiep trả null
   - câu không có lựa chọn: hetGio rồi hỏi câu sau; robot không bao giờ chạm xe tăng; không ghi localStorage của game
   - không có ?dao=1 (hoặc không có cầu nối): game y như cũ. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { makeWindow, makeStorage, ROOT } = require('./lib/load.js');

const GAME = 'xe-tang-thoi-gian';
const FILES = ['js/audio.js', 'js/clock.js', 'js/levels.js', 'js/profile.js', 'js/dao.js', 'js/game.js'];
const KEY = 'xe-tang-thoi-gian-v1';
const cho = (ms) => new Promise((r) => setTimeout(r, ms));
const plain = (o) => JSON.parse(JSON.stringify(o));

/** Một câu kiểu cau-noi.goiCau: lựa chọn số, đáp án đúng `dung`. */
function cau(stt, dung, ds, them) {
  return Object.assign({
    stt: stt, tong: 3, ma_cau: '2.2|so-sanh-100|lon:' + ds.join(','), ky_nang: 'so-sanh-100', noi_dung: '2.2', loai: 'so_sanh',
    dang: 'chon_dap_an', de: 'Số nào lớn nhất: ' + ds.join(', ') + '?', de_doc: 'Trong các số ' + ds.join(', ') + ', số nào lớn nhất?',
    hinh: '', dap_an: dung, dap_an_nhan: String(dung),
    lua_chon: ds.map((v) => ({ gia_tri: v, nhan: String(v), hinh: '', dong_ho: null, dung: v === dung, vi_tri: null })),
    giay: 7, lan_thu_toi_da: 1, on_lai: false, goi_y_so_cap: 3, cau_truc: { loai: 'so_sanh', kieu: 'lon_nhat', ds: ds }
  }, them || {});
}

/** DaoCauNoi giả: ghi lại mọi lời gọi, chấm như VanChoi (chon_dap_an một lượt, trừ khi câu có lan_thu_toi_da 2). */
function taoCauNoi(ds) {
  const goi = [];
  let i = 0, mo = null, lan = 0, capGoiY = 0;
  const api = {
    goi: goi,
    ten: (t) => goi.filter((g) => g[0] === t),
    sanSang() { goi.push(['sanSang']); return api.thongTin(); },
    thongTin() {
      return { phien_ban: 1, game: 'xe-tang', ten_game: 'Xe Tăng',
        man: { id: 'v6-m6', ten: 'Xe tăng thời gian', ten_day_du: 'Phố Đồng Hồ · Màn 6 · Xe tăng thời gian', so_cau: ds.length, che_do: null, dang: null, bai: 'Bài 29, 31', vung: 'v6' },
        be: { ten: 'An', ten_khung_long: 'Rex', phong_cach: 'dung_manh', hinh: 'https://localhost/a.webp', hinh_co_vu: 'https://localhost/b.webp', hinh_goi_y: '' },
        am_thanh: { tieng: true, giong: false } };
    },
    batDau(d) { goi.push(['batDau', plain(d)]); return 'va_1'; },
    cauTiep(t) {
      goi.push(['cauTiep', plain(t || {})]);
      if (mo) throw new Error('Câu trước chưa kết thúc');
      const c = ds[i++] || null;
      if (!c) return null;
      mo = c; lan = 0; capGoiY = 0;
      const q = plain(c);
      (q.lua_chon || []).forEach((x, k) => { x.vi_tri = (t && t.vi_tri && t.vi_tri[k]) || 'lua_chon_' + (k + 1); });
      return q;
    },
    thaoTac(kieu, du) { goi.push(['thaoTac', kieu, plain(du || {})]); return true; },
    goiY(them) { goi.push(['goiY', plain(them || {})]); if (!mo || capGoiY >= 3) return null; capGoiY++; return { cap: capGoiY, loi: 'Gợi ý cấp ' + capGoiY }; },
    traLoi(v, them) {
      goi.push(['traLoi', v, plain(them || {})]);
      if (!mo) return null;
      lan++;
      if (v === mo.dap_an) { mo = null; return { dung: true, loi: [], loi_noi: null, thu_lai: false, can_phan_hoi: false, ket_qua: lan > 1 ? 'dung_lan_2' : capGoiY ? 'dung_sau_goi_y' : 'dung_ngay', qua_mong: 3, dap_an: v, dap_an_nhan: String(v) }; }
      const conLuot = lan < (mo.lan_thu_toi_da || 1);
      return { dung: false, loi: ['chieu-dau'], loi_noi: 'Con chọn ngược rồi', thu_lai: conLuot, can_phan_hoi: !conLuot, ket_qua: null, qua_mong: 0, dap_an: mo.dap_an, dap_an_nhan: String(mo.dap_an) };
    },
    hetGio() { goi.push(['hetGio']); mo = null; return { ket_qua: 'het_gio' }; },
    phanHoi(v, kq) { goi.push(['phanHoi', v, plain(kq || {})]); mo = null; return new Promise((ok) => setTimeout(() => ok(true), 20)); },
    tamDung(n) { goi.push(['tamDung', n]); return true; },
    tiepTuc(n) { goi.push(['tiepTuc', n]); return true; },
    ketThuc(t) { goi.push(['ketThuc', plain(t || {})]); return Promise.resolve(true); },
    veDao(t) { goi.push(['veDao', plain(t || {})]); return Promise.resolve(true); },
    doc() { return true; }
  };
  return api;
}

/** Nạp game vào window giả. o: { cauNoi, search, storage }. Phần tử theo id giữ nguyên giữa các lần getElementById. */
function nap(o) {
  o = o || {};
  const win = makeWindow({ localStorage: o.storage || makeStorage() });
  win.location.search = o.search != null ? o.search : '?dao=1&man=v6-m6';
  if (o.cauNoi) win.parent = { DaoCauNoi: o.cauNoi, location: { href: 'https://localhost/dao-khung-long/' } };
  const els = {};
  const moi = (id) => {
    const el = win.document.createElement('div');
    el.id = id;
    el.cloneNode = () => win.document.createElement('div');
    el.offsetTop = 0; el.offsetParent = null; el.offsetHeight = 60; el.offsetWidth = 300;   // thẻ câu hỏi cao 60 px
    if (id === 'clock-zoom') { el.showModal = () => {}; el.close = () => {}; }
    return el;
  };
  win.document.getElementById = (id) => els[id] || (els[id] = moi(id));
  win.document.querySelector = (sel) => els['?' + sel] || (els['?' + sel] = moi('?' + sel));
  const ctx = vm.createContext(win);
  FILES.forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, GAME, f), 'utf8'), ctx, { filename: GAME + '/' + f }));
  return { win: win, X: win.__XeTang, G: win.__XeTang.G, D: win.XeTangDao, els: els };
}

/** Bấm "Bắt đầu" rồi bỏ qua đếm ngược 3-2-1. */
function batDau(t) {
  t.D.nutBatDau();
  t.G.state = 'playing';
  t.G.phase = 'idle';
}
function chay(t, giay, buoc) {
  buoc = buoc || 0.02;
  for (let s = 0; s < giay; s += buoc) t.X.update(buoc);
}
/** Chạy tới khi điều kiện đúng (tối đa `giay` giây mô phỏng). */
function chayDen(t, dk, giay) {
  for (let s = 0; s < (giay || 10); s += 0.02) { if (dk()) return true; t.X.update(0.02); }
  return dk();
}
const robotSong = (t) => t.X.liveRobots().filter((r) => r.state !== 'wrong');
const robotCua = (t, v) => t.X.liveRobots().find((r) => r.opt.gia_tri === v);
const dangHoi = (t) => t.G.state === 'playing' && t.G.phase === 'ask' && t.X.liveRobots().length > 0;

test('không có ?dao=1 hoặc không có cầu nối: game y như cũ (menu, lưu tiến trình, không gọi đảo)', () => {
  const a = nap({ search: '' });
  assert.equal(a.D.bat, false);
  assert.equal(a.G.dao, false);
  assert.equal(a.G.state, 'menu');
  a.X.Store.data.sound = false;
  a.X.Store.save();
  assert.ok(a.win.localStorage.getItem(KEY), 'chơi độc lập vẫn ghi localStorage');
  // Có ?dao=1 nhưng mở trực tiếp (không có khung cha có DaoCauNoi): vẫn là game độc lập
  const b = nap({ search: '?dao=1&man=v6-m6' });
  assert.equal(b.D.bat, false);
  assert.equal(b.G.dao, false);
  // Có cầu nối nhưng thiếu ?dao=1: không bật
  const cn = taoCauNoi([]);
  const c = nap({ search: '?man=v6-m6', cauNoi: cn });
  assert.equal(c.D.bat, false);
  assert.equal(cn.goi.length, 0, 'không gọi gì sang đảo');
  // Bộ sinh câu của game vẫn dùng như cũ
  const q = c.win.Levels.LEVELS[0].gen();
  assert.ok(q.options.length >= 3 && q.options.some((x) => x.ok));
});

test('khởi động ở đảo: sanSang ngay, thẻ bắt đầu theo màn của đảo, batDau khi bấm "Bắt đầu"', () => {
  const cn = taoCauNoi([cau(1, 45, [12, 45, 30])]);
  const t = nap({ cauNoi: cn });
  assert.equal(t.D.bat, true);
  assert.equal(t.G.dao, true);
  assert.equal(cn.ten('sanSang').length, 1, 'sanSang gọi một lần khi game sẵn sàng');
  assert.equal(cn.ten('batDau').length, 0, 'chưa bắt đầu ván trước khi bé bấm');
  assert.equal(t.G.state, 'menu');
  assert.equal(t.els['?#menu .subtitle'].textContent, 'Phố Đồng Hồ · Màn 6 · Xe tăng thời gian');
  assert.equal(t.els['btn-play'].textContent, '▶ Bắt đầu');
  assert.equal(t.els['btn-dao-ve'].hidden, false, 'nút "Về đảo" hiện ở bảng tạm dừng');
  assert.equal(t.els['dao-be'].src, 'https://localhost/b.webp', 'hình khủng long của bé (cổ vũ)');
  assert.equal(t.win.Voice.enabled, false, 'giọng đọc theo cài đặt của đảo (giong: false)');
  batDau(t);
  const bd = cn.ten('batDau');
  assert.equal(bd.length, 1);
  assert.equal(bd[0][1].so_lua_chon, 3, 'màn hẹp (800 px): 3 robot');
  t.D.nutBatDau();
  assert.equal(cn.ten('batDau').length, 1, 'bấm lại không bắt đầu ván thứ hai');
});

test('một câu đúng: cauTiep (vi_tri theo cột) → xoay_nong → ban → traLoi(giá trị, { vi_tri, cach }) → câu sau', () => {
  const cn = taoCauNoi([cau(1, 45, [12, 45, 30]), cau(2, 80, [80, 8, 18])]);
  const t = nap({ cauNoi: cn });
  batDau(t);
  t.X.update(0.02);
  const ct = cn.ten('cauTiep');
  assert.equal(ct.length, 1);
  assert.deepEqual(ct[0][1], { so_lua_chon: 3, vi_tri: ['cot_1', 'cot_2', 'cot_3'] });
  assert.equal(t.G.q.prompt.text, 'Số nào lớn nhất: 12, 45, 30?');
  assert.equal(t.G.q.dao, true);
  assert.equal(t.G.robots.length, 3, 'mỗi lựa chọn một robot');
  assert.deepEqual(plain(t.G.robots.map((r) => r.opt.vi_tri)), ['cot_1', 'cot_2', 'cot_3']);
  assert.ok(t.G.robots[0].x < t.G.robots[1].x && t.G.robots[1].x < t.G.robots[2].x, 'một hàng, cột 1 bên trái');
  assert.equal(t.G.qTotal, 3);
  chay(t, 0.5);
  const r = robotCua(t, 45);
  t.X.fireAt(r, 'cham');
  t.X.fireAt(r, 'cham');
  assert.ok(chayDen(t, () => cn.ten('traLoi').length === 1, 3), 'đạn tới robot thì chấm');
  const tt = cn.ten('thaoTac').map((g) => g[1]);
  assert.deepEqual(tt, ['xoay_nong', 'ban'], 'một xoay_nong và một ban (chạm hai lần cùng robot không ghi thêm)');
  const xn = cn.ten('thaoTac')[0][2];
  assert.equal(xn.gia_tri, 45);
  assert.equal(xn.vi_tri, 'cot_2');
  assert.equal(xn.cach, 'cham');
  assert.ok(Number.isInteger(xn.goc) && xn.x >= 0 && xn.x <= 1 && xn.y >= 0 && xn.y <= 1, 'góc nòng, tọa độ chuẩn hóa 0..1');
  const ban = cn.ten('thaoTac')[1][2];
  assert.equal(ban.gia_tri, 45);
  assert.equal(ban.lan, 1);
  const tl = cn.ten('traLoi')[0];
  assert.equal(tl[1], 45);
  assert.deepEqual(tl[2], { vi_tri: 'cot_2', cach: 'cham', so_phat_ban: 1 });
  assert.equal(t.G.phase, 'wait');
  assert.ok(t.G.score >= 100, 'được điểm như bản gốc');
  assert.equal(t.D._trangThai().quaMong, 3, 'quả mọng của đảo cộng vào chip HUD');
  assert.equal(t.els['hud-berry-n'].textContent, '3');
  assert.ok(chayDen(t, () => cn.ten('cauTiep').length === 2 && dangHoi(t), 5), 'hỏi câu kế tiếp sau màn khen');
  assert.equal(t.G.q.prompt.text, 'Số nào lớn nhất: 80, 8, 18?');
});

test('sai hẳn (can_phan_hoi): robot bị gạch, chờ phanHoi của đảo rồi mới hỏi câu sau; không tạm dừng chồng lên', async () => {
  const cn = taoCauNoi([cau(1, 45, [12, 45, 30]), cau(2, 80, [80, 8, 18])]);
  const t = nap({ cauNoi: cn });
  batDau(t);
  chay(t, 0.5);
  const r = robotCua(t, 12);
  t.X.fireAt(r, 'cham');
  assert.ok(chayDen(t, () => cn.ten('traLoi').length === 1, 3));
  assert.equal(r.state, 'wrong', 'robot sai bị gạch');
  assert.equal(t.G.phase, 'wait');
  assert.equal(t.G.phaseT, Infinity, 'không tự sang câu khi chưa xem màn "Gần đúng rồi"');
  t.X.pauseGame('nut');
  assert.equal(t.G.state, 'playing', 'đang chờ màn phản hồi của đảo: không mở bảng tạm dừng');
  assert.equal(cn.ten('tamDung').length, 0);
  chay(t, 2);
  assert.equal(cn.ten('cauTiep').length, 1, 'vẫn chưa hỏi câu sau');
  await cho(800);
  const ph = cn.ten('phanHoi');
  assert.equal(ph.length, 1, 'gọi phanHoi sau khi bé thấy robot bị gạch');
  assert.equal(ph[0][1], 12);
  assert.equal(ph[0][2].can_phan_hoi, true);
  await cho(60);
  assert.ok(chayDen(t, () => cn.ten('cauTiep').length === 2 && dangHoi(t), 3), 'đóng màn phản hồi thì hỏi câu sau');
  assert.equal(t.G.wrong, 1);
  assert.equal(t.G.hearts, 3, 'không mất tim');
});

test('còn lượt (thu_lai): robot bị gạch, bé bắn robot khác trong cùng câu; chạm robot đã gạch thì ghi cham', () => {
  const cn = taoCauNoi([cau(1, 45, [12, 45, 30], { lan_thu_toi_da: 2 })]);
  const t = nap({ cauNoi: cn });
  batDau(t);
  chay(t, 0.5);
  const sai = robotCua(t, 30);
  t.X.fireAt(sai, 'phim');
  assert.ok(chayDen(t, () => cn.ten('traLoi').length === 1, 3));
  assert.equal(sai.state, 'wrong');
  assert.equal(t.G.phase, 'ask', 'vẫn đang hỏi câu này');
  assert.equal(t.G.clockZoom, true, 'bảng đọc lời của đảo (tạm dừng robot)');
  assert.match(t.els['clock-zoom-teaching'].textContent, /Con chọn ngược rồi/);
  t.G.readingReadyAt = 0;
  t.X.closeClockZoom(true);
  t.X.fireAt(sai, 'cham');
  assert.deepEqual(cn.ten('thaoTac').slice(-1)[0].slice(1, 3), ['cham', { doi_tuong: 'robot_da_gach', gia_tri: 30, vi_tri: 'cot_3' }]);
  t.X.fireAt(robotCua(t, 45), 'cham');
  assert.ok(chayDen(t, () => cn.ten('traLoi').length === 2, 3));
  assert.equal(cn.ten('traLoi')[1][1], 45);
  assert.equal(cn.ten('phanHoi').length, 0);
  assert.equal(t.G.phase, 'wait');
  assert.equal(cn.ten('thaoTac').filter((g) => g[1] === 'xoay_nong')[0][2].cach, 'phim');
});

test('gợi ý 3 cấp: goiY của đảo, cấp 3 gửi loai_bo và robot sai đó bay đi, nút 💡 tắt; đúng sau gợi ý được điểm gợi ý', () => {
  const cn = taoCauNoi([cau(1, 45, [12, 45, 30, 7])]);
  const t = nap({ cauNoi: cn });
  batDau(t);
  chay(t, 0.5);
  for (let cap = 1; cap <= 3; cap++) {
    assert.equal(t.X.useHint(), true, 'gợi ý cấp ' + cap);
    assert.equal(t.G.clockZoom, true);
    assert.equal(t.els['clock-zoom-teaching'].textContent, 'Gợi ý cấp ' + cap);
    assert.equal(t.els['clock-zoom-title'].textContent, '💡 Gợi ý ' + cap + '/3');
    t.G.readingReadyAt = 0;
    t.X.closeClockZoom(true);
  }
  const gy = cn.ten('goiY');
  assert.deepEqual(gy[0][1], {});
  assert.deepEqual(gy[1][1], {});
  assert.ok([12, 30, 7].indexOf(gy[2][1].loai_bo) >= 0, 'cấp 3 bỏ một lựa chọn sai: ' + JSON.stringify(gy[2][1]));
  const bo = t.G.robots.find((r) => r.opt.gia_tri === gy[2][1].loai_bo);
  assert.equal(bo.state, 'flee', 'robot bị loại bay đi');
  assert.equal(t.G.hint, true, 'hết ba cấp: nút 💡 tắt');
  assert.equal(t.X.useHint(), false, 'không còn cấp gợi ý');
  chay(t, 1);
  assert.equal(robotSong(t).length, 3);
  t.X.fireAt(robotCua(t, 45), 'cham');
  assert.ok(chayDen(t, () => cn.ten('traLoi').length === 1, 3));
  assert.equal(t.G.score, 20, 'đúng sau gợi ý: điểm gợi ý (HINT_POINTS)');
});

test('robot chỉ đi dạo: không bao giờ chạm xe tăng, không mất tim, không kết thúc ván', () => {
  const cn = taoCauNoi([cau(1, 45, [12, 45, 30])]);
  const t = nap({ cauNoi: cn });
  batDau(t);
  let thapNhat = 0, cao = Infinity;
  for (let s = 0; s < 120; s += 0.05) {
    t.X.update(0.05);
    t.X.liveRobots().forEach((r) => { thapNhat = Math.max(thapNhat, r.y + r.h / 2); cao = Math.min(cao, r.y); });
  }
  assert.equal(t.G.state, 'playing');
  assert.equal(t.G.phase, 'ask');
  assert.equal(t.G.hearts, 3);
  assert.equal(t.X.liveRobots().length, 3);
  assert.ok(thapNhat < t.G.lineY, 'robot luôn ở trên tuyến xe tăng (' + thapNhat.toFixed(0) + ' < ' + t.G.lineY.toFixed(0) + ')');
  assert.ok(thapNhat - cao > 5, 'robot có đi lên xuống');
  assert.equal(cn.ten('hetGio').length, 0, 'không có hết giờ');
});

test('tạm dừng / tiếp tục ghi tam_dung, tiep_tuc; ẩn tab ghi an_tab; "Về đảo" gọi veDao với điểm', () => {
  const cn = taoCauNoi([cau(1, 45, [12, 45, 30])]);
  const t = nap({ cauNoi: cn });
  batDau(t);
  chay(t, 0.3);
  t.X.pauseGame('nut');
  assert.equal(t.G.state, 'paused');
  assert.deepEqual(cn.ten('tamDung')[0], ['tamDung', 'nut']);
  t.X.resumeGame();
  assert.equal(t.G.state, 'playing');
  assert.deepEqual(cn.ten('tiepTuc')[0], ['tiepTuc', 'nut']);
  t.X.pauseGame('an_tab');
  assert.deepEqual(cn.ten('tamDung')[1], ['tamDung', 'an_tab']);
  t.G.score = 350;
  t.D.veDao();
  t.D.veDao();
  const vd = cn.ten('veDao');
  assert.equal(vd.length, 1, 'về đảo một lần');
  assert.equal(vd[0][1].diem, 350);
  assert.equal(cn.ten('ketThuc').length, 0);
});

test('hết câu (cauTiep trả null): màn "Hoàn thành!" rồi ketThuc({ diem, dong_phu }); không bảng kết quả, không ghi localStorage', () => {
  const st = makeStorage();
  const cn = taoCauNoi([cau(1, 45, [12, 45, 30])]);
  const t = nap({ cauNoi: cn, storage: st });
  batDau(t);
  chay(t, 0.4);
  t.X.fireAt(robotCua(t, 45), 'cham');
  assert.ok(chayDen(t, () => t.G.state === 'over', 8), 'không còn câu thì xong ván');
  assert.equal(cn.ten('cauTiep').length, 2);
  assert.equal(cn.ten('ketThuc').length, 0, 'chờ màn "Hoàn thành!" diễn xong');
  assert.ok(chayDen(t, () => cn.ten('ketThuc').length === 1, 4));
  const kt = cn.ten('ketThuc')[0][1];
  assert.equal(kt.diem, t.G.score);
  assert.match(kt.dong_phu, /^Bắn trúng 1 robot, được [\d.]+ điểm$/);
  assert.equal(kt.trung, 1);
  chay(t, 2);
  assert.equal(cn.ten('ketThuc').length, 1, 'chỉ kết thúc một lần');
  assert.equal(st.getItem(KEY), null, 'không ghi tiến trình của game ở đảo');
});

test('câu không có lựa chọn (dạng robot không mang được): hetGio rồi hỏi câu sau, ghi lỗi để người lớn biết', () => {
  const khong = cau(1, 45, [12, 45, 30], { dang: 'thao_tac_hinh', lua_chon: [] });
  const cn = taoCauNoi([khong, cau(2, 80, [80, 8, 18])]);
  const t = nap({ cauNoi: cn });
  batDau(t);
  t.X.update(0.02);
  assert.equal(cn.ten('hetGio').length, 1);
  assert.equal(cn.ten('cauTiep').length, 2);
  assert.equal(t.G.q.prompt.text, 'Số nào lớn nhất: 80, 8, 18?');
  assert.equal(t.D._trangThai().loi.length, 1);
  assert.match(t.D._trangThai().loi[0], /thao_tac_hinh/);
});

test('lựa chọn đồng hồ: mặt đồng hồ khi đề không có hình, chữ khi đề đã có hình, bảng điện tử cho "15:30"; hình SVG của đề', () => {
  const dh = (h, m) => ({ gia_tri: h + ':' + (m < 10 ? '0' : '') + m, nhan: h + ' giờ' + (m ? ' ' + m + ' phút' : ''), hinh: '<svg viewBox="0 0 120 120"></svg>', dong_ho: { h: h, m: m }, dung: false });
  const quay = { stt: 1, tong: 3, ma_cau: 'B2.11|xem-gio|quay:3:15', ky_nang: 'xem-gio', dang: 'chon_dap_an', de: 'Đồng hồ nào chỉ 3 giờ 15 phút?', de_doc: 'Đồng hồ nào chỉ 3 giờ 15 phút?', hinh: '', dap_an: '3:15', dap_an_nhan: '3 giờ 15 phút',
    lua_chon: [dh(3, 15), dh(15, 30), dh(4, 15)] };
  quay.lua_chon[0].dung = true;
  const doc = Object.assign(plain(quay), { stt: 2, ma_cau: 'B2.11|xem-gio|doc:3:15', de: 'Đồng hồ chỉ mấy giờ?', hinh: '<svg viewBox="0 0 240 260"><circle r="5"/></svg>' });
  const dt = Object.assign(plain(quay), { stt: 3, ma_cau: 'B2.12|ngay-gio|dong_ho_buoi:15:30', de: 'Vào buổi chiều, đồng hồ điện tử nào chỉ cùng giờ với đồng hồ này?', hinh: '<svg viewBox="0 0 220 240"></svg>',
    lua_chon: [{ gia_tri: '15:30', nhan: '15:30', hinh: '<svg viewBox="0 0 130 80"></svg>', dong_ho: { h: 15, m: 30 }, dung: true }, { gia_tri: '3:30', nhan: '03:30', hinh: '', dong_ho: { h: 3, m: 30 }, dung: false }] });
  const cn = taoCauNoi([quay, doc, dt]);
  const t = nap({ cauNoi: cn });
  batDau(t);
  t.X.update(0.02);
  assert.deepEqual(plain(t.G.q.options.map((o) => o.clock)), [{ h: 3, m: 15 }, { h: 3, m: 30 }, { h: 4, m: 15 }], 'mặt đồng hồ kim (15 giờ vẽ thành 3 giờ)');
  assert.equal(t.G.q.prompt.svg, '');
  const buoc = (v) => { t.X.fireAt(robotCua(t, v), 'cham'); assert.ok(chayDen(t, () => t.G.phase === 'wait', 3)); assert.ok(chayDen(t, () => dangHoi(t), 5)); };
  buoc('3:15');
  assert.ok(t.G.q.options.every((o) => !o.clock && !o.digital), 'đề đã có hình đồng hồ: lựa chọn là chữ');
  assert.match(t.G.q.prompt.svg, /^<svg/);
  buoc('3:15');
  assert.deepEqual(plain(t.G.q.options.map((o) => o.digital)), ['15:30', '03:30'], 'nhãn giờ điện tử vẽ thành bảng LED');
});
