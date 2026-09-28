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
  /** Khoảng cách tối thiểu (ngày) từ buổi ôn đạt trước đó tới buổi ôn thứ i: 1, 2, 4, 7, 16 (đúng hẹn thì rơi vào ngày 1, 3, 7, 14, 30). */
  function khoangOn(i) { const k = Math.min(i, MOC_ON.length - 1); return MOC_ON[k] - (k ? MOC_ON[k - 1] : 0); }
  /** Đã thuộc chỉ tụt về Đang luyện vì câu nợ khi có từ chừng này câu nợ, hoặc có câu nợ để quá chừng này ngày. */
  const TUT_NO = { so_cau: 2, so_ngay: 3 };
  /** Điều kiện Đã thuộc trong cửa sổ 14 ngày: tự làm (không gợi ý) từ 20 câu, đúng ngay từ 90%, ở ít nhất 2 ngày, không còn câu sai chưa sửa. */
  const DK_THUOC = { tu_lam: 20, ti_le: 0.9, so_ngay: 2 };
  /** Tỉ lệ câu mới làm đúng ngay để được 3 sao, 2 sao (dưới nữa là 1 sao). */
  const SAO = { ba: 0.9, hai: 0.7 };
  /** Quả mọng thưởng ngoài từng câu (app.js trao, trang Cách chơi đọc đúng các số này). */
  const THUONG = { ky_nang_da_thuoc: 50, xong_3_nhiem_vu: 20, thang_dau_truong: 100 };

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
    if (tuLam.length < DK_THUOC.tu_lam || coNo) return false;
    const dung = tuLam.filter(function (c) { return c.ket_qua === 'dung_ngay'; }).length;
    if (dung / tuLam.length < DK_THUOC.ti_le) return false;
    const ngay = {};
    tuLam.forEach(function (c) { ngay[c.ngay] = 1; });
    return Object.keys(ngay).length >= DK_THUOC.so_ngay;
  }

  /**
   * Bé còn thiếu gì để một kỹ năng thành Đã thuộc (cùng điều kiện với dieuKienThuoc, cửa sổ 14 ngày tới hôm nay).
   * cauDs: tóm tắt câu của kỹ năng đó; daSua: tapDaSua của mọi câu của bé.
   * Trả về { tu_lam, can_tu_lam, dung_ngay, ti_le, can_ti_le, so_ngay, can_so_ngay, cau_no, du }.
   */
  function tienDoThuoc(cauDs, daSua, homNay) {
    const tu = congNgay(homNay, -13);
    const cs = (cauDs || []).filter(function (c) { return c.ket_qua !== 'bo_qua' && c.ngay >= tu && c.ngay <= homNay; });
    const tuLam = cs.filter(function (c) { return c.goi_y_cap === 0; });
    const dung = tuLam.filter(function (c) { return c.ket_qua === 'dung_ngay'; }).length;
    const ngay = {};
    tuLam.forEach(function (c) { ngay[c.ngay] = 1; });
    const soNgayChoi = Object.keys(ngay).length;
    const no = cs.filter(function (c) { return c.ket_qua === 'sai' && !(daSua || {})[c.cau]; }).length;
    const tiLe = tuLam.length ? lam2(dung / tuLam.length) : null;
    return {
      tu_lam: tuLam.length, can_tu_lam: DK_THUOC.tu_lam,
      dung_ngay: dung, ti_le: tiLe, can_ti_le: DK_THUOC.ti_le,
      so_ngay: soNgayChoi, can_so_ngay: DK_THUOC.so_ngay,
      cau_no: no,
      du: tuLam.length >= DK_THUOC.tu_lam && dung / tuLam.length >= DK_THUOC.ti_le && soNgayChoi >= DK_THUOC.so_ngay && no === 0
    };
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
    let soOn = 0; // số buổi ôn đạt sau ngày thuộc
    let onCuoi = null; // ngày thuộc hoặc buổi ôn đạt gần nhất
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
      // Đã thuộc rồi thì giữ, chỉ về Đang luyện khi có dấu hiệu quên: từ 2 câu nợ (hoặc một câu nợ để quá 3 ngày),
      // hoặc tự làm đúng dưới 85% (từ 5 câu). Một câu sai vừa xảy ra thì chưa tụt, bé còn làm lại được trong ván sau
      const quenVi = no.length >= TUT_NO.so_cau || no.some(function (c) { return soNgay(homNay) - soNgay(c.ngay) > TUT_NO.so_ngay; });
      const thuocBayGio = ngayThuoc
        ? !quenVi && (tuLam14.length < 5 || tiLe >= 0.85)
        : dieuKienThuoc(cuaSo14, no.length > 0);
      if (thuocBayGio) {
        muc = 'da_thuoc';
        // Vững chắc: đúng từ 85% ở 4 buổi ôn, từ ngày 1, 3, 7, 14 sau ngày thuộc và mỗi buổi cách buổi ôn đạt trước đó
        // ít nhất 1, 2, 4, 7 ngày (nghỉ lâu rồi chơi dồn mấy ngày liền thì không đủ)
        onCuoi = ngayThuoc || cauDs[cauDs.length - 1].ngay;
        cacNgay.forEach(function (n) {
          if (!ngayThuoc || soOn >= 4 || n <= ngayThuoc) return;
          if (soNgay(n) - soNgay(ngayThuoc) < MOC_ON[soOn] || soNgay(n) - soNgay(onCuoi) < khoangOn(soOn)) return;
          const trongNgay = cauDs.filter(function (c) { return c.ngay === n && c.goi_y_cap === 0; });
          if (trongNgay.length < 3) return;
          const d = trongNgay.filter(function (c) { return c.ket_qua === 'dung_ngay'; }).length;
          if (d / trongNgay.length >= 0.85) { soOn++; onCuoi = n; }
        });
        if (soOn >= 4) muc = 'vung_chac';
      } else muc = 'dang_luyen';
    }

    const canGiup = (tuLam14.length >= 10 && tiLe !== null && tiLe < 0.5) ||
      Object.keys(lap7).some(function (m) { return m !== 'khac' && lap7[m] >= 3; });

    let onLai = null;
    const lanCuoi = cauDs.length ? cauDs[cauDs.length - 1].ngay : null;
    if (muc === 'da_thuoc' || muc === 'vung_chac') {
      // Ôn cách quãng: mốc 1, 3, 7, 14, 30 ngày sau ngày thuộc, và cách buổi ôn đạt gần nhất 1, 2, 4, 7, 16 ngày;
      // buổi ôn chưa đạt thì ôn lại hôm sau
      const goc = ngayThuoc || lanCuoi;
      const theoMoc = congNgay(goc, MOC_ON[Math.min(soOn, MOC_ON.length - 1)]);
      const theoKhoang = congNgay(onCuoi || goc, khoangOn(soOn));
      onLai = theoMoc > theoKhoang ? theoMoc : theoKhoang;
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
    return r >= SAO.ba ? 3 : r >= SAO.hai ? 2 : 1;
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
    MOC_ON: MOC_ON,
    DK_THUOC: DK_THUOC,
    SAO: SAO,
    THUONG: THUONG,
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
    tienDoThuoc: tienDoThuoc,
    hoSoHocTap: hoSoHocTap,
    bangMuc: bangMuc,
    quaMongCau: quaMongCau,
    saoCuaVan: saoCuaVan,
    mucLon: mucLon,
    mucLonKeTiep: mucLonKeTiep,
    tenGame: tenGame
  };
})();
