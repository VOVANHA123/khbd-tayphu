/**
 * =========================================================================
 * DRIVE-API.JS - GIAO TIẾP VỚI GOOGLE APPS SCRIPT WEB APP (GOOGLE DRIVE & SHEETS)
 * =========================================================================
 */

window.DriveAPI = (function() {

  /**
   * Chuyển đổi File đối tượng trình duyệt sang Base64
   * Hỗ trợ 4 cơ chế đọc an toàn:
   * 1. file.arrayBuffer() (Native Promise, bỏ qua lỗi NotReadableError trên Android SAF)
   * 2. file.slice().arrayBuffer() (Tách khỏi lock của Android Content Provider)
   * 3. FileReader.readAsArrayBuffer()
   * 4. FileReader.readAsDataURL()
   */
  async function fileToBase64(file) {
    if (!file) {
      throw new Error('Tệp không tồn tại hoặc chưa được chọn');
    }

    // Giới hạn an toàn dung lượng (25MB) tránh tràn RAM trên điện thoại
    const MAX_SIZE_MB = 25;
    if (file.size && file.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new Error(`Tệp có dung lượng ${(file.size / 1024 / 1024).toFixed(1)}MB, vượt quá giới hạn (${MAX_SIZE_MB}MB). Thầy/Cô vui lòng nén hoặc giảm dung lượng trước khi nộp.`);
    }

    // Hàm chuyển đổi ArrayBuffer sang Base64 an toàn cho mọi trình duyệt
    function arrayBufferToBase64(buffer) {
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      let binary = '';
      const CHUNK_SIZE = 32768; // 32KB
      for (let i = 0; i < len; i += CHUNK_SIZE) {
        const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
        binary += String.fromCharCode.apply(null, chunk);
      }
      return btoa(binary);
    }

    // CHIẾN LƯỢC 1: Dùng Blob.prototype.arrayBuffer() (Tương thích Android 10+, không bị kẹt bởi ContentProvider lock)
    if (typeof file.arrayBuffer === 'function') {
      try {
        const buffer = await file.arrayBuffer();
        if (buffer && buffer.byteLength > 0) {
          return {
            base64: arrayBufferToBase64(buffer),
            mimeType: file.type || 'application/octet-stream',
            fileName: file.name,
            size: file.size
          };
        }
      } catch (e1) {
        console.warn('file.arrayBuffer() không đọc được, chuyển chiến lược 2:', e1);
      }
    }

    // CHIẾN LƯỢC 2: Thử file.slice().arrayBuffer() (Tạo bản snapshot dữ liệu không qua lock)
    if (typeof file.slice === 'function') {
      try {
        const sliced = file.slice(0, file.size);
        if (typeof sliced.arrayBuffer === 'function') {
          const buffer = await sliced.arrayBuffer();
          if (buffer && buffer.byteLength > 0) {
            return {
              base64: arrayBufferToBase64(buffer),
              mimeType: file.type || 'application/octet-stream',
              fileName: file.name,
              size: file.size
            };
          }
        }
      } catch (e2) {
        console.warn('file.slice().arrayBuffer() không đọc được, chuyển chiến lược 3:', e2);
      }
    }

    // CHIẾN LƯỢC 3: FileReader đọc readAsArrayBuffer
    try {
      const buffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('FileReader ArrayBuffer lỗi'));
        reader.readAsArrayBuffer(file);
      });
      if (buffer && buffer.byteLength > 0) {
        return {
          base64: arrayBufferToBase64(buffer),
          mimeType: file.type || 'application/octet-stream',
          fileName: file.name,
          size: file.size
        };
      }
    } catch (e3) {
      console.warn('FileReader readAsArrayBuffer không đọc được, chuyển chiến lược 4:', e3);
    }

    // CHIẾN LƯỢC 4: FileReader truyền thống readAsDataURL (Fallback cuối)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const result = reader.result;
          if (!result || typeof result !== 'string') {
            throw new Error('Dữ liệu tệp không hợp lệ sau khi đọc');
          }
          const parts = result.split(',');
          const base64Data = parts[1];
          if (!base64Data) {
            throw new Error('Không thể trích xuất mã Base64 của tệp tin');
          }
          resolve({
            base64: base64Data,
            mimeType: file.type || 'application/octet-stream',
            fileName: file.name,
            size: file.size
          });
        } catch (parseErr) {
          reject(parseErr instanceof Error ? parseErr : new Error(String(parseErr)));
        }
      };

      reader.onerror = () => {
        let errorMsg = 'Điện thoại không cho phép đọc tệp này (có thể do tệp đang được mở bởi ứng dụng khác hoặc quyền truy cập tạm thời bị ngắt). Thầy/Cô vui lòng chọn lại tệp hoặc chuyển tệp vào thư mục Tải về (Downloads).';
        if (reader.error && reader.error.message) {
          errorMsg = reader.error.message;
        }
        reject(new Error(errorMsg));
      };

      reader.onabort = () => {
        reject(new Error('Quá trình đọc tệp đã bị hủy. Vui lòng thử lại.'));
      };

      try {
        reader.readAsDataURL(file);
      } catch (readInitErr) {
        reject(new Error('Không thể khởi chạy đọc tệp: ' + (readInitErr.message || String(readInitErr))));
      }
    });
  }

  /**
   * Kiểm tra kết nối tới Apps Script URL
   */
  async function testConnection(gasUrl) {
    const url = gasUrl || window.AppStorage.getGasUrl();
    if (!url) {
      return { success: false, message: 'Chưa cấu hình URL Google Apps Script' };
    }

    try {
      const checkUrl = `${url}${url.includes('?') ? '&' : '?'}action=ping&t=${Date.now()}`;
      const response = await fetch(checkUrl, { method: 'GET', redirect: 'follow' });
      const data = await response.json();
      if (data && data.status === 'success') {
        return { success: true, message: data.message || 'Kết nối thành công!' };
      }
      return { success: false, message: 'Phản hồi không hợp lệ từ máy chủ Google' };
    } catch (err) {
      return { success: false, message: 'Không thể kết nối đến Web App: ' + err.message };
    }
  }

  /**
   * Lấy toàn bộ dữ liệu từ Google Sheets qua Google Apps Script
   */
  async function fetchCloudData() {
    const url = window.AppStorage.getGasUrl();
    if (!url) return null;

    try {
      const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}action=getData&t=${Date.now()}`;
      const res = await fetch(fetchUrl, { method: 'GET', redirect: 'follow' });
      const json = await res.json();
      if (json && json.status === 'success' && json.data) {
        return json.data;
      }
      return null;
    } catch (e) {
      console.warn('Lỗi fetch dữ liệu cloud:', e);
      return null;
    }
  }

  /**
   * Tải lên Giáo án lên Google Drive và lưu vào Sheets
   */
  async function uploadPlan(payload) {
    const url = window.AppStorage.getGasUrl();

    // CHIẾN LƯỢC AN TOÀN TUYỆT ĐỐI: Luôn lưu vào LocalStorage trước để không bao giờ bị mất bài
    const localPlan = window.AppStorage.addOrUpdatePlan({
      ...payload,
      id: payload.id || ('KHBD_' + Date.now()),
      ngayNop: payload.ngayNop || new Date().toISOString(),
      trangThai: payload.trangThai || 'CHO_DUYET',
      driveFileId: payload.driveFileId || '',
      driveViewUrl: payload.docsUrl || payload.driveViewUrl || '',
      driveDownloadUrl: payload.driveDownloadUrl || '#'
    });

    // Nếu chưa cấu hình GAS URL, trả về thành công với mode DEMO
    if (!url) {
      console.log('⚡ Chế độ Demo: Lưu giáo án an toàn cục bộ (Chưa cấu hình Google Apps Script URL)');
      return { status: 'success', plan: localPlan, mode: 'DEMO' };
    }

    // Gửi lên Google Apps Script Live kèm bộ ngắt thời gian Timeout 12 giây
    try {
      const body = JSON.stringify({
        action: 'uploadPlan',
        ...payload
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Tránh CORS preflight với GAS
        body: body,
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const result = await response.json();
      if (result && result.status === 'success' && result.plan) {
        // Cập nhật lại cache cục bộ với thông tin Drive từ Cloud
        const updated = window.AppStorage.addOrUpdatePlan({
          ...payload,
          id: result.plan.id || localPlan.id,
          driveFileId: result.plan.driveFileId || '',
          driveViewUrl: result.plan.driveViewUrl || payload.docsUrl || '',
          driveDownloadUrl: result.plan.driveDownloadUrl || '#',
          trangThai: 'CHO_DUYET',
          ngayNop: result.plan.ngayNop || localPlan.ngayNop
        });
        return { status: 'success', plan: updated, message: 'Đã lưu lên Google Drive thành công!' };
      }

      // Trường hợp Apps Script trả về lỗi nội bộ nhưng đã lưu cục bộ an toàn
      return { 
        status: 'warning', 
        message: 'Đã lưu kế hoạch bài dạy an toàn trong hệ thống (Đồng bộ Drive: ' + ((result && result.message) || 'Đang chờ') + ')', 
        plan: localPlan 
      };
    } catch (err) {
      console.warn('Lỗi kết nối khi tải lên Google Drive (đã lưu an toàn cục bộ):', err);
      const isTimeout = err && (err.name === 'AbortError' || (err.message && err.message.includes('aborted')));
      const errMsg = isTimeout ? 'Máy chủ Google phản hồi chậm' : (err ? (err.message || String(err)) : 'Lỗi kết nối');
      return { 
        status: 'warning', 
        message: `Đã lưu kế hoạch bài dạy an toàn trên thiết bị (${errMsg}). Hệ thống sẽ tự động đồng bộ lên Drive khi đường truyền ổn định.`, 
        plan: localPlan 
      };
    }
  }

  /**
   * Gửi kết quả phê duyệt và chữ ký số lên Google Sheets
   */
  async function submitReview(reviewPayload) {
    const url = window.AppStorage.getGasUrl();

    // Cập nhật local trước
    const updatedPlan = window.AppStorage.reviewPlan(reviewPayload.khbdId, reviewPayload);

    if (!url) {
      return { status: 'success', message: 'Đã phê duyệt thành công (Chế độ mô phỏng)!', plan: updatedPlan };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'reviewPlan',
          ...reviewPayload
        }),
        redirect: 'follow'
      });
      return await response.json();
    } catch (err) {
      console.warn('Lỗi đồng bộ duyệt lên Google Sheets:', err);
      return { status: 'success', message: 'Đã lưu cục bộ. Khi có mạng sẽ tự động đồng bộ.', plan: updatedPlan };
    }
  }

  /**
   * Xóa Kế hoạch bài dạy (đồng bộ xóa cả Drive & Google Sheets, chuyển file vào Thùng rác)
   */
  async function deletePlan(planId) {
    const plan = window.AppStorage.getPlanById(planId);
    const driveFileId = plan ? (plan.driveFileId || '') : '';
    const driveViewUrl = plan ? (plan.driveViewUrl || '') : '';
    const docsUrl = plan ? (plan.docsUrl || '') : '';
    const fileName = plan ? (plan.fileName || '') : '';
    const teacherName = plan ? (plan.tacGiaTen || '') : '';
    const department = plan ? (plan.toBoMonTen || '') : '';
    const week = plan ? (plan.tuan || 1) : 1;
    const year = plan ? (plan.namHoc || window.APP_CONFIG.ACADEMIC_YEAR) : window.APP_CONFIG.ACADEMIC_YEAR;
    
    // Xóa trong bộ nhớ cục bộ
    window.AppStorage.deletePlan(planId);

    const url = window.AppStorage.getGasUrl();
    if (!url) {
      return { status: 'success', message: 'Đã xóa Kế hoạch bài dạy khỏi hệ thống cục bộ.' };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deletePlan',
          id: planId,
          driveFileId: driveFileId,
          driveViewUrl: driveViewUrl,
          docsUrl: docsUrl,
          fileName: fileName,
          teacherName: teacherName,
          department: department,
          week: week,
          year: year
        }),
        redirect: 'follow'
      });
      const data = await response.json();
      return data;
    } catch (err) {
      console.warn('Lỗi khi đồng bộ xóa lên Google Drive:', err);
      return { status: 'warning', message: 'Đã xóa trên hệ thống (Lỗi đồng bộ Cloud: ' + err.message + ')' };
    }
  }

  /**
   * Đồng bộ toàn bộ cây thư mục 35 tuần cho giáo viên trên Google Drive
   */
  async function syncAllFolders() {
    const url = window.AppStorage.getGasUrl();
    if (!url) {
      alert('Vui lòng nhập và bấm "Lưu Cấu Hình" Google Apps Script URL trước khi đồng bộ thư mục!');
      return;
    }

    const teachers = window.AppStorage.getTeachers();
    const btn = document.getElementById('btn-sync-drive-folders');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>⏳ Đang tạo thư mục Drive...</span>`;
    }

    try {
      window.AppToast.show('Đang khởi tạo & đồng bộ cấu trúc thư mục Drive 35 tuần...', 'info');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'syncFolders',
          namHoc: window.APP_CONFIG.ACADEMIC_YEAR,
          teachers: teachers
        }),
        redirect: 'follow'
      });
      const res = await response.json();
      if (res.status === 'success') {
        window.AppToast.show(res.message || 'Đã đồng bộ toàn bộ thư mục Drive thành công!', 'success');
        if (res.rootFolderUrl) {
          window.open(res.rootFolderUrl, '_blank');
        }
      } else {
        window.AppToast.show(res.message || 'Có lỗi khi đồng bộ thư mục.', 'error');
      }
    } catch (err) {
      console.error(err);
      window.AppToast.show('Lỗi đồng bộ thư mục Drive: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg><span>Đồng bộ Thư mục Drive (35 Tuần)</span>`;
      }
    }
  }

  /**
   * Mở trực tiếp trên Google Docs cho bất kỳ Kế hoạch bài dạy nào
   * Hoạt động cho tất cả các tài khoản (Giáo viên, Tổ trưởng, Tổ phó, Quản trị viên/BGH)
   */
  async function openInGoogleDocs(planId) {
    if (!planId) return;
    const plan = window.AppStorage.getPlanById(planId);
    if (!plan) {
      if (window.AppToast) window.AppToast.show('Không tìm thấy thông tin Kế hoạch bài dạy!', 'error');
      return;
    }

    // 1. Nếu đã có driveFileId thật trên Google Drive
    if (plan.driveFileId && !plan.driveFileId.includes('demo')) {
      const docsUrl = `https://docs.google.com/document/d/${plan.driveFileId}/edit`;
      window.open(docsUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // 2. Nếu có docsUrl hợp lệ
    if (plan.docsUrl && (plan.docsUrl.includes('docs.google.com') || plan.docsUrl.includes('drive.google.com')) && !plan.docsUrl.includes('demo')) {
      window.open(plan.docsUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // 3. Nếu có driveViewUrl hợp lệ
    if (plan.driveViewUrl && !plan.driveViewUrl.includes('demo') && (plan.driveViewUrl.includes('drive.google.com') || plan.driveViewUrl.includes('docs.google.com'))) {
      const fileIdMatch = plan.driveViewUrl.match(/[-\w]{25,}/);
      if (fileIdMatch) {
        window.open(`https://docs.google.com/document/d/${fileIdMatch[0]}/edit`, '_blank', 'noopener,noreferrer');
        return;
      }
      window.open(plan.driveViewUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // 4. Nếu tệp chưa có trên Drive (lưu cục bộ) nhưng ĐÃ KẾT NỐI Google Apps Script và có fileBase64
    const gasUrl = window.AppStorage.getGasUrl();
    if (gasUrl && plan.fileBase64) {
      if (window.AppToast) window.AppToast.show('Đang đồng bộ tệp lên Google Drive để mở Google Docs...', 'info');
      try {
        const uploadRes = await uploadPlan(plan);
        if (uploadRes && uploadRes.status === 'success' && uploadRes.plan && uploadRes.plan.driveFileId) {
          if (window.AppToast) window.AppToast.show('Đã đồng bộ lên Google Drive thành công!', 'success');
          window.open(`https://docs.google.com/document/d/${uploadRes.plan.driveFileId}/edit`, '_blank', 'noopener,noreferrer');
          if (window.AppController && window.AppController.refreshActiveView) {
            window.AppController.refreshActiveView();
          }
          return;
        }
      } catch (err) {
        console.error('Lỗi tự động đồng bộ khi mở Google Docs:', err);
      }
    }

    // 5. Nếu chưa cấu hình Google Apps Script
    if (plan.fileBase64) {
      if (window.AppToast) {
        window.AppToast.show('Tệp đang lưu cục bộ (chưa đưa lên Drive). Đang tải file gốc (.docx) về máy cho Thầy/Cô...', 'warning');
      }
      if (window.UIReviewer && window.UIReviewer.downloadLocalFile) {
        window.UIReviewer.downloadLocalFile(plan.id);
      }
    } else {
      if (window.AppToast) {
        window.AppToast.show('Chưa có liên kết tệp trên Google Drive. Vui lòng kết nối Apps Script trong Cài đặt!', 'warning');
      }
    }
  }

  /**
   * Đồng bộ mật khẩu mới lên Google Sheets / Đám mây
   */
  async function changePassword(userId, newPassword, username) {
    const url = window.AppStorage.getGasUrl();
    if (!url) return { success: true, message: 'Đã lưu mật khẩu cục bộ' };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'changePassword',
          userId: userId,
          username: username,
          newPassword: newPassword
        }),
        redirect: 'follow'
      });
      const result = await response.json();
      return result;
    } catch (err) {
      console.warn('Lỗi đồng bộ mật khẩu lên Google Sheets:', err);
      return { status: 'warning', message: 'Đã lưu mật khẩu trên thiết bị này. Sẽ tự động đồng bộ khi có mạng.' };
    }
  }

  /**
   * Xác thực tài khoản trực tuyến qua Google Sheets (Hỗ trợ đăng nhập khi mật khẩu vừa đổi trên máy khác)
   */
  async function verifyLoginCloud(username, password) {
    const url = window.AppStorage.getGasUrl();
    if (!url) return null;

    try {
      const checkUrl = `${url}${url.includes('?') ? '&' : '?'}action=checkLogin&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&t=${Date.now()}`;
      const response = await fetch(checkUrl, { method: 'GET', redirect: 'follow' });
      const data = await response.json();
      return data;
    } catch (err) {
      console.warn('Lỗi kiểm tra đăng nhập đám mây:', err);
      return null;
    }
  }

  return {
    fileToBase64,
    testConnection,
    fetchCloudData,
    uploadPlan,
    submitReview,
    deletePlan,
    syncAllFolders,
    openInGoogleDocs,
    changePassword,
    verifyLoginCloud
  };
})();

