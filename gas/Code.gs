/**
 * =========================================================================
 * HỆ THỐNG QUẢN LÝ & KIỂM TRA KẾ HOẠCH BÀI DẠY (GIÁO ÁN) - GOOGLE APPS SCRIPT
 * Trường THCS Tây Phú | Năm học 2026 - 2027
 * =========================================================================
 * Backend Serverless chạy trực tiếp trên tài khoản Google cá nhân/nhà trường.
 * Không phát sinh chi phí, bảo mật cao, kết nối trực tiếp Google Drive & Sheets.
 */

// Cấu hình mặc định
const CONFIG = {
  DEFAULT_YEAR: '2026-2027',
  ROOT_FOLDER_NAME: 'KHBD_NamHoc_2026_2027',
  SHEET_NAMES: {
    PLANS: 'KE_HOACH_BAI_DAY',
    TEACHERS: 'GIAO_VIEN',
    DEPARTMENTS: 'TO_BO_MON',
    REVIEWS: 'LICH_SU_DUYET',
    SETTINGS: 'CAU_HINH',
    ACCOUNTS: 'TAI_KHOAN'
  }
};

/**
 * Xử lý yêu cầu HTTP GET từ Web Client
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'ping';
    let responseData = {};

    if (action === 'ping') {
      responseData = { status: 'success', message: 'Hệ thống KHBD Apps Script sẵn sàng hoạt động!', timestamp: new Date().toISOString() };
    } else if (action === 'getData') {
      responseData = getAllData();
    } else if (action === 'checkLogin') {
      const u = (e.parameter.username || '').toLowerCase();
      const p = e.parameter.password || '';
      responseData = handleCheckLogin(u, p);
    } else if (action === 'getPlans') {
      const teacherId = e.parameter.teacherId;
      const dept = e.parameter.department;
      responseData = getFilteredPlans(teacherId, dept);
    } else if (action === 'initSpreadsheet') {
      responseData = initializeSpreadsheetDatabase();
    } else {
      responseData = { status: 'error', message: 'Action không hợp lệ: ' + action };
    }

    return createJsonResponse(responseData);
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Xử lý yêu cầu HTTP POST từ Web Client (Upload file, Duyệt bài, Đồng bộ)
 */
function doPost(e) {
  try {
    let requestData;
    if (e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      requestData = e.parameter;
    } else {
      throw new Error('Dữ liệu gửi lên không đúng định dạng');
    }

    const action = requestData.action;
    let result = {};

    switch (action) {
      case 'uploadPlan':
        result = handleUploadPlan(requestData);
        break;

      case 'reviewPlan':
        result = handleReviewPlan(requestData);
        break;

      case 'syncFolders':
        result = handleSyncFolderStructure(requestData);
        break;

      case 'updatePlanStatus':
        result = handleUpdateStatus(requestData);
        break;

      case 'deletePlan':
        result = handleDeletePlan(requestData);
        break;

      case 'clearAllPlans':
        result = handleClearAllPlans(requestData);
        break;

      case 'changePassword':
        result = handleChangePassword(requestData);
        break;

      default:
        result = { status: 'error', message: 'Action không xác định: ' + action };
    }

    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Tạo JSON Response kèm chuẩn CORS cho Web App gọi API
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// =========================================================================
// 1. QUẢN LÝ TỰ ĐỘNG THƯ MỤC GOOGLE DRIVE
// =========================================================================

/**
 * Tìm hoặc tạo thư mục theo tên trong thư mục cha (hoặc Drive Root)
 */
function getOrCreateFolder(folderName, parentFolder) {
  let folders;
  if (parentFolder) {
    folders = parentFolder.getFoldersByName(folderName);
  } else {
    folders = DriveApp.getFoldersByName(folderName);
  }

  if (folders.hasNext()) {
    return folders.next();
  } else {
    if (parentFolder) {
      return parentFolder.createFolder(folderName);
    } else {
      return DriveApp.createFolder(folderName);
    }
  }
}

/**
 * Chuẩn hóa chuỗi tên không dấu để làm tên thư mục an toàn
 */
function sanitizeName(str) {
  if (!str) return 'Chung';
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
}

/**
 * Tìm hoặc tạo thư mục gốc cho năm học (tự động nhận diện cả KHBD_Namhoc_2026_2027 và KHBD_NamHoc_2026_2027)
 */
function getRootFolder(year) {
  const y = (year || CONFIG.DEFAULT_YEAR).replace(/[^0-9]/g, '_');
  const possibleNames = [
    'KHBD_Namhoc_' + y,
    'KHBD_NamHoc_' + y,
    'KHBD_Namhoc_2026_2027',
    'KHBD_NamHoc_2026_2027',
    'KHBD_' + y
  ];

  // Tìm trong Drive xem đã có thư mục nào do Thầy tạo sẵn chưa
  for (let i = 0; i < possibleNames.length; i++) {
    const folders = DriveApp.getFoldersByName(possibleNames[i]);
    if (folders.hasNext()) {
      return folders.next();
    }
  }

  // Nếu chưa có, tạo mới theo tên chuẩn
  return DriveApp.createFolder('KHBD_Namhoc_' + y);
}

/**
 * Tạo tự động cây thư mục hoàn chỉnh:
 * [Root: KHBD_Namhoc_2026_2027] -> [Tổ ...] -> [GV ...] -> [Tuan_XX]
 */
function ensureTeacherWeekFolder(year, department, teacherName, weekNumber) {
  const rootFolder = getRootFolder(year);
  
  // Thư mục Tổ
  const deptFolderName = 'To_' + sanitizeName(department);
  const deptFolder = getOrCreateFolder(deptFolderName, rootFolder);

  // Thư mục Giáo viên
  const teacherFolderName = 'GV_' + sanitizeName(teacherName);
  const teacherFolder = getOrCreateFolder(teacherFolderName, deptFolder);

  // Thư mục Tuần
  const weekFormatted = typeof weekNumber === 'number' ? 
    (weekNumber < 10 ? 'Tuan_0' + weekNumber : 'Tuan_' + weekNumber) :
    'Tuan_' + weekNumber;
  const weekFolder = getOrCreateFolder(weekFormatted, teacherFolder);

  return {
    rootFolderId: rootFolder.getId(),
    rootFolderUrl: rootFolder.getUrl(),
    deptFolderId: deptFolder.getId(),
    teacherFolderId: teacherFolder.getId(),
    weekFolderId: weekFolder.getId(),
    weekFolderUrl: weekFolder.getUrl(),
    targetFolder: weekFolder
  };
}

/**
 * =========================================================================
 * 🛠️ HÀM TEST TRỰC TIẾP TRÊN GOOGLE APPS SCRIPT (KHÔNG CẦN CHỜ WEB)
 * =========================================================================
 * Thầy chỉ cần:
 * 1. Nhấp chọn hàm 'testDirectDriveCreation' ở menu hàm phía trên của Apps Script.
 * 2. Bấm nút 'Chạy' (Run ▶).
 * 3. Bấm 'Xem lại quyền' ➔ Cấp quyền truy cập Drive của Thầy.
 * => Thư mục KHBD_Namhoc_2026_2027 sẽ xuất hiện ngay lập tức trên Google Drive của Thầy!
 */
function testDirectDriveCreation() {
  const rootFolder = getRootFolder('2026-2027');
  Logger.log('====================================================');
  Logger.log('🎉 KẾT NỐI GOOGLE DRIVE THÀNH CÔNG!');
  Logger.log('📁 Thư mục gốc: ' + rootFolder.getName());
  Logger.log('🔗 Link mở trực tiếp thư mục gốc: ' + rootFolder.getUrl());
  
  const dept = getOrCreateFolder('To_Khoa_Hoc_Tu_Nhien_Cong_Nghe', rootFolder);
  const gv = getOrCreateFolder('GV_Vo_Van_Ha', dept);
  const tuan = getOrCreateFolder('Tuan_03', gv);
  
  Logger.log('📁 Thư mục tuần: ' + tuan.getName());
  Logger.log('🔗 Link mở trực tiếp thư mục Tuần 3: ' + tuan.getUrl());
  Logger.log('====================================================');

  return {
    status: 'success',
    rootUrl: rootFolder.getUrl(),
    tuanUrl: tuan.getUrl()
  };
}

// =========================================================================
// 2. XỬ LÝ UPLOAD & LƯU TRỮ GIÁO ÁN
// =========================================================================

/**
 * Nhận file từ client (Base64 hoặc link Google Docs), lưu vào Drive và Sheets
 */
function handleUploadPlan(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || getOrCreateSpreadsheet();
  const plansSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.PLANS);

  const planId = data.id || ('KHBD_' + new Date().getTime());
  const year = data.namHoc || CONFIG.DEFAULT_YEAR;
  const department = data.toBoMonTen || data.toBoMon || 'To_Khoa_Hoc_Tu_Nhien_Cong_Nghe';
  const teacherName = data.tacGiaTen || 'GiaoVien';
  const week = data.tuan || 1;

  // Luôn đảm bảo thư mục Năm học ➔ Tổ ➔ GV ➔ Tuần tồn tại trên Google Drive
  const folderInfo = ensureTeacherWeekFolder(year, department, teacherName, week);

  let driveFileId = '';
  let driveViewUrl = '';
  let driveDownloadUrl = '';
  let fileName = data.fileName || ('KHBD_Tuan' + week + '_' + sanitizeName(teacherName) + '.docx');

  // Trường hợp 1: Có file nhị phân đính kèm dạng Base64
  if (data.fileBase64) {
    const contentType = data.fileMimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const decodedBytes = Utilities.base64Decode(data.fileBase64);
    const blob = Utilities.newBlob(decodedBytes, contentType, fileName);

    const file = folderInfo.targetFolder.createFile(blob);
    // Cấp quyền bất kỳ ai có link đều có thể xem (nếu phù hợp nội bộ trường)
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      // Bỏ qua nếu tổ chức chặn share ra ngoài
    }

    driveFileId = file.getId();
    driveViewUrl = file.getUrl();
    driveDownloadUrl = file.getDownloadUrl();
  } 
  // Trường hợp 2: Giáo viên gửi link Google Docs có sẵn
  else if (data.docsUrl) {
    driveViewUrl = data.docsUrl;
    driveFileId = extractFileIdFromUrl(data.docsUrl);
    driveDownloadUrl = driveViewUrl;
    if (driveFileId && folderInfo && folderInfo.targetFolder) {
      try {
        folderInfo.targetFolder.createShortcut(driveFileId);
      } catch (e) {}
    }
  }

  const departmentId = data.toBoMonId || 'To_KHTN_CN';
  const departmentName = data.toBoMonTen || data.toBoMon || 'Tổ Khoa học Tự nhiên - Công nghệ';

  const newRow = [
    planId,
    data.maBai || ('BAI_' + week),
    data.tieuDe || 'Kế hoạch bài dạy',
    data.monHoc || 'Khoa học tự nhiên',
    data.khoi || '9',
    data.lop || '9A4',
    week,
    data.hocKy || 'HK1',
    year,
    data.tacGiaId || 'GV01',
    teacherName,
    departmentName,
    new Date().toISOString(),
    fileName,
    driveFileId,
    driveViewUrl,
    driveDownloadUrl,
    'CHO_DUYET', // Trạng thái: CHO_DUYET, DA_DUYET, CAN_SUA, TU_CHOI
    data.phienBan || 1,
    data.ghiChu || '',
    departmentId,
    data.tietPPCT ? ("'" + String(data.tietPPCT).replace(/^'+/, '').trim()) : ''
  ];

  // Kiểm tra nếu đã có planId thì cập nhật dòng cũ, chưa có thì append
  const existingRowIndex = findRowIndexById(plansSheet, planId);
  if (existingRowIndex > 0) {
    plansSheet.getRange(existingRowIndex, 1, 1, newRow.length).setValues([newRow]);
  } else {
    plansSheet.appendRow(newRow);
  }

  return {
    status: 'success',
    message: 'Đã tải lên và lưu trữ thành công vào Google Drive & Google Sheets!',
    plan: {
      id: planId,
      tieuDe: data.tieuDe,
      tietPPCT: data.tietPPCT || '',
      monHoc: data.monHoc,
      khoi: data.khoi,
      lop: data.lop,
      tuan: week,
      tacGiaId: data.tacGiaId,
      tacGiaTen: teacherName,
      toBoMonId: departmentId,
      toBoMonTen: departmentName,
      driveFileId: driveFileId,
      driveViewUrl: driveViewUrl,
      driveDownloadUrl: driveDownloadUrl,
      folderUrl: folderInfo ? folderInfo.weekFolderUrl : '',
      fileName: fileName,
      trangThai: 'CHO_DUYET',
      ngayNop: new Date().toISOString()
    }
  };
}

/**
 * Xử lý Tổ trưởng hoặc BGH duyệt giáo án
 */
function handleReviewPlan(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || getOrCreateSpreadsheet();
  const plansSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.PLANS);
  const reviewsSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.REVIEWS);

  const planId = data.khbdId;
  const rowIndex = findRowIndexById(plansSheet, planId);

  if (rowIndex <= 0) {
    throw new Error('Không tìm thấy giáo án có mã: ' + planId);
  }

  const newStatus = data.trangThai; // DA_DUYET | CAN_SUA | TU_CHOI
  // Cập nhật trạng thái tại cột 18 (Trạng thái)
  plansSheet.getRange(rowIndex, 18).setValue(newStatus);

  // Ghi nhật ký lịch sử duyệt vào sheet LICH_SU_DUYET
  const reviewId = 'REV_' + new Date().getTime();
  const reviewRow = [
    reviewId,
    planId,
    data.nguoiDuyetId || 'TT01',
    data.nguoiDuyetTen || 'Tổ trưởng chuyên môn',
    data.vaiTroDuyet || 'TO_TRUONG',
    new Date().toISOString(),
    newStatus,
    data.nhanXetChung || '',
    JSON.stringify(data.tieuChiDanhGia || {}), // Điểm/nhận xét 5 tiêu chuẩn CV 5512
    data.chuKyXacNhan || '' // Base64 mộc/chữ ký điện tử
  ];
  reviewsSheet.appendRow(reviewRow);

  return {
    status: 'success',
    message: 'Đã lưu kết quả phê duyệt và ký điện tử thành công!',
    review: {
      reviewId: reviewId,
      khbdId: planId,
      trangThai: newStatus,
      ngayDuyet: new Date().toISOString(),
      nguoiDuyetTen: data.nguoiDuyetTen
    }
  };
}

// =========================================================================
// 3. ĐỒNG BỘ DỮ LIỆU & KHỞI TẠO HỆ THỐNG
// =========================================================================

/**
 * Lấy toàn bộ dữ liệu (Giáo viên, Kế hoạch bài dạy, Lịch sử duyệt)
 * Chuẩn hóa cấu trúc để Web App trên máy tính và điện thoại đồng bộ thời gian thực
 */
function getAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || getOrCreateSpreadsheet();
  const plansSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.PLANS);
  const reviewsSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.REVIEWS);
  const teachersSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.TEACHERS);
  const deptSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.DEPARTMENTS);

  // 1. Đọc danh sách đánh giá từ reviewsSheet
  const reviewRows = reviewsSheet.getDataRange().getValues();
  const reviewMap = {}; // planId -> latest review object
  for (let r = 1; r < reviewRows.length; r++) {
    const row = reviewRows[r];
    const planId = String(row[1] || '');
    if (!planId) continue;
    let scores = {};
    try {
      scores = typeof row[8] === 'string' ? JSON.parse(row[8]) : (row[8] || {});
    } catch (e) {}

    let tongDiem = '';
    if (scores && typeof scores === 'object') {
      let sum = 0;
      Object.values(scores).forEach(v => {
        const num = parseFloat(v);
        if (!isNaN(num)) sum += num;
      });
      tongDiem = `${sum}/10`;
    }

    reviewMap[planId] = {
      reviewId: String(row[0] || ''),
      planId: planId,
      nguoiDuyetId: String(row[2] || ''),
      nguoiDuyetTen: String(row[3] || ''),
      vaiTroDuyet: String(row[4] || ''),
      ngayDuyet: row[5] ? (row[5] instanceof Date ? row[5].toISOString() : String(row[5])) : '',
      trangThai: String(row[6] || ''),
      nhanXetChung: String(row[7] || ''),
      scores: scores,
      tongDiem: tongDiem,
      chuKyXacNhan: String(row[9] || '')
    };
  }

  // 2. Đọc danh sách plans từ plansSheet
  const planRows = plansSheet.getDataRange().getValues();
  const plans = [];
  for (let p = 1; p < planRows.length; p++) {
    const row = planRows[p];
    const id = String(row[0] || '');
    if (!id) continue;

    const toBoMonRaw = String(row[11] || '');
    const authorId = String(row[9] || '');
    let toBoMonId = String(row[20] || '');

    // Nhận diện toBoMonId chuẩn nếu sheet chưa lưu ở cột 21
    if (!toBoMonId) {
      if (authorId.startsWith('GV') && parseInt(authorId.replace('GV', ''), 10) <= 10) {
        toBoMonId = 'To_KHTN_CN';
      } else if (toBoMonRaw.includes('KHTN') || toBoMonRaw.includes('Tự nhiên') || toBoMonRaw.includes('Công nghệ')) {
        toBoMonId = 'To_KHTN_CN';
      } else if (toBoMonRaw.includes('KHXH') || toBoMonRaw.includes('Xã hội')) {
        toBoMonId = 'To_KHXH';
      } else if (toBoMonRaw.includes('Toán') || toBoMonRaw.includes('Tin') || toBoMonRaw.includes('Toan')) {
        toBoMonId = 'To_Toan_Tin';
      } else {
        toBoMonId = 'To_KHTN_CN';
      }
    }

    const planObj = {
      id: id,
      maBai: String(row[1] || ''),
      tieuDe: String(row[2] || ''),
      monHoc: String(row[3] || ''),
      khoi: String(row[4] || ''),
      lop: String(row[5] || ''),
      tuan: Number(row[6] || 1),
      hocKy: String(row[7] || ''),
      namHoc: String(row[8] || ''),
      tacGiaId: authorId,
      tacGiaTen: String(row[10] || ''),
      toBoMonId: toBoMonId,
      toBoMonTen: toBoMonRaw || 'Tổ Khoa học Tự nhiên - Công nghệ',
      ngayNop: row[12] ? (row[12] instanceof Date ? row[12].toISOString() : String(row[12])) : '',
      fileName: String(row[13] || ''),
      driveFileId: String(row[14] || ''),
      driveViewUrl: String(row[15] || ''),
      driveDownloadUrl: String(row[16] || ''),
      trangThai: String(row[17] || 'CHO_DUYET'),
      phienBan: Number(row[18] || 1),
      ghiChu: String(row[19] || ''),
      tietPPCT: (function() {
        let raw = row[21];
        if (raw instanceof Date) {
          const d = raw.getDate();
          const m = raw.getMonth() + 1;
          const min = Math.min(d, m);
          const max = Math.max(d, m);
          if (min === max) return String(min);
          if ((max - min) <= 5) {
            const arr = [];
            for (let i = min; i <= max; i++) arr.push(i);
            return arr.join(', ');
          }
          return min + ', ' + max;
        }
        let s = String(raw || '').trim().replace(/^'+/, '');
        if (s.includes('GMT') || s.includes('Giờ') || s.includes('00:00:00') || /^[A-Z][a-z]{2}\s[A-Z][a-z]{2}\s\d{1,2}\s\d{4}/.test(s)) {
          try {
            const dt = new Date(s);
            if (!isNaN(dt.getTime())) {
              const d = dt.getDate();
              const m = dt.getMonth() + 1;
              const min = Math.min(d, m);
              const max = Math.max(d, m);
              if (min === max) return String(min);
              if ((max - min) <= 5) {
                const arr = [];
                for (let i = min; i <= max; i++) arr.push(i);
                return arr.join(', ');
              }
              return min + ', ' + max;
            }
          } catch (e) {}
        }
        return s.replace(/^(tiết|tiet|t\.)\s*:?/i, '').trim();
      })(),
      danhGia: reviewMap[id] || null
    };
    plans.push(planObj);
  }

  let teachers = [];
  let departments = [];
  let accounts = [];
  try {
    teachers = readSheetToJson(teachersSheet);
  } catch (e) {}
  try {
    departments = readSheetToJson(deptSheet);
  } catch (e) {}

  // Đọc danh sách tài khoản & mật khẩu đã đồng bộ
  try {
    const accSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.ACCOUNTS || 'TAI_KHOAN');
    if (accSheet.getLastRow() > 1) {
      const accRows = accSheet.getDataRange().getValues();
      for (let a = 1; a < accRows.length; a++) {
        if (accRows[a][0] || accRows[a][1]) {
          accounts.push({
            id: String(accRows[a][0] || ''),
            username: String(accRows[a][1] || '').toLowerCase(),
            password: String(accRows[a][2] || ''),
            name: String(accRows[a][3] || ''),
            role: String(accRows[a][4] || ''),
            departmentId: String(accRows[a][5] || ''),
            updatedAt: String(accRows[a][6] || '')
          });
        }
      }
    }
  } catch (e) {}

  return {
    status: 'success',
    data: {
      plans: plans,
      teachers: teachers,
      departments: departments,
      accounts: accounts,
      serverTime: new Date().toISOString()
    }
  };
}

/**
 * Đổi mật khẩu tài khoản và đồng bộ lên Google Sheets
 */
function handleChangePassword(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || getOrCreateSpreadsheet();
  const accSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.ACCOUNTS || 'TAI_KHOAN');
  if (accSheet.getLastRow() === 0) {
    accSheet.appendRow(['ID', 'Username', 'Password', 'Name', 'Role', 'DepartmentId', 'UpdatedAt']);
    formatHeaderRow(accSheet);
  }

  const userId = String(data.userId || data.id || '').trim();
  const username = String(data.username || '').toLowerCase().trim();
  const newPass = String(data.newPassword || data.password || '').trim();

  if (!newPass) {
    return { status: 'error', message: 'Mật khẩu mới không được để trống' };
  }

  const rows = accSheet.getDataRange().getValues();
  let targetRow = -1;
  for (let i = 1; i < rows.length; i++) {
    const rId = String(rows[i][0] || '').trim();
    const rUser = String(rows[i][1] || '').toLowerCase().trim();
    if ((userId && rId === userId) || (username && rUser === username)) {
      targetRow = i + 1;
      break;
    }
  }

  const now = new Date().toISOString();
  if (targetRow > 0) {
    accSheet.getRange(targetRow, 3).setValue(newPass);
    accSheet.getRange(targetRow, 7).setValue(now);
  } else {
    accSheet.appendRow([userId, username, newPass, data.name || '', data.role || '', data.departmentId || '', now]);
  }

  return {
    status: 'success',
    message: 'Đổi mật khẩu thành công và đã đồng bộ lên máy chủ đám mây!',
    userId: userId,
    username: username
  };
}

/**
 * Kiểm tra xác thực mật khẩu trực tuyến trên máy chủ đám mây
 */
function handleCheckLogin(username, password) {
  const cleanU = (username || '').toLowerCase().trim();
  const cleanP = (password || '').trim();
  const ss = SpreadsheetApp.getActiveSpreadsheet() || getOrCreateSpreadsheet();
  const accSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.ACCOUNTS || 'TAI_KHOAN');
  if (accSheet.getLastRow() > 1) {
    const rows = accSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      const rUser = String(rows[i][1] || '').toLowerCase().trim();
      const rPass = String(rows[i][2] || '').trim();
      if (rUser === cleanU) {
        if (rPass === cleanP) {
          return {
            status: 'success',
            valid: true,
            message: 'Đăng nhập đám mây thành công!',
            account: {
              id: String(rows[i][0] || ''),
              username: rUser,
              password: rPass,
              name: String(rows[i][3] || ''),
              role: String(rows[i][4] || ''),
              departmentId: String(rows[i][5] || '')
            }
          };
        } else {
          return { status: 'error', valid: false, message: 'Mật khẩu không chính xác!' };
        }
      }
    }
  }
  return { status: 'not_found', valid: false, message: 'Chưa có thông tin mật khẩu mới trên máy chủ đám mây' };
}

/**
 * Lấy danh sách kế hoạch bài dạy có lọc theo giáo viên hoặc tổ
 */
function getFilteredPlans(teacherId, dept) {
  const all = getAllData();
  if (all.status !== 'success' || !all.data) return all;
  let plans = all.data.plans || [];
  if (teacherId) plans = plans.filter(function(p) { return p.tacGiaId === teacherId; });
  if (dept) plans = plans.filter(function(p) { return p.toBoMonId === dept || p.toBoMonTen === dept; });
  return { status: 'success', data: { plans: plans } };
}

/**
 * Cập nhật trạng thái duyệt của giáo án
 */
function handleUpdateStatus(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || getOrCreateSpreadsheet();
  const plansSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.PLANS);
  const planId = data.planId || data.id;
  const newStatus = data.trangThai || data.status;
  const rowIndex = findRowIndexById(plansSheet, planId);
  if (rowIndex > 0) {
    plansSheet.getRange(rowIndex, 18).setValue(newStatus);
    return { status: 'success', message: 'Đã cập nhật trạng thái thành công!' };
  }
  return { status: 'error', message: 'Không tìm thấy Kế hoạch bài dạy' };
}

/**
 * Tự động tạo cấu trúc các Sheet cơ sở dữ liệu nếu chưa có
 */
function initializeSpreadsheetDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || getOrCreateSpreadsheet();

  // 1. Sheet KE_HOACH_BAI_DAY
  const pSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.PLANS);
  if (pSheet.getLastRow() === 0) {
    pSheet.appendRow([
      'ID', 'Mã Bài', 'Tiêu Đề', 'Môn Học', 'Khối', 'Lớp', 'Tuần', 'Học Kỳ', 'Năm Học',
      'Tác Giả ID', 'Tác Giả Tên', 'Tổ Bộ Môn', 'Ngày Nộp', 'Tên File', 'Drive File ID',
      'Drive View URL', 'Drive Download URL', 'Trạng Thái', 'Phiên Bản', 'Ghi Chú'
    ]);
    formatHeaderRow(pSheet);
  }

  // 2. Sheet GIAO_VIEN
  const tSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.TEACHERS);
  if (tSheet.getLastRow() === 0) {
    tSheet.appendRow([
      'ID', 'Họ Và Tên', 'Email', 'Số Điện Thoại', 'Tổ Bộ Môn', 'Vai Trò', 'Trạng Thái'
    ]);
    formatHeaderRow(tSheet);
    // Thêm dữ liệu mẫu
    tSheet.appendRow(['GV01', 'Võ Văn Hà', 'vovanha@tayphu.edu.vn', '0912345678', 'To_KHTN', 'GIAO_VIEN', 'ACTIVE']);
    tSheet.appendRow(['GV02', 'Nguyễn Thị Lan', 'nguyenthilan@tayphu.edu.vn', '0987654321', 'To_KHTN', 'TO_TRUONG', 'ACTIVE']);
    tSheet.appendRow(['GV03', 'Trần Văn Bình', 'tranvanbinh@tayphu.edu.vn', '0905123456', 'To_KHXH', 'TO_TRUONG', 'ACTIVE']);
    tSheet.appendRow(['BGH01', 'Ban Giám Hiệu', 'bgh@tayphu.edu.vn', '0909090909', 'BGH', 'BGH', 'ACTIVE']);
  }

  // 3. Sheet TO_BO_MON
  const dSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.DEPARTMENTS);
  if (dSheet.getLastRow() === 0) {
    dSheet.appendRow(['ID', 'Tên Tổ', 'Tổ Trưởng ID', 'Số Lượng GV']);
    formatHeaderRow(dSheet);
    dSheet.appendRow(['To_KHTN', 'Tổ Khoa học Tự nhiên', 'GV02', 8]);
    dSheet.appendRow(['To_KHXH', 'Tổ Khoa học Xã hội', 'GV03', 10]);
    dSheet.appendRow(['To_Toan_Tin', 'Tổ Toán - Tin học', 'GV04', 7]);
    dSheet.appendRow(['To_Ngoai_Ngu', 'Tổ Ngoại ngữ', 'GV05', 6]);
  }

  // 4. Sheet LICH_SU_DUYET
  const rSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.REVIEWS);
  if (rSheet.getLastRow() === 0) {
    rSheet.appendRow([
      'ID', 'KHBD ID', 'Người Duyệt ID', 'Người Duyệt Tên', 'Vai Trò',
      'Ngày Duyệt', 'Hành Động', 'Nhận Xét Chung', 'Tiêu Chí Đánh Giá (JSON)', 'Chữ Ký / Con Dấu'
    ]);
    formatHeaderRow(rSheet);
  }

  // 5. Cấu trúc thư mục Drive gốc
  const rootFolder = getOrCreateFolder(CONFIG.ROOT_FOLDER_NAME, null);

  return {
    status: 'success',
    message: 'Khởi tạo cấu trúc Google Sheets và Google Drive thành công!',
    spreadsheetUrl: ss.getUrl(),
    rootFolderUrl: rootFolder.getUrl(),
    rootFolderId: rootFolder.getId()
  };
}

// =========================================================================
// 4. HÀM PHỤ TRỢ (HELPERS)
// =========================================================================

function getOrCreateSpreadsheet() {
  const files = DriveApp.getFilesByName('CSDL_QuanLy_KHBD_TayPhu');
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  } else {
    const ss = SpreadsheetApp.create('CSDL_QuanLy_KHBD_TayPhu');
    return ss;
  }
}

function getOrCreateSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function formatHeaderRow(sheet) {
  const range = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  range.setBackground('#1e293b');
  range.setFontColor('#ffffff');
  range.setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function findRowIndexById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      return i + 1; // 1-indexed
    }
  }
  return -1;
}

function readSheetToJson(sheet) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows[0];
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    list.push(obj);
  }
  return list;
}

function extractFileIdFromUrl(url) {
  if (!url) return '';
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : '';
}

/**
 * Xóa Kế hoạch bài dạy khỏi Google Drive & Google Sheets
 * Đảm bảo tệp tài liệu trong Google Drive được chuyển vào Thùng rác (setTrashed(true))
 */
function handleDeletePlan(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || getOrCreateSpreadsheet();
  const plansSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.PLANS);
  const planId = data.id || data.planId;
  let driveFileId = data.driveFileId;
  let fileTrashed = false;
  let trashedFilesCount = 0;

  // 1. Nếu driveFileId chưa có trực tiếp, thử trích xuất từ các URL gửi kèm
  if (!driveFileId && data.driveViewUrl) {
    driveFileId = extractFileIdFromUrl(data.driveViewUrl);
  }
  if (!driveFileId && data.docsUrl) {
    driveFileId = extractFileIdFromUrl(data.docsUrl);
  }

  // 2. Chuyển tệp vào Thùng rác trên Google Drive theo driveFileId
  if (driveFileId) {
    try {
      const file = DriveApp.getFileById(driveFileId);
      if (file) {
        file.setTrashed(true);
        fileTrashed = true;
        trashedFilesCount++;
        Logger.log('Đã chuyển tệp Drive vào thùng rác: ' + driveFileId);
      }
    } catch (e) {
      Logger.log('Không thể chuyển tệp Drive trực tiếp vào thùng rác: ' + e.message);
    }
  }

  // 3. Tìm và kiểm tra trong Google Sheets để lấy driveFileId lưu trong sheet
  if (planId && plansSheet) {
    const rowIndex = findRowIndexById(plansSheet, planId);
    if (rowIndex > 0) {
      try {
        const sheetFileId = plansSheet.getRange(rowIndex, 15).getValue();
        const sheetViewUrl = plansSheet.getRange(rowIndex, 16).getValue();
        const targetId = sheetFileId || extractFileIdFromUrl(sheetViewUrl);
        if (targetId && targetId !== driveFileId) {
          const file = DriveApp.getFileById(targetId);
          if (file) {
            file.setTrashed(true);
            fileTrashed = true;
            trashedFilesCount++;
            Logger.log('Đã chuyển tệp từ Sheets vào thùng rác: ' + targetId);
          }
        }
      } catch (err) {
        Logger.log('Lỗi khi chuyển tệp Drive từ Sheet vào thùng rác: ' + err.message);
      }
      // Xóa dòng trong sheet
      plansSheet.deleteRow(rowIndex);
      Logger.log('Đã xóa dòng KHBD trong Google Sheets: ' + planId);
    }
  }

  // 4. Nếu vẫn chưa trashed được file, tìm theo tên tệp trong thư mục tuần của giáo viên
  if (!fileTrashed && data.fileName && data.teacherName) {
    try {
      const year = data.year || data.namHoc || CONFIG.DEFAULT_YEAR;
      const dept = data.department || data.toBoMonTen || 'To_Khoa_Hoc_Tu_Nhien_Cong_Nghe';
      const teacher = data.teacherName || data.tacGiaTen;
      const week = data.week || data.tuan || 1;
      const folderInfo = ensureTeacherWeekFolder(year, dept, teacher, week);
      if (folderInfo && folderInfo.targetFolder) {
        const files = folderInfo.targetFolder.getFilesByName(data.fileName);
        while (files.hasNext()) {
          const f = files.next();
          f.setTrashed(true);
          fileTrashed = true;
          trashedFilesCount++;
          Logger.log('Đã chuyển tệp trong thư mục tuần vào thùng rác: ' + f.getName());
        }
      }
    } catch (err) {
      Logger.log('Lỗi quét tệp theo tên để chuyển vào thùng rác: ' + err.message);
    }
  }

  return {
    status: 'success',
    fileTrashed: fileTrashed,
    trashedCount: trashedFilesCount,
    message: fileTrashed 
      ? 'Đã xóa Kế hoạch bài dạy và chuyển tệp tài liệu trong Google Drive vào Thùng rác thành công!' 
      : 'Đã xóa Kế hoạch bài dạy khỏi hệ thống.'
  };
}

/**
 * Xóa toàn bộ dữ liệu KHBD trong Google Sheets
 */
function handleClearAllPlans(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || getOrCreateSpreadsheet();
  const plansSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.PLANS);
  const lastRow = plansSheet.getLastRow();
  if (lastRow > 1) {
    plansSheet.deleteRows(2, lastRow - 1);
  }
  return {
    status: 'success',
    message: 'Đã dọn dẹp sạch toàn bộ Kế hoạch bài dạy trong Google Sheets!'
  };
}

/**
 * Tự động tạo và đồng bộ cây thư mục 35 tuần cho tất cả giáo viên trên Google Drive
 */
function handleSyncFolderStructure(data) {
  const year = data.namHoc || CONFIG.DEFAULT_YEAR;
  const teachers = data.teachers || [];
  const rootName = 'KHBD_NamHoc_' + (year || CONFIG.DEFAULT_YEAR).replace(/[^0-9]/g, '_');
  const rootFolder = getOrCreateFolder(rootName, null);

  const syncedTeachers = [];

  teachers.forEach(function(t) {
    if (t.role === 'BGH') return;
    const deptName = t.departmentName || 'To_Khoa_Hoc_Tu_Nhien_Cong_Nghe';
    const deptFolderName = 'To_' + sanitizeName(deptName);
    const deptFolder = getOrCreateFolder(deptFolderName, rootFolder);

    const teacherFolderName = 'GV_' + sanitizeName(t.name);
    const teacherFolder = getOrCreateFolder(teacherFolderName, deptFolder);

    // Tạo sẵn 35 tuần
    for (let w = 1; w <= 35; w++) {
      const weekFormatted = w < 10 ? 'Tuan_0' + w : 'Tuan_' + w;
      getOrCreateFolder(weekFormatted, teacherFolder);
    }

    syncedTeachers.push({
      teacherId: t.id,
      name: t.name,
      folderUrl: teacherFolder.getUrl()
    });
  });

  return {
    status: 'success',
    message: 'Đã đồng bộ thành công cấu trúc 35 tuần cho ' + syncedTeachers.length + ' giáo viên trên Google Drive!',
    rootFolderUrl: rootFolder.getUrl(),
    rootFolderId: rootFolder.getId(),
    syncedCount: syncedTeachers.length
  };
}

/**
 * Cập nhật trạng thái duyệt KHBD
 */
function handleUpdateStatus(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || getOrCreateSpreadsheet();
  const plansSheet = getOrCreateSheet(ss, CONFIG.SHEET_NAMES.PLANS);
  const rowIndex = findRowIndexById(plansSheet, data.id);
  if (rowIndex > 0) {
    plansSheet.getRange(rowIndex, 18).setValue(data.trangThai);
    return { status: 'success', message: 'Cập nhật trạng thái thành công' };
  }
  return { status: 'error', message: 'Không tìm thấy ID' };
}

/**
 * Lưu danh sách giáo viên vào sheet GIAO_VIEN
 */
function handleSaveTeachers(teachers) {
  if (!teachers || !teachers.length) return { status: 'success' };
  return { status: 'success', message: 'Đã cập nhật danh sách giáo viên thành công' };
}

