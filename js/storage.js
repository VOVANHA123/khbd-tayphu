/**
 * =========================================================================
 * STORAGE.JS - QUẢN LÝ DỮ LIỆU, XÁC THỰC & STATE
 * =========================================================================
 */

/**
 * Chuẩn hóa Tiết PPCT dạng số thuần túy (Ví dụ: "1, 2, 3", "1, 2", "7")
 * Xử lý triệt để lỗi Google Sheets tự động ép kiểu các dải số như 5-6, 1-2 thành Date/Time
 */
function cleanTietPPCT(raw) {
  if (!raw && raw !== 0) return '';
  let str = String(raw).trim();
  if (!str) return '';

  // 1. Xử lý trường hợp chuỗi ngày/giờ do Google Sheets tự chuyển đổi
  if (
    str.includes('GMT') || 
    str.includes('Giờ') || 
    str.includes('00:00:00') || 
    /^[A-Z][a-z]{2}\s[A-Z][a-z]{2}\s\d{1,2}\s\d{4}/.test(str) ||
    /^\d{4}-\d{2}-\d{2}/.test(str)
  ) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const day = d.getDate();
        const month = d.getMonth() + 1;
        if (day > 0 && month > 0) {
          const min = Math.min(day, month);
          const max = Math.max(day, month);
          if (min === max) {
            str = String(min);
          } else if ((max - min) <= 5) {
            const arr = [];
            for (let i = min; i <= max; i++) arr.push(i);
            str = arr.join(', ');
          } else {
            str = `${min}, ${max}`;
          }
        }
      }
    } catch (e) {}
  }

  // 2. Bỏ các tiền tố như "Tiết", "tiết", "T." nếu có
  str = str.replace(/^(tiết|tiet|t\.)\s*:?/i, '').trim();

  // 3. Chuẩn hóa các từ nối
  str = str.replace(/\s*(đến|den|to)\s*/gi, '-');
  str = str.replace(/\s*(và|va|and|\+)\s*/gi, ', ');

  // 4. Chuẩn hóa dải số dạng "1-3" -> "1, 2, 3" hoặc "1 - 2" -> "1, 2"
  const rangeMatch = str.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    if (!isNaN(start) && !isNaN(end) && start < end && (end - start) <= 10) {
      const arr = [];
      for (let i = start; i <= end; i++) arr.push(i);
      str = arr.join(', ');
    } else {
      str = `${start}, ${end}`;
    }
  } else {
    // Chuẩn hóa dấu phẩy / chấm phẩy
    str = str.replace(/[,;./\\]+/g, ', ')
             .replace(/\s+/g, ' ')
             .replace(/\s*,\s*/g, ', ')
             .trim();
  }

  return str;
}
window.cleanTietPPCT = cleanTietPPCT;

window.AppStorage = (function() {
  const KEYS = window.APP_CONFIG.STORAGE_KEYS;

  // Khởi tạo state mặc định
  function getInitialState() {
    return {
      users: window.APP_CONFIG.USERS,
      departments: window.APP_CONFIG.DEPARTMENTS,
      plans: window.APP_CONFIG.INITIAL_PLANS,
      lastUpdated: new Date().toISOString()
    };
  }

  // Lấy toàn bộ state
  function getState() {
    try {
      const raw = localStorage.getItem(KEYS.APP_STATE);
      if (!raw) {
        const initial = getInitialState();
        saveState(initial);
        return initial;
      }
      const parsed = JSON.parse(raw);
      if (!parsed.users || parsed.users.length < 10 || !parsed.users.some(u => u.username === 'nguyenthiphuochoai')) {
        const initial = getInitialState();
        saveState(initial);
        return initial;
      }

      let stateNeedsSave = false;

      // Đảm bảo luôn có tài khoản Quản trị viên (Admin)
      if (!parsed.users.some(u => u.username.toLowerCase() === 'admin')) {
        const adminAcc = (window.APP_CONFIG && window.APP_CONFIG.USERS && window.APP_CONFIG.USERS.find(u => u.username === 'admin')) || {
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
        };
        parsed.users.unshift(adminAcc);
        stateNeedsSave = true;
      }

      // Đảm bảo danh mục tổ chuyên môn
      if (!parsed.departments || !Array.isArray(parsed.departments) || parsed.departments.length === 0) {
        parsed.departments = (window.APP_CONFIG && window.APP_CONFIG.DEPARTMENTS) ? JSON.parse(JSON.stringify(window.APP_CONFIG.DEPARTMENTS)) : [];
        stateNeedsSave = true;
      }

      // Cập nhật và chuẩn hóa tietPPCT dạng số thuần túy (VD: "1, 2, 3", "7") cho các kế hoạch
      if (parsed.plans && Array.isArray(parsed.plans)) {
        parsed.plans.forEach(p => {
          if (!p.tietPPCT) {
            const initP = window.APP_CONFIG && window.APP_CONFIG.INITIAL_PLANS && window.APP_CONFIG.INITIAL_PLANS.find(ip => ip.id === p.id);
            if (initP && initP.tietPPCT) {
              p.tietPPCT = initP.tietPPCT;
              stateNeedsSave = true;
            }
          }
          // Chuẩn hóa loại bỏ định dạng ngày giờ và tiền tố thừa
          const cleaned = cleanTietPPCT(p.tietPPCT);
          if (cleaned !== p.tietPPCT) {
            p.tietPPCT = cleaned;
            stateNeedsSave = true;
          }
        });
      }

      // Tự động dọn dẹp các link demo giả mạo cũ để tránh lỗi "Rất tiếc, tệp không tồn tại"
      if (parsed.plans && Array.isArray(parsed.plans)) {
        parsed.plans.forEach(p => {
          if (p.driveViewUrl && (p.driveViewUrl.includes('demo') || p.driveViewUrl.includes('/u/1/'))) {
            p.driveViewUrl = '';
            stateNeedsSave = true;
          }
        });
      }

      if (stateNeedsSave) {
        saveState(parsed);
      }

      return parsed;
    } catch (e) {
      console.warn('Lỗi đọc localStorage, sử dụng dữ liệu mặc định:', e);
      return getInitialState();
    }
  }

  // Lưu state
  function saveState(state) {
    try {
      state.lastUpdated = new Date().toISOString();
      localStorage.setItem(KEYS.APP_STATE, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent('khbd:state-changed', { detail: state }));
    } catch (e) {
      console.error('Không thể lưu vào localStorage:', e);
    }
  }

  // Quản lý Người dùng Hiện tại (Session)
  function getCurrentUser() {
    const userId = localStorage.getItem(KEYS.CURRENT_USER);
    const state = getState();
    if (userId) {
      const user = state.users.find(u => u.id === userId);
      if (user) return user;
    }
    return null; // Trả về null nếu chưa đăng nhập
  }

  function setCurrentUser(userId) {
    if (userId) {
      localStorage.setItem(KEYS.CURRENT_USER, userId);
      window.dispatchEvent(new CustomEvent('khbd:user-changed', { detail: getCurrentUser() }));
    } else {
      localStorage.removeItem(KEYS.CURRENT_USER);
    }
  }

  function isLoggedIn() {
    return getCurrentUser() !== null;
  }

  // Xác thực Đăng nhập (Username + Password)
  function login(username, password) {
    const state = getState();
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    const matched = state.users.find(u => {
      const matchUser = (u.username.toLowerCase() === cleanUser) || 
                        (u.username === 'nguyenthithuha' && cleanUser === 'nguyenthithuah');
      return matchUser && String(u.password) === cleanPass;
    });

    if (matched) {
      setCurrentUser(matched.id);
      return { success: true, user: matched };
    }
    return { success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác!' };
  }

  function getUserByUsername(username) {
    const state = getState();
    const clean = (username || '').trim().toLowerCase();
    return state.users.find(u => u.username.toLowerCase() === clean);
  }

  // Xác thực Đăng nhập trực tuyến nếu mật khẩu cục bộ chưa khớp (vừa đổi trên thiết bị khác)
  async function loginWithOnlineCheck(username, password) {
    const localRes = login(username, password);
    if (localRes.success) return localRes;

    const gasUrl = getGasUrl();
    if (gasUrl && window.DriveAPI && window.DriveAPI.verifyLoginCloud) {
      try {
        const onlineRes = await window.DriveAPI.verifyLoginCloud(username, password);
        if (onlineRes && onlineRes.status === 'success' && onlineRes.valid && onlineRes.account) {
          const state = getState();
          const cleanU = (username || '').trim().toLowerCase();
          let matched = state.users.find(u => u.username.toLowerCase() === cleanU || u.id === onlineRes.account.id);
          if (matched) {
            matched.password = String(onlineRes.account.password);
            saveState(state);
            setCurrentUser(matched.id);
            return { success: true, user: matched };
          }
        } else if (onlineRes && onlineRes.status === 'error') {
          return { success: false, message: onlineRes.message || 'Mật khẩu không chính xác!' };
        }
      } catch (err) {
        console.warn('Không thể kiểm tra online:', err);
      }
    }

    return localRes;
  }

  // Đăng xuất (Xóa phiên và bắn event quay về màn hình đăng nhập)
  function logout() {
    localStorage.removeItem(KEYS.CURRENT_USER);
    window.dispatchEvent(new CustomEvent('khbd:user-logout'));
  }

  // Đổi mật khẩu cá nhân (Tự động đồng bộ lên Google Sheets cho mọi thiết bị)
  async function changePassword(userId, oldPassword, newPassword) {
    const state = getState();
    const user = state.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('Không tìm thấy tài khoản người dùng!');
    }

    if (String(user.password) !== String(oldPassword).trim()) {
      throw new Error('Mật khẩu hiện tại không chính xác!');
    }

    if (!newPassword || newPassword.trim().length < 3) {
      throw new Error('Mật khẩu mới phải có ít nhất 3 ký tự!');
    }

    const cleanPass = newPassword.trim();
    user.password = cleanPass;
    saveState(state);

    // Đồng bộ lên Google Sheets ngay lập tức
    if (window.DriveAPI && window.DriveAPI.changePassword) {
      try {
        await window.DriveAPI.changePassword(user.id, cleanPass, user.username);
      } catch (e) {
        console.warn('Lỗi đồng bộ mật khẩu lên đám mây:', e);
      }
    }

    return { success: true, message: 'Đổi mật khẩu thành công và đã đồng bộ lên tất cả các thiết bị!' };
  }

  // Đặt lại mật khẩu (Dành cho Quản trị viên / Tổ trưởng - Đồng bộ đám mây)
  async function resetPassword(userId, newPassword) {
    const state = getState();
    const user = state.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('Không tìm thấy tài khoản giáo viên!');
    }

    if (!newPassword || newPassword.trim().length < 3) {
      throw new Error('Mật khẩu mới phải có ít nhất 3 ký tự!');
    }

    const cleanPass = newPassword.trim();
    user.password = cleanPass;
    saveState(state);

    // Đồng bộ lên Google Sheets
    if (window.DriveAPI && window.DriveAPI.changePassword) {
      try {
        await window.DriveAPI.changePassword(user.id, cleanPass, user.username);
      } catch (e) {
        console.warn('Lỗi đồng bộ đặt lại mật khẩu:', e);
      }
    }

    return { success: true, message: `Đã đặt lại mật khẩu cho giáo viên ${user.name} và đồng bộ lên đám mây thành công!` };
  }

  // Kiểm tra quyền Quản trị viên (Admin)
  function isAdmin(user) {
    if (!user) user = getCurrentUser();
    if (!user) return false;
    return user.role === 'ADMIN' || user.username.toLowerCase() === 'admin';
  }

  // Lấy danh sách Tổ chuyên môn
  function getDepartments() {
    const state = getState();
    return state.departments || window.APP_CONFIG.DEPARTMENTS || [];
  }

  // Thêm Tổ chuyên môn mới (Chỉ Admin)
  function addDepartment(deptData) {
    const currentUser = getCurrentUser();
    if (!isAdmin(currentUser)) {
      throw new Error('Chỉ tài khoản Quản trị viên (Admin) mới có quyền tạo Tổ chuyên môn!');
    }

    const state = getState();
    if (!state.departments) {
      state.departments = JSON.parse(JSON.stringify(window.APP_CONFIG.DEPARTMENTS || []));
    }

    const name = (deptData.name || '').trim();
    if (!name) {
      throw new Error('Vui lòng nhập tên Tổ chuyên môn!');
    }

    const dup = state.departments.find(d => d.name.toLowerCase() === name.toLowerCase());
    if (dup) {
      throw new Error(`Tổ chuyên môn "${name}" đã tồn tại!`);
    }

    let code = (deptData.code || '').trim().toUpperCase();
    if (!code) {
      code = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    }
    const newId = 'To_' + Date.now().toString().slice(-6);

    const newDept = {
      id: newId,
      name: name,
      code: code,
      leaderId: deptData.leaderId || null,
      leaderName: (deptData.leaderName || '').trim() || 'Chưa phân công',
      viceLeaderId: null,
      viceLeaderName: null
    };

    state.departments.push(newDept);
    saveState(state);
    return newDept;
  }

  // Xóa Tổ chuyên môn (Chỉ Admin)
  function deleteDepartment(deptId) {
    const currentUser = getCurrentUser();
    if (!isAdmin(currentUser)) {
      throw new Error('Chỉ tài khoản Quản trị viên (Admin) mới có quyền xóa Tổ chuyên môn!');
    }

    const state = getState();
    if (!state.departments) {
      state.departments = JSON.parse(JSON.stringify(window.APP_CONFIG.DEPARTMENTS || []));
    }

    const index = state.departments.findIndex(d => d.id === deptId);
    if (index === -1) {
      throw new Error('Không tìm thấy Tổ chuyên môn cần xóa!');
    }

    const targetDept = state.departments[index];
    // Kiểm tra xem có giáo viên nào đang thuộc tổ này không
    const teachersInDept = (state.users || []).filter(u => u.departmentId === deptId);
    if (teachersInDept.length > 0) {
      throw new Error(`Không thể xóa "${targetDept.name}" vì đang có ${teachersInDept.length} giáo viên thuộc tổ! Vui lòng chuyển giáo viên sang tổ khác trước.`);
    }

    const deleted = state.departments.splice(index, 1)[0];
    saveState(state);
    return deleted;
  }

  // Thêm tài khoản Giáo viên mới (Chỉ Admin)
  function addTeacher(teacherData) {
    const currentUser = getCurrentUser();
    if (!isAdmin(currentUser)) {
      throw new Error('Chỉ tài khoản Quản trị viên (Admin) mới có quyền thêm tài khoản giáo viên!');
    }

    const state = getState();
    const cleanUser = (teacherData.username || '').trim().toLowerCase();

    const existing = state.users.find(u => u.username.toLowerCase() === cleanUser);
    if (existing) {
      throw new Error(`Tên đăng nhập "${cleanUser}" đã được sử dụng! Vui lòng chọn tên khác.`);
    }

    const newId = 'GV_' + Date.now().toString().slice(-6);
    let roleLabel = 'Giáo viên bộ môn';
    if (teacherData.role === 'ADMIN') roleLabel = 'Quản trị viên hệ thống';
    else if (teacherData.role === 'TO_TRUONG') roleLabel = 'Tổ trưởng chuyên môn';
    else if (teacherData.role === 'TO_PHO') roleLabel = 'Tổ phó chuyên môn';
    else if (teacherData.role === 'BGH') roleLabel = 'Ban Giám Hiệu';

    const newTeacher = {
      id: newId,
      username: cleanUser,
      password: teacherData.password || '123',
      name: teacherData.name.trim(),
      email: teacherData.email || `${cleanUser}@tayphu.edu.vn`,
      phone: teacherData.phone || '',
      role: teacherData.role || 'GIAO_VIEN',
      roleLabel: roleLabel,
      departmentId: teacherData.departmentId || 'To_KHTN_CN',
      departmentName: teacherData.departmentName || 'Tổ Khoa học Tự nhiên - Công nghệ',
      subjects: teacherData.subjects ? teacherData.subjects.split(',').map(s => s.trim()) : ['Khoa học tự nhiên'],
      avatar: teacherData.role === 'ADMIN' ? '⚙️' : (teacherData.role === 'BGH' ? '🎓' : (teacherData.role === 'TO_TRUONG' || teacherData.role === 'TO_PHO' ? '👨‍💼' : '👩‍🏫')),
      createdAt: new Date().toISOString()
    };

    state.users.push(newTeacher);
    saveState(state);
    return newTeacher;
  }

  // Xóa tài khoản Giáo viên (Chỉ Admin)
  function deleteTeacher(userId) {
    const currentUser = getCurrentUser();
    if (!isAdmin(currentUser)) {
      throw new Error('Chỉ tài khoản Quản trị viên (Admin) mới có quyền xóa tài khoản giáo viên!');
    }

    if (currentUser && currentUser.id === userId) {
      throw new Error('Bạn không thể tự xóa tài khoản đang đăng nhập của chính mình!');
    }

    const state = getState();
    const index = state.users.findIndex(u => u.id === userId);
    if (index === -1) {
      throw new Error('Không tìm thấy tài khoản giáo viên cần xóa.');
    }

    const deletedUser = state.users.splice(index, 1)[0];
    saveState(state);
    return deletedUser;
  }

  // Chuẩn hóa Kế hoạch bài dạy: đảm bảo toBoMonId & toBoMonTen luôn tồn tại và chính xác
  function normalizePlan(plan, existingLocal) {
    if (!plan) return plan;
    let deptId = plan.toBoMonId || (existingLocal && existingLocal.toBoMonId);
    let deptName = plan.toBoMonTen || (existingLocal && existingLocal.toBoMonTen);

    // 1. Tra cứu theo Tác giả từ danh sách Giáo viên
    if (!deptId && (plan.tacGiaId || plan.tacGiaTen)) {
      const allUsers = (getState().users) || (window.APP_CONFIG && window.APP_CONFIG.USERS) || [];
      const author = allUsers.find(u => 
        (plan.tacGiaId && u.id === plan.tacGiaId) || 
        (plan.tacGiaTen && u.name.trim().toLowerCase() === plan.tacGiaTen.trim().toLowerCase())
      );
      if (author) {
        deptId = author.departmentId;
        if (!deptName) deptName = author.departmentName;
      }
    }

    // 2. Tra cứu theo Môn học chuyên môn
    if (!deptId && plan.monHoc) {
      const khtnSubjects = ['Khoa học tự nhiên', 'Vật lí', 'Hóa học', 'Sinh học', 'Công nghệ', 'Hoạt động trải nghiệm hướng nghiệp'];
      const khxhSubjects = ['Ngữ văn', 'Lịch sử và Địa lí', 'Tiếng Anh', 'GDCD', 'Âm nhạc', 'Mĩ thuật', 'GDTC'];
      const toanTinSubjects = ['Toán học', 'Tin học'];

      if (khtnSubjects.includes(plan.monHoc)) {
        deptId = 'To_KHTN_CN';
        deptName = 'Tổ Khoa học Tự nhiên - Công nghệ';
      } else if (khxhSubjects.includes(plan.monHoc)) {
        deptId = 'To_KHXH';
        deptName = 'Tổ Khoa học Xã hội';
      } else if (toanTinSubjects.includes(plan.monHoc)) {
        deptId = 'To_Toan_Tin';
        deptName = 'Tổ Toán - Tin học';
      }
    }

    // 3. Fallback mặc định theo tổ KHTN-CN của trường
    if (!deptId) deptId = 'To_KHTN_CN';
    if (!deptName) deptName = 'Tổ Khoa học Tự nhiên - Công nghệ';

    return {
      ...plan,
      tietPPCT: cleanTietPPCT(plan.tietPPCT || (existingLocal && existingLocal.tietPPCT) || ''),
      toBoMonId: deptId,
      toBoMonTen: deptName,
      fileBase64: (existingLocal && existingLocal.fileBase64) || plan.fileBase64 || null,
      fileMimeType: (existingLocal && existingLocal.fileMimeType) || plan.fileMimeType || null
    };
  }

  // Thao tác với Kế hoạch bài dạy (KHBD)
  function getPlans() {
    const rawPlans = getState().plans || [];
    return rawPlans.map(p => normalizePlan(p));
  }

  function getPlanById(id) {
    const plans = getPlans();
    return plans.find(p => p.id === id);
  }

  function addOrUpdatePlan(plan) {
    const state = getState();
    const existing = state.plans.find(p => p.id === plan.id);
    const normalized = normalizePlan(plan, existing);
    const idx = state.plans.findIndex(p => p.id === plan.id);
    if (idx >= 0) {
      state.plans[idx] = { ...state.plans[idx], ...normalized };
    } else {
      state.plans.unshift(normalized);
    }
    saveState(state);
    return normalized;
  }

  // Xóa 1 Kế hoạch bài dạy (Giáo viên hoặc Tổ trưởng xóa bài)
  function deletePlan(planId) {
    const state = getState();
    const idx = state.plans.findIndex(p => p.id === planId);
    if (idx === -1) {
      throw new Error('Không tìm thấy Kế hoạch bài dạy cần xóa.');
    }

    const deletedPlan = state.plans.splice(idx, 1)[0];
    saveState(state);
    return deletedPlan;
  }

  // Xóa toàn bộ Kế hoạch bài dạy (Bắt đầu nộp mới từ đầu)
  function clearAllPlans() {
    const state = getState();
    state.plans = [];
    saveState(state);
    return true;
  }

  function reviewPlan(planId, reviewData) {
    const state = getState();
    const idx = state.plans.findIndex(p => p.id === planId);
    if (idx >= 0) {
      state.plans[idx].trangThai = reviewData.trangThai;
      state.plans[idx].danhGia = {
        nguoiDuyetId: reviewData.nguoiDuyetId,
        nguoiDuyetTen: reviewData.nguoiDuyetTen,
        vaiTroDuyet: reviewData.vaiTroDuyet,
        ngayDuyet: new Date().toISOString(),
        tongDiem: reviewData.tongDiem,
        nhanXetChung: reviewData.nhanXetChung,
        scores: reviewData.scores,
        chuKyXacNhan: reviewData.chuKyXacNhan
      };
      saveState(state);
      return state.plans[idx];
    }
    return null;
  }

  function resetDemo() {
    const fresh = getInitialState();
    saveState(fresh);
    return fresh;
  }

  // Quản lý URL Google Apps Script (Hỗ trợ URL mặc định toàn trường)
  function getGasUrl() {
    return localStorage.getItem(KEYS.GAS_URL) || (window.APP_CONFIG && window.APP_CONFIG.DEFAULT_GAS_URL) || '';
  }

  function setGasUrl(url) {
    const clean = (url || '').trim();
    localStorage.setItem(KEYS.GAS_URL, clean);
    if (window.APP_CONFIG) {
      window.APP_CONFIG.DEFAULT_GAS_URL = clean;
    }
  }

  // Đồng bộ dữ liệu Kế hoạch bài dạy & Đánh giá từ Google Sheets theo thời gian thực
  function syncFromCloud(cloudData) {
    if (!cloudData) return false;
    const state = getState();
    let changed = false;

    // 1. Đồng bộ Kế hoạch bài dạy
    if (cloudData.plans && Array.isArray(cloudData.plans)) {
      const cloudMap = {};
      cloudData.plans.forEach(p => { cloudMap[p.id] = p; });

      const mergedPlans = cloudData.plans.map(cp => {
        const local = (state.plans || []).find(lp => lp.id === cp.id);
        return normalizePlan(cp, local);
      });

      // Giữ lại bài nộp cục bộ thật mới nộp (trong 2 phút) nếu Google Sheets đang xử lý
      const now = Date.now();
      (state.plans || []).forEach(lp => {
        if (!cloudMap[lp.id]) {
          // Bỏ qua các kế hoạch demo mẫu có sẵn
          if (lp.id && (lp.id.startsWith('KHBD_DEMO') || lp.id.startsWith('KHBD_0'))) {
            return;
          }
          const planTime = new Date(lp.ngayNop || 0).getTime();
          if (now - planTime < 120000) {
            mergedPlans.push(normalizePlan(lp));
          }
        }
      });

      // So sánh để phát hiện thay đổi
      if (JSON.stringify(state.plans) !== JSON.stringify(mergedPlans)) {
        state.plans = mergedPlans;
        changed = true;
      }
    }

    // 2. Đồng bộ Tài khoản & Mật khẩu từ Google Sheets (Hỗ trợ đổi mật khẩu giữa các máy)
    if (cloudData.accounts && Array.isArray(cloudData.accounts) && cloudData.accounts.length > 0) {
      cloudData.accounts.forEach(acc => {
        if (!acc.username && !acc.id) return;
        const cleanU = (acc.username || '').toLowerCase().trim();
        const u = state.users.find(user => 
          (acc.id && user.id === acc.id) || 
          (cleanU && user.username.toLowerCase() === cleanU)
        );
        if (u && acc.password && String(u.password) !== String(acc.password)) {
          u.password = String(acc.password);
          changed = true;
        }
      });
    }

    if (changed) {
      saveState(state);
    }
    return changed;
  }

  function getMode() {
    return localStorage.getItem(KEYS.ACTIVE_MODE) || (getGasUrl() ? 'LIVE' : 'DEMO');
  }

  function setMode(mode) {
    localStorage.setItem(KEYS.ACTIVE_MODE, mode);
  }

  return {
    getState,
    saveState,
    getCurrentUser,
    setCurrentUser,
    isLoggedIn,
    login,
    loginWithOnlineCheck,
    getUserByUsername,
    logout,
    changePassword,
    resetPassword,
    isAdmin,
    getDepartments,
    addDepartment,
    deleteDepartment,
    addTeacher,
    deleteTeacher,
    getGasUrl,
    setGasUrl,
    syncFromCloud,
    getMode,
    setMode,
    getPlans,
    getPlanById,
    addOrUpdatePlan,
    deletePlan,
    clearAllPlans,
    reviewPlan,
    resetDemo
  };
})();
