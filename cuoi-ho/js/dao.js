/* ============================================================
   dao.js – Chế độ đảo của Cưỡi Hổ Vượt Lửa (Đảo Khủng Long, giai đoạn 5)
   - Bật khi trang được đảo mở trong iframe: có ?dao=1, window.parent !== window và window.parent.DaoCauNoi (cùng tên miền).
     Thiếu một điều kiện: CuoiHoDao.bat = false, game chạy y như cũ (menu, hành trình, bài học, hỏi đáp, lưu tiến trình).
   - Đảo giữ ngân hàng câu, ván chơi (VanChoi) và nhật ký; game này chỉ vẽ và điều khiển. Hợp đồng: dao-khung-long/js/cau-noi.js.
   - Mỗi cụm 3 vòng lửa (trên, giữa, dưới) là một câu của DaoCauNoi.cauTiep({ so_lua_chon: 3, vi_tri: ['tren', 'giua', 'duoi'] }).
     Hổ chạy tới cụm vòng đang hiện "?"; hổ dừng thì mới lấy câu, nên thời gian trả lời tính đúng từ lúc bé thấy đề.
     Thẻ câu hỏi hiện de (số đứng riêng in đậm, dấu ? đứng riêng tô cam) và hinh (tia số, đồng hồ: SVG của ngân hàng câu).
     Vòng lửa ghi nhan (chữ số viết to), dong_ho vẽ bằng mặt đồng hồ của game, hinh vẽ thành ảnh nhỏ.
   - Chạm vòng: thao_tac 'cham' { doi_tuong: 'vong_lua', gia_tri, vi_tri } rồi traLoi(gia_tri, { vi_tri }).
     Đúng: vòng nổ sao, điểm, combo, quả mọng. Thử lại (thu_lai): vòng sai tắt, hổ đứng chờ.
     Sai hẳn (can_phan_hoi): hổ nhảy qua vòng sai, vòng đúng sáng xanh, rồi màn "Gần đúng rồi" của đảo (phanHoi); bé đóng thì chạy tiếp.
     Không có hết giờ, không mất tim, không bảng kết quả: cauTiep() trả null thì cụm "?" cuối nổ pháo hoa, hổ về đích, ketThuc().
   - Gợi ý 💡: DaoCauNoi.goiY(); cấp 3 tắt một vòng sai (ghi loai_bo) nếu còn ít nhất hai vòng sai.
   - Tạm dừng: tamDung('nut' | 'an_tab'), tiepTuc('nut'); bảng tạm dừng chỉ còn "Chơi tiếp" và "Về đảo" (veDao).
   - Âm thanh theo đảo: thongTin().am_thanh.tieng bật tắt hiệu ứng và nhạc, .giong bật tắt giọng đọc
     (máy không có giọng Việt thì nhờ giọng của đảo: DaoCauNoi.doc). Không ghi localStorage của game (Store.save tắt).
   Hook trong game.js: các dòng "if (DAO ..." có chú thích "Chế độ đảo".
   API: window.CuoiHoDao = { bat, gan, khoiDong, moCong, chon, dung, sai, hoc, duocQua, goiY, conGoiY, tamDung, tiepTuc,
                             ketThuc, veDao, baoLoi, vong, theCau, phongTo, _trangThai }
   ============================================================ */
(function () {
  'use strict';

  const VI_TRI = ['tren', 'giua', 'duoi'];
  const TOC_DO = 0.9;   // như các màn lớp 2 của game (Giờ đúng, Giờ rưỡi)
  const ANH_QUA_MONG = '../dao-khung-long/assets/img/berry.webp';

  /** Cầu nối của đảo, hoặc null khi game chạy riêng. */
  function timCauNoi() {
    try {
      const tim = String((window.location && window.location.search) || '');
      if (!/[?&]dao=1(?:&|$)/.test(tim)) return null;
      const cha = window.parent;
      if (!cha || cha === window) return null;
      const cn = cha.DaoCauNoi;   // khác tên miền thì dòng này ném lỗi: không phải chế độ đảo
      return cn && typeof cn.cauTiep === 'function' ? cn : null;
    } catch (e) { return null; }
  }

  const cn = timCauNoi();
  // Gắn lớp ngay khi nạp (trước khi vẽ) để menu của game không nháy lên trong đảo
  if (cn) { try { document.documentElement.classList.add('dao'); } catch (e) { /* bỏ qua */ } }

  let N = null;   // phần bên trong của game.js (gan)
  const s = {
    giaiDoan: 'cho',   // cho | bat_dau | choi | het | ve_dao
    tt: null, am: { tieng: true, giong: true },
    tong: 0, soMoi: 0, soCau: 0, daGap: {}, quaMong: 0,
    cau: null,         // câu đang mở (đã gọi cauTiep, chưa đóng)
    ph: null,          // câu sai đang chờ màn "Gần đúng rồi": { gate, gia_tri, kq, mo, xong }
    qua: false, lech: false, loi: [], goiVoice: null
  };

  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function an(el, b) { if (el && el.classList) el.classList.toggle('hidden', !!b); }
  function sfx(ten) { try { window.Sfx.play(ten); } catch (e) { /* bỏ qua */ } }

  function baoLoi(e) {
    const msg = String((e && e.message) || e || 'lỗi').slice(0, 300);
    s.loi.push(msg);
    try { console.error('[cuoi-ho/dao]', msg); } catch (x) { /* bỏ qua */ }
  }

  /** Gọi một hàm của cầu nối, lỗi không được làm hỏng ván chơi. */
  function goi(ten) {
    const thamSo = Array.prototype.slice.call(arguments, 1);
    try { return cn[ten].apply(cn, thamSo); } catch (e) { baoLoi(e); return null; }
  }

  /* ---------------- Khởi động: thẻ "Bắt đầu" ---------------- */

  function gan(noi) { N = noi; }

  function khoiDong() {
    if (!N) return;
    N.G.state = 'dao';   // hổ chạy nền phía sau thẻ bắt đầu (không phải menu: không lời chào, không nhạc menu riêng)
    s.tt = goi('sanSang') || {};
    apDungAmThanh();
    const man = s.tt.man || {};
    s.tong = man.so_cau || 0;
    const ten = $('dao-ten-man');
    if (ten) ten.textContent = man.ten || 'Cưỡi Hổ Vượt Lửa';
    const phu = $('dao-phu');
    if (phu) {
      const be = (s.tt.be && s.tt.be.ten) ? s.tt.be.ten + ' ơi, ' : '';
      phu.textContent = be + (s.tong ? s.tong + ' cụm vòng lửa đang chờ. ' : '') + 'Chạm vào vòng có đáp án đúng để hổ nhảy qua!';
    }
    const anh = $('hud-qua-mong-anh');
    if (anh) anh.src = ANH_QUA_MONG;
    const nut = $('dao-bat-dau');
    if (nut) nut.addEventListener('click', batDauChoi);
    const veDau = $('dao-ve-dao-dau');
    if (veDau) veDau.addEventListener('click', function () { sfx('click'); veDao(); });
    const veTam = $('btn-dao-ve');
    if (veTam) veTam.addEventListener('click', function () { sfx('click'); veDao(); });
    an($('dao-start'), false);
    s.giaiDoan = 'bat_dau';
    setTimeout(function () { try { if (nut) nut.focus(); } catch (e) { /* bỏ qua */ } }, 80);
  }

  /** Âm thanh theo thiết lập của đảo; máy chưa có giọng Việt thì đọc bằng giọng của đảo. */
  function apDungAmThanh() {
    const am = s.tt.am_thanh || {};
    s.am = { tieng: am.tieng !== false, giong: am.giong !== false };
    try { window.Sfx.setEnabled(s.am.tieng); window.Music.setEnabled(s.am.tieng); window.Voice.setEnabled(s.am.giong); } catch (e) { /* bỏ qua */ }
    const V = window.Voice;
    if (V && !s.goiVoice) {
      s.goiVoice = V.say;
      V.say = function (chu, tuyChon) {
        if (!s.am.giong || !chu) return;
        if (V.available) { s.goiVoice.call(V, chu, tuyChon); return; }
        goi('doc', String(chu));
      };
    }
  }

  function batDauChoi() {
    if (s.giaiDoan !== 'bat_dau' || !N) return;
    s.giaiDoan = 'choi';
    try { window.Sfx.unlock(); } catch (e) { /* bỏ qua */ }
    sfx('click');
    an($('dao-start'), true);
    const man = (s.tt && s.tt.man) || {};
    const lv = {
      id: 'dao', n: 0, index: 0, title: man.ten || 'Cưỡi Hổ Vượt Lửa', icon: '🐯', grade: 2, desc: '',
      gates: s.tong || 10, timer: 16, speed: TOC_DO, hearts: 3, notes: [], lesson: [], quiz: []
    };
    goi('batDau', { toc_do: TOC_DO, so_vong_moi_cum: 3, het_gio: false });
    hienQuaMong(false);
    N.startGame(lv, { practice: true });   // practice: không mất tim, không tính kỷ lục
  }

  /* ---------------- Câu hỏi ---------------- */

  /** Hổ vừa dừng trước cụm vòng: lấy câu kế tiếp. false khi hết câu (cụm "?" hóa pháo hoa). */
  function moCong(gate) {
    if (!N || gate.q) return true;
    if (s.giaiDoan !== 'choi') return false;
    s.lech = false;
    for (let lan = 0; lan < 6; lan++) {
      const c = goi('cauTiep', { so_lua_chon: 3, vi_tri: VI_TRI.slice() });
      if (!c) { phaoHoa(gate); return false; }
      const q = doiCau(c);
      if (!q) {   // dạng câu vòng lửa không vẽ được (không có lựa chọn, đáp án không phải số): bỏ qua, câu quay lại sau
        baoLoi('Câu không có lựa chọn: ' + c.ma_cau);
        goi('hetGio');
        continue;
      }
      s.cau = c;
      s.soCau++;
      if (!s.daGap[c.ma_cau]) { s.daGap[c.ma_cau] = 1; s.soMoi++; }
      if (c.tong) s.tong = c.tong;
      gate.q = q;
      gate.goiYCap = 0;
      for (let i = 0; i < 3; i++) if (!q.options[i]) gate.rings[i].burst = 1;   // câu chỉ có 2 lựa chọn: vòng thứ ba tắt hẳn
      bungLua(gate);
      return true;
    }
    phaoHoa(gate);
    return false;
  }

  /** Câu của đảo → câu của game ({ prompt, options, answer, answerText… } như Lessons.mkQ). */
  function doiCau(c) {
    let ds = (c.lua_chon || []).slice(0, 3);
    if (ds.length < 2) ds = luaChonDuPhong(c);
    if (ds.length < 2) return null;
    // Đồng hồ như game gốc: đề đã có hình đồng hồ ("Đồng hồ chỉ mấy giờ?") thì vòng ghi chữ,
    // đề chỉ có chữ ("Đồng hồ nào chỉ 8 giờ?") thì vòng là mặt đồng hồ; ngân hàng câu có thể nói rõ bằng hien.
    const matDongHo = function (x) { return x.hien ? x.hien === 'dong_ho' : !c.hinh; };
    const options = ds.map(function (x) {
      const o = { text: String(x.nhan != null && x.nhan !== '' ? x.nhan : x.gia_tri), gia_tri: x.gia_tri, vi_tri: x.vi_tri || null };
      if (x.dong_ho && x.dong_ho.h != null) { if (matDongHo(x)) o.clock = { h: gio12(x.dong_ho.h), m: Math.max(0, Math.min(59, Math.round(Number(x.dong_ho.m) || 0))) }; }
      else if (x.hinh) o.img = anhSvg(x.hinh);
      return o;
    });
    let answer = -1;
    ds.forEach(function (x, i) { if (x.dung && answer < 0) answer = i; });
    if (answer < 0) ds.forEach(function (x, i) { if (answer < 0 && String(x.gia_tri) === String(c.dap_an)) answer = i; });
    const nhan = c.dap_an_nhan != null ? String(c.dap_an_nhan) : String(c.dap_an);
    const de = String(c.de || '');
    return {
      dao: true, cau: c,
      prompt: deHtml(de), speech: c.de_doc || de, hinhHtml: c.hinh || '', loaiDe: c.hinh ? 'hinh' : coChu(de) ? 'chu' : 'day',
      options: options, answer: Math.max(0, answer), answerText: nhan, answerSpeech: nhan,
      explain: '', key: c.ma_cau, info: null, topic: '', review: !!c.on_lai, giay: c.giay || 8, extraTime: 0
    };
  }

  /**
   * Câu đến không có lựa chọn (dạng mặc định của kỹ năng là thao tác hay nhập, ví dụ quay kim đồng hồ): vòng lửa cần 3 lựa chọn,
   * nên dựng dạng chọn đáp án bằng chính ngân hàng câu của đảo (cùng tên miền): đáp án nhiễu mang tên lỗi như mọi game.
   * Không có ngân hàng: đáp án số thì thêm hai số liền kề. Đảo vẫn chấm theo giá trị bé chọn.
   * (Nên sửa gốc ở đảo: màn của game cũ hỏi dạng chon_dap_an, xem báo cáo.)
   */
  function luaChonDuPhong(c) {
    let ds = [];
    try {
      const NH = window.parent.NganHang;
      if (NH && typeof NH.taoNhieu === 'function' && c.cau_truc && c.ky_nang) {
        let hat = 7 + s.soCau;
        for (let i = 0; i < String(c.ma_cau).length; i++) hat = (hat * 31 + String(c.ma_cau).charCodeAt(i)) >>> 0;
        const nhieu = (NH.taoNhieu(c.ky_nang, c.cau_truc, NH.taoRng(hat)) || []).slice(0, 2);
        ds = [{ gia_tri: c.dap_an, dung: true }].concat(nhieu.map(function (x) { return { gia_tri: x.gia_tri, dung: false }; }));
        ds.forEach(function (x) {
          const v = NH.veLuaChon(c.cau_truc, x.gia_tri) || {};
          x.nhan = v.nhan != null ? String(v.nhan) : NH.hienGiaTriCau(c.cau_truc, x.gia_tri);
          x.dong_ho = v.dong_ho || null; x.hinh = v.hinh || ''; x.hien = v.hien || null;
        });
      }
    } catch (e) { baoLoi(e); ds = []; }
    if (ds.length < 2) {
      const d = Number(c.dap_an);
      if (!Number.isInteger(d)) return [];
      ds = [d, d + 1, d > 0 ? d - 1 : d + 2].map(function (v) { return { gia_tri: v, nhan: String(v), dung: v === d }; });
    }
    const r = s.soCau % ds.length;   // xoay vị trí đáp án đúng (không dùng Math.random cho dữ liệu câu)
    const xoay = ds.slice(r).concat(ds.slice(0, r));
    return xoay.map(function (x, i) { return Object.assign(x, { vi_tri: VI_TRI[i] }); });
  }

  function coChu(t) { return /[A-Za-zÀ-ỹĐđ]/.test(t); }
  function gio12(h) { h = Math.round(Number(h) || 0); return ((h % 12) + 12) % 12 || 12; }

  /** Đề: số đứng riêng in đậm (câu có chữ), dấu ? đứng riêng thành ô cam như chỗ trống trên tia số. */
  function deHtml(de) {
    let h = esc(de);
    if (coChu(de)) h = h.replace(/(^|[\s(])(\d+)(?=$|[\s,.;:!?)])/g, '$1<b>$2</b>');
    return h.replace(/(^|[\s,])\?(?=$|[\s,])/g, '$1<span class="dao-hoi">?</span>');
  }

  /** SVG nhỏ của một lựa chọn → ảnh để vẽ lên canvas (thêm width/height theo viewBox cho mọi trình duyệt). */
  function anhSvg(svg) {
    let t = String(svg);
    if (!/<svg[^>]*\swidth=/.test(t)) {
      const vb = /viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/.exec(t);
      if (vb) t = t.replace('<svg', '<svg width="' + vb[1] + '" height="' + vb[2] + '"');
    }
    if (!/xmlns=/.test(t)) t = t.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(t);
    return img;
  }

  /** Số hiện lên trong vòng: vài tàn lửa bay lên quanh mỗi vòng. */
  function bungLua(gate) {
    const G = N.G, x = N.gateX(gate), n = N.Motion.lite ? 2 : 7;
    for (let i = 0; i < 3; i++) {
      if (!gate.q.options[i]) continue;
      for (let k = 0; k < n; k++) {
        const a = -Math.PI * (0.1 + 0.8 * (k + 0.5) / n);
        N.spawnEmber(x + Math.cos(a) * G.r, G.laneY[i] + Math.sin(a) * G.r, G.r);
      }
    }
    sfx('fire');
  }

  /** Hết câu khi hổ đứng trước cụm "?": ba vòng nổ pháo hoa, hổ nhảy qua rồi chạy về đích. */
  function phaoHoa(gate) {
    const G = N.G, x = N.gateX(gate);
    for (let i = 0; i < 3; i++) { gate.rings[i].burst = 0; N.spawnBurst(x, G.laneY[i], G.r); }
    sfx('fire'); sfx('correct');
    gate.active = true; gate.chosen = 1; gate.evaluated = true; gate.result = 'ok';
    G.finishX = gate.wx + G.gap * 0.9;
    N.beginJump(gate, 1);
  }

  /** Câu vừa đóng: dựng cụm "?" kế tiếp, hoặc đặt vạch đích nếu đảo báo đã hết câu (conCau, nếu cầu nối có). */
  function sauCau(gate) {
    const G = N.G;
    let con = true;
    if (typeof cn.conCau === 'function') { const r = goi('conCau'); con = r !== false; }
    if (con) { if (G.gates[G.gates.length - 1] === gate) G.gates.push(N.makeGate(G.gates.length, null, gate.wx + G.gap)); }
    else G.finishX = gate.wx + G.gap * 0.9;
  }

  /* ---------------- Bé chạm vòng ---------------- */

  /** true: hổ nhảy qua vòng đã chọn; false: hổ đứng yên (thử lại). */
  function chon(gate, lane) {
    const q = gate.q;
    if (!q || !q.dao) return true;
    const o = q.options[lane];
    if (!o) return false;
    goi('thaoTac', 'cham', { doi_tuong: 'vong_lua', gia_tri: o.gia_tri, vi_tri: VI_TRI[lane], cach: N.G.kbd ? 'phim' : 'cham' });
    const kq = goi('traLoi', o.gia_tri, { vi_tri: VI_TRI[lane] });
    gate.kq = kq;
    if (!kq) return true;   // cầu nối lỗi: vẫn cho hổ nhảy, chấm theo cờ dung của lựa chọn
    if (kq.dung) { q.answer = lane; return true; }
    if (q.answer === lane) {   // không khớp cờ dung (không nên xảy ra): lấy vòng mang đáp án đảo trả về
      const k = q.options.findIndex(function (x, i) { return i !== lane && x && String(x.gia_tri) === String(kq.dap_an); });
      q.answer = k >= 0 ? k : (lane + 1) % q.options.length;
    }
    if (kq.thu_lai) { thuLai(gate, lane, kq); return false; }
    return true;
  }

  function thuLai(gate, lane, kq) {
    const G = N.G, rg = gate.rings[lane];
    rg.burst = 0;
    N.spawnSmoke(N.gateX(gate), G.laneY[lane], G.r);
    sfx('burn');
    N.cardFx('shake');
    const loi = kq.loi_noi || 'Chưa đúng rồi';
    N.showHint(loi + '. Con chọn lại nhé!', 'bad', 3200);
    window.Voice.say(loi + '. Con chọn lại nhé!');
    if (G.cursor === lane) { N.moveCursor(1); if (G.cursor === lane) N.moveCursor(-1); }
    if (N.ui.btnHint) N.ui.btnHint.disabled = !conGoiY(gate);
  }

  function dung(gate) {
    const kq = gate.kq || {};
    s.cau = null;
    const n = kq.qua_mong || 0;
    if (n > 0) {
      const G = N.G;
      s.quaMong += n;
      hienQuaMong(true);
      N.addText('+' + n + ' quả mọng', N.gateX(gate), G.laneY[Math.max(0, gate.chosen)] + G.r * 0.6, { color: '#ecd4ff', stroke: 'rgba(60,20,90,0.95)', size: G.r * 0.4, life: 1.3, vy: -30 });
    }
    sauCau(gate);
  }

  function sai(gate) {
    const o = gate.q && gate.q.options[gate.chosen];
    s.ph = { gate: gate, gia_tri: o ? o.gia_tri : null, kq: gate.kq || {}, mo: false, xong: false };
    try { window.Voice.stop(); } catch (e) { /* bỏ qua */ }
  }

  /** Mỗi khung hình khi hổ đứng xem vòng đúng: mở màn "Gần đúng rồi" của đảo, bé đóng thì chạy tiếp. */
  function hoc(gate) {
    const G = N.G, p = s.ph;
    if (!p || p.gate !== gate) {   // không có câu sai đang chờ (cầu nối lỗi): vẫn chạy tiếp được
      if (!s.lech) { s.lech = true; s.cau = null; sauCau(gate); }
      quaTiep();
      return;
    }
    if (!p.mo && G.learnT >= 1.0) {
      p.mo = true;
      try { window.Voice.stop(); window.Music.setDuck('dao', 0.3); } catch (e) { /* bỏ qua */ }
      const hua = goi('phanHoi', p.gia_tri, p.kq);
      Promise.resolve(hua).then(function () { p.xong = true; }, function (e) { baoLoi(e); p.xong = true; });
    }
    if (p.xong) {
      s.ph = null;
      s.cau = null;
      try { window.Music.setDuck('dao', null); } catch (e) { /* bỏ qua */ }
      sauCau(gate);
      quaTiep();
    }
  }

  function quaTiep() { s.qua = true; try { N.skipLearn(); } finally { s.qua = false; } }
  function duocQua() { return s.qua; }

  /* ---------------- Gợi ý, tạm dừng, kết thúc ---------------- */

  function conGoiY(gate) { return !!(gate && gate.q && gate.q.dao && (gate.goiYCap || 0) < 3); }

  function goiY(gate) {
    const G = N.G, ui = N.ui, q = gate.q;
    if (!conGoiY(gate)) return;
    const cap = (gate.goiYCap || 0) + 1;
    let lane = -1;
    let them = {};
    if (cap === 3) {
      const sai = [];
      for (let i = 0; i < 3; i++) if (i !== q.answer && q.options[i] && gate.rings[i].burst < 0) sai.push(i);
      if (sai.length >= 2) {   // chỉ tắt khi còn ít nhất hai vòng sai (không để lộ đáp án)
        lane = sai[(s.soCau + gate.i) % sai.length];
        them = { loai_bo: q.options[lane].gia_tri, vi_tri: VI_TRI[lane] };
      }
    }
    const r = goi('goiY', them);
    if (!r) { gate.goiYCap = 3; if (ui.btnHint) ui.btnHint.disabled = true; return; }
    gate.goiYCap = r.cap;
    gate.hinted = true;   // câu dùng gợi ý: nửa điểm, không thưởng nhanh (như game gốc)
    G.hints++;
    if (lane >= 0) {
      gate.rings[lane].burst = 0;
      N.spawnSmoke(N.gateX(gate), G.laneY[lane], G.r);
      sfx('burn');
      if (G.cursor === lane) { N.moveCursor(1); if (G.cursor === lane) N.moveCursor(-1); }
    } else sfx('page');
    N.showHint('💡 ' + r.loi, 'info', 6000);
    window.Voice.say(r.loi);
    if (ui.btnHint) ui.btnHint.disabled = r.cap >= 3;
  }

  function tamDung(nguon) { if (s.giaiDoan === 'choi') goi('tamDung', nguon || 'nut'); }
  function tiepTuc(nguon) { if (s.giaiDoan === 'choi') goi('tiepTuc', nguon || 'nut'); }

  /** Bé chạm thẻ câu hỏi. true: cho phóng to (thẻ có hình) hoặc thu nhỏ; thẻ chỉ có chữ thì giữ nguyên (chữ đã to). */
  function phongTo(zoomed) {
    if (zoomed) {
      const el = N && N.ui.question;
      if (!el || !el.classList || !el.classList.contains('dao-co-hinh')) return false;
    }
    if (s.giaiDoan === 'choi' && s.cau) goi('thaoTac', 'cham', { doi_tuong: 'the_cau', phong_to: !!zoomed });
    return true;
  }

  /** Hổ về đích: đảo ghi van_ket_thuc và hiện màn kết thúc của nó (gỡ iframe). */
  function ketThuc() {
    if (s.giaiDoan !== 'choi') return;
    s.giaiDoan = 'het';
    const G = N.G;
    try { window.Voice.stop(); window.Music.stop(); } catch (e) { /* bỏ qua */ }
    const dongPhu = 'Hổ nhảy qua ' + G.correct + ' vòng lửa · ' + N.fmt(G.score) + ' điểm';
    goi('ketThuc', { diem: G.score, dong_phu: dongPhu, combo_cao_nhat: G.bestStreak, so_goi_y: G.hints });
  }

  /** Bé bấm "Về đảo" (thẻ bắt đầu hoặc bảng tạm dừng): ván bỏ dở, quả mọng đã có vẫn giữ. */
  function veDao() {
    if (s.giaiDoan === 'het' || s.giaiDoan === 've_dao' || !N) return;
    s.giaiDoan = 've_dao';
    N.G.state = 'dao';
    try { window.Voice.stop(); window.Music.stop(); } catch (e) { /* bỏ qua */ }
    goi('veDao', { diem: N.G.score });
  }

  /* ---------------- HUD ---------------- */

  function vong() {
    const tong = Math.max(1, s.tong || 1);
    return 'Vòng ' + Math.min(tong, Math.max(1, s.soMoi)) + '/' + tong;
  }

  function hienQuaMong(nay) {
    const chip = $('hud-qua-mong'), so = $('hud-qua-mong-so');
    if (so) so.textContent = String(s.quaMong);
    if (chip) {
      chip.setAttribute('aria-label', s.quaMong + ' quả mọng');
      if (nay) { chip.classList.remove('nay'); void chip.offsetWidth; chip.classList.add('nay'); }
    }
  }

  /** Kiểu thẻ câu hỏi: có hình (tia số, đồng hồ) xếp chữ trên hình dưới; dãy số không chữ viết to. */
  function theCau(q) {
    if (!N) return;
    const el = N.ui.question;
    if (!el || !el.classList) return;
    const coHinh = !!(q && (q.hinhHtml || q.clock));
    // Hình gần vuông (đồng hồ): đặt cạnh chữ và vẽ to hơn; hình dài (tia số): dưới chữ
    const vb = /viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec((q && q.hinhHtml) || '');
    const vuong = coHinh && (!!q.clock || (!!vb && Number(vb[1]) / Number(vb[2]) < 1.6));
    el.classList.toggle('dao-co-hinh', coHinh);
    el.classList.toggle('dao-hinh-vuong', vuong);
    el.classList.toggle('dao-day', !!(q && q.loaiDe === 'day'));
  }

  window.CuoiHoDao = {
    bat: !!cn,
    gan: gan, khoiDong: khoiDong, moCong: moCong, chon: chon, dung: dung, sai: sai, hoc: hoc, duocQua: duocQua,
    goiY: goiY, conGoiY: conGoiY, tamDung: tamDung, tiepTuc: tiepTuc, ketThuc: ketThuc, veDao: veDao, baoLoi: baoLoi,
    vong: vong, theCau: theCau, phongTo: phongTo, batDauChoi: batDauChoi,
    _trangThai: function () {
      return {
        bat: !!cn, giaiDoan: s.giaiDoan, tong: s.tong, soMoi: s.soMoi, soCau: s.soCau, quaMong: s.quaMong,
        cau: s.cau ? { ma_cau: s.cau.ma_cau, stt: s.cau.stt, dap_an: s.cau.dap_an } : null,
        phMo: !!(s.ph && s.ph.mo && !s.ph.xong), loi: s.loi.slice()
      };
    }
  };
})();
