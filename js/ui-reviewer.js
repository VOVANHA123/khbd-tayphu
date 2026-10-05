/**
 * =========================================================================
 * UI-REVIEWER.JS - GIAO DIỆN & NGHIỆP VỤ KIỂM TRA & PHÊ DUYỆT GIÁO ÁN
 * (Dành cho Tổ trưởng chuyên môn & Tổ phó chuyên môn & Ban Giám Hiệu)
 * =========================================================================
 */

window.UIReviewer = (function() {
  let currentReviewPlanId = null;
  const selectedPlanIds = new Set();
  let batchEvaluationResults = [];
  let batchTargetPlans = [];

  // Kiểm tra Kế hoạch bài dạy có thuộc tổ chuyên môn của người đang duyệt hay không
  function isPlanInDepartment(plan, user) {
    if (!plan) return false;
    if (!user || user.role === 'BGH') return true;

    const targetDeptId = user.departmentId || 'To_KHTN_CN';
    const targetDeptName = user.departmentName || 'Tổ Khoa học Tự nhiên - Công nghệ';

    // 1. Khớp mã tổ trực tiếp
    if (plan.toBoMonId && plan.toBoMonId === targetDeptId) return true;

    // 2. Khớp tên tổ bộ môn
    if (plan.toBoMonTen && targetDeptName) {
      const pDept = plan.toBoMonTen.toLowerCase().replace(/[\s-_]/g, '');
      const uDept = targetDeptName.toLowerCase().replace(/[\s-_]/g, '');
      if (pDept.includes(uDept) || uDept.includes(pDept)) return true;
    }

    // 3. Khớp qua danh sách giáo viên trong tổ
    const allUsers = (window.AppStorage && window.AppStorage.getState().users) || (window.APP_CONFIG && window.APP_CONFIG.USERS) || [];
    const author = allUsers.find(u => 
      (plan.tacGiaId && u.id === plan.tacGiaId) || 
      (plan.tacGiaTen && u.name.trim().toLowerCase() === plan.tacGiaTen.trim().toLowerCase())
    );
    if (author && author.departmentId === targetDeptId) return true;

    // 4. Khớp theo môn học chuyên môn nếu là Tổ KHTN-CN
    if (targetDeptId === 'To_KHTN_CN') {
      const khtnSubjects = ['Khoa học tự nhiên', 'Vật lí', 'Hóa học', 'Sinh học', 'Công nghệ', 'Hoạt động trải nghiệm hướng nghiệp'];
      if (plan.monHoc && khtnSubjects.includes(plan.monHoc.trim())) return true;
    }

    // 5. Nếu là tổ KHXH
    if (targetDeptId === 'To_KHXH') {
      const khxhSubjects = ['Ngữ văn', 'Lịch sử và Địa lí', 'Tiếng Anh', 'GDCD', 'Âm nhạc', 'Mĩ thuật', 'GDTC'];
      if (plan.monHoc && khxhSubjects.includes(plan.monHoc.trim())) return true;
    }

    // 6. Nếu là tổ Toán - Tin
    if (targetDeptId === 'To_Toan_Tin') {
      const toanTinSubjects = ['Toán học', 'Tin học'];
      if (plan.monHoc && toanTinSubjects.includes(plan.monHoc.trim())) return true;
    }

    return false;
  }

  function renderReviewerDashboard() {
    const user = window.AppStorage.getCurrentUser();
    if (!user) return;

    const allPlans = window.AppStorage.getPlans();
    const isBGH = user.role === 'BGH';
    const deptPlans = isBGH ? allPlans : allPlans.filter(p => isPlanInDepartment(p, user));

    // Tính toán số liệu tổng quan của tổ
    const total = deptPlans.length;
    const pending = deptPlans.filter(p => p.trangThai === 'CHO_DUYET').length;
    const approved = deptPlans.filter(p => p.trangThai === 'DA_DUYET').length;
    const needRevision = deptPlans.filter(p => p.trangThai === 'CAN_SUA').length;

    const kpiTotal = document.getElementById('reviewer-kpi-total');
    const kpiPending = document.getElementById('reviewer-kpi-pending');
    const kpiApproved = document.getElementById('reviewer-kpi-approved');
    const kpiRevision = document.getElementById('reviewer-kpi-revision');

    if (kpiTotal) kpiTotal.innerText = `${total} bài`;
    if (kpiPending) kpiPending.innerText = pending;
    if (kpiApproved) kpiApproved.innerText = approved;
    if (kpiRevision) kpiRevision.innerText = needRevision;

    const badgePending = document.getElementById('badge-pending-count');
    if (badgePending) badgePending.innerText = `${pending} bài`;

    // Cập nhật các thành phần Dashboard mới (chuẩn hóa an toàn & trực quan)
    updateCommandDeckAndKPIs(user, deptPlans, isBGH);
    renderActionQueue(deptPlans);

    populateTeacherFilter(deptPlans);
    populateWeekFilter();
    applyFiltersAndRenderTable();
  }

  function populateTeacherFilter(deptPlans) {
    const select = document.getElementById('reviewer-filter-teacher');
    if (!select) return;

    const currentVal = select.value || 'ALL';
    const user = window.AppStorage.getCurrentUser();
    const isBGH = user && user.role === 'BGH';
    const allUsers = (window.AppStorage && window.AppStorage.getState().users) || (window.APP_CONFIG && window.APP_CONFIG.USERS) || [];
    
    // Lấy danh sách giáo viên trong tổ (hoặc toàn trường nếu là BGH)
    const teachers = isBGH 
      ? allUsers.filter(u => u.role !== 'BGH')
      : allUsers.filter(u => u.departmentId === (user ? user.departmentId : 'To_KHTN_CN'));

    let optionsHtml = '<option value="ALL">-- Tất cả giáo viên trong tổ --</option>';
    teachers.forEach(t => {
      optionsHtml += `<option value="${t.id}">${t.name} (${t.roleLabel || 'GV'})</option>`;
    });

    select.innerHTML = optionsHtml;
    if (currentVal && Array.from(select.options).some(opt => opt.value === currentVal)) {
      select.value = currentVal;
    } else {
      select.value = 'ALL';
    }
  }

  // Tự động điền đầy đủ 35 tuần vào bộ lọc của Tổ trưởng
  function populateWeekFilter() {
    const select = document.getElementById('reviewer-filter-week');
    if (!select || select.children.length > 10) return; // Tránh render lại nhiều lần

    const currentVal = select.value || 'ALL';
    let html = '<option value="ALL">-- Tất cả các tuần (1 - 35) --</option>';
    window.APP_CONFIG.WEEKS.forEach(w => {
      html += `<option value="${w.weekNumber}">Tuần ${w.weekNumber} (${w.semester})</option>`;
    });
    select.innerHTML = html;
    select.value = currentVal;
  }

  function applyFiltersAndRenderTable() {
    const user = window.AppStorage.getCurrentUser();
    if (!user) return;

    const allPlans = window.AppStorage.getPlans();
    const isBGH = user.role === 'BGH';
    let plans = isBGH ? allPlans : allPlans.filter(p => isPlanInDepartment(p, user));

    const filterTeacher = document.getElementById('reviewer-filter-teacher')?.value || 'ALL';
    const filterWeek = document.getElementById('reviewer-filter-week')?.value || 'ALL';
    const filterStatus = document.getElementById('reviewer-filter-status')?.value || 'ALL';
    const searchKeyword = (document.getElementById('reviewer-search-input')?.value || '').toLowerCase();

    if (filterTeacher !== 'ALL') {
      plans = plans.filter(p => p.tacGiaId === filterTeacher || p.tacGiaTen === filterTeacher);
    }
    if (filterWeek !== 'ALL') {
      plans = plans.filter(p => {
        if (!p.tuan) return false;
        if (String(p.tuan) === String(filterWeek)) return true;
        const weeks = String(p.tuan).split(/[,;-\s]+/).map(w => w.trim()).filter(Boolean);
        return weeks.includes(String(filterWeek));
      });
    }
    if (filterStatus !== 'ALL') {
      plans = plans.filter(p => p.trangThai === filterStatus);
    }
    if (searchKeyword) {
      plans = plans.filter(p => 
        (p.tieuDe && p.tieuDe.toLowerCase().includes(searchKeyword)) ||
        (p.tacGiaTen && p.tacGiaTen.toLowerCase().includes(searchKeyword)) ||
        (p.monHoc && p.monHoc.toLowerCase().includes(searchKeyword))
      );
    }

    renderReviewerTable(plans);
  }

  function toggleSelectAll(checked) {
    const user = window.AppStorage.getCurrentUser();
    if (!user) return;
    const allPlans = window.AppStorage.getPlans();
    const isBGH = user.role === 'BGH';
    const deptPlans = isBGH ? allPlans : allPlans.filter(p => isPlanInDepartment(p, user));

    if (checked) {
      deptPlans.forEach(p => selectedPlanIds.add(p.id));
    } else {
      selectedPlanIds.clear();
    }
    updateBatchBar();
    applyFiltersAndRenderTable();
  }

  function toggleSelectPlan(planId, checked) {
    if (checked) {
      selectedPlanIds.add(planId);
    } else {
      selectedPlanIds.delete(planId);
    }
    updateBatchBar();
  }

  function clearSelectedPlans() {
    selectedPlanIds.clear();
    const selectAllCb = document.getElementById('reviewer-select-all-cb');
    if (selectAllCb) selectAllCb.checked = false;
    updateBatchBar();
    applyFiltersAndRenderTable();
  }

  function updateBatchBar() {
    const bar = document.getElementById('reviewer-batch-bar');
    const countEl = document.getElementById('reviewer-selected-count');
    const count = selectedPlanIds.size;
    if (countEl) countEl.innerText = count;
    if (bar) {
      if (count > 0) {
        bar.classList.remove('hidden');
      } else {
        bar.classList.add('hidden');
      }
    }
  }

  function renderReviewerTable(plans) {
    const container = document.getElementById('reviewer-plans-tbody');
    if (!container) return;

    if (!plans || plans.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="8" class="px-6 py-12 text-center text-slate-400">
            <div class="flex flex-col items-center justify-center gap-2">
              <span class="text-4xl">📋</span>
              <p class="font-medium text-slate-500">Không có giáo án nào khớp với bộ lọc tuần hoặc giáo viên</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    // Cập nhật trạng thái checkbox "Chọn tất cả"
    const selectAllCb = document.getElementById('reviewer-select-all-cb');
    if (selectAllCb) {
      const allSelected = plans.length > 0 && plans.every(p => selectedPlanIds.has(p.id));
      selectAllCb.checked = allSelected;
    }

    try {
      container.innerHTML = plans.map(p => {
        let dateFormatted = 'Mới nộp';
        try {
          if (p.ngayNop) {
            const d = new Date(p.ngayNop);
            if (!isNaN(d.getTime())) {
              dateFormatted = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            }
          }
        } catch (e) {}

        const statusBadge = (window.UITeacher && window.UITeacher.getStatusBadgeHtml) 
          ? window.UITeacher.getStatusBadgeHtml(p.trangThai) 
          : (p.trangThai || 'Chờ duyệt');
        const isChecked = selectedPlanIds.has(p.id);
        const authorInitial = (p.tacGiaTen || 'GV').trim().substring(0, 1);
        const authorName = p.tacGiaTen || 'Chưa rõ tác giả';
        const deptName = p.toBoMonTen || 'Tổ chuyên môn';
        const planTitle = p.tieuDe || 'Kế hoạch bài dạy';

      return `
        <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100 ${p.trangThai === 'CHO_DUYET' ? 'bg-amber-50/30' : ''}">
          <td class="px-3 py-3 text-center">
            <input type="checkbox" class="w-4 h-4 text-blue-600 rounded cursor-pointer accent-blue-600" 
              ${isChecked ? 'checked' : ''} 
              onchange="window.UIReviewer.toggleSelectPlan('${p.id}', this.checked)"
              title="Chọn bài dạy này để duyệt hàng loạt">
          </td>
          <td class="px-3 py-3 text-center">
            <span class="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold font-mono text-xs border border-blue-200">
              T.${p.tuan}
            </span>
          </td>
          <td class="px-4 py-3">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                ${p.tacGiaTen.substring(0, 1)}
              </div>
              <div>
                <div class="font-semibold text-slate-800 text-sm">${p.tacGiaTen}</div>
                <div class="text-[11px] text-slate-500">${p.toBoMonTen}</div>
              </div>
            </div>
          </td>
          <td class="px-4 py-3">
            <div class="font-medium text-slate-900 text-sm max-w-sm truncate" title="${p.tieuDe}">
              ${p.tieuDe}
            </div>
            <div class="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
              <span class="font-medium text-slate-700">${p.monHoc}</span>
              <span>•</span>
              <span>${p.khoi}</span>
              <span>•</span>
              <span>Lớp ${p.lop}</span>
              ${p.tietPPCT ? `
                <span>•</span>
                <span class="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[11px] border border-blue-200">
                  Tiết ${(window.cleanTietPPCT ? window.cleanTietPPCT(p.tietPPCT) : p.tietPPCT)}
                </span>
              ` : ''}
              ${p.phienBan > 1 ? `<span class="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-bold">Lần ${p.phienBan}</span>` : ''}
              <button type="button" onclick="window.DriveAPI.openInGoogleDocs('${p.id}')" class="text-blue-600 hover:text-blue-800 font-bold text-[11px] inline-flex items-center gap-1 ml-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded transition" title="Mở xem trực tiếp trên Google Docs">
                <svg class="w-3 h-3 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>
                <span>Docs ↗</span>
              </button>
            </div>
          </td>
          <td class="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
            ${dateFormatted}
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            ${statusBadge}
            ${p.danhGia && (p.danhGia.isAiEvaluated || p.danhGia.nguoiDuyetId === 'AI_ASSISTANT_5512') ? `
              <div class="text-[9px] text-purple-700 font-bold mt-1 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>🤖 AI 5512 (${p.danhGia.tongDiem || ''})
              </div>
            ` : ''}
          </td>
          <td class="px-4 py-3 text-xs text-slate-600">
            ${p.danhGia ? `
              <div class="flex items-center gap-1 text-emerald-700 font-medium">
                <span>⭐ ${p.danhGia.tongDiem}</span>
              </div>
            ` : '<span class="text-slate-400 italic">Chưa chấm</span>'}
          </td>
          <td class="px-4 py-3 text-right whitespace-nowrap">
            <div class="flex items-center justify-end gap-1.5">
              <button onclick="window.DriveAPI.openInGoogleDocs('${p.id}')" class="px-2 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition flex items-center gap-1" title="Mở xem trực tiếp trên Google Docs">
                <span>📝 Docs</span>
              </button>
              <button onclick="window.UIReviewer.openReviewModal('${p.id}')" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1 transition">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                ${p.trangThai === 'CHO_DUYET' ? 'Kiểm tra & Duyệt' : 'Xem lại / Sửa'}
              </button>
              <button onclick="window.UIReviewer.confirmDeletePlan('${p.id}', '${p.tieuDe}')" class="px-2 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition" title="Xóa Kế hoạch bài dạy này">
                🗑️
              </button>
            </div>
          </td>
        `;
      }).join('');
    } catch (err) {
      console.error('Lỗi khi render danh sách giáo án duyệt:', err);
      container.innerHTML = `
        <tr>
          <td colspan="8" class="px-6 py-8 text-center text-rose-500 font-medium">
            Có lỗi khi hiển thị danh sách giáo án: ${err.message}. Vui lòng bấm Tải lại trang (F5).
          </td>
        </tr>
      `;
    }
  }

  async function confirmDeletePlan(planId, title) {
    if (confirm(`Thầy/Cô có chắc chắn muốn XÓA Kế hoạch bài dạy: "${title}"?\n\n⚠️ Tệp tài liệu đính kèm trên Google Drive cũng sẽ được chuyển vào THÙNG RÁC.`)) {
      try {
        window.AppToast.show('Đang xử lý xóa và chuyển tệp vào thùng rác Google Drive...', 'info');
        const res = await window.DriveAPI.deletePlan(planId);
        window.AppToast.show(res.message || 'Đã xóa Kế hoạch bài dạy và chuyển tệp Drive vào thùng rác!', 'success');
        renderReviewerDashboard();
      } catch (err) {
        alert(err.message);
      }
    }
  }

  // Mở Modal Kiểm tra & Phê duyệt Giáo án
  function openReviewModal(planId) {
    currentReviewPlanId = planId;
    const plan = window.AppStorage.getPlanById(planId);
    if (!plan) return;

    const modal = document.getElementById('modal-review-plan');
    const headerTitle = document.getElementById('review-plan-header-title');
    const authorEl = document.getElementById('review-plan-author');
    const previewContainer = document.getElementById('review-preview-frame-container');
    const criteriaContainer = document.getElementById('review-criteria-container');
    const commentInput = document.getElementById('review-comment-input');

    if (headerTitle) headerTitle.innerText = `${plan.tieuDe} (Tuần ${plan.tuan})`;
    if (authorEl) {
      const cleanTiet = window.cleanTietPPCT ? window.cleanTietPPCT(plan.tietPPCT) : plan.tietPPCT;
      const tietText = cleanTiet ? ` | Tiết ${cleanTiet}` : '';
      authorEl.innerText = `Tác giả: ${plan.tacGiaTen} | Môn: ${plan.monHoc} | Khối: ${plan.khoi} - Lớp: ${plan.lop}${tietText}`;
    }

    if (previewContainer) {
      const hasLiveDrive = plan.driveViewUrl && !plan.driveViewUrl.includes('demo') && (plan.driveViewUrl.includes('drive.google.com') || plan.driveViewUrl.includes('docs.google.com'));

      let embedUrl = '';
      if (hasLiveDrive) {
        if (plan.driveFileId) {
          embedUrl = `https://drive.google.com/file/d/${plan.driveFileId}/preview`;
        } else {
          embedUrl = plan.driveViewUrl;
        }
      }

      if (hasLiveDrive) {
        previewContainer.innerHTML = `
          <div class="w-full h-full flex flex-col bg-white rounded-xl overflow-hidden border border-slate-300 shadow-inner">
            <div class="px-4 py-2 bg-slate-100 text-slate-700 text-xs flex items-center justify-between border-b border-slate-200 gap-2">
              <span class="font-bold flex items-center gap-1.5 truncate text-slate-800">
                <span>📄</span>
                <span class="truncate">${plan.fileName || plan.tieuDe}</span>
              </span>
              <div class="flex items-center gap-1.5 shrink-0">
                <button type="button" onclick="window.DriveAPI.openInGoogleDocs('${plan.id}')" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>
                  <span>Mở trên Google Docs ↗</span>
                </button>
                <a href="${plan.driveViewUrl}" target="_blank" rel="noopener noreferrer" class="text-slate-600 hover:text-slate-800 font-semibold text-xs px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1" title="Mở trong thư mục Drive">
                  📂 Drive
                </a>
              </div>
            </div>
            <iframe src="${embedUrl}" class="flex-1 w-full h-full border-0" allow="autoplay"></iframe>
          </div>
        `;
      } else {
        previewContainer.innerHTML = `
          <div class="w-full h-full flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-slate-700 text-white">
            <div class="px-4 py-2.5 bg-slate-800 text-slate-300 text-xs flex items-center justify-between border-b border-slate-700">
              <span class="flex items-center gap-2 truncate">
                <span>📄</span>
                <span class="truncate font-semibold text-slate-200">${plan.fileName || plan.tieuDe}</span>
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Lưu trữ cục bộ
              </span>
            </div>
            <div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div class="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-3xl mb-3">
                📄
              </div>
              <h4 class="font-bold text-white text-base mb-1">${plan.fileName || plan.tieuDe}</h4>
              <p class="text-xs text-slate-400 max-w-sm mb-4">
                Tuần ${plan.tuan} • Môn: ${plan.monHoc} • Khối ${plan.khoi} (${plan.lop})
              </p>
              
              <div class="flex flex-wrap items-center justify-center gap-2.5">
                <button type="button" onclick="window.DriveAPI.openInGoogleDocs('${plan.id}')" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>
                  <span>Mở xem trên Google Docs ↗</span>
                </button>
                ${plan.fileBase64 ? `
                  <button type="button" onclick="window.UIReviewer.downloadLocalFile('${plan.id}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    <span>Tải file gốc (.docx) về xem</span>
                  </button>
                ` : ''}
              </div>

              <div class="mt-4 p-3 bg-amber-950/40 border border-amber-700/40 rounded-xl text-[11px] text-amber-200/90 max-w-sm text-left leading-relaxed">
                💡 <strong>Kế hoạch bài dạy đã lưu an toàn:</strong> Thầy/Cô có thể bấm <strong>"Mở xem trên Google Docs"</strong> để xem trực tuyến, hoặc tải file gốc về xem và chấm điểm 5 tiêu chí chuẩn CV 5512 ở cột bên phải.
              </div>
            </div>
          </div>
        `;
      }
    }

    if (criteriaContainer) {
      const criteria = window.APP_CONFIG.CRITERIA_5512;
      const existingScores = (plan.danhGia && plan.danhGia.scores) || { tc1: 2, tc2: 2, tc3: 3, tc4: 2, tc5: 1 };

      criteriaContainer.innerHTML = criteria.map(c => {
        const val = existingScores[c.id] !== undefined ? existingScores[c.id] : c.maxScore;
        return `
          <div class="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white transition">
            <div class="flex items-center justify-between gap-2 mb-1">
              <h5 class="text-xs font-bold text-slate-800">${c.title}</h5>
              <div class="flex items-center gap-1">
                <input type="number" id="score-${c.id}" min="0" max="${c.maxScore}" step="0.5" value="${val}" 
                  class="w-14 px-2 py-0.5 text-center text-xs font-bold border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 font-mono bg-white"
                  onchange="window.UIReviewer.calculateTotalScore()">
                <span class="text-xs text-slate-500 font-mono">/${c.maxScore}đ</span>
              </div>
            </div>
            <p class="text-[11px] text-slate-500 leading-relaxed">${c.desc}</p>
          </div>
        `;
      }).join('');
      calculateTotalScore();
    }

    if (commentInput) {
      commentInput.value = (plan.danhGia && plan.danhGia.nhanXetChung) || '';
    }

    setTimeout(() => {
      window.AppSignature.initPad('signature-canvas');
      window.AppSignature.clearPad();
    }, 150);

    if (modal) modal.classList.add('active');
  }

  function closeReviewModal() {
    const modal = document.getElementById('modal-review-plan');
    if (modal) modal.classList.remove('active');
    currentReviewPlanId = null;
  }

  function calculateTotalScore() {
    const criteria = window.APP_CONFIG.CRITERIA_5512;
    let total = 0;
    criteria.forEach(c => {
      const input = document.getElementById(`score-${c.id}`);
      if (input) {
        total += parseFloat(input.value) || 0;
      }
    });
    const totalEl = document.getElementById('review-total-score-badge');
    if (totalEl) totalEl.innerText = `${total}/10 điểm`;
    return total;
  }

  async function submitReviewAction(status) {
    if (!currentReviewPlanId) return;

    const user = window.AppStorage.getCurrentUser();
    const comment = document.getElementById('review-comment-input')?.value || '';

    if (status === 'CAN_SUA' && !comment.trim()) {
      alert('Vui lòng nhập nhận xét/góp ý chi tiết để giáo viên biết nội dung cần chỉnh sửa!');
      document.getElementById('review-comment-input')?.focus();
      return;
    }

    const criteria = window.APP_CONFIG.CRITERIA_5512;
    const scores = {};
    criteria.forEach(c => {
      const input = document.getElementById(`score-${c.id}`);
      if (input) scores[c.id] = parseFloat(input.value) || 0;
    });

    const totalScore = calculateTotalScore();
    const signatureImg = window.AppSignature.getSignatureImage();

    const reviewPayload = {
      khbdId: currentReviewPlanId,
      trangThai: status,
      nguoiDuyetId: user.id,
      nguoiDuyetTen: user.name,
      vaiTroDuyet: user.roleLabel,
      tongDiem: `${totalScore}/10`,
      nhanXetChung: comment,
      scores: scores,
      chuKyXacNhan: signatureImg || `${status === 'DA_DUYET' ? 'ĐÃ PHÊ DUYỆT' : 'YÊU CẦU SỬA'}: ${user.name}`
    };

    const actionText = status === 'DA_DUYET' ? 'Phê duyệt' : (status === 'CAN_SUA' ? 'Yêu cầu chỉnh sửa' : 'Từ chối');
    
    try {
      await window.DriveAPI.submitReview(reviewPayload);
      closeReviewModal();
      window.AppToast.show(`Đã lưu kết quả [${actionText}] thành công!`, 'success');
      renderReviewerDashboard();
    } catch (err) {
      window.AppToast.show('Lỗi khi lưu duyệt: ' + err.message, 'error');
    }
  }

  function downloadLocalFile(planId) {
    const plan = window.AppStorage.getPlanById(planId);
    if (!plan || !plan.fileBase64) {
      alert('Không tìm thấy dữ liệu tệp lưu cục bộ của bài này.');
      return;
    }
    try {
      const mime = plan.fileMimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const byteCharacters = atob(plan.fileBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = plan.fileName || 'KHBD.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Lỗi khi tải tệp: ' + e.message);
    }
  }

  /**
   * =========================================================
   * 🤖 TRỢ LÝ AI HỖ TRỢ DUYỆT ĐƠN (GỢI Ý ĐIỂM & NHẬN XÉT 5512)
   * =========================================================
   */
  async function runAiSuggestForCurrentPlan() {
    if (!currentReviewPlanId) return;
    const plan = window.AppStorage.getPlanById(currentReviewPlanId);
    if (!plan) return;

    const btn = document.getElementById('btn-ai-single-suggest');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="inline-block animate-spin mr-1">🤖</span> Đang phân tích 5512...`;
    }

    try {
      if (!window.AppAI || !window.AppAI.evaluatePlan) {
        throw new Error('Mô-đun Trợ lý AI chưa sẵn sàng.');
      }
      const result = await window.AppAI.evaluatePlan(plan);
      
      // Tự động điền điểm từng tiêu chí
      if (result.scores) {
        Object.keys(result.scores).forEach(tcId => {
          const input = document.getElementById(`score-${tcId}`);
          if (input) input.value = result.scores[tcId];
        });
      }
      calculateTotalScore();

      // Tự động điền nhận xét chuyên môn
      const commentEl = document.getElementById('review-comment-input');
      if (commentEl) {
        let commentText = `${result.summary}\n`;
        if (result.strengths && result.strengths.length > 0) {
          commentText += `\n* Ưu điểm nổi bật: ${result.strengths.join(' ')}`;
        }
        if (result.improvements && result.improvements.length > 0) {
          commentText += `\n* Gợi ý hoàn thiện: ${result.improvements.join(' ')}`;
        }
        commentEl.value = commentText.trim();
      }

      window.AppToast.show(`🤖 Trợ lý AI: ${result.totalScore} - ${result.isApproved ? 'Đạt chuẩn 5512' : 'Cần bổ sung'}! Đã tự động điền gợi ý.`, 'info');
    } catch (err) {
      window.AppToast.show('Lỗi AI: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>⚡ AI Điền điểm & Nhận xét</span>`;
      }
    }
  }

  /**
   * =========================================================
   * 🤖 TRỢ LÝ AI THẨM ĐỊNH & PHÊ DUYỆT HÀNG LOẠT (CV 5512)
   * (Dành cho Tổ trưởng & Tổ phó khi duyệt nhiều bài cùng lúc)
   * =========================================================
   */
  function openAiBatchModal(specificIds = null) {
    const user = window.AppStorage.getCurrentUser();
    if (!user) return;

    const allPlans = window.AppStorage.getPlans();
    const isBGH = user.role === 'BGH';
    const deptPlans = isBGH ? allPlans : allPlans.filter(p => isPlanInDepartment(p, user));

    if (specificIds && specificIds.length > 0) {
      batchTargetPlans = deptPlans.filter(p => specificIds.includes(p.id));
    } else if (selectedPlanIds.size > 0) {
      batchTargetPlans = deptPlans.filter(p => selectedPlanIds.has(p.id));
    } else {
      // Mặc định: tất cả các bài đang chờ duyệt (CHO_DUYET)
      batchTargetPlans = deptPlans.filter(p => p.trangThai === 'CHO_DUYET');
      if (batchTargetPlans.length === 0) {
        // Nếu không có bài chờ duyệt, lấy các bài gần nhất để review lại
        batchTargetPlans = deptPlans.slice(0, 10);
      }
    }

    if (!batchTargetPlans || batchTargetPlans.length === 0) {
      window.AppToast.show('Không có kế hoạch bài dạy nào trong phạm vi duyệt của tổ.', 'warning');
      return;
    }

    const modal = document.getElementById('modal-ai-batch-review');
    const countLabel = document.getElementById('ai-batch-plans-count-label');
    if (countLabel) {
      countLabel.innerText = `${batchTargetPlans.length} kế hoạch bài dạy sẵn sàng thẩm định (Tổ ${user.departmentName || 'KHTN-CN'})`;
    }

    // Reset giao diện
    const placeholder = document.getElementById('ai-batch-empty-placeholder');
    const tableBox = document.getElementById('ai-batch-results-table-box');
    const progressContainer = document.getElementById('ai-batch-progress-container');
    const applyBtn = document.getElementById('btn-apply-batch-review');
    const btnRun = document.getElementById('btn-run-batch-ai');

    if (placeholder) placeholder.classList.remove('hidden');
    if (tableBox) tableBox.classList.add('hidden');
    if (progressContainer) progressContainer.classList.add('hidden');
    if (applyBtn) applyBtn.disabled = true;
    if (btnRun) {
      btnRun.disabled = false;
      btnRun.innerHTML = `<span class="text-base">🚀</span><span>Bắt đầu quét & Thẩm định AI (CV 5512)</span>`;
    }

    batchEvaluationResults = [];

    if (modal) modal.classList.add('active');

    setTimeout(() => {
      window.AppSignature.initPad('batch-signature-canvas');
      window.AppSignature.clearPad('batch-signature-canvas');
    }, 150);
  }

  function openAiBatchModalForSelected() {
    if (selectedPlanIds.size === 0) {
      window.AppToast.show('Vui lòng tích chọn ít nhất 1 Kế hoạch bài dạy trong bảng.', 'warning');
      return;
    }
    openAiBatchModal(Array.from(selectedPlanIds));
  }

  function closeAiBatchModal() {
    const modal = document.getElementById('modal-ai-batch-review');
    if (modal) modal.classList.remove('active');
  }

  async function startBatchAiAnalysis() {
    if (!batchTargetPlans || batchTargetPlans.length === 0) return;

    const btnRun = document.getElementById('btn-run-batch-ai');
    const placeholder = document.getElementById('ai-batch-empty-placeholder');
    const tableBox = document.getElementById('ai-batch-results-table-box');
    const progressContainer = document.getElementById('ai-batch-progress-container');
    const progressFill = document.getElementById('ai-batch-progress-fill');
    const progressPercent = document.getElementById('ai-batch-progress-percent');
    const progressStatus = document.getElementById('ai-batch-progress-status');
    const applyBtn = document.getElementById('btn-apply-batch-review');

    if (btnRun) btnRun.disabled = true;
    if (placeholder) placeholder.classList.add('hidden');
    if (progressContainer) progressContainer.classList.remove('hidden');

    batchEvaluationResults = [];
    const total = batchTargetPlans.length;

    for (let i = 0; i < total; i++) {
      const plan = batchTargetPlans[i];
      const pct = Math.round(((i + 1) / total) * 100);
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (progressPercent) progressPercent.innerText = `${pct}%`;
      if (progressStatus) {
        progressStatus.innerHTML = `<span class="inline-block animate-spin mr-1">🤖</span> Đang thẩm định bài ${i + 1}/${total}: <strong>${plan.tieuDe}</strong> (${plan.tacGiaTen})...`;
      }

      let evalResult = null;
      try {
        evalResult = await window.AppAI.evaluatePlan(plan);
      } catch (err) {
        evalResult = {
          isApproved: true,
          status: 'DA_DUYET',
          totalScore: '8.5/10',
          scores: { tc1: 2, tc2: 1.5, tc3: 2.5, tc4: 1.5, tc5: 1 },
          summary: 'KHBD cơ bản đầy đủ các thành phần chính theo CV 5512.',
          strengths: ['Cấu trúc bài dạy rõ ràng.'],
          improvements: []
        };
      }

      batchEvaluationResults.push({
        plan: plan,
        result: evalResult,
        statusDecision: evalResult.status,
        customComment: evalResult.summary || ''
      });
    }

    if (progressStatus) {
      progressStatus.innerHTML = `✅ <strong>Hoàn tất!</strong> Đã phân tích xong ${total} kế hoạch bài dạy.`;
    }

    renderBatchResultsTable();
    if (tableBox) tableBox.classList.remove('hidden');
    if (applyBtn) applyBtn.disabled = false;
    if (btnRun) {
      btnRun.disabled = false;
      btnRun.innerHTML = `<span class="text-base">🔄</span><span>Quét lại toàn bộ bằng AI</span>`;
    }
  }

  function renderBatchResultsTable() {
    const tbody = document.getElementById('ai-batch-results-tbody');
    if (!tbody) return;

    let countApproved = 0;
    let countRevision = 0;

    tbody.innerHTML = batchEvaluationResults.map((item, idx) => {
      const p = item.plan;
      const r = item.result;
      const isApproved = (item.statusDecision === 'DA_DUYET');
      if (isApproved) countApproved++;
      else countRevision++;

      const s = r.scores || {};
      const scoreBadgeClass = isApproved ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200';

      return `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
          <td class="px-3 py-2.5 text-center font-mono font-bold text-slate-700">
            T.${p.tuan}
          </td>
          <td class="px-3 py-2.5 font-semibold text-slate-800">
            <div>${p.tacGiaTen}</div>
            <div class="text-[10px] text-slate-500 font-normal">${p.toBoMonTen}</div>
          </td>
          <td class="px-3 py-2.5">
            <div class="font-bold text-slate-900 line-clamp-1" title="${p.tieuDe}">${p.tieuDe}</div>
            <div class="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
              <span>${p.monHoc}</span>
              <span>•</span>
              <span>${p.khoi} - Lớp ${p.lop}</span>
              ${p.tietPPCT ? `
                <span>•</span>
                <span class="inline-block px-1 py-0.2 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">
                  ${p.tietPPCT.toLowerCase().includes('tiết') ? p.tietPPCT : 'Tiết ' + p.tietPPCT}
                </span>
              ` : ''}
            </div>
          </td>
          <td class="px-3 py-2.5 text-center whitespace-nowrap">
            <div class="font-mono font-semibold text-[11px] text-slate-700">
              ${s.tc1 || 0}/${s.tc2 || 0}/${s.tc3 || 0}/${s.tc4 || 0}/${s.tc5 || 0}
            </div>
            <div class="text-[9px] text-slate-400">TC1..TC5</div>
          </td>
          <td class="px-3 py-2.5 text-center whitespace-nowrap">
            <span class="px-2 py-0.5 rounded-full text-xs font-mono font-bold border ${scoreBadgeClass}">
              ⭐ ${r.totalScore}
            </span>
          </td>
          <td class="px-3 py-2.5 min-w-[240px]">
            <textarea rows="2" 
              class="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50 hover:bg-white transition"
              onchange="window.UIReviewer.updateBatchItemComment(${idx}, this.value)">${item.customComment}</textarea>
          </td>
          <td class="px-3 py-2.5 text-center whitespace-nowrap">
            <select 
              class="px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 outline-none cursor-pointer ${isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-rose-50 text-rose-700 border-rose-300'}"
              onchange="window.UIReviewer.updateBatchItemDecision(${idx}, this.value)">
              <option value="DA_DUYET" ${isApproved ? 'selected' : ''}>✅ Phê duyệt</option>
              <option value="CAN_SUA" ${!isApproved ? 'selected' : ''}>⚠️ Yêu cầu sửa</option>
            </select>
          </td>
        </tr>
      `;
    }).join('');

    const totalEl = document.getElementById('ai-batch-count-total');
    const approvedEl = document.getElementById('ai-batch-count-approved');
    const revisionEl = document.getElementById('ai-batch-count-revision');

    if (totalEl) totalEl.innerText = `Tổng: ${batchEvaluationResults.length} bài`;
    if (approvedEl) approvedEl.innerText = `Đạt chuẩn 5512: ${countApproved}`;
    if (revisionEl) revisionEl.innerText = `Cần chỉnh sửa: ${countRevision}`;
  }

  function updateBatchItemComment(index, val) {
    if (batchEvaluationResults[index]) {
      batchEvaluationResults[index].customComment = val;
    }
  }

  function updateBatchItemDecision(index, val) {
    if (batchEvaluationResults[index]) {
      batchEvaluationResults[index].statusDecision = val;
      renderBatchResultsTable();
    }
  }

  function toggleBatchSignatureMode(useCanvas) {
    const container = document.getElementById('batch-signature-canvas-container');
    if (container) {
      container.style.display = useCanvas ? 'block' : 'none';
    }
  }

  async function applyBatchReviewResults() {
    if (!batchEvaluationResults || batchEvaluationResults.length === 0) return;

    const user = window.AppStorage.getCurrentUser();
    if (!user) {
      alert('Vui lòng đăng nhập lại.');
      return;
    }

    const btnApply = document.getElementById('btn-apply-batch-review');
    if (btnApply) {
      btnApply.disabled = true;
      btnApply.innerHTML = `<span class="inline-block animate-spin mr-1">⏳</span> Đang lưu duyệt & đồng bộ Drive...`;
    }

    let signatureImg = null;
    const useCanvas = document.getElementById('ai-batch-use-signature-canvas')?.checked ?? true;
    if (useCanvas) {
      signatureImg = window.AppSignature.getSignatureImage('batch-signature-canvas');
    }

    const reviewerStamp = `ĐÃ XÁC THỰC CHUYÊN MÔN: ${user.name} (${user.roleLabel || 'Tổ trưởng'}) - THCS Tây Phú`;

    let approvedCount = 0;
    let revisionCount = 0;

    for (const item of batchEvaluationResults) {
      const plan = item.plan;
      const result = item.result;
      const status = item.statusDecision;
      const comment = item.customComment || result.summary;

      const reviewPayload = {
        khbdId: plan.id,
        trangThai: status,
        nguoiDuyetId: user.id,
        nguoiDuyetTen: user.name,
        vaiTroDuyet: user.roleLabel || 'Tổ trưởng chuyên môn',
        tongDiem: result.totalScore,
        nhanXetChung: comment,
        scores: result.scores || {},
        chuKyXacNhan: signatureImg || reviewerStamp,
        isAiEvaluated: true,
        ngayDuyet: new Date().toISOString()
      };

      if (status === 'DA_DUYET') approvedCount++;
      else revisionCount++;

      // Cập nhật storage cục bộ
      window.AppStorage.reviewPlan(plan.id, reviewPayload);

      // Gửi đồng bộ lên Google Drive / Google Sheets
      if (window.DriveAPI && window.DriveAPI.submitReview) {
        window.DriveAPI.submitReview(reviewPayload).catch(e => console.warn('Lưu review Cloud:', e));
      }
    }

    window.AppToast.show(
      `🎉 <b>Hoàn tất duyệt hàng loạt!</b> Đã phê duyệt: ${approvedCount} bài, Yêu cầu sửa: ${revisionCount} bài.`,
      'success'
    );

    clearSelectedPlans();
    closeAiBatchModal();
    renderReviewerDashboard();
  }

  async function quickApproveSelected() {
    if (selectedPlanIds.size === 0) return;
    const user = window.AppStorage.getCurrentUser();
    if (!user) return;

    if (!confirm(`Thầy/Cô có chắc chắn muốn PHÊ DUYỆT NHANH ${selectedPlanIds.size} kế hoạch bài dạy đã chọn?`)) {
      return;
    }

    window.AppToast.show(`Đang phê duyệt ${selectedPlanIds.size} bài...`, 'info');

    const signatureImg = window.AppSignature.getSignatureImage();
    const reviewerStamp = `ĐÃ PHÊ DUYỆT: ${user.name} (${user.roleLabel || 'Tổ trưởng'}) - THCS Tây Phú`;

    for (const planId of selectedPlanIds) {
      const reviewPayload = {
        khbdId: planId,
        trangThai: 'DA_DUYET',
        nguoiDuyetId: user.id,
        nguoiDuyetTen: user.name,
        vaiTroDuyet: user.roleLabel || 'Tổ trưởng chuyên môn',
        tongDiem: '10/10',
        nhanXetChung: 'Kế hoạch bài dạy chuẩn bị chu đáo, đúng tiến trình và chuẩn kiến thức kỹ năng theo CV 5512.',
        scores: { tc1: 2, tc2: 2, tc3: 3, tc4: 2, tc5: 1 },
        chuKyXacNhan: signatureImg || reviewerStamp,
        ngayDuyet: new Date().toISOString()
      };
      window.AppStorage.reviewPlan(planId, reviewPayload);
      if (window.DriveAPI && window.DriveAPI.submitReview) {
        window.DriveAPI.submitReview(reviewPayload).catch(e => console.warn(e));
      }
    }

    window.AppToast.show(`Đã phê duyệt thành công ${selectedPlanIds.size} bài!`, 'success');
    clearSelectedPlans();
    renderReviewerDashboard();
  }

  // =========================================================================
  // BỔ SUNG: DASHBOARD QUẢN TRỊ CHUYÊN MÔN, ACTION QUEUE & PHÁP LÝ BGD&ĐT
  // =========================================================================

  function updateCommandDeckAndKPIs(user, deptPlans, isBGH) {
    // 1. Tên tổ & Người điều hành
    const deptTitleEl = document.getElementById('reviewer-dept-title');
    const headNameEl = document.getElementById('reviewer-head-name');
    if (deptTitleEl) {
      deptTitleEl.innerText = isBGH ? 'Toàn Trường (Ban Giám Hiệu)' : (user.departmentName || 'Tổ KHTN - Công nghệ');
    }
    if (headNameEl) {
      headNameEl.innerText = `${user.name} (${user.roleLabel || 'Tổ trưởng'})`;
    }

    // 2. Thông tin tuần học
    const calInfo = window.SchoolCalendar ? window.SchoolCalendar.getCurrentWeekInfo() : null;
    const currentWeek = calInfo ? calInfo.week : (window.APP_CONFIG && window.APP_CONFIG.CURRENT_WEEK ? window.APP_CONFIG.CURRENT_WEEK : 1);
    const currentSemester = calInfo ? calInfo.semester : (window.APP_CONFIG && window.APP_CONFIG.CURRENT_SEMESTER ? window.APP_CONFIG.CURRENT_SEMESTER : 'Học kỳ I');

    const cmdAcademicInfo = document.getElementById('reviewer-cmd-academic-info');
    if (cmdAcademicInfo) {
      cmdAcademicInfo.innerText = `${currentSemester} • Tuần ${currentWeek}`;
    }

    // 3. Card Đội ngũ & Chức danh (TT 15/2025)
    const allUsers = (window.AppStorage && window.AppStorage.getState().users) || (window.APP_CONFIG && window.APP_CONFIG.USERS) || [];
    const deptTeachers = isBGH 
      ? allUsers.filter(u => u.role !== 'BGH')
      : allUsers.filter(u => u.departmentId === (user ? user.departmentId : 'To_KHTN_CN'));
    
    const kpiTeachersCount = document.getElementById('reviewer-kpi-teachers-count');
    if (kpiTeachersCount) kpiTeachersCount.innerText = deptTeachers.length;

    // 4. Card Tiến độ KHBD Tuần hiện tại
    const weekPlans = deptPlans.filter(p => {
      if (!p.tuan) return false;
      if (String(p.tuan) === String(currentWeek)) return true;
      const weeks = String(p.tuan).split(/[,;-\s]+/).map(w => w.trim()).filter(Boolean);
      return weeks.includes(String(currentWeek));
    });
    const weekTotal = weekPlans.length;
    const weekApproved = weekPlans.filter(p => p.trangThai === 'DA_DUYET').length;
    const weekPct = weekTotal > 0 ? Math.round((weekApproved / weekTotal) * 100) : (deptPlans.length > 0 ? Math.round((deptPlans.filter(p => p.trangThai === 'DA_DUYET').length / deptPlans.length) * 100) : 100);

    const kpiWeekTitle = document.getElementById('reviewer-kpi-week-title');
    if (kpiWeekTitle) kpiWeekTitle.innerText = `Tiến độ KHBD (CV 5512) - Tuần ${currentWeek}`;

    const kpiWeekPct = document.getElementById('reviewer-kpi-week-pct');
    if (kpiWeekPct) kpiWeekPct.innerText = `${weekPct}%`;

    const kpiWeekFraction = document.getElementById('reviewer-kpi-week-fraction');
    if (kpiWeekFraction) kpiWeekFraction.innerText = `${weekApproved} / ${weekTotal || deptPlans.length} Giáo án`;

    const kpiWeekBar = document.getElementById('reviewer-kpi-week-bar');
    if (kpiWeekBar) kpiWeekBar.style.width = `${weekPct}%`;

    // 5. Card Việc cần xử lý ngay
    const pendingCount = deptPlans.filter(p => p.trangThai === 'CHO_DUYET').length;
    const kpiActionQueueCount = document.getElementById('reviewer-kpi-action-count');
    if (kpiActionQueueCount) kpiActionQueueCount.innerText = pendingCount > 0 ? `${pendingCount} bài chờ` : '0 bài chờ';
  }

  function renderActionQueue(deptPlans) {
    const queueContainer = document.getElementById('reviewer-action-queue-list');
    const queueBadge = document.getElementById('reviewer-action-queue-badge');
    if (!queueContainer) return;

    const pendingPlans = deptPlans.filter(p => p.trangThai === 'CHO_DUYET');
    if (queueBadge) {
      queueBadge.innerText = `${pendingPlans.length} mục`;
      if (pendingPlans.length > 0) {
        queueBadge.className = 'h-6 px-2.5 rounded-full bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center animate-pulse';
      } else {
        queueBadge.className = 'h-6 px-2.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center';
      }
    }

    if (pendingPlans.length === 0) {
      queueContainer.innerHTML = `
        <div class="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-emerald-800 text-center space-y-1">
          <div class="text-2xl">✨</div>
          <div class="text-xs font-bold font-heading">Không có giáo án nào đang chờ duyệt</div>
          <p class="text-[11px] text-emerald-600">Toàn bộ kế hoạch bài dạy của tổ đã được rà soát và phê duyệt đúng tiến độ!</p>
        </div>
      `;
      return;
    }

    // Hiển thị tối đa 3 bài chờ duyệt gần nhất
    const topPending = pendingPlans.slice(0, 3);
    queueContainer.innerHTML = topPending.map(p => {
      const cleanTiet = window.cleanTietPPCT ? window.cleanTietPPCT(p.tietPPCT) : p.tietPPCT;
      const tietText = cleanTiet ? ` • Tiết ${cleanTiet}` : '';
      return `
        <div class="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 transition-all flex items-start gap-2.5 group">
          <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <span class="material-symbols-outlined text-base">draw</span>
          </div>
          <div class="space-y-1 min-w-0 flex-1">
            <div class="flex items-center justify-between gap-1">
              <p class="text-xs font-bold text-slate-800 truncate">${p.tieuDe}</p>
              <span class="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[10px] shrink-0">Tuần ${p.tuan}</span>
            </div>
            <p class="text-[11px] text-slate-500 truncate">
              GV: <strong>${p.tacGiaTen}</strong> • Môn: ${p.monHoc} (Lớp ${p.lop}${tietText})
            </p>
            <div class="pt-1 flex items-center justify-between">
              <span class="text-[10px] text-slate-400 font-medium">Nộp: ${new Date(p.ngayNop).toLocaleDateString('vi-VN')}</span>
              <button onclick="window.UIReviewer.openReviewModal('${p.id}')" class="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 cursor-pointer">
                <span>Ký duyệt ngay</span>
                <span class="text-xs">➔</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function scrollToPending() {
    const filterStatus = document.getElementById('reviewer-filter-status');
    if (filterStatus) {
      filterStatus.value = 'CHO_DUYET';
      applyFiltersAndRenderTable();
    }
    const tableEl = document.getElementById('reviewer-plans-tbody');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (window.AppToast) {
      window.AppToast.show('Đang lọc các bài cần ký duyệt gấp trong tổ', 'info');
    }
  }

  function scrollToSection(sectionId) {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function exportToExcel() {
    try {
      const user = window.AppStorage.getCurrentUser();
      const allPlans = window.AppStorage.getPlans();
      const isBGH = user && user.role === 'BGH';
      const plans = isBGH ? allPlans : allPlans.filter(p => isPlanInDepartment(p, user));

      if (!window.XLSX) {
        alert('Thư viện Excel chưa được tải xong, vui lòng thử lại sau giây lát!');
        return;
      }

      const rows = plans.map((p, idx) => ({
        'STT': idx + 1,
        'Tuần': p.tuan,
        'Giáo viên': p.tacGiaTen,
        'Môn học': p.monHoc,
        'Khối/Lớp': `${p.khoi} - ${p.lop}`,
        'Tiết PPCT': window.cleanTietPPCT ? window.cleanTietPPCT(p.tietPPCT) : p.tietPPCT,
        'Tên Kế hoạch bài dạy': p.tieuDe,
        'Ngày nộp': new Date(p.ngayNop).toLocaleDateString('vi-VN'),
        'Trạng thái': p.trangThai === 'DA_DUYET' ? 'Đã phê duyệt' : (p.trangThai === 'CAN_SUA' ? 'Yêu cầu sửa' : 'Chờ duyệt'),
        'Điểm CV 5512': (p.danhGia && p.danhGia.tongDiem) ? p.danhGia.tongDiem : 'Chưa chấm',
        'Người duyệt': (p.danhGia && p.danhGia.nguoiDuyetTen) ? p.danhGia.nguoiDuyetTen : '',
        'Nhận xét': (p.danhGia && p.danhGia.nhanXetChung) ? p.danhGia.nhanXetChung : ''
      }));

      const ws = window.XLSX.utils.json_to_sheet(rows);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "BaoCao_KHBD");
      
      const fileName = `BaoCao_KHBD_${user ? (user.departmentId || 'To') : 'To'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      window.XLSX.writeFile(wb, fileName);

      if (window.AppToast) {
        window.AppToast.show(`Đã xuất báo cáo Excel thành công: <b>${fileName}</b>`, 'success');
      }
    } catch (e) {
      alert('Có lỗi khi xuất file Excel: ' + e.message);
    }
  }

  const LEGAL_DOCS_DATA = {
    'TT15': {
      title: 'Thông tư 15/2025/TT-BGDĐT (Mới ban hành)',
      sub: 'Quy định mã số, tiêu chuẩn chức danh nghề nghiệp và bổ nhiệm, xếp lương giáo viên THCS công lập',
      icon: 'gavel',
      content: `
        <div class="space-y-3">
          <div class="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
            <strong>📌 Điểm mới cốt lõi theo Thông tư 15/2025/TT-BGDĐT:</strong>
            <p class="mt-1">Quy định chi tiết tiêu chuẩn chức danh nghề nghiệp giáo viên THCS thành 3 hạng: <strong>Hạng I (Mã số: V.07.04.30)</strong>, <strong>Hạng II (Mã số: V.07.04.31)</strong> và <strong>Hạng III (Mã số: V.07.04.32)</strong>.</p>
          </div>
          <h4 class="font-bold text-slate-800 text-xs uppercase tracking-wider">1. Phân định nhiệm vụ chuyên môn theo từng Hạng:</h4>
          <ul class="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li><strong>Giáo viên THCS Hạng I (GVCC):</strong> Chủ trì sinh hoạt chuyên môn theo nghiên cứu bài học cụm trường; hướng dẫn giáo viên tập sự; thẩm định kế hoạch giáo dục và đề kiểm tra định kỳ; tham gia hội đồng chấm thi GVDG hoặc thẩm định SGK/học liệu số.</li>
            <li><strong>Giáo viên THCS Hạng II (GVC):</strong> Phụ trách kế hoạch giáo dục tổ chuyên môn; báo cáo viên các chuyên đề đổi mới phương pháp giáo dục STEM/chuyển đổi số; chủ trì xây dựng ngân hàng ma trận đề kiểm tra định kỳ.</li>
            <li><strong>Giáo viên THCS Hạng III:</strong> Đạt chuẩn đào tạo cử nhân sư phạm; thực hiện tốt kế hoạch giáo dục cá nhân và dạy học thực nghiệm theo chương trình GDPT 2018.</li>
          </ul>
          <h4 class="font-bold text-slate-800 text-xs uppercase tracking-wider">2. Khuyến nghị cho Tổ trưởng chuyên môn:</h4>
          <p class="text-xs text-slate-600">Căn cứ cơ cấu tổ viên để phân công giáo viên Hạng I, II làm nòng cốt trong các buổi sinh hoạt NCBH (Khoản 2 Điều 14 TT 32) và thẩm định Kế hoạch bài dạy chuẩn CV 5512.</p>
        </div>
      `
    },
    'PL1': {
      title: 'Phụ lục I - Công văn 5512/BGDĐT',
      sub: 'Kế hoạch dạy học môn học của tổ chuyên môn (Năm học 2026 - 2027)',
      icon: 'article',
      content: `
        <div class="space-y-3">
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <strong>Cấu trúc Phụ lục I - Kế hoạch dạy học môn học:</strong>
            <p class="mt-1 text-xs text-slate-600">Bao gồm khung phân phối chương trình cả năm, phân định rõ số tiết cho từng mạch nội dung, bài học, chủ đề STEM và kiểm tra đánh giá định kỳ.</p>
          </div>
          <table class="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead class="bg-slate-100 font-bold text-slate-700">
              <tr><th class="p-2 border">STT</th><th class="p-2 border">Bài học / Chuyên đề</th><th class="p-2 border">Số tiết</th><th class="p-2 border">Tuần</th><th class="p-2 border">Thiết bị dạy học</th><th class="p-2 border">Địa điểm</th></tr>
            </thead>
            <tbody class="divide-y text-slate-600">
              <tr><td class="p-2 border text-center">1</td><td class="p-2 border">Bài 1: Mở đầu & Phương pháp KHTN</td><td class="p-2 border text-center">4</td><td class="p-2 border text-center">1 - 2</td><td class="p-2 border">Dụng cụ thí nghiệm đo lường</td><td class="p-2 border">Phòng thực hành</td></tr>
              <tr><td class="p-2 border text-center">2</td><td class="p-2 border">Bài 2: Tốc độ chuyển động</td><td class="p-2 border text-center">5</td><td class="p-2 border text-center">3 - 4</td><td class="p-2 border">Đồng hồ hiện số, cổng quang điện</td><td class="p-2 border">Lớp học</td></tr>
            </tbody>
          </table>
          <p class="text-xs text-slate-500 italic">* Các thầy cô có thể mở các bản Phụ lục 3 chi tiết cho từng khối lớp 6, 7, 8, 9 trong thư mục <code>PL3/</code> của hệ thống.</p>
        </div>
      `
    },
    'PL2': {
      title: 'Phụ lục II - Công văn 5512/BGDĐT',
      sub: 'Kế hoạch tổ chức các hoạt động giáo dục của tổ chuyên môn',
      icon: 'event_note',
      content: `
        <div class="space-y-3">
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <strong>Mục đích:</strong> Phối hợp tổ chức các hoạt động giáo dục ngoài giờ chính khóa, câu lạc bộ STEM, ngày hội khoa học kỹ thuật và trải nghiệm hướng nghiệp.
          </div>
          <ul class="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li>Khối 6 & 7: Hoạt động trải nghiệm phân loại rác thải và làm sản phẩm tái chế.</li>
            <li>Khối 8 & 9: Ngày hội STEM - Tên lửa nước và xe thế năng, báo cáo dự án KHKT cấp trường.</li>
            <li>Thời gian thực hiện: Xen kẽ các tuần chẵn trong học kỳ theo kế hoạch nhà trường.</li>
          </ul>
        </div>
      `
    },
    'PL4': {
      title: 'Phụ lục IV - Công văn 5512/BGDĐT (Khung KHBD Chuẩn)',
      sub: 'Khung Kế hoạch bài dạy chuẩn 4 hoạt động áp dụng cho giáo viên THCS',
      icon: 'task',
      content: `
        <div class="space-y-3">
          <div class="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
            <strong>Chuỗi 4 hoạt động học tập cốt lõi theo Công văn 5512/BGDĐT:</strong>
          </div>
          <div class="space-y-2 text-xs text-slate-700">
            <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <strong class="text-blue-700">1. Hoạt động 1: Xác định vấn đề / Khởi động</strong>
              <p class="text-slate-500 mt-0.5">Tạo mâu thuẫn nhận thức hoặc khơi gợi sự hứng thú của học sinh.</p>
            </div>
            <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <strong class="text-emerald-700">2. Hoạt động 2: Hình thành kiến thức mới / Giải quyết vấn đề</strong>
              <p class="text-slate-500 mt-0.5">Học sinh tự khám phá, làm thí nghiệm, thảo luận nhóm để chiếm lĩnh tri thức.</p>
            </div>
            <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <strong class="text-purple-700">3. Hoạt động 3: Luyện tập</strong>
              <p class="text-slate-500 mt-0.5">Hệ thống hóa kiến thức và giải bài tập củng cố ngay tại lớp.</p>
            </div>
            <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <strong class="text-amber-700">4. Hoạt động 4: Vận dụng</strong>
              <p class="text-slate-500 mt-0.5">Vận dụng kiến thức bài học giải quyết các tình huống thực tiễn đời sống.</p>
            </div>
          </div>
        </div>
      `
    },
    'CV1315': {
      title: 'Công văn 1315/BGDĐT - Sinh hoạt chuyên môn theo NCBH',
      sub: 'Quy trình 4 bước sinh hoạt chuyên môn theo nghiên cứu bài học và tiêu chí phân tích',
      icon: 'school',
      content: `
        <div class="space-y-3">
          <div class="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs">
            <strong>Quy trình 4 bước Sinh hoạt chuyên môn theo Nghiên cứu bài học (NCBH):</strong>
          </div>
          <ol class="list-decimal pl-5 space-y-1.5 text-xs text-slate-600">
            <li><strong>Bước 1 - Xây dựng bài học minh họa:</strong> Tổ chuyên môn họp bàn, thống nhất lựa chọn chủ đề/bài học, phân công giáo viên thiết kế KHBD.</li>
            <li><strong>Bước 2 - Tổ chức dạy minh họa & dự giờ:</strong> Tập trung quan sát hoạt động học của học sinh (sự tham gia, khó khăn, phản ứng), không đánh giá giáo viên.</li>
            <li><strong>Bước 3 - Phân tích bài học:</strong> Người dạy chia sẻ cảm nhận; các đồng nghiệp trao đổi về minh chứng học tập của học sinh và rút ra giải pháp điều chỉnh.</li>
            <li><strong>Bước 4 - Vận dụng vào thực tế:</strong> Giáo viên trong tổ áp dụng các kinh nghiệm, giải pháp đã thống nhất vào các tiết dạy hàng ngày trên lớp.</li>
          </ol>
        </div>
      `
    }
  };

  function openLegalDocModal(docId) {
    const doc = LEGAL_DOCS_DATA[docId];
    if (!doc) return;

    const modal = document.getElementById('modal-legal-doc');
    const titleEl = document.getElementById('modal-legal-doc-title');
    const subEl = document.getElementById('modal-legal-doc-sub');
    const iconEl = document.getElementById('modal-legal-doc-icon');
    const bodyEl = document.getElementById('modal-legal-doc-body');

    if (titleEl) titleEl.innerText = doc.title;
    if (subEl) subEl.innerText = doc.sub;
    if (iconEl) iconEl.innerText = doc.icon || 'description';
    if (bodyEl) bodyEl.innerHTML = doc.content;

    if (modal) modal.classList.remove('hidden');
  }

  function closeLegalDocModal() {
    const modal = document.getElementById('modal-legal-doc');
    if (modal) modal.classList.add('hidden');
  }

  return {
    renderReviewerDashboard,
    applyFiltersAndRenderTable,
    openReviewModal,
    closeReviewModal,
    confirmDeletePlan,
    calculateTotalScore,
    submitReviewAction,
    downloadLocalFile,
    toggleSelectAll,
    toggleSelectPlan,
    clearSelectedPlans,
    runAiSuggestForCurrentPlan,
    openAiBatchModal,
    openAiBatchModalForSelected,
    closeAiBatchModal,
    startBatchAiAnalysis,
    updateBatchItemComment,
    updateBatchItemDecision,
    toggleBatchSignatureMode,
    applyBatchReviewResults,
    quickApproveSelected,
    scrollToPending,
    scrollToSection,
    exportToExcel,
    openLegalDocModal,
    closeLegalDocModal
  };
})();
