/* ============================================================
   van-choi.js – Vòng đời một ván chơi, dùng chung cho mọi thể loại game
   - Lấy câu từ ngân hàng, xếp câu sai quay lại sau 2 câu, đếm quả mọng và sao.
   - Ghi đủ chuỗi sự kiện cho mỗi câu: cau_hien → thao_tac… → (goi_y) → tra_loi → (phan_hoi_xem) → cau_ket_thuc.
   - Dạng câu: chon_dap_an (Đua Xe), nhap_so (trạm dừng), ghep_doi (Lật Thẻ), keo_tha (Xếp Hình Số),
     hai_buoc (Truyện Tranh: chọn phép tính rồi tính, hai bước chấm riêng).
   Game chỉ lo phần hình và thao tác, gọi các hàm dưới đây.
   API: window.VanChoi (hàm dựng)
   ============================================================ */
(function () {
  'use strict';

  /** Thao tác tính là đổi ý; "chon" chỉ tính từ lần chọn thứ hai trong câu (lần đầu là chính câu trả lời). */
  const DOI_Y = { doi_lan: 1, bo_chon: 1, doi_cot: 1, xoa: 1, bo_ra: 1 };
  const SAU_CAU = 2; // câu sai quay lại sau 2 câu
  const TOI_DA_ON_LAI = 2; // một câu quay lại tối đa 2 lần trong ván
  /** Câu sai quay lại thêm tối đa chừng này câu mỗi ván (một phần ba số câu, ít nhất 3), để bé yếu không phải làm gấp ba số câu. */
  function soCauThem(n) { return Math.max(3, Math.ceil(n / 3)); }
  /** Số lần thử của một câu theo dạng (bài hai bước: mỗi bước tính riêng). */
  const LAN_THU = { chon_dap_an: 1, nhap_so: 2, ghep_doi: 2, keo_tha: 2, hai_buoc: 2, sap_xep: 2, thao_tac_hinh: 2, doc_va_chon: 1 };

  /**
   * o: { nk, game, vung, man: { id, cau, so_cau, tram_dung, dang }, nguon, nhiemVu, hatGiong,
   *      mucKy: { ky_nang: 'da_thuoc' … }, cauNo: [...], lanGap: { ma_cau: số lần đã gặp }, viTri: ['lan_trai', …] }
   */
  function VanChoi(o) {
    this.o = o;
    this.nk = o.nk;
    this.man = o.man;
    this.hatGiong = o.hatGiong != null ? o.hatGiong : Math.floor(Math.random() * 2147483647);
    this.rng = window.NganHang.taoRng(this.hatGiong);
    // mucKy: bộ sinh chọn cặp số dễ hơn khi kỹ năng mới học, khó hơn khi đã thuộc (ngan-hang.js, theoDoKho)
    this.ds = window.NganHang.lapDanhSach(o.man, this.rng, { cauNo: o.cauNo || [], soCau: o.soCau, mucKy: o.mucKy || null });
    this.hang = this.ds.slice();
    this.choOnLai = [];
    // Đấu trường không giới hạn: ván dừng khi hạ trùm, số câu đã cân theo câu sai quay lại (xem kiểm thử cân bằng)
    this.toiDaCau = o.man && o.man.dau_truong ? Infinity : this.ds.length + soCauThem(this.ds.length);
    this.soXong = 0; // số câu đã kết thúc (kể cả câu sai quay lại)
    this.choHien = 0; // câu đã dựng sẵn (bàn Lật Thẻ, cầu nối) nhưng chưa hiện
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

  /**
   * Tiến độ để hiện cho bé: { xong, tong, dang, onLai }. tong gồm cả câu sai sẽ quay lại (tăng lên khi bé sai),
   * nên thanh tiến độ không đầy trước khi hết câu. onLai: câu đang hiện là câu sai quay lại trong ván.
   */
  VanChoi.prototype.tienDo = function () {
    const dang = this.q && !this.q.xong ? 1 : 0;
    return {
      xong: this.soXong, dang: dang, onLai: !!(dang && this.q.goc === false),
      tong: Math.max(1, this.soXong + dang + this.choHien + this.hang.length + this.choOnLai.length)
    };
  };

  /** Câu đang hiện, nếu sai hẳn, có quay lại trong ván không (để màn "Gần đúng rồi" nói đúng). */
  VanChoi.prototype.seOnLai = function () {
    const q = this.q;
    if (!q || q.xong || q.lanOnLai >= TOI_DA_ON_LAI) return false;
    return this.soXong + 1 + this.choHien + this.hang.length + this.choOnLai.length < this.toiDaCau;
  };
  /** Dạng của câu kế tiếp (không lấy ra): 'chon_dap_an' | 'nhap_so' | … | null khi hết câu. */
  VanChoi.prototype.dangKeTiep = function () {
    const den = this.choOnLai.find(function (x) { return x.con <= 0; });
    if (den) return den.dang;
    if (this.hang.length) return this.hang[0].dang;
    if (this.choOnLai.length) return this.choOnLai[0].dang;
    return null;
  };

  /** Lấy mục kế tiếp: câu sai đã tới lượt quay lại, rồi câu trong danh sách, rồi câu sai còn chờ. */
  VanChoi.prototype._layMuc = function () {
    let muc = null;
    let onLai = null;
    const den = this.choOnLai.findIndex(function (x) { return x.con <= 0; });
    if (den >= 0) onLai = this.choOnLai.splice(den, 1)[0];
    else if (this.hang.length) muc = this.hang.shift();
    else if (this.choOnLai.length) onLai = this.choOnLai.shift();
    if (!muc && !onLai) return null;
    if (onLai) muc = { ky_nang: onLai.ky_nang, cau_truc: onLai.cau_truc, dang: onLai.dang, on_lai_cua: onLai.cau, lanOnLai: onLai.lanOnLai, laOnLaiTrongVan: true };
    return muc;
  };

  /** Trả một mục về đầu hàng đợi (dùng khi dựng bàn Lật Thẻ gặp hai câu cùng đáp án). */
  VanChoi.prototype._traMuc = function (muc, q) {
    if (q && q.choHien) { q.choHien = false; this.choHien = Math.max(0, this.choHien - 1); }
    if (muc.laOnLaiTrongVan) this.choOnLai.unshift({ ky_nang: muc.ky_nang, cau_truc: muc.cau_truc, dang: muc.dang, cau: muc.on_lai_cua, con: 0, lanOnLai: muc.lanOnLai });
    else this.hang.unshift(muc);
  };

  VanChoi.prototype._taoQ = function (muc) {
    const q = window.NganHang.taoCau(muc.ky_nang, muc.cau_truc, this.rng, { dang: muc.dang });
    q.on_lai = !!muc.on_lai_cua;
    q.on_lai_cua = muc.on_lai_cua || null;
    q.lanOnLai = muc.lanOnLai || 0;
    q.goc = !muc.laOnLaiTrongVan; // câu trong danh sách của ván (kể cả câu nợ hôm trước); câu sai quay lại trong ván thì không
    q.choHien = true;
    this.choHien++;
    return q;
  };

  /**
   * Hiện một câu đã dựng và ghi cau_hien. luaChon: các lựa chọn bé nhìn thấy (Lật Thẻ: các thẻ kết quả trên bàn),
   * mặc định lấy từ câu. Trả về q.
   */
  VanChoi.prototype.hienCau = function (q, luaChon) {
    if (this.q && !this.q.xong) throw new Error('Câu trước chưa kết thúc');
    const NH = window.NganHang;
    if (q.choHien) { q.choHien = false; this.choHien = Math.max(0, this.choHien - 1); }
    this.lanGap[q.ma_cau] = (this.lanGap[q.ma_cau] || 0) + 1;
    const viTri = this.o.viTri || [];
    const du = {
      ma_cau: q.ma_cau, noi_dung: q.noi_dung, ky_nang: q.ky_nang, dang: q.dang, de: q.de,
      cau_truc: q.cau_truc, dap_an: q.dap_an
    };
    const lc = luaChon || q.lua_chon;
    if (lc) {
      q.lua_chon = lc;
      du.lua_chon = lc.map(function (x, i) {
        const o = { gia_tri: x.gia_tri };
        if (x.vi_tri) o.vi_tri = x.vi_tri; else if (viTri[i]) o.vi_tri = viTri[i];
        o.loi = x.loi ? x.loi.slice() : NH.nhanBietLoi(q.cau_truc, x.gia_tri, q.dang === 'hai_buoc' ? 1 : undefined);
        return o;
      });
    }
    du.on_lai = !!q.on_lai;
    if (q.on_lai_cua) du.on_lai_cua = q.on_lai_cua;
    du.lan_gap_thu = this.lanGap[q.ma_cau];
    q.cau = this.nk.cauHien(du);
    q.stt = ++this.stt;
    q.lan_thu = 1;
    q.goiYCap = 0;
    q.goiYBuoc = { 1: 0, 2: 0 };
    q.doiY = 0;
    q.xong = false;
    q.buoc = q.dang === 'hai_buoc' ? 1 : null;
    q.toiDaLanThu = LAN_THU[q.dang] || 1;
    this.q = q;
    return q;
  };

  /** Lấy câu kế tiếp và ghi cau_hien. Trả về null khi hết câu. */
  VanChoi.prototype.cauTiep = function () {
    if (this.q && !this.q.xong) throw new Error('Câu trước chưa kết thúc');
    const muc = this._layMuc();
    if (!muc) return null;
    return this.hienCau(this._taoQ(muc));
  };

  /**
   * Dựng sẵn tối đa n câu (chưa hiện, chưa ghi) có đáp án khác nhau: dùng cho một bàn Lật Thẻ.
   * Câu nào trùng đáp án với câu đã lấy thì trả lại hàng đợi cho bàn sau.
   */
  VanChoi.prototype.lapBan = function (n) {
    const ra = [];
    const traLai = [];
    const daCo = {};
    let muc;
    while (ra.length < n && (muc = this._layMuc())) {
      const q = this._taoQ(muc);
      const k = String(q.dap_an);
      if (daCo[k]) { traLai.push([muc, q]); continue; }
      daCo[k] = 1;
      ra.push(q);
    }
    for (let i = traLai.length - 1; i >= 0; i--) this._traMuc(traLai[i][0], traLai[i][1]);
    return ra;
  };

  VanChoi.prototype.thaoTac = function (kieu, duLieu) {
    if (!this.q || this.q.xong) return null;
    if (kieu === 'chon') { this.q.soChon = (this.q.soChon || 0) + 1; if (this.q.soChon > 1) this.q.doiY++; }
    else if (DOI_Y[kieu]) this.q.doiY++;
    return this.nk.thaoTac(kieu, duLieu);
  };

  /**
   * Bé xin gợi ý: tăng một cấp (tối đa 3). them: trường riêng của game (ví dụ loai_bo).
   * Bài hai bước: mỗi bước có ba cấp gợi ý riêng (bước 2 là gợi ý cách tính). Trả về { cap, loi } hoặc null.
   */
  VanChoi.prototype.goiY = function (them) {
    const q = this.q;
    if (!q || q.xong) return null;
    const buoc2 = q.dang === 'hai_buoc' && q.buoc === 2;
    const b = buoc2 ? 2 : 1;
    const cap = q.dang === 'hai_buoc' ? q.goiYBuoc[b] : q.goiYCap;
    if (cap >= 3) return null;
    const moi = cap + 1;
    if (q.dang === 'hai_buoc') q.goiYBuoc[b] = moi;
    q.goiYCap = Math.max(q.goiYCap, moi);
    const ds = buoc2 ? q.goi_y_buoc2 : q.goi_y;
    const txt = ds[moi - 1];
    const du = Object.assign({ noi_dung_goi_y: txt }, them || {});
    if (q.dang === 'hai_buoc') du.buoc = b;
    this.nk.goiY(moi, q.ky_nang + (q.dang === 'hai_buoc' ? '/buoc-' + b : '') + '/cap-' + moi, du);
    return { cap: moi, loi: txt };
  };

  /**
   * Bé chốt một đáp án. extra: trường riêng của game (ví dụ chu_dong, lan, nhap).
   * Trả về { dung, loi, thuLai, canPhanHoi, loiNoi, ketQua, quaMong }
   */
  VanChoi.prototype.traLoi = function (giaTri, extra) {
    const q = this.q;
    if (!q || q.xong) return null;
    if (q.dang === 'hai_buoc') return q.buoc === 1 ? this.traLoiBuoc1(giaTri, extra) : this.traLoiBuoc2(giaTri, extra);
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
    // Đảo thứ tự thừa số (5 × 3 viết 3 + 3 + 3 + 3 + 3): cùng giá trị, chỉ chưa quen thứ tự viết. Như bước 1 của Truyện Tranh,
    // mọi game (Lật Thẻ, Đấu Trường, chọn đáp án) nhắc rồi cho chọn lại một lần, không mất lượt thử; đúng sau đó là dung_lan_2
    if (loi.length === 1 && loi[0] === 'dao-thu-tu' && !q.daNhacThuTu) {
      q.daNhacThuTu = true;
      q.lan_thu++;
      q.toiDaLanThu++;
      return { dung: false, loi: loi, thuLai: true, loiNoi: NH.loiNoiVoiBe(q.cau_truc, giaTri, loi) };
    }
    if (q.lan_thu < q.toiDaLanThu) {
      q.lan_thu++;
      return { dung: false, loi: loi, thuLai: true, loiNoi: NH.loiNoiVoiBe(q.cau_truc, giaTri, loi) };
    }
    q.chonSai = giaTri;
    return { dung: false, loi: loi, canPhanHoi: true, loiNoi: NH.loiNoiVoiBe(q.cau_truc, giaTri, loi), loiGiai: q.loi_giai };
  };

  /**
   * Bài hai bước, bước 1: bé chọn phép tính (giá trị chuẩn hóa, ví dụ "8+2", "2x5").
   * Đảo thứ tự thừa số (2 × 5 viết 5 × 2) không tính là sai: nhắc rồi cho chọn lại một lần (03a mục 2.19).
   * Chọn sai phép: ghi sai-phep, giải thích rồi vẫn sang bước 2 để đo riêng phần tính.
   * Trả về { dung, loi, loiNoi, thuLai, saiBuoc1, dapAn }
   */
  VanChoi.prototype.traLoiBuoc1 = function (giaTri, extra) {
    const q = this.q;
    if (!q || q.xong || q.buoc !== 1) return null;
    const NH = window.NganHang;
    const loi = NH.nhanBietLoi(q.cau_truc, giaTri, 1);
    const dung = loi.length === 0;
    q.lanThuB1 = q.lanThuB1 || 1;
    this.nk.traLoi(Object.assign({
      gia_tri: giaTri, dung: dung, loi: loi, lan_thu: q.lanThuB1, buoc: 1,
      so_lan_doi_y: q.doiY, goi_y_cap: q.goiYBuoc[1]
    }, extra || {}));
    q.cacLoi = (q.cacLoi || []).concat(loi);
    const loiNoi = dung ? null : NH.loiNoiVoiBe(q.cau_truc, giaTri, loi, 1);
    if (dung) {
      q.buoc = 2;
      if (q.lanThuB1 > 1) q.coLanThu2 = true;
      return { dung: true, loi: [], sangBuoc2: true };
    }
    if (loi.length === 1 && loi[0] === 'dao-thu-tu' && q.lanThuB1 < 2) {
      q.lanThuB1++;
      return { dung: false, loi: loi, thuLai: true, loiNoi: loiNoi };
    }
    q.saiBuoc1 = true;
    q.buoc = 2;
    return { dung: false, loi: loi, saiBuoc1: true, loiNoi: loiNoi, dapAn: q.buoc1.dap_an };
  };

  /** Bài hai bước, bước 2: bé gõ kết quả của phép tính đúng. Thử được 2 lần. */
  VanChoi.prototype.traLoiBuoc2 = function (giaTri, extra) {
    const q = this.q;
    if (!q || q.xong || q.buoc !== 2) return null;
    const NH = window.NganHang;
    const loi = NH.nhanBietLoi(q.cau_truc, giaTri, 2);
    const dung = loi.length === 0;
    q.lanThuB2 = q.lanThuB2 || 1;
    this.nk.traLoi(Object.assign({
      gia_tri: giaTri, dung: dung, loi: loi, lan_thu: q.lanThuB2, buoc: 2,
      so_lan_doi_y: q.doiY, goi_y_cap: q.goiYBuoc[2]
    }, extra || {}));
    q.giayTraLoi = Math.round(this.nk.msTrongCau() / 100) / 10;
    q.cacLoi = (q.cacLoi || []).concat(loi);
    if (dung) {
      const kq = q.saiBuoc1 ? 'sai' : (q.coLanThu2 || q.lanThuB2 > 1) ? 'dung_lan_2' : q.goiYCap > 0 ? 'dung_sau_goi_y' : 'dung_ngay';
      const qm = this._ketThucCau(kq);
      return { dung: true, loi: [], ketQua: kq, quaMong: qm, saiBuoc1: !!q.saiBuoc1 };
    }
    if (q.lanThuB2 < 2) {
      q.lanThuB2++;
      return { dung: false, loi: loi, thuLai: true, loiNoi: NH.loiNoiVoiBe(q.cau_truc, giaTri, loi, 2) };
    }
    q.chonSai = giaTri;
    return { dung: false, loi: loi, canPhanHoi: true, loiNoi: NH.loiNoiVoiBe(q.cau_truc, giaTri, loi, 2), loiGiai: q.loi_giai_buoc2 };
  };

  /** Ghi việc bé xem màn "Gần đúng rồi" (gọi khi màn đóng lại). them: trường riêng (ví dụ buoc, ma_loi_giai). */
  VanChoi.prototype.phanHoiXem = function (giayXem, nut, them) {
    const q = this.q;
    if (!q || q.xong) return null;
    const ma = q.dang === 'hai_buoc' ? (q.loi_giai_buoc2 || q.loi_giai).ma : q.loi_giai.ma;
    return this.nk.phanHoiXem(Object.assign({ ma_loi_giai: ma, giay_xem: Math.round(giayXem * 10) / 10, nut: nut || 'choi_tiep' }, them || {}));
  };

  /**
   * Hết giờ mà bé chưa chốt (game hành động: thiên thạch chạm đất, vòng lửa trôi qua).
   * Ghi cau_ket_thuc 'het_gio'; câu quay lại sau 2 câu như câu sai. Trả về số quả mọng (luôn 0).
   */
  VanChoi.prototype.hetGio = function () {
    const q = this.q;
    if (!q || q.xong) return null;
    return this._ketThucCau('het_gio');
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
    if ((kq === 'sai' || kq === 'het_gio') && this.seOnLai()) {
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
    this.soXong++;
    q.ketQua = kq;

    if (q.goc) {
      this.dem.moi++;
      if (kq === 'dung_ngay') this.dem.dungNgayMoi++;
    }
    if (kq === 'dung_ngay') this.dem.dungNgay++;
    else if (kq === 'dung_sau_goi_y') this.dem.nhoGoiY++;
    else if (kq === 'dung_lan_2') this.dem.lan2++;
    else if (kq === 'sai' || kq === 'het_gio') this.dem.sai++;
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
    // App bị tắt ngang giữa ván thì lần mở sau vẫn cộng số quả mọng này cho bé
    if (this.nk.quaMongVan) this.nk.quaMongVan(Q.tong);
    return qm.qua_mong + qm.them_sua;
  };

  /**
   * Kết thúc ván. boDo: bé thoát giữa chừng. them: trường riêng của game (ví dụ giay_dua, diem).
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
