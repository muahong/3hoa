/* ============================================================
   bao-cao.js – Mọi phép tính của Góc phụ huynh (hàm thuần: không đụng DOM, không đụng kho, không ghi nhật ký)
   Đọc ba lớp tóm tắt (tóm tắt câu, tóm tắt ván, hồ sơ học tập); riêng Xem lại một câu và gói xuất đọc thêm
   nhật ký gốc do nơi gọi truyền vào. Báo cáo không lưu con số nào: mở lại là tính lại.

   Định nghĩa dùng chung (giống HocTap.mucKyNang để các con số khớp với mức thành thạo):
   - Câu đã làm: câu có kết quả khác 'bo_qua' (câu dừng giữa chừng vì thoát ván hay tắt app thì không tính).
   - Câu tự làm: câu đã làm mà bé không xin gợi ý nào (goi_y_cap = 0).
   - Tự làm đúng: câu tự làm có kết quả 'dung_ngay' (đúng ở lần chốt đầu tiên).
   - Tỉ lệ tự làm đúng = số câu tự làm đúng / số câu tự làm; null khi chưa có câu tự làm.
     Câu đúng ở lần thử 2 và câu hết giờ vẫn là câu tự làm nhưng không đúng; câu nhờ gợi ý không vào mẫu số.
   - Câu sai (bộ lọc "Chỉ câu sai"): có ít nhất một lần chốt sai, hoặc hết giờ, hoặc kết quả 'sai'.
   - Tuần: thứ Hai đến Chủ nhật theo giờ máy (trường ngay của tóm tắt).
   - Ước lượng token của gói xuất: số byte UTF-8 chia 3, làm tròn lên. JSON tiếng Việt có dấu thường được
     3 đến 4 byte mỗi token, nên chia 3 là ước lượng dư (an toàn cho giới hạn 30 000 token).
   API: window.BaoCao
   ============================================================ */
(function () {
  'use strict';

  function NH() { return window.NganHang; }
  function HT() { return window.HocTap; }
  function DAO() { return window.Dao; }

  const MUC = ['chua_hoc', 'lam_quen', 'dang_luyen', 'da_thuoc', 'vung_chac'];
  const TEN_MUC = { chua_hoc: 'Chưa học', lam_quen: 'Làm quen', dang_luyen: 'Đang luyện', da_thuoc: 'Đã thuộc', vung_chac: 'Vững chắc' };
  const THU = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const TEN_CAM_XUC = { vui: 'Vui', binh_thuong: 'Bình thường', chan: 'Chán' };
  const TOI_DA_TOKEN = 30000;
  /** Mã nội dung lớp 1 dùng làm tiên quyết (03a, bảng tiên quyết lớp 1). */
  const NOI_DUNG_LOP_1 = {
    'L1.1': 'Lớp 1: đếm, đọc, viết số đến 10; so sánh trong phạm vi 10',
    'L1.2': 'Lớp 1: cộng, trừ trong phạm vi 10; các cặp số có tổng bằng 10',
    'L1.3': 'Lớp 1: số đến 100, chục và đơn vị, tia số',
    'L1.4': 'Lớp 1: cộng, trừ không nhớ trong phạm vi 20',
    'L1.5': 'Lớp 1: cộng, trừ không nhớ số tròn chục, số có hai chữ số với số có một chữ số',
    'L1.6': 'Lớp 1: so sánh, xếp thứ tự số đến 100',
    'L1.7': 'Lớp 1: xem giờ đúng'
  };

  /* ---------------- Ngày, số, chữ ---------------- */

  function congNgay(ngay, n) { return HT().congNgay(ngay, n); }
  function thuCua(ngay) { return ((HT().soNgay(ngay) + 4) % 7 + 7) % 7; } // 1970-01-01 là thứ Năm; 0 = Chủ nhật
  /** Thứ Hai của tuần chứa ngày đó. */
  function dauTuan(ngay) { return congNgay(ngay, -((thuCua(ngay) + 6) % 7)); }
  function ngayNgan(ngay) { const p = String(ngay).split('-'); return (+p[2]) + '/' + (+p[1]); }
  /** "Thứ Hai 12/10" */
  function thuNgay(ngay) { return THU[thuCua(ngay)] + ' ' + ngayNgan(ngay); }
  /** "22/9 đến 28/9" */
  function khoangTuan(tu) { return ngayNgan(tu) + ' đến ' + ngayNgan(congNgay(tu, 6)); }
  /** Số một chữ số thập phân kiểu Việt Nam: 6,5; 9 */
  function so1(x) { return String(Math.round(x * 10) / 10).replace('.', ','); }
  function giayChu(g) { return g == null ? '' : so1(g) + ' giây'; }
  function phanTram(x) { return x == null ? '' : Math.round(x * 100) + '%'; }
  function gioPhut(luc) { return String(luc || '').slice(11, 16); }
  function phutChu(giay) {
    if (!giay) return '0 phút';
    if (giay < 30) return 'dưới 1 phút';
    return Math.round(giay / 60) + ' phút';
  }
  function hoaDau(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function thuongDau(s) { s = String(s || ''); return s.charAt(0).toLowerCase() + s.slice(1); }
  function theoLuc(a, b) { return a.luc < b.luc ? -1 : a.luc > b.luc ? 1 : (a.cau || a.van || '') < (b.cau || b.van || '') ? -1 : 1; }
  function theoId(a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; }
  function motLan(ds) { const ra = []; ds.forEach(function (x) { if (ra.indexOf(x) < 0) ra.push(x); }); return ra; }
  function noiVa(ds) { return ds.length < 2 ? ds.join('') : ds.slice(0, -1).join(', ') + ' và ' + ds[ds.length - 1]; }

  /* ---------------- Định nghĩa ---------------- */

  function daLam(c) { return c.ket_qua !== 'bo_qua'; }
  function tuLam(c) { return daLam(c) && !c.goi_y_cap; }
  function tuLamDung(c) { return tuLam(c) && c.ket_qua === 'dung_ngay'; }
  /** { tu_lam, dung, ti_le } của một danh sách tóm tắt câu (xem định nghĩa ở đầu tệp). */
  function tiLeTuLam(ds) {
    let t = 0, d = 0;
    ds.forEach(function (c) { if (tuLam(c)) { t++; if (c.ket_qua === 'dung_ngay') d++; } });
    return { tu_lam: t, dung: d, ti_le: t ? Math.round(d / t * 100) / 100 : null };
  }
  function saiCua(c) {
    if (c.tra_loi_sai) return c.tra_loi_sai;
    return (c.cac_tra_loi || []).filter(function (v) { return String(v) !== String(c.dap_an); });
  }
  function laCauSai(c) {
    return c.ket_qua === 'sai' || c.ket_qua === 'het_gio' || saiCua(c).length > 0 || (c.loi && c.loi.length > 0);
  }
  function laKetQuaSai(c) { return c.ket_qua === 'sai' || c.ket_qua === 'het_gio'; }

  /* ---------------- Tên hiển thị ---------------- */

  let bangTenKy = null;
  /** Tên ngắn của kỹ năng: tên màn luyện chính (ngắn, như bé thấy trên đảo), không có thì tên trong ngân hàng. */
  function tenKyNang(kn) {
    if (!bangTenKy) {
      bangTenKy = {};
      ((DAO() && DAO().VUNG) || []).forEach(function (v) {
        v.man.forEach(function (m) { if (m.ky_nang_chinh && !bangTenKy[m.ky_nang_chinh]) bangTenKy[m.ky_nang_chinh] = m.ten; });
      });
    }
    if (bangTenKy[kn]) return bangTenKy[kn];
    const k = NH().KY_NANG[kn];
    return k ? k.ten : String(kn || '');
  }
  function tenNoiDung(ma) { return NH().NOI_DUNG[ma] || NOI_DUNG_LOP_1[ma] || String(ma || ''); }
  function loiCua(ma) { return NH().LOI[ma] || null; }
  /** "Quên nhớ 1", "Nhầm ô bên cạnh" (nhãn chip). */
  function tenLoi(ma) {
    if (ma === 'khac') return 'Lỗi khác';
    const l = loiCua(ma);
    if (!l) return String(ma);
    return hoaDau(String(l.ngan || l.be || ma).replace(/^Con hay /, '').replace(/^Con /, ''));
  }
  /** "Hay quên nhớ 1" (câu mở đầu thẻ Cần giúp). */
  function hayLoi(ma) {
    if (!ma || ma === 'khac') return 'Còn sai';
    const l = loiCua(ma);
    if (!l) return String(ma);
    return hoaDau(String(l.ngan || l.be || ma).replace(/^Con /, ''));
  }
  function moTaLoi(ma) { const l = loiCua(ma); return l ? l.mo_ta : String(ma); }
  function tenGame(g) { return HT().tenGame(g); }
  function tenManNgan(manId) {
    const m = DAO() && DAO().man(manId);
    if (!m) return manId || '';
    if (m.dau_truong || m.cup) return m.ten;
    return 'vùng ' + m.vung + ' màn ' + m.so;
  }
  function tenManDayDu(manId) { const m = DAO() && DAO().man(manId); return m ? DAO().tenManDayDu(m) : (manId || ''); }

  /** Chữ hiện một giá trị bé chọn (theo loại câu: "8 giờ 15 phút", "2 × 3"...). */
  function hienGT(ct, v) {
    if (v == null || v === '') return '';
    try { const s = NH().hienGiaTriCau(ct || {}, v); return s == null || s === '' ? String(v) : String(s); } catch (e) { return String(v); }
  }
  /** Đề ngắn gọn cho một dòng: "36 + 27", "Bài toán 36 − 27", "Số liền sau của 39 là ?" */
  function deNgan(c) {
    const ct = c.cau_truc || {};
    if (ct.loai === 'loi_van' && ct.so && ct.phep) {
      try { return 'Bài toán ' + NH().hienGiaTri(NH().bieuThuc(ct)); } catch (e) { /* bỏ qua */ }
    }
    let s = String(c.de || c.ma_cau || '').replace(/\s*=\s*\?\s*$/, '').trim();
    if (s.length > 70) s = s.slice(0, 68).trim() + '…';
    return s;
  }
  function laGiaTriSai(c, v) { return saiCua(c).some(function (x) { return String(x) === String(v); }); }
  /** "con ra 34", "con chọn 36 − 27", "con chưa kịp chọn" */
  function conRa(c) {
    if (c.buoc1 && !c.buoc1.dung) return 'con chọn phép ' + hienGT(c.cau_truc, c.buoc1.gia_tri);
    const sai = saiCua(c);
    if (!sai.length) return c.ket_qua === 'het_gio' ? 'con chưa kịp chọn' : '';
    return (typeof sai[0] === 'number' ? 'con ra ' : 'con chọn ') + hienGT(c.cau_truc, sai[0]);
  }
  function dongTu(dang) {
    return { nhap_so: 'gõ', keo_tha: 'xếp', sap_xep: 'xếp', thao_tac_hinh: 'làm', ghep_doi: 'ghép' }[dang] || 'chọn';
  }

  /* ---------------- Hồ sơ học tập tại một ngày ---------------- */

  /**
   * Hồ sơ học tập tính tới một ngày (mức thành thạo của tuần đang xem). Dùng bản đã lưu nếu cùng ngày,
   * không thì tính lại từ tóm tắt câu và tóm tắt ván (hàm thuần của HocTap, nhanh).
   */
  function hoSoTai(du, ngay) {
    const ht = du.hocTap;
    if (ht && ht.ngay === ngay) return ht;
    const be = (du.hoSo && du.hoSo.id) || (ht && ht.be) || null;
    const cauDs = (du.cauDs || []).filter(function (c) { return c.ngay <= ngay; });
    const vanDs = (du.vanDs || []).filter(function (v) { return v.ngay <= ngay; });
    return HT().hoSoHocTap(be, cauDs, vanDs, ngay);
  }
  function bangKy(hs) { const m = {}; ((hs && hs.ky_nang) || []).forEach(function (k) { m[k.ky_nang] = k; }); return m; }
  function loiChinhCua(k) {
    const ds = (k && k.loi_hay_gap) || [];
    const co = ds.filter(function (x) { return x.ma !== 'khac'; });
    return co.length ? co[0].ma : ds.length ? ds[0].ma : null;
  }

  /* ---------------- 1. Tổng quan tuần ---------------- */

  /**
   * Câu sai thật làm ví dụ cho một kỹ năng Cần giúp: cùng lỗi chính, trong tuần đang xem trước,
   * câu chưa sửa trước, rồi câu gần nhất. Cửa sổ: từ đầu tuần (hoặc 14 ngày trước mốc) tới mốc.
   */
  function viDuCauSai(cauDs, kn, maLoi, tu, moc, daSua) {
    const tu14 = congNgay(moc, -13);
    const bd = tu < tu14 ? tu : tu14;
    const ung = cauDs.filter(function (c) {
      if (c.ky_nang !== kn || c.ngay < bd || c.ngay > moc) return false;
      if (maLoi && (c.loi || []).indexOf(maLoi) < 0) return false;
      return saiCua(c).length > 0 || c.ket_qua === 'het_gio' || (c.buoc1 && !c.buoc1.dung);
    });
    ung.sort(function (a, b) {
      const ta = a.ngay >= tu ? 1 : 0, tb = b.ngay >= tu ? 1 : 0;
      if (ta !== tb) return tb - ta;
      const na = laKetQuaSai(a) && !daSua[a.cau] ? 1 : 0, nb = laKetQuaSai(b) && !daSua[b.cau] ? 1 : 0;
      if (na !== nb) return nb - na;
      return a.luc < b.luc ? 1 : a.luc > b.luc ? -1 : 0;
    });
    return ung[0] || null;
  }

  /** Game con thích nhất: điểm = số ván con tự chọn + số lần chọn Vui (hòa thì nhiều ván tự chọn hơn, rồi nhiều ván hơn). */
  function thichNhat(vanDs) {
    const g = {};
    vanDs.forEach(function (v) {
      if (!v.game) return;
      const x = g[v.game] = g[v.game] || { game: v.game, ten: tenGame(v.game), so_van: 0, tu_chon: 0, vui: 0 };
      x.so_van++;
      if (v.nguon === 'tu_chon') x.tu_chon++;
      if (v.cam_xuc === 'vui') x.vui++;
    });
    const ds = Object.keys(g).map(function (k) { return g[k]; });
    ds.sort(function (a, b) { return (b.tu_chon + b.vui) - (a.tu_chon + a.vui) || b.tu_chon - a.tu_chon || b.so_van - a.so_van || (a.game < b.game ? -1 : 1); });
    return ds[0] || null;
  }

  /**
   * Tổng quan của tuần chứa ngày tu (thứ Hai đến Chủ nhật).
   * du: { hoSo, cauDs, vanDs, hocTap }; homNay: 'YYYY-MM-DD'.
   */
  function tongQuanTuan(du, tu, homNay) {
    tu = dauTuan(tu);
    const den = congNgay(tu, 6);
    const moc = den < homNay ? den : homNay;
    const cauDs = du.cauDs || [], vanDs = du.vanDs || [];
    const trong = function (x) { return x.ngay >= tu && x.ngay <= den; };
    const cauTuan = cauDs.filter(trong);
    const vanTuan = vanDs.filter(trong);
    const giay = vanTuan.reduce(function (s, v) { return s + (v.giay || 0); }, 0);
    const ngayChoi = motLan(vanTuan.map(function (v) { return v.ngay; }).concat(cauTuan.map(function (c) { return c.ngay; }))).sort();
    const tl = tiLeTuLam(cauTuan);
    const hs = hoSoTai(du, moc);
    const daSua = HT().tapDaSua(cauDs);
    const theoKy = {};
    cauTuan.forEach(function (c) { if (c.ky_nang) (theoKy[c.ky_nang] = theoKy[c.ky_nang] || []).push(c); });
    const soCauKy = function (kn) { return (theoKy[kn] || []).filter(daLam).length; };

    const gioi = hs.ky_nang.filter(function (k) { return k.muc === 'da_thuoc' || k.muc === 'vung_chac'; }).map(function (k) {
      return { ky_nang: k.ky_nang, ma: k.ma, ten: tenKyNang(k.ky_nang), muc: k.muc, so_cau_tuan: soCauKy(k.ky_nang) };
    }).sort(function (a, b) { return (b.so_cau_tuan ? 1 : 0) - (a.so_cau_tuan ? 1 : 0) || MUC.indexOf(b.muc) - MUC.indexOf(a.muc); });

    const canGiup = hs.ky_nang.filter(function (k) { return k.can_giup; }).map(function (k) {
      const tuan = tiLeTuLam(theoKy[k.ky_nang] || []);
      const ma = loiChinhCua(k);
      const vd = viDuCauSai(cauDs, k.ky_nang, ma, tu, moc, daSua) || (ma ? viDuCauSai(cauDs, k.ky_nang, null, tu, moc, daSua) : null);
      const loiHay = (k.loi_hay_gap || []).find(function (x) { return x.ma === ma; });
      return {
        ky_nang: k.ky_nang, ma: k.ma, ten: tenKyNang(k.ky_nang), muc: k.muc,
        so_cau_tuan: soCauKy(k.ky_nang), tu_lam_tuan: tuan.tu_lam, ti_le_tuan: tuan.ti_le,
        tu_lam_14: k.tu_lam_14_ngay, ti_le_14: k.tu_lam_dung_14_ngay,
        loi: ma, ten_loi: ma ? tenLoi(ma) : null, lan_loi_14: loiHay ? loiHay.lan : 0,
        vi_du: vd ? {
          cau: vd.cau, van: vd.van, ngay: vd.ngay, de: deNgan(vd), con_ra: conRa(vd),
          chu: hayLoi(ma) + ': ' + deNgan(vd) + ', ' + conRa(vd)
        } : null
      };
    });

    const dangLuyen = Object.keys(theoKy).map(function (kn) { return bangKy(hs)[kn]; }).filter(function (k) {
      return k && (k.muc === 'dang_luyen' || k.muc === 'lam_quen') && !k.can_giup;
    }).map(function (k) {
      const tuan = tiLeTuLam(theoKy[k.ky_nang]);
      return { ky_nang: k.ky_nang, ma: k.ma, ten: tenKyNang(k.ky_nang), muc: k.muc, so_cau_tuan: soCauKy(k.ky_nang), tu_lam_tuan: tuan.tu_lam, ti_le_tuan: tuan.ti_le, ti_le_14: k.tu_lam_dung_14_ngay };
    }).sort(function (a, b) { return b.so_cau_tuan - a.so_cau_tuan || (a.ky_nang < b.ky_nang ? -1 : 1); });

    const xuHuong = [3, 2, 1, 0].map(function (i) {
      const t = congNgay(tu, -7 * i), d = congNgay(t, 6);
      const ds = cauDs.filter(function (c) { return c.ngay >= t && c.ngay <= d; });
      const r = tiLeTuLam(ds);
      return { tu: t, den: d, so_cau: ds.filter(daLam).length, tu_lam: r.tu_lam, dung: r.dung, ti_le: r.ti_le };
    });

    return {
      tu: tu, den: den, moc: moc, la_tuan_nay: homNay >= tu && homNay <= den,
      giay: giay, phut: Math.round(giay / 60),
      so_ngay_choi: ngayChoi.length, ngay_choi: ngayChoi,
      so_van: vanTuan.length,
      so_cau: cauTuan.filter(daLam).length,
      tu_lam: tl.tu_lam, tu_lam_dung: tl.dung, ti_le: tl.ti_le,
      gioi: gioi, dang_luyen: dangLuyen, can_giup: canGiup,
      thich_nhat: thichNhat(vanTuan),
      xu_huong: xuHuong,
      trong: !cauTuan.length && !vanTuan.length,
      chua_choi: !cauDs.length && !vanDs.length
    };
  }

  /* ---------------- 2. Nhật ký chi tiết ---------------- */

  function khopLoc(c, loc) {
    if (!loc || !loc.loai || loc.loai === 'tat_ca') return true;
    if (loc.loai === 'sai') return laCauSai(c);
    if (loc.loai === 'noi_dung') return c.noi_dung === loc.ma;
    if (loc.loai === 'ky_nang') return c.ky_nang === loc.ma;
    if (loc.loai === 'loi') return (c.loi || []).indexOf(loc.ma) >= 0;
    return true;
  }

  /** Một dòng câu trong nhật ký: đề, bé chọn gì, lỗi gì, mấy giây, đã sửa chưa. */
  function dongCau(c, daSua) {
    let tt, nhan;
    if (c.ket_qua === 'sai' || c.ket_qua === 'het_gio') { tt = daSua[c.cau] ? 'da_sua' : 'chua_sua'; nhan = daSua[c.cau] ? 'đã sửa' : 'chưa sửa'; }
    else if (c.ket_qua === 'dung_lan_2') { tt = 'lan_2'; nhan = 'đúng lần 2'; }
    else if (c.ket_qua === 'dung_sau_goi_y') { tt = 'goi_y'; nhan = 'nhờ gợi ý'; }
    else if (c.ket_qua === 'dung_ngay') { tt = c.on_lai_cua ? 'lam_lai' : 'dung'; nhan = c.on_lai_cua ? 'làm lại đúng' : 'đúng ngay'; }
    else { tt = 'bo_do'; nhan = 'bỏ dở'; }
    return {
      cau: c.cau, van: c.van, luc: c.luc, gio: gioPhut(c.luc), ngay: c.ngay,
      de: deNgan(c), noi_dung: c.noi_dung, ky_nang: c.ky_nang, dang: c.dang, dong_tu: dongTu(c.dang),
      tra_loi: (c.cac_tra_loi || []).map(function (v) { return { chu: hienGT(c.cau_truc, v), sai: laGiaTriSai(c, v) }; }),
      het_gio: c.ket_qua === 'het_gio',
      loi: (c.loi || []).map(function (m) { return { ma: m, ten: thuongDau(tenLoi(m)) }; }),
      giay: c.giay, doi_y: c.so_lan_doi_y || 0, goi_y: c.goi_y_cap || 0,
      ket_qua: c.ket_qua, trang_thai: tt, nhan_trang_thai: nhan, sai: laCauSai(c), on_lai: !!c.on_lai_cua
    };
  }

  function tomTatVanChoNhatKy(v, cau, daSua) {
    const m = DAO() && DAO().man(v.man);
    const saiDs = cau.filter(laKetQuaSai);
    return {
      van: v.van, luc: v.luc, gio: gioPhut(v.luc), ngay: v.ngay, game: v.game, ten_game: tenGame(v.game),
      man: v.man, ten_man_ngan: tenManNgan(v.man), ten_man: m ? m.ten : '', nguon: v.nguon,
      so_cau: v.so_cau, giay: v.giay, phut_chu: phutChu(v.giay), cam_xuc: v.cam_xuc, ten_cam_xuc: v.cam_xuc ? TEN_CAM_XUC[v.cam_xuc] : null,
      dung_ngay: v.dung_ngay, dung_sau_goi_y: v.dung_sau_goi_y, dung_lan_2: v.dung_lan_2,
      sai: saiDs.length, sai_da_sua: saiDs.filter(function (c) { return daSua[c.cau]; }).length,
      bo_do: !!v.bo_do, sao: v.sao, mo_ta: v.mo_ta
    };
  }

  /**
   * Nhật ký từ ngày tu tới ngày den (cùng ngày nếu xem một ngày), lọc theo loc = { loai: 'tat_ca'|'sai'|'noi_dung'|'loi'|'ky_nang', ma }.
   * Trả về các ngày (mới nhất trước), mỗi ngày các ván theo giờ, mỗi ván các câu khớp bộ lọc; và các chip lọc có trong khoảng.
   */
  function nhatKy(du, o) {
    const tu = o.tu, den = o.den || o.tu;
    const loc = o.loc || { loai: 'tat_ca' };
    const cauDs = du.cauDs || [];
    const daSua = HT().tapDaSua(cauDs);
    const vanTrong = (du.vanDs || []).filter(function (v) { return v.ngay >= tu && v.ngay <= den; }).sort(theoLuc);
    const tap = {};
    vanTrong.forEach(function (v) { tap[v.van] = []; });
    cauDs.forEach(function (c) { if (tap[c.van]) tap[c.van].push(c); });
    const demNd = {}, demLoi = {};
    let soSai = 0, soCau = 0;
    const ngay = {};
    vanTrong.forEach(function (v) {
      const cau = tap[v.van].sort(theoLuc);
      cau.forEach(function (c) {
        if (!daLam(c) && !laCauSai(c)) return;
        soCau++;
        if (laCauSai(c)) soSai++;
        if (c.noi_dung) demNd[c.noi_dung] = (demNd[c.noi_dung] || 0) + 1;
        (c.loi || []).forEach(function (m) { demLoi[m] = (demLoi[m] || 0) + 1; });
      });
      const n = ngay[v.ngay] = ngay[v.ngay] || { ngay: v.ngay, thu: thuNgay(v.ngay), so_van: 0, giay: 0, van: [] };
      n.so_van++;
      n.giay += v.giay || 0;
      const hang = cau.filter(function (c) { return khopLoc(c, loc); }).map(function (c) { return dongCau(c, daSua); });
      if (loc.loai && loc.loai !== 'tat_ca' && !hang.length) return;
      const t = tomTatVanChoNhatKy(v, cau, daSua);
      t.cau = hang;
      t.tong_cau = cau.length;
      n.van.push(t);
    });
    const ds = Object.keys(ngay).sort().reverse().map(function (k) { return ngay[k]; }).filter(function (n) { return n.van.length; });
    let khop = 0;
    ds.forEach(function (n) { n.phut_chu = phutChu(n.giay); n.van.forEach(function (v) { khop += v.cau.length; }); });
    return {
      tu: tu, den: den, loc: loc, ngay: ds, so_cau: soCau, so_sai: soSai, so_khop: khop,
      so_van: vanTrong.length,
      chip_noi_dung: Object.keys(demNd).sort(soSanhMaNoiDung).map(function (m) { return { ma: m, ten: tenNoiDung(m), so: demNd[m] }; }),
      chip_loi: Object.keys(demLoi).sort(function (a, b) { return demLoi[b] - demLoi[a] || (a < b ? -1 : 1); }).map(function (m) { return { ma: m, ten: tenLoi(m), so: demLoi[m] }; })
    };
  }
  /** Thứ tự mã nội dung: 2.x, B2.x, C2.x theo số. */
  function soSanhMaNoiDung(a, b) {
    const k = function (m) { const x = /^([A-Z]*)\d+\.(\d+)$/.exec(m); return x ? [{ '': 0, B: 1, C: 2 }[x[1]] || 3, +x[2]] : [9, 0]; };
    const ka = k(a), kb = k(b);
    return ka[0] - kb[0] || ka[1] - kb[1] || (a < b ? -1 : 1);
  }
  /** Các ngày có chơi (từ tóm tắt ván), mới nhất trước. */
  function cacNgayCoChoi(vanDs) { return motLan((vanDs || []).map(function (v) { return v.ngay; })).sort().reverse(); }

  /* ---------------- 3. Xem lại một câu ---------------- */

  const TEN_LAN = { lan_trai: 'trái', lan_giua: 'giữa', lan_phai: 'phải' };
  const TEN_VAT = {
    nut_lao_toi: 'nút “Lao tới”', nut_que_tinh: 'nút xem bằng que tính', de: 'đề bài', the_phep: 'thẻ phép tính', the_kq: 'thẻ kết quả',
    tam_tram: 'tấm trăm', thanh_chuc: 'thanh chục', khoi_don_vi: 'khối đơn vị', cot_tram: 'cột Trăm', cot_chuc: 'cột Chục', cot_dv: 'cột Đơn vị',
    qua_can: 'quả cân', dia_can: 'đĩa cân', dia_trai: 'đĩa bên trái', dia_phai: 'đĩa bên phải', binh: 'bình', ca: 'ca nước', thuoc: 'thước',
    to_tien: 'tờ tiền', khay: 'khay', ca_bien: 'con cá', bong: 'quả bóng', tui: 'túi', kim_gio: 'kim giờ', kim_phut: 'kim phút',
    trang_lich: 'trang lịch', o_ngay: 'ô ngày', hinh: 'hình', manh: 'mảnh ghép', diem: 'điểm', doan: 'đoạn thẳng', qua: 'quả', vong_lua: 'vòng lửa',
    thien_thach: 'thiên thạch', nong_sung: 'nòng pháo', muc_tieu: 'mục tiêu', o_dich: 'ô đích'
  };
  const TEN_KIEU = {
    cham: 'chạm', vuot: 'vuốt', keo: 'kéo', tha: 'thả', go_so: 'gõ số', xoa: 'xóa', doi_lan: 'đổi làn', doi_cot: 'đổi cột', chon: 'chọn',
    bo_chon: 'lấy ra', nghe_lai: 'nghe lại đề', lat: 'lật thẻ', xoay_nong: 'xoay nòng', ban: 'bắn', rot: 'rót', keo_thuoc: 'kéo thước',
    cau: 'câu', dem: 'đếm', ve: 'vẽ', noi: 'nối', xoay: 'xoay', boc: 'bốc', lat_trang: 'lật trang', dat: 'đặt', bo_ra: 'bỏ ra',
    di_chuyen: 'di chuyển', nhay: 'nhảy', ngam: 'ngắm', tro: 'chỉ'
  };
  function tenVat(x) {
    if (x == null || x === '') return '';
    const s = String(x);
    if (TEN_VAT[s]) return TEN_VAT[s];
    let m = /^the_phep_(\d+)$/.exec(s);
    if (m) return 'thẻ phép tính thứ ' + m[1];
    m = /^the_kq_(\d+)$/.exec(s);
    if (m) return 'thẻ kết quả thứ ' + m[1];
    if (TEN_LAN[s]) return 'làn ' + TEN_LAN[s];
    return s.replace(/_/g, ' ');
  }
  function coGT(v) { return v !== undefined && v !== null && v !== ''; }

  /**
   * Câu tiếng Việt cho một thao tác (du = du_lieu của sự kiện thao_tac).
   * nc: { ct: cấu trúc câu, dap_an, trangThai: {} (dùng chung trong một câu để biết làn đã đi qua) }.
   * Kiểu lạ: câu chung "Thao tác <kiểu>" kèm các trường chính.
   */
  function moTaThaoTac(du, nc) {
    nc = nc || {};
    const st = nc.trangThai || (nc.trangThai = {});
    const H = function (v) { return hienGT(nc.ct, v) + (du.don_vi ? ' ' + du.don_vi : ''); };
    const k = du.kieu;
    const vat = tenVat(du.doi_tuong);
    const gt = coGT(du.gia_tri) ? H(du.gia_tri) : '';
    const laDung = function (v) { return coGT(nc.dap_an) && String(v) === String(nc.dap_an); };
    const noi = function (x) { return tenVat(x); };
    let s;
    switch (k) {
      case 'doi_lan': {
        const v = du.gia_tri_duoi_xe;
        const den = du.den;
        st.daQua = st.daQua || {};
        if (!st.lanDau && du.tu) st.lanDau = du.tu;
        let dong;
        if (st.daQua[den]) dong = 'Lại sang làn ';
        else if (den === st.lanDau) dong = 'Đổi về làn ';
        else dong = 'Đổi sang làn ';
        st.daQua[den] = true;
        s = dong + (coGT(v) ? hienGT(nc.ct, v) : TEN_LAN[den] || den) + (laDung(v) ? ' (đáp án đúng)' : '');
        break;
      }
      case 'cham':
        if (du.doi_tuong === 'nut_lao_toi') s = 'Chạm “Lao tới” ở làn ' + gt;
        else if (du.doi_tuong === 'nut_que_tinh') s = 'Mở cách xem bằng que tính';
        else s = 'Chạm ' + (vat || 'màn hình') + (gt ? ' ' + gt : '');
        break;
      case 'vuot': s = 'Vuốt chém ' + (vat || 'quả') + (gt ? ' ' + gt : '') + (laDung(du.gia_tri) ? ' (đáp án đúng)' : ''); break;
      case 'keo': s = 'Kéo ' + (vat || 'một vật') + (gt ? ' ' + gt : '') + (du.den ? ' tới ' + noi(du.den) : ''); break;
      case 'tha':
        if (/^cot_/.test(du.den || '') && coGT(du.gia_tri)) {
          s = 'Thả 1 ' + (vat || 'khối') + ' vào ' + noi(du.den) + ', thành ' + gt + (du.gop ? ' (' + du.gop + ')' : '');
        } else s = 'Thả ' + (vat || 'vật') + (du.den ? ' vào ' + noi(du.den) : '') + (gt ? ', thành ' + gt : '');
        break;
      case 'go_so': s = 'Gõ ' + du.gia_tri + (coGT(du.hien_tai) ? ', ô số: ' + du.hien_tai : ''); break;
      case 'xoa': s = coGT(du.hien_tai) ? 'Xóa một chữ số, còn ' + du.hien_tai : 'Xóa hết số đã gõ'; break;
      case 'doi_cot': s = 'Chuyển ' + (vat || 'khối') + (du.den ? ' sang ' + noi(du.den) : ''); break;
      case 'chon':
        if (du.doi_tuong === 'the_kq') s = 'Chọn thẻ kết quả ' + gt;
        else if (du.doi_tuong === 'the_phep') s = 'Chọn phép tính ' + gt;
        else s = 'Chọn ' + (vat ? vat + ' ' : '') + gt;
        if (laDung(du.gia_tri)) s += ' (đáp án đúng)';
        break;
      case 'bo_chon':
        if (/^cot_/.test(du.tu || '')) s = 'Lấy ra 1 ' + (vat || 'khối') + ' ở ' + noi(du.tu) + (gt ? ', còn ' + gt : '');
        else s = 'Bỏ chọn ' + (vat ? vat + ' ' : '') + gt;
        break;
      case 'nghe_lai': s = 'Nghe lại đề'; break;
      case 'lat': s = 'Lật ' + (du.doi_tuong === 'the_phep' ? 'thẻ phép tính' : vat || 'thẻ') + (du.vi_tri ? ' (' + noi(du.vi_tri).replace(/^thẻ phép tính /, '') + ')' : '') + (coGT(du.gia_tri) ? ': ' + du.gia_tri : ''); break;
      case 'xoay_nong': s = 'Xoay nòng' + (coGT(du.goc) ? ' ' + du.goc + '°' : '') + (gt ? ' về ' + gt : ''); break;
      case 'ban': s = 'Bắn ' + (vat ? vat + ' ' : '') + gt + (laDung(du.gia_tri) ? ' (đáp án đúng)' : ''); break;
      case 'rot': s = 'Rót nước' + (vat ? ' vào ' + vat : '') + (gt ? ': ' + gt : '') + (coGT(du.tong) ? ', trong bình có ' + du.tong + (du.don_vi ? ' ' + du.don_vi : '') : ''); break;
      case 'keo_thuoc': s = 'Kéo thước' + (gt ? ' tới ' + gt : ''); break;
      case 'cau': s = 'Câu được ' + (vat || 'một con cá') + (gt ? ' ' + gt : ''); break;
      case 'dem': s = 'Đếm ' + (vat ? vat + ': ' : '') + gt; break;
      case 've': s = 'Vẽ ' + (vat || 'đường') + (du.tu ? ' từ ' + noi(du.tu) : '') + (du.den ? ' tới ' + noi(du.den) : ''); break;
      case 'noi': s = 'Nối ' + (du.tu ? noi(du.tu) : vat || 'hai điểm') + (du.den ? ' với ' + noi(du.den) : '') + (gt ? ': ' + gt : ''); break;
      case 'xoay': s = 'Xoay ' + (vat || 'hình') + (coGT(du.goc) ? ' ' + du.goc + '°' : '') + (gt ? ', thành ' + gt : ''); break;
      case 'boc': s = 'Bốc ' + (vat || 'một vật') + (gt ? ' ' + gt : ''); break;
      case 'lat_trang': s = 'Lật trang lịch' + (gt ? ' sang ' + gt : ''); break;
      case 'dat': s = 'Đặt ' + (vat || 'vật') + (gt ? ' ' + gt : '') + (du.den ? ' vào ' + noi(du.den) : ''); break;
      case 'bo_ra': s = 'Bỏ ' + (vat || 'vật') + (gt ? ' ' + gt : '') + ' ra' + (du.tu ? ' khỏi ' + noi(du.tu) : ''); break;
      case 'di_chuyen': s = 'Di chuyển ' + (vat || 'nhân vật') + (du.den ? ' tới ' + noi(du.den) : '') + (gt && !du.den ? ' tới ' + gt : ''); break;
      case 'nhay': s = 'Nhảy tới ' + (gt || noi(du.den) || 'vị trí mới') + (laDung(du.gia_tri) ? ' (đáp án đúng)' : ''); break;
      case 'ngam': s = 'Ngắm ' + (gt || vat || 'mục tiêu'); break;
      case 'tro': s = 'Chỉ vào ' + (gt || vat || 'một chỗ'); break;
      default: {
        const phu = Object.keys(du).filter(function (x) { return x !== 'kieu' && du[x] != null && typeof du[x] !== 'object'; }).slice(0, 3)
          .map(function (x) { return x.replace(/_/g, ' ') + ' ' + du[x]; });
        s = 'Thao tác “' + String(k || '?').replace(/_/g, ' ') + '”' + (phu.length ? ': ' + phu.join(', ') : '');
      }
    }
    if (k !== 'rot' && coGT(du.tong) && s.indexOf(String(du.tong)) < 0) s += ' (tổng ' + du.tong + (du.don_vi ? ' ' + du.don_vi : '') + ')';
    return s;
  }

  function tenCacLoi(ds) { return (ds || []).filter(function (m) { return m !== 'khac' || ds.length === 1; }).map(function (m) { return thuongDau(tenLoi(m)); }).join(', '); }

  /** Câu mô tả một sự kiện trong dòng thời gian. Trả về { chu, kieu } với kieu: hien, thao_tac, goi_y, dung, sai, phan_hoi, ket_thuc, dung_lai. */
  function moTaSuKien(e, nc) {
    const d = e.du_lieu || {};
    const H = function (v) { return hienGT(nc.ct, v); };
    switch (e.loai) {
      case 'cau_hien': {
        const lc = (d.lua_chon || []).map(function (x) { const t = H(x.gia_tri); return (x.loi && !x.loi.length) || String(x.gia_tri) === String(d.dap_an) ? '**' + t + '**' : t; });
        return { kieu: 'hien', chu: (d.on_lai ? 'Câu hiện lại để con làm lại' : 'Câu hiện') + (lc.length ? ': ' + lc.join(' · ') : '') };
      }
      case 'thao_tac': return { kieu: 'thao_tac', chu: moTaThaoTac(d, nc) };
      case 'goi_y': return { kieu: 'goi_y', chu: 'Xin gợi ý cấp ' + d.cap + (d.buoc ? ' (bước ' + d.buoc + ')' : '') + (d.noi_dung_goi_y ? ': “' + d.noi_dung_goi_y + '”' : '') + (coGT(d.loai_bo) ? ', gạch bớt ' + H(d.loai_bo) : '') };
      case 'tra_loi': {
        let dong;
        if (d.buoc === 1) dong = 'Chọn phép tính ';
        else if (nc.game === 'dua-xe' && d.lan) dong = 'Vào cổng ';
        else if (d.buoc === 2 || nc.dang === 'nhap_so' || coGT(d.nhap)) dong = 'Gõ xong: ';
        else if (nc.dang === 'ghep_doi') dong = 'Ghép với thẻ ';
        else if (nc.dang === 'keo_tha') dong = 'Bấm Xong: ';
        else dong = 'Chốt ';
        let s = dong + '**' + H(d.gia_tri) + '**';
        if (d.lan_thu > 1) s += ' (lần ' + d.lan_thu + ')';
        s += d.dung ? ' · đúng' : ' · sai' + (d.loi && d.loi.length ? ' · **' + tenCacLoi(d.loi) + '**' : '');
        if (d.chu_dong === false) s += ' · xe tự vào cổng khi hết đường';
        return { kieu: d.dung ? 'dung' : 'sai', chu: s };
      }
      case 'phan_hoi_xem':
        return { kieu: 'phan_hoi', chu: (d.buoc === 1 ? 'Xem vì sao chọn phép tính này ' : 'Xem cách làm ') + giayChu(d.giay_xem) + (d.nut === 'que_tinh' ? ', có mở que tính' : '') };
      case 'cau_ket_thuc': {
        const kq = d.ket_qua;
        let s;
        if (kq === 'dung_ngay') s = 'Xong câu: đúng ngay';
        else if (kq === 'dung_sau_goi_y') s = 'Xong câu: đúng nhờ gợi ý';
        else if (kq === 'dung_lan_2') s = 'Xong câu: đúng ở lần thử thứ 2';
        else if (kq === 'sai') s = 'Xong câu: chưa đúng' + (d.se_on_lai_sau_cau ? ', câu sẽ quay lại sau ' + d.se_on_lai_sau_cau + ' câu' : '');
        else if (kq === 'het_gio') s = 'Hết giờ, con chưa chốt đáp án' + (d.se_on_lai_sau_cau ? '; câu sẽ quay lại sau ' + d.se_on_lai_sau_cau + ' câu' : '');
        else s = 'Câu dừng giữa chừng' + (d.ly_do === 'thoat_van' ? ' (con thoát ván)' : d.ly_do === 'dong_app' ? ' (ứng dụng bị tắt)' : '');
        if (d.sua_duoc_cau) s += ', sửa được câu đã sai';
        return { kieu: kq === 'sai' || kq === 'het_gio' ? 'sai' : kq === 'bo_qua' ? 'ket_thuc' : 'dung_lai', chu: s };
      }
      case 'tam_dung': return { kieu: 'ket_thuc', chu: 'Tạm dừng' + (d.nguon === 'an_tab' || d.nguon === 'an' ? ' (rời ứng dụng)' : '') };
      case 'tiep_tuc': return { kieu: 'ket_thuc', chu: 'Chơi tiếp' };
      default: return { kieu: 'thao_tac', chu: e.loai };
    }
  }

  /** Lời giải thích riêng cho lỗi cộng, trừ hai số (theo cách đặt tính của SGK). v: giá trị bé chọn. */
  function giaiThichLoiPhep(ct, v, ma) {
    if (!ct || ct.loai || !ct.so || ct.so.length !== 2 || ct.an !== 'ket_qua' || typeof v !== 'number') return null;
    const a = ct.so[0], b = ct.so[1];
    const ua = a % 10, ub = b % 10, ta = Math.floor(a / 10) % 10, tb = Math.floor(b / 10) % 10;
    const T = NH().TRU || '−';
    if (ct.phep === '+') {
      const s = ua + ub;
      if (ma === 'quen-nho' && s >= 10 && v % 10 === s % 10) return 'Con cộng hàng đơn vị đúng (' + ua + ' + ' + ub + ' = ' + s + ', viết ' + (s % 10) + ') nhưng quên nhớ 1 sang hàng chục.';
      if (ma === 'viet-ca-so-nho' && s >= 10) return 'Con viết cả ' + s + ' xuống thay vì viết ' + (s % 10) + ' nhớ 1 sang hàng chục.';
      if (ma === 'nham-dau') return 'Con làm phép trừ thay vì phép cộng (' + a + ' ' + T + ' ' + b + ').';
      if (ma === 'sai-hang') return 'Con đặt lệch hàng: chữ số đơn vị bị cộng vào hàng chục.';
    } else if (ct.phep === '-' || ct.phep === T) {
      if (ma === 'quen-muon' && ua < ub && v % 10 === (ua + 10 - ub)) return 'Con tính đúng hàng đơn vị (' + (ua + 10) + ' ' + T + ' ' + ub + ' = ' + (ua + 10 - ub) + ') nhưng quên nhớ 1 ở hàng chục (' + tb + ' thêm 1 bằng ' + (tb + 1) + ', rồi ' + ta + ' ' + T + ' ' + (tb + 1) + ').';
      if (ma === 'tru-nguoc' && ua < ub) return 'Ở hàng đơn vị, ' + ua + ' không trừ được ' + ub + ' nên con lấy ' + ub + ' ' + T + ' ' + ua + '; cần lấy ' + (ua + 10) + ' ' + T + ' ' + ub + ' rồi nhớ 1 sang hàng chục.';
      if (ma === 'nham-dau') return 'Con làm phép cộng thay vì phép trừ (' + a + ' + ' + b + ').';
      if (ma === 'sai-hang') return 'Con đặt lệch hàng: chữ số đơn vị bị trừ vào hàng chục.';
    }
    return null;
  }

  /**
   * Dòng thời gian của một câu từ nhật ký gốc của ván chứa nó.
   * evs: sự kiện của ván (NhatKy.docVan); cauId: mã câu; o: { cauDs (tóm tắt câu của bé, để tìm lần làm lại ở ván sau), daSua }.
   * Trả về null nếu không thấy câu (nhật ký gốc đã hết hạn 120 ngày).
   */
  function dongThoiGian(evs, cauId, o) {
    o = o || {};
    evs = (evs || []).slice().sort(theoId);
    const hienDs = evs.filter(function (e) { return e.loai === 'cau_hien'; });
    const hien = hienDs.find(function (e) { return e.cau === cauId; });
    if (!hien) return null;
    const d = hien.du_lieu || {};
    const ct = d.cau_truc || {};
    const H = function (v) { return hienGT(ct, v); };
    const cuaCau = evs.filter(function (e) { return e.cau === cauId; });
    const ket = cuaCau.filter(function (e) { return e.loai === 'cau_ket_thuc'; }).pop() || null;
    const t0 = Date.parse(hien.luc);
    const iDau = evs.indexOf(hien);
    const iCuoi = ket ? evs.indexOf(ket) : evs.length - 1;
    let khoang = evs.slice(iDau, iCuoi + 1).filter(function (e) {
      return e.cau === cauId || (!e.cau && (e.loai === 'tam_dung' || e.loai === 'tiep_tuc'));
    });
    const nc = { ct: ct, dap_an: d.dap_an, dang: d.dang, game: hien.game, trangThai: {} };
    let msTruoc = 0;
    // Thao tác "chọn" mà ngay sau đó là câu trả lời cùng giá trị (Lật Thẻ, Truyện Tranh) thì chỉ giữ dòng trả lời
    khoang = khoang.filter(function (e, i) {
      if (e.loai !== 'thao_tac' || !e.du_lieu || e.du_lieu.kieu !== 'chon') return true;
      const sau = khoang[i + 1];
      return !(sau && sau.loai === 'tra_loi' && sau.du_lieu && String(sau.du_lieu.gia_tri) === String(e.du_lieu.gia_tri) && (sau.ms || 0) - (e.ms || 0) < 400);
    });
    const muc = khoang.map(function (e) {
      let ms = e.cau === cauId ? (e.ms || 0) : Math.max(0, Date.parse(e.luc) - t0);
      // phan_hoi_xem được ghi khi màn "Gần đúng rồi" đóng: đặt mốc ở lúc màn mở, như bố mẹ hình dung
      if (e.loai === 'phan_hoi_xem' && e.du_lieu && typeof e.du_lieu.giay_xem === 'number') ms = Math.max(msTruoc, Math.round(ms - e.du_lieu.giay_xem * 1000));
      msTruoc = ms;
      const m = moTaSuKien(e, nc);
      return { ms: ms, moc: so1(ms / 1000) + ' s', chu: m.chu, kieu: m.kieu, loai: e.loai };
    });

    const traLoi = cuaCau.filter(function (e) { return e.loai === 'tra_loi'; }).map(function (e) { return e.du_lieu || {}; });
    const tt = cuaCau.filter(function (e) { return e.loai === 'thao_tac'; }).map(function (e) { return e.du_lieu || {}; });
    const goiY = cuaCau.filter(function (e) { return e.loai === 'goi_y'; }).map(function (e) { return e.du_lieu || {}; });
    const phanHoi = cuaCau.filter(function (e) { return e.loai === 'phan_hoi_xem'; }).map(function (e) { return e.du_lieu || {}; });
    const tom = HT().tomTatCau(cuaCau) || {};

    // Lựa chọn và đường đi của bé
    const ghe = {};
    const giaTriXet = [];
    tt.forEach(function (x) {
      let v = null;
      if (x.kieu === 'doi_lan') v = x.gia_tri_duoi_xe;
      else if (x.kieu === 'chon' || x.kieu === 'vuot' || x.kieu === 'ban' || x.kieu === 'nhay') v = x.gia_tri;
      if (coGT(v)) { ghe[String(v)] = (ghe[String(v)] || 0) + 1; giaTriXet.push(v); }
    });
    const chot = traLoi.map(function (x) { return String(x.gia_tri); });
    const luaChon = (d.lua_chon || []).map(function (x) {
      const dung = x.loi ? x.loi.length === 0 : String(x.gia_tri) === String(d.dap_an);
      return { gia_tri: x.gia_tri, nhan: H(x.gia_tri), vi_tri: x.vi_tri || null, loi: x.loi || [], dung: dung, be_chot: chot.indexOf(String(x.gia_tri)) >= 0, lan_ghe: ghe[String(x.gia_tri)] || 0 };
    });

    let duong = null;
    const doiLan = tt.filter(function (x) { return x.kieu === 'doi_lan'; });
    const viTriLan = luaChon.map(function (x) { return x.vi_tri; });
    if (doiLan.length || (hien.game === 'dua-xe' && traLoi.some(function (x) { return x.lan; }))) {
      const dau = doiLan.length ? doiLan[0].tu : traLoi[0] && traLoi[0].lan;
      const buoc = [dau].concat(doiLan.map(function (x) { return x.den; })).filter(Boolean);
      const cuoi = traLoi.filter(function (x) { return x.buoc !== 1; }).pop();
      duong = {
        loai: 'lan', buoc: buoc, chi_so: buoc.map(function (l) { return viTriLan.indexOf(l); }),
        chu: 'Đường xe của con: ' + buoc.map(function (l) { return TEN_LAN[l] || l; }).join(' → ') + (cuoi ? ', vào cổng ' + H(cuoi.gia_tri) : '')
      };
    } else {
      const bang = tt.filter(function (x) { return (x.kieu === 'tha' || x.kieu === 'bo_chon' || x.kieu === 'dat' || x.kieu === 'bo_ra') && coGT(x.gia_tri); }).map(function (x) { return H(x.gia_tri); });
      const go = tt.filter(function (x) { return x.kieu === 'go_so' || x.kieu === 'xoa'; }).map(function (x) { return x.kieu === 'xoa' ? 'xóa' : String(x.gia_tri); });
      if (bang.length >= 2) duong = { loai: 'chung', chu: 'Số trên bảng sau mỗi lần con thả hay lấy ra: ' + bang.slice(0, 14).join(' → ') + (bang.length > 14 ? ' …' : '') };
      else if (go.length >= 2) duong = { loai: 'chung', chu: 'Con gõ lần lượt: ' + go.join(', ') };
      else if (giaTriXet.length >= 2) duong = { loai: 'chung', chu: 'Con cân nhắc: ' + giaTriXet.map(H).join(' → ') };
    }

    // Lần làm lại: trong cùng ván (theo on_lai_cua, lần theo chuỗi), rồi ở ván sau (tóm tắt câu)
    const lamLai = [];
    const theoCau = {};
    evs.forEach(function (e) { if (e.cau) (theoCau[e.cau] = theoCau[e.cau] || []).push(e); });
    let goc = cauId;
    for (let buoc = 0; buoc < 4; buoc++) {
      const h2 = hienDs.find(function (e) { return e.du_lieu && e.du_lieu.on_lai_cua === goc; });
      if (!h2) break;
      const t2 = HT().tomTatCau(theoCau[h2.cau]) || {};
      const cach = hienDs.indexOf(h2) - hienDs.indexOf(hienDs.find(function (e) { return e.cau === goc; })) - 1;
      lamLai.push(lamLaiMuc(t2, cach + ' câu sau', true));
      goc = h2.cau;
    }
    if (o.cauDs) {
      const sau = o.cauDs.filter(function (c) { return c.on_lai_cua && (c.on_lai_cua === cauId || lamLai.some(function (x) { return x.cau === c.on_lai_cua; })) && c.van !== hien.van; }).sort(theoLuc);
      sau.forEach(function (c) { lamLai.push(lamLaiMuc(c, thuNgay(c.ngay) + ' ' + gioPhut(c.luc), false)); });
    }
    let laLamLaiCua = null;
    if (d.on_lai_cua) {
      const cungVan = hienDs.find(function (e) { return e.cau === d.on_lai_cua; });
      const tomGoc = cungVan ? HT().tomTatCau(theoCau[d.on_lai_cua]) : (o.cauDs || []).find(function (c) { return c.cau === d.on_lai_cua; });
      laLamLaiCua = {
        cau: d.on_lai_cua, van: tomGoc ? tomGoc.van : null, cung_van: !!cungVan,
        chu: 'Đây là lần làm lại của câu con sai ' + (cungVan ? 'trước đó trong ván này' : tomGoc ? 'hôm ' + thuNgay(tomGoc.ngay) : 'ở ván trước') +
          (tomGoc && saiCua(tomGoc).length ? ' (lúc đó ' + conRa(tomGoc) + ')' : '') + '.'
      };
    }

    const tl = {
      cau: cauId, van: hien.van, game: hien.game, ten_game: tenGame(hien.game), man: hien.man, ten_man_ngan: tenManNgan(hien.man), ten_man: tenManDayDu(hien.man),
      luc: hien.luc, ngay: String(hien.luc).slice(0, 10), gio: gioPhut(hien.luc),
      stt: hienDs.indexOf(hien) + 1, tong: hienDs.length,
      de: d.de, de_ngan: deNgan(Object.assign({}, tom, { de: d.de, cau_truc: ct })), ma_cau: d.ma_cau, noi_dung: d.noi_dung, ky_nang: d.ky_nang, dang: d.dang,
      cau_truc: ct, dap_an: d.dap_an, nhan_dap_an: H(d.dap_an),
      lua_chon: luaChon, duong: duong, muc: muc, lam_lai: lamLai, la_lam_lai_cua: laLamLaiCua,
      ket_qua: tom.ket_qua || 'bo_qua', giay: tom.giay, loi: tom.loi || [],
      so_lan_doi_y: tom.so_lan_doi_y || 0, goi_y_cap: tom.goi_y_cap || 0,
      tra_loi: traLoi, goi_y: goiY, phan_hoi: phanHoi, gia_tri_xet: giaTriXet
    };
    tl.loi_chinh = tl.loi.filter(function (m) { return m !== 'khac'; })[0] || null;
    // Lỗi này trong tuần của câu (tóm tắt câu)
    tl.tuan_tu = dauTuan(tl.ngay);
    tl.tuan_den = congNgay(tl.tuan_tu, 6);
    tl.so_cung_loi_tuan = tl.loi_chinh && o.cauDs ? o.cauDs.filter(function (c) { return c.ngay >= tl.tuan_tu && c.ngay <= tl.tuan_den && (c.loi || []).indexOf(tl.loi_chinh) >= 0; }).length : 0;
    tl.nhan_xet = nhanXet(tl);
    return tl;
  }

  function lamLaiMuc(t, moc, cungVan) {
    const dung = t.ket_qua === 'dung_ngay' || t.ket_qua === 'dung_sau_goi_y' || t.ket_qua === 'dung_lan_2';
    let chu = 'Làm lại ' + deNgan(t) + ': ';
    if (t.ket_qua === 'dung_ngay') chu += 'đúng ngay trong ' + giayChu(t.giay);
    else if (t.ket_qua === 'dung_sau_goi_y') chu += 'đúng nhờ gợi ý, ' + giayChu(t.giay);
    else if (t.ket_qua === 'dung_lan_2') chu += 'đúng ở lần thử thứ 2';
    else if (t.ket_qua === 'bo_qua') chu += 'câu dừng giữa chừng';
    else chu += 'vẫn chưa đúng' + (saiCua(t).length ? ', ' + conRa(t) : '');
    return { cau: t.cau, van: t.van, moc: moc, cung_van: cungVan, dung: dung, ket_qua: t.ket_qua, giay: t.giay, chu: chu };
  }

  /** Nhận xét theo luật cho một câu: chần chừ, lỗi có tên, gợi ý, thời gian, xem lời giải, đã sửa chưa, lỗi lặp trong tuần. */
  function nhanXet(tl) {
    const H = function (v) { return hienGT(tl.cau_truc, v); };
    const cau = [];
    const buoc2 = tl.tra_loi.filter(function (x) { return x.buoc !== 1; });
    const sai = buoc2.filter(function (x) { return !x.dung; });
    const dung = buoc2.some(function (x) { return x.dung; });
    const b1Sai = tl.tra_loi.filter(function (x) { return x.buoc === 1 && !x.dung; });
    const kn = NH().KY_NANG[tl.ky_nang];
    const doiY = tl.so_lan_doi_y;
    // 1. Chần chừ
    const xet = motLan(tl.gia_tri_xet.map(String));
    const chotSai = sai.length ? sai[sai.length - 1].gia_tri : null;
    if (chotSai != null && xet.indexOf(String(tl.dap_an)) >= 0) {
      cau.push('Con đã có lúc đứng ở đáp án đúng ' + H(tl.dap_an) + ' nhưng rồi chốt ' + H(chotSai) + ': con chần chừ giữa ' + H(chotSai) + ' và ' + H(tl.dap_an) + (doiY > 1 ? ', đổi ý ' + doiY + ' lần' : '') + '.');
    } else if (doiY >= 2) {
      cau.push('Con đổi ý ' + doiY + ' lần trước khi chốt' + (xet.length >= 2 ? ' (giữa ' + noiVa(xet.slice(0, 4).map(function (x) { return H(isNaN(+x) ? x : +x); })) + ')' : '') + '.');
    }
    // 2. Bước chọn phép (bài toán có lời văn)
    if (b1Sai.length) {
      const x = b1Sai[0];
      cau.push((x.loi || []).indexOf('dao-thu-tu') >= 0 && x.loi.length === 1
        ? 'Con chọn đúng phép nhưng viết đảo thứ tự (' + H(x.gia_tri) + '): chưa quen cách viết, không tính là sai toán.'
        : 'Ở bước chọn phép tính con chọn ' + H(x.gia_tri) + ': con biết tính nhưng chưa hiểu đề bài hỏi gì.');
    }
    // 3. Lỗi có tên
    if (sai.length) {
      const v = sai[0].gia_tri;
      const ma = ((sai[0].loi || []).filter(function (m) { return m !== 'khac'; })[0]) || null;
      let ctTinh = tl.cau_truc;
      if (ctTinh && ctTinh.loai === 'loi_van') { try { ctTinh = NH().ctPhep(ctTinh); } catch (e) { ctTinh = null; } }
      const rieng = ma ? giaiThichLoiPhep(ctTinh, v, ma) : null;
      const dong = tl.dang === 'nhap_so' || tl.dang === 'hai_buoc' || sai[0].nhap != null ? 'Con gõ ' : tl.dang === 'keo_tha' ? 'Con xếp ' : 'Con chọn ';
      if (rieng) cau.push(rieng);
      else if (ma) cau.push(dong + H(v) + ': ' + thuongDau(moTaLoi(ma)) + '.');
      else cau.push(dong + H(v) + ', đáp án đúng là ' + H(tl.dap_an) + '.');
    } else if (tl.ket_qua === 'het_gio') {
      cau.push('Hết giờ mà con chưa chốt đáp án: có thể con chưa đọc kịp đề hoặc chưa chắc cách làm.');
    }
    // 4. Gợi ý
    if (tl.goi_y_cap > 0) cau.push('Con xin gợi ý tới cấp ' + tl.goi_y_cap + (dung ? ' rồi làm đúng' : '') + '.');
    // 5. Thời gian so với thời gian gợi ý của kỹ năng
    if (tl.giay != null && kn && kn.giay) {
      if (tl.giay < kn.giay * 0.3 && sai.length) cau.push('Con chốt rất nhanh (' + giayChu(tl.giay) + '), có thể chưa đọc kỹ đề.');
      else if (tl.giay > kn.giay * 2) cau.push('Con nghĩ khá lâu (' + giayChu(tl.giay) + ', thường khoảng ' + kn.giay + ' giây).');
    }
    // 6. Xem lời giải
    const ph = tl.phan_hoi[tl.phan_hoi.length - 1];
    if (ph) {
      if (ph.giay_xem != null && ph.giay_xem < 3) cau.push('Con xem cách làm chỉ ' + giayChu(ph.giay_xem) + ': bố mẹ có thể cùng con xem lại.');
      else cau.push('Con xem cách làm ' + giayChu(ph.giay_xem) + (ph.nut === 'que_tinh' ? ' và mở cả que tính' : '') + '.');
    }
    // 7. Đã sửa chưa
    const ll = tl.lam_lai[0];
    if (laKetQuaSai(tl)) {
      if (ll && ll.dung) cau.push('Khi câu quay lại (' + ll.moc + '), con làm đúng' + (ll.giay != null ? ' trong ' + giayChu(ll.giay) : '') + ': con đã hiểu ra.');
      else if (ll) cau.push('Khi câu quay lại, con vẫn chưa làm được: nên cùng con làm lại bằng đồ vật thật.');
      else cau.push('Câu này chưa được làm lại, sẽ quay lại ở ván sau.');
    } else if (tl.ket_qua === 'dung_ngay' && !cau.length) {
      cau.push('Con làm đúng ngay' + (tl.giay != null ? ' trong ' + giayChu(tl.giay) : '') + ', không cần gợi ý.');
    }
    // 8. Lỗi lặp trong tuần
    if (tl.loi_chinh && tl.so_cung_loi_tuan > 1) cau.push('Lỗi “' + thuongDau(tenLoi(tl.loi_chinh)) + '” gặp ' + tl.so_cung_loi_tuan + ' lần trong tuần ' + khoangTuan(tl.tuan_tu) + '.');
    return cau.join(' ');
  }

  /* ---------------- 4. Bản đồ kỹ năng ---------------- */

  /**
   * 43 nội dung theo 10 vùng (thứ tự Dao.VUNG, bỏ đấu trường). Mức của một ô: mức thấp nhất trong các kỹ năng
   * đã luyện của nội dung đó; chưa luyện kỹ năng nào thì "Chưa học". Chấm đỏ khi có kỹ năng Cần giúp.
   */
  function banDoKyNang(hocTap) {
    const theoMa = {};
    ((hocTap && hocTap.ky_nang) || []).forEach(function (k) {
      if (!k.so_cau) return;
      (theoMa[k.ma] = theoMa[k.ma] || []).push(k);
    });
    let soO = 0;
    const vung = DAO().VUNG.filter(function (v) { return !v.dau_truong; }).map(function (v) {
      return {
        so: v.so, ten: v.ten, mau: v.mau,
        o: v.noi_dung.map(function (ma) {
          soO++;
          const ds = theoMa[ma] || [];
          let muc = ds.length ? MUC[Math.min.apply(null, ds.map(function (k) { return MUC.indexOf(k.muc); }))] : 'chua_hoc';
          if (!muc) muc = 'chua_hoc';
          return {
            ma: ma, ten: tenNoiDung(ma), muc: muc, ten_muc: TEN_MUC[muc], can_giup: ds.some(function (k) { return k.can_giup; }),
            ky_nang: ds.map(function (k) { return { ky_nang: k.ky_nang, muc: k.muc, can_giup: !!k.can_giup, so_cau: k.so_cau }; })
          };
        })
      };
    });
    return { vung: vung, so_o: soO, chu_giai: MUC.map(function (m) { return { muc: m, ten: TEN_MUC[m] }; }) };
  }

  /** Các màn (và thể loại) luyện một nội dung: màn có câu thuộc kỹ năng mang mã nội dung đó. */
  function manCuaNoiDung(ma) {
    const KY = NH().KY_NANG;
    const ra = [];
    DAO().VUNG.forEach(function (v) {
      v.man.forEach(function (m) {
        if (!(m.cau || []).some(function (x) { return KY[x.ky_nang] && KY[x.ky_nang].noi_dung === ma; })) return;
        ra.push({ id: m.id, ten: DAO().tenManDayDu(m), ten_ngan: m.ten, bai: m.bai, game: m.game, ten_game: tenGame(m.game), choi_duoc: DAO().choiDuoc(m), luyen_tap: !!m.luyen_tap, cup: !!m.cup });
      });
    });
    return ra;
  }

  /** Chi tiết một ô của bản đồ kỹ năng. Số liệu 14 ngày tính từ tóm tắt câu (tới homNay). */
  function chiTietNoiDung(ma, du, homNay) {
    const hs = hoSoTai(du, homNay);
    const tu14 = congNgay(homNay, -13);
    const cauDs = (du.cauDs || []).filter(function (c) { return c.noi_dung === ma; });
    const cua14 = cauDs.filter(function (c) { return c.ngay >= tu14 && c.ngay <= homNay; });
    const tl = tiLeTuLam(cua14);
    const giay = cua14.filter(function (c) { return c.ket_qua === 'dung_ngay' && typeof c.giay === 'number'; }).map(function (c) { return c.giay; });
    const demLoi = {};
    cua14.forEach(function (c) { (c.loi || []).forEach(function (m) { demLoi[m] = (demLoi[m] || 0) + 1; }); });
    const daSua = HT().tapDaSua(du.cauDs || []);
    const daCo = {};
    const saiGan = cauDs.filter(function (c) { return saiCua(c).length || c.ket_qua === 'het_gio'; }).sort(theoLuc).reverse().filter(function (c) {
      if (daCo[c.ma_cau]) return false;
      daCo[c.ma_cau] = true;
      return true;
    }).slice(0, 5).map(function (c) {
      return { cau: c.cau, van: c.van, ngay: c.ngay, thu: thuNgay(c.ngay), de: deNgan(c), sai: saiCua(c).map(function (v) { return hienGT(c.cau_truc, v); }), dung: hienGT(c.cau_truc, c.dap_an), da_sua: !!daSua[c.cau], ket_qua: c.ket_qua };
    });
    const o = banDoKyNang(hs).vung.reduce(function (r, v) { return r || v.o.find(function (x) { return x.ma === ma; }); }, null) || { muc: 'chua_hoc', can_giup: false, ky_nang: [] };
    const bk = bangKy(hs);
    return {
      ma: ma, ten: tenNoiDung(ma), muc: o.muc, ten_muc: TEN_MUC[o.muc], can_giup: o.can_giup,
      vung: DAO().vungCuaNoiDung(ma),
      so_cau: cauDs.filter(daLam).length,
      so_cau_14: cua14.filter(daLam).length, tu_lam_14: tl.tu_lam, dung_14: tl.dung, ti_le_14: tl.ti_le,
      giay_trung_vi: HT().trungVi(giay),
      loi: Object.keys(demLoi).sort(function (a, b) { return demLoi[b] - demLoi[a] || (a < b ? -1 : 1); }).map(function (m) { return { ma: m, ten: tenLoi(m), lan: demLoi[m] }; }),
      cau_sai_gan_day: saiGan,
      ky_nang: o.ky_nang.map(function (k) { const x = bk[k.ky_nang] || {}; return { ky_nang: k.ky_nang, ten: tenKyNang(k.ky_nang), muc: k.muc, ten_muc: TEN_MUC[k.muc], can_giup: k.can_giup, so_cau: k.so_cau, ti_le_14: x.tu_lam_dung_14_ngay, on_lai_ke_tiep: x.on_lai_ke_tiep || null }; }),
      man: manCuaNoiDung(ma),
      tien_quyet: (NH().TIEN_QUYET[ma] || []).map(function (p) { return { ma: p, ten: tenNoiDung(p) }; })
    };
  }

  /* ---------------- 5. Kế hoạch tuần tới ---------------- */

  /** Việc làm cùng con ngoài màn hình, theo mã nội dung (theo tinh thần SGK Toán 2 Kết nối tri thức). */
  const VIEC_CUNG_CON = {
    '2.1': 'Bó que tính (hoặc đũa) thành từng bó 10 que. Đưa con 3 bó và 4 que lẻ, hỏi: có tất cả bao nhiêu que? (34 gồm 3 chục và 4 đơn vị)',
    '2.2': 'Ở siêu thị, chỉ hai giá tiền (45 nghìn và 54 nghìn) và hỏi con số nào lớn hơn, vì sao. Nhắc con so hàng chục trước.',
    '2.3': 'Dùng tờ 100, 10 và 1 nghìn đồng (tiền giấy đồ chơi cũng được) để con ghép số 243: 2 tờ trăm, 4 tờ chục, 3 tờ đơn vị.',
    '2.4': 'Đọc cùng con số nhà, số trang sách có ba chữ số. Hỏi 205 đọc thế nào (hai trăm linh năm), 304 đọc thế nào (ba trăm linh tư).',
    '2.5': 'Khi đọc sách, hỏi con số trang liền trước, liền sau. Thử các số qua chục: liền sau của 39 là 40, liền trước của 60 là 59.',
    '2.6': 'So giá hai món đồ (350 nghìn và 305 nghìn). Cho con nói số nào lớn hơn, rồi xếp ba giá từ bé đến lớn.',
    '2.7': 'Đổ một nắm hạt đậu, cho con đoán khoảng bao nhiêu hạt, rồi cùng xếp thành từng nhóm 10 để đếm lại.',
    '2.8': 'Đố nhanh trên đường đi học: 8 + 5, 9 + 7, 6 + 8. Nhắc cách tách để làm tròn 10: 8 + 5 = 8 + 2 + 3 = 13.',
    '2.9': 'Dùng 13 que tính hỏi 13 − 5: bớt 3 que để còn 10, rồi bớt tiếp 2 que, còn 8.',
    '2.10': 'Khi mua hai món không nhớ (23 nghìn và 45 nghìn), cho con đặt tính dọc trên giấy rồi tính tổng tiền.',
    '2.11': 'Làm 36 + 27 bằng que tính: 6 que và 7 que lẻ gộp được 13 que, bó 10 que thành 1 chục (nhớ 1), rồi đếm các bó chục.',
    '2.12': 'Cộng giá hai món trong phạm vi 1000 (250 + 130). Đặt tính thẳng cột trăm, chục, đơn vị và tính từ phải sang trái.',
    '2.13': 'Nhẩm tiền chẵn: 30 nghìn + 50 nghìn, 70 nghìn − 20 nghìn. Nói theo chục: 3 chục cộng 5 chục bằng 8 chục.',
    '2.14': 'Viết một phép cộng và một phép trừ lên giấy, cho con chỉ đâu là số hạng, tổng, số bị trừ, số trừ, hiệu.',
    '2.15': 'Đố con: số nào cộng 6 thì được 13? Dùng que tính đếm thêm từ 6 tới 13, rồi kiểm tra bằng phép trừ 13 − 6.',
    '2.16': 'Mua ba món: 20 + 15 − 5 nghìn. Cho con tính lần lượt từ trái sang phải và nói to từng bước.',
    '2.17': 'Chơi với ô tô đồ chơi: bạn có 8 xe, con có nhiều hơn bạn 3 xe thì con có mấy xe? Xếp thành hai hàng để so.',
    '2.18': 'Kể bài toán từ việc nhà (Mẹ có 12 quả trứng, đã dùng 5 quả). Cho con nói bài cho biết gì, hỏi gì, rồi mới chọn phép tính.',
    '2.19': 'Xếp 3 đĩa, mỗi đĩa 2 quả. Con đếm 2 + 2 + 2 = 6 rồi viết 2 × 3 = 6, đọc “2 được lấy 3 lần”.',
    '2.20': 'Đếm thêm 2 bằng đôi đũa, đôi dép; đếm thêm 5 bằng ngón tay mỗi bàn tay để ôn bảng nhân 2, bảng nhân 5.',
    '2.21': 'Chia đều 10 cái kẹo cho 2 bạn (mỗi bạn mấy cái?), rồi chia 10 cái kẹo thành các nhóm 5 cái (được mấy nhóm?).',
    '2.22': 'Đố nhanh 10 : 2, 15 : 5 dựa vào bảng nhân: vì 2 × 5 = 10 nên 10 : 2 = 5.',
    '2.23': 'Viết 2 × 4 = 8 và 8 : 2 = 4, cho con gọi tên thừa số, tích, số bị chia, số chia, thương.',
    '2.24': 'Từ phép nhân 2 × 5 = 10, cho con tự viết hai phép chia: 10 : 2 = 5 và 10 : 5 = 2.',
    '2.25': 'Gấp đôi tờ giấy hoặc cắt bánh thành 2 phần bằng nhau, tô màu một phần hai; thử thêm với 5 phần bằng nhau.',
    '2.26': 'Ở bàn ăn: mỗi người 2 chiếc đũa, nhà có 4 người thì cần mấy chiếc? Rồi đảo lại: 8 chiếc đũa chia đều cho 4 người.',
    'B2.1': 'Tìm trong nhà đoạn thẳng (mép bàn), đường cong (miệng cốc), đường gấp khúc (bậc cầu thang).',
    'B2.2': 'Đặt 3 hạt đậu trên bàn, cho con xếp sao cho 3 điểm thẳng hàng, kiểm tra bằng mép thước.',
    'B2.3': 'Tìm hình tứ giác trong nhà: cửa sổ, quyển sách, viên gạch lát nền. Đếm cùng con 4 cạnh, 4 đỉnh.',
    'B2.4': 'Tìm đồ vật dạng khối trụ (lon sữa, cốc) và khối cầu (quả bóng, quả cam); cho con lăn thử xem vật nào lăn được.',
    'B2.5': 'Cắt một tờ giấy vuông thành 2 hình tam giác, rồi ghép lại thành hình khác (hình vuông, hình tam giác to).',
    'B2.6': 'Dùng thước dây đo chiều cao của con. Nhắc: 1 m = 10 dm = 100 cm; quãng đường đến trường thì đo bằng km.',
    'B2.7': 'Đo chiều dài bàn học bằng gang tay, rồi đo lại bằng thước có vạch xăng-ti-mét; so hai kết quả.',
    'B2.8': 'Vẽ đường gấp khúc 3 đoạn lên giấy, đo từng đoạn bằng thước rồi cộng lại để được độ dài đường gấp khúc.',
    'B2.9': 'Khi đi chợ, cho con cầm túi 1 kg đường và túi 2 kg gạo, hỏi túi nào nặng hơn; cùng đọc số ki-lô-gam trên cân.',
    'B2.10': 'Khi nấu cơm, đong nước bằng chai 1 lít rồi hỏi con: 2 chai là mấy lít? Can 5 lít đổ được mấy chai?',
    'B2.11': 'Cùng xem đồng hồ kim lúc ăn tối: 7 giờ, 7 giờ rưỡi, 7 giờ 15 phút. Cho con quay kim đồng hồ đồ chơi.',
    'B2.12': 'Nói chuyện về các buổi trong ngày: 7 giờ sáng ăn sáng, 19 giờ (7 giờ tối) ăn tối, một ngày có 24 giờ.',
    'B2.13': 'Xem lịch treo tường: hôm nay thứ mấy, ngày bao nhiêu; còn mấy ngày nữa đến sinh nhật hay đến Chủ nhật?',
    'B2.14': 'Cho con cầm tờ 10 nghìn, 20 nghìn khi mua đồ: cần mấy tờ để trả, người bán trả lại bao nhiêu?',
    'C2.1': 'Cùng con kiểm đếm đồ chơi theo loại (ô tô, búp bê, bóng) bằng các vạch, mỗi vạch một đồ chơi.',
    'C2.2': 'Vẽ biểu đồ tranh số quả con ăn trong tuần (mỗi quả một hình), rồi hỏi loại nào nhiều nhất, ít nhất.',
    'C2.3': 'Bốc bóng trong túi: túi toàn bóng đỏ thì chắc chắn bốc được bóng đỏ; túi có đỏ và xanh thì có thể; không có bóng vàng thì không thể.'
  };
  function viecCungCon(maDs, soToiDa) {
    const ra = [];
    motLan(maDs).forEach(function (m) { if (VIEC_CUNG_CON[m] && ra.length < (soToiDa || 3)) ra.push({ ma: m, ten: tenNoiDung(m), chu: VIEC_CUNG_CON[m] }); });
    return ra;
  }

  /** Màn có mở cho bé không (vùng mở, màn không khóa theo học kì, cúp đã mở). */
  function manMoChoBe(m, hoSo, hs) {
    const D = DAO();
    const v = D.vung(m.vung);
    if (!v || !D.choiDuoc(m) || v.dau_truong) return false;
    if (!D.trangThaiVung(v, hoSo, hs).mo || !D.manMo(m, hoSo)) return false;
    if (m.cup && !D.cupMo(v, hoSo)) return false;
    // Kỹ năng của màn phải có trong ngân hàng (nhóm khác có thể chưa đăng ký xong)
    return (m.cau || []).every(function (x) { return !!NH().KY_NANG[x.ky_nang]; });
  }
  /** "Bắn Thiên Thạch · Đường Đua Có Nhớ, màn 8" */
  function choiO(m) {
    const v = DAO().vung(m.vung);
    return tenGame(m.game) + ' · ' + (m.cup || m.dau_truong ? m.ten : (v ? v.ten + ', màn ' + m.so : 'màn ' + m.so));
  }
  function tatCaMan() { const ra = []; DAO().VUNG.forEach(function (v) { v.man.forEach(function (m) { ra.push(m); }); }); return ra; }

  /**
   * Kế hoạch tuần tới (thứ Hai kế tiếp tới Chủ nhật), gợi ý từ hồ sơ học tập:
   * - Luyện lại (tối đa 2): kỹ năng Cần giúp, còn câu nợ, hay đang luyện dưới 80% (từ 5 câu tự làm); kèm lỗi chính;
   *   chọn màn cùng kỹ năng nhưng khác thể loại lần gần nhất con luyện kỹ năng đó.
   * - Ôn nền (tối đa 2): nội dung tiên quyết (TIEN_QUYET) của kỹ năng yếu, khi nội dung đó chưa Đã thuộc
   *   hoặc kỹ năng yếu sai lặp lại từ 2 ngày trong 14 ngày.
   * - Học mới (tối đa 2): màn chưa học theo bài đang học, đúng thứ tự SGK (như nhiệm vụ Học mới).
   * du: { hoSo, cauDs, vanDs, hocTap }. Trả về { tu, den, muc: [...], viec_cung_con: [...], ke_hoach_tuan }.
   */
  function keHoachTuan(du, homNay) {
    const D = DAO();
    const hoSo = du.hoSo || {};
    const hs = hoSoTai(du, homNay);
    const bk = bangKy(hs);
    const cauDs = du.cauDs || [];
    const ls = D.lichSuTheLoai(cauDs);
    const tu = congNgay(dauTuan(homNay), 7), den = congNgay(tu, 6);
    const tu14 = congNgay(homNay, -13);
    const moMan = tatCaMan().filter(function (m) { return manMoChoBe(m, hoSo, hs); });
    const daChon = {};
    const muc = [];
    const gameGanNhat = function (kn) {
      const x = ls[kn] || {};
      return Object.keys(x).sort(function (a, b) { return x[b] < x[a] ? -1 : x[b] > x[a] ? 1 : (a < b ? -1 : 1); })[0] || null;
    };
    /** Màn luyện được kỹ năng kn, ưu tiên thể loại khác lần gần nhất, thể loại lâu chưa dùng, màn không phải cúp. */
    const manChoKy = function (kn, tranhGame) {
      const x = ls[kn] || {};
      const ds = moMan.filter(function (m) { return !daChon[m.id] && D.kyNangCuaMan(m).indexOf(kn) >= 0; });
      ds.sort(function (a, b) {
        const ka = [a.game === tranhGame ? 1 : 0, x[a.game] || '', a.cup ? 1 : 0, a.ky_nang_chinh === kn ? 0 : 1, a.bai_dau];
        const kb = [b.game === tranhGame ? 1 : 0, x[b.game] || '', b.cup ? 1 : 0, b.ky_nang_chinh === kn ? 0 : 1, b.bai_dau];
        for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1;
        return a.id < b.id ? -1 : 1;
      });
      return ds[0] || null;
    };
    const themMuc = function (loai, m, kn, lyDo, tieuDe, chiTiet, noiDung, doiTu) {
      daChon[m.id] = true;
      muc.push({ loai: loai, man: m.id, ky_nang: kn, ly_do: lyDo, tieu_de: tieuDe, chi_tiet: chiTiet, noi_dung: noiDung, game: m.game, ten_game: tenGame(m.game), ten_man: D.tenManDayDu(m), ten_man_ngan: m.ten,
        choi: choiO(m) + (doiTu && doiTu !== m.game ? ' (lần trước con luyện bằng ' + tenGame(doiTu) + ')' : '') });
    };

    // 1. Luyện lại
    const yeu = hs.ky_nang.filter(function (k) {
      return k.so_cau > 0 && (k.can_giup || k.cau_no > 0 || ((k.muc === 'dang_luyen' || k.muc === 'lam_quen') && k.tu_lam_dung_14_ngay != null && k.tu_lam_dung_14_ngay < 0.8 && k.tu_lam_14_ngay >= 5));
    }).sort(function (a, b) {
      return (b.can_giup ? 1 : 0) - (a.can_giup ? 1 : 0) || (b.cau_no || 0) - (a.cau_no || 0) || (a.tu_lam_dung_14_ngay || 0) - (b.tu_lam_dung_14_ngay || 0) || (a.ky_nang < b.ky_nang ? -1 : 1);
    });
    let soLuyen = 0;
    yeu.forEach(function (k) {
      if (soLuyen >= 2) return;
      const truoc = gameGanNhat(k.ky_nang);
      const m = manChoKy(k.ky_nang, truoc);
      if (!m) return;
      const ma = loiChinhCua(k);
      const lh = (k.loi_hay_gap || []).find(function (x) { return x.ma === ma; });
      const lyDo = ma && ma !== 'khac' ? loiCua(ma).ngan : 'Luyện thêm cho chắc';
      const chiTiet = (ma && ma !== 'khac' ? hayLoi(ma) + (lh ? ' (' + lh.lan + ' lần trong 14 ngày)' : '') + '. ' : '') +
        (k.can_giup ? 'Đang Cần giúp' : 'Tự làm đúng ' + phanTram(k.tu_lam_dung_14_ngay)) + ', luyện bằng trò chơi khác để con nhìn bài theo cách mới.';
      themMuc('luyen_lai', m, k.ky_nang, lyDo, tenKyNang(k.ky_nang), chiTiet, k.ma, truoc);
      soLuyen++;
    });

    // 2. Ôn nền
    const bd = banDoKyNang(hs);
    const mucNd = {};
    bd.vung.forEach(function (v) { v.o.forEach(function (o) { mucNd[o.ma] = o.muc; }); });
    const daNen = {};
    let soNen = 0;
    yeu.forEach(function (k) {
      if (soNen >= 2) return;
      const ngaySai = motLan(cauDs.filter(function (c) { return c.ky_nang === k.ky_nang && c.ngay >= tu14 && c.ngay <= homNay && laCauSai(c); }).map(function (c) { return c.ngay; })).length;
      (NH().TIEN_QUYET[k.ma] || []).forEach(function (p) {
        if (soNen >= 2 || daNen[p] || !NH().NOI_DUNG[p]) return;
        const thap = MUC.indexOf(mucNd[p] || 'chua_hoc') < MUC.indexOf('da_thuoc');
        if (!thap && ngaySai < 2) return;
        const knP = Object.keys(NH().KY_NANG).filter(function (x) { return NH().KY_NANG[x].noi_dung === p; });
        let m = null, knChon = null;
        knP.forEach(function (x) { if (m) return; const mm = manChoKy(x, gameGanNhat(x)); if (mm) { m = mm; knChon = x; } });
        if (!m) return;
        daNen[p] = true;
        themMuc('on_nen', m, knChon, 'Ôn nền cho ' + thuongDau(tenKyNang(k.ky_nang)), tenNoiDung(p),
          'Nền của ' + thuongDau(tenKyNang(k.ky_nang)) + (ngaySai >= 2 ? ': con còn sai ở ' + ngaySai + ' ngày khác nhau' : '') + '. ' +
          (MUC.indexOf(mucNd[p] || 'chua_hoc') < MUC.indexOf('da_thuoc') ? 'Nội dung này con chưa thuộc.' : 'Ôn lại cho thật nhanh, thật chắc.'), p);
        soNen++;
      });
    });

    // 3. Học mới theo bài đang học, đúng thứ tự SGK
    const bai = hoSo.bai_dang_hoc || 1;
    const moi = moMan.filter(function (m) {
      if (daChon[m.id] || m.luyen_tap || m.cup || !m.ky_nang_chinh) return false;
      const k = bk[m.ky_nang_chinh];
      return !k || k.muc === 'chua_hoc' || k.muc === 'lam_quen';
    });
    const theoBai = function (a, b) { return a.bai_dau - b.bai_dau || (a.id < b.id ? -1 : 1); };
    const daHoc = moi.filter(function (m) { return m.bai_dau <= bai; }).sort(theoBai);
    const baiNay = daHoc.length ? [daHoc[daHoc.length - 1]] : [];
    const ganDay = moi.filter(function (m) { return baiNay.indexOf(m) < 0 && m.bai_dau <= bai + 3 && m.bai_dau >= bai - 15; }).sort(theoBai);
    const conLai = moi.filter(function (m) { return baiNay.indexOf(m) < 0 && ganDay.indexOf(m) < 0; }).sort(theoBai);
    baiNay.concat(ganDay, conLai).slice(0, 2).forEach(function (m) {
      themMuc('hoc_moi', m, m.ky_nang_chinh, m.bai, m.ten + ' (' + m.bai + ')',
        (m.bai_dau <= bai ? 'Bài con đã học trên lớp nhưng chưa chơi.' : 'Bài sắp học trên lớp.') + ' Con xem bài học 30 giây rồi chơi.', NH().KY_NANG[m.ky_nang_chinh] ? NH().KY_NANG[m.ky_nang_chinh].noi_dung : null);
    });

    // Làm cùng con: nội dung của các mục, không có thì nội dung của bài đang học
    let ma = muc.map(function (x) { return x.noi_dung; }).filter(Boolean);
    if (!ma.length) {
      const m = tatCaMan().filter(function (x) { return x.bai_dau <= bai && x.ky_nang_chinh && NH().KY_NANG[x.ky_nang_chinh]; }).sort(theoBai).pop();
      ma = [m ? NH().KY_NANG[m.ky_nang_chinh].noi_dung : '2.1'];
    }
    return {
      tu: tu, den: den, muc: muc,
      viec_cung_con: viecCungCon(ma, 3),
      ke_hoach_tuan: { tu: tu, den: den, muc: muc.map(function (x) { return { loai: x.loai, man: x.man, ky_nang: x.ky_nang, ly_do: x.ly_do }; }) }
    };
  }

  /* ---------------- 6. Gói xuất cho trợ lý AI (spec 06 mục 5.9) ---------------- */

  /** Số byte UTF-8 của một chuỗi (không cần TextEncoder). */
  function soByte(s) {
    let n = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c < 0x80) n += 1;
      else if (c < 0x800) n += 2;
      else if (c >= 0xD800 && c <= 0xDBFF) { n += 4; i++; }
      else n += 3;
    }
    return n;
  }
  /**
   * JSON gọn cho gói xuất: hai tầng đầu xuống dòng cho dễ đọc, mảng ở tầng 2 mỗi phần tử một dòng,
   * từ tầng 3 viết liền (ít khoảng trắng, ít token). JSON.parse đọc lại được như thường.
   */
  function jsonGon(x) {
    function s(v, d) {
      if (v === null || typeof v !== 'object') return JSON.stringify(v);
      const le = '\n' + ' '.repeat(d + 1), cuoi = '\n' + ' '.repeat(d);
      if (Array.isArray(v)) {
        if (!v.length) return '[]';
        if (d >= 2) return d === 2 && typeof v[0] === 'object' && v[0] !== null ? '[' + v.map(function (y) { return le + JSON.stringify(y); }).join(',') + cuoi + ']' : JSON.stringify(v);
        return '[' + v.map(function (y) { return le + s(y, d + 1); }).join(',') + cuoi + ']';
      }
      if (d >= 2) return JSON.stringify(v);
      const k = Object.keys(v).filter(function (kk) { return v[kk] !== undefined; });
      if (!k.length) return '{}';
      return '{' + k.map(function (kk) { return le + JSON.stringify(kk) + ': ' + s(v[kk], d + 1); }).join(',') + cuoi + '}';
    }
    return s(x, 0);
  }

  /** Ước lượng token: byte UTF-8 / 3, làm tròn lên (xem đầu tệp). */
  function uocLuongToken(s) { return Math.ceil(soByte(String(s || '')) / 3); }

  /** Câu tiếng Việt tóm tắt thao tác của bé trong một câu sai, dựng từ nhật ký gốc của câu (evs), hoặc từ tóm tắt nếu không còn nhật ký. */
  function thaoTacNgan(evs, c) {
    const H = function (v) { return hienGT(c.cau_truc, v); };
    const phan = [];
    evs = (evs || []).slice().sort(theoId);
    if (!evs.length) {
      const sai = saiCua(c);
      if (c.so_lan_doi_y) phan.push('đổi ý ' + c.so_lan_doi_y + ' lần');
      if (c.goi_y_cap) phan.push('xin gợi ý cấp ' + c.goi_y_cap);
      if (sai.length) phan.push(dongTu(c.dang) + ' ' + sai.map(H).join(' rồi ') + (c.giay != null ? ' sau ' + giayChu(c.giay) : ''));
      else if (c.ket_qua === 'het_gio') phan.push('hết giờ chưa chốt');
      return (c.game ? tenGame(c.game) + ': ' : '') + phan.join(', ');
    }
    const tt = evs.filter(function (e) { return e.loai === 'thao_tac'; }).map(function (e) { return e.du_lieu || {}; });
    const lan = tt.filter(function (x) { return x.kieu === 'doi_lan'; });
    if (lan.length) {
      const vals = motLan(lan.map(function (x) { return H(x.gia_tri_duoi_xe); }));
      phan.push('đổi làn ' + lan.length + ' lần' + (vals.length >= 2 ? ' giữa ' + noiVa(vals) : ' sang ' + vals[0]));
    }
    const go = tt.filter(function (x) { return x.kieu === 'go_so' || x.kieu === 'xoa'; });
    if (go.length) phan.push('gõ ' + go.map(function (x) { return x.kieu === 'xoa' ? 'xóa' : String(x.gia_tri); }).join(', '));
    const nghe = tt.filter(function (x) { return x.kieu === 'nghe_lai'; }).length;
    if (nghe) phan.push('nghe lại đề' + (nghe > 1 ? ' ' + nghe + ' lần' : ''));
    const lat = tt.filter(function (x) { return x.kieu === 'lat'; });
    if (lat.length) phan.push('lật thẻ ' + motLan(lat.map(function (x) { return H(x.gia_tri); })).join(', '));
    const tha = tt.filter(function (x) { return x.kieu === 'tha'; }).length, lay = tt.filter(function (x) { return x.kieu === 'bo_chon' && /^cot_/.test(x.tu || ''); }).length;
    if (tha) phan.push('thả ' + tha + ' khối' + (lay ? ', lấy ra ' + lay : ''));
    const dem = {};
    tt.forEach(function (x) { if (['doi_lan', 'go_so', 'xoa', 'nghe_lai', 'lat', 'tha', 'chon', 'cham'].indexOf(x.kieu) < 0 && !(x.kieu === 'bo_chon' && /^cot_/.test(x.tu || ''))) dem[x.kieu] = (dem[x.kieu] || 0) + 1; });
    Object.keys(dem).sort().forEach(function (k) { phan.push((TEN_KIEU[k] || k.replace(/_/g, ' ')) + ' ' + dem[k] + ' lần'); });
    const gy = evs.filter(function (e) { return e.loai === 'goi_y'; }).map(function (e) { return e.du_lieu.cap || 0; });
    if (gy.length) phan.push('xin gợi ý cấp ' + Math.max.apply(null, gy));
    evs.filter(function (e) { return e.loai === 'tra_loi'; }).forEach(function (e) {
      const d = e.du_lieu || {};
      phan.push((d.buoc === 1 ? 'chọn phép ' : dongTu(c.dang) + ' ') + H(d.gia_tri) + (d.dung ? ' (đúng)' : '') + ' sau ' + giayChu((e.ms || 0) / 1000));
    });
    if (c.ket_qua === 'het_gio') phan.push('hết giờ chưa chốt');
    const ph = evs.filter(function (e) { return e.loai === 'phan_hoi_xem'; }).pop();
    if (ph) phan.push('xem cách làm ' + giayChu(ph.du_lieu.giay_xem) + (ph.du_lieu.nut === 'que_tinh' ? ' có mở que tính' : ''));
    return (c.game ? tenGame(c.game) + ': ' : '') + phan.join(', ');
  }

  /**
   * Chọn tối đa n câu sai tiêu biểu trong 28 ngày: ưu tiên lỗi lặp lại nhiều (đếm trong 28 ngày), câu chưa sửa,
   * rồi câu gần nhất; mỗi mã câu một lần; mỗi lỗi tối đa 8 câu để đủ loại lỗi.
   */
  function chonCauSai(cauDs, homNay, n) {
    const tu28 = congNgay(homNay, -27);
    const daSua = HT().tapDaSua(cauDs);
    const ung = cauDs.filter(function (c) { return c.ngay >= tu28 && c.ngay <= homNay && (saiCua(c).length || c.ket_qua === 'het_gio'); });
    const tan = {};
    ung.forEach(function (c) { (c.loi || []).forEach(function (m) { if (m !== 'khac') tan[m] = (tan[m] || 0) + 1; }); });
    const diem = function (c) { return Math.max.apply(null, [0].concat((c.loi || []).map(function (m) { return tan[m] || 0; }))); };
    const chuaSua = function (c) { return laKetQuaSai(c) && !daSua[c.cau] ? 1 : 0; };
    ung.sort(function (a, b) { return diem(b) - diem(a) || chuaSua(b) - chuaSua(a) || (a.luc < b.luc ? 1 : a.luc > b.luc ? -1 : 0) || (a.cau < b.cau ? -1 : 1); });
    const daMa = {}, theoLoi = {};
    const ra = [];
    ung.forEach(function (c) {
      if (ra.length >= n || daMa[c.ma_cau]) return;
      const chinh = (c.loi || []).filter(function (m) { return m !== 'khac'; })[0] || 'khac';
      if ((theoLoi[chinh] || 0) >= 8) return;
      daMa[c.ma_cau] = true;
      theoLoi[chinh] = (theoLoi[chinh] || 0) + 1;
      ra.push(c);
    });
    return { ds: ra, daSua: daSua };
  }

  const HOP_DONG_DAU_RA = {
    mo_ta: 'Trả về đúng một đối tượng JSON theo khuôn dưới đây, không kèm chữ nào khác. Game kiểm tra từng giá trị trước khi dùng; sai khuôn thì game bỏ đề xuất và dùng bộ lập kế hoạch có sẵn.',
    khuon: {
      nhan_xet_cho_phu_huynh: 'chuỗi tiếng Việt, tối đa 600 ký tự',
      nhiem_vu_de_xuat: [{ noi_dung: 'mã nội dung', ky_nang: 'mã kỹ năng', game: 'mã game', che_do: 'mã chế độ (tùy chọn)', so_cau: 'số nguyên 5 đến 30', ly_do: 'chuỗi ngắn' }],
      bai_hoc_goi_y: ['mã bài học'],
      loi_nhan_cho_be: 'chuỗi dưới 80 ký tự'
    },
    vi_du: {
      nhan_xet_cho_phu_huynh: 'Con đã vững bảng cộng qua 10. Lỗi chính tuần này là quên nhớ 1 khi cộng số có hai chữ số...',
      nhiem_vu_de_xuat: [
        { noi_dung: '2.11', ky_nang: 'cong-nho-2cs-2cs', game: 'dua-xe', so_cau: 12, ly_do: 'sửa lỗi quên nhớ' },
        { noi_dung: '2.8', ky_nang: 'cong-qua-10', game: 'lat-the', so_cau: 12, ly_do: 'ôn nền cho cộng có nhớ' }
      ],
      bai_hoc_goi_y: ['chuc-don-vi'],
      loi_nhan_cho_be: 'Rex tin con làm được phép cộng có nhớ rồi!'
    },
    quy_tac: [
      'noi_dung, ky_nang, game, che_do, bai_hoc_goi_y phải nằm trong gia_tri_hop_le',
      'ky_nang phải thuộc đúng noi_dung đi kèm (xem tu_dien.ky_nang)',
      'so_cau trong khoảng 5 đến 30',
      'loi_nhan_cho_be dưới 80 ký tự, lời khích lệ, không chê, không so sánh với bạn khác'
    ]
  };

  /**
   * Gói xuất "dao-khung-long/ho-so-hoc-tap" phiên bản 1 (spec 06 mục 5.9).
   * du: { hoSo, cauDs, vanDs, hocTap }; evs: nhật ký gốc của bé (để dựng câu thao tác; có thể rỗng).
   * o: { homNay, taoLuc (ISO có múi giờ), tuoi, kemNhatKy, biDanh }.
   * Không có tên thật, tên khủng long, mã bé, mã thiết bị. Cùng đầu vào thì cùng chuỗi JSON.
   * Trả về { goi, chuoi, token, so_byte, da_rut_gon }.
   */
  function goiXuat(du, evs, o) {
    o = o || {};
    const homNay = o.homNay;
    const hoSo = du.hoSo || {};
    const hs = hoSoTai(du, homNay);
    const cauDs = (du.cauDs || []).slice().sort(theoLuc);
    const vanDs = (du.vanDs || []).slice().sort(theoLuc);
    const biDanh = o.biDanh || 'be_1';
    const evTheoCau = {};
    (evs || []).forEach(function (e) { if (e.cau) (evTheoCau[e.cau] = evTheoCau[e.cau] || []).push(e); });

    const kyNang = hs.ky_nang.map(function (k) {
      return {
        ma: k.ma, ky_nang: k.ky_nang, muc: k.muc, can_giup: !!k.can_giup, so_cau: k.so_cau,
        tu_lam_14_ngay: k.tu_lam_14_ngay, tu_lam_dung_14_ngay: k.tu_lam_dung_14_ngay, giay_trung_vi: k.giay_trung_vi,
        loi_hay_gap: k.loi_hay_gap, cau_no: k.cau_no, lan_cuoi: k.lan_cuoi, on_lai_ke_tiep: k.on_lai_ke_tiep
      };
    });
    const tuan = dauTuan(homNay);
    const xuHuong = [3, 2, 1, 0].map(function (i) {
      const t = congNgay(tuan, -7 * i), d = congNgay(t, 6);
      const ds = cauDs.filter(function (c) { return c.ngay >= t && c.ngay <= d; });
      const r = tiLeTuLam(ds);
      return { tu: t, den: d, so_cau: ds.filter(daLam).length, tu_lam: r.tu_lam, ti_le_tu_lam_dung: r.ti_le };
    });
    const vanGanDay = function (n) {
      return vanDs.slice(-n).reverse().map(function (v) { return v.ngay + ' ' + gioPhut(v.luc) + ': ' + v.mo_ta; });
    };
    // Nhật ký chi tiết 7 ngày (tùy chọn): bỏ mã bé, phiên, mã sự kiện, thiết bị; rút gọn mã ván, câu thành v1, c1...
    let nhatKy7 = null;
    const maVan = {}, maCauNgan = {};
    const rut = function (bang, x, dau) { if (!x) return x; if (!bang[x]) bang[x] = dau + (Object.keys(bang).length + 1); return bang[x]; };
    if (o.kemNhatKy) {
      const tu7 = congNgay(homNay, -6);
      nhatKy7 = (evs || []).filter(function (e) {
        const n = String(e.luc).slice(0, 10);
        return n >= tu7 && n <= homNay && !/^phu_huynh_|^phien_/.test(e.loai);
      }).slice().sort(theoId).map(function (e) {
        const x = { loai: e.loai, ms: e.ms };
        if (e.van) x.van = rut(maVan, e.van, 'v');
        if (e.cau) x.cau = rut(maCauNgan, e.cau, 'c');
        if (e.loai === 'van_bat_dau' || !e.van) { x.luc = e.luc; if (e.game) x.game = e.game; if (e.man) x.man = e.man; }
        let d = e.du_lieu || {};
        if (d.on_lai_cua || d.sua_duoc_cau || (d.cau_cuoi && d.cau_cuoi.cau)) {
          d = JSON.parse(JSON.stringify(d));
          if (d.on_lai_cua) d.on_lai_cua = rut(maCauNgan, d.on_lai_cua, 'c');
          if (d.sua_duoc_cau) d.sua_duoc_cau = rut(maCauNgan, d.sua_duoc_cau, 'c');
          if (d.cau_cuoi && d.cau_cuoi.cau) d.cau_cuoi.cau = rut(maCauNgan, d.cau_cuoi.cau, 'c');
        }
        x.du_lieu = d;
        return x;
      });
    }
    const dongCauSai = function (c, daSua) {
      const x = {
        ma_cau: c.ma_cau, de: String(c.de || '').length > 220 ? String(c.de).slice(0, 218) + '…' : c.de, dap_an: c.dap_an,
        be_chon: c.ket_qua === 'het_gio' && !saiCua(c).length ? ['het_gio'] : saiCua(c),
        loi: c.loi || [], thao_tac: thaoTacNgan(evTheoCau[c.cau], c), giay: c.giay, ngay: c.ngay,
        da_sua: !!daSua[c.cau]
      };
      if (c.buoc1) x.buoc_chon_phep = c.buoc1;
      if (maCauNgan[c.cau]) x.cau_trong_nhat_ky = maCauNgan[c.cau];
      return x;
    };

    const dung = function (soCauSai, soVan) {
      const cs = chonCauSai(cauDs, homNay, soCauSai);
      const cauSai = cs.ds.map(function (c) { return dongCauSai(c, cs.daSua); });
      // Từ điển: chỉ các mã có mặt
      const maNd = motLan(kyNang.map(function (k) { return k.ma; }).concat(cs.ds.map(function (c) { return c.noi_dung; })).filter(Boolean)).sort(soSanhMaNoiDung);
      const tienQuyet = {};
      maNd.forEach(function (m) { if (NH().TIEN_QUYET[m]) tienQuyet[m] = NH().TIEN_QUYET[m].slice(); });
      const maNdDu = motLan(maNd.concat(Object.keys(tienQuyet).reduce(function (r, k) { return r.concat(tienQuyet[k]); }, []))).sort(soSanhMaNoiDung);
      const noiDung = {};
      maNdDu.forEach(function (m) { noiDung[m] = tenNoiDung(m); });
      const maLoi = [];
      kyNang.forEach(function (k) { (k.loi_hay_gap || []).forEach(function (l) { maLoi.push(l.ma); }); });
      cauSai.forEach(function (c) { c.loi.forEach(function (m) { maLoi.push(m); }); if (c.buoc_chon_phep) { /* lỗi bước 1 đã nằm trong c.loi */ } });
      vanDs.slice(-soVan).forEach(function (v) { Object.keys(v.loi || {}).forEach(function (m) { maLoi.push(m); }); });
      const loi = {};
      motLan(maLoi).sort().forEach(function (m) { loi[m] = moTaLoi(m); });
      const maKy = motLan(kyNang.map(function (k) { return k.ky_nang; }).concat(cs.ds.map(function (c) { return c.ky_nang; })).filter(Boolean)).sort();
      const tenKy = {};
      maKy.forEach(function (k) { tenKy[k] = { noi_dung: NH().KY_NANG[k] ? NH().KY_NANG[k].noi_dung : null, ten: NH().KY_NANG[k] ? NH().KY_NANG[k].ten : tenKyNang(k) }; });
      const maGame = motLan(vanDs.map(function (v) { return v.game; }).filter(Boolean)).sort();
      const game = {};
      maGame.forEach(function (g) { game[g] = tenGame(g); });

      const cheDo = {};
      tatCaMan().forEach(function (m) { if (m.che_do) (cheDo[m.game] = cheDo[m.game] || []).indexOf(m.che_do) < 0 && cheDo[m.game].push(m.che_do); });
      Object.keys(cheDo).forEach(function (g) { cheDo[g].sort(); });
      const hopDong = JSON.parse(JSON.stringify(HOP_DONG_DAU_RA));
      hopDong.gia_tri_hop_le = {
        noi_dung: Object.keys(NH().NOI_DUNG).sort(soSanhMaNoiDung),
        ky_nang: NH().THU_TU_KY_NANG.filter(function (k) { return NH().KY_NANG[k]; }),
        game: Object.keys(DAO().TEN_GAME).filter(function (g) { return g !== 'dau-truong'; }),
        che_do: cheDo,
        bai_hoc: motLan(Object.keys(NH().KY_NANG).map(function (k) { return NH().KY_NANG[k].bai_hoc; }).filter(Boolean)).sort()
      };
      const goi = {
        loai_goi: 'dao-khung-long/ho-so-hoc-tap',
        phien_ban: 1,
        tao_luc: o.taoLuc || null,
        be: { bi_danh: biDanh, tuoi: o.tuoi != null ? o.tuoi : (hoSo.tuoi_khi_nhap || null), lop: hoSo.lop || null, bai_dang_hoc: hoSo.bai_dang_hoc || null, phong_cach: hoSo.phong_cach || null },
        huong_dan: 'Bạn là trợ lý giúp phụ huynh của một bé học Toán lớp 2 theo SGK Kết nối tri thức với cuộc sống. Gói này tóm tắt 4 tuần bé chơi game Đảo Khủng Long: ' +
          'ho_so.ky_nang là từng kỹ năng với mức thành thạo (tu_dien.muc, từ thấp tới cao), tỉ lệ tự làm đúng 14 ngày (câu đúng ngay, không gợi ý, chia cho câu không gợi ý), ' +
          'lỗi hay gặp kèm ví dụ thật "đề→bé chọn"; van_gan_day là 20 ván gần nhất; cau_sai_tieu_bieu là các câu sai có lỗi lặp lại, kèm câu mô tả thao tác của bé. ' +
          'Mọi mã có giải nghĩa trong tu_dien; tu_dien.tien_quyet cho biết nội dung nào là nền của nội dung nào. ' +
          'Hãy: (1) nhận xét cho phụ huynh ngắn gọn, cụ thể: con vững gì, lỗi chính là gì và vì sao (dựa vào thao tác), (2) đề xuất nhiệm vụ tuần tới, ưu tiên sửa lỗi lặp lại và ôn nội dung nền, ' +
          '(3) một lời nhắn khích lệ cho bé. Dạy đúng cách của SGK (đặt tính, que tính, tách để làm tròn 10). Không chê, không so sánh với bạn khác. Trả lời bằng JSON đúng hop_dong_dau_ra.',
        tu_dien: { noi_dung: noiDung, ky_nang: tenKy, loi: loi, game: game, muc: MUC.slice(), tien_quyet: tienQuyet },
        ho_so: {
          ngay: homNay,
          ky_nang: kyNang,
          so_thich: hs.so_thich,
          nhip: hs.nhip,
          xu_huong_4_tuan: xuHuong,
          tong: hs.tong
        },
        van_gan_day: vanGanDay(soVan),
        cau_sai_tieu_bieu: cauSai,
        hop_dong_dau_ra: hopDong
      };
      if (nhatKy7) {
        goi.ghi_chu_nhat_ky = 'nhat_ky_7_ngay: từng sự kiện của 7 ngày gần nhất theo thứ tự thời gian (lược đồ sự kiện v1, bỏ mã bé và thiết bị). ms là mili giây từ lúc câu hiện (sự kiện trong câu) hoặc từ lúc ván bắt đầu; mã ván, mã câu rút gọn thành v1, c1; cau_trong_nhat_ky ở câu sai tiêu biểu trỏ tới mã câu này.';
        goi.nhat_ky_7_ngay = nhatKy7;
      }
      return goi;
    };

    let soCauSai = 30, soVan = 20, daRutGon = false;
    let goi = dung(soCauSai, soVan);
    let chuoi = jsonGon(goi);
    // Mặc định phải dưới 30 000 token: bớt câu sai rồi bớt ván nếu cần (tùy chọn kèm nhật ký thì không bớt)
    while (!o.kemNhatKy && uocLuongToken(chuoi) > TOI_DA_TOKEN && (soCauSai > 10 || soVan > 5)) {
      if (soCauSai > 10) soCauSai -= 5; else soVan -= 5;
      daRutGon = true;
      goi = dung(soCauSai, soVan);
      chuoi = jsonGon(goi);
    }
    return { goi: goi, chuoi: chuoi, token: uocLuongToken(chuoi), so_byte: soByte(chuoi), da_rut_gon: daRutGon };
  }

  window.BaoCao = {
    MUC: MUC,
    TEN_MUC: TEN_MUC,
    TEN_CAM_XUC: TEN_CAM_XUC,
    TOI_DA_TOKEN: TOI_DA_TOKEN,
    VIEC_CUNG_CON: VIEC_CUNG_CON,
    // Ngày, số
    dauTuan: dauTuan,
    thuNgay: thuNgay,
    ngayNgan: ngayNgan,
    khoangTuan: khoangTuan,
    so1: so1,
    giayChu: giayChu,
    phanTram: phanTram,
    phutChu: phutChu,
    // Định nghĩa
    daLam: daLam,
    tuLam: tuLam,
    tuLamDung: tuLamDung,
    tiLeTuLam: tiLeTuLam,
    laCauSai: laCauSai,
    // Tên
    tenKyNang: tenKyNang,
    tenNoiDung: tenNoiDung,
    tenLoi: tenLoi,
    hayLoi: hayLoi,
    moTaLoi: moTaLoi,
    tenGame: tenGame,
    tenManNgan: tenManNgan,
    deNgan: deNgan,
    hienGT: hienGT,
    conRa: conRa,
    // Màn hình
    hoSoTai: hoSoTai,
    tongQuanTuan: tongQuanTuan,
    viDuCauSai: viDuCauSai,
    thichNhat: thichNhat,
    nhatKy: nhatKy,
    khopLoc: khopLoc,
    dongCau: dongCau,
    cacNgayCoChoi: cacNgayCoChoi,
    moTaThaoTac: moTaThaoTac,
    moTaSuKien: moTaSuKien,
    dongThoiGian: dongThoiGian,
    nhanXet: nhanXet,
    banDoKyNang: banDoKyNang,
    chiTietNoiDung: chiTietNoiDung,
    manCuaNoiDung: manCuaNoiDung,
    keHoachTuan: keHoachTuan,
    viecCungCon: viecCungCon,
    // Gói xuất
    soByte: soByte,
    jsonGon: jsonGon,
    uocLuongToken: uocLuongToken,
    thaoTacNgan: thaoTacNgan,
    chonCauSai: chonCauSai,
    goiXuat: goiXuat
  };
})();
