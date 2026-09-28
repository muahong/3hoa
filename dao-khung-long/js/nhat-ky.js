/* ============================================================
   nhat-ky.js – Nhật ký học tập từng thao tác (lược đồ sự kiện v1)
   Xem docs/du-an-toan-2-3/spec/06-theo-doi-hoc-tap.md và 06-su-kien-v1.schema.json.
   - Mỗi thao tác là một sự kiện JSON tự mô tả (phong bì chung + du_lieu).
   - Bốn tầng: phiên (mở app hoặc quay lại sau 10 phút), ván, câu, thao tác.
   - Gom trong bộ đệm, ghi xuống IndexedDB mỗi 2 giây, khi hết ván và khi ẩn tab.
   - Tự chứa (kể cả lớp lưu trữ) để sao chép nguyên văn vào các game khác như profile.js.
   API: window.NhatKy (xem cuối tệp). Kho dữ liệu dùng chung: NhatKy.kho.
   ============================================================ */
(function () {
  'use strict';

  const PHIEN_BAN = 1;
  const DB_TEN = 'dao-khung-long';
  const DB_PHIEN_BAN = 1;
  const NGHI_MS = 10 * 60 * 1000; // quay lại sau 10 phút không chạm là phiên mới
  const GHI_MOI_MS = 2000;
  const GIU_NHAT_KY_NGAY = 120;
  const KHOA_DON = 'dkl-don-nhat-ky-v1'; // ngày dọn nhật ký gốc gần nhất (mỗi ngày dọn một lần, không chờ lúc mở app)
  const KHOA_DANG_MO = 'dkl-phien-mo-v1'; // dấu phiên đang mở (localStorage, ghi đồng bộ) để đóng phiên dở khi app bị tắt ngang

  const KHO = {
    ho_so: { keyPath: 'id' },
    su_kien: { keyPath: 'id', chiMuc: [['be_luc', ['be', 'luc']], ['van', 'van']] },
    tom_tat_cau: { keyPath: 'cau', chiMuc: [['be', 'be']] },
    tom_tat_van: { keyPath: 'van', chiMuc: [['be', 'be']] },
    ho_so_hoc_tap: { keyPath: 'be' },
    thiet_lap: { keyPath: 'k' }
  };

  /* ---------------- Lớp lưu trữ: IndexedDB, dự phòng bộ nhớ ---------------- */

  function sao(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }

  function khoBoNho() {
    const bang = {};
    Object.keys(KHO).forEach(function (k) { bang[k] = new Map(); });
    const khoa = function (ten, o) { return o[KHO[ten].keyPath]; };
    return {
      loai: 'bo_nho',
      lay: function (ten, k) { const v = bang[ten].get(k); return Promise.resolve(v === undefined ? null : sao(v)); },
      dat: function (ten, o) { bang[ten].set(khoa(ten, o), sao(o)); return Promise.resolve(); },
      datNhieu: function (ten, ds) { ds.forEach(function (o) { bang[ten].set(khoa(ten, o), sao(o)); }); return Promise.resolve(); },
      xoa: function (ten, k) { bang[ten].delete(k); return Promise.resolve(); },
      tatCa: function (ten) { return Promise.resolve(Array.from(bang[ten].values()).map(sao)); },
      theoBe: function (ten, be) {
        return Promise.resolve(Array.from(bang[ten].values()).filter(function (o) { return o.be === be; }).map(sao));
      },
      theoVan: function (van) {
        return Promise.resolve(Array.from(bang.su_kien.values()).filter(function (o) { return o.van === van; }).map(sao));
      },
      xoaNeu: function (ten, dk) {
        let n = 0;
        bang[ten].forEach(function (o, k) { if (dk(o)) { bang[ten].delete(k); n++; } });
        return Promise.resolve(n);
      },
      xoaKhoaDuoi: function (ten, khoa) {
        let n = 0;
        bang[ten].forEach(function (o, k) { if (k < khoa) { bang[ten].delete(k); n++; } });
        return Promise.resolve(n);
      }
    };
  }

  function khoIndexedDB(idb) {
    let dbHua = null;
    function mo() {
      if (dbHua) return dbHua;
      dbHua = new Promise(function (ok, loi) {
        const yc = idb.open(DB_TEN, DB_PHIEN_BAN);
        yc.onupgradeneeded = function () {
          const db = yc.result;
          Object.keys(KHO).forEach(function (ten) {
            if (db.objectStoreNames.contains(ten)) return;
            const st = db.createObjectStore(ten, { keyPath: KHO[ten].keyPath });
            (KHO[ten].chiMuc || []).forEach(function (cm) { st.createIndex(cm[0], cm[1], { unique: false }); });
          });
        };
        yc.onsuccess = function () { ok(yc.result); };
        yc.onerror = function () { loi(yc.error); };
        yc.onblocked = function () { loi(new Error('IndexedDB bị chặn')); };
      });
      return dbHua;
    }
    function gd(ten, cheDo, viec) {
      return mo().then(function (db) {
        return new Promise(function (ok, loi) {
          const tx = db.transaction(ten, cheDo);
          const st = tx.objectStore(ten);
          let kq;
          try { kq = viec(st); } catch (e) { loi(e); return; }
          tx.oncomplete = function () { ok(kq && kq.__yc ? kq.__yc.result : kq); };
          tx.onerror = function () { loi(tx.error); };
          tx.onabort = function () { loi(tx.error || new Error('abort')); };
        });
      });
    }
    const boc = function (yc) { return { __yc: yc }; };
    function quet(ten, nguon, dk) {
      // Duyệt con trỏ; dk(o) trả về true để giữ
      return mo().then(function (db) {
        return new Promise(function (ok, loi) {
          const tx = db.transaction(ten, 'readonly');
          const src = nguon(tx.objectStore(ten));
          const ra = [];
          const yc = src.st.openCursor(src.range || null);
          yc.onsuccess = function () {
            const c = yc.result;
            if (!c) return;
            if (!dk || dk(c.value)) ra.push(c.value);
            c.continue();
          };
          tx.oncomplete = function () { ok(ra); };
          tx.onerror = function () { loi(tx.error); };
        });
      });
    }
    return {
      loai: 'indexeddb',
      mo: mo,
      lay: function (ten, k) { return gd(ten, 'readonly', function (st) { return boc(st.get(k)); }).then(function (v) { return v === undefined ? null : v; }); },
      dat: function (ten, o) { return gd(ten, 'readwrite', function (st) { st.put(o); }); },
      datNhieu: function (ten, ds) { return gd(ten, 'readwrite', function (st) { ds.forEach(function (o) { st.put(o); }); }); },
      xoa: function (ten, k) { return gd(ten, 'readwrite', function (st) { st.delete(k); }); },
      tatCa: function (ten) { return gd(ten, 'readonly', function (st) { return boc(st.getAll()); }); },
      theoBe: function (ten, be) {
        if (ten === 'su_kien') {
          return quet(ten, function (st) { return { st: st.index('be_luc'), range: IDBKeyRange.bound([be, ''], [be, '￿']) }; });
        }
        if (KHO[ten].keyPath === 'be') return this.lay(ten, be).then(function (v) { return v ? [v] : []; });
        return quet(ten, function (st) { return { st: st.index('be'), range: IDBKeyRange.only(be) }; });
      },
      theoVan: function (van) {
        return quet('su_kien', function (st) { return { st: st.index('van'), range: IDBKeyRange.only(van) }; });
      },
      xoaNeu: function (ten, dk) {
        return mo().then(function (db) {
          return new Promise(function (ok, loi) {
            const tx = db.transaction(ten, 'readwrite');
            let n = 0;
            const yc = tx.objectStore(ten).openCursor();
            yc.onsuccess = function () {
              const c = yc.result;
              if (!c) return;
              if (dk(c.value)) { c.delete(); n++; }
              c.continue();
            };
            tx.oncomplete = function () { ok(n); };
            tx.onerror = function () { loi(tx.error); };
          });
        });
      },
      /** Xóa mọi bản ghi có khóa chính nhỏ hơn khoa bằng một lệnh theo khoảng (không duyệt từng bản ghi). Trả về số bản ghi đã xóa. */
      xoaKhoaDuoi: function (ten, khoa) {
        return gd(ten, 'readwrite', function (st) {
          const r = IDBKeyRange.upperBound(khoa, true);
          const dem = st.count(r);
          st.delete(r);
          return boc(dem);
        });
      }
    };
  }

  let kho = khoBoNho();
  function moKho() {
    let idb = null;
    try { idb = window.indexedDB || null; } catch (e) { idb = null; }
    if (!idb) return Promise.resolve(kho);
    const k = khoIndexedDB(idb);
    return k.mo().then(function () { kho = k; api.kho = k; return k; }).catch(function () { return kho; });
  }

  /* ---------------- ULID (sắp xếp được theo thời gian) ---------------- */

  const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let ulidT = -1;
  let ulidR = null;
  function ngauNhien32() {
    const a = new Array(16);
    let buf = null;
    try {
      if (window.crypto && window.crypto.getRandomValues) { buf = new Uint8Array(16); window.crypto.getRandomValues(buf); }
    } catch (e) { buf = null; }
    for (let i = 0; i < 16; i++) a[i] = buf ? buf[i] % 32 : Math.floor(Math.random() * 32);
    return a;
  }
  function ulid(ms) {
    let t = Math.floor(ms);
    if (t < ulidT) t = ulidT; // đồng hồ lùi: vẫn giữ tăng dần
    if (t === ulidT && ulidR) {
      const r = ulidR.slice();
      let i = 15;
      while (i >= 0 && r[i] === 31) { r[i] = 0; i--; }
      if (i >= 0) r[i]++;
      ulidR = r;
    } else {
      ulidR = ngauNhien32();
      ulidT = t;
    }
    let s = '';
    let x = t;
    for (let i = 0; i < 10; i++) { s = B32[x % 32] + s; x = Math.floor(x / 32); }
    for (let i = 0; i < 16; i++) s += B32[ulidR[i]];
    return s;
  }
  /** ULID nhỏ nhất của một mốc thời gian (không đổi trạng thái của ulid()): mọi sự kiện trước mốc có mã nhỏ hơn. */
  function ulidMoc(ms) {
    let s = '';
    let x = Math.max(0, Math.floor(ms));
    for (let i = 0; i < 10; i++) { s = B32[x % 32] + s; x = Math.floor(x / 32); }
    return s + '0000000000000000';
  }

  /* ---------------- Thời gian ---------------- */

  function hai(n, w) { return String(Math.abs(n)).padStart(w || 2, '0'); }
  /** ISO 8601 theo giờ máy, có múi giờ: 2026-10-12T19:04:03.812+07:00 */
  function isoDiaPhuong(ms) {
    const d = new Date(ms);
    const lech = -d.getTimezoneOffset();
    return d.getFullYear() + '-' + hai(d.getMonth() + 1) + '-' + hai(d.getDate()) + 'T' + hai(d.getHours()) + ':' + hai(d.getMinutes()) + ':' +
      hai(d.getSeconds()) + '.' + hai(d.getMilliseconds(), 3) + (lech >= 0 ? '+' : '-') + hai(Math.floor(Math.abs(lech) / 60)) + ':' + hai(Math.abs(lech) % 60);
  }
  function ngayDiaPhuong(ms) { return isoDiaPhuong(ms).slice(0, 10); }

  const dongHoMacDinh = {
    now: function () { return Date.now(); },
    perf: function () { try { return window.performance.now(); } catch (e) { return Date.now(); } }
  };

  /* ---------------- Thiết bị ---------------- */

  function thietBi() {
    const nav = window.navigator || {};
    const ua = String(nav.userAgent || '');
    let loai = 'khac';
    if (/iPad/.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1)) loai = 'ipad';
    else if (/iPhone|iPod/.test(ua)) loai = 'iphone';
    else if (/Android/.test(ua)) loai = /Mobile/.test(ua) ? 'dien_thoai_android' : 'may_tinh_bang_android';
    else if (/Windows|Macintosh|Linux|CrOS/.test(ua)) loai = 'may_tinh';
    const w = window.innerWidth || 0;
    const h = window.innerHeight || 0;
    let ps = false;
    try { ps = !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || nav.standalone === true; } catch (e) { ps = false; }
    return { loai: loai, huong: w >= h ? 'ngang' : 'doc', rong: w, cao: h, man_hinh_chinh: ps };
  }

  /* ---------------- Trạng thái ---------------- */

  const st = {
    dongHo: dongHoMacDinh,
    phienBanApp: '0',
    be: null,
    phien: null, // { id, t0, batDau }
    van: null, // { id, t0, game, vung, man, dem, cauCuoi }
    cau: null, // { id, t0, maCau }
    cuoi: 0, // lúc hoạt động gần nhất (ms, Date)
    boDem: [],
    suKienVan: [], // sự kiện của ván đang mở (để tóm tắt ngay khi hết ván, khỏi đọc lại DB)
    hengio: null,
    dangGhi: null,
    nghe: [],
    vanDongDo: [], // ván còn dở của lần chạy trước, vừa được đóng lúc khởi động (app cần tóm tắt lại)
    canhBaoLuuTru: false
  };

  function docDauMo() {
    try { const s = window.localStorage.getItem(KHOA_DANG_MO); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }
  function ghiDauMo() {
    try {
      if (!st.phien || !st.be) { window.localStorage.removeItem(KHOA_DANG_MO); return; }
      window.localStorage.setItem(KHOA_DANG_MO, JSON.stringify({
        be: st.be, phien: st.phien.id, phienBatDau: st.phien.batDau, cuoi: st.cuoi,
        van: st.van ? { id: st.van.id, game: st.van.game, vung: st.van.vung, man: st.van.man, batDau: st.van.batDau, dem: st.van.dem, cauCuoi: st.van.cauCuoi } : null,
        cau: st.cau ? { id: st.cau.id, batDau: st.cau.batDau, maCau: st.cau.maCau } : null
      }));
    } catch (e) { /* bỏ qua: localStorage đầy hoặc bị chặn */ }
  }

  function demMoi() { return { so_cau: 0, dung_ngay: 0, dung_sau_goi_y: 0, dung_lan_2: 0, sai: 0, sua_duoc: 0 }; }

  /* ---------------- Ghi sự kiện ---------------- */

  const LOAI_TRONG_CAU = { cau_hien: 1, thao_tac: 1, goi_y: 1, tra_loi: 1, phan_hoi_xem: 1, cau_ket_thuc: 1 };

  function taoSuKien(loai, duLieu, tuyChon) {
    tuyChon = tuyChon || {};
    const now = tuyChon.luc != null ? tuyChon.luc : st.dongHo.now();
    const perf = st.dongHo.perf();
    let ms;
    if (tuyChon.ms != null) ms = tuyChon.ms;
    else if (st.cau && LOAI_TRONG_CAU[loai]) ms = perf - st.cau.t0;
    else if (st.van) ms = perf - st.van.t0;
    else if (st.phien) ms = perf - st.phien.t0;
    else ms = 0;
    const ev = { v: PHIEN_BAN, id: ulid(now), luc: isoDiaPhuong(now), ms: Math.max(0, Math.round(ms)), be: st.be };
    const phien = tuyChon.phien || (st.phien ? st.phien.id : null);
    if (phien) ev.phien = phien;
    const van = tuyChon.van !== undefined ? tuyChon.van : (st.van ? st.van.id : null);
    if (van) ev.van = van;
    const cau = tuyChon.cau !== undefined ? tuyChon.cau : (st.cau && LOAI_TRONG_CAU[loai] ? st.cau.id : null);
    if (cau) ev.cau = cau;
    ev.loai = loai;
    const game = tuyChon.game || (st.van ? st.van.game : null);
    if (game) ev.game = game;
    const vung = tuyChon.vung != null ? tuyChon.vung : (st.van ? st.van.vung : null);
    if (vung != null) ev.vung = vung;
    const man = tuyChon.man || (st.van ? st.van.man : null);
    if (man) ev.man = man;
    ev.du_lieu = duLieu || {};
    return ev;
  }

  function day(ev) {
    st.boDem.push(ev);
    if (st.van && ev.van === st.van.id) st.suKienVan.push(ev);
    for (let i = 0; i < st.nghe.length; i++) { try { st.nghe[i](ev); } catch (e) { /* bỏ qua */ } }
    henGhi();
    return ev;
  }

  function ghi(loai, duLieu, tuyChon) {
    if (!st.be) return null;
    const now = st.dongHo.now();
    if (!(tuyChon && tuyChon.luc != null)) kiemTraNghi(now);
    const ev = day(taoSuKien(loai, duLieu, tuyChon));
    if (!(tuyChon && tuyChon.luc != null)) st.cuoi = now;
    ghiDauMo();
    return ev;
  }

  function henGhi() {
    if (st.hengio) return;
    st.hengio = setTimeout(function () { st.hengio = null; xa(); }, GHI_MOI_MS);
  }

  /** Ghi bộ đệm xuống kho. Trả về Promise. */
  function xa() {
    if (st.hengio) { clearTimeout(st.hengio); st.hengio = null; }
    if (st.dangGhi) return st.dangGhi.then(function () { return st.boDem.length ? xa() : undefined; });
    if (!st.boDem.length) return Promise.resolve();
    const lo = st.boDem.splice(0, st.boDem.length);
    st.dangGhi = kho.datNhieu('su_kien', lo).catch(function (e) {
      // Hết chỗ: bỏ bớt nhật ký gốc cũ nhất (tóm tắt vẫn giữ), rồi thử lại một lần
      st.boDem = lo.concat(st.boDem);
      if (st.canhBaoLuuTru) return;
      st.canhBaoLuuTru = true;
      return donNhatKyCu(30).then(function (n) {
        day(taoSuKien('luu_tru_canh_bao', { loi: String((e && e.name) || e), da_xoa_su_kien: n }));
      });
    }).then(function () { st.dangGhi = null; }, function () { st.dangGhi = null; });
    return st.dangGhi;
  }

  /**
   * Xóa nhật ký gốc cũ hơn số ngày cho trước (tóm tắt câu, ván vẫn giữ). Mã sự kiện là ULID tăng theo thời gian,
   * nên chỉ cần xóa theo khoảng khóa nhỏ hơn mốc 0 giờ của ngày giữ lại xa nhất.
   */
  function donNhatKyCu(ngay) {
    const d = new Date(st.dongHo.now() - (ngay == null ? GIU_NHAT_KY_NGAY : ngay) * 86400000);
    d.setHours(0, 0, 0, 0);
    return kho.xoaKhoaDuoi('su_kien', ulidMoc(d.getTime())).catch(function () { return 0; });
  }

  /** Dọn nhật ký gốc cũ mỗi ngày một lần, chạy nền sau khi app đã mở (không bắt bé chờ). */
  function donNhatKyMoiNgay() {
    const nay = ngayDiaPhuong(st.dongHo.now());
    try { if (window.localStorage.getItem(KHOA_DON) === nay) return; } catch (e) { /* bỏ qua */ }
    setTimeout(function () {
      donNhatKyCu().then(function () {
        try { window.localStorage.setItem(KHOA_DON, nay); } catch (e) { /* bỏ qua */ }
      });
    }, 3000);
  }

  /* ---------------- Phiên ---------------- */

  function batDauPhien(lyDo) {
    const now = st.dongHo.now();
    st.phien = { id: 'ph_' + ulid(now), t0: st.dongHo.perf(), batDau: now };
    st.cuoi = now;
    day(taoSuKien('phien_bat_dau', {
      phien_ban_app: st.phienBanApp,
      thiet_bi: thietBi(),
      ly_do: lyDo || 'mo_app'
    }, { ms: 0 }));
    ghiDauMo();
  }

  function ketThucPhien(lyDo, luc) {
    if (!st.phien) return;
    const khi = luc != null ? luc : st.dongHo.now();
    day(taoSuKien('phien_ket_thuc', { ly_do: lyDo, giay: Math.round((khi - st.phien.batDau) / 100) / 10 },
      { luc: khi, ms: Math.max(0, khi - st.phien.batDau), van: null, cau: null }));
    st.phien = null;
    ghiDauMo();
  }

  function kiemTraNghi(now) {
    if (!st.be) return;
    if (!st.phien) { batDauPhien('mo_app'); return; }
    if (now - st.cuoi >= NGHI_MS) {
      ketThucPhien('nghi_10_phut', st.cuoi);
      batDauPhien('quay_lai');
    }
  }

  /** Đóng những gì còn mở từ lần chạy trước (app bị tắt ngang). */
  function dongPhienDo() {
    const d = docDauMo();
    if (!d || !d.be || !d.phien) return;
    const luc = typeof d.cuoi === 'number' && d.cuoi > 0 ? d.cuoi : st.dongHo.now();
    const beCu = st.be;
    st.be = d.be;
    const ctx = { luc: luc, phien: d.phien };
    if (d.cau && d.van) {
      day(taoSuKien('cau_ket_thuc', { ket_qua: 'bo_qua', tong_giay: Math.max(0, Math.round((luc - (d.cau.batDau || luc)) / 100) / 10), ly_do: 'dong_app' },
        Object.assign({ van: d.van.id, cau: d.cau.id, game: d.van.game, vung: d.van.vung, man: d.van.man, ms: Math.max(0, luc - (d.cau.batDau || luc)) }, ctx)));
    }
    if (d.van) {
      st.vanDongDo.push({ be: d.be, van: d.van.id, man: d.van.man || null });
      const dem = Object.assign(demMoi(), d.van.dem || {});
      day(taoSuKien('van_ket_thuc', Object.assign(dem, {
        bo_do: true, ly_do: 'dong_app', sao: 0, qua_mong: 0,
        giay: Math.max(0, Math.round((luc - (d.van.batDau || luc)) / 100) / 10),
        cau_cuoi: d.van.cauCuoi || null
      }), Object.assign({ van: d.van.id, cau: null, game: d.van.game, vung: d.van.vung, man: d.van.man, ms: Math.max(0, luc - (d.van.batDau || luc)) }, ctx)));
    }
    day(taoSuKien('phien_ket_thuc', { ly_do: 'khong_ro', giay: Math.max(0, Math.round((luc - (d.phienBatDau || luc)) / 100) / 10) },
      Object.assign({ van: null, cau: null, ms: Math.max(0, luc - (d.phienBatDau || luc)) }, ctx)));
    st.be = beCu;
    try { window.localStorage.removeItem(KHOA_DANG_MO); } catch (e) { /* bỏ qua */ }
  }

  /* ---------------- Ván và câu ---------------- */

  function batDauVan(o) {
    if (st.van) ketThucVan({ bo_do: true, ly_do: 'mo_van_moi' });
    const now = st.dongHo.now();
    kiemTraNghi(now);
    st.van = { id: 'va_' + ulid(now), t0: st.dongHo.perf(), batDau: now, game: o.game, vung: o.vung, man: o.man, dem: demMoi(), cauCuoi: null };
    st.suKienVan = [];
    ghi('van_bat_dau', {
      nguon: o.nguon || 'tu_chon',
      nhiem_vu: o.nhiem_vu || null,
      do_kho: o.do_kho || {},
      hat_giong: o.hat_giong != null ? o.hat_giong : null,
      so_cau_du_kien: o.so_cau_du_kien != null ? o.so_cau_du_kien : null
    }, { ms: 0 });
    return st.van.id;
  }

  function cauHien(duLieu) {
    if (!st.van) return null;
    if (st.cau) cauKetThuc({ ket_qua: 'bo_qua', tong_giay: 0, ly_do: 'cau_moi' });
    const now = st.dongHo.now();
    st.cau = { id: 'c_' + ulid(now), t0: st.dongHo.perf(), batDau: now, maCau: duLieu && duLieu.ma_cau };
    st.van.cauCuoi = { cau: st.cau.id, ma_cau: st.cau.maCau || null };
    ghi('cau_hien', duLieu, { ms: 0 });
    return st.cau.id;
  }

  function cauKetThuc(duLieu) {
    if (!st.cau) return null;
    const ev = ghi('cau_ket_thuc', duLieu);
    if (st.van) {
      const d = st.van.dem;
      d.so_cau++;
      const kq = duLieu && duLieu.ket_qua;
      if (kq === 'dung_ngay') d.dung_ngay++;
      else if (kq === 'dung_sau_goi_y') d.dung_sau_goi_y++;
      else if (kq === 'dung_lan_2') d.dung_lan_2++;
      else if (kq === 'sai' || kq === 'het_gio') d.sai++;
      if (duLieu && duLieu.sua_duoc_cau) d.sua_duoc++;
    }
    st.cau = null;
    ghiDauMo();
    return ev;
  }

  /** Kết thúc ván. Trả về Promise<danh sách sự kiện của ván> sau khi đã ghi xuống kho. */
  function ketThucVan(duLieu) {
    if (!st.van) return Promise.resolve([]);
    if (st.cau) cauKetThuc({ ket_qua: 'bo_qua', tong_giay: Math.round((st.dongHo.perf() - st.cau.t0) / 100) / 10, ly_do: 'thoat_van' });
    const now = st.dongHo.now();
    const dl = Object.assign(demMoi(), st.van.dem, {
      giay: Math.round((now - st.van.batDau) / 100) / 10,
      cau_cuoi: st.van.cauCuoi
    }, duLieu || {});
    if (dl.bo_do == null) dl.bo_do = false;
    ghi('van_ket_thuc', dl);
    const ds = st.suKienVan.slice();
    const ctx = { van: st.van.id, game: st.van.game, vung: st.van.vung, man: st.van.man, t0: st.van.t0 };
    st.vanVuaXong = ctx;
    st.van = null;
    st.suKienVan = [];
    ghiDauMo();
    return xa().then(function () { return ds; });
  }

  /** Ghi một sự kiện gắn với ván vừa xong (ví dụ cam_xuc ở màn kết thúc). */
  function ghiSauVan(loai, duLieu) {
    const ctx = st.vanVuaXong || {};
    const tc = { van: ctx.van || null, game: ctx.game, vung: ctx.vung, man: ctx.man, cau: null };
    if (ctx.t0 != null) tc.ms = st.dongHo.perf() - ctx.t0;
    return ghi(loai, duLieu, tc);
  }

  /* ---------------- Vòng đời trang ---------------- */

  let daGanSuKienTrang = false;
  function ganSuKienTrang() {
    if (daGanSuKienTrang) return;
    daGanSuKienTrang = true;
    try {
      window.document.addEventListener('visibilitychange', function () {
        if (window.document.visibilityState === 'hidden') { ghiDauMo(); xa(); }
        else if (st.be) kiemTraNghi(st.dongHo.now());
      });
      window.addEventListener('pagehide', function () { ghiDauMo(); xa(); });
    } catch (e) { /* bỏ qua */ }
  }

  /* ---------------- API ---------------- */

  const api = {
    PHIEN_BAN: PHIEN_BAN,
    NGHI_MS: NGHI_MS,
    kho: kho,
    ulid: ulid,
    isoDiaPhuong: isoDiaPhuong,
    ngayDiaPhuong: ngayDiaPhuong,
    thietBi: thietBi,

    /** Dùng trong kiểm thử: thay đồng hồ { now(), perf() }. */
    caiDongHo: function (dh) { st.dongHo = dh || dongHoMacDinh; },

    /** Mở kho và đóng phiên dở của lần chạy trước. opts: { phienBanApp, khongDungIndexedDB } */
    khoiDong: function (opts) {
      opts = opts || {};
      st.phienBanApp = String(opts.phienBanApp || st.phienBanApp);
      ganSuKienTrang();
      const p = opts.khongDungIndexedDB ? Promise.resolve(kho) : moKho();
      return p.then(function () {
        api.kho = kho;
        dongPhienDo();
        return xa();
      }).then(function () {
        donNhatKyMoiNgay();
        return kho;
      });
    },

    /** Đổi bé đang chơi: đóng phiên của bé cũ, mở phiên cho bé mới. */
    datBe: function (be, lyDo) {
      if (st.be === be && st.phien) return;
      if (st.van) ketThucVan({ bo_do: true, ly_do: 'doi_be' });
      if (st.be && st.phien) ketThucPhien('doi_be');
      st.be = be || null;
      st.vanVuaXong = null;
      if (st.be) batDauPhien(lyDo || 'mo_app');
      else ghiDauMo();
    },
    be: function () { return st.be; },
    /** Lấy (và xóa) danh sách ván dở vừa được đóng lúc khởi động: [{ be, van, man }]. */
    layVanDongDo: function () { const ds = st.vanDongDo; st.vanDongDo = []; return ds; },
    phien: function () { return st.phien ? st.phien.id : null; },
    vanDangMo: function () { return st.van ? st.van.id : null; },
    cauDangMo: function () { return st.cau ? st.cau.id : null; },
    /** Mili giây kể từ lúc câu đang mở hiện ra. */
    msTrongCau: function () { return st.cau ? Math.max(0, Math.round(st.dongHo.perf() - st.cau.t0)) : 0; },

    /** Bé vừa chạm màn hình (để tính nghỉ 10 phút). */
    cham: function () { if (st.be) { kiemTraNghi(st.dongHo.now()); st.cuoi = st.dongHo.now(); } },

    ghi: ghi,
    ghiSauVan: ghiSauVan,
    batDauVan: batDauVan,
    ketThucVan: ketThucVan,
    cauHien: cauHien,
    cauKetThuc: cauKetThuc,
    thaoTac: function (kieu, duLieu) { return ghi('thao_tac', Object.assign({ kieu: kieu }, duLieu || {})); },
    goiY: function (cap, ma, them) { return ghi('goi_y', Object.assign({ cap: cap, ma: ma || null }, them || {})); },
    traLoi: function (duLieu) { return ghi('tra_loi', duLieu); },
    phanHoiXem: function (duLieu) { return ghi('phan_hoi_xem', duLieu); },
    tamDung: function (nguon) { return ghi('tam_dung', { nguon: nguon || 'nut' }); },
    tiepTuc: function (nguon) { return ghi('tiep_tuc', { nguon: nguon || 'nut' }); },

    xa: xa,
    ketThucPhien: function (lyDo) { ketThucPhien(lyDo || 'dong_app'); return xa(); },
    /** Nghe mọi sự kiện vừa ghi (dùng cho kiểm thử và gỡ lỗi). Trả về hàm hủy. */
    nghe: function (fn) {
      st.nghe.push(fn);
      return function () { const i = st.nghe.indexOf(fn); if (i >= 0) st.nghe.splice(i, 1); };
    },

    /** Mọi sự kiện của một bé, sắp theo thời gian (ULID). */
    docCuaBe: function (be) {
      return xa().then(function () { return kho.theoBe('su_kien', be); }).then(function (ds) {
        return ds.sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
      });
    },
    docVan: function (van) {
      return xa().then(function () { return kho.theoVan(van); }).then(function (ds) {
        return ds.sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
      });
    },
    /** Nhật ký gốc dạng JSONL (một dòng một sự kiện). */
    xuatJsonl: function (be) {
      return api.docCuaBe(be).then(function (ds) { return ds.map(function (e) { return JSON.stringify(e); }).join('\n') + (ds.length ? '\n' : ''); });
    },
    /** Xóa mọi dữ liệu của một bé trong mọi kho. */
    xoaBe: function (be) {
      if (st.be === be) api.datBe(null);
      return xa().then(function () {
        return Promise.all(Object.keys(KHO).map(function (ten) {
          if (ten === 'thiet_lap') return kho.xoaNeu(ten, function (o) { return o.be === be; });
          if (ten === 'ho_so') return kho.xoa(ten, be);
          return kho.xoaNeu(ten, function (o) { return o.be === be; });
        }));
      });
    },
    donNhatKyCu: donNhatKyCu,
    _trangThai: st
  };

  window.NhatKy = api;
})();
