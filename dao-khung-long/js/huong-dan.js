/* ============================================================
   huong-dan.js – Trang "Cách chơi" cho bé và thẻ cách chơi của từng trò
   - Trang Cách chơi (#man-huong-dan): 11 chương có hình, chữ to và giọng đọc, dùng số liệu thật của bé
     (khủng long đang ở mức nào, còn bao nhiêu quả mọng nữa, trứng vùng nào sắp nở, nhiệm vụ hôm nay, kỹ năng sắp thuộc).
     Mở từ bản đồ (nút Cách chơi), trang vùng, màn kết thúc. Lần đầu lên đảo mở bản ngắn 4 chương rồi vào nhiệm vụ 1.
   - Thẻ cách chơi của một trò (#hd-lop): 3 bước ngắn theo thể loại và chế độ của màn. Hiện trước lần chơi đầu của
     9 thể loại mới (6 game cũ và Đấu Trường đã có thẻ Bắt đầu riêng), xem lại trong menu Tạm dừng và chương Trò chơi.
   - Mọi con số (quả mọng, mức lớn, điều kiện Đã thuộc, sao, mở đấu trường) đọc từ HocTap và Dao nên không lệch luật thật.
   - Không ghi nhật ký (không phải thao tác học). Hồ sơ bé nhớ huong_dan: { da_mo, gioi_thieu, cach_choi: { game: ngày } }.
   API: window.HuongDan = { CHUONG, THU_TU, GIOI_THIEU, CACH_CHOI, LAN_DAU, cachChoiCua(game, man), conThieu(t),
        mo(o), dong(), cachChoi(game, man, o), datDangChoi(man), moCachChoiDangChoi(), dangMo() }
   ============================================================ */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function esc(t) { return window.PhanHoi.esc(t); }
  function HT() { return window.HocTap; }
  function DAO() { return window.Dao; }
  function AT() { return window.AmThanh; }
  function soDep(n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  /** Chữ để đọc to: bỏ thẻ HTML, gộp khoảng trắng. */
  function chuDoc(html) { return String(html || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }

  /* Biểu tượng giống hệt nút trong game để bé nhận ra */
  const SVG_LOA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  const SVG_DEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.5.4.8 1 .8 1.6V17h6v-1.1c0-.6.3-1.2.8-1.6A6.5 6.5 0 0 0 12 2.5z" fill="#ffd166"/><rect x="9" y="18" width="6" height="2.2" rx="1" fill="#fff"/><rect x="10" y="20.8" width="4" height="1.6" rx=".8" fill="#fff"/></svg>';
  const SVG_DUNG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.4" fill="#fff"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.4" fill="#fff"/></svg>';
  const NUT_TRON = function (svg) { return '<span class="hd-nut-tron">' + svg + '</span>'; };

  /* ============================================================
     1. Cách chơi từng trò: 3 bước, theo chế độ của màn khi trò có nhiều bàn chơi
     ============================================================ */

  const CACH_CHOI = {
    'dua-xe': {
      buoc: [
        ['🏎️', 'Xe chạy trên 3 làn. Mỗi làn có một cổng mang đáp án.'],
        ['👆', 'Chạm bên trái hoặc bên phải màn hình để đổi làn, đi vào cổng có đáp án đúng.'],
        ['⏩', 'Chắc chắn rồi thì bấm Lao tới! Đúng 3 câu liền là TĂNG TỐC.']
      ],
      tram_dung: ['⌨️', 'Ở TRẠM DỪNG, con tự gõ đáp án rồi bấm Xong.']
    },
    'lat-the': {
      buoc: [
        ['🃏', 'Bên trái là thẻ phép tính úp. Chạm để lật một thẻ.'],
        ['🧠', 'Tính trong đầu, rồi tìm thẻ kết quả là anh em của nó ở bên phải.'],
        ['👆', 'Chạm thẻ anh em. Ghép đúng liền 3 cặp được thưởng điểm.']
      ]
    },
    'xep-hinh-so': {
      buoc: [
        ['🔢', 'Đọc số cần xếp ở trên. Chạm cái loa để nghe đọc số.'],
        ['🧱', 'Chạm máy thả ở đầu mỗi cột để thả một khối xuống cột đó. Chạm nút trừ để lấy bớt.'],
        ['✅', 'Đủ 10 khối đơn vị thì tự gộp thành 1 chục. Xếp xong thì bấm Xong.']
      ]
    },
    'truyen-tranh': {
      buoc: [
        ['📖', 'Nghe và xem 3 khung tranh kể chuyện.'],
        ['➕', 'Bước 1: chọn phép tính đúng cho câu chuyện.'],
        ['⌨️', 'Bước 2: gõ kết quả trên bàn phím số rồi bấm Xong.']
      ]
    },
    'xuong-do-luong': {
      che_do: {
        can: [
          ['⚖️', 'Kéo quả cân 1 kg, 2 kg, 5 kg lên đĩa cân, hoặc chạm quả cân rồi chạm đĩa.'],
          ['👀', 'Đĩa nào thấp hơn là bên nặng hơn. Hai đĩa ngang nhau là cân thăng bằng.'],
          ['✅', 'Cân thăng bằng thì chọn số ki-lô-gam. Hỏi bên nào nặng hơn thì chạm vào đĩa cân.']
        ],
        rot: [
          ['🫗', 'Chạm hoặc giữ nút Rót để đổ từng ca 1 lít.'],
          ['🔢', 'Đếm số ca đã rót: mỗi ca là 1 lít.'],
          ['✅', 'Rót đầy thì chọn số lít, hoặc rót tới vạch có ngôi sao rồi bấm Xong. Rót quá thì bấm Bớt 1 l.']
        ],
        thuoc: [
          ['📏', 'Kéo thước, hoặc bấm mũi tên, cho vạch 0 thẳng với đầu đồ vật.'],
          ['👀', 'Xem đầu kia của đồ vật chỉ vào số nào.'],
          ['⌨️', 'Gõ số xăng-ti-mét rồi bấm Xong.']
        ],
        don_vi: [
          ['📦', 'Kéo thẻ đồ vật vào hộp cm, dm, m hay km hợp với nó, hoặc chạm hộp.'],
          ['💡', 'Vật nhỏ đo bằng cm, quãng đường dài đo bằng km.'],
          ['🔢', 'Câu đổi đơn vị thì chọn đáp án hoặc gõ số: 1 dm bằng 10 cm, 1 m bằng 10 dm.']
        ],
        tron: [
          ['🏭', 'Mỗi câu là một trạm: cân, rót nước hoặc đo bằng thước.'],
          ['👂', 'Đọc đề ở trên, chạm cái loa để nghe lại.'],
          ['✅', 'Làm theo đề rồi chọn đáp án hoặc bấm Xong.']
        ]
      }
    },
    'cho-khung-long': {
      che_do: {
        nhan_biet: [
          ['💵', 'Nhìn kỹ số trên tờ tiền: 100, 200, 500 hay 1 000 đồng.'],
          ['👆', 'Chạm tờ tiền đúng, hoặc kéo tờ đó vào khay.'],
          ['🔢', 'Câu đếm tiền thì chạm từng tờ để đánh dấu cho khỏi sót.']
        ],
        tra_tien: [
          ['🛒', 'Mỏ Vịt Long bán hàng, món nào cũng có giá.'],
          ['💵', 'Kéo tờ tiền từ ví vào khay, hoặc chạm tờ tiền. Khay ghi đã trả bao nhiêu đồng.'],
          ['✅', 'Đủ tiền thì bấm Trả tiền. Đưa nhầm thì kéo tờ đó ra.']
        ],
        doi_tien: [
          ['🔄', 'Đổi một tờ tiền lớn lấy các tờ nhỏ có cùng số tiền.'],
          ['💵', 'Kéo các tờ từ hộp tiền lẻ vào khay cho đủ.'],
          ['✅', 'Bấm Đổi xong để kiểm tra.']
        ],
        nguoi_ban: [
          ['🧺', 'Hôm nay con làm người bán hàng!'],
          ['💵', 'Khách đưa nhiều tiền hơn giá. Lấy tiền trong ngăn kéo để trả lại tiền thừa.'],
          ['🔢', 'Đếm thêm từ giá tới số tiền khách đưa, rồi bấm Trả lại khách.']
        ],
        tron: [
          ['🛒', 'Mỗi câu là một việc ở chợ: trả tiền, đổi tiền hoặc trả lại tiền thừa.'],
          ['💵', 'Kéo tờ tiền vào khay, hoặc chạm tờ tiền. Khay cộng giúp con.'],
          ['✅', 'Xong thì bấm nút cam: Trả tiền, Đổi xong hoặc Trả lại khách.']
        ]
      }
    },
    'cau-ca': {
      che_do: {
        kiem_dem: [
          ['🎣', 'Chạm con cá để câu.'],
          ['🧺', 'Thả cá vào đúng giỏ của loại cá đó: kéo cá hoặc chạm giỏ.'],
          ['🔢', 'Câu hết cá thì đếm rồi trả lời. Chạm từng con trong giỏ để đếm cho khỏi sót.']
        ],
        bieu_do: [
          ['🎣', 'Chạm cá để câu vào xô.'],
          ['📊', 'Gai Long xếp cá thành biểu đồ tranh: mỗi hình là 1 con.'],
          ['🔢', 'Đọc biểu đồ rồi trả lời: loại nào nhiều nhất, ít nhất, hơn kém mấy con.']
        ],
        hop_bong: [
          ['🎱', 'Nhìn kỹ các quả bóng trong hộp.'],
          ['🤔', 'Chọn: chắc chắn, có thể hay không thể.'],
          ['👀', 'Gai Long lấy thử 3 lần cho con xem rồi mới chấm.']
        ],
        uoc_luong: [
          ['🐟', 'Đàn cá bơi thành từng nhóm 10 con, hiện 3 giây rồi lặn.'],
          ['👀', 'Không cần đếm từng con: xem có khoảng mấy nhóm 10.'],
          ['✅', 'Chọn số gần đúng nhất, ví dụ khoảng 30, 40 hay 50.']
        ],
        tron: [
          ['🎣', 'Chạm cá để câu, thả vào giỏ hoặc xô.'],
          ['📊', 'Đếm cá, đọc biểu đồ tranh, hoặc đoán quả bóng trong hộp.'],
          ['✅', 'Chọn đáp án hoặc gõ số rồi bấm Xong.']
        ]
      }
    },
    'rung-hinh-khoi': {
      buoc: [
        ['🌳', 'Mỗi câu là một bàn hình vẽ lớn trong rừng.'],
        ['👆', 'Chạm để chọn hình, chọn điểm, hoặc chạm từng đoạn thẳng để đếm và cộng độ dài.'],
        ['✏️', 'Kéo từ điểm này tới điểm kia để nối đoạn thẳng, kéo đồ vật vào rổ. Có nút Xong thì bấm Xong.']
      ]
    },
    'lat-lich': {
      che_do: {
        dong_ho: [
          ['🕒', 'Nhìn đồng hồ trên tháp: kim ngắn chỉ giờ, kim dài chỉ phút.'],
          ['👆', 'Chọn thẻ giờ đúng, hoặc kéo kim cho đồng hồ chỉ đúng giờ của đề.'],
          ['✅', 'Kéo kim xong thì bấm Xong.']
        ],
        lich: [
          ['📅', 'Tờ lịch có các cột từ Thứ Hai tới Chủ nhật.'],
          ['👆', 'Chạm ô ngày, hoặc chạm đầu cột thứ, để trả lời.'],
          ['🔢', 'Câu đếm ngày thì chạm từng ô để đếm.']
        ],
        buoi: [
          ['🌅', 'Một ngày có 24 giờ, chia thành các buổi sáng, trưa, chiều, tối, đêm.'],
          ['👆', 'Kéo thẻ giờ vào đúng buổi, hoặc xếp các việc theo thứ tự.'],
          ['✅', 'Xếp xong thì bấm Xong.']
        ],
        tron: [
          ['🕒', 'Mỗi câu là đồng hồ, tờ lịch hoặc các buổi trong ngày.'],
          ['👆', 'Chọn thẻ, kéo kim đồng hồ hoặc chạm ô trên lịch.'],
          ['✅', 'Xong thì bấm Xong.']
        ]
      }
    },
    'dau-truong': {
      buoc: [
        ['⚔️', '{KL} đấu với trùm. Mỗi câu con làm đúng là một đòn.'],
        ['🔥', 'Đúng 3 câu liền thì tung tuyệt chiêu 2 đòn. Đúng nhờ gợi ý là nửa đòn.'],
        ['😄', 'Sai thì trùm làm trò vui, con không mất gì. Trùm hết máu là con thắng!']
      ]
    },
    'chem-trai-cay': {
      buoc: [
        ['👀', 'Đọc đề ở trên.'],
        ['👆', 'Vuốt ngón tay chém quả mang đáp án đúng.'],
        ['🍉', 'Quả rơi mất sẽ bay lại, con cứ bình tĩnh.']
      ]
    },
    'ban-thien-thach': {
      buoc: [
        ['☄️', 'Thiên thạch mang phép tính hoặc con số rơi chậm rồi đứng chờ.'],
        ['⌨️', 'Gõ kết quả, hoặc số con chọn, trên bàn phím số.'],
        ['🚀', 'Bấm BẮN! Sai lần đầu thì con được thử lại.']
      ]
    },
    'me-cung': {
      buoc: [
        ['👀', 'Đọc câu hỏi ở trên.'],
        ['🦉', 'Đưa Cú Tí tới ô có đáp án đúng.'],
        ['👻', 'Ma chạm vào thì Cú Tí về chỗ xuất phát thôi, không sao cả.']
      ]
    },
    'thap-xep-hinh': {
      buoc: [
        ['🧱', 'Mỗi khối rơi là một câu hỏi. Khối đứng chờ, không lo hết giờ.'],
        ['👆', 'Mỗi cột mang một đáp án. Chạm vào cột có đáp án đúng.'],
        ['⬇️', 'Chạm lần nữa để thả khối xuống cột đó.']
      ]
    },
    'xe-tang': {
      buoc: [
        ['🤖', 'Các robot mang đáp án đi dạo chậm.'],
        ['🎯', 'Chạm robot mang đáp án đúng để bắn.'],
        ['🛡️', 'Robot không bao giờ tới được xe tăng. Cần giúp thì bấm bóng đèn.']
      ]
    },
    'cuoi-ho': {
      buoc: [
        ['🐯', 'Hổ chạy tới các vòng lửa.'],
        ['🔥', 'Mỗi vòng lửa mang một đáp án.'],
        ['👆', 'Chạm vòng có đáp án đúng để hổ nhảy qua.']
      ]
    }
  };
  /** Thể loại hiện thẻ cách chơi trước lần chơi đầu (game cũ và Đấu Trường đã có thẻ Bắt đầu kèm cách chơi). */
  const LAN_DAU = ['dua-xe', 'lat-the', 'xep-hinh-so', 'truyen-tranh', 'xuong-do-luong', 'cho-khung-long', 'cau-ca', 'rung-hinh-khoi', 'lat-lich'];
  /** Chế độ mặc định khi không biết màn (chương Trò chơi). */
  const CHE_DO_DAU = { 'xuong-do-luong': 'can', 'cho-khung-long': 'tra_tien', 'cau-ca': 'kiem_dem', 'lat-lich': 'dong_ho' };

  /**
   * Cách chơi của một trò cho một màn (man có thể null). Trả về { game, ten, buoc: [[biểu tượng, chữ]] } hoặc null.
   * Chữ còn giữ chỗ {KL} (tên khủng long của bé), thay lúc hiện.
   */
  function cachChoiCua(game, man) {
    const c = CACH_CHOI[game];
    if (!c) return null;
    let buoc = c.buoc;
    if (c.che_do) buoc = c.che_do[(man && man.che_do) || ''] || c.che_do[CHE_DO_DAU[game]];
    buoc = buoc.slice();
    if (c.tram_dung && man && man.tram_dung) buoc.push(c.tram_dung);
    return { game: game, ten: (DAO() && DAO().TEN_GAME[game]) || game, buoc: buoc };
  }

  /** Những điều bé còn thiếu để kỹ năng thành Đã thuộc (từ HocTap.tienDoThuoc), mỗi điều một cụm chữ ngắn. */
  function conThieu(t) {
    if (!t) return [];
    const ra = [];
    if (t.tu_lam < t.can_tu_lam) ra.push('tự làm thêm ' + (t.can_tu_lam - t.tu_lam) + ' câu');
    if (t.ti_le == null || t.ti_le < t.can_ti_le) ra.push('đúng ngay ' + Math.round(t.can_ti_le * 10) + ' trên 10 câu' + (t.ti_le != null ? ' (con đang ' + Math.floor(t.ti_le * 10) + ' trên 10)' : ''));
    if (t.so_ngay < t.can_so_ngay) ra.push('chơi thêm ' + (t.can_so_ngay - t.so_ngay) + ' ngày nữa');
    if (t.cau_no > 0) ra.push('làm lại đúng ' + t.cau_no + ' câu từng sai');
    return ra;
  }

  /* ============================================================
     2. Các chương của trang Cách chơi
     Mỗi chương: { id, icon, ten (nhãn mục), rong (hình trải hết bề ngang), ve(c) → HTML hình, noi(c) → nội dung }
     noi(c) trả về { tieu_de, mo, y: [[biểu tượng, HTML]], them (HTML số liệu của bé), hanh: { nhan, lam } }
     ============================================================ */

  function dong1(mang) { return mang.filter(Boolean); }
  function mucCuaBe(c) { const m = c.p.khung_long.muc; return m === 'lay_dong' ? 'trung' : m; }
  function soThuoc(c) { return ((c.ctx.hocTap && c.ctx.hocTap.ky_nang) || []).filter(function (k) { return k.muc === 'da_thuoc' || k.muc === 'vung_chac'; }).length; }
  function khoaHk2(c) { return (c.p.lop || 2) === 2 && !c.p.mo_khoa_vung && (c.p.bai_dang_hoc || 1) < DAO().BAI_HOC_KY_2; }
  function saoMuoi(x) { return Math.round(x * 10); }
  function chipMuc(muc) { return '<span class="chip-muc muc-' + muc + '">' + HT().TEN_MUC[muc] + '</span>'; }
  function sao(n) { return '<span class="hd-sao">' + [0, 1, 2].map(function (i) { return '<i class="' + (i < n ? 'co' : '') + '">★</i>'; }).join('') + '</span>'; }
  function dieuKienMuc(m) {
    if (m.ma === 'trung') return 'Ấp trứng';
    if (m.can_van_xong) return 'Chơi xong 1 ván';
    const phan = [soDep(m.qua_mong) + ' quả mọng'];
    if (m.da_thuoc) phan.push(m.da_thuoc + ' kỹ năng Đã thuộc');
    if (m.dau_truong) phan.push('thắng ' + m.dau_truong + ' đấu trường');
    return phan.join(' + ');
  }
  function nhiemVuKeTiep(c) { return ((c.ctx.nhiemVu && c.ctx.nhiemVu.ds) || []).findIndex(function (x) { return !x.xong; }); }

  const CHUONG = [
    {
      id: 'dao', icon: '🏝️', ten: 'Đảo',
      ve: function (c) {
        return '<div class="hd-dao"><img class="hd-dao-anh" src="' + c.hinh('bg-island-map') + '" alt="">' +
          '<img class="hd-dao-kl' + (mucCuaBe(c) === 'trung' ? ' lac' : '') + '" src="' + c.hk() + '" alt="">' +
          '<span class="hd-dao-bong">Đảo của ' + esc(c.ten) + '</span></div>';
      },
      noi: function (c) {
        return {
          tieu_de: 'Chào mừng con đến Đảo Khủng Long!',
          mo: 'Chào ' + esc(c.ten) + '! Đây là hòn đảo của con.',
          y: dong1([
            ['🥚', 'Con giải toán để nuôi <b>' + esc(c.kl) + '</b> lớn lên.'],
            ['🗺️', 'Đảo có <b>10 vùng đất</b>. Con đi theo số 1, 2, 3… giống thứ tự bài trong sách Toán 2.'],
            ['🦕', 'Mỗi vùng có một <b>quả trứng khủng long mới</b> đang chờ con.'],
            khoaHk2(c) ? ['🔒', 'Vùng có ổ khóa sẽ mở khi con học tới học kì 2.'] : null
          ])
        };
      }
    },
    {
      id: 'nhiem_vu', icon: '📋', ten: 'Nhiệm vụ',
      ve: function (c) {
        const LOAI = { on_cach_quang: 'on', luyen_lai: 'luyen', hoc_moi: 'moi' };
        let ds = (c.ctx.nhiemVu && c.ctx.nhiemVu.ds) || [];
        const mau = !ds.length;
        if (mau) ds = [{ loai: 'on_cach_quang', ten: 'Ôn bài cũ' }, { loai: 'luyen_lai', ten: 'Tập chỗ hay sai' }, { loai: 'hoc_moi', ten: 'Bài mới trong sách' }];
        return '<div class="hd-nv">' + ds.map(function (x, i) {
          const m = x.man ? DAO().man(x.man) : null;
          return (i ? '<span class="hd-nv-mui" aria-hidden="true">▼</span>' : '') +
            '<div class="hd-nv-the ' + LOAI[x.loai] + (x.xong ? ' xong' : '') + '"><span class="hd-nv-so">' + (x.xong ? '✓' : i + 1) + '</span>' +
            '<span class="hd-nv-chu"><small>' + esc(DAO().NHIEM_VU_TEN[x.loai]) + '</small><b>' + esc(m ? m.ten : x.ten) + '</b></span></div>';
        }).join('') + '</div>';
      },
      noi: function (c) {
        const ds = (c.ctx.nhiemVu && c.ctx.nhiemVu.ds) || [];
        const xong = ds.filter(function (x) { return x.xong; }).length;
        const i = nhiemVuKeTiep(c);
        return {
          tieu_de: 'Mỗi ngày: 3 nhiệm vụ, chơi lần lượt',
          mo: 'Mỗi ngày có 3 nhiệm vụ ở bảng bên phải bản đồ.',
          y: [
            ['1️⃣', 'Chạm nút cam <b>Chơi nhiệm vụ 1</b>.'],
            ['2️⃣', 'Chơi xong, con chơi tiếp <b>nhiệm vụ 2</b>, rồi <b>nhiệm vụ 3</b>.'],
            ['🫐', 'Xong cả 3 nhiệm vụ được thêm <b>' + HT().THUONG.xong_3_nhiem_vu + ' quả mọng</b>.'],
            ['🌱', '<b>Ôn nhanh</b> giúp con khỏi quên bài cũ. <b>Luyện lại</b> tập thêm chỗ con hay sai. <b>Học mới</b> là bài mới trong sách.']
          ],
          them: !ds.length ? '' : xong >= ds.length ? 'Con đã xong hết nhiệm vụ hôm nay. Giỏi quá!' : 'Hôm nay con đã xong <b>' + xong + '/' + ds.length + '</b> nhiệm vụ.',
          hanh: i >= 0 && c.ctx.choiNhiemVu ? { nhan: 'Chơi nhiệm vụ ' + (i + 1), lam: function () { c.ctx.choiNhiemVu(i); } } : null
        };
      }
    },
    {
      id: 'vung', icon: '🗺️', ten: 'Vùng đất',
      ve: function (c) {
        const p = c.p;
        const kl = p.ky_luc || {};
        const bang = c.bang;
        const vanCuoi = (c.ctx.vanDs || [])[(c.ctx.vanDs || []).length - 1];
        let v = vanCuoi && DAO().vung(vanCuoi.vung);
        if (!v || v.dau_truong) v = DAO().vung(1);
        const ds = v.man.filter(function (m) { return !m.cup && DAO().choiDuoc(m); }).slice(0, 3);
        const cup = v.man.find(function (m) { return m.cup; });
        const cupMo = DAO().cupMo(v, p);
        let h = '<div class="hd-vg"><p class="hd-vg-ten" style="--mau:' + v.mau + '">Vùng ' + v.so + ' · ' + esc(v.ten) + '</p>';
        ds.forEach(function (m) {
          const k = m.ky_nang_chinh && bang[m.ky_nang_chinh];
          const chip = m.luyen_tap ? '<span class="chip-muc muc-chua_hoc">Luyện tập</span>' : chipMuc(k ? k.muc : 'chua_hoc');
          h += '<div class="hd-vg-man"><img src="' + c.ctx.hinhMan(m) + '" alt=""><span class="hd-vg-chu"><b>Màn ' + m.so + '</b><small>' + esc(m.ten) + '</small></span>' +
            '<span class="hd-vg-phai">' + chip + sao(kl[m.id] ? kl[m.id].sao : 0) + '</span></div>';
        });
        if (cup) {
          h += '<div class="hd-vg-man cup' + (cupMo ? '' : ' tat') + '"><span class="hd-vg-cup">🏆</span><span class="hd-vg-chu"><b>Cúp</b><small>Luyện tập chung</small></span>' +
            '<span class="hd-vg-phai">' + (cupMo ? sao(kl[cup.id] ? kl[cup.id].sao : 0) : '<span class="chip-muc khoa">Mở khi xong các màn trên</span>') + '</span></div>';
        }
        return h + '</div>';
      },
      noi: function (c) {
        const S = HT().SAO;
        return {
          tieu_de: 'Vùng đất và các màn chơi',
          mo: 'Chạm một vùng trên bản đồ để xem các màn của vùng đó.',
          y: dong1([
            ['⬇️', 'Chơi từ <b>Màn 1</b> xuống dưới. Mỗi màn là một bài trong sách.'],
            ['⭐', 'Mỗi màn có 3 sao. Tự làm đúng ngay ' + saoMuoi(S.ba) + ' trên 10 câu được <b>3 sao</b>, ' + saoMuoi(S.hai) + ' trên 10 câu được 2 sao, chơi xong là có 1 sao.'],
            ['🏆', 'Chơi xong các màn chính thì <b>Cúp</b> ở cuối vùng mở ra.'],
            ['🎨', 'Nhãn màu cho biết con đã thuộc bài chưa: ' + chipMuc('lam_quen') + ' ' + chipMuc('dang_luyen') + ' ' + chipMuc('da_thuoc') + '.'],
            khoaHk2(c) ? ['🔒', 'Màn ghi <b>Học kì 2</b> sẽ mở khi con học tới Bài ' + DAO().BAI_HOC_KY_2 + '.'] : null
          ])
        };
      }
    },
    {
      id: 'trong_man', icon: '🎮', ten: 'Khi chơi',
      ve: function () {
        const cot = function (html, nhan, lop) { return '<span class="hd-hud-cot' + (lop ? ' ' + lop : '') + '">' + html + '<small>' + nhan + '</small></span>'; };
        return '<div class="hd-hud">' +
          '<div class="hd-hud-hang"><span class="hd-hud-o"><small>ĐIỂM</small><b>120</b></span>' +
          cot('<span class="hd-hud-de">36 + 27 = ?<span class="hd-hud-loa">' + SVG_LOA + '</span></span>', 'Đề bài', 'de') +
          cot(NUT_TRON(SVG_DEN), 'Gợi ý') + cot(NUT_TRON(SVG_DUNG), 'Tạm dừng') + '</div>' +
          '<div class="hd-hud-ph"><b>Gần đúng rồi!</b><span>Con xem lời giải. Câu này quay lại sau 2 câu nữa để con tự làm.</span></div>' +
          '</div>';
      },
      noi: function () {
        return {
          tieu_de: 'Khi chơi một màn',
          y: [
            ['<span class="hd-i-loa">' + SVG_LOA + '</span>', 'Đọc đề ở trên cùng. Chạm <b>cái loa</b> để nghe đọc lại.'],
            ['<span class="hd-i-loa">' + SVG_LOA + '</span>', 'Thẻ có chữ và lời giải cũng có <b>loa nhỏ</b>: chạm loa để nghe đọc, không tính là chọn.'],
            [NUT_TRON(SVG_DEN), 'Bí thì chạm <b>bóng đèn</b> để xem gợi ý. Câu nhờ gợi ý được ít quả mọng hơn.'],
            ['🙂', 'Sai cũng không sao! Con xem lời giải, câu đó <b>quay lại sau 2 câu</b> để con làm lại.'],
            ['📘', 'Gặp bài mới, con xem <b>Bài học 30 giây</b> trước khi chơi.'],
            [NUT_TRON(SVG_DUNG), 'Muốn nghỉ thì chạm <b>nút tạm dừng</b>. Trong đó có nút <b>Cách chơi</b> của trò đang chơi.']
          ]
        };
      }
    },
    {
      id: 'qua_mong', icon: '🫐', ten: 'Quả mọng',
      ve: function (c) {
        const q = function (kq, sua, muc) { return HT().quaMongCau(kq, !!sua, muc || 'dang_luyen'); };
        const T = HT().THUONG;
        const dong = [
          ['✅', 'Tự làm đúng, không gợi ý', '+' + q('dung_ngay').qua_mong],
          ['💡', 'Đúng nhờ gợi ý hoặc ở lần thử thứ 2', '+' + q('dung_sau_goi_y').qua_mong],
          ['🔁', 'Làm lại đúng câu từng sai', 'thêm +' + q('dung_ngay', true).them_sua],
          ['⭐', 'Một kỹ năng thành Đã thuộc', '+' + T.ky_nang_da_thuoc],
          ['📋', 'Xong cả 3 nhiệm vụ trong ngày', '+' + T.xong_3_nhiem_vu],
          ['🏆', 'Thắng một đấu trường lần đầu', '+' + T.thang_dau_truong]
        ];
        return '<div class="hd-qm"><p class="hd-qm-co"><img src="' + c.hinh('berry') + '" alt=""><b>' + soDep(c.p.khung_long.qua_mong) + '</b><small>quả mọng của con</small></p>' +
          '<ul class="hd-qm-bang">' + dong.map(function (d) { return '<li><span class="hd-qm-i">' + d[0] + '</span><span>' + d[1] + '</span><b>' + d[2] + '</b></li>'; }).join('') + '</ul></div>';
      },
      noi: function (c) {
        return {
          tieu_de: 'Quả mọng cho ' + c.kl,
          mo: 'Quả mọng là thức ăn của ' + esc(c.kl) + '. Ăn đủ quả mọng thì ' + esc(c.kl) + ' lớn lên.',
          y: [
            ['🫐', 'Câu nào con <b>tự làm đúng</b> được nhiều quả mọng nhất.'],
            ['🚫', 'Làm sai thì chưa có quả, nhưng con <b>không bao giờ bị trừ</b> quả mọng.'],
            ['🐢', 'Kỹ năng đã <b>Vững chắc</b> thì mỗi câu chỉ được +' + HT().quaMongCau('dung_ngay', false, 'vung_chac').qua_mong + '. Con sang bài mới để được nhiều hơn nhé.']
          ]
        };
      }
    },
    {
      id: 'lon_len', icon: '🥚', ten: 'Lớn lên', rong: true,
      ve: function (c) {
        const ds = HT().MUC_LON.filter(function (m) { return m.ma !== 'lay_dong'; });
        const nay = ds.findIndex(function (m) { return m.ma === mucCuaBe(c); });
        return '<ol class="hd-thang">' + ds.map(function (m, i) {
          const lop = i < nay ? 'qua' : i === nay ? 'nay' : 'sau';
          return '<li class="' + lop + '"><span class="hd-thang-anh"><img src="' + c.hk(m.ma) + '" alt=""' + (lop === 'nay' && m.ma === 'trung' ? ' class="lac"' : '') + '>' +
            (lop === 'nay' ? '<em>' + esc(c.kl) + ' đây!</em>' : '') + '</span><b>' + esc(m.ten) + '</b><small>' + esc(dieuKienMuc(m)) + '</small></li>';
        }).join('') + '</ol>';
      },
      noi: function (c) {
        const p = c.p;
        const muc = HT().MUC_LON.find(function (m) { return m.ma === p.khung_long.muc; }) || HT().MUC_LON[0];
        const ke = HT().mucLonKeTiep(muc.ma);
        let them;
        if (!ke) them = '<b>' + esc(c.kl) + '</b> đã là <b>Huyền thoại</b>, mức cao nhất rồi!';
        else {
          const ke2 = ke.ma === 'lay_dong' ? HT().mucLonKeTiep('lay_dong') : ke;
          const q = p.khung_long.qua_mong || 0;
          const can = [];
          if (ke2.can_van_xong) can.push('chơi xong một ván');
          if (q < ke2.qua_mong) can.push('còn ' + soDep(ke2.qua_mong - q) + ' quả mọng nữa');
          if (ke2.da_thuoc && soThuoc(c) < ke2.da_thuoc) can.push('thuộc thêm ' + (ke2.da_thuoc - soThuoc(c)) + ' kỹ năng');
          if (ke2.dau_truong && Object.keys(p.dau_truong_thang || {}).length < ke2.dau_truong) can.push('thắng một đấu trường');
          const tiLe = ke2.qua_mong ? Math.min(1, q / ke2.qua_mong) : 0;
          them = '<b>' + esc(c.kl) + '</b> đang là <b>' + esc(muc.ma === 'lay_dong' ? 'Trứng' : muc.ten) + '</b>. ' +
            (can.length ? 'Con ' + can.join(', ') + ' là ' + esc(c.kl) + ' lên <b>' + esc(ke2.ten) + '</b>!' : 'Sắp lên <b>' + esc(ke2.ten) + '</b> rồi!') +
            (ke2.qua_mong ? '<span class="thanh hd-thanh"><i style="width:' + Math.round(tiLe * 100) + '%"></i></span>' : '');
        }
        return {
          tieu_de: 'Ấp trứng và lớn lên',
          mo: 'Quả trứng nở khi con chơi xong ván đầu tiên. Rồi ' + esc(c.kl) + ' lớn lên nhờ <b>quả mọng</b> và các kỹ năng <b>Đã thuộc</b>.',
          y: [],
          them: them
        };
      }
    },
    {
      id: 'ban_moi', icon: '🦕', ten: 'Bạn mới', rong: true,
      ve: function (c) {
        const p = c.p;
        return '<div class="hd-bm">' + DAO().VUNG.filter(function (v) { return !v.dau_truong; }).map(function (v) {
          const tv = p.trung_vung && p.trung_vung[v.so];
          const tt = DAO().trangThaiVung(v, p, c.ctx.hocTap);
          const ky = DAO().kyNangCuaVung(v);
          const thuoc = ky.filter(function (k) { return c.bang[k] && (c.bang[k].muc === 'da_thuoc' || c.bang[k].muc === 'vung_chac'); }).length;
          const no = tv && tv.no;
          // Chưa nở: quả trứng màu của vùng, bóng đen của bạn khủng long nấp phía sau cho bé tò mò
          const hinh = no ? '<img src="' + c.hinh(v.loai) + '" alt="">'
            : '<img class="hd-bm-bong" src="' + c.hinh(v.loai) + '" alt=""><img class="hd-bm-trung" src="' + c.hk('trung') + '" alt="" style="filter:hue-rotate(' + (DAO().MAU_TRUNG[v.so] || 40) + 'deg) saturate(1.1)">';
          const phu = no ? esc(tv.ten || v.ten_loai) : !tt.mo ? '🔒 Chưa mở' : thuoc + '/' + ky.length + ' đã thuộc';
          return '<button type="button" class="hd-bm-the' + (no ? ' no' : '') + (!tt.mo || tt.sap_co ? ' khoa' : '') + '" data-vung="' + v.so + '"' + (!tt.mo || tt.sap_co ? ' aria-disabled="true"' : '') + '>' +
            '<span class="hd-bm-anh">' + hinh + '</span><b>' + esc(v.ten_loai) + '</b><small>Vùng ' + v.so + ' · ' + phu + '</small></button>';
        }).join('') + '</div>';
      },
      noi: function (c) {
        const p = c.p;
        const ds = DAO().VUNG.filter(function (v) { return !v.dau_truong; });
        const daNo = ds.filter(function (v) { return p.trung_vung && p.trung_vung[v.so] && p.trung_vung[v.so].no; }).length;
        // Trứng sắp nở nhất: vùng đã mở, chưa nở, nhiều kỹ năng đã thuộc nhất (tính theo tỉ lệ)
        let gan = null;
        ds.forEach(function (v) {
          if ((p.trung_vung && p.trung_vung[v.so] && p.trung_vung[v.so].no) || !DAO().trangThaiVung(v, p, c.ctx.hocTap).mo) return;
          const ky = DAO().kyNangCuaVung(v);
          if (!ky.length) return;
          const t = ky.filter(function (k) { return c.bang[k] && (c.bang[k].muc === 'da_thuoc' || c.bang[k].muc === 'vung_chac'); }).length;
          if (t && (!gan || t / ky.length > gan.t / gan.n)) gan = { v: v, t: t, n: ky.length };
        });
        return {
          tieu_de: 'Tìm bạn khủng long mới',
          mo: 'Mỗi vùng đất có một quả trứng khủng long khác nhau.',
          y: [
            ['🥚', 'Con <b>thuộc hết các kỹ năng</b> của một vùng thì trứng của vùng đó nở ra bạn mới.'],
            ['✏️', 'Con được <b>đặt tên</b> cho bạn mới và nhận một <b>món quà</b> cho ' + esc(c.kl) + '.'],
            ['👆', 'Chạm một quả trứng ở trên để đến vùng đó.']
          ],
          them: 'Con đã có <b>' + daNo + '/' + ds.length + '</b> bạn khủng long.' +
            (gan ? ' Trứng sắp nở nhất: <b>' + esc(gan.v.ten_loai) + '</b>, ' + gan.t + '/' + gan.n + ' kỹ năng đã thuộc.' : '')
        };
      }
    },
    {
      id: 'da_thuoc', icon: '⭐', ten: 'Đã thuộc',
      ve: function () {
        return '<ol class="hd-bac">' + HT().MUC.map(function (m, i) {
          return '<li style="--i:' + i + '"><span class="hd-bac-o muc-' + m + '">' + HT().TEN_MUC[m] + '</span>' +
            (m === 'da_thuoc' ? '<em>Trứng nở cần mức này</em>' : '') + '</li>';
        }).join('') + '</ol>';
      },
      noi: function (c) {
        const D = HT().DK_THUOC;
        const daSua = HT().tapDaSua(c.ctx.cauDs || []);
        const theoKy = {};
        (c.ctx.cauDs || []).forEach(function (x) { if (x.ky_nang) (theoKy[x.ky_nang] = theoKy[x.ky_nang] || []).push(x); });
        const sap = [];
        Object.keys(c.bang).forEach(function (kn) {
          const k = c.bang[kn];
          if (k.muc !== 'dang_luyen' && k.muc !== 'lam_quen') return;
          const t = HT().tienDoThuoc(theoKy[kn] || [], daSua, c.ctx.homNay);
          const diem = Math.min(1, t.tu_lam / t.can_tu_lam) + Math.min(1, (t.ti_le || 0) / t.can_ti_le) + Math.min(1, t.so_ngay / t.can_so_ngay) + (t.cau_no ? 0 : 1);
          sap.push({ kn: kn, t: t, diem: diem });
        });
        sap.sort(function (a, b) { return b.diem - a.diem; });
        const KY = window.NganHang.KY_NANG;
        const n = soThuoc(c);
        return {
          tieu_de: 'Khi nào kỹ năng Đã thuộc?',
          mo: 'Mỗi màn luyện một kỹ năng. Kỹ năng thành <b>Đã thuộc</b> khi con:',
          y: [
            ['📝', 'tự làm, không gợi ý, từ <b>' + D.tu_lam + ' câu</b> trở lên,'],
            ['🎯', 'đúng ngay <b>' + saoMuoi(D.ti_le) + ' trên 10 câu</b>,'],
            ['📅', 'chơi ở <b>' + D.so_ngay + ' ngày khác nhau</b>,'],
            ['🔁', 'làm lại đúng các câu từng sai.'],
            ['🌳', 'Ôn lại sau ' + HT().MOC_ON.slice(0, 4).join(', ') + ' ngày mà vẫn đúng thì thành <b>Vững chắc</b>.']
          ],
          them: 'Con đã thuộc <b>' + n + '</b> kỹ năng.' + (sap.length ? '<ul class="hd-sap">' + sap.slice(0, 3).map(function (x) {
            const thieu = conThieu(x.t);
            return '<li><b>' + esc(KY[x.kn] ? KY[x.kn].ten : x.kn) + '</b>: ' + (thieu.length ? 'còn ' + esc(thieu.join(', ')) : 'sắp thuộc rồi!') + '</li>';
          }).join('') + '</ul>' : '')
        };
      }
    },
    {
      id: 'dau_truong', icon: '🏆', ten: 'Đấu trường',
      ve: function (c) {
        const p = c.p;
        return '<div class="hd-dt">' + DAO().VUNG.filter(function (v) { return v.dau_truong; }).map(function (v) {
          const m = v.man[0];
          const tt = DAO().trangThaiVung(v, p, c.ctx.hocTap);
          const thang = p.dau_truong_thang && p.dau_truong_thang[v.so];
          const nhan = thang ? '<span class="chip-muc muc-da_thuoc">Đã thắng 🏆</span>' : tt.mo ? '<span class="chip-muc muc-lam_quen">Đã mở</span>' : '<span class="chip-muc khoa">🔒 Chưa mở</span>';
          return '<div class="hd-dt-the' + (tt.mo ? '' : ' khoa') + '"><img src="' + c.hinh(m.dau_truong.boss) + '" alt=""><b>' + esc(m.ten) + '</b><small>Trùm: ' + esc(m.dau_truong.ten_boss) + '</small>' + nhan + '</div>';
        }).join('') + '</div>';
      },
      noi: function (c) {
        const M = DAO().DAU_TRUONG_MO;
        const moSom = (c.p.lop || 2) === 2 && !c.p.mo_khoa_vung;
        return {
          tieu_de: 'Cúp và Đấu trường',
          y: dong1([
            ['🏆', '<b>Cúp</b> ở cuối mỗi vùng là màn luyện tập chung của vùng đó.'],
            ['⚔️', 'Ở <b>Đấu Trường</b>, ' + esc(c.kl) + ' đấu với trùm. Mỗi câu đúng là một đòn, 3 câu đúng liền là tuyệt chiêu.'],
            ['😄', 'Sai thì trùm chỉ làm trò vui, con không mất gì.'],
            ['🎁', 'Thắng lần đầu được cúp, quà cho ' + esc(c.kl) + ' và <b>' + HT().THUONG.thang_dau_truong + ' quả mọng</b>. Muốn thành Huyền thoại thì phải thắng một đấu trường.'],
            moSom ? ['🔓', 'Đấu Trường Học Kì 1 mở khi con học tới Bài ' + M[11].bai + ' hoặc đã luyện ' + M[11].ky_nang + ' kỹ năng. Đấu Trường Cuối Năm mở khi tới Bài ' + M[12].bai + ' hoặc đã luyện ' + M[12].ky_nang + ' kỹ năng.'] : null
          ])
        };
      }
    },
    {
      id: 'hang', icon: '🏠', ten: 'Hang Khủng Long',
      ve: function (c) {
        const PK = window.PhuKien;
        if (!PK) return '';
        const co = PK.cuaBe(c.p);
        return '<div class="hd-hang">' + PK.DS.map(function (d) {
          const la = co.indexOf(d.ma) >= 0;
          return '<span class="hd-hang-o' + (la ? '' : ' khoa') + '"><img src="' + c.hinh(d.anh) + '" alt=""><small>' + esc(la ? d.ten : '???') + '</small></span>';
        }).join('') + '</div>';
      },
      noi: function (c) {
        const PK = window.PhuKien;
        const co = PK ? PK.cuaBe(c.p).length : 0;
        return {
          tieu_de: 'Hang Khủng Long và món đồ',
          mo: 'Hang Khủng Long là nhà của ' + esc(c.kl) + '. Trong hang có tủ đồ, các bạn khủng long và kệ cúp của con.',
          y: [
            ['🏠', 'Chạm nút <b>Hang</b> ở góc dưới bản đồ, hoặc chạm ' + esc(c.kl) + ' trên bản đồ, để vào hang.'],
            ['🎁', 'Trứng vùng nở hay thắng đấu trường, con nhận một <b>món đồ</b> cho ' + esc(c.kl) + '. Có tất cả ' + (PK ? PK.DS.length : 12) + ' món.'],
            ['👕', 'Trong <b>Tủ đồ</b>, chạm một món để nghe con có món đó vì sao, rồi chạm <b>Mặc cho ' + esc(c.kl) + '</b>. Mỗi lúc ' + esc(c.kl) + ' mặc một món.'],
            ['✨', 'Mỗi món có <b>phép</b>: mặc món đó khi chơi ở vùng của nó, mỗi câu con làm đúng thì món đồ làm trò vui. Phép không làm bài dễ hơn.'],
            ['⏱️', 'Thời gian ở trong hang cũng tính vào giờ chơi của con.']
          ],
          them: 'Con đã có <b>' + co + '/' + (PK ? PK.DS.length : 12) + '</b> món đồ.',
          hanh: c.ctx.moHang ? { nhan: 'Vào Hang Khủng Long', lam: function () { c.ctx.moHang(); } } : null
        };
      }
    },
    {
      id: 'tro_choi', icon: '🕹️', ten: 'Trò chơi', rong: true,
      ve: function (c) {
        return '<div class="hd-tc">' + Object.keys(CACH_CHOI).map(function (g) {
          return '<button type="button" class="hd-tc-nut" data-game="' + g + '"><img src="' + c.ctx.hinhGame(g) + '" alt=""><b>' + esc(DAO().TEN_GAME[g]) + '</b></button>';
        }).join('') + '</div>';
      },
      noi: function () {
        return {
          tieu_de: 'Các trò chơi trên đảo',
          mo: 'Đảo có ' + Object.keys(CACH_CHOI).length + ' trò chơi. Một bài Toán được luyện bằng nhiều trò khác nhau.',
          y: [
            ['👆', 'Chạm một trò ở trên để xem cách chơi.'],
            [NUT_TRON(SVG_DUNG), 'Đang chơi mà quên cách chơi thì chạm nút tạm dừng, rồi chọn <b>Cách chơi</b>.']
          ]
        };
      }
    }
  ];
  const THU_TU = CHUONG.map(function (x) { return x.id; });
  /** Bản ngắn cho lần đầu lên đảo. */
  const GIOI_THIEU = ['dao', 'nhiem_vu', 'trong_man', 'lon_len'];
  function chuong(id) { return CHUONG.find(function (x) { return x.id === id; }) || null; }

  /* ============================================================
     3. Giao diện trang Cách chơi
     ============================================================ */

  let dom = null;
  let s = null; // { o, ds (các id chương đang dùng), i, c (ngữ cảnh), doc (chữ đang đọc) }

  function khoiDom() {
    if (dom) return dom;
    const sec = $('man-huong-dan');
    sec.innerHTML =
      '<div class="hd-khung">' +
        '<header class="hd-dau">' +
          '<button class="nut-quay trang" id="hd-quay" type="button" aria-label="Quay lại">‹</button>' +
          '<div class="hd-dau-chu"><p class="hd-nhan">Cách chơi</p><h1 id="hd-tieu-de"></h1></div>' +
          '<button class="hd-nghe" id="hd-nghe" type="button">' + SVG_LOA + '<span>Nghe</span></button>' +
        '</header>' +
        '<nav class="hd-muc" id="hd-muc" aria-label="Các mục của trang Cách chơi"></nav>' +
        '<article class="hd-trang" id="hd-trang" aria-live="polite"></article>' +
        '<footer class="hd-duoi">' +
          '<img class="hd-kl" id="hd-kl" alt="">' +
          '<ol class="hd-cham" id="hd-cham" aria-hidden="true"></ol>' +
          '<div class="nut-hang">' +
            '<button class="nut nut-trang" id="hd-lui" type="button">‹ Trước</button>' +
            '<button class="nut nut-cam" id="hd-tiep" type="button">Tiếp ›</button>' +
          '</div>' +
        '</footer>' +
      '</div>';
    dom = {
      man: sec, tieuDe: $('hd-tieu-de'), muc: $('hd-muc'), trang: $('hd-trang'), cham: $('hd-cham'), kl: $('hd-kl'),
      quay: $('hd-quay'), nghe: $('hd-nghe'), lui: $('hd-lui'), tiep: $('hd-tiep')
    };
    dom.quay.addEventListener('click', function () { dong(); });
    dom.nghe.addEventListener('click', function () { if (s && s.doc) AT().doc(s.doc); });
    dom.lui.addEventListener('click', function () { if (s && s.i > 0) { AT().bat('cham'); den(s.i - 1); } });
    dom.tiep.addEventListener('click', function () { tiep(); });
    dom.muc.addEventListener('click', function (e) {
      const b = e.target.closest('[data-chuong]');
      if (!b || !s) return;
      AT().bat('cham');
      den(s.ds.indexOf(b.getAttribute('data-chuong')));
    });
    // Việc bé chọn trong trang (chơi nhiệm vụ, sang vùng): app tự chuyển màn nên trang ẩn đi; nếu app từ chối
    // (ví dụ đã chơi đủ phút hôm nay) thì trang vẫn còn nguyên và các nút vẫn dùng được.
    dom.trang.addEventListener('click', function (e) {
      if (!s) return;
      const h = e.target.closest('.hd-hanh');
      if (h && s.hanh) { AT().bat('cham'); AT().dungDoc(); s.hanh.lam(); return; }
      const vg = e.target.closest('.hd-bm-the');
      if (vg) {
        AT().bat('cham');
        if (vg.getAttribute('aria-disabled') !== 'true' && s.c.ctx.moVung) { AT().dungDoc(); s.c.ctx.moVung(+vg.getAttribute('data-vung')); }
        return;
      }
      const g = e.target.closest('.hd-tc-nut');
      if (g) { AT().bat('cham'); cachChoi(g.getAttribute('data-game'), null, { nut: 'Xong', ctx: s.c.ctx }); }
    });
    document.addEventListener('keydown', function (e) {
      if (!s || lop.mo || dom.man.classList.contains('hidden')) return;
      if (e.key === 'ArrowRight') { tiep(); e.preventDefault(); }
      else if (e.key === 'ArrowLeft' && s.i > 0) { den(s.i - 1); e.preventDefault(); }
      else if (e.key === 'Escape') { dong(); e.preventDefault(); }
    });
    return dom;
  }
  /** Ngữ cảnh của lần mở trang gần nhất (thẻ cách chơi dùng khi không được truyền ngữ cảnh). */
  let ctxCuoi = null;

  /**
   * Mở trang Cách chơi.
   * o: { ctx, chuong (id chương mở đầu), cheDo: 'day_du' | 'gioi_thieu', onDong() (bé bấm quay lại, hoặc Xem bản đồ ở bản giới thiệu) }
   * ctx: { hoSo, hocTap, cauDs, vanDs, nhiemVu, homNay, hinh(ten), hinhKhungLong(p, loai), tenKhungLong(p), hinhMan(m), hinhGame(g),
   *        choiNhiemVu(i), moVung(so) } (app.js dựng). Màn #man-huong-dan do app hiện trước khi gọi.
   */
  function mo(o) {
    khoiDom();
    const ctx = o.ctx;
    ctxCuoi = ctx;
    const p = ctx.hoSo;
    const gioiThieu = o.cheDo === 'gioi_thieu';
    const ds = gioiThieu ? GIOI_THIEU : THU_TU;
    s = {
      o: o, ds: ds, i: Math.max(0, ds.indexOf(o.chuong || ds[0])), gioiThieu: gioiThieu,
      c: {
        ctx: ctx, p: p, ten: p.ten, kl: ctx.tenKhungLong(p), hinh: ctx.hinh,
        hk: function (loai) { return ctx.hinh(ctx.hinhKhungLong(p, loai)); },
        bang: HT().bangMuc(ctx.hocTap)
      }
    };
    dom.man.classList.toggle('gioi-thieu', gioiThieu);
    dom.kl.src = s.c.hk('goi_y');
    dom.muc.innerHTML = gioiThieu ? '' : CHUONG.map(function (x) {
      return '<button type="button" class="hd-muc-nut" data-chuong="' + x.id + '"><span aria-hidden="true">' + x.icon + '</span>' + esc(x.ten) + '</button>';
    }).join('');
    den(s.i);
  }

  function den(i) {
    if (!s) return;
    s.i = Math.max(0, Math.min(s.ds.length - 1, i));
    const ch = chuong(s.ds[s.i]);
    const n = ch.noi(s.c);
    s.hanh = n.hanh || null;
    const cuoi = s.i === s.ds.length - 1;
    // Bản giới thiệu kết thúc bằng nút chơi nhiệm vụ đầu tiên
    if (s.gioiThieu && cuoi && !s.hanh) {
      const k = nhiemVuKeTiep(s.c);
      const ctx = s.c.ctx;
      if (k >= 0 && ctx.choiNhiemVu) s.hanh = { nhan: 'Chơi nhiệm vụ ' + (k + 1), lam: function () { ctx.choiNhiemVu(k); } };
    }
    dom.tieuDe.textContent = s.gioiThieu ? 'Chào mừng ' + s.c.ten + '!' : n.tieu_de;
    dom.trang.className = 'hd-trang' + (ch.rong ? ' rong' : '');
    dom.trang.setAttribute('data-chuong', ch.id);
    dom.trang.innerHTML = '<div class="hd-trang-noi">' +
      '<div class="hd-hinh">' + ch.ve(s.c) + '</div>' +
      '<div class="hd-chu">' +
        (s.gioiThieu ? '<h2>' + esc(n.tieu_de) + '</h2>' : '') +
        (n.mo ? '<p class="hd-mo">' + n.mo + '</p>' : '') +
        (n.y && n.y.length ? '<ul class="hd-y">' + n.y.map(function (y) { return '<li><span class="hd-i" aria-hidden="true">' + y[0] + '</span><span>' + y[1] + '</span></li>'; }).join('') + '</ul>' : '') +
        (n.them ? '<div class="hd-them">' + n.them + '</div>' : '') +
        (s.hanh ? '<button type="button" class="nut nut-cam hd-hanh">' + esc(s.hanh.nhan) + ' ›</button>' : '') +
      '</div></div>';
    dom.trang.scrollTop = 0;
    dom.muc.querySelectorAll('.hd-muc-nut').forEach(function (b) {
      const on = b.getAttribute('data-chuong') === ch.id;
      b.classList.toggle('dang', on);
      if (on) { b.setAttribute('aria-current', 'page'); try { b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* bỏ qua */ } } else b.removeAttribute('aria-current');
    });
    dom.cham.innerHTML = s.ds.map(function (x, k) { return '<li class="' + (k < s.i ? 'xong' : k === s.i ? 'dang' : '') + '"></li>'; }).join('');
    dom.lui.classList.toggle('hidden', s.i === 0);
    if (cuoi) dom.tiep.textContent = s.gioiThieu ? 'Xem bản đồ' : 'Xong';
    else dom.tiep.innerHTML = s.gioiThieu ? 'Tiếp ›' : 'Tiếp<span class="hd-tiep-ten">: ' + esc(chuong(s.ds[s.i + 1]).ten) + '</span> ›';
    dom.tiep.className = 'nut ' + (cuoi && s.hanh ? 'nut-trang' : 'nut-cam');
    s.doc = chuDoc([n.tieu_de + '.', n.mo || ''].concat((n.y || []).map(function (y) { return y[1]; }), [n.them || '']).join(' '));
    AT().doc(s.doc);
  }

  function tiep() {
    if (!s) return;
    AT().bat('cham');
    if (s.i < s.ds.length - 1) den(s.i + 1);
    else dong();
  }

  /** Đóng trang (nút quay lại, Xong, phím Esc) và về màn trước qua onDong. */
  function dong() {
    if (!s) return;
    const o = s.o;
    s = null;
    AT().dungDoc();
    if (o.onDong) o.onDong();
  }

  /* ============================================================
     4. Thẻ cách chơi của một trò (lớp phủ trên mọi màn)
     ============================================================ */

  const lop = { mo: false, o: null, doc: '' };
  let domLop = null;
  function khoiLop() {
    if (domLop) return domLop;
    const el = document.createElement('div');
    el.className = 'hd-lop hidden';
    el.id = 'hd-lop';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'hd-cc-ten');
    el.innerHTML =
      '<div class="hd-cc">' +
        '<div class="hd-cc-dau"><img class="hd-cc-icon" id="hd-cc-icon" alt="">' +
          '<div class="hd-cc-tieu"><small>Cách chơi</small><h2 id="hd-cc-ten"></h2><p id="hd-cc-man"></p></div>' +
          '<button class="hd-nghe" id="hd-cc-nghe" type="button">' + SVG_LOA + '<span>Nghe</span></button></div>' +
        '<ol class="hd-cc-buoc" id="hd-cc-buoc"></ol>' +
        '<div class="hd-cc-duoi"><img class="hd-cc-kl" id="hd-cc-kl" alt=""><button class="nut nut-cam nut-to" id="hd-cc-nut" type="button">Bắt đầu chơi</button></div>' +
      '</div>';
    document.body.appendChild(el);
    domLop = { el: el, icon: $('hd-cc-icon'), ten: $('hd-cc-ten'), man: $('hd-cc-man'), buoc: $('hd-cc-buoc'), kl: $('hd-cc-kl'), nut: $('hd-cc-nut'), nghe: $('hd-cc-nghe') };
    domLop.nut.addEventListener('click', function () { dongLop(); });
    domLop.nghe.addEventListener('click', function () { if (lop.doc) AT().doc(lop.doc); });
    // Bắt phím trước các game (đang tạm dừng thì Escape không được cho game chạy tiếp dưới thẻ)
    window.addEventListener('keydown', function (e) {
      if (!lop.mo) return;
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { dongLop(); e.preventDefault(); }
      e.stopImmediatePropagation();
    }, true);
    return domLop;
  }

  /**
   * Hiện thẻ cách chơi của một trò. man: màn (để chọn đúng chế độ, trạm dừng) hoặc null.
   * o: { nut (chữ nút, mặc định Bắt đầu chơi), ctx (để lấy hình và tên khủng long), onDong() }
   * Trả về false nếu trò chưa có cách chơi (onDong được gọi ngay).
   */
  function cachChoi(game, man, o) {
    o = o || {};
    const cc = cachChoiCua(game, man);
    if (!cc) { if (o.onDong) o.onDong(); return false; }
    khoiLop();
    const ctx = o.ctx || ctxCuoi;
    const p = ctx && ctx.hoSo;
    const kl = p ? ctx.tenKhungLong(p) : 'Khủng long';
    const thay = function (t) { return t.replace(/\{KL\}/g, kl); };
    lop.mo = true;
    lop.o = o;
    domLop.icon.src = ctx && ctx.hinhGame ? ctx.hinhGame(game) : '';
    domLop.ten.textContent = cc.ten;
    domLop.man.textContent = man && DAO() ? DAO().tenManNgan(man) : '';
    domLop.kl.src = p ? ctx.hinh(ctx.hinhKhungLong(p, 'goi_y')) : '';
    domLop.buoc.innerHTML = cc.buoc.map(function (b, i) {
      return '<li style="--tre:' + (i * 0.15) + 's"><span class="hd-cc-so">' + (i + 1) + '</span><span class="hd-cc-hinh" aria-hidden="true">' + b[0] + '</span><p>' + esc(thay(b[1])) + '</p></li>';
    }).join('');
    domLop.nut.textContent = o.nut || 'Bắt đầu chơi';
    domLop.el.classList.remove('hidden');
    lop.doc = 'Cách chơi ' + cc.ten + '. ' + cc.buoc.map(function (b) { return thay(b[1]); }).join(' ');
    AT().doc(lop.doc);
    setTimeout(function () { try { domLop.nut.focus(); } catch (e) { /* bỏ qua */ } }, 60);
    return true;
  }
  function dongLop() {
    if (!lop.mo) return;
    lop.mo = false;
    domLop.el.classList.add('hidden');
    AT().dungDoc();
    AT().bat('cham');
    const o = lop.o;
    lop.o = null;
    if (o && o.onDong) o.onDong();
  }

  /* Trò đang chơi, để nút Cách chơi trong menu Tạm dừng (khung chơi chung, Đua Xe) mở đúng thẻ */
  let dangChoi = null;
  let ctxDangChoi = null;
  /** app.js gọi khi vào một màn: màn đang chơi và ngữ cảnh của bé (hình khủng long, biểu tượng trò). */
  function datDangChoi(man, ctx) { dangChoi = man || null; ctxDangChoi = ctx || null; }
  function moCachChoiDangChoi() {
    if (!dangChoi) return false;
    return cachChoi(dangChoi.game, dangChoi, { nut: 'Quay lại', ctx: ctxDangChoi });
  }
  function ganNutTamDung() {
    ['kc-cach-choi', 'dx-cach-choi'].forEach(function (id) {
      const b = $(id);
      if (b) b.addEventListener('click', function () { AT().bat('cham'); moCachChoiDangChoi(); });
    });
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ganNutTamDung);
    else ganNutTamDung();
  }

  window.HuongDan = {
    CHUONG: CHUONG,
    THU_TU: THU_TU,
    GIOI_THIEU: GIOI_THIEU,
    CACH_CHOI: CACH_CHOI,
    LAN_DAU: LAN_DAU,
    cachChoiCua: cachChoiCua,
    conThieu: conThieu,
    mo: mo,
    dong: function () { dong(); },
    cachChoi: cachChoi,
    datDangChoi: datDangChoi,
    moCachChoiDangChoi: moCachChoiDangChoi,
    dangMo: function () { return !!s && !!dom && !dom.man.classList.contains('hidden'); },
    _trangThai: function () { return { s: s, lop: lop, dangChoi: dangChoi }; }
  };
})();
