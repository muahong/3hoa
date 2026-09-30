/* ============================================================
   phu-kien.js – 12 món đồ của khủng long (10 của trứng vùng, 2 của đấu trường): danh mục, món nào bé đã có,
   ghép món đang mặc lên hình khủng long, và "phép" của món đồ khi bé làm đúng.
   - Món đồ chỉ đến từ việc học (trứng vùng nở, thắng đấu trường), không mua bằng quả mọng.
   - Mỗi lúc khủng long mặc một món (ho_so.dang_mac). Phép chỉ đổi hình và tiếng: không đổi câu hỏi, gợi ý, máu trùm,
     sao hay quả mọng (kiểm thử trong tests/dao-khung-long-hang.test.js).
   - Hồ sơ cũ lưu tên món trong ho_so.phu_kien (mảng tên); giữ nguyên, danh mục tra theo tên.
   - NEO: điểm đặt đồ trên từng hình khủng long (phần trăm theo hình WebP đã cắt sát viền). Hình trứng không mặc đồ.
     scripts/dkl-neo-phu-kien.py đọc khối JSON giữa hai dấu NEO để vẽ bảng kiểm tra.
   API: window.PhuKien = { DS, CHO, TEN_CHO, theoMa(ma), theoTen(ten), cuaBe(p), coMon(p, ma), dangMac(p), chuaXem(p),
        coPhep(ma, man), phepCua(ma, tenKhungLong), maTuHinh(ten), coNeo(tenHinh), viTri(tenHinh, ma, rong, cao),
        anhMac(tenHinh, ma, duongDan) → Promise<url>, phep(ma, tuyChon) }
   ============================================================ */
(function () {
  'use strict';

  const CHO = ['dau', 'co', 'than', 'tay', 'chan'];
  const TEN_CHO = { dau: 'đầu', co: 'cổ', than: 'thân', tay: 'tay', chan: 'chân' };

  /**
   * vung: vùng của món (11, 12 là hai đấu trường). anh: tên hình trong assets/img. cho: chỗ mặc.
   * vi: con có món này vì… (bé đã có). nhan: để nhận… (bé chưa có). lam: điều món đồ làm khi bé làm đúng.
   * hieu_ung: lớp CSS của phép (css/hang.css), hat: màu các hạt bay ra, tieng: tiếng động (js/am-thanh.js).
   * s: cỡ so với chỗ mặc (1 là vừa), dy: dời lên xuống theo chiều cao món đồ.
   */
  const DS = [
    { ma: 'khan-100', ten: 'Khăn Số 100', anh: 'pk-khan-100', vung: 1, cho: 'co', lam: 'khăn bay phấp phới', hieu_ung: 'bay', hat: ['#35b8e6', '#ffffff', '#8fe3ff'], tieng: 'phep_bay', s: 1, dy: 0 },
    { ma: 'mao-lua', ten: 'Mào Lửa', anh: 'pk-mao-lua', vung: 2, cho: 'dau', lam: 'mào bốc lửa', hieu_ung: 'lua', hat: ['#ff6b35', '#ffd166', '#ef476f'], tieng: 'phep_lua', s: 1, dy: 0 },
    { ma: 'thuoc-vang', ten: 'Thước Vàng', anh: 'pk-thuoc-vang', vung: 3, cho: 'tay', lam: 'thước vàng lấp lánh', hieu_ung: 'lap-lanh', hat: ['#ffd166', '#fff3b0', '#f4a300'], tieng: 'phep_sao', s: 1.6, dy: 0 },
    { ma: 'giay-dua', ten: 'Giày Đua', anh: 'pk-giay-dua', vung: 4, cho: 'chan', lam: 'giày đua chạy vèo vèo', hieu_ung: 'chay', hat: ['#ff8a1f', '#ffffff', '#06d6a0'], tieng: 'phep_veo', s: 1.4, dy: 0 },
    { ma: 'khien-hinh-khoi', ten: 'Khiên Hình Khối', anh: 'pk-khien', vung: 5, cho: 'tay', lam: 'khiên lóe sáng các hình', hieu_ung: 'loe', hat: ['#3d7be0', '#ffd166', '#ef476f', '#3aa65b'], tieng: 'phep_sao', s: 1.2, dy: 0 },
    { ma: 'mu-dong-ho', ten: 'Mũ Đồng Hồ', anh: 'pk-mu-dong-ho', vung: 6, cho: 'dau', lam: 'mũ đồng hồ reo chuông', hieu_ung: 'reo', hat: ['#3d7be0', '#c9d6ff', '#ffd166'], tieng: 'phep_chuong', s: 1, dy: 0 },
    { ma: 'giap-nhan-chia', ten: 'Giáp Nhân Chia', anh: 'pk-giap-nhan-chia', vung: 7, cho: 'than', lam: 'giáp sáng hồng lên', hieu_ung: 'sang', hat: ['#d35a9c', '#ffc2e2', '#ffd166'], tieng: 'phep_sao', s: 1.25, dy: 0 },
    { ma: 'vong-co-nghin', ten: 'Vòng Cổ Nghìn', anh: 'pk-vong-co-nghin', vung: 8, cho: 'co', lam: 'vòng cổ lấp lánh ánh vàng', hieu_ung: 'lap-lanh', hat: ['#c9a227', '#ffe27a', '#4fb6ff'], tieng: 'phep_sao', s: 1, dy: 0 },
    { ma: 'tui-tien', ten: 'Túi Tiền Nhỏ', anh: 'pk-tui-tien', vung: 9, cho: 'tay', lam: 'túi tiền kêu leng keng', hieu_ung: 'reo', hat: ['#ffd166', '#f4a300', '#fff3b0'], tieng: 'phep_leng_keng', s: 1.2, dy: 0 },
    { ma: 'can-cau-bac', ten: 'Cần Câu Bạc', anh: 'pk-can-cau', vung: 10, cho: 'tay', lam: 'cần câu giật giật như cá cắn câu', hieu_ung: 'giat', hat: ['#1d9bd1', '#bfefff', '#ffffff'], tieng: 'phep_bay', s: 2, dy: 0 },
    { ma: 'giap-hk1', ten: 'Bộ Giáp Học Kì 1', anh: 'pk-giap-hk1', vung: 11, cho: 'than', lam: 'giáp sáng lên', hieu_ung: 'sang', hat: ['#7fb3ff', '#ffd166', '#ffffff'], tieng: 'phep_giap', s: 1.25, dy: 0,
      tuyet_chieu: 'Cú Húc Giáp Thép' },
    { ma: 'vuong-mien', ten: 'Vương Miện Cuối Năm', anh: 'pk-vuong-mien', vung: 12, cho: 'dau', lam: 'vương miện lấp lánh', hieu_ung: 'lap-lanh', hat: ['#ffd166', '#ef476f', '#3d7be0', '#06d6a0'], tieng: 'phep_sao', s: 0.9, dy: 0,
      moi_vung: true }
  ];

  /* Điểm neo: x, y là tâm chỗ mặc (phần trăm bề ngang, bề cao của hình), w là bề ngang món đồ (phần trăm bề ngang hình),
     r là góc xoay (độ). Chân có hai điểm (món đồ vẽ một chiếc, chiếc thứ hai lật gương). Mũ đặt đáy món đồ lên điểm neo. */
  /* NEO-BAT-DAU */
  const NEO = {
    "rex-hatchling": { "dau": { "x": 52, "y": 9, "w": 46, "r": -4 }, "co": { "x": 55, "y": 50, "w": 52, "r": 0 }, "than": { "x": 55, "y": 57, "w": 52, "r": 0 }, "tay": { "x": 82, "y": 40, "w": 30, "r": 8 }, "chan": [{ "x": 26, "y": 93, "w": 22, "r": 0 }, { "x": 76, "y": 93, "w": 22, "r": 0 }] },
    "rex-kid": { "dau": { "x": 57, "y": 11, "w": 42, "r": 2 }, "co": { "x": 55, "y": 55, "w": 50, "r": 0 }, "than": { "x": 60, "y": 69, "w": 46, "r": 0 }, "tay": { "x": 88, "y": 45, "w": 26, "r": 10 }, "chan": [{ "x": 30, "y": 94, "w": 22, "r": 0 }, { "x": 78, "y": 95, "w": 22, "r": 0 }] },
    "rex-teen": { "dau": { "x": 64, "y": 13, "w": 36, "r": 4 }, "co": { "x": 52, "y": 47, "w": 44, "r": -4 }, "than": { "x": 56, "y": 62, "w": 40, "r": 0 }, "tay": { "x": 85, "y": 47, "w": 22, "r": 10 }, "chan": [{ "x": 9, "y": 92, "w": 18, "r": -20 }, { "x": 88, "y": 88, "w": 18, "r": 10 }] },
    "rex-adult": { "dau": { "x": 60, "y": 11, "w": 38, "r": 2 }, "co": { "x": 58, "y": 50, "w": 46, "r": 0 }, "than": { "x": 58, "y": 65, "w": 44, "r": 0 }, "tay": { "x": 88, "y": 38, "w": 22, "r": 10 }, "chan": [{ "x": 31, "y": 94, "w": 20, "r": 0 }, { "x": 82, "y": 94, "w": 20, "r": 0 }] },
    "rex-legend": { "dau": { "x": 58, "y": 11, "w": 36, "r": 2 }, "co": { "x": 52, "y": 49, "w": 50, "r": 0 }, "than": { "x": 55, "y": 63, "w": 42, "r": 0 }, "tay": { "x": 88, "y": 55, "w": 20, "r": 10 }, "chan": [{ "x": 30, "y": 94, "w": 20, "r": 0 }, { "x": 78, "y": 94, "w": 20, "r": 0 }] },
    "rex-eating": { "dau": { "x": 55, "y": 11, "w": 34, "r": -2 }, "co": { "x": 55, "y": 49, "w": 40, "r": 0 }, "than": { "x": 60, "y": 67, "w": 38, "r": 0 }, "tay": { "x": 27, "y": 55, "w": 18, "r": -10 }, "chan": [{ "x": 48, "y": 92, "w": 18, "r": 0 }, { "x": 90, "y": 85, "w": 18, "r": 10 }] },
    "rex-cheer": { "dau": { "x": 60, "y": 10, "w": 34, "r": 2 }, "co": { "x": 58, "y": 48, "w": 40, "r": 0 }, "than": { "x": 55, "y": 62, "w": 40, "r": 0 }, "tay": { "x": 74, "y": 30, "w": 18, "r": 10 }, "chan": [{ "x": 20, "y": 92, "w": 18, "r": -8 }, { "x": 90, "y": 82, "w": 18, "r": 10 }] },
    "rex-think": { "dau": { "x": 58, "y": 16, "w": 44, "r": 0 }, "co": { "x": 52, "y": 52, "w": 55, "r": 0 }, "than": { "x": 52, "y": 67, "w": 50, "r": 0 }, "tay": { "x": 91, "y": 47, "w": 26, "r": 10 }, "chan": [{ "x": 25, "y": 95, "w": 26, "r": 0 }, { "x": 80, "y": 95, "w": 26, "r": 0 }] },
    "may-hatchling": { "dau": { "x": 50, "y": 8, "w": 40, "r": 0 }, "co": { "x": 55, "y": 40, "w": 36, "r": 0 }, "than": { "x": 55, "y": 55, "w": 46, "r": 0 }, "tay": { "x": 76, "y": 47, "w": 22, "r": 8 }, "chan": [{ "x": 30, "y": 94, "w": 20, "r": 0 }, { "x": 72, "y": 94, "w": 20, "r": 0 }] },
    "may-kid": { "dau": { "x": 55, "y": 10, "w": 34, "r": 4 }, "co": { "x": 62, "y": 52, "w": 32, "r": 0 }, "than": { "x": 63, "y": 62, "w": 36, "r": 0 }, "tay": { "x": 86, "y": 74, "w": 18, "r": 8 }, "chan": [{ "x": 35, "y": 93, "w": 18, "r": 0 }, { "x": 72, "y": 94, "w": 18, "r": 0 }] },
    "may-teen": { "dau": { "x": 71, "y": 9, "w": 26, "r": 4 }, "co": { "x": 71, "y": 38, "w": 28, "r": 0 }, "than": { "x": 62, "y": 60, "w": 34, "r": 0 }, "tay": { "x": 88, "y": 70, "w": 18, "r": 8 }, "chan": [{ "x": 45, "y": 94, "w": 16, "r": 0 }, { "x": 70, "y": 95, "w": 16, "r": 0 }] },
    "may-adult": { "dau": { "x": 73, "y": 8, "w": 26, "r": 4 }, "co": { "x": 72, "y": 36, "w": 26, "r": 0 }, "than": { "x": 64, "y": 60, "w": 34, "r": 0 }, "tay": { "x": 88, "y": 70, "w": 18, "r": 8 }, "chan": [{ "x": 35, "y": 95, "w": 18, "r": 0 }, { "x": 78, "y": 95, "w": 18, "r": 0 }] },
    "may-legend": { "dau": { "x": 70, "y": 10, "w": 24, "r": 4 }, "co": { "x": 66, "y": 38, "w": 26, "r": 0 }, "than": { "x": 62, "y": 63, "w": 30, "r": 0 }, "tay": { "x": 88, "y": 72, "w": 16, "r": 8 }, "chan": [{ "x": 38, "y": 95, "w": 16, "r": 0 }, { "x": 70, "y": 95, "w": 16, "r": 0 }] },
    "may-eating": { "dau": { "x": 55, "y": 10, "w": 28, "r": 0 }, "co": { "x": 62, "y": 40, "w": 28, "r": 0 }, "than": { "x": 62, "y": 64, "w": 30, "r": 0 }, "tay": { "x": 86, "y": 72, "w": 16, "r": -8 }, "chan": [{ "x": 40, "y": 92, "w": 16, "r": 0 }, { "x": 90, "y": 85, "w": 16, "r": 10 }] },
    "may-cheer": { "dau": { "x": 58, "y": 8, "w": 26, "r": 0 }, "co": { "x": 57, "y": 37, "w": 24, "r": 0 }, "than": { "x": 55, "y": 60, "w": 32, "r": 0 }, "tay": { "x": 88, "y": 70, "w": 16, "r": 8 }, "chan": [{ "x": 20, "y": 92, "w": 16, "r": -8 }, { "x": 82, "y": 85, "w": 16, "r": 10 }] },
    "may-think": { "dau": { "x": 55, "y": 12, "w": 30, "r": 0 }, "co": { "x": 55, "y": 42, "w": 28, "r": 0 }, "than": { "x": 58, "y": 65, "w": 34, "r": 0 }, "tay": { "x": 87, "y": 51, "w": 18, "r": 8 }, "chan": [{ "x": 35, "y": 95, "w": 18, "r": 0 }, { "x": 78, "y": 95, "w": 18, "r": 0 }] }
  };
  /* NEO-KET-THUC */

  /** Điểm gốc trong món đồ (tỉ lệ bề ngang, bề cao) được đặt trùng điểm neo: mũ đặt đáy lên đầu, khăn treo từ trên cổ. */
  const GOC = { dau: [0.5, 0.88], co: [0.5, 0.32], than: [0.5, 0.5], tay: [0.5, 0.5], chan: [0.5, 0.6] };

  const theoMaDs = {};
  const theoTenDs = {};
  DS.forEach(function (d) { theoMaDs[d.ma] = d; theoTenDs[d.ten] = d; });

  function theoMa(ma) { return theoMaDs[ma] || null; }
  function theoTen(ten) { return theoTenDs[ten] || null; }

  /** Các mã món bé đã có, theo thứ tự danh mục. */
  function cuaBe(p) {
    const co = {};
    ((p && p.phu_kien) || []).forEach(function (t) { const d = theoTen(t) || theoMa(t); if (d) co[d.ma] = true; });
    return DS.filter(function (d) { return co[d.ma]; }).map(function (d) { return d.ma; });
  }
  function coMon(p, ma) { return cuaBe(p).indexOf(ma) >= 0; }
  /** Món đang mặc (chỉ khi bé có món đó; hồ sơ lạ thì coi như không mặc gì). */
  function dangMac(p) {
    const ma = p && p.dang_mac;
    return ma && theoMa(ma) && coMon(p, ma) ? ma : null;
  }
  /** Món bé đã có mà chưa mở thẻ xem lần nào (chấm "Mới!"). */
  function chuaXem(p) {
    const da = (p && p.phu_kien_da_xem) || {};
    return cuaBe(p).filter(function (ma) { return !da[ma]; });
  }

  /** Món đồ có phép ở màn này không: vùng của món, cả hai đấu trường cho bộ giáp, mọi vùng cho vương miện. */
  function coPhep(ma, man) {
    const d = theoMa(ma);
    if (!d || !man) return false;
    if (d.moi_vung) return true;
    if (d.tuyet_chieu) return !!man.dau_truong;
    return man.vung === d.vung;
  }

  /** Câu nói về phép của món đồ (bé nghe khi mở thẻ). */
  function phepCua(ma, tenKL) {
    const d = theoMa(ma);
    if (!d) return '';
    const ten = tenKL || 'Khủng long';
    if (d.tuyet_chieu) return 'Mặc vào Đấu Trường: tuyệt chiêu của ' + ten + ' thành ' + d.tuyet_chieu + ', mỗi đòn trúng thì giáp sáng lên.';
    if (d.moi_vung) return 'Mặc ở vùng nào cũng được: mỗi câu con làm đúng, ' + d.lam + '.';
    return 'Mặc khi chơi ở ' + tenVung(d.vung) + ': mỗi câu con làm đúng, ' + d.lam + '.';
  }
  function tenVung(so) {
    const v = window.Dao && window.Dao.vung ? window.Dao.vung(so) : null;
    return v ? v.ten : 'vùng ' + so;
  }

  /** 'rex-kid' ... (bỏ đường dẫn và đuôi) */
  function maTuHinh(ten) { return String(ten || '').replace(/^.*\//, '').replace(/\.[a-z0-9]+(\?.*)?$/i, ''); }
  function coNeo(tenHinh) { return !!NEO[maTuHinh(tenHinh)]; }

  /**
   * Chỗ đặt món đồ trên một hình rộng × cao (điểm ảnh): mảng { x, y, w, h, r, lat } (x, y là góc trên trái trước khi xoay,
   * tính theo hình khủng long; lat: lật gương). tiLe = cao / rộng của hình món đồ.
   */
  function viTri(tenHinh, ma, rong, cao, tiLe) {
    const n = NEO[maTuHinh(tenHinh)];
    const d = theoMa(ma);
    if (!n || !d) return [];
    const ds = Array.isArray(n[d.cho]) ? n[d.cho] : [n[d.cho]];
    const g = GOC[d.cho];
    return ds.filter(Boolean).map(function (a, i) {
      const w = rong * a.w / 100 * (d.s || 1);
      const h = w * (tiLe || 1);
      const cx = rong * a.x / 100, cy = cao * a.y / 100 + (d.dy || 0) * h;
      return { x: cx - w * g[0], y: cy - h * g[1], w: w, h: h, cx: cx, cy: cy, r: a.r || 0, lat: d.cho === 'chan' && i === 0 };
    });
  }

  /* ---------------- Ghép hình (trình duyệt) ---------------- */

  const boNho = {};
  function taiAnh(url) {
    return new Promise(function (ok, loi) {
      const im = new Image();
      im.decoding = 'async';
      im.onload = function () { ok(im); };
      im.onerror = function () { loi(new Error('Không tải được ' + url)); };
      im.src = url;
    });
  }

  /** Lề cố định của khung khi ghép "đều" (phần bề ngang, bề cao của hình): mặc mũ hay không, khủng long vẫn cùng cỡ. */
  const LE_DEU = { trai: 0.16, phai: 0.16, tren: 0.2, duoi: 0.03 };

  /**
   * Hình khủng long đang mặc món `ma`: vẽ lên canvas rồi trả URL (blob, hay data khi không có toBlob); lỗi hay không có
   * điểm neo thì trả URL hình gốc. Khung được nới ra khi món đồ vượt mép (mũ cao hơn đầu), khủng long không bị cắt.
   * deu: khung có lề cố định LE_DEU (Hang Khủng Long: thay đồ thì khủng long không to nhỏ); ma null thì chỉ thêm lề.
   */
  function anhMac(tenHinh, ma, duongDan, deu) {
    const goc = duongDan || ('assets/img/' + maTuHinh(tenHinh) + '.webp');
    const d = theoMa(ma);
    if ((!d && !deu) || !coNeo(tenHinh) || typeof document === 'undefined' || !document.createElement) return Promise.resolve(goc);
    const khoa = maTuHinh(tenHinh) + '|' + (ma || '') + (deu ? '|deu' : '');
    if (boNho[khoa]) return boNho[khoa];
    const thuMuc = goc.replace(/[^/]*$/, '');
    boNho[khoa] = Promise.all([taiAnh(goc), d ? taiAnh(thuMuc + d.anh + '.webp') : null]).then(function (r) {
      const kl = r[0], mon = r[1];
      const W = kl.naturalWidth, H = kl.naturalHeight;
      const ds = mon ? viTri(tenHinh, ma, W, H, mon.naturalHeight / mon.naturalWidth) : [];
      let x0 = deu ? -W * LE_DEU.trai : 0, y0 = deu ? -H * LE_DEU.tren : 0, x1 = deu ? W * (1 + LE_DEU.phai) : W, y1 = deu ? H * (1 + LE_DEU.duoi) : H;
      ds.forEach(function (v) {
        const m = Math.max(v.w, v.h) * 0.2; // chừa chỗ cho góc xoay
        x0 = Math.min(x0, v.x - m); y0 = Math.min(y0, v.y - m); x1 = Math.max(x1, v.x + v.w + m); y1 = Math.max(y1, v.y + v.h + m);
      });
      x0 = Math.floor(x0); y0 = Math.floor(y0);
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(x1 - x0); cv.height = Math.ceil(y1 - y0);
      const c = cv.getContext('2d');
      c.drawImage(kl, -x0, -y0);
      ds.forEach(function (v) {
        c.save();
        c.translate(v.cx - x0, v.cy - y0);
        c.rotate(v.r * Math.PI / 180);
        if (v.lat) c.scale(-1, 1);
        c.drawImage(mon, v.x - v.cx, v.y - v.cy, v.w, v.h);
        c.restore();
      });
      return new Promise(function (ok) {
        if (cv.toBlob && window.URL && URL.createObjectURL) cv.toBlob(function (b) { ok(b ? URL.createObjectURL(b) : cv.toDataURL('image/png')); }, 'image/png');
        else ok(cv.toDataURL('image/png'));
      });
    }).catch(function () { delete boNho[khoa]; return goc; });
    return boNho[khoa];
  }

  /* ---------------- Phép khi bé làm đúng ---------------- */

  let lop = null;
  let hengio = null;
  function lopPhep() {
    if (lop && document.body.contains(lop)) return lop;
    lop = document.createElement('div');
    lop.className = 'pk-phep hidden';
    lop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(lop);
    return lop;
  }
  /**
   * Món đồ bật lên ở góc màn hình kèm hạt màu và tiếng động riêng (không chặn chạm, không che đề).
   * tuyChon: { anh(ten) → url, tieng(ten) }
   */
  function phep(ma, tuyChon) {
    const d = theoMa(ma);
    if (!d || typeof document === 'undefined' || !document.body) return;
    const o = tuyChon || {};
    const el = lopPhep();
    const giam = (function () { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
    let hat = '';
    if (!giam) {
      for (let i = 0; i < 10; i++) {
        const g = (i / 10) * 360 + (i % 2 ? 12 : -8);
        hat += '<i style="--g:' + g + 'deg;--m:' + d.hat[i % d.hat.length] + ';--t:' + (i % 3) * 0.05 + 's"></i>';
      }
    }
    el.className = 'pk-phep hu-' + d.hieu_ung;
    el.innerHTML = '<span class="pk-phep-hat">' + hat + '</span><img alt="" src="' + (o.anh ? o.anh(d.anh) : 'assets/img/' + d.anh + '.webp') + '">';
    // Chạy lại hoạt cảnh khi hai câu đúng liền nhau
    void el.offsetWidth;
    el.classList.add('chay');
    if (o.tieng) o.tieng(d.tieng);
    clearTimeout(hengio);
    hengio = setTimeout(function () { el.className = 'pk-phep hidden'; el.innerHTML = ''; }, 1500);
  }

  window.PhuKien = {
    DS: DS, CHO: CHO, TEN_CHO: TEN_CHO, NEO: NEO,
    theoMa: theoMa, theoTen: theoTen, cuaBe: cuaBe, coMon: coMon, dangMac: dangMac, chuaXem: chuaXem,
    coPhep: coPhep, phepCua: phepCua, tenVung: tenVung,
    maTuHinh: maTuHinh, coNeo: coNeo, viTri: viTri, anhMac: anhMac, phep: phep
  };
})();
