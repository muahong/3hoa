/* ============================================================
   hoc-tap.js – Ba lớp dữ liệu tính từ nhật ký gốc (hàm thuần, không đụng kho)
   1. Tóm tắt câu   2. Tóm tắt ván (kèm câu mô tả tiếng Việt)   3. Hồ sơ học tập
   Cùng đầu vào thì cùng đầu ra (thứ tự khóa cố định) để "tính lại từ nhật ký" khớp từng byte.
   Cũng gồm: mức thành thạo 5 bậc, cờ Cần giúp, quả mọng, sao, các mức lớn của khủng long.
   API: window.HocTap
   ============================================================ */
(function () {
  'use strict';

  const MUC = ['chua_hoc', 'lam_quen', 'dang_luyen', 'da_thuoc', 'vung_chac'];
  const TEN_MUC = { chua_hoc: 'Chưa học', lam_quen: 'Làm quen', dang_luyen: 'Đang luyện', da_thuoc: 'Đã thuộc', vung_chac: 'Vững chắc' };
  const KET_QUA_DUNG = { dung_ngay: 1, dung_sau_goi_y: 1, dung_lan_2: 1 };
  const MOC_ON = [1, 3, 7, 14, 30];

  /** Các mức lớn của khủng long chính (quả mọng cần có, số nội dung đã thuộc, số đấu trường thắng). */
  const MUC_LON = [
    { ma: 'trung', ten: 'Trứng', qua_mong: 0 },
    { ma: 'lay_dong', ten: 'Trứng lay động', qua_mong: 0, can_cau_dung: 1 },
    { ma: 'so_sinh', ten: 'Sơ sinh', qua_mong: 0, can_van_xong: 1 },
    { ma: 'nhi', ten: 'Nhí', qua_mong: 500 },
    { ma: 'thieu_nien', ten: 'Thiếu niên', qua_mong: 1200, da_thuoc: 3 },
    { ma: 'truong_thanh', ten: 'Trưởng thành', qua_mong: 2500, da_thuoc: 8 },
    { ma: 'huyen_thoai', ten: 'Huyền thoại', qua_mong: 5000, dau_truong: 1 }
  ];

  /* ---------------- Tiện ích ---------------- */

  function ngayCua(luc) { return String(luc || '').slice(0, 10); }
  function soNgay(ngay) { const p = String(ngay).split('-'); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000); }
  function congNgay(ngay, n) {
    const d = new Date((soNgay(ngay) + n) * 86400000);
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  }
  function trungVi(ds) {
    if (!ds.length) return null;
    const a = ds.slice().sort(function (x, y) { return x - y; });
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2 * 10) / 10;
  }
  function lam1(x) { return Math.round(x * 10) / 10; }
  function lam2(x) { return Math.round(x * 100) / 100; }
  function theoId(a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; }
  function tenGame(g) {
    if (window.Dao && window.Dao.TEN_GAME && window.Dao.TEN_GAME[g]) return window.Dao.TEN_GAME[g];
    return { 'dua-xe': 'Đua Xe', 'chem-trai-cay': 'Chém Trái Cây', 'ban-thien-thach': 'Bắn Thiên Thạch', 'truyen-tranh': 'Truyện Tranh', 'lat-the': 'Lật Thẻ Anh Em', 'xep-hinh-so': 'Xếp Hình Số' }[g] || g;
  }

  /* ---------------- 1. Tóm tắt câu ---------------- */

  /** Tóm tắt một câu từ các sự kiện của nó (đã sắp theo thời gian). */
  function tomTatCau(evs) {
    const hien = evs.find(function (e) { return e.loai === 'cau_hien'; });
    if (!hien) return null;
    const ket = evs.filter(function (e) { return e.loai === 'cau_ket_thuc'; }).pop() || null;
    const traLoi = evs.filter(function (e) { return e.loai === 'tra_loi'; });
    const d = hien.du_lieu || {};
    let goiYCap = 0;
    let doiY = 0;
    let soChon = 0;
    const loi = [];
    evs.forEach(function (e) {
      if (e.loai === 'goi_y' && e.du_lieu && e.du_lieu.cap > goiYCap) goiYCap = e.du_lieu.cap;
      if (e.loai !== 'thao_tac' || !e.du_lieu) return;
      const k = e.du_lieu.kieu;
      if (k === 'chon') { soChon++; if (soChon > 1) doiY++; }
      else if (k === 'doi_lan' || k === 'bo_chon' || k === 'doi_cot' || k === 'xoa' || k === 'bo_ra') doiY++;
    });
    traLoi.forEach(function (e) {
      ((e.du_lieu && e.du_lieu.loi) || []).forEach(function (m) { if (loi.indexOf(m) < 0) loi.push(m); });
    });
    const cuoi = traLoi[traLoi.length - 1];
    const b1 = traLoi.find(function (e) { return e.du_lieu && e.du_lieu.buoc === 1; });
    const t = {
      cau: hien.cau,
      van: hien.van || null,
      be: hien.be,
      luc: hien.luc,
      ngay: ngayCua(hien.luc),
      game: hien.game || null,
      vung: hien.vung != null ? hien.vung : null,
      man: hien.man || null,
      ma_cau: d.ma_cau,
      noi_dung: d.noi_dung,
      ky_nang: d.ky_nang,
      dang: d.dang,
      de: d.de,
      cau_truc: d.cau_truc || null,
      dap_an: d.dap_an,
      on_lai: !!d.on_lai,
      on_lai_cua: d.on_lai_cua || null,
      ket_qua: ket && ket.du_lieu ? ket.du_lieu.ket_qua : 'bo_qua',
      giay: ket && ket.du_lieu && typeof ket.du_lieu.tong_giay === 'number' ? ket.du_lieu.tong_giay : null,
      cac_tra_loi: traLoi.map(function (e) { return e.du_lieu ? e.du_lieu.gia_tri : null; }),
      so_lan_doi_y: doiY,
      goi_y_cap: goiYCap,
      loi: loi,
      sua_duoc_cau: ket && ket.du_lieu && ket.du_lieu.sua_duoc_cau ? ket.du_lieu.sua_duoc_cau : null,
      chu_dong: cuoi && cuoi.du_lieu && cuoi.du_lieu.chu_dong === false ? false : true,
      tra_loi_sai: traLoi.filter(function (e) { return e.du_lieu && e.du_lieu.dung === false; }).map(function (e) { return e.du_lieu.gia_tri; })
    };
    // Bài hai bước: bước chọn phép tính chấm riêng (bé biết tính nhưng chưa hiểu đề, hay ngược lại)
    if (b1) t.buoc1 = { gia_tri: b1.du_lieu.gia_tri, dung: !!b1.du_lieu.dung };
    return t;
  }

  /** Tóm tắt mọi câu trong một danh sách sự kiện (ví dụ một ván). */
  function tomTatCacCau(evs) {
    const nhom = {};
    const thuTu = [];
    evs.slice().sort(theoId).forEach(function (e) {
      if (!e.cau) return;
      if (!nhom[e.cau]) { nhom[e.cau] = []; thuTu.push(e.cau); }
      nhom[e.cau].push(e);
    });
    return thuTu.map(function (c) { return tomTatCau(nhom[c]); }).filter(Boolean);
  }

  /** Đánh dấu câu nào đã sửa được (câu ôn lại làm đúng, lần theo chuỗi on_lai_cua). Trả về tập mã câu. */
  function tapDaSua(cauDs) {
    const theoMa = {};
    cauDs.forEach(function (c) { theoMa[c.cau] = c; });
    const daSua = {};
    cauDs.forEach(function (c) {
      let m = c.sua_duoc_cau;
      let buoc = 0;
      while (m && !daSua[m] && buoc < 20) {
        daSua[m] = true;
        m = theoMa[m] ? theoMa[m].on_lai_cua : null;
        buoc++;
      }
    });
    return daSua;
  }

  /* ---------------- 2. Tóm tắt ván ---------------- */

  function moTaVan(t, tenMan) {
    const phan = [];
    phan.push('Ván ' + tenGame(t.game) + (tenMan ? ' ' + tenMan : '') + ', ' + t.so_cau + ' câu');
    phan.push('đúng ngay ' + t.dung_ngay);
    if (t.dung_sau_goi_y) phan.push('nhờ gợi ý ' + t.dung_sau_goi_y);
    if (t.dung_lan_2) phan.push('đúng lần 2 ' + t.dung_lan_2);
    if (t.sai) phan.push('sai ' + t.sai + (t.sua_duoc ? ' rồi sửa được ' + (t.sua_duoc >= t.sai ? 'cả ' : '') + t.sua_duoc : ''));
    let cau = phan.join(', ') + '.';
    const loi = Object.keys(t.loi).filter(function (m) { return m !== 'khac'; });
    if (loi.length) {
      const LOI = (window.NganHang && window.NganHang.LOI) || {};
      cau += ' Lỗi: ' + loi.map(function (m) { return ((LOI[m] && LOI[m].mo_ta) || m).replace(/^./, function (c) { return c.toLowerCase(); }) + ' (' + t.loi[m] + ' lần)'; }).join('; ') + '.';
    }
    if (t.bo_do) cau += ' Con dừng giữa chừng.';
    if (t.cam_xuc) cau += ' Con chọn ' + { vui: 'Vui', binh_thuong: 'Bình thường', chan: 'Chán' }[t.cam_xuc] + '.';
    return cau;
  }

  /** Tóm tắt một ván từ sự kiện của nó. tenMan: tên hiển thị của màn (tùy chọn). */
  function tomTatVan(evs, tenMan) {
    evs = evs.slice().sort(theoId);
    const bd = evs.find(function (e) { return e.loai === 'van_bat_dau'; });
    const kt = evs.filter(function (e) { return e.loai === 'van_ket_thuc'; }).pop();
    if (!bd && !kt) return null;
    const goc = bd || kt;
    const cauDs = tomTatCacCau(evs);
    const daSua = tapDaSua(cauDs);
    const loi = {};
    let dungNgay = 0, nhoGoiY = 0, lan2 = 0, sai = 0, suaDuoc = 0;
    cauDs.forEach(function (c) {
      if (c.ket_qua === 'dung_ngay') dungNgay++;
      else if (c.ket_qua === 'dung_sau_goi_y') nhoGoiY++;
      else if (c.ket_qua === 'dung_lan_2') lan2++;
      else if (c.ket_qua === 'sai' || c.ket_qua === 'het_gio') sai++;
      if (c.sua_duoc_cau) suaDuoc++;
      c.loi.forEach(function (m) { loi[m] = (loi[m] || 0) + 1; });
    });
    const camXuc = evs.filter(function (e) { return e.loai === 'cam_xuc'; }).pop();
    const kd = (kt && kt.du_lieu) || {};
    const t = {
      van: goc.van,
      be: goc.be,
      luc: goc.luc,
      ngay: ngayCua(goc.luc),
      game: goc.game || null,
      vung: goc.vung != null ? goc.vung : null,
      man: goc.man || null,
      nguon: bd && bd.du_lieu ? bd.du_lieu.nguon || 'tu_chon' : 'tu_chon',
      nhiem_vu: bd && bd.du_lieu && bd.du_lieu.nhiem_vu ? bd.du_lieu.nhiem_vu : null,
      giay: typeof kd.giay === 'number' ? kd.giay : null,
      so_cau: cauDs.length,
      dung_ngay: dungNgay,
      dung_sau_goi_y: nhoGoiY,
      dung_lan_2: lan2,
      sai: sai,
      sua_duoc: suaDuoc,
      sao: typeof kd.sao === 'number' ? kd.sao : 0,
      qua_mong: typeof kd.qua_mong === 'number' ? kd.qua_mong : 0,
      cam_xuc: camXuc && camXuc.du_lieu ? camXuc.du_lieu.muc : null,
      bo_do: kt ? !!kd.bo_do : true,
      loi: loi,
      cau_sai: cauDs.filter(function (c) { return c.ket_qua === 'sai' && !daSua[c.cau]; }).map(function (c) { return c.cau; }),
      mo_ta: ''
    };
    t.mo_ta = moTaVan(t, tenMan);
    return t;
  }

  /* ---------------- Mức thành thạo ---------------- */

  function dieuKienThuoc(cuaSo, coNo) {
    const tuLam = cuaSo.filter(function (c) { return c.goi_y_cap === 0 && c.ket_qua !== 'bo_qua'; });
    if (tuLam.length < 20 || coNo) return false;
    const dung = tuLam.filter(function (c) { return c.ket_qua === 'dung_ngay'; }).length;
    if (dung / tuLam.length < 0.9) return false;
    const ngay = {};
    tuLam.forEach(function (c) { ngay[c.ngay] = 1; });
    return Object.keys(ngay).length >= 2;
  }

  /**
   * Mức thành thạo của một kỹ năng.
   * cauDs: tóm tắt câu của kỹ năng (mọi lúc); daSua: tập câu đã sửa; homNay: 'YYYY-MM-DD'
   */
  function mucKyNang(cauDs, daSua, homNay) {
    cauDs = cauDs.filter(function (c) { return c.ket_qua !== 'bo_qua'; }).sort(function (a, b) { return a.luc < b.luc ? -1 : a.luc > b.luc ? 1 : 0; });
    const tu14 = congNgay(homNay, -13);
    const tu7 = congNgay(homNay, -6);
    const cuaSo14 = cauDs.filter(function (c) { return c.ngay >= tu14 && c.ngay <= homNay; });
    const no = cauDs.filter(function (c) { return c.ket_qua === 'sai' && !daSua[c.cau] && c.ngay >= tu14; });
    const tuLam14 = cuaSo14.filter(function (c) { return c.goi_y_cap === 0; });
    const dung14 = tuLam14.filter(function (c) { return c.ket_qua === 'dung_ngay'; });
    const tiLe = tuLam14.length ? lam2(dung14.length / tuLam14.length) : null;

    // Lỗi hay gặp 14 ngày (kèm tối đa 3 câu thật) và lỗi lặp trong 7 ngày
    const demLoi = {};
    const viDu = {};
    const lap7 = {};
    cuaSo14.forEach(function (c) {
      if (c.ket_qua === 'dung_ngay' && !c.loi.length) return;
      c.loi.forEach(function (m) {
        demLoi[m] = (demLoi[m] || 0) + 1;
        const sai = c.tra_loi_sai || c.cac_tra_loi.filter(function (v) { return v !== c.dap_an; });
        const vd = String(c.ma_cau || '').split('|').pop() + '→' + (sai.length ? sai[0] : '?');
        viDu[m] = viDu[m] || [];
        if (viDu[m].indexOf(vd) < 0 && viDu[m].length < 3) viDu[m].push(vd);
        if (c.ngay >= tu7) lap7[m] = (lap7[m] || 0) + 1;
      });
    });
    const loiHayGap = Object.keys(demLoi).sort(function (a, b) { return demLoi[b] - demLoi[a] || (a < b ? -1 : 1); }).slice(0, 3)
      .map(function (m) { return { ma: m, lan: demLoi[m], vi_du: viDu[m] }; });

    let muc;
    let ngayThuoc = null;
    if (!cauDs.length) muc = 'chua_hoc';
    else if (cauDs.length < 10) muc = 'lam_quen';
    else {
      // Ngày đầu tiên đạt điều kiện thuộc (xét cửa sổ 14 ngày kết thúc ở từng ngày có chơi)
      const cacNgay = [];
      cauDs.forEach(function (c) { if (cacNgay.indexOf(c.ngay) < 0) cacNgay.push(c.ngay); });
      for (let i = 0; i < cacNgay.length && !ngayThuoc; i++) {
        const n = cacNgay[i];
        const tu = congNgay(n, -13);
        const cs = cauDs.filter(function (c) { return c.ngay >= tu && c.ngay <= n; });
        const coNo = cs.some(function (c) { return c.ket_qua === 'sai' && !daSua[c.cau]; });
        if (dieuKienThuoc(cs, coNo)) ngayThuoc = n;
      }
      // Đã thuộc rồi thì giữ, chỉ về Đang luyện khi có dấu hiệu quên: còn câu nợ, hoặc tự làm đúng dưới 85% (từ 5 câu)
      const thuocBayGio = ngayThuoc
        ? no.length === 0 && (tuLam14.length < 5 || tiLe >= 0.85)
        : dieuKienThuoc(cuaSo14, no.length > 0);
      if (thuocBayGio) {
        muc = 'da_thuoc';
        // Vững chắc: vẫn đúng từ 85% ở các lần ôn sau 1, 3, 7, 14 ngày
        let moc = 0;
        let lanOn = 0;
        cacNgay.forEach(function (n) {
          if (!ngayThuoc || moc >= 4 || n <= ngayThuoc) return;
          if (soNgay(n) - soNgay(ngayThuoc) < MOC_ON[moc]) return;
          const trongNgay = cauDs.filter(function (c) { return c.ngay === n && c.goi_y_cap === 0; });
          if (trongNgay.length < 3) return;
          const d = trongNgay.filter(function (c) { return c.ket_qua === 'dung_ngay'; }).length;
          if (d / trongNgay.length >= 0.85) { moc++; lanOn++; }
        });
        if (lanOn >= 4) muc = 'vung_chac';
      } else muc = 'dang_luyen';
    }

    const canGiup = (tuLam14.length >= 10 && tiLe !== null && tiLe < 0.5) ||
      Object.keys(lap7).some(function (m) { return m !== 'khac' && lap7[m] >= 3; });

    let onLai = null;
    const lanCuoi = cauDs.length ? cauDs[cauDs.length - 1].ngay : null;
    if (muc === 'da_thuoc' || muc === 'vung_chac') {
      // Ôn cách quãng 1, 3, 7, 14, 30 ngày sau ngày thuộc; mốc nào đã có buổi ôn thì sang mốc sau
      const goc = ngayThuoc || lanCuoi;
      let k = 0;
      cauDs.forEach(function (c) { if (k < MOC_ON.length - 1 && soNgay(c.ngay) - soNgay(goc) >= MOC_ON[k]) k++; });
      onLai = congNgay(goc, MOC_ON[k]);
      if (onLai <= lanCuoi) onLai = congNgay(lanCuoi, 1);
    } else if (muc === 'dang_luyen' || muc === 'lam_quen') onLai = congNgay(lanCuoi, 1);

    const giay = dung14.map(function (c) { return c.giay; }).filter(function (x) { return typeof x === 'number'; });
    return {
      muc: muc,
      can_giup: !!canGiup,
      so_cau: cauDs.length,
      tu_lam_14_ngay: tuLam14.length,
      tu_lam_dung_14_ngay: tiLe,
      giay_trung_vi: trungVi(giay),
      loi_hay_gap: loiHayGap,
      ngay_thuoc: ngayThuoc,
      on_lai_ke_tiep: onLai,
      lan_cuoi: lanCuoi,
      cau_no: no.length
    };
  }

  /* ---------------- 3. Hồ sơ học tập ---------------- */

  /**
   * Hồ sơ học tập của một bé, tính hoàn toàn từ tóm tắt câu và tóm tắt ván.
   * homNay: ngày tham chiếu 'YYYY-MM-DD' (để cùng đầu vào cho cùng kết quả).
   */
  function hoSoHocTap(be, cauDs, vanDs, homNay) {
    const KY = (window.NganHang && window.NganHang.KY_NANG) || {};
    const thuTu = (window.NganHang && window.NganHang.THU_TU_KY_NANG) || [];
    const daSua = tapDaSua(cauDs);
    const theoKy = {};
    cauDs.forEach(function (c) { if (c.ky_nang) (theoKy[c.ky_nang] = theoKy[c.ky_nang] || []).push(c); });
    const kyNang = Object.keys(theoKy).sort(function (a, b) {
      const ia = thuTu.indexOf(a), ib = thuTu.indexOf(b);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || (a < b ? -1 : 1);
    }).map(function (k) {
      const m = mucKyNang(theoKy[k], daSua, homNay);
      return Object.assign({ ma: (KY[k] && KY[k].noi_dung) || theoKy[k][0].noi_dung, ky_nang: k }, m);
    });

    const tu28 = congNgay(homNay, -27);
    const van28 = vanDs.filter(function (v) { return v.ngay >= tu28 && v.ngay <= homNay; });
    const theLoai = {};
    const nguon = {};
    let vui = 0, coCamXuc = 0;
    const ngayChoi = {};
    const gio = {};
    van28.forEach(function (v) {
      if (v.nguon === 'tu_chon') theLoai[v.game] = (theLoai[v.game] || 0) + 1;
      nguon[v.nguon] = (nguon[v.nguon] || 0) + 1;
      if (v.cam_xuc) { coCamXuc++; if (v.cam_xuc === 'vui') vui++; }
      ngayChoi[v.ngay] = (ngayChoi[v.ngay] || 0) + (v.giay || 0);
      const h = String(v.luc).slice(11, 13);
      gio[h] = (gio[h] || 0) + 1;
    });
    const soNgayChoi = Object.keys(ngayChoi).length;
    const tongGiay = Object.keys(ngayChoi).reduce(function (s, k) { return s + ngayChoi[k]; }, 0);
    const gioNhieu = Object.keys(gio).sort(function (a, b) { return gio[b] - gio[a] || (a < b ? -1 : 1); })[0];

    const tu14 = congNgay(homNay, -13);
    const cauNo = cauDs.filter(function (c) { return c.ket_qua === 'sai' && !daSua[c.cau] && c.ngay >= tu14 && c.cau_truc; })
      .sort(function (a, b) { return a.luc < b.luc ? 1 : -1; })
      .slice(0, 20)
      .map(function (c) { return { cau: c.cau, ma_cau: c.ma_cau, ky_nang: c.ky_nang, cau_truc: c.cau_truc, ngay: c.ngay }; });

    return {
      be: be,
      ngay: homNay,
      ky_nang: kyNang,
      so_thich: {
        the_loai_tu_chon: theLoai,
        nguon_van: nguon,
        ti_le_vui: coCamXuc ? lam2(vui / coCamXuc) : null
      },
      nhip: {
        ngay_choi_4_tuan: soNgayChoi,
        phut_trung_binh_ngay: soNgayChoi ? lam1(tongGiay / 60 / soNgayChoi) : 0,
        gio_hay_choi: gioNhieu != null ? gioNhieu + ':00-' + String((+gioNhieu + 1) % 24).padStart(2, '0') + ':00' : null
      },
      cau_no: cauNo,
      tong: {
        so_van: vanDs.length,
        so_cau: cauDs.length,
        qua_mong_tu_van: vanDs.reduce(function (s, v) { return s + (v.qua_mong || 0); }, 0)
      }
    };
  }

  /** Bản đồ nhanh ky_nang -> mức từ hồ sơ học tập. */
  function bangMuc(hoSo) {
    const m = {};
    ((hoSo && hoSo.ky_nang) || []).forEach(function (k) { m[k.ky_nang] = k; });
    return m;
  }

  /* ---------------- Phần thưởng ---------------- */

  /** Quả mọng của một câu vừa xong. mucKy: mức của kỹ năng lúc bắt đầu ván. */
  function quaMongCau(ketQua, suaDuoc, mucKy) {
    let q = 0;
    let loai = null;
    if (ketQua === 'dung_ngay') { q = mucKy === 'vung_chac' ? 1 : 3; loai = mucKy === 'vung_chac' ? 'vung_chac' : 'tu_lam'; }
    else if (ketQua === 'dung_sau_goi_y' || ketQua === 'dung_lan_2') { q = 1; loai = 'nho_goi_y'; }
    return { qua_mong: q, loai: loai, them_sua: suaDuoc && KET_QUA_DUNG[ketQua] ? 2 : 0 };
  }

  /** Số sao của một ván: theo tỉ lệ câu mới (không tính câu ôn lại) làm đúng ngay. */
  function saoCuaVan(soCauMoi, dungNgayMoi, boDo) {
    if (boDo || !soCauMoi) return 0;
    const r = dungNgayMoi / soCauMoi;
    return r >= 0.9 ? 3 : r >= 0.7 ? 2 : 1;
  }

  /** Mức lớn hiện tại của khủng long chính. tt: { qua_mong, so_da_thuoc, so_dau_truong, van_xong, co_cau_dung } */
  function mucLon(tt) {
    let muc = MUC_LON[0];
    for (let i = 1; i < MUC_LON.length; i++) {
      const m = MUC_LON[i];
      if ((tt.qua_mong || 0) < m.qua_mong) break;
      if (m.can_cau_dung && !tt.co_cau_dung && !(tt.van_xong > 0)) break;
      if (m.can_van_xong && !(tt.van_xong > 0)) break;
      if (m.da_thuoc && (tt.so_da_thuoc || 0) < m.da_thuoc) break;
      if (m.dau_truong && (tt.so_dau_truong || 0) < m.dau_truong) break;
      muc = m;
    }
    return muc;
  }
  function mucLonKeTiep(ma) {
    const i = MUC_LON.findIndex(function (m) { return m.ma === ma; });
    return i >= 0 && i < MUC_LON.length - 1 ? MUC_LON[i + 1] : null;
  }

  window.HocTap = {
    MUC: MUC,
    TEN_MUC: TEN_MUC,
    MUC_LON: MUC_LON,
    ngayCua: ngayCua,
    congNgay: congNgay,
    soNgay: soNgay,
    trungVi: trungVi,
    tomTatCau: tomTatCau,
    tomTatCacCau: tomTatCacCau,
    tapDaSua: tapDaSua,
    tomTatVan: tomTatVan,
    moTaVan: moTaVan,
    mucKyNang: mucKyNang,
    hoSoHocTap: hoSoHocTap,
    bangMuc: bangMuc,
    quaMongCau: quaMongCau,
    saoCuaVan: saoCuaVan,
    mucLon: mucLon,
    mucLonKeTiep: mucLonKeTiep,
    tenGame: tenGame
  };
})();
