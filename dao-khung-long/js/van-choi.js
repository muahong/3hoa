/* ============================================================
   van-choi.js – Vòng đời một ván chơi, dùng chung cho mọi thể loại game
   - Lấy câu từ ngân hàng, xếp câu sai quay lại sau 2 câu, đếm quả mọng và sao.
   - Ghi đủ chuỗi sự kiện cho mỗi câu: cau_hien → thao_tac… → (goi_y) → tra_loi → (phan_hoi_xem) → cau_ket_thuc.
   Game chỉ lo phần hình và thao tác, gọi các hàm dưới đây.
   API: window.VanChoi (hàm dựng)
   ============================================================ */
(function () {
  'use strict';

  const DOI_Y = { doi_lan: 1, chon: 1, bo_chon: 1, doi_cot: 1, xoa: 1 };
  const SAU_CAU = 2; // câu sai quay lại sau 2 câu
  const TOI_DA_ON_LAI = 2; // một câu quay lại tối đa 2 lần trong ván

  /**
   * o: { nk, game, vung, man: { id, cau, so_cau, tram_dung }, nguon, nhiemVu, hatGiong,
   *      mucKy: { ky_nang: 'da_thuoc' … }, cauNo: [...], lanGap: { ma_cau: số lần đã gặp }, viTri: ['lan_trai', …] }
   */
  function VanChoi(o) {
    this.o = o;
    this.nk = o.nk;
    this.man = o.man;
    this.hatGiong = o.hatGiong != null ? o.hatGiong : Math.floor(Math.random() * 2147483647);
    this.rng = window.NganHang.taoRng(this.hatGiong);
    this.ds = window.NganHang.lapDanhSach(o.man, this.rng, { cauNo: o.cauNo || [], soCau: o.soCau });
    this.hang = this.ds.slice();
    this.choOnLai = [];
    this.lanGap = Object.assign({}, o.lanGap || {});
    this.q = null;
    this.stt = 0;
    this.dem = { moi: 0, dungNgayMoi: 0, dungNgay: 0, nhoGoiY: 0, lan2: 0, sai: 0, suaDuoc: 0 };
    this.quaMong = { tong: 0, tu_lam: 0, nho_goi_y: 0, sua_duoc: 0, vung_chac: 0, so_tu_lam: 0, so_nho_goi_y: 0, so_sua_duoc: 0 };
    this.chuoiDung = 0;
    this.daKetThuc = false;
  }

  VanChoi.prototype.batDau = function (doKho) {
    this.vanId = this.nk.batDauVan({
      game: this.o.game, vung: this.o.vung, man: this.man.id,
      nguon: this.o.nguon || 'tu_chon', nhiem_vu: this.o.nhiemVu || null,
      do_kho: doKho || {}, hat_giong: this.hatGiong, so_cau_du_kien: this.ds.length
    });
    return this.vanId;
  };

  VanChoi.prototype.soCauDuKien = function () { return this.ds.length; };
  VanChoi.prototype.soCauMoiDaXong = function () { return this.dem.moi; };
  VanChoi.prototype.conCau = function () { return !!(this.hang.length || this.choOnLai.length || (this.q && !this.q.xong)); };

  /** Dạng của câu kế tiếp (không lấy ra): 'chon_dap_an' | 'nhap_so' | null khi hết câu. */
  VanChoi.prototype.dangKeTiep = function () {
    const den = this.choOnLai.find(function (x) { return x.con <= 0; });
    if (den) return den.dang;
    if (this.hang.length) return this.hang[0].dang;
    if (this.choOnLai.length) return this.choOnLai[0].dang;
    return null;
  };

  /** Lấy câu kế tiếp và ghi cau_hien. Trả về null khi hết câu. */
  VanChoi.prototype.cauTiep = function () {
    if (this.q && !this.q.xong) throw new Error('Câu trước chưa kết thúc');
    let muc = null;
    let onLai = null;
    const den = this.choOnLai.findIndex(function (x) { return x.con <= 0; });
    if (den >= 0) onLai = this.choOnLai.splice(den, 1)[0];
    else if (this.hang.length) muc = this.hang.shift();
    else if (this.choOnLai.length) onLai = this.choOnLai.shift();
    if (!muc && !onLai) return null;
    if (onLai) muc = { ky_nang: onLai.ky_nang, cau_truc: onLai.cau_truc, dang: onLai.dang, on_lai_cua: onLai.cau, lanOnLai: onLai.lanOnLai };
    const q = window.NganHang.taoCau(muc.ky_nang, muc.cau_truc, this.rng, { dang: muc.dang });
    this.lanGap[q.ma_cau] = (this.lanGap[q.ma_cau] || 0) + 1;
    const viTri = this.o.viTri || [];
    const du = {
      ma_cau: q.ma_cau, noi_dung: q.noi_dung, ky_nang: q.ky_nang, dang: q.dang, de: q.de,
      cau_truc: q.cau_truc, dap_an: q.dap_an
    };
    if (q.lua_chon) {
      du.lua_chon = q.lua_chon.map(function (x, i) {
        const o = { gia_tri: x.gia_tri };
        if (viTri[i]) o.vi_tri = viTri[i];
        o.loi = x.loi.slice();
        return o;
      });
    }
    du.on_lai = !!muc.on_lai_cua;
    if (muc.on_lai_cua) du.on_lai_cua = muc.on_lai_cua;
    du.lan_gap_thu = this.lanGap[q.ma_cau];
    q.cau = this.nk.cauHien(du);
    q.stt = ++this.stt;
    q.on_lai = !!muc.on_lai_cua;
    q.on_lai_cua = muc.on_lai_cua || null;
    q.lanOnLai = muc.lanOnLai || 0;
    q.goc = !onLai; // câu trong danh sách của ván (kể cả câu nợ hôm trước); câu sai quay lại trong ván thì không
    q.lan_thu = 1;
    q.goiYCap = 0;
    q.doiY = 0;
    q.xong = false;
    q.toiDaLanThu = q.dang === 'nhap_so' ? 2 : 1;
    this.q = q;
    return q;
  };

  VanChoi.prototype.thaoTac = function (kieu, duLieu) {
    if (!this.q || this.q.xong) return null;
    if (DOI_Y[kieu]) this.q.doiY++;
    return this.nk.thaoTac(kieu, duLieu);
  };

  /** Bé xin gợi ý: tăng một cấp (tối đa 3). them: trường riêng của game (ví dụ loai_bo). Trả về { cap, loi } hoặc null. */
  VanChoi.prototype.goiY = function (them) {
    const q = this.q;
    if (!q || q.xong || q.goiYCap >= 3) return null;
    q.goiYCap++;
    const txt = q.goi_y[q.goiYCap - 1];
    this.nk.goiY(q.goiYCap, q.ky_nang + '/cap-' + q.goiYCap, Object.assign({ noi_dung_goi_y: txt }, them || {}));
    return { cap: q.goiYCap, loi: txt };
  };

  /**
   * Bé chốt một đáp án. extra: trường riêng của game (ví dụ chu_dong).
   * Trả về { dung, loi, thuLai, canPhanHoi, loiNoi, ketQua, quaMong }
   */
  VanChoi.prototype.traLoi = function (giaTri, extra) {
    const q = this.q;
    if (!q || q.xong) return null;
    const NH = window.NganHang;
    const loi = NH.nhanBietLoi(q.cau_truc, giaTri);
    const dung = loi.length === 0;
    this.nk.traLoi(Object.assign({
      gia_tri: giaTri, dung: dung, loi: loi, lan_thu: q.lan_thu,
      so_lan_doi_y: q.doiY, goi_y_cap: q.goiYCap
    }, extra || {}));
    q.giayTraLoi = Math.round(this.nk.msTrongCau() / 100) / 10;
    q.cacLoi = (q.cacLoi || []).concat(loi);
    if (dung) {
      const kq = q.lan_thu > 1 ? 'dung_lan_2' : q.goiYCap > 0 ? 'dung_sau_goi_y' : 'dung_ngay';
      const qm = this._ketThucCau(kq);
      return { dung: true, loi: [], ketQua: kq, quaMong: qm };
    }
    if (q.lan_thu < q.toiDaLanThu) {
      q.lan_thu++;
      return { dung: false, loi: loi, thuLai: true, loiNoi: NH.loiNoiVoiBe(q.cau_truc, giaTri, loi) };
    }
    q.chonSai = giaTri;
    return { dung: false, loi: loi, canPhanHoi: true, loiNoi: NH.loiNoiVoiBe(q.cau_truc, giaTri, loi), loiGiai: q.loi_giai };
  };

  /** Ghi việc bé xem màn "Gần đúng rồi" (gọi khi màn đóng lại). */
  VanChoi.prototype.phanHoiXem = function (giayXem, nut) {
    const q = this.q;
    if (!q || q.xong) return null;
    return this.nk.phanHoiXem({ ma_loi_giai: q.loi_giai.ma, giay_xem: Math.round(giayXem * 10) / 10, nut: nut || 'choi_tiep' });
  };

  /** Đóng câu sai sau màn phản hồi. */
  VanChoi.prototype.ketThucCauSai = function () {
    const q = this.q;
    if (!q || q.xong) return null;
    return this._ketThucCau('sai');
  };

  VanChoi.prototype._ketThucCau = function (kq) {
    const q = this.q;
    const HT = window.HocTap;
    const du = { ket_qua: kq, tong_giay: q.giayTraLoi != null ? q.giayTraLoi : Math.round(this.nk.msTrongCau() / 100) / 10 };
    const dung = kq !== 'sai' && kq !== 'het_gio' && kq !== 'bo_qua';
    const suaDuoc = dung && q.on_lai_cua;
    if (suaDuoc) du.sua_duoc_cau = q.on_lai_cua;
    let seOnLai = false;
    if (kq === 'sai' && q.lanOnLai < TOI_DA_ON_LAI) {
      seOnLai = true;
      du.se_on_lai_sau_cau = SAU_CAU;
    }
    // Đếm lùi các câu đang chờ quay lại
    this.choOnLai.forEach(function (x) { x.con--; });
    if (seOnLai) {
      this.choOnLai.push({ ky_nang: q.ky_nang, cau_truc: q.cau_truc, dang: q.dang, cau: q.cau, con: SAU_CAU, lanOnLai: q.lanOnLai + 1 });
    }
    this.nk.cauKetThuc(du);
    q.xong = true;
    q.ketQua = kq;

    if (q.goc) {
      this.dem.moi++;
      if (kq === 'dung_ngay') this.dem.dungNgayMoi++;
    }
    if (kq === 'dung_ngay') this.dem.dungNgay++;
    else if (kq === 'dung_sau_goi_y') this.dem.nhoGoiY++;
    else if (kq === 'dung_lan_2') this.dem.lan2++;
    else if (kq === 'sai') this.dem.sai++;
    if (suaDuoc) this.dem.suaDuoc++;
    this.chuoiDung = kq === 'dung_ngay' ? this.chuoiDung + 1 : 0;

    const muc = (this.o.mucKy || {})[q.ky_nang];
    const qm = HT.quaMongCau(kq, !!suaDuoc, muc && muc.muc ? muc.muc : muc);
    const Q = this.quaMong;
    if (qm.loai === 'tu_lam') { Q.tu_lam += qm.qua_mong; Q.so_tu_lam++; }
    else if (qm.loai === 'vung_chac') { Q.vung_chac += qm.qua_mong; Q.so_tu_lam++; }
    else if (qm.loai === 'nho_goi_y') { Q.nho_goi_y += qm.qua_mong; Q.so_nho_goi_y++; }
    if (qm.them_sua) { Q.sua_duoc += qm.them_sua; Q.so_sua_duoc++; }
    Q.tong = Q.tu_lam + Q.vung_chac + Q.nho_goi_y + Q.sua_duoc;
    return qm.qua_mong + qm.them_sua;
  };

  /**
   * Kết thúc ván. boDo: bé thoát giữa chừng. them: trường riêng của game (ví dụ giay_dua, ky_luc).
   * Trả về Promise<{ suKien, sao, quaMong, dem }>
   */
  VanChoi.prototype.ketThuc = function (boDo, them) {
    if (this.daKetThuc) return Promise.resolve(null);
    this.daKetThuc = true;
    const self = this;
    const sao = window.HocTap.saoCuaVan(this.dem.moi, this.dem.dungNgayMoi, boDo);
    const qm = this.quaMong.tong; // thoát giữa chừng vẫn giữ quả mọng đã có (không bao giờ bị trừ)
    return this.nk.ketThucVan(Object.assign({
      bo_do: !!boDo, sao: sao, qua_mong: qm,
      qua_mong_chi_tiet: { tu_lam: this.quaMong.tu_lam, vung_chac: this.quaMong.vung_chac, nho_goi_y: this.quaMong.nho_goi_y, sua_duoc: this.quaMong.sua_duoc }
    }, them || {})).then(function (evs) {
      return { suKien: evs, sao: sao, quaMong: self.quaMong, dem: self.dem, vanId: self.vanId };
    });
  };

  window.VanChoi = VanChoi;
})();
