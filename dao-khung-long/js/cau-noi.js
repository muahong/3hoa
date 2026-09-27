/* ============================================================
   cau-noi.js – Cầu nối cho sáu game cũ của 3hoa.com chạy trong đảo (giai đoạn 5)
   Chém Trái Cây (math-ninja), Bắn Thiên Thạch (cuu-chuong), Mê Cung (me-cung-dong-ho), Tháp Xếp Hình (thap-dong-ho),
   Xe Tăng (xe-tang-thoi-gian), Cưỡi Hổ (cuoi-ho).
   - Đảo mở game cũ trong một iframe cùng tên miền: ../<thư mục>/?dao=1&man=<mã màn>.
   - Game cũ lấy câu hỏi từ ngân hàng chung và ghi nhật ký qua window.parent.DaoCauNoi: mọi sự kiện đi qua đúng một
     NhatKy và một VanChoi của đảo (một nơi ghi, không lệch phiên), nên báo cáo gộp mọi game theo mã chương trình.
   - Câu sai hẳn: đảo hiện màn "Gần đúng rồi" chung đè lên iframe (game cũ chờ Promise của phanHoi rồi chơi tiếp).
   Hợp đồng cho game cũ (phiên bản 1), mọi giá trị trả về là JSON thuần:
     sanSang()                 game đã tải xong, trả về thongTin()
     thongTin()                { phien_ban, game, ten_game, man: { id, ten, ten_day_du, so_cau, che_do, dang, bai, vung },
                                 be: { ten, ten_khung_long, phong_cach, hinh, hinh_co_vu, hinh_goi_y }, am_thanh: { tieng, giong } }
     batDau(doKho)             bắt đầu ván (ghi van_bat_dau), trả về mã ván
     conCau()                  còn câu nào nữa không (kể cả câu sai chờ quay lại)
     cauTiep(tuyChon)          câu kế tiếp hoặc null khi hết; tuyChon: { so_lua_chon (2 đến 4), vi_tri: ['tren', 'giua', 'duoi'] }
                               câu: { stt, tong, ma_cau, ky_nang, noi_dung, loai, dang, de, de_doc, hinh, the (chữ ngắn), dap_an,
                                      lua_chon: [{ gia_tri, nhan, hinh, dong_ho, hien, dung, vi_tri }], giay, lan_thu_toi_da, cau_truc }
     thaoTac(kieu, duLieu)     ghi một thao tác (kieu theo lược đồ v1)
     goiY(them)                tăng một cấp gợi ý: { cap, loi } hoặc null
     traLoi(giaTri, them)      chấm: { dung, loi, loi_noi, thu_lai, can_phan_hoi, ket_qua, qua_mong, dap_an }
     hetGio()                  câu hết giờ mà bé chưa chốt (ket_qua het_gio, câu quay lại sau 2 câu)
     phanHoi(giaTri, kq)       Promise: hiện màn "Gần đúng rồi" của đảo, khi bé đóng thì ghi phan_hoi_xem và đóng câu sai
     tamDung(nguon), tiepTuc(nguon)
     ketThuc(them)             Promise: kết thúc ván (them: { diem, dong_phu, … }), đảo sang màn kết thúc
     veDao(them)               bé bỏ dở, về đảo
     doc(chu)                  đọc bằng giọng của đảo (nếu game cũ không có giọng)
   API phía đảo: đăng ký 6 thể loại vào window.DaoTroChoi; window.CauNoi = { _trangThai }.
   ============================================================ */
(function () {
  'use strict';

  const PHIEN_BAN = 1;
  const CHO_KET_NOI_MS = 20000;
  const DAO = window.Dao;

  let dom = null;
  let s = null; // { game, o, van, ketNoi, hengio, phMo, phLuc, phNut, phXong, xong }

  function $(id) { return document.getElementById(id); }
  function NH() { return window.NganHang; }
  function AT() { return window.AmThanh; }
  function esc(t) { return window.PhanHoi.esc(t); }
  function an(el, b) { if (el) el.classList.toggle('hidden', !!b); }
  function json(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }

  function khoiDom() {
    if (dom) return dom;
    const sec = $('man-game-cu');
    sec.innerHTML =
      '<iframe id="cn-iframe" class="cn-iframe" title="Trò chơi" allow="autoplay; fullscreen"></iframe>' +
      '<div class="cn-tai" id="cn-tai" role="status">' +
        '<img id="cn-tai-hinh" alt="" class="cn-tai-hinh">' +
        '<p id="cn-tai-chu">Đang mở trò chơi…</p>' +
        '<button class="nut nut-trang hidden" id="cn-tai-ve" type="button">Về đảo</button>' +
      '</div>' +
      '<div class="lop-phu hidden" id="cn-phan-hoi" role="dialog" aria-label="Lời giải">' +
        '<div class="the ph-the">' +
          '<img id="cn-ph-hinh" alt="" class="ph-hinh">' +
          '<div id="cn-ph-noi-dung"></div>' +
          '<div id="cn-ph-que" class="hidden"></div>' +
          '<p class="ph-note" id="cn-ph-note"></p>' +
          '<div class="nut-hang">' +
            '<button class="nut nut-trang" id="cn-ph-que-nut" type="button">Xem bằng que tính</button>' +
            '<button class="nut nut-cam" id="cn-ph-tiep" type="button">Chơi tiếp</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    dom = { sec: sec, iframe: $('cn-iframe'), tai: $('cn-tai'), taiHinh: $('cn-tai-hinh'), taiChu: $('cn-tai-chu'), taiVe: $('cn-tai-ve'),
      ph: $('cn-phan-hoi'), phHinh: $('cn-ph-hinh'), phNd: $('cn-ph-noi-dung'), phQue: $('cn-ph-que'), phNote: $('cn-ph-note'), phQueNut: $('cn-ph-que-nut'), phTiep: $('cn-ph-tiep') };
    dom.taiVe.addEventListener('click', function () { veDao({ ly_do: 'khong_mo_duoc' }); });
    dom.phTiep.addEventListener('click', function () { dongPhanHoi('choi_tiep'); });
    dom.phQueNut.addEventListener('click', doiQueTinh);
    document.addEventListener('keydown', function (e) {
      if (s && s.phMo && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); dongPhanHoi('choi_tiep'); }
    });
    return dom;
  }

  /* ---------------- Mở, đóng game cũ ---------------- */

  function batDau(game, o) {
    khoiDom();
    if (s) donDep();
    s = { game: game, o: o, van: o.van, ketNoi: false, phMo: false, xong: false, daBatDau: false };
    const m = o.man;
    dom.taiHinh.src = DAO.HINH_GAME[game] || '';
    dom.taiChu.textContent = 'Đang mở ' + (DAO.TEN_GAME[game] || 'trò chơi') + '…';
    an(dom.taiVe, true);
    an(dom.tai, false);
    an(dom.ph, true);
    window.DaoCauNoi = api;
    dom.iframe.src = '../' + DAO.THU_MUC_GAME_CU[game] + '/?dao=1&man=' + encodeURIComponent(m.id);
    s.hengio = setTimeout(function () {
      if (!s || s.ketNoi) return;
      dom.taiChu.textContent = 'Chưa mở được trò chơi. Con kiểm tra mạng rồi thử lại nhé.';
      an(dom.taiVe, false);
    }, CHO_KET_NOI_MS);
  }

  function donDep() {
    if (!s) return;
    clearTimeout(s.hengio);
    try { dom.iframe.src = 'about:blank'; } catch (e) { /* bỏ qua */ }
    an(dom.ph, true);
    AT().dungDoc();
    s = null;
    if (window.DaoCauNoi === api) window.DaoCauNoi = null;
  }

  function batBuoc() {
    if (!s) throw new Error('Cầu nối: chưa có ván nào đang mở');
    return s;
  }

  /* ---------------- Dữ liệu gửi cho game cũ ---------------- */

  function thongTin() {
    const st = batBuoc();
    const m = st.o.man;
    return {
      phien_ban: PHIEN_BAN,
      game: st.game,
      ten_game: DAO.TEN_GAME[st.game],
      man: { id: m.id, ten: m.ten, ten_day_du: DAO.tenManDayDu(m), so_cau: st.van.soCauDuKien(), che_do: m.che_do || null, dang: m.dang || null, bai: m.bai, vung: m.vung },
      be: {
        ten: st.o.tenBe, ten_khung_long: st.o.tenKhungLong, phong_cach: st.o.phongCach,
        hinh: tuyetDoi(st.o.hinhBe), hinh_co_vu: tuyetDoi(st.o.hinhCoVu), hinh_goi_y: tuyetDoi(st.o.hinhGoiY)
      },
      am_thanh: { tieng: !!AT().co.tieng, giong: !!AT().co.giong }
    };
  }
  /** Đường dẫn ảnh tuyệt đối để iframe (thư mục khác) dùng được. */
  function tuyetDoi(u) { try { return new URL(u, location.href).href; } catch (e) { return u; } }

  function goiCau(q) {
    const ct = q.cau_truc;
    const kn = NH().KY_NANG[q.ky_nang] || {};
    const lc = (q.lua_chon || []).map(function (x) {
      const v = NH().veLuaChon(ct, x.gia_tri) || {};
      return {
        gia_tri: x.gia_tri, nhan: v.nhan != null ? String(v.nhan) : NH().hienGiaTriCau(ct, x.gia_tri),
        hinh: v.hinh || '', dong_ho: v.dong_ho || null, hien: v.hien || null, dung: !(x.loi && x.loi.length), vi_tri: x.vi_tri || null
      };
    });
    return {
      stt: q.stt, tong: s.van.soCauDuKien(), ma_cau: q.ma_cau, ky_nang: q.ky_nang, noi_dung: q.noi_dung, loai: NH().loaiKyNang(q.ky_nang),
      dang: q.dang, de: q.de, de_doc: q.de_doc || q.de, hinh: q.hinh || '', the: q.the || '', dap_an: q.dap_an,
      dap_an_nhan: NH().hienGiaTriCau(ct, q.dap_an), lua_chon: lc, giay: kn.giay || 10, lan_thu_toi_da: q.toiDaLanThu || 1,
      on_lai: !!q.on_lai, goi_y_so_cap: 3, cau_truc: json(ct)
    };
  }

  /** Thêm đáp án nhiễu cho đủ n lựa chọn (không trùng, không trùng đáp án đúng). */
  function duLuaChon(q, n, rng) {
    // Đáp án đúng luôn đứng đầu trước khi cắt bớt, để không bao giờ mất khi game xin ít lựa chọn hơn
    const ds = (q.lua_chon || []).slice().sort(function (a, b) { return (a.loi && a.loi.length ? 1 : 0) - (b.loi && b.loi.length ? 1 : 0); });
    const co = {};
    ds.forEach(function (x) { co[String(x.gia_tri)] = 1; });
    for (let lan = 0; ds.length < n && lan < 12; lan++) {
      NH().taoNhieu(q.ky_nang, q.cau_truc, rng).forEach(function (x) {
        if (ds.length < n && !co[String(x.gia_tri)]) { co[String(x.gia_tri)] = 1; ds.push(x); }
      });
    }
    return NH().tron(rng, ds.slice(0, Math.max(2, n)));
  }

  /* ---------------- Hợp đồng cho game cũ ---------------- */

  const api = {
    phien_ban: PHIEN_BAN,

    sanSang: function () {
      const st = batBuoc();
      st.ketNoi = true;
      clearTimeout(st.hengio);
      an(dom.tai, true);
      try { dom.iframe.focus(); } catch (e) { /* bỏ qua */ }
      return thongTin();
    },
    thongTin: thongTin,

    batDau: function (doKho) {
      const st = batBuoc();
      if (st.daBatDau) return st.van.vanId;
      st.daBatDau = true;
      return st.van.batDau(Object.assign({ game_cu: DAO.THU_MUC_GAME_CU[st.game] }, json(doKho) || {}));
    },

    cauTiep: function (tuyChon) {
      const st = batBuoc();
      if (!st.daBatDau) api.batDau({});
      tuyChon = tuyChon || {};
      const van = st.van;
      if (van.q && !van.q.xong) throw new Error('Câu trước chưa kết thúc');
      const muc = van._layMuc();
      if (!muc) return null;
      // Game cũ xin lựa chọn mà câu đang ở dạng thao tác riêng của game mới (kéo kim, kéo thả…): hỏi dạng chọn đáp án
      if (tuyChon.so_lua_chon && ['chon_dap_an', 'nhap_so', 'sap_xep', 'doc_va_chon'].indexOf(muc.dang) < 0) muc.dang = 'chon_dap_an';
      const q = van._taoQ(muc);
      let lc = null;
      if (q.lua_chon && q.lua_chon.length) {
        const n = Math.max(2, Math.min(4, tuyChon.so_lua_chon || q.lua_chon.length));
        lc = n === q.lua_chon.length ? q.lua_chon.slice() : duLuaChon(q, n, van.rng);
        const viTri = tuyChon.vi_tri || [];
        lc = lc.map(function (x, i) { return Object.assign({}, x, { vi_tri: viTri[i] || ('lua_chon_' + (i + 1)) }); });
      }
      van.hienCau(q, lc);
      return goiCau(q);
    },

    /** Còn câu nào nữa không (kể cả câu sai đang chờ quay lại). */
    conCau: function () { const st = batBuoc(); return st.van.conCau(); },

    thaoTac: function (kieu, duLieu) { const st = batBuoc(); st.van.thaoTac(String(kieu), json(duLieu) || {}); return true; },

    goiY: function (them) { const st = batBuoc(); return json(st.van.goiY(json(them))); },

    traLoi: function (giaTri, them) {
      const st = batBuoc();
      const q = st.van.q;
      const kq = st.van.traLoi(giaTri, json(them));
      if (!kq) return null;
      return {
        dung: !!kq.dung, loi: kq.loi || [], loi_noi: kq.loiNoi || null, thu_lai: !!kq.thuLai, can_phan_hoi: !!kq.canPhanHoi,
        ket_qua: kq.ketQua || null, qua_mong: kq.quaMong || 0, dap_an: q ? q.dap_an : null,
        dap_an_nhan: q ? NH().hienGiaTriCau(q.cau_truc, q.dap_an) : null
      };
    },

    hetGio: function () {
      const st = batBuoc();
      st.van.hetGio();
      return { ket_qua: 'het_gio' };
    },

    phanHoi: function (giaTri, kq) {
      const st = batBuoc();
      const q = st.van.q;
      if (!q || q.xong) return Promise.resolve(false);
      return new Promise(function (xong) { hienPhanHoi(q, giaTri, kq || {}, xong); });
    },

    tamDung: function (nguon) { batBuoc(); window.NhatKy.tamDung(nguon || 'nut'); return true; },
    tiepTuc: function (nguon) { batBuoc(); window.NhatKy.tiepTuc(nguon || 'nut'); return true; },

    ketThuc: function (them) {
      const st = batBuoc();
      if (st.xong) return Promise.resolve(null);
      st.xong = true;
      const t = json(them) || {};
      const dongPhu = t.dong_phu || null;
      delete t.dong_phu;
      const o = st.o;
      return st.van.ketThuc(false, t).then(function (kq) {
        if (kq) {
          kq.diem = t.diem || 0;
          kq.dongPhu = dongPhu || (t.diem ? 'Được ' + Number(t.diem).toLocaleString('vi-VN') + ' điểm' : '');
        }
        donDep();
        if (o.onXong) o.onXong(kq);
        return true;
      });
    },

    veDao: function (them) { return veDao(them); },

    doc: function (chu) { if (chu) AT().doc(String(chu)); return true; }
  };

  function veDao(them) {
    if (!s) return Promise.resolve(null);
    const st = s;
    if (st.xong) return Promise.resolve(null);
    st.xong = true;
    const o = st.o;
    return st.van.ketThuc(true, Object.assign({ ly_do: 've_dao' }, json(them) || {})).then(function (kq) {
      donDep();
      if (o.onThoat) o.onThoat(kq);
      return true;
    });
  }

  /* ---------------- Màn "Gần đúng rồi" đè lên iframe ---------------- */

  function hienPhanHoi(q, giaTri, kq, xong) {
    const PH = window.PhanHoi;
    const k = { loi: kq.loi || NH().nhanBietLoi(q.cau_truc, giaTri), loiNoi: kq.loi_noi || kq.loiNoi || null };
    if (!k.loiNoi) k.loiNoi = NH().loiNoiVoiBe(q.cau_truc, giaTri, k.loi);
    s.phMo = true;
    s.phLuc = performance.now();
    s.phNut = 'choi_tiep';
    s.phXong = xong;
    dom.phHinh.src = s.o.hinhGoiY || '';
    dom.phNd.innerHTML = PH.noiDung(q, giaTri, k);
    const que = PH.queTinh(q.cau_truc && !q.cau_truc.loai ? q.cau_truc : null);
    dom.phQue.innerHTML = que || '';
    an(dom.phQue, true);
    an(dom.phQueNut, !que);
    dom.phQueNut.textContent = 'Xem bằng que tính';
    dom.phNote.textContent = q.lanOnLai < 2 ? 'Câu này sẽ quay lại sau 2 câu nữa để con tự làm' : 'Lần sau gặp lại, con làm được mà!';
    an(dom.ph, false);
    AT().doc((k.loi && k.loi[0] !== 'khac' ? 'Gần đúng rồi. ' : '') + (k.loiNoi || ''));
    setTimeout(function () { try { dom.phTiep.focus(); } catch (e) { /* bỏ qua */ } }, 50);
  }

  function doiQueTinh() {
    if (!s || !s.phMo) return;
    const dangQue = dom.phQue.classList.contains('hidden');
    if (dangQue) { s.phNut = 'que_tinh'; s.van.thaoTac('cham', { doi_tuong: 'nut_que_tinh' }); }
    an(dom.phQue, !dangQue);
    const giai = dom.phNd.querySelector('.ph-giai');
    if (giai) an(giai, dangQue);
    dom.phQueNut.textContent = dangQue ? 'Xem lời giải' : 'Xem bằng que tính';
  }

  function dongPhanHoi(nut) {
    if (!s || !s.phMo) return;
    const giay = (performance.now() - s.phLuc) / 1000;
    s.phMo = false;
    an(dom.ph, true);
    AT().dungDoc();
    s.van.phanHoiXem(giay, s.phNut === 'que_tinh' ? 'que_tinh' : nut);
    s.van.ketThucCauSai();
    const cb = s.phXong;
    s.phXong = null;
    try { dom.iframe.focus(); } catch (e) { /* bỏ qua */ }
    if (cb) cb(true);
  }

  /* ---------------- Đăng ký sáu thể loại ---------------- */

  const reg = window.DaoTroChoi = window.DaoTroChoi || {};
  Object.keys(DAO.THU_MUC_GAME_CU).forEach(function (g) {
    reg[g] = { ten: DAO.TEN_GAME[g], khung: false, man: 'man-game-cu', game_cu: true, batDau: function (o) { batDau(g, o); } };
  });

  window.CauNoi = { PHIEN_BAN: PHIEN_BAN, _trangThai: function () { return s; }, _api: api, _dongPhanHoi: dongPhanHoi };
})();
