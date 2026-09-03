/* ============================================================
   levels.js – Các màn chơi của Xe Tăng Thời Gian
   Mỗi màn = 1 kiến thức xem đồng hồ trong chương trình Toán lớp 2, lớp 3:
     bài học ngắn (lesson) → bắn robot (gen) → hỏi đáp (quiz) để mở khóa màn sau.
   ============================================================ */
(function () {
  'use strict';

  const C = window.Clock;
  const pick = C.pick, chance = C.chance;

  /**
   * Câu hỏi đáp khái niệm: q (câu hỏi), a[0] là đáp án đúng (sẽ được trộn khi hiện),
   * explain (giải thích), clock {h,m} hoặc digital 'hh:mm' (hình minh họa, tùy chọn).
   */
  const LEVELS = [
    /* ---------------- 1. GIỜ ĐÚNG ---------------- */
    {
      id: 'l1', n: 1, title: 'Giờ đúng', icon: '🕒', grade: 2, gradeNote: 'Ôn tập',
      desc: 'Kim dài chỉ số 12',
      questions: 8, fall: 24, speed: 1,
      lesson: {
        intro: 'Đồng hồ có hai kim: kim NGẮN chỉ giờ, kim DÀI chỉ phút.',
        points: [
          'Kim <b>ngắn</b> (màu đen) là <b>kim giờ</b>. Kim <b>dài</b> (màu hồng) là <b>kim phút</b>.',
          'Khi kim dài chỉ <b>số 12</b>, kim ngắn chỉ số mấy thì đó là <b>mấy giờ đúng</b>.',
          'Ví dụ: kim ngắn chỉ số 3, kim dài chỉ số 12 → <b>3 giờ</b>.'
        ],
        examples: [{ h: 3, m: 0 }, { h: 7, m: 0 }, { h: 10, m: 0 }, { h: 12, m: 0 }],
        speech: 'Kim ngắn chỉ giờ, kim dài chỉ phút. Khi kim dài chỉ số 12, kim ngắn chỉ số mấy thì đó là mấy giờ đúng.'
      },
      gen() {
        const cfg = { minutes: [0], styles: ['plain'] };
        return C.fresh(() => chance(0.6) ? C.readQ(Object.assign({ n: 4 }, cfg)) : C.matchQ(Object.assign({ n: 3 }, cfg)));
      },
      quiz: [
        { q: 'Kim ngắn trên đồng hồ chỉ gì?', a: ['Giờ', 'Phút', 'Giây', 'Ngày'], explain: 'Kim ngắn là kim giờ, kim dài là kim phút.' },
        { q: 'Kim dài trên đồng hồ chỉ gì?', a: ['Phút', 'Giờ', 'Ngày', 'Tháng'], explain: 'Kim dài là kim phút. Kim dài chỉ số 12 nghĩa là 0 phút, tức là giờ đúng.' },
        { q: 'Khi đồng hồ chỉ giờ đúng, kim dài chỉ số mấy?', a: ['Số 12', 'Số 6', 'Số 3', 'Số 9'], explain: 'Giờ đúng thì kim dài luôn chỉ số 12.' },
        { q: 'Đồng hồ này chỉ mấy giờ?', clock: { h: 9, m: 0 }, a: ['9 giờ', '12 giờ', '3 giờ', '6 giờ'], explain: 'Kim dài chỉ số 12, kim ngắn chỉ số 9 nên là 9 giờ.' },
        { q: 'Kim ngắn chỉ số 5, kim dài chỉ số 12. Đồng hồ chỉ mấy giờ?', a: ['5 giờ', '12 giờ', '5 giờ 12 phút', '6 giờ'], explain: 'Kim dài chỉ số 12 là giờ đúng, kim ngắn chỉ số 5 nên là 5 giờ.' },
        { q: 'Trên mặt đồng hồ có các số từ mấy đến mấy?', a: ['Từ 1 đến 12', 'Từ 1 đến 10', 'Từ 1 đến 24', 'Từ 0 đến 60'], explain: 'Mặt đồng hồ có 12 số, từ 1 đến 12, xếp thành vòng tròn.' }
      ]
    },

    /* ---------------- 2. GIỜ RƯỠI ---------------- */
    {
      id: 'l2', n: 2, title: 'Giờ rưỡi', icon: '🕞', grade: 2,
      desc: 'Kim dài chỉ số 6 → 30 phút',
      questions: 8, fall: 24, speed: 1,
      lesson: {
        intro: '1 giờ có 60 phút. Kim dài đi hết một vòng là 60 phút.',
        points: [
          'Kim dài chỉ <b>số 6</b> là đi được <b>nửa vòng</b>: <b>30 phút</b>.',
          'Lúc đó kim ngắn nằm <b>ở giữa hai số</b>. Ta đọc theo <b>số nhỏ hơn</b> (số kim ngắn vừa đi qua).',
          'Ví dụ: kim ngắn ở giữa số 3 và số 4, kim dài chỉ số 6 → <b>3 giờ 30 phút</b>, còn gọi là <b>3 giờ rưỡi</b>.'
        ],
        examples: [{ h: 3, m: 30 }, { h: 8, m: 30 }, { h: 12, m: 30 }, { h: 6, m: 0 }],
        speech: 'Một giờ có 60 phút. Kim dài chỉ số 6 là 30 phút. Kim ngắn nằm giữa hai số, ta đọc theo số nhỏ hơn. Ví dụ 3 giờ 30 phút, còn gọi là 3 giờ rưỡi.'
      },
      gen() {
        const cfg = { minutes: [0, 30, 30], styles: ['plain', 'ruoi'] };
        return C.fresh(() => chance(0.55) ? C.readQ(Object.assign({ n: 4 }, cfg)) : C.matchQ(Object.assign({ n: 3 }, cfg)));
      },
      quiz: [
        { q: '1 giờ có bao nhiêu phút?', a: ['60 phút', '30 phút', '100 phút', '12 phút'], explain: '1 giờ = 60 phút. Kim dài đi hết một vòng là 60 phút.' },
        { q: 'Kim dài chỉ số 6 nghĩa là bao nhiêu phút?', clock: { h: 12, m: 30 }, hideHour: true, a: ['30 phút', '6 phút', '60 phút', '15 phút'], explain: 'Số 6 ở nửa vòng đồng hồ, nửa của 60 phút là 30 phút.' },
        { q: '"4 giờ rưỡi" còn gọi là?', a: ['4 giờ 30 phút', '4 giờ 6 phút', '5 giờ 30 phút', '4 giờ 60 phút'], explain: '"Rưỡi" nghĩa là nửa giờ, tức 30 phút. 4 giờ rưỡi = 4 giờ 30 phút.' },
        { q: 'Lúc 7 giờ 30 phút, kim ngắn ở đâu?', a: ['Ở giữa số 7 và số 8', 'Đúng số 7', 'Đúng số 8', 'Ở giữa số 6 và số 7'], explain: 'Được nửa giờ nên kim ngắn đi được nửa đường từ số 7 sang số 8.' },
        { q: 'Đồng hồ này chỉ mấy giờ?', clock: { h: 10, m: 30 }, a: ['10 giờ 30 phút', '11 giờ 30 phút', '6 giờ 10 phút', '10 giờ 6 phút'], explain: 'Kim dài chỉ số 6 là 30 phút. Kim ngắn ở giữa 10 và 11, đọc theo số nhỏ hơn là 10. Vậy là 10 giờ 30 phút.' },
        { q: 'Kim ngắn ở giữa số 1 và số 2, kim dài chỉ số 6. Đó là mấy giờ?', a: ['1 giờ rưỡi', '2 giờ rưỡi', '6 giờ', '1 giờ 6 phút'], explain: 'Kim dài ở số 6 là 30 phút, kim ngắn vừa qua số 1 nên là 1 giờ 30 phút, tức 1 giờ rưỡi.' }
      ]
    },

    /* ---------------- 3. GIỜ 15 PHÚT ---------------- */
    {
      id: 'l3', n: 3, title: 'Giờ 15 phút', icon: '🕒', grade: 2,
      desc: 'Kim dài chỉ số 3 → 15 phút',
      questions: 8, fall: 22, speed: 1,
      lesson: {
        intro: 'Từ số 12 đến số 3, kim dài đi được một phần tư vòng: 15 phút.',
        points: [
          'Kim dài chỉ <b>số 3</b> → <b>15 phút</b>. Ví dụ: <b>2 giờ 15 phút</b>.',
          'Lúc đó kim ngắn <b>vừa đi qua</b> số 2 một chút. Vẫn đọc là <b>2 giờ</b>.',
          'Ghi nhớ: số 12 → <b>giờ đúng</b> · số 3 → <b>15 phút</b> · số 6 → <b>30 phút</b> (rưỡi).'
        ],
        examples: [{ h: 2, m: 15 }, { h: 9, m: 15 }, { h: 5, m: 30 }, { h: 11, m: 0 }],
        speech: 'Kim dài chỉ số 3 là 15 phút. Ví dụ 2 giờ 15 phút. Ghi nhớ: số 12 là giờ đúng, số 3 là 15 phút, số 6 là 30 phút.'
      },
      gen() {
        const cfg = { minutes: [0, 15, 15, 30], styles: ['plain'] };
        return C.fresh(() => chance(0.55) ? C.readQ(Object.assign({ n: 4 }, cfg)) : C.matchQ(Object.assign({ n: 3 }, cfg)));
      },
      quiz: [
        { q: 'Kim dài chỉ số 3 nghĩa là bao nhiêu phút?', clock: { h: 12, m: 15 }, hideHour: true, a: ['15 phút', '3 phút', '30 phút', '45 phút'], explain: 'Từ số 12 đến số 3 là một phần tư vòng, tức 15 phút.' },
        { q: 'Đồng hồ này chỉ mấy giờ?', clock: { h: 5, m: 15 }, a: ['5 giờ 15 phút', '5 giờ 3 phút', '3 giờ 5 phút', '6 giờ 15 phút'], explain: 'Kim dài chỉ số 3 là 15 phút, kim ngắn vừa qua số 5 nên là 5 giờ 15 phút.' },
        { q: 'Lúc 9 giờ 15 phút, kim dài chỉ số mấy?', a: ['Số 3', 'Số 15', 'Số 9', 'Số 6'], explain: '15 phút thì kim dài chỉ số 3. Trên mặt đồng hồ không có số 15!' },
        { q: 'Kim ngắn chỉ qua số 8 một chút, kim dài chỉ số 3. Đó là mấy giờ?', a: ['8 giờ 15 phút', '9 giờ 15 phút', '8 giờ 3 phút', '3 giờ 8 phút'], explain: 'Kim ngắn vừa qua số 8 nên là 8 giờ, kim dài ở số 3 là 15 phút.' },
        { q: 'Kim dài chỉ số 12, số 3, số 6 lần lượt là mấy phút?', a: ['0, 15, 30 phút', '12, 3, 6 phút', '0, 30, 15 phút', '15, 30, 45 phút'], explain: 'Số 12 là giờ đúng (0 phút), số 3 là 15 phút, số 6 là 30 phút.' }
      ]
    },

    /* ---------------- 4. NGÀY, GIỜ – 24 GIỜ ---------------- */
    {
      id: 'l4', n: 4, title: 'Ngày và giờ', icon: '🌞', grade: 2,
      desc: 'Một ngày có 24 giờ, các buổi trong ngày',
      questions: 8, fall: 24, speed: 1,
      lesson: {
        intro: 'Một ngày có 24 giờ, kim ngắn đi hai vòng đồng hồ.',
        points: [
          'Các buổi: <b>sáng</b> 🌅 1 → 10 giờ · <b>trưa</b> ☀️ 11, 12 giờ · <b>chiều</b> 🌤️ 13 → 18 giờ · <b>tối</b> 🌙 19 → 21 giờ · <b>đêm</b> 🌃 22 → 24 giờ.',
          'Buổi chiều, tối: giờ trên đồng hồ <b>cộng thêm 12</b>. Ví dụ: 3 giờ chiều = <b>15 giờ</b>, 8 giờ tối = <b>20 giờ</b>.',
          'Ngược lại: 17 giờ → 17 − 12 = 5 → <b>5 giờ chiều</b>.'
        ],
        examples: [{ h: 3, m: 0, label: '15 giờ · 3 giờ chiều', session: 'chiều' }, { h: 8, m: 0, label: '20 giờ · 8 giờ tối', session: 'tối' }, { h: 7, m: 0, label: '7 giờ sáng', session: 'sáng' }, { h: 12, m: 0, label: '12 giờ trưa', session: 'trưa' }],
        speech: 'Một ngày có 24 giờ. Buổi chiều và tối, ta lấy giờ trên đồng hồ cộng thêm 12. Ví dụ 3 giờ chiều là 15 giờ, 8 giờ tối là 20 giờ.'
      },
      gen() { return C.fresh(() => C.h24Q({ n: 4 })); },
      quiz: [
        { q: 'Một ngày có bao nhiêu giờ?', a: ['24 giờ', '12 giờ', '60 giờ', '10 giờ'], explain: 'Một ngày có 24 giờ, bắt đầu từ 12 giờ đêm hôm trước đến 12 giờ đêm hôm sau.' },
        { q: '3 giờ chiều còn gọi là mấy giờ?', a: ['15 giờ', '3 giờ', '13 giờ', '12 giờ'], explain: 'Buổi chiều cộng thêm 12: 3 + 12 = 15. Vậy 3 giờ chiều là 15 giờ.' },
        { q: '19 giờ là mấy giờ tối?', a: ['7 giờ tối', '9 giờ tối', '8 giờ tối', '6 giờ tối'], explain: '19 − 12 = 7. Vậy 19 giờ là 7 giờ tối.' },
        { q: 'Muốn đổi "giờ chiều" sang cách gọi 24 giờ, ta làm gì?', a: ['Cộng thêm 12', 'Trừ đi 12', 'Cộng thêm 10', 'Giữ nguyên'], explain: 'Kim ngắn đã đi hết vòng thứ nhất (12 giờ), nên buổi chiều ta cộng thêm 12.' },
        { q: 'Em đi ngủ lúc 21 giờ. Đó là mấy giờ tối?', a: ['9 giờ tối', '11 giờ tối', '8 giờ tối', '10 giờ tối'], explain: '21 − 12 = 9. Vậy 21 giờ là 9 giờ tối.' },
        { q: 'Em đi học lúc 7 giờ, mặt trời vừa lên. Đó là buổi nào?', a: ['Buổi sáng', 'Buổi chiều', 'Buổi tối', 'Buổi đêm'], explain: 'Từ 1 giờ đến 10 giờ là buổi sáng.' },
        { q: '12 giờ trưa còn gọi là?', a: ['12 giờ', '24 giờ', '0 giờ', '2 giờ'], explain: '12 giờ trưa là 12 giờ. Còn 24 giờ (hay 0 giờ) là 12 giờ đêm.' }
      ]
    },

    /* ---------------- 5. XEM ĐỒNG HỒ ĐẾN 5 PHÚT ---------------- */
    {
      id: 'l5', n: 5, title: 'Đến 5 phút', icon: '🕙', grade: 3,
      desc: 'Đếm thêm 5 theo kim dài',
      questions: 9, fall: 24, speed: 1,
      lesson: {
        intro: 'Từ số này đến số kế tiếp, kim dài đi được 5 phút.',
        points: [
          'Đếm thêm 5 theo kim dài: số 1 → <b>5</b>, số 2 → <b>10</b>, số 3 → <b>15</b>, số 4 → <b>20</b>… số 11 → <b>55 phút</b>.',
          'Cách nhanh: <b>số kim dài chỉ × 5</b> = số phút. Ví dụ số 4 × 5 = 20 phút.',
          'Kim ngắn cho biết giờ: đã <b>đi qua số nào</b> thì là giờ đó, dù nó rất gần số tiếp theo.'
        ],
        examples: [{ h: 7, m: 20 }, { h: 9, m: 45 }, { h: 2, m: 5 }, { h: 4, m: 55 }],
        speech: 'Từ số này đến số kế tiếp, kim dài đi được 5 phút. Đếm thêm 5: số 1 là 5 phút, số 2 là 10 phút, số 3 là 15 phút. Kim ngắn đã đi qua số nào thì là giờ đó.'
      },
      gen() {
        const cfg = { minutes: [5, 10, 20, 25, 35, 40, 45, 50, 55, 15, 30], styles: ['plain'] };
        return C.fresh(() => {
          const t = Math.random();
          if (t < 0.2) return C.fiveQ({ n: 4 });
          if (t < 0.65) return C.readQ(Object.assign({ n: 4 }, cfg));
          return C.matchQ(Object.assign({ n: 3 }, cfg));
        });
      },
      quiz: [
        { q: 'Kim dài đi từ số 12 đến số 1 là bao nhiêu phút?', a: ['5 phút', '1 phút', '10 phút', '15 phút'], explain: 'Giữa hai số liền nhau kim dài đi được 5 phút.' },
        { q: 'Kim dài chỉ số 4 nghĩa là bao nhiêu phút?', clock: { h: 12, m: 20 }, hideHour: true, a: ['20 phút', '4 phút', '40 phút', '25 phút'], explain: 'Đếm 5, 10, 15, 20 → số 4 là 20 phút (4 × 5 = 20).' },
        { q: 'Kim dài chỉ số 9 nghĩa là bao nhiêu phút?', a: ['45 phút', '9 phút', '50 phút', '35 phút'], explain: '9 × 5 = 45. Kim dài chỉ số 9 là 45 phút.' },
        { q: 'Đồng hồ này chỉ mấy giờ?', clock: { h: 6, m: 35 }, a: ['6 giờ 35 phút', '7 giờ 35 phút', '6 giờ 7 phút', '7 giờ 6 phút'], explain: 'Kim dài chỉ số 7 là 35 phút. Kim ngắn đã qua số 6 nhưng chưa tới 7 nên là 6 giờ 35 phút.' },
        { q: 'Lúc 10 giờ 50 phút, kim ngắn ở gần số nào nhất?', clock: { h: 10, m: 50 }, a: ['Số 11', 'Số 10', 'Số 12', 'Số 50'], explain: 'Kim ngắn rất gần số 11 nhưng CHƯA qua số 11, nên vẫn là 10 giờ. Đừng nhầm thành 11 giờ nhé!' },
        { q: 'Muốn biết số phút, ta đếm thêm mấy theo từng số trên đồng hồ?', a: ['Thêm 5', 'Thêm 1', 'Thêm 10', 'Thêm 12'], explain: 'Mỗi số cách nhau 5 phút, nên ta đếm 5, 10, 15, 20…' }
      ]
    },

    /* ---------------- 6. GIỜ KÉM ---------------- */
    {
      id: 'l6', n: 6, title: 'Giờ kém', icon: '🕚', grade: 3,
      desc: '7 giờ 50 phút = 8 giờ kém 10 phút',
      questions: 9, fall: 26, speed: 1,
      lesson: {
        intro: 'Khi kim dài đã qua số 6, ta có thể đọc theo cách "giờ kém".',
        points: [
          'Ta đếm số phút <b>còn thiếu</b> để đến giờ tiếp theo.',
          '<b>7 giờ 50 phút</b>: còn 10 phút nữa là 8 giờ → đọc là <b>8 giờ kém 10 phút</b>.',
          'Cách tính: giờ <b>+ 1</b>, phút = <b>60 − số phút</b>. Ví dụ 4 giờ 45 phút → 5 giờ kém 15 phút.'
        ],
        examples: [{ h: 7, m: 50, label: '8 giờ kém 10 phút' }, { h: 4, m: 45, label: '5 giờ kém 15 phút' }, { h: 11, m: 55, label: '12 giờ kém 5 phút' }, { h: 9, m: 40, label: '10 giờ kém 20 phút' }],
        speech: 'Khi kim dài đã qua số 6, ta đọc theo cách giờ kém. 7 giờ 50 phút, còn 10 phút nữa là 8 giờ, nên đọc là 8 giờ kém 10 phút.'
      },
      gen() { return C.fresh(() => C.kemQ({ n: 4 })); },
      quiz: [
        { q: '7 giờ 50 phút còn gọi là?', clock: { h: 7, m: 50 }, a: ['8 giờ kém 10 phút', '7 giờ kém 10 phút', '8 giờ kém 50 phút', '7 giờ kém 50 phút'], explain: 'Còn 10 phút nữa là 8 giờ nên đọc là 8 giờ kém 10 phút.' },
        { q: '"5 giờ kém 15 phút" là mấy giờ mấy phút?', a: ['4 giờ 45 phút', '5 giờ 15 phút', '5 giờ 45 phút', '4 giờ 15 phút'], explain: 'Chưa tới 5 giờ, còn thiếu 15 phút. 60 − 15 = 45, vậy là 4 giờ 45 phút.' },
        { q: 'Khi nào ta đọc giờ theo cách "giờ kém"?', a: ['Khi kim dài đã qua số 6', 'Khi kim dài chỉ số 12', 'Khi kim dài chưa tới số 6', 'Khi kim ngắn chỉ số 6'], explain: 'Kim dài qua số 6 là đã hơn 30 phút, gần đến giờ tiếp theo nên ta đọc "giờ kém".' },
        { q: 'Đọc đồng hồ này theo cách "giờ kém":', clock: { h: 10, m: 40 }, a: ['11 giờ kém 20 phút', '10 giờ kém 20 phút', '11 giờ kém 40 phút', '10 giờ kém 40 phút'], explain: 'Đồng hồ chỉ 10 giờ 40 phút. Còn 20 phút nữa là 11 giờ nên là 11 giờ kém 20 phút.' },
        { q: '12 giờ kém 5 phút là mấy giờ?', a: ['11 giờ 55 phút', '12 giờ 5 phút', '11 giờ 5 phút', '12 giờ 55 phút'], explain: 'Còn 5 phút nữa mới đến 12 giờ: 60 − 5 = 55, vậy là 11 giờ 55 phút.' },
        { q: 'Muốn đổi 3 giờ 45 phút sang cách "giờ kém", ta làm gì?', a: ['Giờ cộng 1, phút lấy 60 trừ đi', 'Giờ trừ 1, phút giữ nguyên', 'Giờ giữ nguyên, phút cộng 15', 'Đổi chỗ giờ và phút'], explain: '3 + 1 = 4, 60 − 45 = 15 → 4 giờ kém 15 phút.' }
      ]
    },

    /* ---------------- 7. CHÍNH XÁC ĐẾN PHÚT & ĐỒNG HỒ ĐIỆN TỬ ---------------- */
    {
      id: 'l7', n: 7, title: 'Từng phút & điện tử', icon: '⌚', grade: 3,
      desc: 'Mỗi vạch nhỏ là 1 phút · 19:05',
      questions: 9, fall: 28, speed: 1,
      lesson: {
        intro: 'Giữa hai số có 5 vạch nhỏ, mỗi vạch nhỏ là 1 phút.',
        points: [
          'Đọc số phút: đếm 5, 10, 15… đến số ở <b>ngay trước</b> kim dài, rồi <b>đếm thêm từng vạch</b>. Ví dụ: qua số 2 thêm 3 vạch → 10 + 3 = <b>13 phút</b>.',
          'Đồng hồ <b>điện tử</b> ghi <b>giờ : phút</b>. <b>07:13</b> là 7 giờ 13 phút.',
          'Số giờ lớn hơn 12 là buổi chiều, tối: <b>19:13</b> là 7 giờ 13 phút <b>tối</b> (19 − 12 = 7).'
        ],
        examples: [{ h: 7, m: 13, label: '7 giờ 13 phút · 07:13' }, { h: 3, m: 52, label: '3 giờ 52 phút · 15:52 (chiều)' }, { h: 9, m: 27, label: '9 giờ 27 phút · 21:27 (tối)' }, { h: 12, m: 1, label: '12 giờ 1 phút · 12:01' }],
        speech: 'Mỗi vạch nhỏ trên đồng hồ là 1 phút. Đếm thêm 5 đến số ngay trước kim dài, rồi đếm thêm từng vạch. Đồng hồ điện tử ghi giờ trước, phút sau.'
      },
      gen() { return C.fresh(() => C.exactQ({ n: 4 })); },
      quiz: [
        { q: 'Mỗi vạch nhỏ trên mặt đồng hồ là bao nhiêu phút?', a: ['1 phút', '5 phút', '10 phút', '60 phút'], explain: 'Giữa hai số có 5 vạch nhỏ, tương ứng 5 phút, nên mỗi vạch là 1 phút.' },
        { q: 'Kim dài qua số 4 thêm 2 vạch nhỏ. Đó là bao nhiêu phút?', clock: { h: 12, m: 22 }, hideHour: true, a: ['22 phút', '42 phút', '6 phút', '24 phút'], explain: 'Số 4 là 20 phút, thêm 2 vạch là 22 phút.' },
        { q: 'Đồng hồ điện tử ghi 08:07. Đó là mấy giờ?', digital: '08:07', a: ['8 giờ 7 phút', '8 giờ 70 phút', '7 giờ 8 phút', '8 giờ 35 phút'], explain: 'Số trước dấu hai chấm là giờ (8), số sau là phút (7).' },
        { q: 'Đồng hồ điện tử ghi 16:30. Đó là mấy giờ?', digital: '16:30', a: ['4 giờ 30 phút chiều', '6 giờ 30 phút chiều', '4 giờ 30 phút sáng', '16 giờ 3 phút'], explain: '16 − 12 = 4, buổi chiều. Vậy 16:30 là 4 giờ 30 phút chiều.' },
        { q: 'Trên đồng hồ điện tử, số đứng TRƯỚC dấu hai chấm là gì?', a: ['Giờ', 'Phút', 'Giây', 'Ngày'], explain: 'Đồng hồ điện tử ghi giờ trước, phút sau: giờ : phút.' },
        { q: '9 giờ 8 phút tối, đồng hồ điện tử ghi thế nào?', a: ['21:08', '09:08', '21:80', '09:80'], explain: 'Buổi tối: 9 + 12 = 21. Phút 8 ghi là 08. Vậy là 21:08.' }
      ]
    },

    /* ---------------- 8. THỜI GIAN TRÔI QUA ---------------- */
    {
      id: 'l8', n: 8, title: 'Thời gian trôi qua', icon: '⏳', grade: 3,
      desc: 'Từ 7 giờ đến 7 giờ 30 phút là 30 phút',
      questions: 9, fall: 30, speed: 1,
      lesson: {
        intro: 'Muốn biết thời gian trôi qua, ta xem kim dài đi từ đâu đến đâu.',
        points: [
          'Từ <b>7 giờ</b> đến <b>7 giờ 30 phút</b>: kim dài đi từ số 12 đến số 6 → <b>30 phút</b>.',
          'Kim dài đi trọn <b>một vòng</b> là <b>1 giờ</b>. Từ 8 giờ đến 9 giờ 15 phút là <b>1 giờ 15 phút</b>.',
          'Biết giờ bắt đầu và thời gian làm, ta <b>đếm thêm</b> để tìm giờ kết thúc: 6 giờ + 20 phút = <b>6 giờ 20 phút</b>.'
        ],
        examples: [{ h: 7, m: 30, label: '7 giờ → 7 giờ 30: 30 phút' }, { h: 9, m: 15, label: '8 giờ → 9 giờ 15: 1 giờ 15 phút' }, { h: 6, m: 20, label: '6 giờ + 20 phút = 6 giờ 20' }, { h: 8, m: 45, label: '8 giờ 15 → 8 giờ 45: 30 phút' }],
        speech: 'Muốn biết thời gian trôi qua, ta xem kim dài đi từ đâu đến đâu. Từ 7 giờ đến 7 giờ 30 phút là 30 phút. Kim dài đi trọn một vòng là 1 giờ.'
      },
      gen() { return C.fresh(() => C.elapsedQ({ n: 4 })); },
      quiz: [
        { q: 'Từ 7 giờ đến 7 giờ 30 phút là bao lâu?', a: ['30 phút', '7 phút', '1 giờ', '60 phút'], explain: 'Kim dài đi từ số 12 đến số 6 là 30 phút.' },
        { q: 'Kim dài đi trọn một vòng đồng hồ là bao lâu?', a: ['1 giờ', '30 phút', '12 giờ', '5 phút'], explain: 'Một vòng là 60 phút, tức 1 giờ.' },
        { q: 'Em bắt đầu ăn cơm lúc 6 giờ, ăn trong 20 phút. Em ăn xong lúc mấy giờ?', a: ['6 giờ 20 phút', '6 giờ 2 phút', '7 giờ', '8 giờ'], explain: '6 giờ đếm thêm 20 phút là 6 giờ 20 phút.' },
        { q: 'Từ 9 giờ đến 10 giờ 15 phút là bao lâu?', a: ['1 giờ 15 phút', '15 phút', '1 giờ', '45 phút'], explain: 'Từ 9 giờ đến 10 giờ là 1 giờ, thêm 15 phút nữa là 1 giờ 15 phút.' },
        { q: 'Từ 8 giờ 15 phút đến 8 giờ 45 phút là bao lâu?', a: ['30 phút', '45 phút', '15 phút', '1 giờ'], explain: 'Kim dài đi từ số 3 đến số 9 là 30 phút (45 − 15 = 30).' },
        { q: 'Giờ ra chơi bắt đầu lúc 9 giờ và kéo dài 30 phút. Giờ ra chơi kết thúc lúc?', a: ['9 giờ 30 phút', '9 giờ 3 phút', '10 giờ', '9 giờ 20 phút'], explain: '9 giờ thêm 30 phút là 9 giờ 30 phút.' }
      ]
    },

    /* ---------------- 9. SIÊU XE TĂNG ---------------- */
    {
      id: 'l9', n: 9, title: 'Siêu Xe Tăng', icon: '🦸', grade: 0,
      desc: 'Trộn tất cả, robot tiến nhanh hơn!',
      questions: 12, fall: 20, speed: 1.15,
      lesson: {
        intro: 'Ôn lại tất cả những gì đã học: giờ đúng, giờ rưỡi, 15 phút, 24 giờ, 5 phút, giờ kém, từng phút và thời gian trôi qua!',
        points: [
          'Kim <b>ngắn</b> chỉ giờ, kim <b>dài</b> chỉ phút. Mỗi số cách nhau <b>5 phút</b>, mỗi vạch nhỏ <b>1 phút</b>.',
          'Qua số 6 có thể đọc <b>giờ kém</b>. Buổi chiều, tối <b>cộng 12</b> để ra cách gọi 24 giờ.',
          'Robot tiến nhanh hơn, hãy bắn thật chính xác nhé!'
        ],
        examples: [{ h: 3, m: 15 }, { h: 7, m: 50, label: '8 giờ kém 10 phút' }, { h: 9, m: 27 }, { h: 5, m: 30 }],
        speech: 'Ôn lại tất cả những gì đã học. Robot tiến nhanh hơn, hãy bắn thật chính xác nhé!'
      },
      gen() {
        return C.fresh(() => {
          const t = Math.random();
          if (t < 0.18) return C.readQ({ n: 4, minutes: [0, 15, 30, 45, 5, 10, 20, 25, 35, 40, 50, 55], styles: ['plain', 'ruoi'] });
          if (t < 0.3) return C.matchQ({ n: 3, minutes: [0, 15, 30, 45, 5, 10, 20, 25, 35, 40, 50, 55], styles: ['plain'] });
          if (t < 0.45) return C.h24Q({ n: 4 });
          if (t < 0.55) return C.fiveQ({ n: 4 });
          if (t < 0.7) return C.kemQ({ n: 4 });
          if (t < 0.85) return C.exactQ({ n: 4 });
          return C.elapsedQ({ n: 4 });
        });
      },
      quiz: null   // lấy ngẫu nhiên từ các màn trước
    }
  ];

  LEVELS[8].quiz = [].concat.apply([], LEVELS.slice(0, 8).map((l) => l.quiz));

  function byId(id) { return LEVELS.find((l) => l.id === id) || null; }
  function next(level) { return LEVELS[LEVELS.indexOf(level) + 1] || null; }
  function prev(level) { return LEVELS[LEVELS.indexOf(level) - 1] || null; }

  window.Levels = { LEVELS, byId, next, prev, pick };
})();
