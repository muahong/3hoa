'use strict';
/* Mê Cung Đồng Hồ trong Đảo Khủng Long (me-cung-dong-ho/js/dao.js + các móc [ĐẢO] trong js/game.js).
   - Không có ?dao=1 (hoặc không nằm trong iframe của đảo): game y như cũ, không gọi cầu nối.
   - Cầu nối giả theo kịch bản: sanSang lúc khởi động, batDau khi chạm "Bắt đầu", vòng cauTiep (3 đích có vi_tri),
     traLoi khi Cú Tí tới đích, phanHoi khi sai hẳn, ketThuc khi hết câu, veDao từ bảng tạm dừng, gợi ý 3 cấp,
     ma chạm thì về chỗ xuất phát (không traLoi, không mất tim), di_chuyen ghi theo đoạn thẳng.
   - Đồ thật: cầu nối, VanChoi, NhatKy, ngân hàng của đảo trong một window giả; chơi hết màn v1-m7 (đúng, sai, quay lại)
     và kiểm tra chuỗi sự kiện của từng câu và lược đồ v1. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { makeWindow, makeStorage, loadGame, ROOT } = require('./lib/load.js');
const { validate } = require('./lib/schema-lite.js');

const J = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/du-an-toan-2-3/spec/06-su-kien-v1.schema.json'), 'utf8'));
const GAME_FILES = ['js/audio.js', 'js/clock.js', 'js/mazes.js', 'js/profile.js', 'js/dao.js', 'js/game.js'];
const nghi = () => new Promise((r) => setImmediate(r));

/* ---------------- DOM giả nhớ phần tử theo id và các hàm nghe sự kiện ---------------- */

function ctx2d() {
  const grad = { addColorStop() {} };
  const t = {
    measureText(s) { return { width: String(s).length * 8 }; },
    createLinearGradient() { return grad; }, createRadialGradient() { return grad; }, createPattern() { return {}; },
    getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(0, w * h * 4)) }; }
  };
  return new Proxy(t, { get(o, p) { return p in o ? o[p] : function () {}; }, set(o, p, v) { o[p] = v; return true; } });
}

function phanTu(tag) {
  const ls = {};
  const lop = new Set();
  const el = {
    tagName: String(tag || 'div').toUpperCase(), id: '', style: {}, dataset: {}, children: [], attributes: {}, parentNode: null,
    hidden: false, disabled: false, textContent: '', innerHTML: '', value: '', type: '', src: '',
    width: 300, height: 150, offsetWidth: 800, offsetHeight: 600, clientWidth: 1024, clientHeight: 768,
    classList: {
      add(...c) { c.forEach((x) => lop.add(x)); }, remove(...c) { c.forEach((x) => lop.delete(x)); },
      toggle(c, b) { const on = b === undefined ? !lop.has(c) : !!b; if (on) lop.add(c); else lop.delete(c); return on; },
      contains(c) { return lop.has(c); }
    },
    get className() { return Array.from(lop).join(' '); },
    set className(v) { lop.clear(); String(v).split(/\s+/).filter(Boolean).forEach((x) => lop.add(x)); },
    setAttribute(k, v) { this.attributes[k] = String(v); }, getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; },
    removeAttribute(k) { delete this.attributes[k]; },
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; }, removeChild(c) { return c; }, insertBefore(c) { return c; }, remove() {},
    addEventListener(t, f) { (ls[t] = ls[t] || []).push(f); }, removeEventListener() {}, dispatchEvent() { return true; },
    _ls: ls,
    phat(t, ev) { (ls[t] || []).slice().forEach((f) => f(Object.assign({ type: t, target: el, preventDefault() {}, detail: 1 }, ev || {}))); },
    click() { this.phat('click'); },
    querySelector() { return null; }, querySelectorAll() { return []; }, closest() { return null; }, contains() { return false; },
    getContext() { return ctx2d(); }, toDataURL() { return 'data:,'; },
    getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 }; },
    focus() {}, blur() {}, select() {}, scrollIntoView() {}, setPointerCapture() {}
  };
  return el;
}

function domNho(win) {
  const reg = {};
  const tao = [];
  const d = win.document;
  d.getElementById = (id) => { if (!reg[id]) { reg[id] = phanTu('div'); reg[id].id = id; } return reg[id]; };
  d.querySelector = (sel) => { const k = 'q:' + sel; if (!reg[k]) reg[k] = phanTu('div'); return reg[k]; };
  d.createElement = (t) => { const e = phanTu(t); tao.push(e); return e; };
  d.documentElement = phanTu('html');
  d.body = phanTu('body');
  return { reg, tao, theoId: (id) => tao.find((e) => e.id === id) || reg[id] };
}

/** Hẹn giờ giả: game chạy theo đồng hồ của kiểm thử (đếm ngược, chờ lời giải…). */
function henGio(win) {
  const h = { t: 0, ds: [], id: 0 };
  win.setTimeout = (fn, ms) => { const id = ++h.id; h.ds.push({ id, at: h.t + (ms || 0), fn }); return id; };
  win.clearTimeout = (id) => { h.ds = h.ds.filter((x) => x.id !== id); };
  win.setInterval = () => 0;
  win.clearInterval = () => {};
  h.chay = () => {
    for (;;) {
      const den = h.ds.filter((x) => x.at <= h.t).sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!den) return;
      h.ds = h.ds.filter((x) => x !== den);
      den.fn();
    }
  };
  return h;
}

/** Nạp Mê Cung vào một window giả. o: { search, parent (window cha), coCha } */
function moGame(o) {
  o = o || {};
  const st = o.localStorage || makeStorage();
  const win = makeWindow({ localStorage: st });
  win.location.search = o.search || '';
  if (o.parent) win.parent = o.parent;
  const dom = domNho(win);
  const hen = henGio(win);
  const ctx = vm.createContext(win);
  GAME_FILES.forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, 'me-cung-dong-ho', f), 'utf8'), ctx, { filename: 'me-cung-dong-ho/' + f }));
  const MC = win.__MeCung;
  const t = {
    win, dom, hen, MC, st, G: MC.G, D: win.MeCungDao,
    /** Cho thời gian trôi: hẹn giờ tới hạn, cập nhật và vẽ mỗi 50 ms. moi(ms): đồng hồ phía đảo (nếu có). */
    async troi(ms, dung) {
      for (let k = 0; k < ms; k += 50) {
        hen.t += 50;
        if (o.moi) o.moi(50);
        hen.chay();
        MC.update(0.05);
        MC.render();
        await nghi();
        if (dung && dung()) return true;
      }
      return false;
    },
    /** Chạm (ngón tay) vào tâm một ô mê cung: đi đúng đường pointerdown / pointerup của game. */
    cham(r, c) {
      const G = MC.G;
      const ev = { pointerId: 7, pointerType: 'touch', button: 0, clientX: G.ox + (c + 0.5) * G.cell, clientY: G.oy + (r + 0.5) * G.cell, cancelable: false };
      dom.reg.game.phat('pointerdown', ev);
      dom.reg.game.phat('pointerup', ev);
    },
    nut(id) { const e = dom.theoId(id); assert.ok(e, 'thiếu nút ' + id); e.click(); }
  };
  return t;
}

/* ---------------- Cầu nối giả theo kịch bản ---------------- */

/** o.thuLai: sai lần đầu thì cho thử lại (như dạng gõ số); o.khongLuaChon: [stt…] câu không có lựa chọn. */
function cauNoiGia(soCau, o) {
  o = o || {};
  const goi = [];
  let i = 0, mo = null, cap = 0, lanSai = 0;
  const cau = (k) => {
    const dau = 5 + k * 5;
    const d = dau + 10;
    return { de: dau + ', ' + (dau + 5) + ', ?, ' + (dau + 15), d: d, nhieu: [d + 5, d - 5, d + 1] };
  };
  const cn = {
    goi,
    thongTin() { return { phien_ban: 1, game: 'me-cung', ten_game: 'Mê Cung', man: { id: 'v1-m7', ten: 'Mê cung đếm thêm', ten_day_du: 'Vùng 1 · Màn 7 · Mê cung đếm thêm', so_cau: soCau }, be: { ten: 'An' }, am_thanh: { tieng: false, giong: false } }; },
    sanSang() { goi.push(['sanSang']); return cn.thongTin(); },
    batDau(dk) { goi.push(['batDau', J(dk)]); return 'van_1'; },
    cauTiep(tc) {
      goi.push(['cauTiep', J(tc)]);
      if (mo) throw new Error('Câu trước chưa kết thúc');
      if (i >= soCau) return null;
      const c = cau(i++);
      const n = tc.so_lua_chon;
      const gt = [c.d].concat(c.nhieu).slice(0, n);
      // xoay vòng chỗ của đáp án đúng
      for (let k = 0; k < i % n; k++) gt.push(gt.shift());
      cap = 0;
      lanSai = 0;
      if ((o.khongLuaChon || []).indexOf(i) >= 0) {
        mo = { stt: i, tong: soCau, ma_cau: 'x|' + i, ky_nang: 'xem-gio', dang: 'thao_tac_hinh', de: 'Quay kim', de_doc: 'Quay kim', hinh: '', dap_an: '8:00', lua_chon: [] };
        return mo;
      }
      mo = { stt: i, tong: soCau, ma_cau: '2.1|tia-so-100|day:' + i, ky_nang: 'tia-so-100', noi_dung: '2.1', loai: 'tia_so', dang: 'chon_dap_an', de: c.de, de_doc: 'Đếm thêm 5: ' + c.de,
        hinh: '', dap_an: c.d, dap_an_nhan: String(c.d), giay: 8, lan_thu_toi_da: 1,
        lua_chon: gt.map((v, k) => ({ gia_tri: v, nhan: String(v), hinh: '', dong_ho: null, dung: v === c.d, vi_tri: tc.vi_tri[k] })) };
      return mo;
    },
    thaoTac(k, d) { goi.push(['thaoTac', k, J(d)]); return true; },
    goiY(them) { goi.push(['goiY', J(them) || null]); if (!mo || cap >= 3) return null; cap++; return { cap, loi: 'Gợi ý cấp ' + cap }; },
    traLoi(v, them) {
      goi.push(['traLoi', v, J(them)]);
      if (!mo) return null;
      if (v === mo.dap_an) { const q = mo; mo = null; return { dung: true, loi: [], thu_lai: false, can_phan_hoi: false, ket_qua: lanSai ? 'dung_lan_2' : 'dung_ngay', qua_mong: 2, dap_an: q.dap_an, dap_an_nhan: String(q.dap_an) }; }
      if (o.thuLai && ++lanSai < 2) return { dung: false, loi: ['dem-lech'], loi_noi: 'Mỗi lần thêm 5 nhé', thu_lai: true, can_phan_hoi: false, ket_qua: null, qua_mong: 0 };
      return { dung: false, loi: ['dem-lech'], loi_noi: 'Mỗi lần thêm 5 nhé', thu_lai: false, can_phan_hoi: true, ket_qua: null, qua_mong: 0, dap_an: mo.dap_an, dap_an_nhan: String(mo.dap_an) };
    },
    hetGio() { goi.push(['hetGio']); mo = null; return { ket_qua: 'het_gio' }; },
    phanHoi(v) { goi.push(['phanHoi', v]); return new Promise((ok) => { cn._dongPhanHoi = () => { mo = null; ok(true); }; }); },
    tamDung(n) { goi.push(['tamDung', n]); return true; },
    tiepTuc(n) { goi.push(['tiepTuc', n]); return true; },
    ketThuc(them) { goi.push(['ketThuc', J(them)]); return Promise.resolve(true); },
    veDao(them) { goi.push(['veDao', J(them)]); return Promise.resolve(true); },
    doc() { return true; }
  };
  cn.ten = (k) => goi.filter((x) => x[0] === k);
  return cn;
}

function dichCua(t) { return t.D._trangThai().dich; }

/** Đưa Cú Tí tới đích có giá trị v bằng một cú chạm, chờ tới khi đảo được hỏi traLoi. */
async function diToi(t, cn, v) {
  const d = dichCua(t).find((x) => x.gia_tri === v);
  assert.ok(d, 'không thấy đích ' + v);
  const truoc = cn.ten('traLoi').length;
  t.G.invuln = 1e9;                        // kịch bản: ma không chen vào
  t.cham(d.r, d.c);
  const toi = await t.troi(20000, () => cn.ten('traLoi').length > truoc);
  assert.ok(toi, 'Cú Tí không tới được đích ' + v);
  return cn.ten('traLoi').slice(-1)[0];
}

async function vaoChoi(cn) {
  const cha = makeWindow();
  cha.DaoCauNoi = cn;
  const t = moGame({ search: '?dao=1&man=v1-m7', parent: cha });
  await t.troi(100);
  return t;
}

/* ---------------- Không ở trong đảo: y như cũ ---------------- */

test('mê cung (đảo): không có ?dao=1 hay không có cầu nối thì game y như cũ', async () => {
  const cn = cauNoiGia(3);
  const cha = makeWindow();
  cha.DaoCauNoi = cn;
  for (const o of [{ search: '', parent: cha }, { search: '?dao=1' }, { search: '?dao=1&man=v1-m7', parent: makeWindow() }, { search: '?dao=0', parent: cha }]) {
    const t = moGame(o);
    assert.equal(t.D.bat, false, JSON.stringify(o.search));
    assert.equal(t.G.state, 'menu', 'vẫn mở menu');
    assert.ok(!t.win.document.documentElement.classList.contains('dao-mode'));
    // Tiến trình vẫn ghi vào localStorage của game
    t.MC.Store.noteMissed('analog|7:45', { kind: 'analog', h: 7, m: 45 });
    assert.ok(t.st.getItem('me-cung-dong-ho-v1'), 'Store ghi như cũ');
    t.MC.startLevel(t.win.Clock.LEVELS[0]);
    assert.equal(t.G.items.length, t.win.Clock.LEVELS[0].clocks, 'đồng hồ của game cũ');
    assert.ok(t.G.items.every((it) => it.time && !it.dao));
  }
  assert.equal(cn.goi.length, 0, 'không gọi cầu nối');
});

/* ---------------- Cầu nối giả ---------------- */

test('mê cung (đảo): sanSang lúc khởi động, batDau khi chạm Bắt đầu, 3 đích mang lựa chọn có vi_tri', async () => {
  const cn = cauNoiGia(3);
  const t = await vaoChoi(cn);
  assert.equal(t.D.bat, true);
  assert.deepEqual(cn.goi.map((x) => x[0]), ['sanSang'], 'chỉ sanSang trước khi bé chạm');
  assert.equal(t.G.state, 'dao', 'đang ở thẻ Bắt đầu, không menu');
  assert.ok(t.win.document.documentElement.classList.contains('dao-mode'));
  t.nut('dao-nut-bat-dau');
  t.nut('dao-nut-bat-dau');                                   // chạm hai lần không bắt đầu hai lần
  assert.equal(cn.ten('batDau').length, 1);
  assert.equal(cn.ten('batDau')[0][1].so_lua_chon, 3);
  const ct = cn.ten('cauTiep');
  assert.equal(ct.length, 1);
  assert.equal(ct[0][1].so_lua_chon, 3);
  const vt = ct[0][1].vi_tri;
  assert.equal(vt.length, 3);
  assert.equal(new Set(vt).size, 3, 'vi_tri khác nhau');
  vt.forEach((v) => assert.match(v, /^(tren|giua|duoi)(_(trai|phai))?(_\d)?$|^giua(_\d)?$/));
  const d = dichCua(t);
  assert.equal(d.length, 3);
  assert.equal(new Set(d.map((x) => x.r + ',' + x.c)).size, 3, 'ba ô khác nhau');
  assert.deepEqual(d.map((x) => x.vi_tri), vt, 'lựa chọn thứ i ở ô thứ i');
  assert.equal(t.G.lives, 3);
  // Đếm ngược xong mới chơi; câu hiện ngay từ lúc đếm ngược
  assert.equal(t.G.state, 'countdown');
  await t.troi(3800);
  assert.equal(t.G.state, 'playing');
  assert.ok(t.G.reading, 'ma chờ bé đọc đề');
  assert.equal(t.st.getItem('me-cung-dong-ho-v1'), null, 'không ghi localStorage của game');
});

test('mê cung (đảo): đúng thì sang câu mới, sai hẳn thì chờ phanHoi rồi sang câu mới, hết câu thì ketThuc', async () => {
  const cn = cauNoiGia(3);
  const t = await vaoChoi(cn);
  t.nut('dao-nut-bat-dau');
  await t.troi(3800);

  // Câu 1: đúng
  let q = t.D._trangThai().q;
  let tl = await diToi(t, cn, q.dap_an);
  assert.equal(tl[1], q.dap_an);
  assert.ok(tl[2].vi_tri && /^\d+,\d+$/.test(tl[2].o), 'traLoi kèm vi_tri và ô');
  assert.ok(tl[2].so_doan >= 1 && tl[2].so_o >= 1);
  const tt1 = cn.ten('thaoTac');
  const chon = tt1.filter((x) => x[1] === 'chon');
  assert.equal(chon.length, 1, 'một lần chọn đích');
  assert.equal(chon[0][2].gia_tri, q.dap_an);
  const dc = tt1.filter((x) => x[1] === 'di_chuyen');
  assert.ok(dc.length >= 1 && dc.length <= tl[2].so_o, 'di_chuyen gọn: tối đa một sự kiện mỗi đoạn');
  dc.forEach((x) => {
    assert.match(x[2].tu, /^\d+,\d+$/); assert.match(x[2].den, /^\d+,\d+$/);
    assert.ok(['len', 'xuong', 'trai', 'phai'].indexOf(x[2].huong) >= 0);
    assert.equal(x[2].cach, 'cham');
  });
  assert.equal(dc.reduce((a, x) => a + x[2].so_o, 0), tl[2].so_o, 'tổng số ô của các đoạn khớp');
  assert.ok(t.G.score > 0);
  assert.equal(cn.ten('cauTiep').length, 1, 'chưa hỏi câu mới ngay');
  await t.troi(1600);
  assert.equal(cn.ten('cauTiep').length, 2, 'câu mới sau lúc khen');

  // Câu 2: đi tới đích sai
  q = t.D._trangThai().q;
  const sai = dichCua(t).find((x) => !x.dung);
  const soDiChuyen = cn.ten('thaoTac').length;
  tl = await diToi(t, cn, sai.gia_tri);
  assert.equal(tl[1], sai.gia_tri);
  assert.equal(t.G.state, 'cho', 'game đứng yên chờ lời giải của đảo');
  assert.equal(t.G.lives, 3, 'không mất tim');
  await t.troi(1000);
  assert.equal(cn.ten('phanHoi').length, 1);
  assert.equal(cn.ten('phanHoi')[0][1], sai.gia_tri);
  await t.troi(3000);
  assert.equal(cn.ten('cauTiep').length, 2, 'còn chờ bé đóng màn lời giải');
  const sauSai = cn.ten('thaoTac').length;
  t.G.state = 'cho';
  cn._dongPhanHoi();
  await t.troi(100);
  assert.equal(cn.ten('cauTiep').length, 3, 'đóng lời giải thì sang câu mới');
  assert.equal(t.G.state, 'playing');
  assert.ok(sauSai > soDiChuyen);

  // Câu 3: đúng, rồi hết câu -> pháo giấy -> ketThuc
  q = t.D._trangThai().q;
  await diToi(t, cn, q.dap_an);
  await t.troi(1600);
  assert.equal(cn.ten('cauTiep').length, 4);
  assert.equal(t.G.state, 'clear');
  assert.equal(cn.ten('ketThuc').length, 0);
  await t.troi(2500);
  const kt = cn.ten('ketThuc');
  assert.equal(kt.length, 1);
  assert.equal(kt[0][1].diem, t.G.score);
  assert.match(kt[0][1].dong_phu, /^Cú Tí tìm đúng 2 đích, được [\d.]+ điểm$/);
  assert.equal(cn.ten('veDao').length, 0);
  assert.equal(t.D._trangThai().loi.length, 0);
  assert.equal(t.st.getItem('me-cung-dong-ho-v1'), null, 'không ghi localStorage của game');
});

test('mê cung (đảo): ma chạm Cú Tí thì về chỗ xuất phát, không traLoi, không mất tim, câu vẫn mở', async () => {
  const cn = cauNoiGia(2);
  const t = await vaoChoi(cn);
  t.nut('dao-nut-bat-dau');
  await t.troi(3800);
  const G = t.G, p = G.player;
  const d = dichCua(t)[0];
  t.cham(d.r, d.c);                                            // bé chạm một đích rồi đi
  await t.troi(300);
  const g = G.ghosts[0];
  G.invuln = 0; G.reading = false; G.fright = 0;
  g.state = 'active'; g.releaseAt = 0; g.from = { r: p.from.r, c: p.from.c }; g.to = { r: p.from.r, c: p.from.c }; g.t = 1; g.moving = false;
  g.x = p.x; g.y = p.y;
  t.MC.update(0.001);
  assert.equal(G.state, 'dying', 'hoạt hình về chỗ xuất phát');
  await t.troi(1500);
  assert.equal(G.player.from.r, G.maze.player.r);
  assert.equal(G.player.from.c, G.maze.player.c);
  assert.equal(G.lives, 3);
  assert.equal(cn.ten('traLoi').length, 0, 'ma chạm không phải là trả lời');
  const ma = cn.ten('thaoTac').filter((x) => x[1] === 'cham' && x[2].doi_tuong === 'ma');
  assert.equal(ma.length, 1);
  assert.equal(t.D._trangThai().cauMo, true);
  assert.equal(t.D._trangThai().biMa, 1);
  assert.equal(cn.ten('cauTiep').length, 1);
  // vẫn trả lời được sau khi về chỗ xuất phát
  await t.troi(1500);
  const tl = await diToi(t, cn, t.D._trangThai().q.dap_an);
  assert.equal(tl[2].bi_ma_cham, 1);
});

test('mê cung (đảo): gợi ý 3 cấp (cấp 3 bỏ một đích sai), nghe lại, tạm dừng, về đảo', async () => {
  const cn = cauNoiGia(3);
  const t = await vaoChoi(cn);
  t.nut('dao-nut-bat-dau');
  await t.troi(3800);
  const q = t.D._trangThai().q;
  t.nut('btn-hud-hint');
  t.nut('btn-hud-hint');
  assert.equal(dichCua(t).length, 3);
  t.nut('btn-hud-hint');
  const gy = cn.ten('goiY');
  assert.equal(gy.length, 3);
  assert.equal(gy[0][1], null); assert.equal(gy[1][1], null);
  const bo = gy[2][1];
  assert.ok(bo && bo.loai_bo != null && bo.loai_bo !== q.dap_an, 'cấp 3 bỏ một đích sai');
  assert.equal(dichCua(t).length, 2, 'đích sai đã biến mất');
  assert.ok(dichCua(t).some((x) => x.gia_tri === q.dap_an), 'đích đúng còn nguyên');
  t.nut('btn-hud-hint');                                       // quá 3 cấp: nhắc lại, không lỗi
  assert.equal(t.D._trangThai().goiYCap, 3);
  t.nut('btn-hud-speak');
  assert.ok(cn.ten('thaoTac').some((x) => x[1] === 'nghe_lai'));
  // Tạm dừng rồi chơi tiếp
  t.nut('btn-pause');
  assert.equal(t.G.state, 'paused');
  assert.deepEqual(cn.ten('tamDung').map((x) => x[1]), ['nut']);
  await t.troi(500);
  t.nut('btn-resume');
  assert.deepEqual(cn.ten('tiepTuc').map((x) => x[1]), ['nut']);
  assert.equal(t.G.state, 'playing');
  // Tạm dừng rồi về đảo
  t.nut('btn-pause');
  t.nut('dao-ve-dao');
  const vd = cn.ten('veDao');
  assert.equal(vd.length, 1);
  assert.equal(vd[0][1].diem, t.G.score);
  assert.equal(cn.ten('ketThuc').length, 0);
  assert.equal(t.D._trangThai().pha, 'xong');
  t.nut('dao-ve-dao');
  assert.equal(cn.ten('veDao').length, 1, 'về đảo một lần');
});

test('mê cung (đảo): còn lượt thử thì đánh dấu đích sai, nhắc lỗi, cho đi tiếp (không phanHoi); câu không có lựa chọn thì bỏ qua kiểu hết giờ', async () => {
  const cn = cauNoiGia(3, { thuLai: true, khongLuaChon: [2] });
  const t = await vaoChoi(cn);
  t.nut('dao-nut-bat-dau');
  await t.troi(3800);
  const q = t.D._trangThai().q;
  const sai = dichCua(t).find((x) => !x.dung);
  await diToi(t, cn, sai.gia_tri);
  assert.equal(t.G.state, 'ready', 'nghỉ một nhịp để đọc lời nhắc');
  assert.equal(t.D._trangThai().cauMo, true, 'câu vẫn mở');
  assert.equal(dichCua(t).length, 2, 'đích sai không đi vào được nữa');
  await t.troi(2500);
  assert.equal(cn.ten('phanHoi').length, 0);
  const tl = await diToi(t, cn, q.dap_an);
  assert.equal(tl[1], q.dap_an);
  assert.equal(cn.ten('traLoi').length, 2);
  // Câu 2 không có lựa chọn: báo lỗi (gỡ lỗi), hetGio để câu quay lại sau, rồi sang câu 3
  await t.troi(1600);
  assert.equal(cn.ten('cauTiep').length, 2);
  assert.equal(cn.ten('hetGio').length, 1);
  assert.equal(t.D._trangThai().loi.length, 1);
  await t.troi(800);
  assert.equal(cn.ten('cauTiep').length, 3);
  assert.equal(dichCua(t).length, 3);
});

test('mê cung (đảo): thẻ câu hỏi tô cam dấu ? chỗ cần điền, không tô dấu hỏi cuối câu; lựa chọn đồng hồ vẽ bằng đồng hồ của game', async () => {
  const cn = cauNoiGia(3);
  const t = await vaoChoi(cn);
  t.nut('dao-nut-bat-dau');
  const the = t.dom.reg['hud-target-text'];
  assert.match(the.innerHTML, /\d+, \d+, <b class="dao-hoi">\?<\/b>, \d+/);
  // Đề là câu hỏi có dấu hỏi cuối câu, có hình đề và lựa chọn đồng hồ
  const G = t.G, D = t.D;
  const q = { stt: 2, tong: 3, de: 'Đường gấp khúc ABCD dài bao nhiêu xăng-ti-mét?', de_doc: '', hinh: '<svg viewBox="0 0 640 428"></svg>', lua_chon: [] };
  G.roundInfo = { dao: true, q: q, html: q.de, speech: '' };
  D.veThe(false);
  assert.ok(the.innerHTML.indexOf('dao-hoi') < 0, the.innerHTML);
  assert.match(the.innerHTML, /<span class="dao-lien">xăng-ti-mét\?<\/span>/);
  assert.equal(t.dom.reg['hud-target-clock'].hidden, false, 'hình của đề hiện trong thẻ');
  assert.equal(t.dom.reg['hud-target-clock'].innerHTML, q.hinh);
  // Sprite của đích (câu đang mở của cầu nối giả không có hình): đồng hồ vẽ bằng đồng hồ của game, hien 'chu' thì là biển chữ
  const x = { gia_tri: '8:15', nhan: '8 giờ 15 phút', dong_ho: { h: 8, m: 15 }, hinh: '<svg viewBox="0 0 10 10"></svg>' };
  const sDongHo = D.sprite({ dao: Object.assign({}, x) }, 50);
  const sChu = D.sprite({ dao: Object.assign({ hien: 'chu' }, x) }, 50);
  const sHinh = D.sprite({ dao: { gia_tri: 'A', nhan: 'A', hinh: x.hinh } }, 50);
  assert.ok(sDongHo && sChu && sHinh);
  assert.equal(sDongHo.size, 100, 'đồng hồ: sprite 2 ô');
  assert.equal(sChu.size, 130, 'biển chữ: sprite 2,6 ô');
  assert.equal(sHinh.size, 105, 'hình: sprite 2,1 ô');
});

/* ---------------- Đồ thật của đảo ---------------- */

const DAO_FILES = ['js/nhat-ky.js', 'js/ngan-hang.js', 'js/cau-so-sanh.js', 'js/cau-do-luong.js', 'js/cau-tien.js', 'js/cau-thong-ke.js', 'js/cau-hinh-hoc.js', 'js/cau-thoi-gian.js', 'js/hoc-tap.js', 'js/dao.js', 'js/ho-so.js', 'js/van-choi.js'];

async function moDao(manId, hatGiong) {
  const w = loadGame('dao-khung-long', DAO_FILES);
  const dom = domNho(w);
  w.AmThanh = { co: { tieng: false, giong: false }, dungDoc() {}, doc() {}, bat() {} };
  w.PhanHoi = { esc: (x) => String(x), noiDung: () => '<p>Lời giải</p>', queTinh: () => '' };
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'dao-khung-long/js/cau-noi.js'), 'utf8'), vm.createContext(w), { filename: 'cau-noi.js' });
  const dh = { t: Date.UTC(2026, 8, 27, 9, 0, 0), p: 1000 };
  w.NhatKy.caiDongHo({ now: () => dh.t, perf: () => dh.p });
  w.performance = { now: () => dh.p };
  await w.NhatKy.khoiDong({ khongDungIndexedDB: true });
  w.NhatKy.datBe('be_MECUNG01');
  const m = w.Dao.man(manId);
  const van = new w.VanChoi({ nk: w.NhatKy, game: 'me-cung', vung: m.vung, man: m, nguon: 'tu_chon', hatGiong: hatGiong, soCau: m.so_cau });
  const kq = {};
  w.DaoTroChoi['me-cung'].batDau({
    van, man: m, tenBe: 'An', tenKhungLong: 'Rex', phongCach: 'dung_manh', hinhBe: 'a.webp', hinhCoVu: 'b.webp', hinhGoiY: 'c.webp',
    onXong(k) { kq.xong = k; }, onThoat(k) { kq.thoat = k; }
  });
  return { w, dom, dh, m, van, kq };
}

test('mê cung (đảo): chơi hết v1-m7 với cầu nối, VanChoi, NhatKy thật: chuỗi sự kiện từng câu đúng thứ tự và hợp lệ lược đồ', async () => {
  const dao = await moDao('v1-m7', 2026927);
  assert.ok(dao.w.DaoCauNoi, 'đảo đã mở cầu nối');
  const t = moGame({ search: '?dao=1&man=v1-m7', parent: dao.w, moi: (ms) => { dao.dh.t += ms; dao.dh.p += ms; } });
  await t.troi(100);
  assert.equal(t.D.bat, true);
  t.nut('dao-nut-bat-dau');
  await t.troi(3800);
  const saiO = new Set([2, 5]);                               // câu thứ 2 và 5 (lần hiện) đi tới đích sai
  let lan = 0, daMa = false;
  for (let vong = 0; vong < 30 && !dao.kq.xong; vong++) {
    const tt = t.D._trangThai();
    if (tt.state === 'clear' || tt.pha === 'xong') { await t.troi(3000); continue; }
    assert.ok(tt.q, 'có câu đang mở');
    lan++;
    assert.equal(tt.dich.length, 3, 'ba đích');
    assert.equal(tt.dich.filter((x) => x.dung).length, 1, 'một đích đúng');
    if (lan === 3) { t.nut('btn-hud-hint'); t.nut('btn-hud-hint'); t.nut('btn-hud-hint'); }
    if (lan === 4) { t.nut('btn-pause'); await t.troi(300); t.nut('btn-resume'); }
    if (lan === 6 && !daMa) {
      // một con ma chạm Cú Tí giữa đường
      daMa = true;
      const G = t.G, p = G.player, g = G.ghosts[0];
      const d0 = t.D._trangThai().dich.find((x) => x.dung);
      t.cham(d0.r, d0.c);
      await t.troi(250);
      G.invuln = 0; G.reading = false; g.state = 'active'; g.releaseAt = 0; g.from = { r: p.from.r, c: p.from.c }; g.to = { r: p.from.r, c: p.from.c }; g.t = 1; g.moving = false; g.x = p.x; g.y = p.y;
      t.MC.update(0.001);
      await t.troi(3000);
    }
    const dich = t.D._trangThai().dich;
    const muc = saiO.has(lan) ? dich.find((x) => !x.dung) : dich.find((x) => x.dung);
    const trc = dao.van.q ? dao.van.q.stt : 0;
    t.G.invuln = 1e9;
    t.cham(muc.r, muc.c);
    const toi = await t.troi(20000, () => (dao.van.q && dao.van.q.xong) || t.G.state === 'cho');
    assert.ok(toi, 'tới đích ở lần ' + lan + ' (câu ' + trc + ')');
    if (t.G.state === 'cho') {
      await t.troi(1200);
      assert.ok(dao.w.CauNoi._trangThai().phMo, 'đảo đang hiện màn lời giải');
      dao.dom.reg['cn-ph-tiep'].click();
      await t.troi(200);
    } else await t.troi(1700);
  }
  assert.ok(dao.kq.xong, 'đảo nhận kết thúc ván');
  assert.ok(dao.kq.xong.diem > 0);
  assert.match(dao.kq.xong.dongPhu, /^Cú Tí tìm đúng \d+ đích/);
  assert.equal(dao.w.DaoCauNoi, null, 'cầu nối đã dọn');
  assert.deepEqual(J(t.D._trangThai().loi), []);

  const evs = await dao.w.NhatKy.docCuaBe('be_MECUNG01');
  const loi = [];
  evs.forEach((e, i) => validate(SCHEMA, e).forEach((m) => loi.push('#' + i + ' ' + e.loai + ' ' + m)));
  assert.deepEqual(loi, [], 'mọi sự kiện hợp lệ lược đồ v1');
  assert.ok(evs.every((e) => e.game === 'me-cung' || e.loai.indexOf('phien') === 0));
  const vb = evs.find((e) => e.loai === 'van_bat_dau');
  assert.equal(vb.du_lieu.do_kho.so_lua_chon, 3);
  assert.equal(vb.du_lieu.do_kho.game_cu, 'me-cung-dong-ho');
  // Theo từng câu: cau_hien → thao_tac… → (goi_y) → tra_loi → (phan_hoi_xem) → cau_ket_thuc
  const theoCau = {};
  evs.filter((e) => e.cau).forEach((e) => { (theoCau[e.cau] = theoCau[e.cau] || []).push(e); });
  const ds = Object.values(theoCau);
  assert.equal(ds.length, lan, 'mỗi lần hiện là một câu');
  assert.equal(ds.length, dao.m.so_cau + 2, '8 câu + 2 câu sai quay lại');
  ds.forEach((es, k) => {
    const loai = es.map((e) => e.loai);
    assert.equal(loai[0], 'cau_hien', 'câu ' + k);
    assert.equal(loai[loai.length - 1], 'cau_ket_thuc', 'câu ' + k);
    const iTl = loai.indexOf('tra_loi');
    assert.ok(iTl > 0, 'câu ' + k + ' có tra_loi');
    assert.equal(loai.filter((x) => x === 'tra_loi').length, 1, 'chọn đáp án: một lần trả lời');
    loai.slice(1, iTl).forEach((x) => assert.ok(['thao_tac', 'goi_y', 'tam_dung', 'tiep_tuc'].indexOf(x) >= 0, 'câu ' + k + ': ' + loai.join(' ')));
    assert.ok(es.slice(1, iTl).some((e) => e.loai === 'thao_tac' && e.du_lieu.kieu === 'di_chuyen'), 'câu ' + k + ' có di_chuyen');
    const ch = es[0].du_lieu;
    assert.equal(ch.lua_chon.length, 3);
    assert.equal(new Set(ch.lua_chon.map((x) => x.vi_tri)).size, 3);
    const tl = es[iTl].du_lieu;
    assert.ok(ch.lua_chon.some((x) => x.vi_tri === tl.vi_tri && x.gia_tri === tl.gia_tri), 'tra_loi đúng chỗ và giá trị của đích');
    const kt = es[es.length - 1].du_lieu;
    if (tl.dung) assert.ok(/^dung/.test(kt.ket_qua));
    else { assert.equal(kt.ket_qua, 'sai'); assert.ok(loai.indexOf('phan_hoi_xem') > iTl); }
    const dcs = es.filter((e) => e.du_lieu.kieu === 'di_chuyen');
    assert.ok(dcs.length <= 40, 'di_chuyen gọn');
  });
  assert.ok(ds.some((es) => es.some((e) => e.loai === 'goi_y' && e.du_lieu.loai_bo != null)), 'gợi ý cấp 3 ghi loai_bo');
  assert.ok(ds.some((es) => es.some((e) => e.loai === 'thao_tac' && e.du_lieu.kieu === 'cham' && e.du_lieu.doi_tuong === 'ma')), 'ghi lần ma chạm');
  assert.ok(evs.some((e) => e.loai === 'tam_dung') && evs.some((e) => e.loai === 'tiep_tuc'));
  const quayLai = ds.filter((es) => es[0].du_lieu.on_lai);
  assert.equal(quayLai.length, 2, 'hai câu sai quay lại');
  const vk = evs.find((e) => e.loai === 'van_ket_thuc');
  assert.equal(vk.du_lieu.bo_do, false);
  assert.equal(vk.du_lieu.diem, t.G.score);
  assert.equal(t.st.getItem('me-cung-dong-ho-v1'), null, 'không ghi localStorage của game');
});
