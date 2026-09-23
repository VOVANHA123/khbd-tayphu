/**
 * =========================================================================
 * UI-TEACHER.JS - GIAO DIỆN & NGHIỆP VỤ DÀNH CHO GIÁO VIÊN
 * =========================================================================
 */

window.UITeacher = (function() {
  let selectedFile = null;
  let cachedFileData = null;

  function renderTeacherDashboard() {
    const user = window.AppStorage.getCurrentUser();
    if (!user) return;

    // Cập nhật tiêu đề chào mừng không gian giáo viên & ẩn nút xóa mẫu cho GV
    const heroNameEl = document.getElementById('teacher-hero-name');
    const heroSubEl = document.getElementById('teacher-hero-sub');
    const btnClearAllPlans = document.getElementById('btn-clear-all-plans');

    if (heroNameEl) heroNameEl.innerText = user.name;
    if (heroSubEl) heroSubEl.innerText = `${user.departmentName || 'Tổ Khoa học Tự nhiên - Công nghệ'} • Trường THCS Tây Phú`;

    if (btnClearAllPlans) {
      const canClearAll = (user.role === 'TO_TRUONG' || user.role === 'TO_PHO' || user.role === 'BGH');
      btnClearAllPlans.style.display = canClearAll ? 'inline-flex' : 'none';
    }

    const allPlans = window.AppStorage.getPlans();
    const myPlans = allPlans.filter(p => p.tacGiaId === user.id);

    // Tính toán KPI
    const total = myPlans.length;
    const approved = myPlans.filter(p => p.trangThai === 'DA_DUYET').length;
    const pending = myPlans.filter(p => p.trangThai === 'CHO_DUYET').length;
    const needRevision = myPlans.filter(p => p.trangThai === 'CAN_SUA').length;

    // Cập nhật số liệu KPI lên giao diện
    const kpiTotal = document.getElementById('teacher-kpi-total');
    const kpiApproved = document.getElementById('teacher-kpi-approved');
    const kpiPending = document.getElementById('teacher-kpi-pending');
    const kpiRevision = document.getElementById('teacher-kpi-revision');

    if (kpiTotal) kpiTotal.innerText = total;
    if (kpiApproved) kpiApproved.innerText = approved;
    if (kpiPending) kpiPending.innerText = pending;
    if (kpiRevision) kpiRevision.innerText = needRevision;

    // Cập nhật Thông báo Yêu cầu chỉnh sửa từ Trợ lý AI hoặc Tổ chuyên môn ngay trên màn hình chính
    const aiAlertContainer = document.getElementById('teacher-ai-alert-container');
    if (aiAlertContainer) {
      const revisionPlans = myPlans.filter(p => p.trangThai === 'CAN_SUA');
      if (revisionPlans.length > 0) {
        aiAlertContainer.style.display = 'block';
        aiAlertContainer.innerHTML = revisionPlans.map(p => `
          <div class="p-4 rounded-2xl bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border-2 border-rose-300 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-pulse-subtle">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center text-xl shadow-md shrink-0 mt-0.5">
                ⚠️
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs">Yêu cầu chỉnh sửa</span>
                  <span class="text-xs font-bold text-slate-900">Tuần ${p.tuan} • ${p.tietPPCT ? 'Tiết ' + (window.cleanTietPPCT ? window.cleanTietPPCT(p.tietPPCT) : p.tietPPCT) + ' • ' : ''}${p.tieuDe}</span>
                  ${p.phienBan > 1 ? `<span class="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded">v${p.phienBan}</span>` : ''}
                </div>
                <div class="text-xs text-rose-950 mt-1.5 bg-white/80 p-2.5 rounded-xl border border-rose-200">
                  <span class="font-bold text-rose-800">Góp ý từ ${p.danhGia?.nguoiDuyetTen || 'Trợ lý AI'}:</span>
                  <span class="text-slate-800 ml-1">${p.danhGia?.nhanXetChung || 'Kế hoạch bài dạy chưa đầy đủ tiêu chuẩn 5512, vui lòng bổ sung.'}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
              <button type="button" onclick="window.UITeacher.openFeedbackModal('${p.id}')" class="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition">
                Xem đánh giá
              </button>
              <button type="button" onclick="window.UITeacher.openReuploadModal('${p.id}')" class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 active:scale-95">
                <span>⚡ Nộp lại bản sửa đổi ngay</span>
              </button>
            </div>
          </div>
        `).join('');
      } else {
        aiAlertContainer.style.display = 'none';
        aiAlertContainer.innerHTML = '';
      }
    }

    renderTeacherPlansTable(myPlans);
  }

  function renderTeacherPlansTable(plans) {
    const container = document.getElementById('teacher-plans-tbody');
    if (!container) return;

    if (!plans || plans.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-12 text-center text-slate-400">
            <div class="flex flex-col items-center justify-center gap-2">
              <svg class="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2-2z"></path></svg>
              <p class="font-medium text-slate-500">Chưa có kế hoạch bài dạy nào được nộp</p>
              <button onclick="window.UITeacher.openUploadModal()" class="mt-2 text-sm text-blue-600 hover:text-blue-700 font-semibold underline">
                + Tải lên kế hoạch bài dạy đầu tiên của Thầy/Cô
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    container.innerHTML = plans.map(p => {
      const dateFormatted = new Date(p.ngayNop).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const statusBadge = getStatusBadgeHtml(p.trangThai);

      return `
        <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
          <td class="px-4 py-3 font-semibold text-blue-600 text-sm">
            <span class="inline-block px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-mono text-xs border border-blue-200 font-bold">
              Tuần ${p.tuan}
            </span>
          </td>
          <td class="px-4 py-3">
            <div class="font-medium text-slate-800 text-sm max-w-xs truncate" title="${p.tieuDe}">
              ${p.tieuDe}
            </div>
            <div class="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
              <span class="font-medium text-slate-700">${p.monHoc}</span>
              <span>•</span>
              <span>${p.khoi}</span>
              <span>•</span>
              <span>Lớp: ${p.lop}</span>
              ${p.tietPPCT ? `
                <span>•</span>
                <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[11px] border border-blue-200">
                  Tiết ${(window.cleanTietPPCT ? window.cleanTietPPCT(p.tietPPCT) : p.tietPPCT)}
                </span>
              ` : ''}
              ${p.phienBan > 1 ? `<span class="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-bold">v${p.phienBan}</span>` : ''}
            </div>
          </td>
          <td class="px-4 py-3">
            <div class="flex items-center gap-1.5 text-xs text-slate-600">
              <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              <span class="truncate max-w-[150px]" title="${p.fileName}">${p.fileName}</span>
            </div>
            <div class="flex items-center gap-1.5 mt-1 flex-wrap">
              <button type="button" onclick="window.DriveAPI.openInGoogleDocs('${p.id}')" class="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-bold bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition shadow-xs" title="Mở xem trực tiếp trên Google Docs">
                <svg class="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>
                <span>Google Docs ↗</span>
              </button>
              ${p.driveViewUrl && !p.driveViewUrl.includes('demo') && (p.driveViewUrl.includes('drive.google.com') || p.driveViewUrl.includes('docs.google.com')) ? `
                <a href="${p.driveViewUrl}" target="_blank" class="inline-flex items-center gap-0.5 text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold" title="Mở thư mục/file trên Google Drive">
                  <span>📂 Drive</span>
                </a>
              ` : `
                <span class="text-[10px] text-amber-600 font-medium" title="Tệp lưu tạm cục bộ">⚡ Cục bộ</span>
              `}
            </div>
          </td>
          <td class="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
            ${dateFormatted}
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            ${statusBadge}
          </td>
          <td class="px-4 py-3 text-right whitespace-nowrap">
            <div class="flex items-center justify-end gap-1.5">
              ${p.danhGia ? `
                <button onclick="window.UITeacher.openFeedbackModal('${p.id}')" class="px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition" title="Xem nhận xét phê duyệt">
                  💬 Nhận xét
                </button>
              ` : ''}
              ${p.trangThai === 'CAN_SUA' ? `
                <button onclick="window.UITeacher.openReuploadModal('${p.id}')" class="px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition" title="Nộp lại bản sửa đổi">
                  ⚡ Nộp lại (v${p.phienBan + 1})
                </button>
              ` : ''}
              <button onclick="window.DriveAPI.openInGoogleDocs('${p.id}')" class="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition flex items-center gap-1" title="Mở xem trực tiếp trên Google Docs">
                <span>📝 Docs</span>
              </button>
              <button onclick="window.AppViewer.previewPlan('${p.id}')" class="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition" title="Xem trước tài liệu">
                👁️ Xem
              </button>
              <button onclick="window.UITeacher.confirmDeletePlan('${p.id}', '${p.tieuDe}')" class="px-2 py-1 text-xs font-semibold rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition" title="Xóa Kế hoạch bài dạy này">
                🗑️ Xóa
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function getStatusBadgeHtml(status) {
    switch (status) {
      case 'DA_DUYET':
        return `<span class="badge-status badge-DA_DUYET"><span class="pulse-success"></span> Đã Phê Duyệt</span>`;
      case 'CAN_SUA':
        return `<span class="badge-status badge-CAN_SUA">⚠️ Yêu Cầu Sửa</span>`;
      case 'TU_CHOI':
        return `<span class="badge-status badge-TU_CHOI">❌ Không Đạt</span>`;
      default:
        return `<span class="badge-status badge-CHO_DUYET"><span class="pulse-pending"></span> Chờ Duyệt</span>`;
    }
  }

  // Xóa 1 Kế hoạch bài dạy (đồng bộ xóa cả Drive & Google Sheets nếu có kết nối)
  async function confirmDeletePlan(planId, title) {
    if (confirm(`Thầy/Cô có chắc chắn muốn XÓA Kế hoạch bài dạy: "${title}"?\n\n⚠️ Tệp tài liệu đính kèm trên Google Drive cũng sẽ được chuyển vào THÙNG RÁC.`)) {
      try {
        window.AppToast.show('Đang xử lý xóa và chuyển tệp vào thùng rác Google Drive...', 'info');
        const res = await window.DriveAPI.deletePlan(planId);
        window.AppToast.show(res.message || 'Đã xóa Kế hoạch bài dạy và chuyển tệp Drive vào thùng rác!', 'success');
        renderTeacherDashboard();
      } catch (err) {
        alert(err.message);
      }
    }
  }

  // Xóa sạch toàn bộ Kế hoạch bài dạy (Demo & đã nộp) - Chỉ Tổ trưởng/BGH
  function clearAllPlansPrompt() {
    const user = window.AppStorage.getCurrentUser();
    if (user && user.role === 'GV') {
      alert('Chức năng này chỉ dành cho Tổ trưởng, Tổ phó hoặc BGH.');
      return;
    }
    if (confirm('⚠️ CẢNH BÁO: Thầy/Cô có chắc chắn muốn XÓA TOÀN BỘ kế hoạch bài dạy hiện có trong hệ thống để nộp mới từ đầu?')) {
      window.AppStorage.clearAllPlans();
      window.AppToast.show('Đã làm trống toàn bộ Kế hoạch bài dạy. Thầy/Cô có thể bắt đầu nộp mới!', 'success');
      renderTeacherDashboard();
      if (window.UIReviewer && window.UIReviewer.renderReviewerDashboard) {
        window.UIReviewer.renderReviewerDashboard();
      }
      if (window.UIAdmin && window.UIAdmin.renderAdminDashboard) {
        window.UIAdmin.renderAdminDashboard();
      }
    }
  }

  // Khởi tạo danh sách 35 tuần cho select
  function populateWeekSelectOptions(selectElementId, selectedWeek = 3) {
    const select = document.getElementById(selectElementId);
    if (!select) return;

    select.innerHTML = window.APP_CONFIG.WEEKS.map(w => `
      <option value="${w.weekNumber}" ${w.weekNumber === parseInt(selectedWeek) ? 'selected' : ''}>
        ${w.label} (${w.semester})
      </option>
    `).join('');
  }

  // Mở Modal Upload Kế hoạch bài dạy
  function openUploadModal(reuploadPlanId = null) {
    selectedFile = null;
    cachedFileData = null;
    const modal = document.getElementById('modal-upload-plan');
    const form = document.getElementById('form-upload-plan');
    if (form) form.reset();
    const fileInput = document.getElementById('upload-file-input');
    if (fileInput) fileInput.value = '';

    // Điền tuần dạy (hỗ trợ cả dạng số đơn hoặc chuỗi '1, 2', '2, 3')
    const tuanInput = document.getElementById('upload-tuan');
    if (tuanInput) {
      if (tuanInput.tagName === 'SELECT') {
        populateWeekSelectOptions('upload-tuan', 3);
      } else {
        tuanInput.value = '3';
      }
    }

    const titleEl = document.getElementById('modal-upload-title');
    const reuploadIdInput = document.getElementById('upload-reupload-id');
    const dropzoneText = document.getElementById('dropzone-file-name');

    if (dropzoneText) {
      dropzoneText.innerHTML = `
        Kéo thả file <span class="font-bold text-blue-600">.docx</span> hoặc <span class="font-bold text-rose-600">.pdf</span> vào đây, hoặc nhấp để chọn tệp
      `;
    }

    if (reuploadPlanId) {
      const plan = window.AppStorage.getPlanById(reuploadPlanId);
      if (titleEl) titleEl.innerText = `Nộp lại bản sửa đổi (v${plan.phienBan + 1}) - Tuần ${plan.tuan}`;
      if (reuploadIdInput) reuploadIdInput.value = reuploadPlanId;
      
      if (tuanInput) {
        if (tuanInput.tagName === 'SELECT') {
          populateWeekSelectOptions('upload-tuan', plan.tuan);
        } else {
          tuanInput.value = plan.tuan || '3';
        }
      }
      const tietPpctInput = document.getElementById('upload-tiet-ppct');
      if (tietPpctInput) tietPpctInput.value = (window.cleanTietPPCT ? window.cleanTietPPCT(plan.tietPPCT) : plan.tietPPCT) || '1, 2, 3';
      document.getElementById('upload-mon').value = plan.monHoc;
      document.getElementById('upload-khoi').value = plan.khoi;
      document.getElementById('upload-lop').value = plan.lop;
      document.getElementById('upload-tieude').value = plan.tieuDe;
      document.getElementById('upload-ghichu').value = `Đã chỉnh sửa theo góp ý của Tổ chuyên môn: ${plan.danhGia ? plan.danhGia.nhanXetChung : ''}`;
    } else {
      if (titleEl) titleEl.innerText = 'Thêm mới Kế hoạch Bài dạy (Upload Giáo án)';
      if (reuploadIdInput) reuploadIdInput.value = '';
      const tietPpctInput = document.getElementById('upload-tiet-ppct');
      if (tietPpctInput) tietPpctInput.value = '1, 2, 3';
    }

    // Khởi tạo mục Đăng ký mượn thiết bị dạy học (318 thiết bị PL3 chuẩn)
    const borrowCheckbox = document.getElementById('upload-borrow-equipment-checkbox');
    const borrowContainer = document.getElementById('upload-borrow-equipment-container');
    const eqDate = document.getElementById('upload-equipment-date');
    if (borrowCheckbox) borrowCheckbox.checked = false;
    if (borrowContainer) borrowContainer.style.display = 'none';
    if (eqDate) eqDate.value = new Date().toISOString().split('T')[0];
    
    // Tự động lọc danh sách thiết bị phù hợp với Môn học và Khối lớp
    try {
      refreshUploadEquipmentSelect();
    } catch (eqErr) {
      console.warn('Lỗi làm mới danh sách thiết bị khi mở modal:', eqErr);
    }

    // Gắn sự kiện tự động cập nhật thiết bị khi đổi môn hoặc khối
    const monSelect = document.getElementById('upload-mon');
    const khoiSelect = document.getElementById('upload-khoi');
    if (monSelect && !monSelect.dataset.listenerAttached) {
      monSelect.addEventListener('change', () => {
        try { refreshUploadEquipmentSelect(); } catch (e) {}
      });
      monSelect.dataset.listenerAttached = 'true';
    }
    if (khoiSelect && !khoiSelect.dataset.listenerAttached) {
      khoiSelect.addEventListener('change', () => {
        try { refreshUploadEquipmentSelect(); } catch (e) {}
      });
      khoiSelect.dataset.listenerAttached = 'true';
    }

    if (modal) {
      modal.classList.add('active');
    }
  }

  // Tự động làm mới danh sách thiết bị theo Môn và Khối đã chọn
  function refreshUploadEquipmentSelect() {
    const eqSelect = document.getElementById('upload-equipment-select');
    const monEl = document.getElementById('upload-mon');
    const khoiEl = document.getElementById('upload-khoi');
    if (!eqSelect || !window.EquipmentSyncEngine) return;

    const subject = monEl ? monEl.value : '';
    const grade = khoiEl ? khoiEl.value : '';

    const matched = window.EquipmentSyncEngine.getEquipmentsBySubjectAndGrade
      ? window.EquipmentSyncEngine.getEquipmentsBySubjectAndGrade(subject, grade)
      : window.EquipmentSyncEngine.getKHTNEquipments();

    if (!matched || matched.length === 0) {
      eqSelect.innerHTML = `<option value="" disabled selected>Không có thiết bị phù hợp</option>`;
      return;
    }

    eqSelect.innerHTML = matched.map(eq => {
      const avail = eq.available > 0 ? `(Còn ${eq.available} ${eq.unit})` : `(HẾT)`;
      const gBadge = eq.grade ? `[${eq.grade} • ${eq.subject}] ` : '';
      return `<option value="${eq.code}" ${eq.available <= 0 ? 'disabled' : ''}>${gBadge}${eq.name} ${avail}</option>`;
    }).join('');
  }

  function closeUploadModal() {
    const modal = document.getElementById('modal-upload-plan');
    if (modal) modal.classList.remove('active');
  }

  // Xem chi tiết nhận xét & mộc phê duyệt
  function openFeedbackModal(planId) {
    const plan = window.AppStorage.getPlanById(planId);
    if (!plan || !plan.danhGia) return;

    const modal = document.getElementById('modal-feedback');
    const titleEl = document.getElementById('feedback-plan-title');
    const reviewerEl = document.getElementById('feedback-reviewer');
    const dateEl = document.getElementById('feedback-date');
    const commentEl = document.getElementById('feedback-comment');
    const criteriaScoresEl = document.getElementById('feedback-criteria-scores');
    const stampContainer = document.getElementById('feedback-stamp-container');

    if (titleEl) titleEl.innerText = `${plan.tieuDe} (Tuần ${plan.tuan})`;
    if (reviewerEl) reviewerEl.innerText = `${plan.danhGia.nguoiDuyetTen} (${plan.danhGia.vaiTroDuyet})`;
    if (dateEl) dateEl.innerText = new Date(plan.danhGia.ngayDuyet).toLocaleString('vi-VN');
    if (commentEl) commentEl.innerText = plan.danhGia.nhanXetChung || 'Không có nhận xét chi tiết.';

    // Điểm 5 tiêu chí
    if (criteriaScoresEl && plan.danhGia.scores) {
      const criteriaList = window.APP_CONFIG.CRITERIA_5512;
      criteriaScoresEl.innerHTML = criteriaList.map(c => {
        const score = plan.danhGia.scores[c.id] || 0;
        return `
          <div class="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
            <span class="text-slate-700 font-medium">${c.title}</span>
            <span class="font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono">${score}/${c.maxScore}đ</span>
          </div>
        `;
      }).join('');
    }

    // Hiển thị con dấu / chữ ký
    if (stampContainer) {
      const stampData = window.AppSignature.generateVerificationStamp(
        plan.danhGia.nguoiDuyetTen,
        plan.toBoMonTen,
        plan.trangThai
      );
      stampContainer.innerHTML = stampData.html;
    }

    if (modal) modal.classList.add('active');
  }

  function closeFeedbackModal() {
    const modal = document.getElementById('modal-feedback');
    if (modal) modal.classList.remove('active');
  }

  // Khởi tạo dropzone file upload
  function initDropzone() {
    const dropzone = document.getElementById('file-dropzone');
    const fileInput = document.getElementById('upload-file-input');
    const dropzoneText = document.getElementById('dropzone-file-name');

    if (!dropzone || !fileInput) return;

    if (dropzone.tagName.toLowerCase() !== 'label') {
      dropzone.addEventListener('click', () => fileInput.click());
    }

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    async function handleFileSelect(file) {
      if (!file) return;
      selectedFile = file;
      cachedFileData = null;

      if (dropzoneText) {
        dropzoneText.innerHTML = `
          <div class="text-blue-600 font-semibold flex items-center justify-center gap-1.5">
            <span class="inline-block animate-spin">⏳</span> Đang tải tệp: ${file.name}...
          </div>
          <div class="text-xs text-slate-500 mt-1">Dung lượng: ${(file.size / 1024 / 1024).toFixed(2)} MB</div>
        `;
      }

      // Đọc và chuyển sang Base64 ngay khi chọn để tránh bị hệ điều hành điện thoại thu hồi quyền truy cập tệp
      try {
        cachedFileData = await window.DriveAPI.fileToBase64(file);
        if (dropzoneText) {
          dropzoneText.innerHTML = `
            <div class="text-emerald-600 font-semibold flex items-center justify-center gap-1.5">
              <svg class="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
              ${file.name}
            </div>
            <div class="text-xs text-emerald-600 font-medium mt-1">Dung lượng: ${(file.size / 1024 / 1024).toFixed(2)} MB • Đã sẵn sàng nộp</div>
          `;
        }
      } catch (readErr) {
        console.error('Lỗi đọc tệp khi chọn:', readErr);
        selectedFile = null;
        cachedFileData = null;
        const msg = (readErr && readErr.message) ? readErr.message : 'Không thể đọc tệp từ thiết bị';
        if (dropzoneText) {
          dropzoneText.innerHTML = `
            <div class="text-rose-600 font-semibold text-xs leading-relaxed">
              ⚠️ ${msg}
            </div>
            <div class="text-slate-700 text-xs mt-2.5 bg-amber-50/90 p-3 rounded-xl border border-amber-200/80 text-left space-y-1.5">
              <div class="font-bold text-amber-900 flex items-center gap-1.5">
                <span>💡</span> Hướng dẫn xử lý nhanh:
              </div>
              <p class="text-[11px] text-slate-600">
                • <b>Nếu tệp từ Zalo/Messenger:</b> Nhấp vào tệp trong tin nhắn ➔ chọn <b>Lưu vào máy</b> (hoặc Lưu vào Tải về / Downloads) rồi chạm vào đây để chọn lại.
              </p>
              <p class="text-[11px] text-slate-600">
                • <b>Hoặc:</b> Dán trực tiếp liên kết Google Docs của bài dạy ở ô phía dưới để nộp nhanh!
              </p>
            </div>
            <div class="text-xs text-blue-600 font-semibold mt-2.5">
              👉 Chạm vào đây để chọn lại tệp khác
            </div>
          `;
        }
        window.AppToast.show(msg, 'error');
      }
    }
  }

  // Xử lý gửi form upload
  async function handleFormSubmit(e) {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-submit-plan');

    try {
      const user = (window.AppStorage && window.AppStorage.getCurrentUser()) || {
        id: 'GV01',
        name: 'Võ Văn Hà',
        role: 'TO_TRUONG',
        departmentId: 'To_KHTN_CN',
        departmentName: 'Tổ Khoa học Tự nhiên - Công nghệ'
      };

      const reuploadId = document.getElementById('upload-reupload-id')?.value;
      const rawWeek = (document.getElementById('upload-tuan')?.value || '1').trim();
      // Giữ nguyên chuỗi tuần giáo viên nhập (VD: '1, 2' hoặc '2, 3' hoặc '1')
      const week = rawWeek.replace(/^Tuần\s*/i, '').trim() || '1';
      const cleanWeekFile = week.replace(/[^0-9a-zA-Z]/g, '-');
      const firstWeekNum = parseInt(week.replace(/[^0-9]/g, '')) || 1;

      const rawTiet = (document.getElementById('upload-tiet-ppct')?.value || '').trim();
      const tietPPCT = window.cleanTietPPCT ? window.cleanTietPPCT(rawTiet) : rawTiet;
      const subject = document.getElementById('upload-mon')?.value || 'Khoa học tự nhiên';
      const grade = document.getElementById('upload-khoi')?.value || 'Khối 9';
      const className = document.getElementById('upload-lop')?.value || '9A4';
      const title = (document.getElementById('upload-tieude')?.value || '').trim();
      const note = (document.getElementById('upload-ghichu')?.value || '').trim();
      const docsUrl = (document.getElementById('upload-docs-url')?.value || '').trim();

      if (!title) {
        throw new Error('Vui lòng nhập Tên bài dạy / Chủ đề bài học trước khi nộp!');
      }

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="inline-block animate-spin mr-2">⏳</span> Đang lưu kế hoạch bài dạy...`;
      }

      let fileData = cachedFileData;
      let finalFileName = `KHBD_${subject.replace(/\s+/g, '')}_${grade.replace(/\s+/g, '')}_Tuan_${cleanWeekFile}_${user.name.replace(/\s+/g, '')}.docx`;

      // Nếu chưa có cache (trường hợp hiếm), chuyển đổi file sang Base64
      if (!fileData && selectedFile) {
        try {
          fileData = await window.DriveAPI.fileToBase64(selectedFile);
        } catch (readErr) {
          console.warn('Lỗi đọc tệp đính kèm:', readErr);
        }
      }
      if (selectedFile && selectedFile.name) {
        finalFileName = selectedFile.name;
      } else if (!fileData && !docsUrl) {
        // Cho phép nộp kế hoạch trực tiếp / bản giấy hoặc đăng ký trước thiết bị dạy học
        finalFileName = `KHBD_TrucTiep_${subject.replace(/\s+/g, '')}_${grade.replace(/\s+/g, '')}_Tuan_${cleanWeekFile}.docx`;
      }

      const existingPlan = reuploadId ? window.AppStorage.getPlanById(reuploadId) : null;
      const version = existingPlan ? (existingPlan.phienBan + 1) : 1;

      const payload = {
        id: reuploadId || ('KHBD_' + Date.now()),
        tieuDe: title,
        tietPPCT: tietPPCT,
        monHoc: subject,
        khoi: grade,
        lop: className,
        tuan: week,
        hocKy: firstWeekNum <= 18 ? 'Học kỳ I' : 'Học kỳ II',
        namHoc: (window.APP_CONFIG && window.APP_CONFIG.ACADEMIC_YEAR) || '2026-2027',
        tacGiaId: user.id,
        tacGiaTen: user.name,
        toBoMonId: user.departmentId,
        toBoMonTen: user.departmentName,
        fileName: finalFileName,
        fileBase64: fileData ? fileData.base64 : null,
        fileMimeType: fileData ? fileData.mimeType : null,
        docsUrl: docsUrl,
        phienBan: version,
        ghiChu: note
      };

      const uploadRes = await window.DriveAPI.uploadPlan(payload);

      // Tự động phát sinh phiếu mượn thiết bị và đồng bộ nếu giáo viên tích chọn
      const isBorrowRequested = document.getElementById('upload-borrow-equipment-checkbox')?.checked;
      const borrowEqCode = document.getElementById('upload-equipment-select')?.value;
      const borrowEqQty = parseInt(document.getElementById('upload-equipment-quantity')?.value) || 1;
      const borrowEqDate = document.getElementById('upload-equipment-date')?.value;
      const borrowEqSession = document.getElementById('upload-equipment-session')?.value;
      const borrowEqRoom = document.getElementById('upload-equipment-room')?.value;

      let eqRecordCreated = null;
      if (isBorrowRequested && borrowEqCode && window.EquipmentSyncEngine) {
        try {
          eqRecordCreated = await window.EquipmentSyncEngine.borrowFromKHBD(payload, {
            equipmentCode: borrowEqCode,
            quantity: borrowEqQty,
            borrowDate: borrowEqDate,
            session: borrowEqSession,
            room: borrowEqRoom
          });
        } catch (eqErr) {
          console.warn('Lưu ý mượn thiết bị:', eqErr);
        }
      }

      // Đóng modal và dọn sạch trạng thái tệp đệm
      selectedFile = null;
      cachedFileData = null;
      closeUploadModal();

      const eqMsg = eqRecordCreated ? ` và đã đồng thời đăng ký mượn thiết bị "${eqRecordCreated.equipmentName}" thành công trên Sổ Thiết bị` : '';
      if (uploadRes && uploadRes.status === 'success') {
        window.AppToast.show(
          `🎉 Đã nộp thành công Kế hoạch bài dạy Tuần ${week}${eqMsg}! (Đang chờ Tổ chuyên môn kiểm tra & phê duyệt).`,
          'success'
        );
      } else {
        window.AppToast.show(
          (uploadRes && uploadRes.message) || `Đã lưu thành công Kế hoạch bài dạy Tuần ${week}${eqMsg}!`,
          'info'
        );
      }
      renderTeacherDashboard();
    } catch (err) {
      console.error('Lỗi khi nộp bài:', err);
      let errorMsg = 'Lỗi không xác định';
      if (err) {
        if (typeof err === 'string') {
          errorMsg = err;
        } else if (err.message) {
          errorMsg = err.message;
        } else if (err.target && err.target.error) {
          errorMsg = (err.target.error && err.target.error.message) || 'Lỗi đọc tệp tin từ thiết bị';
        } else {
          try {
            const str = JSON.stringify(err);
            errorMsg = (str && str !== '{}') ? str : (err.toString() || 'Lỗi thao tác');
          } catch (e) {
            errorMsg = err.toString() || 'Lỗi thao tác';
          }
        }
      }
      window.AppToast.show('Thông báo: ' + errorMsg, 'warning');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `Nộp Kế hoạch bài dạy`;
      }
    }
  }


  return {
    renderTeacherDashboard,
    getStatusBadgeHtml,
    openUploadModal,
    closeUploadModal,
    openReuploadModal: openUploadModal,
    openFeedbackModal,
    closeFeedbackModal,
    confirmDeletePlan,
    clearAllPlansPrompt,
    populateWeekSelectOptions,
    initDropzone,
    handleFormSubmit
  };
})();
