/**
 * =========================================================================
 * APP.JS - KHỞI CHẠY HỆ THỐNG, ĐIỀU HƯỚNG TABS, ĐĂNG NHẬP, ĐỔI MK & THÔNG BÁO
 * =========================================================================
 */

// Toast Notifications
window.AppToast = (function() {
  function show(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-5 right-5 z-[99999] flex flex-col gap-2 max-w-sm w-full pointer-events-none';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl backdrop-blur-md border text-sm font-medium transition-all duration-300 transform translate-y-3 opacity-0 ${
      type === 'success' ? 'bg-emerald-50/95 border-emerald-300 text-emerald-900' :
      type === 'error' ? 'bg-rose-50/95 border-rose-300 text-rose-900' :
      type === 'warning' ? 'bg-amber-50/95 border-amber-300 text-amber-900' :
      'bg-slate-900/90 border-slate-700 text-white'
    }`;

    const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : type === 'warning' ? '🔔' : 'ℹ️';
    toast.innerHTML = `
      <span class="text-base shrink-0">${icon}</span>
      <div class="flex-1 text-xs leading-relaxed">${message}</div>
      <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600 text-xs font-bold shrink-0">✕</button>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-3', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-3');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  return { show };
})();

// Document Viewer (Xem trước Giáo án)
window.AppViewer = (function() {
  let currentPreviewPlanId = null;

  function getCurrentPlanId() {
    return currentPreviewPlanId;
  }

  function previewPlan(planId) {
    currentPreviewPlanId = planId;
    const plan = window.AppStorage.getPlanById(planId);
    if (!plan) return;

    const modal = document.getElementById('modal-preview-doc');
    const titleEl = document.getElementById('preview-modal-title');
    const authorEl = document.getElementById('preview-modal-author');
    const iframeEl = document.getElementById('preview-doc-iframe');
    const openDriveLink = document.getElementById('preview-open-drive-link');

    if (titleEl) titleEl.innerText = `${plan.tieuDe} (Tuần ${plan.tuan})`;
    if (authorEl) authorEl.innerText = `GV: ${plan.tacGiaTen} | Môn: ${plan.monHoc} | Lớp: ${plan.lop} | Ngày nộp: ${new Date(plan.ngayNop).toLocaleDateString('vi-VN')}`;
    
    const hasLiveDriveUrl = (plan.driveFileId && !plan.driveFileId.includes('demo')) || (plan.docsUrl && plan.docsUrl.includes('docs.google.com')) || (plan.driveViewUrl && !plan.driveViewUrl.includes('demo') && (plan.driveViewUrl.includes('drive.google.com') || plan.driveViewUrl.includes('docs.google.com')));

    if (openDriveLink) {
      openDriveLink.innerText = '📝 Mở xem trên Google Docs ↗';
      openDriveLink.onclick = function(e) {
        e.preventDefault();
        window.DriveAPI.openInGoogleDocs(plan.id);
      };
    }

    if (iframeEl) {
      if (plan.driveFileId && !plan.driveFileId.includes('demo')) {
        iframeEl.removeAttribute('srcdoc');
        iframeEl.src = `https://drive.google.com/file/d/${plan.driveFileId}/preview`;
      } else if (plan.docsUrl && plan.docsUrl.includes('docs.google.com')) {
        iframeEl.removeAttribute('srcdoc');
        iframeEl.src = plan.docsUrl;
      } else if (hasLiveDriveUrl && plan.driveViewUrl) {
        iframeEl.removeAttribute('srcdoc');
        iframeEl.src = plan.driveViewUrl;
      } else {
        iframeEl.removeAttribute('src');
        iframeEl.srcdoc = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 75vh; margin: 0; background: #f8fafc; color: #1e293b; text-align: center; padding: 20px; box-sizing: border-box; }
              .card { background: white; padding: 32px; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); max-width: 540px; width: 100%; }
              .icon { font-size: 48px; margin-bottom: 12px; }
              .title { font-size: 17px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
              .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; background: #dbeafe; color: #1e40af; margin-bottom: 16px; }
              .info { font-size: 13px; color: #475569; line-height: 1.8; margin-bottom: 18px; background: #f1f5f9; padding: 14px; border-radius: 12px; text-align: left; }
              .actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; }
              .btn-docs { background: #2563eb; color: white; border: none; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: bold; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
              .btn-docs:hover { background: #1d4ed8; }
              .btn-download { background: #059669; color: white; border: none; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: bold; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
              .btn-download:hover { background: #047857; }
              .notice { font-size: 12px; color: #92400e; background: #fef3c7; padding: 12px; border-radius: 10px; border: 1px solid #fde68a; line-height: 1.5; text-align: left; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">📄</div>
              <div class="title">${plan.fileName || plan.tieuDe}</div>
              <div class="badge">Tuần ${plan.tuan} • ${plan.monHoc} • ${plan.khoi} • Lớp ${plan.lop}</div>
              <div class="info">
                <div><strong>👨‍🏫 Tác giả:</strong> ${plan.tacGiaTen}</div>
                <div><strong>🏢 Tổ bộ môn:</strong> ${plan.toBoMonTen}</div>
                <div><strong>📅 Thời gian nộp:</strong> ${new Date(plan.ngayNop).toLocaleString('vi-VN')}</div>
                ${plan.ghiChu ? `<div><strong>📝 Ghi chú:</strong> ${plan.ghiChu}</div>` : ''}
              </div>
              <div class="actions">
                <button type="button" class="btn-docs" onclick="parent.window.DriveAPI.openInGoogleDocs('${plan.id}')">
                  📝 Mở xem trên Google Docs ↗
                </button>
                ${plan.fileBase64 ? `
                  <button type="button" class="btn-download" onclick="parent.window.UIReviewer.downloadLocalFile('${plan.id}')">
                    📥 Tải file gốc (.docx)
                  </button>
                ` : ''}
              </div>
              <div class="notice">
                💡 <strong>Kế hoạch bài dạy đã lưu an toàn:</strong> Thầy/Cô có thể bấm <strong>"Mở xem trên Google Docs"</strong> ở trên để tự động mở hoặc tải tệp về máy tính.
              </div>
            </div>
          </body>
          </html>
        `;
      }
    }

    if (modal) modal.classList.add('active');
  }

  function closePreview() {
    const modal = document.getElementById('modal-preview-doc');
    const iframeEl = document.getElementById('preview-doc-iframe');
    if (iframeEl) {
      iframeEl.src = 'about:blank';
      iframeEl.removeAttribute('srcdoc');
    }
    if (modal) modal.classList.remove('active');
  }

  return { previewPlan, closePreview, getCurrentPlanId };
})();

// Main Controller
window.AppController = (function() {
  let currentTab = 'teacher';

  function init() {
    // 1. Tự động nhận URL kết nối nếu mở qua QR code hoặc link chia sẻ: ?gasUrl=...
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paramGasUrl = urlParams.get('gasUrl') || urlParams.get('gas_url');
      if (paramGasUrl) {
        window.AppStorage.setGasUrl(paramGasUrl);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {}

    setupAuthListeners();
    setupTabNavigation();
    setupSettingsModal();
    setupStateListeners();

    // Khởi tạo dropzone file upload
    if (window.UITeacher && window.UITeacher.initDropzone) {
      window.UITeacher.initDropzone();
    }

    // Kích hoạt đồng bộ thời gian thực ngay khi mở app
    startRealtimeSync();

    // Kiểm tra trạng thái đăng nhập
    const user = window.AppStorage.getCurrentUser();
    if (!user) {
      openLoginModal(true); // Hiển thị màn hình đăng nhập bắt buộc
    } else {
      updateUserBadge();
      const isAdmin = window.AppStorage.isAdmin ? window.AppStorage.isAdmin(user) : (user.role === 'ADMIN' || user.username === 'admin');
      if (isAdmin) {
        switchTab('admin');
      } else if (user.role === 'TO_TRUONG' || user.role === 'TO_PHO') {
        switchTab('reviewer');
      } else if (user.role === 'BGH') {
        switchTab('admin');
      } else {
        switchTab('teacher');
      }
    }
  }

  function setupStateListeners() {
    window.addEventListener('khbd:state-changed', () => {
      refreshActiveView();
      updateUserBadge();
    });

    window.addEventListener('khbd:user-changed', (e) => {
      updateUserBadge();
      const user = e.detail;
      if (!user) {
        openLoginModal(true);
        return;
      }
      const isAdmin = window.AppStorage.isAdmin ? window.AppStorage.isAdmin(user) : (user.role === 'ADMIN' || user.username === 'admin');
      if (isAdmin) {
        switchTab('admin');
      } else if (user.role === 'BGH') {
        switchTab('admin');
      } else if (user.role === 'TO_TRUONG' || user.role === 'TO_PHO') {
        switchTab('reviewer');
      } else {
        switchTab('teacher');
      }
    });

    window.addEventListener('khbd:user-logout', () => {
      updateUserBadge();
      openLoginModal(true);
    });
  }

  // Quản lý Đăng nhập & Đăng xuất (Đồng bộ đa thiết bị)
  function setupAuthListeners() {
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('login-username').value.trim();
        const p = document.getElementById('login-password').value.trim();
        const errEl = document.getElementById('login-error-msg');
        const submitBtn = formLogin.querySelector('button[type="submit"]');

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerText = 'Đang xác thực...';
        }

        try {
          const result = await window.AppStorage.loginWithOnlineCheck(u, p);
          if (result.success) {
            closeLoginModal();
            updateUserBadge();
            window.AppToast.show(`Đăng nhập thành công! Chào mừng <b>${result.user.name}</b> (${result.user.roleLabel})`, 'success');
          } else {
            if (errEl) {
              errEl.innerText = result.message;
              errEl.classList.remove('hidden');
            }
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Đăng Nhập Ngay';
          }
        }
      });
    }

    // Form Đổi mật khẩu cá nhân (Đồng bộ ngay lên Google Sheets)
    const formChangePass = document.getElementById('form-change-password');
    if (formChangePass) {
      formChangePass.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPass = document.getElementById('change-pass-current').value.trim();
        const newPass = document.getElementById('change-pass-new').value.trim();
        const confirmPass = document.getElementById('change-pass-confirm').value.trim();
        const submitBtn = formChangePass.querySelector('button[type="submit"]');

        if (newPass !== confirmPass) {
          alert('Mật khẩu mới và xác nhận mật khẩu không khớp nhau!');
          return;
        }

        const user = window.AppStorage.getCurrentUser();
        if (!user) return;

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerText = 'Đang đồng bộ mật khẩu...';
        }

        try {
          const res = await window.AppStorage.changePassword(user.id, currentPass, newPass);
          closeChangePasswordModal();
          window.AppToast.show(res.message, 'success');
        } catch (err) {
          alert(err.message);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Cập Nhật Mật Khẩu';
          }
        }
      });
    }
  }

  function openLoginModal(isForced = false) {
    const modal = document.getElementById('modal-login');
    const errEl = document.getElementById('login-error-msg');
    const btnClose = document.getElementById('btn-close-login-modal');

    if (errEl) errEl.classList.add('hidden');
    if (btnClose) {
      btnClose.style.display = isForced ? 'none' : 'inline-block';
    }
    if (modal) modal.classList.add('active');
  }

  function closeLoginModal() {
    const modal = document.getElementById('modal-login');
    if (modal) modal.classList.remove('active');
  }

  function openChangePasswordModal() {
    const modal = document.getElementById('modal-change-password');
    const form = document.getElementById('form-change-password');
    if (form) form.reset();
    if (modal) modal.classList.add('active');
  }

  function closeChangePasswordModal() {
    const modal = document.getElementById('modal-change-password');
    if (modal) modal.classList.remove('active');
  }

  function quickLoginAs(username, defaultPass = '123') {
    const user = window.AppStorage.getUserByUsername ? window.AppStorage.getUserByUsername(username) : null;
    const passToUse = (user && user.password) ? user.password : defaultPass;
    document.getElementById('login-username').value = username;
    document.getElementById('login-password').value = passToUse;
    const result = window.AppStorage.login(username, passToUse);
    if (result.success) {
      closeLoginModal();
      updateUserBadge();
      window.AppToast.show(`Đăng nhập thành công! Chào mừng <b>${result.user.name}</b> (${result.user.roleLabel})`, 'success');
    }
  }

  function handleLogout() {
    if (confirm('Thầy/Cô có chắc chắn muốn đăng xuất tài khoản?')) {
      window.AppStorage.logout();
      window.AppToast.show('Đã đăng xuất an toàn.', 'info');
    }
  }

  // Cập nhật thẻ hiển thị: CHỈ HIỆN TÀI KHOẢN ĐANG ĐĂNG NHẬP
  function updateUserBadge() {
    const user = window.AppStorage.getCurrentUser();
    
    const accountBadge = document.getElementById('header-account-badge');
    const btnLoginTop = document.getElementById('btn-open-login-modal');
    const nameEl = document.getElementById('header-user-name');
    const roleEl = document.getElementById('header-user-role');
    const avatarEl = document.getElementById('header-user-avatar');
    const usernameEl = document.getElementById('header-user-username');

    if (user) {
      if (accountBadge) accountBadge.style.display = 'flex';
      if (btnLoginTop) btnLoginTop.style.display = 'none';
      if (nameEl) nameEl.innerText = user.name;
      if (roleEl) roleEl.innerText = `${user.roleLabel} • ${user.departmentName}`;
      if (avatarEl) avatarEl.innerText = user.avatar || '👨‍🏫';
      if (usernameEl) usernameEl.innerText = `@${user.username}`;
    } else {
      if (accountBadge) accountBadge.style.display = 'none';
      if (btnLoginTop) btnLoginTop.style.display = 'inline-flex';
    }

    // Cập nhật tiêu đề chào mừng không gian giáo viên & ẩn nút xóa toàn bộ mẫu với GV
    const heroNameEl = document.getElementById('teacher-hero-name');
    const heroSubEl = document.getElementById('teacher-hero-sub');
    const btnClearAllPlans = document.getElementById('btn-clear-all-plans');

    if (user) {
      if (heroNameEl) heroNameEl.innerText = user.name;
      if (heroSubEl) heroSubEl.innerText = `${user.departmentName || 'Tổ Khoa học Tự nhiên - Công nghệ'} • Trường THCS Tây Phú`;

      // Tài khoản giáo viên: BỎ nút xóa toàn bộ KHBD mẫu (chỉ hiện cho Tổ trưởng, Tổ phó, BGH)
      if (btnClearAllPlans) {
        const canClearAll = (user.role === 'TO_TRUONG' || user.role === 'TO_PHO' || user.role === 'BGH');
        btnClearAllPlans.style.display = canClearAll ? 'inline-flex' : 'none';
      }
    }

    // Điều chỉnh hiển thị các nút tab theo quyền của tài khoản
    const tabReviewer = document.getElementById('nav-tab-reviewer');
    const tabEquipment = document.getElementById('nav-tab-equipment');
    const tabAdmin = document.getElementById('nav-tab-admin');
    const tabSettings = document.getElementById('nav-tab-settings');

    const isAdmin = window.AppStorage.isAdmin ? window.AppStorage.isAdmin(user) : (user && (user.role === 'ADMIN' || user.username === 'admin'));
    const canReview = isAdmin || (user && (user.role === 'TO_TRUONG' || user.role === 'TO_PHO' || user.role === 'BGH'));
    const canAdmin = isAdmin || (user && (user.role === 'BGH' || user.role === 'TO_TRUONG' || user.role === 'TO_PHO'));
    const canConfigureDrive = isAdmin; // CHỈ CÓ TÀI KHOẢN ADMIN MỚI ĐƯỢC XEM CẤU HÌNH DRIVE

    if (tabReviewer) {
      tabReviewer.style.display = canReview ? 'flex' : 'none';
    }
    if (tabEquipment) {
      // Tab Thiết bị KHTN-CN: Mở cho toàn bộ GV trong Tổ KHTN-CN, Admin, BGH
      const isKHTN = !user || user.departmentId === 'To_KHTN_CN' || 
                     (user.departmentName && user.departmentName.includes('Tự nhiên')) ||
                     isAdmin || (user && user.role === 'BGH') || (user && user.username === 'vovanha');
      tabEquipment.style.display = isKHTN ? 'flex' : 'none';
    }
    if (tabAdmin) {
      tabAdmin.style.display = canAdmin ? 'flex' : 'none';
      const label = tabAdmin.querySelector('span');
      if (label) {
        label.innerText = isAdmin ? '📊 Báo cáo & Quản trị Hệ thống' : '📊 Báo cáo Tiến độ (BGH)';
      }
    }
    if (tabSettings) {
      tabSettings.style.display = canConfigureDrive ? 'flex' : 'none';
    }

    updateDriveStatusIndicator();
  }

  function updateDriveStatusIndicator() {
    const user = window.AppStorage.getCurrentUser();
    const isAdmin = window.AppStorage.isAdmin ? window.AppStorage.isAdmin(user) : (user && (user.role === 'ADMIN' || user.username === 'admin'));
    const canConfigureDrive = isAdmin;
    const gasUrl = window.AppStorage.getGasUrl();
    const indicator = document.getElementById('header-drive-status');
    const dot = document.getElementById('header-drive-dot');
    const text = document.getElementById('header-drive-text');

    if (!indicator || !dot || !text) return;

    if (!canConfigureDrive) {
      // Đối với tài khoản không phải Admin: không hiển thị nút cấu hình Drive
      indicator.onclick = null;
      if (gasUrl) {
        indicator.className = 'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default';
        dot.className = 'w-2 h-2 rounded-full bg-emerald-500';
        text.innerText = 'Drive: Đã kết nối';
        indicator.title = 'Hệ thống đã kết nối Google Drive tự động';
      } else {
        indicator.className = 'hidden';
      }
      return;
    }

    // Đối với tài khoản Admin: Cho phép bấm để cấu hình
    indicator.onclick = () => window.AppController.switchTab('settings');
    if (gasUrl) {
      indicator.className = 'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer hover:bg-emerald-100 transition';
      dot.className = 'w-2 h-2 rounded-full bg-emerald-500';
      text.innerText = 'Drive: Đã kết nối';
      indicator.title = 'Google Drive đã kết nối qua Apps Script Web App (Bấm để quản lý)';
    } else {
      indicator.className = 'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-100 transition';
      dot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';
      text.innerText = 'Drive: Chưa kết nối (Bấm cài đặt)';
      indicator.title = 'Bấm để cấu hình dán URL Google Apps Script Web App';
    }
  }

  function setupTabNavigation() {
    const tabs = ['teacher', 'reviewer', 'equipment', 'admin', 'settings'];
    tabs.forEach(tab => {
      const btn = document.getElementById(`nav-tab-${tab}`);
      if (btn) {
        btn.addEventListener('click', () => switchTab(tab));
      }
    });
  }

  function switchTab(tabName) {
    const user = window.AppStorage.getCurrentUser();
    const isAdmin = window.AppStorage.isAdmin ? window.AppStorage.isAdmin(user) : (user && (user.role === 'ADMIN' || user.username === 'admin'));
    const canConfigureDrive = isAdmin;

    // Chặn truy cập tab settings nếu không phải Admin
    if (tabName === 'settings' && !canConfigureDrive) {
      if (window.AppToast) {
        window.AppToast.show('Chức năng Cấu hình Google Drive chỉ dành riêng cho tài khoản Quản trị viên (Admin).', 'warning');
      }
      tabName = isAdmin ? 'admin' : ((user && (user.role === 'TO_TRUONG' || user.role === 'TO_PHO')) ? 'reviewer' : (user && user.role === 'BGH' ? 'admin' : 'teacher'));
    }

    currentTab = tabName;
    const tabs = ['teacher', 'reviewer', 'equipment', 'admin', 'settings'];

    tabs.forEach(t => {
      const view = document.getElementById(`view-${t}`);
      const btn = document.getElementById(`nav-tab-${t}`);
      if (view) {
        if (t === tabName) {
          view.classList.remove('hidden');
        } else {
          view.classList.add('hidden');
        }
      }
      if (btn) {
        const sub = btn.querySelector('.tab-sublabel');
        const arrow = btn.querySelector('.tab-arrow');
        if (t === tabName) {
          btn.classList.add('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-500/20');
          btn.classList.remove('text-slate-700', 'text-slate-600', 'hover:bg-slate-100');
          if (sub) {
            sub.classList.remove('text-slate-400');
            sub.classList.add('text-blue-100');
          }
          if (arrow) arrow.className = 'tab-arrow text-xs text-white/80';
        } else {
          btn.classList.remove('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-500/20');
          btn.classList.add('text-slate-700', 'hover:bg-slate-100');
          if (sub) {
            sub.classList.remove('text-blue-100');
            sub.classList.add('text-slate-400');
          }
          if (arrow) arrow.className = 'tab-arrow text-xs text-slate-400';
        }
      }
    });

    refreshActiveView();
  }

  function refreshActiveView() {
    if (currentTab === 'teacher') {
      window.UITeacher.renderTeacherDashboard();
    } else if (currentTab === 'reviewer') {
      window.UIReviewer.renderReviewerDashboard();
    } else if (currentTab === 'equipment') {
      if (window.EquipmentSyncEngine) {
        window.EquipmentSyncEngine.renderEquipmentView();
      }
    } else if (currentTab === 'admin') {
      window.UIAdmin.renderAdminDashboard();
    }
  }

  function setupSettingsModal() {
    const gasInput = document.getElementById('settings-gas-url');
    const btnSave = document.getElementById('btn-save-gas-url');
    const btnTest = document.getElementById('btn-test-gas');
    const btnReset = document.getElementById('btn-reset-demo-data');
    const statusEl = document.getElementById('gas-conn-status');

    const currentUrl = window.AppStorage.getGasUrl();
    if (gasInput && currentUrl) {
      gasInput.value = currentUrl;
    }

    updateCloudModeBadge();

    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        const val = gasInput.value.trim();
        window.AppStorage.setGasUrl(val);
        window.AppStorage.setMode(val ? 'LIVE' : 'DEMO');
        updateCloudModeBadge();
        window.AppToast.show('Đã lưu cấu hình kết nối Google Apps Script!', 'success');
        if (val) {
          await performRealtimeSync(false);
        }
      });
    }

    if (btnTest) {
      btnTest.addEventListener('click', async () => {
        const val = gasInput.value.trim();
        if (!val) {
          window.AppToast.show('Vui lòng dán URL Google Apps Script Web App trước khi kiểm tra.', 'warning');
          return;
        }

        btnTest.disabled = true;
        btnTest.innerText = 'Đang kiểm tra kết nối...';
        if (statusEl) statusEl.innerHTML = `<span class="text-blue-600 font-medium">Đang gửi tín hiệu Ping tới Google Apps Script...</span>`;

        const res = await window.DriveAPI.testConnection(val);
        btnTest.disabled = false;
        btnTest.innerText = 'Kiểm tra kết nối (Ping)';

        if (res.success) {
          if (statusEl) statusEl.innerHTML = `<span class="text-emerald-600 font-bold">✅ ${res.message}</span>`;
          window.AppToast.show('Kết nối thành công tới Google Drive & Sheets!', 'success');
        } else {
          if (statusEl) statusEl.innerHTML = `<span class="text-rose-600 font-bold">❌ ${res.message}</span>`;
          window.AppToast.show(res.message, 'error');
        }
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('Khôi phục lại toàn bộ dữ liệu demo ban đầu (bao gồm tài khoản và giáo án mẫu)?')) {
          window.AppStorage.resetDemo();
          window.AppToast.show('Đã đặt lại dữ liệu demo mẫu thành công!', 'info');
          updateUserBadge();
          refreshActiveView();
        }
      });
    }
  }

  function updateCloudModeBadge() {
    updateDriveStatusIndicator();
    const badge = document.getElementById('cloud-mode-indicator');
    const gasUrl = window.AppStorage.getGasUrl();
    if (!badge) return;

    if (gasUrl) {
      badge.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Google Drive Live
        </span>
      `;
    } else {
      const user = window.AppStorage.getCurrentUser();
      const canConfigureDrive = user && (user.role === 'TO_TRUONG' || user.role === 'BGH');
      if (canConfigureDrive) {
        badge.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer" onclick="window.AppController.switchTab('settings')" title="Nhấp để cấu hình Google Apps Script">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            Demo Cục bộ
          </span>
        `;
      } else {
        badge.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            Lưu trữ Hệ thống
          </span>
        `;
      }
    }
  }

  // Động cơ Đồng bộ Dữ liệu Thời gian thực (Real-time Cloud Sync Engine)
  let syncTimer = null;
  let isSyncing = false;

  async function triggerManualSync() {
    await performRealtimeSync(false);
  }

  async function performRealtimeSync(silent = true) {
    const gasUrl = window.AppStorage.getGasUrl();
    if (!gasUrl || isSyncing) return;

    isSyncing = true;
    const syncIcon = document.querySelector('.sync-icon');
    const syncText = document.getElementById('sync-status-text');
    if (syncIcon) syncIcon.classList.add('inline-block', 'animate-spin');

    try {
      const cloudData = await window.DriveAPI.fetchCloudData();
      if (cloudData && cloudData.plans) {
        const hasChanges = window.AppStorage.syncFromCloud(cloudData);
        if (syncText) {
          const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          syncText.innerText = `Đồng bộ: ${timeStr}`;
        }
        if (hasChanges) {
          refreshActiveView();
        }
        if (!silent && window.AppToast) {
          window.AppToast.show(hasChanges ? 'Đã cập nhật dữ liệu mới nhất từ Google Sheets!' : 'Dữ liệu đã được cập nhật mới nhất!', 'success');
        }
      }
    } catch (e) {
      console.warn('Lỗi đồng bộ thời gian thực:', e);
      if (!silent && window.AppToast) {
        window.AppToast.show('Lỗi kết nối đồng bộ: ' + e.message, 'warning');
      }
    } finally {
      isSyncing = false;
      if (syncIcon) syncIcon.classList.remove('animate-spin');
    }
  }

  function startRealtimeSync() {
    // 1. Đồng bộ ngay lần đầu khi mở app
    performRealtimeSync(true);

    // 2. Định kỳ 20 giây một lần
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(() => {
      performRealtimeSync(true);
    }, 20000);

    // 3. Tự động đồng bộ ngay khi người dùng mở lại màn hình điện thoại / quay lại tab này
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        performRealtimeSync(true);
      }
    });
  }

  function openUserDrive() {
    const customDriveUrl = localStorage.getItem('KHBD_ROOT_FOLDER_URL') || 'https://drive.google.com/drive/my-drive';
    window.open(customDriveUrl, '_blank', 'noopener,noreferrer');
  }

  function openMobileQrModal() {
    const gasUrl = window.AppStorage.getGasUrl();
    if (!gasUrl) {
      window.AppToast.show('Thầy/Cô vui lòng dán và Lưu URL Google Apps Script trước khi tạo mã QR cho điện thoại!', 'warning');
      return;
    }
    const modal = document.getElementById('modal-mobile-qr');
    const qrImg = document.getElementById('mobile-qr-image');
    const shareInput = document.getElementById('mobile-share-link');

    const currentBase = window.location.origin + window.location.pathname;
    const shareUrl = `${currentBase}?gasUrl=${encodeURIComponent(gasUrl)}`;

    if (qrImg) {
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(shareUrl)}`;
    }
    if (shareInput) {
      shareInput.value = shareUrl;
    }
    if (modal) modal.classList.add('active');
  }

  function closeMobileQrModal() {
    const modal = document.getElementById('modal-mobile-qr');
    if (modal) modal.classList.remove('active');
  }

  function copyMobileShareLink() {
    const shareInput = document.getElementById('mobile-share-link');
    if (shareInput && shareInput.value) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareInput.value).then(() => {
          window.AppToast.show('Đã sao chép liên kết! Thầy/Cô có thể gửi vào Zalo để mở trên điện thoại.', 'success');
        }).catch(() => {
          shareInput.select();
          document.execCommand('copy');
          window.AppToast.show('Đã sao chép liên kết!', 'success');
        });
      } else {
        shareInput.select();
        document.execCommand('copy');
        window.AppToast.show('Đã sao chép liên kết!', 'success');
      }
    }
  }

  return {
    init,
    switchTab,
    refreshActiveView,
    updateUserBadge,
    openLoginModal,
    closeLoginModal,
    openChangePasswordModal,
    closeChangePasswordModal,
    quickLoginAs,
    handleLogout,
    openUserDrive,
    triggerManualSync,
    openMobileQrModal,
    closeMobileQrModal,
    copyMobileShareLink
  };
})();

// Khởi chạy khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  window.AppController.init();
});
