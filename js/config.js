/**
 * =========================================================================
 * CONFIG.JS - CẤU HÌNH & DỮ LIỆU KHỞI TẠO MẪU
 * =========================================================================
 */

window.APP_CONFIG = {
  APP_NAME: 'HỆ THỐNG QUẢN LÝ & KIỂM TRA KẾ HOẠCH BÀI DẠY',
  SCHOOL_NAME: 'TRƯỜNG THCS TÂY PHÚ',
  ACADEMIC_YEAR: '2026-2027',
  CURRENT_SEMESTER: 'Học kỳ I',
  CURRENT_WEEK: 3,
  TOTAL_WEEKS: 35,

  // Thông tin phiên bản & Quản trị viên hệ thống
  APP_VERSION: 'v2.5.2',
  APP_VERSION_NAME: 'v2.5.2 - Đồng Bộ Đám Mây & Đổi Mật Khẩu Đa Thiết Bị',
  RELEASE_DATE: '12/09/2026',
  ADMIN_INFO: {
    name: 'Võ Văn Hà',
    title: 'Giáo viên THCS Tây Phú',
    role: 'Tổ trưởng chuyên môn & Quản trị hệ thống',
    school: 'Trường THCS Tây Phú',
    display: 'Võ Văn Hà - Giáo viên THCS Tây Phú'
  },

  // URL Google Apps Script Web App mặc định (Dùng chung cho cả điện thoại & máy tính toàn trường)
  DEFAULT_GAS_URL: 'https://script.google.com/macros/s/AKfycbwpwLq_51x84E9h9nIgAWLhFk3v7qz6E1-RiWuXe4PGBH64B7gSWnOyFBTRLh3b-LgeNw/exec',

  // Danh sách đầy đủ 35 tuần năm học
  WEEKS: Array.from({ length: 35 }, (_, i) => ({
    weekNumber: i + 1,
    label: `Tuần ${i + 1}`,
    semester: i + 1 <= 18 ? 'Học kỳ I' : 'Học kỳ II'
  })),

  // Khoá lưu trữ LocalStorage
  STORAGE_KEYS: {
    APP_STATE: 'KHBD_APP_STATE_V4',
    GAS_URL: 'KHBD_GAS_ENDPOINT_URL',
    CURRENT_USER: 'KHBD_CURRENT_USER_ID',
    ACTIVE_MODE: 'KHBD_DATA_MODE', // 'DEMO' | 'LIVE'
    SESSION_USER: 'KHBD_SESSION_USER_JSON'
  },

  // Danh mục Tổ chuyên môn
  DEPARTMENTS: [
    { 
      id: 'To_KHTN_CN', 
      name: 'Tổ Khoa học Tự nhiên - Công nghệ', 
      code: 'KHTN_CN', 
      leaderId: 'GV01', 
      leaderName: 'Võ Văn Hà', 
      viceLeaderId: 'GV02', 
      viceLeaderName: 'Trương Thiện Tánh' 
    },
    { 
      id: 'To_KHXH', 
      name: 'Tổ Khoa học Xã hội', 
      code: 'KHXH', 
      leaderId: 'GV11', 
      leaderName: 'Trần Văn Bình', 
      viceLeaderId: null, 
      viceLeaderName: null 
    },
    { 
      id: 'To_Toan_Tin', 
      name: 'Tổ Toán - Tin học', 
      code: 'TOAN_TIN', 
      leaderId: 'GV12', 
      leaderName: 'Lê Hoàng Long', 
      viceLeaderId: null, 
      viceLeaderName: null 
    }
  ],

  // Danh mục Môn học (Đầy đủ bao gồm Hoạt động trải nghiệm hướng nghiệp)
  SUBJECTS: [
    'Khoa học tự nhiên',
    'Vật lí',
    'Hóa học',
    'Sinh học',
    'Công nghệ',
    'Hoạt động trải nghiệm hướng nghiệp',
    'Toán học',
    'Tin học',
    'Ngữ văn',
    'Lịch sử và Địa lí',
    'Tiếng Anh',
    'GDCD',
    'Âm nhạc',
    'Mĩ thuật',
    'GDTC'
  ],

  GRADES: ['Khối 6', 'Khối 7', 'Khối 8', 'Khối 9'],

  // Danh sách Toàn bộ Giáo viên Tổ KHTN-CN & Nhà trường
  USERS: [
    {
      id: 'ADMIN01',
      username: 'admin',
      password: '123',
      name: 'Quản trị viên (Admin)',
      email: 'admin@tayphu.edu.vn',
      phone: '0912.345.678',
      role: 'ADMIN',
      roleLabel: 'Quản trị viên hệ thống',
      departmentId: 'BGH',
      departmentName: 'Ban Quản Trị Hệ Thống',
      subjects: ['Quản trị hệ thống'],
      avatar: '⚙️'
    },
    {
      id: 'GV01',
      username: 'vovanha',
      password: '123',
      name: 'Võ Văn Hà',
      email: 'vovanha@tayphu.edu.vn',
      phone: '0912.345.678',
      role: 'TO_TRUONG', // TO_TRUONG | TO_PHO | GIAO_VIEN | BGH
      roleLabel: 'Tổ trưởng chuyên môn',
      departmentId: 'To_KHTN_CN',
      departmentName: 'Tổ Khoa học Tự nhiên - Công nghệ',
      subjects: ['Khoa học tự nhiên', 'Vật lí', 'Hoạt động trải nghiệm hướng nghiệp'],
      avatar: '👨‍🏫'
    },
    {
      id: 'GV02',
      username: 'truongthientanh',
      password: '123',
      name: 'Trương Thiện Tánh',
      email: 'truongthientanh@tayphu.edu.vn',
      phone: '0987.654.321',
      role: 'TO_PHO',
      roleLabel: 'Tổ phó chuyên môn',
      departmentId: 'To_KHTN_CN',
      departmentName: 'Tổ Khoa học Tự nhiên - Công nghệ',
      subjects: ['Khoa học tự nhiên', 'Hóa học', 'Hoạt động trải nghiệm hướng nghiệp'],
      avatar: '👨‍💼'
    },
    {
      id: 'GV03',
      username: 'nguyenthiphuochoai',
      password: '123',
      name: 'Nguyễn Thị Phước Hoài',
      email: 'nguyenthiphuochoai@tayphu.edu.vn',
      phone: '0901.111.222',
      role: 'GIAO_VIEN',
      roleLabel: 'Giáo viên bộ môn',
      departmentId: 'To_KHTN_CN',
      departmentName: 'Tổ Khoa học Tự nhiên - Công nghệ',
      subjects: ['Khoa học tự nhiên', 'Sinh học', 'Hoạt động trải nghiệm hướng nghiệp'],
      avatar: '👩‍🏫'
    },
    {
      id: 'GV04',
      username: 'nguyenthithuha',
      password: '123',
      name: 'Nguyễn Thị Thu Hà',
      email: 'nguyenthithuha@tayphu.edu.vn',
      phone: '0902.222.333',
      role: 'GIAO_VIEN',
      roleLabel: 'Giáo viên bộ môn',
      departmentId: 'To_KHTN_CN',
      departmentName: 'Tổ Khoa học Tự nhiên - Công nghệ',
      subjects: ['Khoa học tự nhiên', 'Vật lí', 'Hoạt động trải nghiệm hướng nghiệp'],
      avatar: '👩‍🏫'
    },
    {
      id: 'GV05',
      username: 'nguyenthibichtuyen',
      password: '123',
      name: 'Nguyễn Thị Bích Tuyền',
      email: 'nguyenthibichtuyen@tayphu.edu.vn',
      phone: '0903.333.444',
      role: 'GIAO_VIEN',
      roleLabel: 'Giáo viên bộ môn',
      departmentId: 'To_KHTN_CN',
      departmentName: 'Tổ Khoa học Tự nhiên - Công nghệ',
      subjects: ['Khoa học tự nhiên', 'Hóa học', 'Hoạt động trải nghiệm hướng nghiệp'],
      avatar: '👩‍🏫'
    },
    {
      id: 'GV06',
      username: 'lethingocgiau',
      password: '123',
      name: 'Lê Thị Ngọc Giàu',
      email: 'lethingocgiau@tayphu.edu.vn',
      phone: '0904.444.555',
      role: 'GIAO_VIEN',
      roleLabel: 'Giáo viên bộ môn',
      departmentId: 'To_KHTN_CN',
      departmentName: 'Tổ Khoa học Tự nhiên - Công nghệ',
      subjects: ['Khoa học tự nhiên', 'Sinh học', 'Hoạt động trải nghiệm hướng nghiệp'],
      avatar: '👩‍🏫'
    },
    {
      id: 'GV07',
      username: 'truongthithuytien',
      password: '123',
      name: 'Trương Thị Thủy Tiên',
      email: 'truongthithuytien@tayphu.edu.vn',
      phone: '0905.555.666',
      role: 'GIAO_VIEN',
      roleLabel: 'Giáo viên bộ môn',
      departmentId: 'To_KHTN_CN',
      departmentName: 'Tổ Khoa học Tự nhiên - Công nghệ',
      subjects: ['Khoa học tự nhiên', 'Công nghệ', 'Hoạt động trải nghiệm hướng nghiệp'],
      avatar: '👩‍🏫'
    },
    {
      id: 'GV08',
      username: 'dangthingocyen',
      password: '123',
      name: 'Đặng Thị Ngọc Yến',
      email: 'dangthingocyen@tayphu.edu.vn',
      phone: '0906.666.777',
      role: 'GIAO_VIEN',
      roleLabel: 'Giáo viên bộ môn',
      departmentId: 'To_KHTN_CN',
      departmentName: 'Tổ Khoa học Tự nhiên - Công nghệ',
      subjects: ['Khoa học tự nhiên', 'Công nghệ', 'Hoạt động trải nghiệm hướng nghiệp'],
      avatar: '👩‍🏫'
    },
    {
      id: 'GV09',
      username: 'vothiutthuy',
      password: '123',
      name: 'Võ Thị Út Thủy',
      email: 'vothiutthuy@tayphu.edu.vn',
      phone: '0907.777.888',
      role: 'GIAO_VIEN',
      roleLabel: 'Giáo viên bộ môn',
      departmentId: 'To_KHTN_CN',
      departmentName: 'Tổ Khoa học Tự nhiên - Công nghệ',
      subjects: ['Khoa học tự nhiên', 'Vật lí', 'Hoạt động trải nghiệm hướng nghiệp'],
      avatar: '👩‍🏫'
    },
    {
      id: 'GV10',
      username: 'chauthicamhong',
      password: '123',
      name: 'Châu Thị Cẩm Hồng',
      email: 'chauthicamhong@tayphu.edu.vn',
      phone: '0908.888.999',
      role: 'GIAO_VIEN',
      roleLabel: 'Giáo viên bộ môn',
      departmentId: 'To_KHTN_CN',
      departmentName: 'Tổ Khoa học Tự nhiên - Công nghệ',
      subjects: ['Khoa học tự nhiên', 'Hóa học', 'Hoạt động trải nghiệm hướng nghiệp'],
      avatar: '👩‍🏫'
    },
    {
      id: 'BGH01',
      username: 'bgh',
      password: '123',
      name: 'Ban Giám Hiệu (Phó Hiệu Trưởng)',
      email: 'bgh@tayphu.edu.vn',
      phone: '0909.090.909',
      role: 'BGH',
      roleLabel: 'Ban Giám Hiệu',
      departmentId: 'BGH',
      departmentName: 'Ban Giám Hiệu',
      subjects: ['Quản lý chuyên môn'],
      avatar: '🎓'
    }
  ],

  // 5 Tiêu chuẩn Đánh giá Kế hoạch Bài dạy (Chuẩn Công văn 5512/BGDĐT)
  CRITERIA_5512: [
    {
      id: 'tc1',
      title: '1. Mục tiêu bài dạy',
      desc: 'Xác định rõ ràng phẩm chất, năng lực chung và năng lực đặc thù theo chuẩn chương trình GDPT 2018; phù hợp đối tượng học sinh.',
      maxScore: 2
    },
    {
      id: 'tc2',
      title: '2. Thiết bị dạy học và học liệu',
      desc: 'Chuẩn bị đầy đủ tranh ảnh, video, phiếu học tập, thí nghiệm, phần mềm công nghệ mô phỏng cụ thể cho từng hoạt động.',
      maxScore: 2
    },
    {
      id: 'tc3',
      title: '3. Tiến trình dạy học (Chuỗi 4 hoạt động)',
      desc: 'Cấu trúc đủ 4 hoạt động: Khởi động -> Hình thành kiến thức -> Luyện tập -> Vận dụng. Mỗi hoạt động rõ Mục tiêu, Nội dung, Sản phẩm, Tổ chức thực hiện.',
      maxScore: 3
    },
    {
      id: 'tc4',
      title: '4. Phương pháp và công cụ kiểm tra đánh giá',
      desc: 'Sử dụng đa dạng công cụ đánh giá thường xuyên: bảng kiểm (checklist), rubric, câu hỏi tương tác, tự đánh giá và đánh giá đồng đẳng.',
      maxScore: 2
    },
    {
      id: 'tc5',
      title: '5. Hình thức tổ chức & phân hóa học sinh',
      desc: 'Linh hoạt làm việc nhóm, cá nhân, giao nhiệm vụ rõ ràng và có phương án hỗ trợ học sinh còn hạn chế hoặc phát triển học sinh khá giỏi.',
      maxScore: 1
    }
  ],

  // Dữ liệu KHBD mẫu ban đầu
  INITIAL_PLANS: [
    {
      id: 'KHBD_20260901_001',
      maBai: 'BAI_01',
      tieuDe: 'Bài 1: Mở đầu về quang học và sự truyền thẳng của ánh sáng',
      monHoc: 'Khoa học tự nhiên',
      khoi: 'Khối 9',
      lop: '9A4',
      tuan: 1,
      tietPPCT: '1, 2',
      hocKy: 'Học kỳ I',
      namHoc: '2026-2027',
      tacGiaId: 'GV01',
      tacGiaTen: 'Võ Văn Hà',
      toBoMonId: 'To_KHTN_CN',
      toBoMonTen: 'Tổ Khoa học Tự nhiên - Công nghệ',
      ngayNop: '2026-09-02T08:30:00.000Z',
      fileName: 'KHBD_KHTN9_Tuan1_VoVanHa.docx',
      driveFileId: '',
      driveViewUrl: '',
      driveDownloadUrl: '#',
      trangThai: 'DA_DUYET',
      phienBan: 1,
      ghiChu: 'Đã tích hợp năng lực số (NLS) theo Phụ lục 3',
      danhGia: {
        nguoiDuyetId: 'GV02',
        nguoiDuyetTen: 'Trương Thiện Tánh',
        vaiTroDuyet: 'Tổ phó chuyên môn',
        ngayDuyet: '2026-09-03T14:20:00.000Z',
        tongDiem: '10/10',
        nhanXetChung: 'Giáo án soạn công phu, bám sát CV 5512, chuỗi hoạt động rõ nét và có tích hợp ứng dụng mô phỏng quang học rất sinh động.',
        scores: { tc1: 2, tc2: 2, tc3: 3, tc4: 2, tc5: 1 },
        chuKyXacNhan: 'ĐÃ KÝ ĐIỆN TỬ: Trương Thiện Tánh (03/09/2026 14:20)'
      }
    },
    {
      id: 'KHBD_20260908_002',
      maBai: 'BAI_02',
      tieuDe: 'Bài 2: Định luật phản xạ ánh sáng và gương phẳng',
      monHoc: 'Khoa học tự nhiên',
      khoi: 'Khối 9',
      lop: '9A4',
      tuan: 2,
      tietPPCT: '3, 4',
      hocKy: 'Học kỳ I',
      namHoc: '2026-2027',
      tacGiaId: 'GV01',
      tacGiaTen: 'Võ Văn Hà',
      toBoMonId: 'To_KHTN_CN',
      toBoMonTen: 'Tổ Khoa học Tự nhiên - Công nghệ',
      ngayNop: '2026-09-08T09:15:00.000Z',
      fileName: 'KHBD_KHTN9_Tuan2_VoVanHa.docx',
      driveFileId: '',
      driveViewUrl: '',
      driveDownloadUrl: '#',
      trangThai: 'CAN_SUA',
      phienBan: 1,
      ghiChu: 'Bài có thí nghiệm thực hành đo góc tới và góc phản xạ',
      danhGia: {
        nguoiDuyetId: 'GV02',
        nguoiDuyetTen: 'Trương Thiện Tánh',
        vaiTroDuyet: 'Tổ phó chuyên môn',
        ngayDuyet: '2026-09-09T16:00:00.000Z',
        tongDiem: '7/10',
        nhanXetChung: 'Hoạt động Luyện tập cần bổ sung phiếu học tập số 2. Phần kiểm tra đánh giá nên thêm câu hỏi thực tế về ứng dụng gương phẳng trong tiềm vọng kính.',
        scores: { tc1: 2, tc2: 1.5, tc3: 2, tc4: 1, tc5: 0.5 },
        chuKyXacNhan: 'YÊU CẦU CHỈNH SỬA: Trương Thiện Tánh'
      }
    },
    {
      id: 'KHBD_20260912_003',
      maBai: 'BAI_HDTN_01',
      tieuDe: 'Chủ đề 1: Khám phá bản thân và rèn luyện thói quen tích cực',
      monHoc: 'Hoạt động trải nghiệm hướng nghiệp',
      khoi: 'Khối 9',
      lop: '9A4',
      tuan: 3,
      tietPPCT: '7',
      hocKy: 'Học kỳ I',
      namHoc: '2026-2027',
      tacGiaId: 'GV01',
      tacGiaTen: 'Võ Văn Hà',
      toBoMonId: 'To_KHTN_CN',
      toBoMonTen: 'Tổ Khoa học Tự nhiên - Công nghệ',
      ngayNop: '2026-09-12T08:30:00.000Z',
      fileName: 'KHBD_HDTNHN9_Tuan3_VoVanHa.docx',
      driveFileId: '',
      driveViewUrl: '',
      driveDownloadUrl: '#',
      trangThai: 'CHO_DUYET',
      phienBan: 1,
      ghiChu: 'Kế hoạch bài dạy môn HĐTN-HN theo CV 5512',
      danhGia: null
    },
    {
      id: 'KHBD_20260912_004',
      maBai: 'BAI_03',
      tieuDe: 'Bài 3: Hiện tượng khúc xạ ánh sáng và thấu kính hội tụ',
      monHoc: 'Khoa học tự nhiên',
      khoi: 'Khối 9',
      lop: '9A4',
      tuan: 3,
      tietPPCT: '5, 6',
      hocKy: 'Học kỳ I',
      namHoc: '2026-2027',
      tacGiaId: 'GV03',
      tacGiaTen: 'Nguyễn Thị Phước Hoài',
      toBoMonId: 'To_KHTN_CN',
      toBoMonTen: 'Tổ Khoa học Tự nhiên - Công nghệ',
      ngayNop: '2026-09-12T08:00:00.000Z',
      fileName: 'KHBD_KHTN9_Tuan3_NguyenThiPhuocHoai.docx',
      driveFileId: '',
      driveViewUrl: '',
      driveDownloadUrl: '#',
      trangThai: 'CHO_DUYET',
      phienBan: 1,
      ghiChu: 'Kính gửi Thầy Tổ trưởng Võ Văn Hà và Thầy Tổ phó Trương Thiện Tánh xem xét.',
      danhGia: null
    },
    {
      id: 'KHBD_20260912_005',
      maBai: 'BAI_04',
      tieuDe: 'Bài 4: Khái niệm về dòng điện không đổi và định luật Ôm',
      monHoc: 'Khoa học tự nhiên',
      khoi: 'Khối 9',
      lop: '9A2',
      tuan: 3,
      tietPPCT: '8',
      hocKy: 'Học kỳ I',
      namHoc: '2026-2027',
      tacGiaId: 'GV04',
      tacGiaTen: 'Nguyễn Thị Thu Hà',
      toBoMonId: 'To_KHTN_CN',
      toBoMonTen: 'Tổ Khoa học Tự nhiên - Công nghệ',
      ngayNop: '2026-09-11T14:30:00.000Z',
      fileName: 'KHBD_KHTN9_Tuan3_NguyenThiThuHa.docx',
      driveFileId: '',
      driveViewUrl: '',
      driveDownloadUrl: '#',
      trangThai: 'CHO_DUYET',
      phienBan: 1,
      ghiChu: 'Bài có sử dụng bộ thí nghiệm điện tử trực quan.',
      danhGia: null
    }
  ]
};
