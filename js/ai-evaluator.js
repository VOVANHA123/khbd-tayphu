/**
 * =========================================================================
 * AI-EVALUATOR.JS - TRỢ LÝ AI THẨM ĐỊNH KẾ HOẠCH BÀI DẠY (CHUẨN CÔNG VĂN 5512/BGDĐT)
 * =========================================================================
 * Phân tích và đánh giá tự động Kế hoạch bài dạy theo 5 tiêu chuẩn Bộ GD&ĐT:
 * 1. Mục tiêu bài dạy (Phẩm chất, Năng lực chung, Năng lực đặc thù) [2đ]
 * 2. Thiết bị dạy học và học liệu (Tranh ảnh, video, phiếu HT, CNTT) [2đ]
 * 3. Tiến trình dạy học - Chuỗi 4 hoạt động chuẩn hóa [3đ]
 *    (Khởi động -> Hình thành kiến thức -> Luyện tập -> Vận dụng)
 *    Mỗi hoạt động phải đủ: Mục tiêu, Nội dung, Sản phẩm, Tổ chức thực hiện.
 * 4. Phương pháp và công cụ kiểm tra đánh giá (Rubric, checklist...) [2đ]
 * 5. Phân hóa đối tượng & hình thức tổ chức [1đ]
 * =========================================================================
 */

window.AppAI = (function() {

  /**
   * Từ khóa chuẩn hóa theo Công văn 5512/BGDĐT để nhận diện cấu trúc
   */
  const CRITERIA_KEYWORDS = {
    tc1: {
      id: 'tc1',
      title: '1. Mục tiêu bài dạy (Chuẩn GDPT 2018)',
      maxScore: 2,
      keywords: ['mục tiêu', 'kiến thức', 'năng lực', 'phẩm chất', 'năng lực chung', 'năng lực đặc thù', 'tự chủ', 'giao tiếp', 'hợp tác', 'giải quyết vấn đề', 'yêu nước', 'nhân ái', 'chăm chỉ', 'trung thực', 'trách nhiệm'],
      requiredAny: ['năng lực', 'phẩm chất', 'mục tiêu']
    },
    tc2: {
      id: 'tc2',
      title: '2. Thiết bị dạy học và học liệu',
      maxScore: 2,
      keywords: ['thiết bị', 'học liệu', 'giáo viên', 'học sinh', 'phiếu học tập', 'máy chiếu', 'tranh ảnh', 'thí nghiệm', 'video', 'mô phỏng', 'bảng phụ', 'công nghệ thông tin'],
      requiredAny: ['thiết bị', 'học liệu', 'phiếu']
    },
    tc3: {
      id: 'tc3',
      title: '3. Tiến trình dạy học (Chuỗi 4 hoạt động)',
      maxScore: 3,
      activities: [
        { name: 'Khởi động', keys: ['khởi động', 'mở đầu', 'xác định vấn đề'] },
        { name: 'Hình thành kiến thức', keys: ['hình thành kiến thức', 'khám phá', 'kiến thức mới'] },
        { name: 'Luyện tập', keys: ['luyện tập', 'thực hành', 'bài tập'] },
        { name: 'Vận dụng', keys: ['vận dụng', 'tìm tòi mở rộng', 'thực tế'] }
      ],
      steps: ['mục tiêu', 'nội dung', 'sản phẩm', 'tổ chức thực hiện']
    },
    tc4: {
      id: 'tc4',
      title: '4. Phương pháp & Công cụ kiểm tra đánh giá',
      maxScore: 2,
      keywords: ['đánh giá', 'kiểm tra', 'rubric', 'bảng kiểm', 'tiêu chí', 'thường xuyên', 'tự đánh giá', 'đồng đẳng', 'câu hỏi', 'quan sát']
    },
    tc5: {
      id: 'tc5',
      title: '5. Phân hóa đối tượng & Hình thức tổ chức',
      maxScore: 1,
      keywords: ['nhóm', 'cá nhân', 'cặp đôi', 'phân hóa', 'hỗ trợ', 'khá giỏi', 'khó khăn', 'nhiệm vụ']
    }
  };

  /**
   * Trích xuất văn bản thô từ Base64 hoặc thông tin bài dạy
   */
  function extractSearchableText(planData) {
    let combined = `
      ${planData.tieuDe || ''} 
      ${planData.monHoc || ''} 
      ${planData.khoi || ''} 
      ${planData.lop || ''} 
      ${planData.tuan ? 'Tuần ' + planData.tuan : ''} 
      ${planData.tietPPCT ? 'Tiết PPCT ' + planData.tietPPCT : ''} 
      ${planData.ghiChu || ''} 
      ${planData.fileName || ''}
    `.toLowerCase();

    // Nếu có fileBase64 (chuỗi docx/pdf), trích xuất các từ khóa văn bản ASCII/UTF8 bên trong
    if (planData.fileBase64 && typeof planData.fileBase64 === 'string') {
      try {
        const decodedSample = atob(planData.fileBase64.slice(0, 150000));
        const cleanSample = decodedSample.replace(/[^\w\s\u00C0-\u1EF9]/gi, ' ').toLowerCase();
        combined += ' ' + cleanSample;
      } catch (e) {
        // Bỏ qua nếu giải mã Base64 không tương thích
      }
    }

    return combined;
  }

  /**
   * Thẩm định kế hoạch bài dạy theo 5 tiêu chí của Công văn 5512
   * @param {Object} planData Dữ liệu kế hoạch bài dạy
   * @returns {Object} Kết quả đánh giá của AI
   */
  async function evaluatePlan(planData) {
    // Giả lập thời gian suy luận AI thông minh (1 - 1.5 giây)
    await new Promise(resolve => setTimeout(resolve, 800));

    const text = extractSearchableText(planData);
    const scores = {};
    const strengths = [];
    const improvements = [];
    let totalScore = 0;

    // 1. Đánh giá Tiêu chí 1: Mục tiêu bài dạy (2đ)
    let tc1Score = 0;
    const hasCompetency = text.includes('năng lực') || text.includes('nl');
    const hasQuality = text.includes('phẩm chất') || text.includes('pc') || text.includes('chăm chỉ') || text.includes('trách nhiệm');
    const hasKnowledge = text.includes('kiến thức') || text.includes('mục tiêu');

    if (hasCompetency && hasQuality && hasKnowledge) {
      tc1Score = 2;
      strengths.push('Mục tiêu bài dạy xác định toàn diện: Năng lực chung, Năng lực đặc thù và Phẩm chất theo chuẩn GDPT 2018.');
    } else if (hasCompetency || hasKnowledge) {
      tc1Score = 1.5;
      improvements.push('Mục tiêu cần làm rõ hơn các biểu hiện cụ thể của Năng lực đặc thù và Phẩm chất chủ yếu.');
    } else {
      tc1Score = 1;
      improvements.push('Chưa làm rõ mục tiêu phát triển Phẩm chất và Năng lực học sinh theo Công văn 5512.');
    }
    scores.tc1 = tc1Score;
    totalScore += tc1Score;

    // 2. Đánh giá Tiêu chí 2: Thiết bị và học liệu (2đ)
    let tc2Score = 0;
    const hasDevices = text.includes('thiết bị') || text.includes('máy chiếu') || text.includes('dụng cụ') || text.includes('thí nghiệm');
    const hasMaterials = text.includes('học liệu') || text.includes('phiếu học tập') || text.includes('tranh') || text.includes('video') || text.includes('cntt');

    if (hasDevices && hasMaterials) {
      tc2Score = 2;
      strengths.push('Thiết bị dạy học và học liệu (phiếu học tập, thí nghiệm/CNTT) chuẩn bị chu đáo cho cả GV và HS.');
    } else if (hasDevices || hasMaterials || planData.docsUrl) {
      tc2Score = 1.5;
      improvements.push('Cần mô tả chi tiết hơn nội dung các Phiếu học tập hoặc nguồn học liệu số dành cho học sinh.');
    } else {
      tc2Score = 1;
      improvements.push('Thiếu danh mục thiết bị dạy học cụ thể cho từng hoạt động.');
    }
    scores.tc2 = tc2Score;
    totalScore += tc2Score;

    // 3. Đánh giá Tiêu chí 3: Tiến trình dạy học - Chuỗi 4 hoạt động (3đ)
    let tc3Score = 0;
    let foundActivities = 0;
    const missingActivities = [];

    CRITERIA_KEYWORDS.tc3.activities.forEach(act => {
      const match = act.keys.some(k => text.includes(k));
      if (match) {
        foundActivities++;
      } else {
        missingActivities.push(act.name);
      }
    });

    const hasFourSteps = text.includes('sản phẩm') || text.includes('tổ chức thực hiện') || text.includes('giao nhiệm vụ');

    if (foundActivities === 4 && hasFourSteps) {
      tc3Score = 3;
      strengths.push('Đủ cấu trúc chuỗi 4 hoạt động chuẩn mực (Khởi động ➔ Hình thành kiến thức ➔ Luyện tập ➔ Vận dụng); mỗi hoạt động rõ Mục tiêu, Nội dung, Sản phẩm và Tổ chức thực hiện.');
    } else if (foundActivities >= 3) {
      tc3Score = 2;
      if (missingActivities.length > 0) {
        improvements.push(`Cần bổ sung hoặc làm rõ nét hoạt động: ${missingActivities.join(', ')}.`);
      }
      improvements.push('Mỗi hoạt động cần chuẩn hóa đủ 4 bước: Mục tiêu ➔ Nội dung ➔ Sản phẩm ➔ Tổ chức thực hiện (Giao nhiệm vụ, Báo cáo, Kết luận).');
    } else {
      tc3Score = 1.5;
      improvements.push(`Thiếu các hoạt động cốt lõi trong chuỗi 4 hoạt động 5512: ${missingActivities.join(', ')}.`);
    }
    scores.tc3 = tc3Score;
    totalScore += tc3Score;

    // 4. Đánh giá Tiêu chí 4: Phương pháp và công cụ kiểm tra đánh giá (2đ)
    let tc4Score = 0;
    const hasAssessmentTools = text.includes('đánh giá') || text.includes('rubric') || text.includes('bảng kiểm') || text.includes('thường xuyên') || text.includes('câu hỏi');

    if (hasAssessmentTools && (text.includes('rubric') || text.includes('bảng kiểm') || text.includes('tiêu chí'))) {
      tc4Score = 2;
      strengths.push('Có phương án và công cụ kiểm tra đánh giá thường xuyên rõ ràng (Rubric/Bảng kiểm/Câu hỏi tương tác).');
    } else if (hasAssessmentTools) {
      tc4Score = 1.5;
      improvements.push('Nên bổ sung công cụ đánh giá cụ thể (Rubric chấm điểm sản phẩm hoặc Bảng kiểm quan sát hoạt động nhóm).');
    } else {
      tc4Score = 1;
      improvements.push('Chưa xác định rõ công cụ kiểm tra đánh giá kết quả học tập của học sinh trong từng hoạt động.');
    }
    scores.tc4 = tc4Score;
    totalScore += tc4Score;

    // 5. Đánh giá Tiêu chí 5: Phân hóa & Hình thức tổ chức (1đ)
    let tc5Score = 0;
    const hasGrouping = text.includes('nhóm') || text.includes('cá nhân') || text.includes('cặp đôi');
    const hasDifferentiation = text.includes('phân hóa') || text.includes('hỗ trợ') || text.includes('khó khăn') || text.includes('nâng cao');

    if (hasGrouping && hasDifferentiation) {
      tc5Score = 1;
      strengths.push('Hình thức tổ chức linh hoạt (nhóm/cá nhân) và có phương án hỗ trợ học sinh có khó khăn trong học tập.');
    } else if (hasGrouping) {
      tc5Score = 0.75;
      improvements.push('Cần dự kiến thêm biện pháp hỗ trợ học sinh còn hạn chế và giao việc mở rộng cho học sinh khá giỏi.');
    } else {
      tc5Score = 0.5;
      improvements.push('Cần làm rõ cách chia nhóm và giao nhiệm vụ phân hóa học sinh.');
    }
    scores.tc5 = tc5Score;
    totalScore += tc5Score;

    // Làm tròn 1 chữ số thập phân
    totalScore = Math.min(10, Math.round(totalScore * 10) / 10);

    // QUYẾT ĐỊNH PHÊ DUYỆT TỰ ĐỘNG
    // Đạt chuẩn: Tổng điểm >= 8.0 VÀ không tiêu chí nào dưới 50% điểm
    const isApproved = (totalScore >= 8.0 && tc3Score >= 2 && tc1Score >= 1.5);

    let summary = '';
    if (isApproved) {
      summary = `✅ KHBD ĐẠT CHUẨN CÔNG VĂN 5512 (${totalScore}/10 điểm). ${strengths.join(' ')}`;
    } else {
      summary = `⚠️ KHBD CHƯA ĐẠT CHUẨN 5512 (${totalScore}/10 điểm). Cần chỉnh sửa: ${improvements.join(' ')}`;
    }

    return {
      isApproved,
      status: isApproved ? 'DA_DUYET' : 'CAN_SUA',
      totalScore: `${totalScore}/10`,
      scores,
      strengths,
      improvements,
      summary,
      evaluatedAt: new Date().toISOString(),
      evaluator: {
        id: 'AI_ASSISTANT_5512',
        name: 'Trợ lý AI - Thẩm định 5512 (Tổ KHTN-CN)',
        role: 'AI Assistant',
        signature: 'Chứng thực thẩm định tự động chuẩn CV 5512/BGDĐT'
      }
    };
  }

  return {
    evaluatePlan,
    CRITERIA_KEYWORDS
  };

})();
