/**
 * =========================================================================
 * SIGNATURE.JS - CHỮ KÝ ĐIỆN TỬ & CON DẤU PHÊ DUYỆT
 * =========================================================================
 */

window.AppSignature = (function() {
  const pads = {};
  let lastActivePadId = 'signature-canvas';

  function initPad(canvasElementId = 'signature-canvas') {
    const canvas = document.getElementById(canvasElementId);
    if (!canvas) return;

    lastActivePadId = canvasElementId;
    const ctx = canvas.getContext('2d');
    
    // Set độ nét cao cho màn hình retina/high-DPI
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = (rect.width || 300) * ratio;
    canvas.height = (rect.height || 120) * ratio;
    ctx.scale(ratio, ratio);

    ctx.strokeStyle = '#1e3a8a'; // Màu mực xanh bút máy
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const padState = {
      canvas,
      ctx,
      isDrawing: false,
      hasSigned: false
    };
    pads[canvasElementId] = padState;

    function getPos(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      return {
        x: clientX - r.left,
        y: clientY - r.top
      };
    }

    function start(e) {
      padState.isDrawing = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const pos = getPos(clientX, clientY);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }

    function move(e) {
      if (!padState.isDrawing) return;
      if (e.cancelable && e.touches) e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const pos = getPos(clientX, clientY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      padState.hasSigned = true;
    }

    function stop() {
      if (padState.isDrawing) {
        padState.isDrawing = false;
        ctx.closePath();
      }
    }

    // Chuột
    canvas.onmousedown = start;
    canvas.onmousemove = move;
    window.addEventListener('mouseup', stop);

    // Cảm ứng điện thoại / tablet
    canvas.ontouchstart = (e) => { e.preventDefault(); start(e); };
    canvas.ontouchmove = (e) => { e.preventDefault(); move(e); };
    window.addEventListener('touchend', stop);
  }

  function clearPad(canvasElementId) {
    const padId = canvasElementId || lastActivePadId;
    const pad = pads[padId] || (document.getElementById(padId) ? (initPad(padId), pads[padId]) : null);
    if (!pad || !pad.canvas || !pad.ctx) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    pad.ctx.clearRect(0, 0, pad.canvas.width / ratio, pad.canvas.height / ratio);
    pad.hasSigned = false;
  }

  function getSignatureImage(canvasElementId) {
    const padId = canvasElementId || lastActivePadId;
    const pad = pads[padId];
    if (!pad || !pad.hasSigned || !pad.canvas) return null;
    return pad.canvas.toDataURL('image/png');
  }

  function isPadEmpty(canvasElementId) {
    const padId = canvasElementId || lastActivePadId;
    const pad = pads[padId];
    return !pad || !pad.hasSigned;
  }

  /**
   * Tạo chuỗi xác thực mộc số kèm con dấu điện tử
   */
  function generateVerificationStamp(reviewerName, departmentName, status) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const statusText = status === 'DA_DUYET' ? 'ĐÃ PHÊ DUYỆT' : (status === 'CAN_SUA' ? 'YÊU CẦU CHỈNH SỬA' : 'TỪ CHỐI');
    
    return {
      html: `
        <div class="digital-stamp">
          <div class="stamp-inner-border"></div>
          <div class="stamp-dept">TRƯỜNG THCS TÂY PHÚ<br>${departmentName || 'TỔ CHUYÊN MÔN'}</div>
          <div class="stamp-status">${statusText}</div>
          <div class="stamp-date">${dateStr} ${timeStr}</div>
          <div style="font-size: 0.6rem; font-weight: bold; margin-top: 2px;">KÝ BỞI: ${reviewerName}</div>
        </div>
      `,
      signatureCode: `VERIFIED_${Date.now()}_${btoa(reviewerName).substring(0, 8)}`,
      timestamp: `${dateStr} ${timeStr}`
    };
  }

  return {
    initPad,
    clearPad,
    getSignatureImage,
    isPadEmpty,
    generateVerificationStamp
  };
})();
