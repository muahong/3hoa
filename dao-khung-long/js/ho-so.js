/* ============================================================
   ho-so.js – Hồ sơ bé trên máy (không tài khoản, không server)
   - Tên (1 đến 16 ký tự), tuổi (5 đến 11), lớp gợi ý từ tuổi và năm học rồi xác nhận.
   - Phong cách khủng long: dung_manh (Rex) hoặc de_thuong (Mây).
   - Lưu ở kho ho_so của IndexedDB (qua NhatKy.kho). Bé đang chơi nhớ ở localStorage.
   - Tên gợi ý đọc từ hồ sơ chung của trang chủ, bỏ tên của bé đã bị xóa khỏi đảo (anGoiY, khóa 'dkl-an-goi-y').
   - Thời gian chơi: mặc định không giới hạn. Chỉ khi phụ huynh đặt gioi_han_phut thì mới có giới hạn mỗi ngày;
     them_hom_nay ({ ngay, phut } hoặc { ngay, khong_gioi_han: true }) là giờ cho thêm riêng hôm đó, qua ngày tự hết.
   API: window.HoSo
   ============================================================ */
(function () {
  'use strict';

  const TEN_TOI_DA = 16;
  const TOI_DA_BE = 8;
  const KHOA_BE = 'dkl-be-dang-choi-v1';
  const KHOA_AN_GOI_Y = 'dkl-an-goi-y'; // dấu (băm) tên của các bé bị xóa khỏi đảo: không gợi ý lại
  const HOI_LAI_SAU_MS = 12 * 3600 * 1000;
  /** Phụ huynh chọn số phút mỗi ngày trong khoảng này, bước 5 phút (null là không giới hạn, mặc định). */
  const GIOI_HAN = { toi_thieu: 5, toi_da: 240, buoc: 5 };

  /** Làm tròn số phút phụ huynh chọn về bước 5 phút trong khoảng cho phép; không phải số dương thì là không giới hạn (null). */
  function sachGioiHan(v) {
    const n = Number(v);
    if (v == null || v === '' || !isFinite(n) || n <= 0) return null;
    return Math.max(GIOI_HAN.toi_thieu, Math.min(GIOI_HAN.toi_da, Math.round(n / GIOI_HAN.buoc) * GIOI_HAN.buoc));
  }

  /**
   * Số phút bé được chơi trong ngày `ngay` ('YYYY-MM-DD'), hoặc null nếu không giới hạn.
   * Không giới hạn khi phụ huynh chưa đặt gioi_han_phut (mặc định) hoặc đã cho "không giới hạn hôm nay".
   */
  function gioiHanHomNay(p, ngay) {
    const goc = p && sachGioiHan(p.gioi_han_phut);
    if (!goc) return null;
    const them = p.them_hom_nay && p.them_hom_nay.ngay === ngay ? p.them_hom_nay : null;
    if (them && them.khong_gioi_han) return null;
    return goc + (them && them.phut > 0 ? them.phut : 0);
  }

  /** Số ngày giữ thời gian trong Hang Khủng Long (ho_so.gio_hang = { 'YYYY-MM-DD': giây }). */
  const GIU_GIO_HANG_NGAY = 35;
  /** Số giây bé ở trong Hang Khủng Long ngày `ngay` (tính vào giờ chơi hôm nay). */
  function giayHang(p, ngay) {
    const g = p && p.gio_hang && p.gio_hang[ngay];
    return typeof g === 'number' && isFinite(g) && g > 0 ? g : 0;
  }
  /** Cộng thời gian một lần vào hang; chỉ giữ GIU_GIO_HANG_NGAY ngày gần nhất. */
  function themGiayHang(p, ngay, giay) {
    if (!p || !ngay) return;
    const g = Math.max(0, Math.round(Number(giay) || 0));
    const bang = p.gio_hang && typeof p.gio_hang === 'object' ? p.gio_hang : {};
    if (g) bang[ngay] = giayHang(p, ngay) + g;
    const ngayDs = Object.keys(bang).sort();
    ngayDs.slice(0, Math.max(0, ngayDs.length - GIU_GIO_HANG_NGAY)).forEach(function (k) { delete bang[k]; });
    p.gio_hang = bang;
  }

  function sachTen(s) {
    s = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim();
    if (s.length > TEN_TOI_DA) s = s.slice(0, TEN_TOI_DA).trim();
    return s;
  }

  function namHocBatDau(now) {
    const d = now instanceof Date ? now : new Date(now);
    return d.getMonth() + 1 >= 9 ? d.getFullYear() : d.getFullYear() - 1;
  }

  /** Gợi ý lớp từ tuổi (spec 06 mục 5.1): năm học bắt đầu tháng 9, kẹp trong 1 đến 5. */
  function goiYLop(tuoi, now) {
    const d = now instanceof Date ? now : new Date(now == null ? Date.now() : now);
    const nam = namHocBatDau(d);
    const namSinh = d.getFullYear() - tuoi;
    return { lop: Math.max(1, Math.min(5, nam - namSinh - 5)), nam_hoc_bat_dau: nam, nam_sinh_uoc_tinh: namSinh };
  }

  function kho() { return window.NhatKy.kho; }

  function taiDanhSach() {
    return kho().tatCa('ho_so').then(function (ds) {
      return ds.filter(function (p) { return p && p.id; }).sort(function (a, b) { return a.tao_luc < b.tao_luc ? -1 : 1; });
    });
  }

  function lay(id) { return kho().lay('ho_so', id); }

  function luu(p) {
    p.cap_nhat_luc = window.NhatKy.isoDiaPhuong(Date.now());
    return kho().dat('ho_so', p).then(function () { return p; });
  }

  /** o: { ten, tuoi, lop, lop_nguon, phong_cach } */
  function taoMoi(o, now) {
    const ten = sachTen(o.ten);
    const tuoi = Math.round(Number(o.tuoi));
    if (!ten) return Promise.reject(new Error('Thiếu tên'));
    if (!(tuoi >= 5 && tuoi <= 11)) return Promise.reject(new Error('Tuổi phải từ 5 đến 11'));
    const d = now instanceof Date ? now : new Date(now == null ? Date.now() : now);
    const g = goiYLop(tuoi, d);
    const lop = Math.max(1, Math.min(5, Math.round(Number(o.lop) || g.lop)));
    const phongCach = o.phong_cach === 'de_thuong' ? 'de_thuong' : 'dung_manh';
    const id = 'be_' + window.NhatKy.ulid(d.getTime());
    const p = {
      id: id,
      ten: ten,
      tuoi_khi_nhap: tuoi,
      ngay_nhap_tuoi: window.NhatKy.ngayDiaPhuong(d.getTime()),
      nam_sinh_uoc_tinh: g.nam_sinh_uoc_tinh,
      lop: lop,
      lop_nguon: o.lop_nguon || (lop === g.lop ? 'goi_y_tu_tuoi_da_xac_nhan' : 'tu_chon'),
      nam_hoc_cua_lop: g.nam_hoc_bat_dau,
      bai_dang_hoc: window.Dao.uocLuongBai(d),
      bai_nguon: 'uoc_luong_theo_ngay',
      phong_cach: phongCach,
      khung_long: { ten: window.Dao.HINH[phongCach].ten, loai: phongCach === 'dung_manh' ? 'rex' : 'may', muc: 'trung', qua_mong: 0 },
      van_xong: 0,
      co_cau_dung: false,
      ky_luc: {},
      nhiem_vu: null,
      trung_vung: {},
      phu_kien: [],
      dang_mac: null,
      tao_luc: window.NhatKy.isoDiaPhuong(d.getTime())
    };
    return taiDanhSach().then(function (ds) {
      if (ds.length >= TOI_DA_BE) throw new Error('Tối đa ' + TOI_DA_BE + ' bạn');
      return luu(p);
    });
  }

  /** Tuổi hiện tại: tuổi đã nhập cộng số năm tròn kể từ ngày nhập (không biết ngày sinh nên không đoán sớm hơn). */
  function tuoiHienTai(p, now) {
    const d = now instanceof Date ? now : new Date(now == null ? Date.now() : now);
    const n = String(p.ngay_nhap_tuoi || '').split('-').map(Number);
    if (n.length !== 3 || !n[0]) return p.tuoi_khi_nhap || 0;
    let nam = d.getFullYear() - n[0];
    if (d.getMonth() + 1 < n[1] || (d.getMonth() + 1 === n[1] && d.getDate() < n[2])) nam--;
    return (p.tuoi_khi_nhap || 0) + Math.max(0, nam);
  }

  /** Đã sang năm học mới so với lúc xác nhận lớp chưa (hỏi lại mỗi tháng 9). */
  function canHoiLenLop(p, now) {
    return !!(p && p.nam_hoc_cua_lop && namHocBatDau(now == null ? new Date() : now) > p.nam_hoc_cua_lop);
  }

  function beDangChoi() {
    try {
      const s = window.localStorage.getItem(KHOA_BE);
      const o = s ? JSON.parse(s) : null;
      return o && typeof o.id === 'string' ? o : null;
    } catch (e) { return null; }
  }
  function datBeDangChoi(id) {
    try {
      if (id) window.localStorage.setItem(KHOA_BE, JSON.stringify({ id: id, luc: Date.now() }));
      else window.localStorage.removeItem(KHOA_BE);
    } catch (e) { /* bỏ qua */ }
  }
  /** Mở lại sau 12 giờ thì hỏi lại "Con là ai?" (máy dùng chung). */
  function canHoiLaiBe(now) {
    const o = beDangChoi();
    return !o || !(o.luc > 0) || (now == null ? Date.now() : now) - o.luc > HOI_LAI_SAU_MS;
  }

  /**
   * Dấu của một tên: băm FNV-1a 32 bit của tên đã chuẩn hóa (không phân biệt hoa thường, dạng Unicode, khoảng trắng thừa).
   * Danh sách ẩn chỉ giữ dấu, không giữ tên của bé đã bị xóa.
   */
  function dauTen(t) {
    const x = 'dkl-ten|' + sachTen(t).normalize('NFC').toLowerCase();
    let h = 2166136261;
    for (let i = 0; i < x.length; i++) { h ^= x.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }
  function docAnGoiY() {
    try {
      const d = JSON.parse(window.localStorage.getItem(KHOA_AN_GOI_Y));
      return Array.isArray(d) ? d.filter(function (x) { return typeof x === 'string' && /^[0-9a-f]{8}$/.test(x); }) : [];
    } catch (e) { return []; }
  }
  /**
   * Không gợi ý các tên này nữa (bé đã bị xóa khỏi đảo). Chỉ ghi dấu của tên vào 'dkl-an-goi-y' (tối đa 40),
   * không đụng hồ sơ chung của trang chủ.
   */
  function anGoiY(ten) {
    const ds = docAnGoiY();
    (Array.isArray(ten) ? ten : [ten]).forEach(function (t) { if (!sachTen(t)) return; const d = dauTen(t); if (ds.indexOf(d) < 0) ds.push(d); });
    try { window.localStorage.setItem(KHOA_AN_GOI_Y, JSON.stringify(ds.slice(-40))); } catch (e) { /* bỏ qua */ }
  }

  /** Tên gợi ý: tên các bé trong hồ sơ chung của 3hoa.com (chỉ đọc), trừ tên của bé đã bị xóa khỏi đảo. */
  function tenGoiY() {
    try {
      const s = window.localStorage.getItem('3hoa-players-v1');
      const d = s ? JSON.parse(s) : null;
      if (!d || !Array.isArray(d.players)) return [];
      const an = docAnGoiY();
      const ra = [];
      d.players.forEach(function (p) {
        const t = sachTen(p && p.name);
        if (t && t !== 'Bé' && ra.indexOf(t) < 0 && an.indexOf(dauTen(t)) < 0) ra.push(t);
      });
      return ra.slice(0, 6);
    } catch (e) { return []; }
  }

  window.HoSo = {
    TEN_TOI_DA: TEN_TOI_DA,
    TOI_DA_BE: TOI_DA_BE,
    GIOI_HAN: GIOI_HAN,
    sachGioiHan: sachGioiHan,
    gioiHanHomNay: gioiHanHomNay,
    giayHang: giayHang,
    themGiayHang: themGiayHang,
    sachTen: sachTen,
    namHocBatDau: namHocBatDau,
    goiYLop: goiYLop,
    taiDanhSach: taiDanhSach,
    lay: lay,
    luu: luu,
    taoMoi: taoMoi,
    tuoiHienTai: tuoiHienTai,
    canHoiLenLop: canHoiLenLop,
    beDangChoi: beDangChoi,
    datBeDangChoi: datBeDangChoi,
    canHoiLaiBe: canHoiLaiBe,
    tenGoiY: tenGoiY,
    anGoiY: anGoiY,
    KHOA_AN_GOI_Y: KHOA_AN_GOI_Y
  };
})();
