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
  const KHOA_DANG_MO = 'dkl-phien-mo-v1';
  const KHOA_THE = 'dkl-the-dang-mo-v1'; // thẻ (cửa sổ) đang giữ đảo: { id, luc }; thẻ khác thấy mã lạ thì nhường
  const KHOA_SAO_LUU = 'dkl-sao-luu-v1'; // lúc sao lưu gần nhất trên máy này (ISO)
  const TOI_DA_BO_DEM = 50000; // ghi hỏng mãi thì bộ đệm không lớn vô hạn (bỏ sự kiện cũ nhất)
  const DINH_DANG_SAO_LUU = 'dao-khung-long-sao-luu'; // dấu phiên đang mở (localStorage, ghi đồng bộ) để đóng phiên dở khi app bị tắt ngang

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

  /** Lỗi do kết nối IndexedDB bị đóng hay mất (iOS sau khi app ra nền, phiên bản DB đổi ở thẻ khác): mở lại rồi thử lại được. */
  function laLoiKetNoi(e) {
    const ten = e && e.name;
    return ten === 'InvalidStateError' || ten === 'UnknownError' || ten === 'TransactionInactiveError' ||
      /connection|closing|closed|lost/i.test(String((e && e.message) || ''));
  }
  /** Lỗi hết chỗ lưu (chỉ khi đó mới dọn bớt nhật ký gốc). */
  function laLoiHetCho(e) {
    return !!e && (e.name === 'QuotaExceededError' || e.code === 22 || /quota/i.test(String(e.message || '')));
  }

  function khoIndexedDB(idb) {
    let dbHua = null;
    function mo() {
      if (dbHua) return dbHua;
      const hua = new Promise(function (ok, loi) {
        const yc = idb.open(DB_TEN, DB_PHIEN_BAN);
        yc.onupgradeneeded = function () {
          const db = yc.result;
          Object.keys(KHO).forEach(function (ten) {
            if (db.objectStoreNames.contains(ten)) return;
            const st = db.createObjectStore(ten, { keyPath: KHO[ten].keyPath });
            (KHO[ten].chiMuc || []).forEach(function (cm) { st.createIndex(cm[0], cm[1], { unique: false }); });
          });
        };
        yc.onsuccess = function () {
          const db = yc.result;
          // Thẻ khác nâng phiên bản DB: đóng để không chặn nó; trình duyệt tự đóng kết nối: lần sau mở lại
          db.onversionchange = function () { try { db.close(); } catch (e) { /* bỏ qua */ } if (dbHua === hua) dbHua = null; };
          db.onclose = function () { if (dbHua === hua) dbHua = null; };
          ok(db);
        };
        yc.onerror = function () { loi(yc.error); };
        yc.onblocked = function () { loi(new Error('IndexedDB bị chặn')); };
      });
      dbHua = hua;
      hua.catch(function () { if (dbHua === hua) dbHua = null; });
      return hua;
    }
    /** Chạy fn(db); kết nối hỏng thì mở lại và thử lại một lần (các việc ở đây đều làm lại được: put, delete, đọc). */
    function voiDb(fn) {
      return mo().then(fn).catch(function (e) {
        if (!laLoiKetNoi(e)) throw e;
        dbHua = null;
        return mo().then(fn);
      });
    }
    function gd(ten, cheDo, viec) {
      return voiDb(function (db) {
        return new Promise(function (ok, loi) {
          const tx = db.transaction(ten, cheDo);
          const st = tx.objectStore(ten);
          let kq;
          // viec ném lỗi giữa chừng (ví dụ DataCloneError): hủy cả giao dịch để không ghi dở một nửa
          try { kq = viec(st); } catch (e) { try { tx.abort(); } catch (e2) { /* bỏ qua */ } loi(e); return; }
          tx.oncomplete = function () { ok(kq && kq.__yc ? kq.__yc.result : kq); };
          tx.onerror = function () { loi(tx.error); };
          tx.onabort = function () { loi(tx.error || new Error('abort')); };
        });
      });
    }
    const boc = function (yc) { return { __yc: yc }; };
    function quet(ten, nguon, dk) {
      // Không lọc thì getAll theo khoảng (nhanh hơn con trỏ nhiều trên Safari); có lọc thì duyệt con trỏ, dk(o) true để giữ
      return voiDb(function (db) {
        return new Promise(function (ok, loi) {
          const tx = db.transaction(ten, 'readonly');
          const src = nguon(tx.objectStore(ten));
          let ra = [];
          if (!dk && src.st.getAll) {
            const g = src.st.getAll(src.range || null);
            g.onsuccess = function () { ra = g.result || []; };
          } else {
            const yc = src.st.openCursor(src.range || null);
            yc.onsuccess = function () {
              const c = yc.result;
              if (!c) return;
              if (!dk || dk(c.value)) ra.push(c.value);
              c.continue();
            };
          }
          tx.oncomplete = function () { ok(ra); };
          tx.onerror = function () { loi(tx.error); };
          tx.onabort = function () { loi(tx.error || new Error('abort')); };
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
        return voiDb(function (db) {
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
            tx.onabort = function () { loi(tx.error || new Error('abort')); };
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
  /**
   * Kho cho phần còn lại của app (api.kho): đọc như thường, ghi chỉ khi thẻ này còn giữ đảo (xem giuThe).
   * Thẻ đã nhường thì mọi lần ghi bị bỏ qua, để hai cửa sổ không ghi đè hồ sơ của nhau.
   */
  function bocGhi(k) {
    const ghiDuoc = function (ten, rong) { return function () { return conGiuThe() ? k[ten].apply(k, arguments) : Promise.resolve(rong); }; };
    return {
      loai: k.loai,
      lay: k.lay.bind(k), tatCa: k.tatCa.bind(k), theoBe: k.theoBe.bind(k), theoVan: k.theoVan.bind(k),
      dat: ghiDuoc('dat'), datNhieu: ghiDuoc('datNhieu'), xoa: ghiDuoc('xoa'), xoaNeu: ghiDuoc('xoaNeu', 0), xoaKhoaDuoi: ghiDuoc('xoaKhoaDuoi', 0)
    };
  }
  function moKho() {
    let idb = null;
    try { idb = window.indexedDB || null; } catch (e) { idb = null; }
    if (!idb) { st.loiMoKho = 'khong_co_indexeddb'; return Promise.resolve(kho); }
    const k = khoIndexedDB(idb);
    return k.mo().then(function () { kho = k; api.kho = bocGhi(k); st.loiMoKho = null; return k; }).catch(function (e) {
      st.loiMoKho = String((e && (e.name || e.message)) || e);
      return kho;
    });
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
    canhBaoLuuTru: false,
    loiMoKho: null, // vì sao không mở được IndexedDB (đang lưu tạm trong bộ nhớ)
    loiGhi: null, // lỗi ghi gần nhất (null khi lần ghi sau đã được)
    ben: null, // trình duyệt đã cho lưu bền chưa (navigator.storage.persisted), null là chưa biết
    daXinBen: false,
    theId: null, // mã thẻ này khi đã giữ đảo (giuThe), null khi chưa (kiểm thử)
    nhuong: false, // thẻ này đã nhường cho cửa sổ khác: không ghi gì nữa
    onNhuong: null
  };

  /* ---------------- Một cửa sổ giữ đảo ---------------- */

  function docThe() {
    try { const x = window.localStorage.getItem(KHOA_THE); return x ? JSON.parse(x) : null; } catch (e) { return null; }
  }
  function ghiThe() {
    try { window.localStorage.setItem(KHOA_THE, JSON.stringify({ id: st.theId, luc: Date.now() })); } catch (e) { /* bỏ qua */ }
  }
  /** Thẻ này còn được ghi không. Thấy cửa sổ khác đã giữ đảo thì nhường ngay. */
  function conGiuThe() {
    if (st.nhuong) return false;
    if (!st.theId) return true;
    const t = docThe();
    if (t && t.id && t.id !== st.theId) { nhuong(); return false; }
    return true;
  }
  /** Nhường đảo cho cửa sổ khác: ghi nốt bộ đệm (dấu phiên mở để lại cho cửa sổ kia đóng), rồi thôi ghi. */
  function nhuong() {
    if (st.nhuong) return;
    st.nhuong = true;
    if (st.hengio) { clearTimeout(st.hengio); st.hengio = null; }
    const lo = st.boDem.splice(0, st.boDem.length).map(saoAnToan).filter(Boolean);
    if (lo.length) kho.datNhieu('su_kien', lo).catch(function () { /* bỏ qua */ });
    if (st.onNhuong) { try { st.onNhuong(); } catch (e) { /* bỏ qua */ } }
  }
  function saoAnToan(o) { try { return sao(o); } catch (e) { return null; } }

  function docDauMo() {
    try { const s = window.localStorage.getItem(KHOA_DANG_MO); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }
  function ghiDauMo() {
    if (!conGiuThe()) return;
    try {
      if (!st.phien || !st.be) { window.localStorage.removeItem(KHOA_DANG_MO); return; }
      window.localStorage.setItem(KHOA_DANG_MO, JSON.stringify({
        be: st.be, phien: st.phien.id, phienBatDau: st.phien.batDau, cuoi: st.cuoi,
        van: st.van ? { id: st.van.id, game: st.van.game, vung: st.van.vung, man: st.van.man, batDau: st.van.batDau, dem: st.van.dem, cauCuoi: st.van.cauCuoi, quaMong: st.van.quaMong || 0 } : null,
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
    if (!st.be || st.nhuong) return null;
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
    if (!conGiuThe()) return Promise.resolve();
    if (st.dangGhi) return st.dangGhi.then(function () { return st.boDem.length ? xa() : undefined; });
    if (!st.boDem.length) return Promise.resolve();
    // Chuẩn hóa qua JSON: kho bộ nhớ và IndexedDB lưu giống hệt nhau, và một giá trị lạ không làm hỏng cả lô (DataCloneError)
    const lo = st.boDem.splice(0, st.boDem.length).map(saoAnToan).filter(Boolean);
    st.dangGhi = kho.datNhieu('su_kien', lo).then(function () { st.loiGhi = null; }, function (e) {
      st.loiGhi = e || new Error('loi_ghi');
      st.boDem = lo.concat(st.boDem);
      if (st.boDem.length > TOI_DA_BO_DEM) st.boDem.splice(0, st.boDem.length - TOI_DA_BO_DEM);
      // Lỗi khác hết chỗ (kết nối mất, trình duyệt bận): giữ bộ đệm, thử lại sau, không xóa gì
      if (!laLoiHetCho(e) || st.canhBaoLuuTru) { henGhiLai(); return; }
      // Hết chỗ: bỏ bớt nhật ký gốc cũ nhất (tóm tắt vẫn giữ), rồi thử lại
      st.canhBaoLuuTru = true;
      return donNhatKyCu(30).then(function (n) {
        day(taoSuKien('luu_tru_canh_bao', { loi: String((e && e.name) || e), da_xoa_su_kien: n }));
      });
    }).then(function () { st.dangGhi = null; }, function () { st.dangGhi = null; });
    return st.dangGhi;
  }
  function henGhiLai() {
    if (st.hengio) return;
    st.hengio = setTimeout(function () { st.hengio = null; xa(); }, GHI_MOI_MS * 3);
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
      // Quả mọng bé đã kiếm trong ván dở vẫn được giữ (dấu mở ghi lại sau mỗi câu)
      const qua = Math.max(0, Math.round(Number(d.van.quaMong) || 0));
      st.vanDongDo.push({ be: d.be, van: d.van.id, man: d.van.man || null, qua_mong: qua });
      const dem = Object.assign(demMoi(), d.van.dem || {});
      day(taoSuKien('van_ket_thuc', Object.assign(dem, {
        bo_do: true, ly_do: 'dong_app', sao: 0, qua_mong: qua,
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

  /** Hỏi (không xin) trình duyệt đã cho lưu bền chưa, để Góc phụ huynh hiện đúng. */
  function kiemTraLuuBen() {
    try {
      const sto = window.navigator && window.navigator.storage;
      if (sto && sto.persisted) sto.persisted().then(function (b) { st.ben = !!b; }, function () { /* bỏ qua */ });
    } catch (e) { /* bỏ qua */ }
  }

  /* ---------------- API ---------------- */

  const api = {
    PHIEN_BAN: PHIEN_BAN,
    NGHI_MS: NGHI_MS,
    kho: bocGhi(kho),
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
        api.kho = bocGhi(kho);
        dongPhienDo();
        return xa();
      }).then(function () {
        donNhatKyMoiNgay();
        kiemTraLuuBen();
        return kho;
      });
    },

    /**
     * Thẻ này giữ đảo: thẻ khác đang mở (hay mở sau) sẽ nhường và thôi ghi, onNhuong() được gọi ở thẻ nhường.
     * Gọi trước khoiDong. Trả về Promise, chờ một chút khi vừa có thẻ khác đang chạy để nó kịp ghi nốt.
     */
    giuThe: function (onNhuong) {
      st.onNhuong = onNhuong || null;
      const truoc = docThe();
      st.theId = 'the_' + ulid(st.dongHo.now()).slice(-12);
      ghiThe();
      try {
        window.addEventListener('storage', function (e) { if (e.key === KHOA_THE) conGiuThe(); });
        window.document.addEventListener('visibilitychange', function () {
          if (window.document.visibilityState !== 'hidden' && conGiuThe()) ghiThe();
        });
        const nhip = setInterval(function () { if (window.document.visibilityState !== 'hidden' && conGiuThe()) ghiThe(); }, 4000);
        if (nhip && nhip.unref) nhip.unref(); // chạy kiểm thử bằng Node: không giữ tiến trình
      } catch (e) { /* bỏ qua */ }
      const conSong = truoc && truoc.id && Date.now() - (truoc.luc || 0) < 10000;
      return new Promise(function (ok) { setTimeout(ok, conSong ? 450 : 0); });
    },
    daNhuong: function () { return st.nhuong; },

    /** Tình trạng lưu trữ cho Góc phụ huynh: { loai, loi_mo, loi_ghi, ben, sao_luu_luc }. */
    trangThaiKho: function () {
      let luc = null;
      try { luc = window.localStorage.getItem(KHOA_SAO_LUU); } catch (e) { luc = null; }
      return { loai: kho.loai, loi_mo: st.loiMoKho, loi_ghi: st.loiGhi ? String(st.loiGhi.name || st.loiGhi.message || st.loiGhi) : null, ben: st.ben, sao_luu_luc: luc };
    },
    /** Xin trình duyệt lưu bền (không tự xóa khi thiếu chỗ, hay sau 7 ngày không mở trên Safari). Trả về Promise<true | false | null>. */
    xinLuuBen: function () {
      const sto = window.navigator && window.navigator.storage;
      st.daXinBen = true;
      if (!sto || !sto.persist) return Promise.resolve(null);
      return sto.persisted().then(function (b) { return b || sto.persist(); }).then(function (b) { st.ben = !!b; return st.ben; }, function () { return null; });
    },
    /** Lần đầu bé chạm: xin lưu bền một lần (bỏ qua Firefox vì nó hiện hộp hỏi quyền; phụ huynh tự bấm trong Góc phụ huynh). */
    xinLuuBenLanDau: function () {
      if (st.daXinBen || st.ben) return;
      st.daXinBen = true;
      if (/Firefox\//.test(String((window.navigator && window.navigator.userAgent) || ''))) return;
      api.xinLuuBen();
    },
    /** Ghi số quả mọng hiện có của ván đang mở vào dấu mở (app bị tắt ngang thì vẫn giữ được). */
    quaMongVan: function (n) { if (st.van) { st.van.quaMong = n; ghiDauMo(); } },

    /**
     * Sao lưu cả máy thành một đối tượng JSON: hồ sơ, tóm tắt câu, tóm tắt ván của mọi bé, cùng nhật ký gốc
     * (o.ngayNhatKy ngày gần nhất, mặc định 14; null là toàn bộ). Hồ sơ học tập không cần: app tự tính lại.
     */
    saoLuu: function (o) {
      o = o || {};
      const soNgay = o.ngayNhatKy === undefined ? 14 : o.ngayNhatKy;
      const moc = soNgay == null ? null : ngayDiaPhuong(st.dongHo.now() - (soNgay - 1) * 86400000);
      return xa().then(function () { return kho.tatCa('ho_so'); }).then(function (dsHs) {
        dsHs = dsHs.filter(function (p) { return p && typeof p.id === 'string'; });
        return Promise.all(dsHs.map(function (p) {
          return Promise.all([kho.theoBe('tom_tat_cau', p.id), kho.theoBe('tom_tat_van', p.id), kho.theoBe('su_kien', p.id)]).then(function (r) {
            return {
              ho_so: p, tom_tat_cau: r[0], tom_tat_van: r[1],
              su_kien: moc ? r[2].filter(function (e) { return String(e.luc).slice(0, 10) >= moc; }) : r[2]
            };
          });
        }));
      }).then(function (be) {
        return { dinh_dang: DINH_DANG_SAO_LUU, phien_ban: 1, phien_ban_app: st.phienBanApp, tao_luc: isoDiaPhuong(st.dongHo.now()), nhat_ky_tu: moc, be: be };
      });
    },
    /** Ghi nhớ lúc vừa sao lưu xong (phụ huynh đã tải tệp). */
    daSaoLuu: function () { try { window.localStorage.setItem(KHOA_SAO_LUU, isoDiaPhuong(st.dongHo.now())); } catch (e) { /* bỏ qua */ } },
    /**
     * Kiểm tra một tệp sao lưu (đã JSON.parse). Trả về Promise<{ hop_le, loi, tao_luc, so_be_tren_may, be: [{ id, ten, so_cau, so_van, so_su_kien, da_co }] }>.
     * da_co: máy này đã có bé cùng mã (khôi phục sẽ gộp, giữ bản hồ sơ cập nhật sau).
     */
    kiemTraSaoLuu: function (g) {
      const hong = function (loi) { return Promise.resolve({ hop_le: false, loi: loi, be: [] }); };
      if (!g || typeof g !== 'object' || g.dinh_dang !== DINH_DANG_SAO_LUU) return hong('Tệp này không phải tệp sao lưu của Đảo Khủng Long.');
      if (g.phien_ban !== 1) return hong('Tệp sao lưu của phiên bản mới hơn, hãy tải lại trang rồi thử lại.');
      if (!Array.isArray(g.be) || !g.be.length) return hong('Tệp sao lưu không có bé nào.');
      const ds = [];
      for (let i = 0; i < g.be.length; i++) {
        const b = g.be[i];
        const p = b && b.ho_so;
        if (!p || typeof p.id !== 'string' || !/^be_[0-9A-Z]{6,40}$/.test(p.id) || typeof p.ten !== 'string') return hong('Tệp sao lưu bị hỏng (hồ sơ thứ ' + (i + 1) + ').');
        ds.push({ id: p.id, ten: p.ten, so_cau: (b.tom_tat_cau || []).length, so_van: (b.tom_tat_van || []).length, so_su_kien: (b.su_kien || []).length });
      }
      return kho.tatCa('ho_so').then(function (co) {
        const ma = {};
        co.forEach(function (p) { if (p && p.id) ma[p.id] = true; });
        ds.forEach(function (x) { x.da_co = !!ma[x.id]; });
        return { hop_le: true, loi: null, tao_luc: typeof g.tao_luc === 'string' ? g.tao_luc : null, be: ds, so_be_tren_may: Object.keys(ma).length };
      });
    },
    /**
     * Khôi phục từ tệp sao lưu: gộp theo mã, không xóa gì của máy. Hồ sơ trùng mã giữ bản cập nhật sau; tóm tắt và
     * nhật ký ghi theo mã (cùng mã là cùng một câu, một ván, một sự kiện). toiDaBe: số bé tối đa trên máy (bé mới vượt thì bỏ qua).
     * Trả về Promise<{ so_be, so_cau, so_van, so_su_kien, bo_qua: [tên] }>.
     */
    khoiPhuc: function (g, toiDaBe) {
      const ra = { so_be: 0, so_cau: 0, so_van: 0, so_su_kien: 0, bo_qua: [] };
      const theoLo = function (ten, ds) {
        let hua = Promise.resolve();
        for (let i = 0; i < ds.length; i += 2000) {
          const lo = ds.slice(i, i + 2000);
          hua = hua.then(function () { return kho.datNhieu(ten, lo); });
        }
        return hua;
      };
      return api.kiemTraSaoLuu(g).then(function (kt) {
        if (!kt.hop_le) throw new Error(kt.loi);
        let soBe = kt.so_be_tren_may;
        return g.be.reduce(function (hua, b) {
          return hua.then(function () {
            const p = sao(b.ho_so);
            const id = p.id;
            const cua = function (ds, khoa) {
              return (Array.isArray(ds) ? ds : []).filter(function (o) { return o && o.be === id && typeof o[khoa] === 'string'; }).map(sao);
            };
            return kho.lay('ho_so', id).then(function (co) {
              if (!co && toiDaBe && soBe >= toiDaBe) { ra.bo_qua.push(p.ten); return null; }
              if (!co) soBe++;
              const cau = cua(b.tom_tat_cau, 'cau'), van = cua(b.tom_tat_van, 'van'), ev = cua(b.su_kien, 'id');
              return Promise.resolve()
                .then(function () { return !co || String(p.cap_nhat_luc || '') >= String(co.cap_nhat_luc || '') ? kho.dat('ho_so', p) : null; })
                .then(function () { return theoLo('tom_tat_cau', cau); })
                .then(function () { return theoLo('tom_tat_van', van); })
                .then(function () { return theoLo('su_kien', ev); })
                .then(function () { return kho.xoa('ho_so_hoc_tap', id); })
                .then(function () { ra.so_be++; ra.so_cau += cau.length; ra.so_van += van.length; ra.so_su_kien += ev.length; });
            });
          });
        }, Promise.resolve());
      }).then(function () { return ra; });
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
