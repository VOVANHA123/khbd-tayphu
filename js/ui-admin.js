/**
 * =========================================================================
 * UI-ADMIN.JS - GIAO DIỆN QUẢN TRỊ, BÁO CÁO TOÀN TRƯỜNG & QUẢN LÝ GIÁO VIÊN
 * =========================================================================
 */

window.UIAdmin = (function() {
  let currentResetTeacherId = null;

  function renderAdminDashboard() {
    const plans = window.AppStorage.getPlans();
    const state = window.AppStorage.getState();
    const departments = (window.AppStorage.getDepartments ? window.AppStorage.getDepartments() : state.departments) || window.APP_CONFIG.DEPARTMENTS;
    const teachers = state.users || window.APP_CONFIG.USERS;
    const currentUser = window.AppStorage.getCurrentUser();
    const isAdmin = window.AppStorage.isAdmin ? window.AppStorage.isAdmin(currentUser) : (currentUser && (currentUser.role === 'ADMIN' || currentUser.username === 'admin'));

    // 1. Thống kê cấp trường
    const totalSubmitted = plans.length;
    const totalApproved = plans.filter(p => p.trangThai === 'DA_DUYET').length;
    const totalPending = plans.filter(p => p.trangThai === 'CHO_DUYET').length;
    const totalRevision = plans.filter(p => p.trangThai === 'CAN_SUA').length;
    const approvalRate = totalSubmitted > 0 ? Math.round((totalApproved / totalSubmitted) * 100) : 0;

    const elTotal = document.getElementById('admin-stat-total');
    const elApproved = document.getElementById('admin-stat-approved');
    const elPending = document.getElementById('admin-stat-pending');
    const elRevision = document.getElementById('admin-stat-revision');
    const elRate = document.getElementById('admin-stat-rate');

    if (elTotal) elTotal.innerText = totalSubmitted;
    if (elApproved) elApproved.innerText = totalApproved;
    if (elPending) elPending.innerText = totalPending;
    if (elRevision) elRevision.innerText = totalRevision;
    if (elRate) elRate.innerText = `${approvalRate}%`;

    // 2. Bảng tiến độ theo Tổ bộ môn
    renderDepartmentProgressTable(departments, plans, isAdmin);

    // 3. Phân quyền: CHỈ ADMIN MỚI XEM VÀ QUẢN LÝ CẤU TRÚC DRIVE & DANH SÁCH GIÁO VIÊN
    const treeContainer = document.getElementById('admin-drive-tree-container');
    const deptContainer = document.getElementById('admin-dept-progress-container');
    const teachersContainer = document.getElementById('admin-teacher-management-container');
    const addTeacherBtnTop = document.getElementById('admin-btn-add-teacher-top');
    const addDeptBtn = document.getElementById('btn-admin-add-dept');

    if (isAdmin) {
      if (treeContainer) treeContainer.style.display = 'flex';
      if (deptContainer) {
        deptContainer.classList.remove('lg:col-span-12');
        deptContainer.classList.add('lg:col-span-7');
      }
      if (teachersContainer) teachersContainer.style.display = 'block';
      if (addTeacherBtnTop) addTeacherBtnTop.style.display = 'inline-flex';
      if (addDeptBtn) addDeptBtn.style.display = 'inline-flex';

      // Sơ đồ cây thư mục Drive
      renderDriveFolderTree(plans);

      // Quản lý Tài khoản Giáo viên (Thêm, Xóa, Đổi mật khẩu)
      renderTeachersManagementTable(teachers, plans);
    } else {
      if (treeContainer) treeContainer.style.display = 'none';
      if (deptContainer) {
        deptContainer.classList.remove('lg:col-span-7');
        deptContainer.classList.add('lg:col-span-12');
      }
      if (teachersContainer) teachersContainer.style.display = 'none';
      if (addTeacherBtnTop) addTeacherBtnTop.style.display = 'none';
      if (addDeptBtn) addDeptBtn.style.display = 'none';
    }
  }

  function renderDepartmentProgressTable(departments, plans, isAdmin) {
    const tbody = document.getElementById('admin-dept-tbody');
    const actionThs = document.querySelectorAll('.admin-dept-action-th');
    actionThs.forEach(th => { th.style.display = isAdmin ? '' : 'none'; });

    if (!tbody) return;

    tbody.innerHTML = departments.map(d => {
      const deptPlans = plans.filter(p => p.toBoMonId === d.id || (p.toBoMonTen && d.name && p.toBoMonTen.toLowerCase().includes(d.name.toLowerCase())));
      const approvedCount = deptPlans.filter(p => p.trangThai === 'DA_DUYET').length;
      const pendingCount = deptPlans.filter(p => p.trangThai === 'CHO_DUYET').length;
      const percent = deptPlans.length > 0 ? Math.round((approvedCount / deptPlans.length) * 100) : 0;

      return `
        <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
          <td class="px-4 py-3 font-semibold text-slate-800 text-sm">
            ${d.name}
            ${d.code ? `<span class="ml-1 text-[10px] text-slate-400 font-mono font-normal">(${d.code})</span>` : ''}
          </td>
          <td class="px-4 py-3 text-xs text-slate-600">
            <div><strong>Tổ trưởng:</strong> ${d.leaderName || 'Chưa phân công'}</div>
            ${d.viceLeaderName ? `<div class="text-slate-500 text-[11px]"><strong>Tổ phó:</strong> ${d.viceLeaderName}</div>` : ''}
          </td>
          <td class="px-4 py-3 text-center text-xs font-bold text-slate-700">
            ${deptPlans.length} bài
          </td>
          <td class="px-4 py-3 text-center text-xs font-semibold text-emerald-600">
            ${approvedCount}
          </td>
          <td class="px-4 py-3 text-center text-xs font-semibold text-amber-600">
            ${pendingCount}
          </td>
          <td class="px-4 py-3">
            <div class="flex items-center gap-2">
              <div class="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div class="bg-blue-600 h-2 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
              </div>
              <span class="text-xs font-bold font-mono text-slate-600 w-9 text-right">${percent}%</span>
            </div>
          </td>
          ${isAdmin ? `
            <td class="px-4 py-3 text-right">
              <button onclick="window.UIAdmin.confirmDeleteDepartment('${d.id}', '${(d.name || '').replace(/'/g, "\\'")}')" class="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition" title="Xóa tổ chuyên môn này">
                🗑️ Xóa
              </button>
            </td>
          ` : ''}
        </tr>
      `;
    }).join('');
  }

  function renderDriveFolderTree(plans) {
    const treeContainer = document.getElementById('admin-drive-tree-view');
    if (!treeContainer) return;

    const year = window.APP_CONFIG.ACADEMIC_YEAR.replace(/[^0-9]/g, '_');
    const rootName = `KHBD_NamHoc_${year}`;

    // Nhóm theo Tổ -> Giáo viên -> Tuần
    const tree = {};
    plans.forEach(p => {
      const dept = p.toBoMonTen || 'To_Bo_Mon';
      const teacher = p.tacGiaTen || 'Giao_Vien';
      const week = `Tuan_${p.tuan < 10 ? '0' + p.tuan : p.tuan}`;

      if (!tree[dept]) tree[dept] = {};
      if (!tree[dept][teacher]) tree[dept][teacher] = {};
      if (!tree[dept][teacher][week]) tree[dept][teacher][week] = [];
      tree[dept][teacher][week].push(p);
    });

    let html = `
      <div class="folder-tree text-xs text-slate-700 font-mono">
        <div class="font-bold text-blue-700 flex items-center gap-1.5 py-1">
          📁 ${rootName} (Thư mục gốc Drive trường)
        </div>
        <ul>
    `;

    Object.keys(tree).forEach(dept => {
      html += `
        <li>
          <div class="font-semibold text-slate-800 flex items-center gap-1.5">
            📂 ${dept}
          </div>
          <ul>
      `;
      Object.keys(tree[dept]).forEach(teacher => {
        html += `
          <li>
            <div class="font-medium text-slate-700 flex items-center gap-1.5">
              👤 GV_${teacher.replace(/\s+/g, '_')}
            </div>
            <ul>
        `;
        Object.keys(tree[dept][teacher]).forEach(week => {
          const files = tree[dept][teacher][week];
          html += `
            <li>
              <div class="text-slate-600 flex items-center gap-1.5">
                📁 ${week}
              </div>
              <ul>
                ${files.map(f => `
                  <li class="flex items-center gap-2 py-0.5">
                    <span class="text-slate-800 hover:text-blue-700 cursor-pointer flex items-center gap-1 font-medium text-xs" onclick="window.AppViewer.previewPlan('${f.id}')">
                      📄 ${f.fileName} <span class="text-[11px] text-slate-500 font-normal">(${f.trangThai === 'DA_DUYET' ? 'Đã duyệt' : 'Chờ'})</span>
                    </span>
                    <button type="button" onclick="window.DriveAPI.openInGoogleDocs('${f.id}')" class="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 transition" title="Mở trực tiếp trên Google Docs">
                      📝 Docs ↗
                    </button>
                  </li>
                `).join('')}
              </ul>
            </li>
          `;
        });
        html += `</ul></li>`;
      });
      html += `</ul></li>`;
    });

    html += `</ul></div>`;
    treeContainer.innerHTML = html;
  }

  // Quản lý Danh sách Giáo viên (Hiển thị tài khoản, mật khẩu, đổi mật khẩu, nút Xóa)
  function renderTeachersManagementTable(teachers, plans) {
    const container = document.getElementById('admin-teachers-tbody');
    if (!container) return;

    const currentUser = window.AppStorage.getCurrentUser();

    container.innerHTML = teachers.map(t => {
      const myPlans = plans.filter(p => p.tacGiaId === t.id);
      const isCurrent = currentUser && currentUser.id === t.id;

      let roleBadgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
      if (t.role === 'TO_TRUONG') roleBadgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
      else if (t.role === 'TO_PHO') roleBadgeColor = 'bg-cyan-100 text-cyan-800 border-cyan-200';
      else if (t.role === 'BGH') roleBadgeColor = 'bg-purple-100 text-purple-800 border-purple-200';

      return `
        <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100 ${isCurrent ? 'bg-blue-50/40' : ''}">
          <td class="px-4 py-3">
            <div class="flex items-center gap-2.5">
              <span class="text-xl">${t.avatar || '👨‍🏫'}</span>
              <div>
                <div class="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  ${t.name}
                  ${isCurrent ? '<span class="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-bold">Đang dùng</span>' : ''}
                </div>
                <div class="text-[11px] text-slate-400 font-mono">${t.email || t.username + '@tayphu.edu.vn'}</div>
              </div>
            </div>
          </td>
          <td class="px-4 py-3">
            <div class="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded inline-block">
              ${t.username}
            </div>
          </td>
          <td class="px-4 py-3">
            <div class="flex items-center gap-1.5">
              <span class="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200" id="pass-display-${t.id}">
                ••••••
              </span>
              <button onclick="window.UIAdmin.togglePasswordVisibility('${t.id}', '${t.password}')" class="text-slate-400 hover:text-slate-700 text-xs p-1" title="Hiện/ẩn mật khẩu">
                👁️
              </button>
            </div>
          </td>
          <td class="px-4 py-3 text-xs text-slate-600">
            ${t.departmentName}
          </td>
          <td class="px-4 py-3 text-xs">
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleBadgeColor}">
              ${t.roleLabel}
            </span>
          </td>
          <td class="px-4 py-3 text-center text-xs font-bold text-slate-700">
            ${myPlans.length} bài
          </td>
          <td class="px-4 py-3 text-right whitespace-nowrap">
            <div class="flex items-center justify-end gap-1.5">
              <button onclick="window.UIAdmin.openResetPasswordModal('${t.id}', '${t.name}', '${t.username}')" class="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold border border-amber-200 transition" title="Đặt lại mật khẩu cho giáo viên này">
                🔑 Đổi MK
              </button>
              ${!isCurrent ? `
                <button onclick="window.UIAdmin.confirmDeleteTeacher('${t.id}', '${t.name}', '${t.username}')" class="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition" title="Xóa tài khoản này">
                  🗑️ Xóa
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function togglePasswordVisibility(userId, pass) {
    const el = document.getElementById(`pass-display-${userId}`);
    if (!el) return;
    if (el.innerText === '••••••') {
      el.innerText = pass;
    } else {
      el.innerText = '••••••';
    }
  }

  // ================= QUẢN LÝ TỔ CHUYÊN MÔN (CHỈ ADMIN) =================
  function openAddDepartmentModal() {
    const user = window.AppStorage.getCurrentUser();
    const isAdmin = window.AppStorage.isAdmin ? window.AppStorage.isAdmin(user) : (user && (user.role === 'ADMIN' || user.username === 'admin'));
    if (!isAdmin) {
      alert('Chỉ tài khoản Quản trị viên (Admin) mới có quyền tạo Tổ chuyên môn!');
      return;
    }

    const form = document.getElementById('form-add-department');
    if (form) form.reset();
    const modal = document.getElementById('modal-add-department');
    if (modal) modal.classList.add('active');
  }

  function closeAddDepartmentModal() {
    const modal = document.getElementById('modal-add-department');
    if (modal) modal.classList.remove('active');
  }

  function handleAddDepartmentSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('new-dept-name').value.trim();
    const code = document.getElementById('new-dept-code').value.trim();
    const leaderName = document.getElementById('new-dept-leader').value.trim();

    if (!name) {
      alert('Vui lòng nhập tên Tổ chuyên môn!');
      return;
    }

    try {
      const added = window.AppStorage.addDepartment({ name, code, leaderName });
      closeAddDepartmentModal();
      window.AppToast.show(`Đã tạo thành công Tổ chuyên môn: <b>${added.name}</b>`, 'success');
      renderAdminDashboard();
    } catch (err) {
      alert(err.message);
    }
  }

  function confirmDeleteDepartment(deptId, deptName) {
    const user = window.AppStorage.getCurrentUser();
    const isAdmin = window.AppStorage.isAdmin ? window.AppStorage.isAdmin(user) : (user && (user.role === 'ADMIN' || user.username === 'admin'));
    if (!isAdmin) {
      alert('Chỉ tài khoản Quản trị viên (Admin) mới có quyền xóa Tổ chuyên môn!');
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn XÓA Tổ chuyên môn: "${deptName}"?\n\n⚠️ Lưu ý: Chỉ có thể xóa tổ khi không còn giáo viên nào thuộc tổ này.`)) {
      try {
        const deleted = window.AppStorage.deleteDepartment(deptId);
        window.AppToast.show(`Đã xóa thành công: <b>${deleted.name}</b>`, 'info');
        renderAdminDashboard();
      } catch (err) {
        alert(err.message);
      }
    }
  }

  // ================= QUẢN LÝ GIÁO VIÊN (CHỈ ADMIN) =================
  // Modal Thêm giáo viên mới
  function openAddTeacherModal() {
    const user = window.AppStorage.getCurrentUser();
    const isAdmin = window.AppStorage.isAdmin ? window.AppStorage.isAdmin(user) : (user && (user.role === 'ADMIN' || user.username === 'admin'));
    if (!isAdmin) {
      alert('Chỉ tài khoản Quản trị viên (Admin) mới có quyền thêm giáo viên!');
      return;
    }

    // Tự động nạp danh sách Tổ chuyên môn mới nhất vào dropdown
    const deptSelect = document.getElementById('new-teacher-dept');
    if (deptSelect) {
      const depts = window.AppStorage.getDepartments ? window.AppStorage.getDepartments() : (window.APP_CONFIG.DEPARTMENTS || []);
      deptSelect.innerHTML = depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    }

    const modal = document.getElementById('modal-add-teacher');
    const form = document.getElementById('form-add-teacher');
    if (form) form.reset();
    if (modal) modal.classList.add('active');
  }

  function closeAddTeacherModal() {
    const modal = document.getElementById('modal-add-teacher');
    if (modal) modal.classList.remove('active');
  }

  function handleAddTeacherSubmit(e) {
    e.preventDefault();
    const user = window.AppStorage.getCurrentUser();
    const isAdmin = window.AppStorage.isAdmin ? window.AppStorage.isAdmin(user) : (user && (user.role === 'ADMIN' || user.username === 'admin'));
    if (!isAdmin) {
      alert('Chỉ tài khoản Quản trị viên (Admin) mới có quyền thêm giáo viên!');
      return;
    }

    const name = document.getElementById('new-teacher-name').value.trim();
    const username = document.getElementById('new-teacher-username').value.trim();
    const password = document.getElementById('new-teacher-password').value.trim();
    const role = document.getElementById('new-teacher-role').value;
    const departmentId = document.getElementById('new-teacher-dept').value;
    const subjects = document.getElementById('new-teacher-subjects').value.trim();

    if (!name || !username || !password) {
      alert('Vui lòng điền đầy đủ Họ tên, Tên đăng nhập và Mật khẩu!');
      return;
    }

    const depts = window.AppStorage.getDepartments ? window.AppStorage.getDepartments() : (window.APP_CONFIG.DEPARTMENTS || []);
    const matchedDept = depts.find(d => d.id === departmentId);
    const departmentName = matchedDept ? matchedDept.name : (depts[0] ? depts[0].name : 'Tổ Khoa học Tự nhiên - Công nghệ');

    try {
      const added = window.AppStorage.addTeacher({
        name,
        username,
        password,
        role,
        departmentId,
        departmentName,
        subjects
      });

      closeAddTeacherModal();
      window.AppToast.show(`Đã thêm thành công tài khoản: <b>${added.name}</b> (${added.username})`, 'success');
      renderAdminDashboard();
      
      if (window.AppController && window.AppController.setupUserRoleSwitcher) {
        window.AppController.setupUserRoleSwitcher();
      }
    } catch (err) {
      alert(err.message);
    }
  }

  // Modal Đặt lại mật khẩu giáo viên (Reset Password)
  function openResetPasswordModal(userId, name, username) {
    const user = window.AppStorage.getCurrentUser();
    const isAdmin = window.AppStorage.isAdmin ? window.AppStorage.isAdmin(user) : (user && (user.role === 'ADMIN' || user.username === 'admin'));
    if (!isAdmin) {
      alert('Chỉ tài khoản Quản trị viên (Admin) mới có quyền đặt lại mật khẩu!');
      return;
    }

    currentResetTeacherId = userId;
    const modal = document.getElementById('modal-reset-teacher-password');
    const titleEl = document.getElementById('reset-pass-teacher-name');
    const inputEl = document.getElementById('reset-pass-new-password');
    if (titleEl) titleEl.innerText = `${name} (${username})`;
    if (inputEl) inputEl.value = '123';
    if (modal) modal.classList.add('active');
  }

  function closeResetPasswordModal() {
    const modal = document.getElementById('modal-reset-teacher-password');
    if (modal) modal.classList.remove('active');
    currentResetTeacherId = null;
  }

  function handleResetPasswordSubmit(e) {
    e.preventDefault();
    if (!currentResetTeacherId) return;

    const user = window.AppStorage.getCurrentUser();
    const isAdmin = window.AppStorage.isAdmin ? window.AppStorage.isAdmin(user) : (user && (user.role === 'ADMIN' || user.username === 'admin'));
    if (!isAdmin) {
      alert('Chỉ tài khoản Quản trị viên (Admin) mới có quyền đặt lại mật khẩu!');
      return;
    }

    const newPass = document.getElementById('reset-pass-new-password').value.trim();
    try {
      const result = window.AppStorage.resetPassword(currentResetTeacherId, newPass);
      closeResetPasswordModal();
      window.AppToast.show(result.message, 'success');
      renderAdminDashboard();
    } catch (err) {
      alert(err.message);
    }
  }

  // Xác nhận và xóa giáo viên
  function confirmDeleteTeacher(userId, name, username) {
    const user = window.AppStorage.getCurrentUser();
    const isAdmin = window.AppStorage.isAdmin ? window.AppStorage.isAdmin(user) : (user && (user.role === 'ADMIN' || user.username === 'admin'));
    if (!isAdmin) {
      alert('Chỉ tài khoản Quản trị viên (Admin) mới có quyền xóa tài khoản giáo viên!');
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn XÓA tài khoản giáo viên: "${name}" (Tên đăng nhập: ${username}) khỏi hệ thống?`)) {
      try {
        const deleted = window.AppStorage.deleteTeacher(userId);
        window.AppToast.show(`Đã xóa tài khoản: <b>${deleted.name}</b> (${deleted.username})`, 'info');
        renderAdminDashboard();
        
        if (window.AppController && window.AppController.setupUserRoleSwitcher) {
          window.AppController.setupUserRoleSwitcher();
        }
      } catch (err) {
        alert(err.message);
      }
    }
  }

  return {
    renderAdminDashboard,
    togglePasswordVisibility,
    openAddDepartmentModal,
    closeAddDepartmentModal,
    handleAddDepartmentSubmit,
    confirmDeleteDepartment,
    openAddTeacherModal,
    closeAddTeacherModal,
    handleAddTeacherSubmit,
    openResetPasswordModal,
    closeResetPasswordModal,
    handleResetPasswordSubmit,
    confirmDeleteTeacher
  };
})();
