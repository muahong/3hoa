/* ============================================================
   ho-so.js – Hồ sơ bé trên máy (không tài khoản, không server)
   - Tên (1 đến 16 ký tự), tuổi (5 đến 11), lớp gợi ý từ tuổi và năm học rồi xác nhận.
   - Phong cách khủng long: dung_manh (Rex) hoặc de_thuong (Mây).
   - Lưu ở kho ho_so của IndexedDB (qua NhatKy.kho). Bé đang chơi nhớ ở localStorage.
   API: window.HoSo
   ============================================================ */
(function () {
  'use strict';

  const TEN_TOI_DA = 16;
  const TOI_DA_BE = 8;
  const KHOA_BE = 'dkl-be-dang-choi-v1';
  const HOI_LAI_SAU_MS = 12 * 3600 * 1000;

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

  /** Tên gợi ý: tên các bé trong hồ sơ chung của 3hoa.com (chỉ đọc). */
  function tenGoiY() {
    try {
      const s = window.localStorage.getItem('3hoa-players-v1');
      const d = s ? JSON.parse(s) : null;
      if (!d || !Array.isArray(d.players)) return [];
      const ra = [];
      d.players.forEach(function (p) {
        const t = sachTen(p && p.name);
        if (t && t !== 'Bé' && ra.indexOf(t) < 0) ra.push(t);
      });
      return ra.slice(0, 6);
    } catch (e) { return []; }
  }

  window.HoSo = {
    TEN_TOI_DA: TEN_TOI_DA,
    TOI_DA_BE: TOI_DA_BE,
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
    tenGoiY: tenGoiY
  };
})();
