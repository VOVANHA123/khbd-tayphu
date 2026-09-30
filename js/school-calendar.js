/**
 * =========================================================================
 * SCHOOL-CALENDAR.JS - TÍNH TUẦN HỌC THỰC TẾ THEO LỊCH NĂM HỌC 2026-2027
 * Căn cứ: Kế hoạch thời gian năm học 2026-2027 (Tỉnh An Giang)
 * Đặc điểm:
 *   - Học kỳ I : Tuần  1 → 18 (07/09/2026 – 10/01/2027)
 *   - Nghỉ Tết : 01/02 – 14/02/2027 (dự kiến, điều chỉnh theo lịch ÂL)
 *   - Học kỳ II: Tuần 19 → 35 (11/01/2027 – 23/05/2027, nghỉ Tết ÂL)
 * =========================================================================
 */

window.SchoolCalendar = (function () {

  // -----------------------------------------------------------------------
  // BẢNG TUẦN HỌC THỰC TẾ NĂM HỌC 2026 – 2027
  // Mỗi entry: { week, startDate, endDate, semester }
  //   startDate/endDate: chuỗi 'YYYY-MM-DD' (thứ Hai → Chủ Nhật)
  // -----------------------------------------------------------------------
  const WEEK_TABLE = [
    // ── HỌC KỲ I ──────────────────────────────────────────────────────────
    { week:  1, start: '2026-09-07', end: '2026-09-13', semester: 'Học kỳ I'  },
    { week:  2, start: '2026-09-14', end: '2026-09-20', semester: 'Học kỳ I'  },
    { week:  3, start: '2026-09-21', end: '2026-09-27', semester: 'Học kỳ I'  },
    { week:  4, start: '2026-09-28', end: '2026-10-04', semester: 'Học kỳ I'  },
    { week:  5, start: '2026-10-05', end: '2026-10-11', semester: 'Học kỳ I'  },
    { week:  6, start: '2026-10-12', end: '2026-10-18', semester: 'Học kỳ I'  },
    { week:  7, start: '2026-10-19', end: '2026-10-25', semester: 'Học kỳ I'  },
    { week:  8, start: '2026-10-26', end: '2026-11-01', semester: 'Học kỳ I'  },
    { week:  9, start: '2026-11-02', end: '2026-11-08', semester: 'Học kỳ I'  },
    { week: 10, start: '2026-11-09', end: '2026-11-15', semester: 'Học kỳ I'  },
    { week: 11, start: '2026-11-16', end: '2026-11-22', semester: 'Học kỳ I'  },
    { week: 12, start: '2026-11-23', end: '2026-11-29', semester: 'Học kỳ I'  },
    { week: 13, start: '2026-11-30', end: '2026-12-06', semester: 'Học kỳ I'  },
    { week: 14, start: '2026-12-07', end: '2026-12-13', semester: 'Học kỳ I'  },
    { week: 15, start: '2026-12-14', end: '2026-12-20', semester: 'Học kỳ I'  },
    { week: 16, start: '2026-12-21', end: '2026-12-27', semester: 'Học kỳ I'  },
    { week: 17, start: '2026-12-28', end: '2027-01-03', semester: 'Học kỳ I'  },
    { week: 18, start: '2027-01-04', end: '2027-01-10', semester: 'Học kỳ I'  },
    // ── HỌC KỲ II ─────────────────────────────────────────────────────────
    { week: 19, start: '2027-01-11', end: '2027-01-17', semester: 'Học kỳ II' },
    { week: 20, start: '2027-01-18', end: '2027-01-24', semester: 'Học kỳ II' },
    { week: 21, start: '2027-01-25', end: '2027-01-31', semester: 'Học kỳ II' },
    // Tuần 01/02 – 14/02: NGHỈ TẾT ÂM LỊCH (không có tuần học)
    { week: 22, start: '2027-02-15', end: '2027-02-21', semester: 'Học kỳ II' },
    { week: 23, start: '2027-02-22', end: '2027-02-28', semester: 'Học kỳ II' },
    { week: 24, start: '2027-03-01', end: '2027-03-07', semester: 'Học kỳ II' },
    { week: 25, start: '2027-03-08', end: '2027-03-14', semester: 'Học kỳ II' },
    { week: 26, start: '2027-03-15', end: '2027-03-21', semester: 'Học kỳ II' },
    { week: 27, start: '2027-03-22', end: '2027-03-28', semester: 'Học kỳ II' },
    { week: 28, start: '2027-03-29', end: '2027-04-04', semester: 'Học kỳ II' },
    { week: 29, start: '2027-04-05', end: '2027-04-11', semester: 'Học kỳ II' },
    { week: 30, start: '2027-04-12', end: '2027-04-18', semester: 'Học kỳ II' },
    { week: 31, start: '2027-04-19', end: '2027-04-25', semester: 'Học kỳ II' },
    { week: 32, start: '2027-04-26', end: '2027-05-02', semester: 'Học kỳ II' },
    { week: 33, start: '2027-05-03', end: '2027-05-09', semester: 'Học kỳ II' },
    { week: 34, start: '2027-05-10', end: '2027-05-16', semester: 'Học kỳ II' },
    { week: 35, start: '2027-05-17', end: '2027-05-23', semester: 'Học kỳ II' },
  ];

  // Ngày khai giảng & ngày kết thúc năm học (dùng để xác định trạng thái)
  const SCHOOL_YEAR_START = new Date('2026-09-07');
  const SCHOOL_YEAR_END   = new Date('2027-05-23');
  const TOTAL_WEEKS = 35;
  const ACADEMIC_YEAR = '2026-2027';

  // -----------------------------------------------------------------------
  // Trả về kết quả tính toán tuần học hiện tại
  // -----------------------------------------------------------------------
  function getCurrentWeekInfo(now = new Date()) {
    // Cắt giờ, làm tròn về đầu ngày (UTC+7 không ảnh hưởng so sánh nếu dùng hằng số cùng múi giờ)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Chưa vào năm học
    if (today < SCHOOL_YEAR_START) {
      const daysUntil = Math.ceil((SCHOOL_YEAR_START - today) / 86400000);
      return {
        week: 0,
        semester: null,
        progress: 0,
        weeksLeft: TOTAL_WEEKS,
        label: '—',
        status: 'BEFORE_SCHOOL',
        statusLabel: `Chưa khai giảng (còn ${daysUntil} ngày)`,
        academicYear: ACADEMIC_YEAR,
        totalWeeks: TOTAL_WEEKS,
      };
    }

    // Sau năm học
    if (today > SCHOOL_YEAR_END) {
      return {
        week: TOTAL_WEEKS,
        semester: 'Học kỳ II',
        progress: 100,
        weeksLeft: 0,
        label: `Tuần ${TOTAL_WEEKS}`,
        status: 'AFTER_SCHOOL',
        statusLabel: 'Năm học đã kết thúc',
        academicYear: ACADEMIC_YEAR,
        totalWeeks: TOTAL_WEEKS,
      };
    }

    // Tìm tuần khớp
    for (const entry of WEEK_TABLE) {
      const start = new Date(entry.start);
      const end   = new Date(entry.end);
      if (today >= start && today <= end) {
        const progress  = Math.round((entry.week / TOTAL_WEEKS) * 100 * 10) / 10;
        const weeksLeft = TOTAL_WEEKS - entry.week;
        return {
          week: entry.week,
          semester: entry.semester,
          progress,
          weeksLeft,
          label: `Tuần ${entry.week}`,
          startDate: entry.start,
          endDate: entry.end,
          status: 'IN_SCHOOL',
          statusLabel: `${entry.semester} • Tuần ${entry.week}/${TOTAL_WEEKS}`,
          academicYear: ACADEMIC_YEAR,
          totalWeeks: TOTAL_WEEKS,
        };
      }
    }

    // Khoảng giữa (nghỉ Tết ÂL hoặc khoảng giữa hai tuần)
    // → tìm tuần trước đó gần nhất
    let prevEntry = null;
    for (let i = WEEK_TABLE.length - 1; i >= 0; i--) {
      const end = new Date(WEEK_TABLE[i].end);
      if (today > end) {
        prevEntry = WEEK_TABLE[i];
        break;
      }
    }

    if (prevEntry) {
      const nextEntry = WEEK_TABLE.find(e => new Date(e.start) > today);
      const daysUntilNext = nextEntry
        ? Math.ceil((new Date(nextEntry.start) - today) / 86400000)
        : null;
      const progress  = Math.round((prevEntry.week / TOTAL_WEEKS) * 100 * 10) / 10;
      const weeksLeft = TOTAL_WEEKS - prevEntry.week;
      return {
        week: prevEntry.week,
        semester: prevEntry.semester,
        progress,
        weeksLeft,
        label: `Tuần ${prevEntry.week} (đang nghỉ)`,
        status: 'HOLIDAY',
        statusLabel: daysUntilNext
          ? `Đang nghỉ giữa các tuần (tuần tiếp theo bắt đầu sau ${daysUntilNext} ngày)`
          : 'Đang trong kỳ nghỉ',
        academicYear: ACADEMIC_YEAR,
        totalWeeks: TOTAL_WEEKS,
        nextWeek: nextEntry ? nextEntry.week : null,
        daysUntilNext,
      };
    }

    // Fallback
    return {
      week: 1,
      semester: 'Học kỳ I',
      progress: 0,
      weeksLeft: TOTAL_WEEKS,
      label: 'Tuần 1',
      status: 'IN_SCHOOL',
      statusLabel: 'Học kỳ I',
      academicYear: ACADEMIC_YEAR,
      totalWeeks: TOTAL_WEEKS,
    };
  }

  // -----------------------------------------------------------------------
  // Cập nhật toàn bộ giao diện widget tiến độ năm học
  // -----------------------------------------------------------------------
  function updateProgressWidget(info) {
    // 1. Widget tuần trong sidebar
    const weekDisplay = document.querySelector('#sidebar-week-display');
    const progressBar = document.querySelector('#sidebar-progress-bar');
    const progressPct = document.querySelector('#sidebar-progress-pct');
    const weeksLeft   = document.querySelector('#sidebar-weeks-left');
    const semLabel    = document.querySelector('#sidebar-semester-label');

    if (weekDisplay) weekDisplay.innerHTML = `Tuần ${info.week > 0 ? info.week : '—'} <span class="text-xs font-normal text-slate-300">/ ${info.totalWeeks} Tuần</span>`;
    if (progressBar) progressBar.style.width = `${info.progress}%`;
    if (progressPct) progressPct.textContent = `Đã hoàn thành: ${info.progress}%`;
    if (weeksLeft)   weeksLeft.textContent   = `Còn ${info.weeksLeft} tuần`;
    if (semLabel)    semLabel.textContent     = info.semester || '';

    // 2. Badge tuần trên header (nếu có)
    const headerWeek = document.getElementById('header-current-week');
    if (headerWeek) headerWeek.textContent = `Tuần ${info.week}`;

    // 3. Cập nhật APP_CONFIG (để các module khác đọc được tuần hiện tại)
    if (window.APP_CONFIG) {
      window.APP_CONFIG.CURRENT_WEEK     = info.week;
      window.APP_CONFIG.CURRENT_SEMESTER = info.semester || window.APP_CONFIG.CURRENT_SEMESTER;
    }
  }

  // -----------------------------------------------------------------------
  // Khởi động: tính ngay & cập nhật mỗi phút
  // -----------------------------------------------------------------------
  function init() {
    function refresh() {
      const info = getCurrentWeekInfo();
      updateProgressWidget(info);
    }
    refresh();

    // Cập nhật lại mỗi 60 giây (đề phòng mở tab qua đêm sang tuần mới)
    setInterval(refresh, 60000);

    // Cập nhật ngay khi người dùng quay lại tab
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refresh();
    });
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------
  return {
    init,
    getCurrentWeekInfo,
    updateProgressWidget,
    WEEK_TABLE,
    ACADEMIC_YEAR,
    TOTAL_WEEKS,
  };
})();
