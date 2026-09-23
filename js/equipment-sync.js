/**
 * =========================================================================
 * EQUIPMENT-SYNC.JS - ĐỒNG BỘ THIẾT BỊ DẠY HỌC TỔ KHTN - CN VỚI KHBD
 * Trường THCS Tây Phú - Năm học 2026 - 2027
 * Quản trị hệ thống: Thầy Võ Văn Hà - Tổ trưởng KHTN - CN
 * =========================================================================
 */

(function () {
  'use strict';

  const DEFAULT_FIREBASE_DB_URL = "https://thidua-lop-9a4-79dca-default-rtdb.asia-southeast1.firebasedatabase.app";
  const FIREBASE_DB_PATH = 'thiet_bi_2026/data';
  const LOCAL_STORAGE_KEY = 'KHBD_EQUIPMENT_DATA_CACHE_V5';
  const CLIENT_SESSION_ID = 'khbd_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString().slice(-4);
  const localBroadcast = ('BroadcastChannel' in window) ? new BroadcastChannel('thietbi_cross_tab_sync_v2') : null;

  function normalizeArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    if (typeof val === 'object') return Object.values(val).filter(Boolean);
    return [];
  }

  // Dữ liệu thiết bị chuẩn trích xuất từ 7 file Phụ lục 3 (PL3) môn KHTN và Công nghệ khối 6, 7, 8, 9
  const FALLBACK_KHTN_EQUIPMENTS = [
    {
        "code": "TB-KHTN-K6-001",
        "name": "Cốc thuỷ tinh, đũa thuỷ tinh,…",
        "lesson": "Bài 1. Giới thiệu về KHTN",
        "week": "Tuần 1 (Tiết 1, 2)",
        "room": "Phòng học(Thư viện)",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học(Thư viện)",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-002",
        "name": "- Tranh, hình ảnh về quy định an toàn trong phòng thực hành).- Video liên quan đến nội dung về các quy định an toàn trong phòng thực hành",
        "lesson": "Bài 2. An toàn trong phòng thực hành(Dạy học trực tuyến)",
        "week": "Tuần 1 (Tiết 3)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-003",
        "name": "Kính lúp cầm tay",
        "lesson": "Bài 3. Sử dụng kính lúp",
        "week": "Tuần 1 (Tiết 4) – Tuần 2 (Tiết 5)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Cái",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-004",
        "name": "Kính hiển vi quang học",
        "lesson": "Bài 4. Sử dụng kính hiển vi quang học",
        "week": "Tuần 2 (Tiết 6, 7)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Cái",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-005",
        "name": "Bộ thước đo chiều dài",
        "lesson": "Bài 5. Đo chiều dài",
        "week": "Tuần 2 (Tiết 8) – Tuần 3 (Tiết 9, 10)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-006",
        "name": "Cân Robecval, cân đòn, cân đồng hồ, cân điện tử...",
        "lesson": "Bài 6. Đo khối lượng",
        "week": "Tuần 3 (Tiết 11, 12)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-007",
        "name": "Đồng hồ bấm giây, đồng hồ đeo tay, …",
        "lesson": "Bài 7. Đo thời gian",
        "week": "Tuần 4 (Tiết 13, 14)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-008",
        "name": "Các loại nhiệt kế, giá đỡ, cốc chịu nhiệt,…",
        "lesson": "Bài 8. Đo nhiệt độ",
        "week": "Tuần 4 (Tiết 15, 16) – Tuần 5 (Tiết 17)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-009",
        "name": "Muối ăn, đường, nước, 2 đũa khuấy, 2 cốc thủy tinh, 2 bát sứ, 2 chân đế thí nghiệm, đèn cồn, diêm",
        "lesson": "Bài 9. Sự đa dạng của chất",
        "week": "Tuần 5 (Tiết 18)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-010",
        "name": "- 1 miếng gỗ nhỏ, 2 xi lanh, cốc nước màu.- Mô hình hạt ở các thể rắn, lỏng, khí.- Nước đá, nước, ống nghiệm, giá đỡ nhiệt kế.- Nước cất, cốc thủy tinh chịu nhiệt, nhiệt kế, đén cồn, vải lót tay, diêm...",
        "lesson": "Bài 10. Các thể cơ bản của chất và sự chuyển thể",
        "week": "Tuần 5 (Tiết 19, 20) – Tuần 6 (Tiết 21)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Mô hình",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-011",
        "name": "- Hai ống nghiệm có nút, nước đá, nước màu.- Chậu thủy tinh, cây nến gắn vào đế nhựa, nước vôi trong, phenolphtalein, cốc thủy tinh.",
        "lesson": "Bài 11. Oxygen. Không khí",
        "week": "Tuần 6 (Tiết 22, 23, 24)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-012",
        "name": "- Bộ dụng cụ thử tính dẫn điện, một số vật làm bằng kim loại, nhựa, gỗ, thủy tinh, cao su, gốm...- 2 bát sứ, nước nóng, nước đá, 4 thìa bằng kim loại, sứ, nhựa, gỗ.",
        "lesson": "Bài 12. Một số vật liệu",
        "week": "Tuần 7 (Tiết 25, 26)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-013",
        "name": "- Các mẫu đá và sản phẩm làm từ đá vôi, đồ trang sức,- Ống hút nhỏ giọt, hydrochloric acid, 1 viên đá vôi, 1 chiếc đĩa, 1 đinh sắt.",
        "lesson": "Bài 13. Một số nguyên liệu",
        "week": "Tuần 7 (Tiết 27, 28)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-014",
        "name": "- Tư liệu, sách, báo, video..",
        "lesson": "Bài 14. Nhiên liệu",
        "week": "Tuần 8 (Tiết 29, 30)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-015",
        "name": "- Tư liệu, hình ảnh về món ăn và các loại lương thực, thực phẩm.- Gạo 2 chiếc hộp, nước.- Rau, thịt, cá, 1 cốc sữa.",
        "lesson": "Bài 15. Một số lương thực – thực phẩm",
        "week": "Tuần 8 (Tiết 31, 32)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-016",
        "name": "- Một lọ muối ăn, một bình nước cất, một cốc thủy tinh, một bộ thìa, một đèn cồn, một hộp diêm.- Một lọ đường, một lọ bột sắn dây, 2 cốc thủy tinh 100ml, 2 thìa, nước cất",
        "lesson": "Bài 16. Hỗn hợp các chất",
        "week": "Tuần 9 (Tiết 33, 34, 35)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-017",
        "name": "- 2 cốc thủy tinh, thìa, phễu, giấy lọc, đất sét, nước.- Phễu chiết, chai nhựa 500 ml, cốc thủy tinh, giá thí nghiệm, giàu ăn, nước.- Phiếu học tập.",
        "lesson": "Bài 17. Tách chất ra khỏi hỗn hợp",
        "week": "Tuần 9 (Tiết 36) – Tuần 10 (Tiết 37)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-018",
        "name": "Bảng phụ, phiếu học tập",
        "lesson": "Ôn tập giữa kì I",
        "week": "Tuần 10 (Tiết 38)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-019",
        "name": "Bản đặc tả + Đề + Đáp án",
        "lesson": "Kiểm tra giữa kì I",
        "week": "Tuần 10 (Tiết 39, 40)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-020",
        "name": "- 2 cốc thủy tinh, thìa, phễu, giấy lọc, đất sét, nước.- Phễu chiết, chai nhựa 500 ml, cốc thủy tinh, giá thí nghiệm, giàu ăn, nước.",
        "lesson": "Bài 17. Tách chất ra khỏi hỗn hợp (Tiếp)",
        "week": "Tuần 11 (Tiết 41)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-021",
        "name": "Tranh ảnh hình dạng một số loại tế bào",
        "lesson": "Bài 18. Tế bào – Đơn vị của sự sống",
        "week": "Tuần 11 (Tiết 42, 43)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-022",
        "name": "Tranh sơ đồ các thành phần chính của tế bào, tế bào nhân sơ, tế bào nhân thực, tế bào thực vật, tế bào động vật.",
        "lesson": "Bài 19. Cấu tạo và chức năng các thành phần của tế bào",
        "week": "Tuần 11 (Tiết 44) – Tuần 12 (Tiết 45)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-023",
        "name": "Tranh sự lớn lên của tế bào, sơ đồ quá trình lớn lên và sinh sản của tế bào.",
        "lesson": "Bài 20. Sự lớn lên và sinh sản của tế bào",
        "week": "Tuần 12 (Tiết 46, 47)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-024",
        "name": "- Kính hiển vi có vật kính 40x.- Nước cất đựng trong lọ thủy tinh.- Đĩa petri, giấy thấm, lamen, lam kính, ống nhỏ giọt, kim mũi mác, dao mổ- Củ hành tây.",
        "lesson": "Bài 21. Thực hành quan sát một số loại tế bào",
        "week": "Tuần 12 (Tiết 48)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Cái",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-025",
        "name": "- Hình ảnh minh hoạ (video) sự lớn lên của một loài sinh vật.- Tranh ảnh minh hoạ vật sống và vật không sống.",
        "lesson": "Bài 22. Cơ thể sinh vật",
        "week": "Tuần 13 (Tiết 49, 50, 51)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-026",
        "name": "Tranh ảnh, sơ đồ các cấp tổ chức cấu tạo cơ thể người, động vật, thực vật.",
        "lesson": "Bài 23. Tổ chức cơ thể đa bào",
        "week": "Tuần 13 (Tiết 52) – Tuần 14 (Tiết 53, 54)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-027",
        "name": "- Thiết bị, dụng cụ: lam kính, la men, cốc đong, kính hiển vi có vật kính 10x và 40x, ống nhỏ giọt, giấy thấm, thìa.- Mẫu nước ao (hồ) hoặc nước trong môi trường nuôi.",
        "lesson": "Bài 24. Thực hành: Quan sát và mô tả cơ thể đơn bào, cơ thể đa bào",
        "week": "Tuần 14 (Tiết 55, 56)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-028",
        "name": "Hình ảnh một số loài sinh vật, Hình 25.2,4,5",
        "lesson": "Bài 25. Hệ thống phân loại sinh vật",
        "week": "Tuần 15 (Tiết 57, 58, 59)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-029",
        "name": "Hình ảnh một số loài sinh vật",
        "lesson": "Bài 26. Khoá lưỡng phân",
        "week": "Tuần 15 (Tiết 60) – Tuần 16 (Tiết 61, 62)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-030",
        "name": "Hình ảnh một số loại vi khuẩn, H.27.2",
        "lesson": "Bài 27. Vi khuẩn",
        "week": "Tuần 16 (Tiết 63, 64) – Tuần 17 (Tiết 65, 66)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-031",
        "name": "- Kính hiển vi 10x, 40x, bộ lam kính và lamen, ống nhỏ giọt, nhiệt kế, giấy thấm, cốc 1,2 lít, thìa trộn, nước cất, cốc thủy tinh, ấm đun nước, thùng xốp có nắp, lọ thủy tinh nhỏ có nắp.- Nguyên liệu: 2 hộp sữa chua không đường; 1 hộp sữa đặc có đường, nước lọc hoặc sữa tiệt trùng",
        "lesson": "Bài 28. Thực hành: Làm sữa chua và quan sát vi khuẩnSTEM: Làm sữa chua sạch",
        "week": "Tuần 17 (Tiết 67, 68)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Cái",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-032",
        "name": "Bảng phụ, phiếu học tập",
        "lesson": "Ôn tập cuối kì I",
        "week": "Tuần 18 (Tiết 69, 70)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-033",
        "name": "Bản đặc tả + Đề + Đáp án",
        "lesson": "Kiểm tra cuối kì I",
        "week": "Tuần 18 (Tiết 71, 72)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-034",
        "name": "Hình ảnh ba loại hình dạng chính của Virus. H. 29.2: Cấu tạo Virus có vỏ ngoài",
        "lesson": "Bài 29. Virus",
        "week": "Tuần 19 (Tiết 73, 74, 75)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-035",
        "name": "Hình ảnh một số nguyên sinh vật",
        "lesson": "Bài 30. Nguyên sinh vật",
        "week": "Tuần 19 (Tiết 76) – Tuần 20 (Tiết 77, 78)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-036",
        "name": "- Kính hiển vi 10x, 40x, lam kính, lamen, ống nhỏ giọt, giấy thấm, cốc thủy tinh.- Một số mẫu vật có trong môi trường tự nhiên hoặc thu thập trong môi trường nuôi",
        "lesson": "Bài 31. Thực hành: Quan sát nguyên sinh vật",
        "week": "Tuần 20 (Tiết 79, 80)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Cái",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-037",
        "name": "Các loại nấm trong thực tế: Mẫu nấm rơm, nấm mỡ, nấm sò… không lấy nấm độc",
        "lesson": "Bài 32. Nấm",
        "week": "Tuần 21 (Tiết 81, 82, 83)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-038",
        "name": "Kính hiển vi 10x, 40x, dao mổ, lam kính, giấy thấm, nước cất, găng tay, kính lúp, panh, kim mũi mác, lamen, ống nhỏ giọt, khẩu trang, kính bảo vệ mắt.",
        "lesson": "Bài 33. Thực hành: Quan sát các loại nấm",
        "week": "Tuần 21 (Tiết 84)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Cái",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-039",
        "name": "Mẫu vật và hình ảnh thể hiện sự đa dạng của thực vật.",
        "lesson": "Bài 34. Thực vật",
        "week": "Tuần 22 (Tiết 85, 86, 87, 88)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-040",
        "name": "- Kính hiển vi 10x, 40x, dao mổ, lam kính, giấy thấm, nước cất, găng tay, kính lúp, panh, kim mũi mác, lamen, ống nhỏ giọt, khẩu trang,- Rêu tường, dương xỉ, cỏ bợ.",
        "lesson": "Bài 35. Thực hành: Quan sát và phân biệt một số nhóm thực vật",
        "week": "Tuần 23 (Tiết 89)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Cái",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-041",
        "name": "- Hình ảnh thể hiện sự đa dạng của động vật.",
        "lesson": "Bài 36. Động vật",
        "week": "Tuần 23 (Tiết 90, 91, 92) – Tuần 24 (Tiết 93)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-042",
        "name": "- Ống nhòm, kính lúp, máy ảnh, tài liệu nhận diện nhanh động vật ngoài thiên nhiên bằng hình ảnh/ Clip khu bảo tồn động vật.",
        "lesson": "Bài 37. Thực hành: Quan sát và nhận biết một số nhóm động vật ngoài thiên nhiên",
        "week": "Tuần 24 (Tiết 94)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-043",
        "name": "Tranh ảnh về vai trò của đa dạng sinh học trong tự nhiên và trong đời sống.",
        "lesson": "Bài 38. Đa dạng sinh học",
        "week": "Tuần 24 (Tiết 95, 96)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-044",
        "name": "- Nhãn dán mẫu, kính lúp.- Vợt bắt bướm, lọ đựng mẫu, vợt bắt động vật thủy sinh, khay nước.- Ống nhòm, kính lúp, máy ảnh.",
        "lesson": "Bài 39. Tìm hiểu sinh vật ngoài thiên nhiên",
        "week": "Tuần 25 (Tiết 97, 98)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-045",
        "name": "Giá gắn lò xo lá tròn có dây kéo, xe lăn; 2 xe lăn có đặt nam châm.",
        "lesson": "Bài 40. Lực là gì?",
        "week": "Tuần 25 (Tiết 99, 100)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-046",
        "name": "Một số loại lực kế, khối gỗ …",
        "lesson": "Bài 41. Biểu diễn lực",
        "week": "Tuần 26 (Tiết 101, 102)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-047",
        "name": "Giá đỡ thí nghiệm, lò xo xoắn, các quả nặng có cùng khối lượng, thước có ĐCNN là 1mm, quả nặng.",
        "lesson": "Bài 42. Biến dạng của lò xo",
        "week": "Tuần 26 (Tiết 103)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-048",
        "name": "Bảng phụ, phiếu học tập",
        "lesson": "Ôn tập giữa HKII",
        "week": "Tuần 26 (Tiết 104)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-049",
        "name": "Bản đặc tả + Đề + Đáp án",
        "lesson": "Kiểm tra giữa HKII",
        "week": "Tuần 27 (Tiết 105, 106)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-050",
        "name": "Giá đỡ thí nghiệm, lò xo xoắn, các quả nặng có cùng khối lượng, thước có ĐCNN là 1mm, quả nặng.",
        "lesson": "Bài 42. Biến dạng của lò xo (tiếp)",
        "week": "Tuần 27 (Tiết 107, 108)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-051",
        "name": "Giá đỡ, lực kế lò xo, khối gỗ, quả nặng.",
        "lesson": "Bài 43. Trọng lượng. Lực hấp dẫn",
        "week": "Tuần 28 (Tiết 109, 110, 111)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-052",
        "name": "Lực kế lò xo, khối gỗ, quả nặng. Tranh ảnh về tác dụng thúc đẩy chuyển động và tác dụng có hại của lực ma sát.",
        "lesson": "Bài 44. Lực ma sát",
        "week": "Tuần 28 (Tiết 112) – Tuần 29 (Tiết 113, 114)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-053",
        "name": "1 hộp nhựa cứng, trong suốt dạng hình hộp chữ nhật; 1 xe lăn, 1 tấm cản hình chữ nhật, 1 đường ray cho xe lăn chạy, 1 ròng rọc cố định, 1 phễu rót nước, 1 đoạn dây mảnh, 1 lực kế lò xo GHĐ 5N, 1 van xả nước.",
        "lesson": "Bài 45. Lực cản của nước",
        "week": "Tuần 29 (Tiết 115, 116)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-054",
        "name": "Một vài chiếc xe đồ chơi giống nhau, ống hút.",
        "lesson": "Bài 46. Năng lượng và sự truyền năng lượng",
        "week": "Tuần 30 (Tiết 117, 118)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-055",
        "name": "2 con lắc gồm 2 quả cầu giống nhau, giá treo cố định, thước mét, tấm bìa.",
        "lesson": "Bài 47. Một số dạng năng lượng",
        "week": "Tuần 30 (Tiết 119, 120)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-056",
        "name": "1 quả bóng teniss (hoặc bóng cao su), thước dây (hoặc thước cuộn), 1 sợi dây dài hơn 1m.",
        "lesson": "Bài 48. Sự chuyển hoá năng lượng",
        "week": "Tuần 31 (Tiết 121, 122)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-057",
        "name": "Video, tranh ảnh.",
        "lesson": "Bài 49. Năng lượng hao phí",
        "week": "Tuần 31 (Tiết 123)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-058",
        "name": "Video, tranh ảnh.",
        "lesson": "Bài 50. Năng lượng tái tạo",
        "week": "Tuần 31 (Tiết 124) – Tuần 32 (Tiết 125)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-059",
        "name": "Video, tranh ảnh.",
        "lesson": "Bài 51. Tiết kiệm năng lượng",
        "week": "Tuần 32 (Tiết 126)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-060",
        "name": "Video, tranh ảnh.",
        "lesson": "Bài 52. Chuyển động nhìn thấy của Mặt Trời. Thiên thể",
        "week": "Tuần 32 (Tiết 127, 128)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-061",
        "name": "Một vài tấm bìa các-tông, 1 quả bóng nhỏ, 1 đèn pin, băng dính, kéo, sợi dây treo.",
        "lesson": "Bài 53. Mặt Trăng",
        "week": "Tuần 33 (Tiết 129, 130, 131)",
        "room": "Phòng bộ mônTrực tuyến",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ mônTrực tuyến",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-062",
        "name": "Đinh ghim, giấy nến, hộp các-tông, băng dính; Máy chiếu, video, tranh ảnh.",
        "lesson": "Bài 54. Hệ Mặt Trời Chủ đề steam: Khám phá Hệ Mặt trời",
        "week": "Tuần 33 (Tiết 132) – Tuần 34 (Tiết 133, 134)",
        "room": "Phòng bộ môn",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-063",
        "name": "Video, tranh ảnh.",
        "lesson": "Bài 55. Ngân Hà",
        "week": "Tuần 34 (Tiết 135, 136)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-064",
        "name": "Bảng phụ, phiếu học tập",
        "lesson": "Ôn tập cuối kì II",
        "week": "Tuần 33 (Tiết 137, 138)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K6-065",
        "name": "Bản đặc tả + Đề + Đáp án",
        "lesson": "Kiểm tra cuối kì II",
        "week": "Tuần 34 (Tiết 139, 140)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-066",
        "name": "- Máy đo pH, bút đo pH. Máy đo huyết áp.- Ampe kế, vôn kế, joulemeter- Dao động kí- Đồng hồ đo thời gian hiện số dùng cổng quang điện",
        "lesson": "Bài 1. Phương pháp và kỹ năng học tập môn KHTN",
        "week": "Tuần 1 (Tiết 1, 2, 3, 4)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-067",
        "name": "- Phiếu học tập- Hình 8.1",
        "lesson": "Bài 8. Tốc độ chuyển động",
        "week": "Tuần 2 (Tiết 5,6,7)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-068",
        "name": "- Hình 9.1 9.4- Tấm gỗ- Nam châm điện, bi sắt, cổng quang điện, công tắc, đồng hồ đo thời gian hiện số.",
        "lesson": "Bài 9. Đo tốc độ",
        "week": "Tuần 2 (Tiết 8) – Tuần 3 (Tiết 9,10)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-069",
        "name": "Hình 10.1 10.2",
        "lesson": "Bài 10. Đồ thị quãng đường – Thời gian",
        "week": "Tuần 3 (Tiết 11,12) – Tuần 4 (tiết 13)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-070",
        "name": "Hình 11.1 11.3",
        "lesson": "Bài 11. Hướng dẫn giải bài toán liên quan đến tốc độ và thảo luận về ảnh hưởng của tốc độ trong an toàn giao thông",
        "week": "Tuần 4 (Tiết 14,15)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-071",
        "name": "- Phiếu học tập- Hình 12.1 12.8- Thanh thép, giá thí nghiệm, âm thoa, búa cao su",
        "lesson": "Bài 12. Sóng âm",
        "week": "Tuần 4 (Tiết 16) – Tuần 5 (Tiết 17,18)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-072",
        "name": "- Tranh ảnh- Phiếu học tập- Một số dụng cụ.",
        "lesson": "Bài 13. Độ to và độ cao của âm",
        "week": "Tuần 5 (Tiết 19,20) – Tuần 6 (tiết 21,22)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-073",
        "name": "Máy tính, ti vi",
        "lesson": "Bài 14. Phản xạ âm, chống ô nhiễm tiếng ồn",
        "week": "Tuần 6 (Tiết 23,24)Tuần 7 (tiết 25)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-074",
        "name": "Hình 15.1 15.10",
        "lesson": "Bài 15. Năng lương ánh sáng. Tia sáng, vùng tối",
        "week": "Tuần 7 (Tiết 26,27)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-075",
        "name": "- Một số dụng cụ.- Phiếu học tập",
        "lesson": "Bài 16. Sự phản xạ ánh sáng",
        "week": "Tuần 7 (Tiết 28)Tuần 8 ( tiết 29,30)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-076",
        "name": "- Một số dụng cụ.- Phiếu học tập",
        "lesson": "Bài 17. Ảnh của vật quan gương phẳng",
        "week": "Tuần 8(Tiết 31,32) – Tuần 9 (Tiết 33)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-077",
        "name": "- Hình 18.1 18.5- Nam châm, kim nam châm.",
        "lesson": "Bài 18. Nam châm",
        "week": "Tuần 9 (Tiết 34,35,36)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-078",
        "name": "- Hình 19.1 -&gt; 19.10,- Nam châm, mô hình Trái Đất, la bàn, bột sắt.",
        "lesson": "Bài 19. Từ trường",
        "week": "Tuần 10 (Tiết 37,38,39)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-079",
        "name": "- Phiếu học tập- Dụng cụ thí nghiệm",
        "lesson": "Bài 20. Chế tạo nam châm điện đơn giản",
        "week": "Tuần 10 (Tiết 40)Tuần 11 ( tiết 41)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-080",
        "name": "Nội dung ôn tập",
        "lesson": "Ôn tập giữa kỳ I",
        "week": "Tuần 11 ( tiết 42)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-081",
        "name": "Nội dung đề kiểm tra",
        "lesson": "Kiểm tra giữa kỳ I",
        "week": "Tuần 11 ( tiết 43,44)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-082",
        "name": "- Phiếu học tập- Dụng cụ thí nghiệm",
        "lesson": "Bài 20. Chế tạo nam châm điện đơn giản (tt)",
        "week": "Tuần 12 (Tiết 45,46)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-083",
        "name": "- Phiếu học tập- Hình 2.1 2.6",
        "lesson": "Bài 2. Nguyên tử",
        "week": "Tuần 12 (Tiết 47, 48) Tuần 13 (Tiết 49, 50, 51)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-084",
        "name": "- Hình 3.1 3.2- Phiếu học tập",
        "lesson": "Bài 3. Nguyên tố hóa học",
        "week": "Tuần 13 (Tiết 52) Tuần 14 (Tiết 53, 54,55)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-085",
        "name": "- Hình 4.1 4.7- Bảng HTTH",
        "lesson": "Bài 4. Sơ lược về bảng tuần hoàn các nguyên tố hóa học",
        "week": "Tuần 14 (Tiết 56) Tuần 15 (Tiết 57, 58,59,60) Tuần 16 (Tiết 61,62)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-086",
        "name": "- Mô hình phân tử- Phiếu học tập",
        "lesson": "Bài 5. Phân tử - Đơn chất – Hợp chất",
        "week": "Tuần 16 (Tiết 63,64) – Tuần 17 (Tiết 65,66)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Mô hình",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-087",
        "name": "- Hình 6.1 6.6.- Phiếu học tập",
        "lesson": "Bài 6. Giới thiệu về kiên kết hóa học",
        "week": "Tuần 17 (Tiết 67,68)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-088",
        "name": "Nội dung ôn tập",
        "lesson": "Ôn tập cuối kỳ I",
        "week": "Tuần 18 (Tiết 69,70)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN - Tủ thiết bị",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-089",
        "name": "Nội dung đề kiểm tra",
        "lesson": "Kiểm tra cuối kỳ I",
        "week": "Tuần 18 (Tiết 71,72)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN - Tủ thiết bị",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-090",
        "name": "- Hình 6.1 6.6.- Phiếu học tập",
        "lesson": "Bài 6. Giới thiệu về kiên kết hóa học (tt)",
        "week": "Tuần 19 (Tiết 73,74,75)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-091",
        "name": "Sơ đồ mô tả sự hình thành liên kết cộng hóa trị pt HCl.",
        "lesson": "Bài 7. Hóa trị và công thức hóa học",
        "week": "Tuần 19 (Tiết 76)Tuần 20 (77,78,79,80)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-092",
        "name": "- Hình 21.1- Phiếu học tập.",
        "lesson": "Bài 21. Khái quát về trao đổi chất và chuyển hoá năng lượng",
        "week": "Tuần 21 (Tiết 81, 82,83)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN - Tủ thiết bị",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-093",
        "name": "Hình 22.1 22.3",
        "lesson": "Bài 22. Quang hợp ở thực vật",
        "week": "Tuần 21 Tiết 84)Tuần 22 (Tiết 85)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-094",
        "name": "- Hình 23.1 23.4- Phiếu học tập.",
        "lesson": "Bài 23. Một số yếu tố ảnh hưởng đến quang hợp",
        "week": "Tuần 22 (Tiết 86,87)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-095",
        "name": "- Tranh ảnh- Phiếu học tập",
        "lesson": "Bài 24. Thực hành: Chứng minh quang hợp ở cây xanh",
        "week": "Tuần 22 (Tiết 88)Tuần 23 (Tiết 89)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-096",
        "name": "- Hình 25.1- Phiếu học tập.",
        "lesson": "Bài 25. Hô hấp tế bào",
        "week": "Tuần 23 (Tiết 90,91)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-097",
        "name": "Hình 26.1 24.2",
        "lesson": "Bài 26. Một số yếu tố ảnh hưởng đến hô hấp tế bào",
        "week": "Tuần 23 (Tiết 92)Tuần 24 (Tiết 93)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-098",
        "name": "- Tranh ảnh- Phiếu học tập.",
        "lesson": "Bài 27. Thực hành: Hô hấp thực vật",
        "week": "Tuần 24 (Tiết 94,95)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-099",
        "name": "- Tranh ảnh- Phiếu học tập.",
        "lesson": "Bài 28. Trao đổi khí ở sinh vật",
        "week": "Tuần 24 (Tiết 96) Tuần 25 (Tiết 97,98,99)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-100",
        "name": "- Tranh ảnh- Phiếu học tập.",
        "lesson": "Bài 29. Vai trò của nước và chất dinh dưỡng đối với sinh vật",
        "week": "Tuần 25 (Tiết 100)Tuần 26 (Tiết 101,102)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-101",
        "name": "- Hình 30.1, 30.2",
        "lesson": "Bài 30. Trao đổi nước và chất dinh dưỡng ở thực vật",
        "week": "Tuần 26 (Tiết 103)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-102",
        "name": "Nội dung ôn tập",
        "lesson": "Ôn tập giữa kỳ II",
        "week": "Tuần 26 (Tiết 104)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-103",
        "name": "Nội dung đề kiểm tra",
        "lesson": "Kiểm tra giữa kỳ II",
        "week": "Tuần 27 (Tiết 105, 106)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-104",
        "name": "- Hình 30.1, 30.2",
        "lesson": "Bài 30. Trao đổi nước và chất dinh dưỡng ở thực vật (tt)",
        "week": "Tuần 27 (Tiết 107,108)Tuần 28 (Tiết 109)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-105",
        "name": "- Phiếu học tập",
        "lesson": "Bài 31. Trao đổi nước và chất dinh dưỡng ở động vật",
        "week": "Tuần 28 (Tiết 110, 111,112)Tuần 29 (Tiết 113)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-106",
        "name": "- Phiếu học tập- Hình 32.1 32.2",
        "lesson": "Bài 32. Thực hành: Chứng minh thân vận chuyển nước và lá thoát hơi nước",
        "week": "Tuần 29 (Tiết 114,115)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-107",
        "name": "- Phiếu học tập- Hình 33.1 33.3",
        "lesson": "Bài 33. Cảm ứng ở sinh vật và tập tính ở động vật",
        "week": "Tuần 29 (Tiết 116)Tuần 30 (Tiết 117)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-108",
        "name": "Hình 34.1 34.5",
        "lesson": "Bài 34. Vận dụng hiện tượng cảm ứng ở sinh vật vào thực tiễn",
        "week": "Tuần 30 (Tiết 118)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-109",
        "name": "Hình 35.1 35.2",
        "lesson": "Bài 35. Thực hành cảm ứng ở sinh vật",
        "week": "Tuần 30 (Tiết 119)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-110",
        "name": "Hình 36.1 36.3",
        "lesson": "Bài 36. Khái quát về sinh trưởng và phát triển ở sinh vật",
        "week": "Tuần 30 (Tiết 120) – Tuần 31 (Tiết 121,122)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-111",
        "name": "Hình 37.1 37.5",
        "lesson": "Bài 37. Ứng dụng sinh trưởng và phát triển ở sinh vật vào thực tiễn",
        "week": "Tuần 31 (Tiết 123, 124)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-112",
        "name": "Hình 38.1 38.5",
        "lesson": "Bài 38. Thực hành: Quan sát, mô tả sự sinh trưởng và phát triển ở một số sinh vật",
        "week": "Tuần 32 (Tiết 125, 126)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-113",
        "name": "- Tranh ảnh- Phiếu học tập",
        "lesson": "Bài 39. Sinh sản vô tính ở sinh vật",
        "week": "Tuần 32 (Tiết 127, 128)Tuần 33 (Tiết 129)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-114",
        "name": "- Tranh ảnh- Phiếu học tập",
        "lesson": "Bài 40. Sinh sản hữu tính ở sinh vật",
        "week": "Tuần 33 (Tiết 130, 131, 132)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-115",
        "name": "- Tranh ảnh- Phiếu học tập",
        "lesson": "Bài 41. Một số yếu tố ảnh hưởng và điều hòa, điều khiển sinh sản ở sinh vật",
        "week": "Tuần 34 (Tiết 133, 134, 135)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng TH KHTN - Tủ thiết bị",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-116",
        "name": "- Tranh ảnh- Phiếu học tập",
        "lesson": "Bài 42. Cơ thể sinh vật là một thể thống nhất",
        "week": "Tuần 34 (Tiết 136)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng TH KHTN - Tủ thiết bị",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-117",
        "name": "Nội dung ôn tập",
        "lesson": "Ôn tập học kì II",
        "week": "Tuần 35 (Tiết 137, 138)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K7-118",
        "name": "Nội dung đề kiểm tra",
        "lesson": "Kiểm tra học kì II",
        "week": "Tuần 35 (Tiết 139, 140)",
        "room": "Phòng học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-119",
        "name": "- Một số hoá chất thông dụng, nhãn cảnh báo nguy hiểm.- Dụng cụ: ống nghiệm, đèn cồn, pipet, kẹp, bình tam giác.- Máy chiếu/Tivi, phiếu học tập số, video an toàn PTN.",
        "lesson": "Bài 1: Sử dụng một số hoá chất, thiết bị cơ bản trong phòng thí nghiệm",
        "week": "Tuần 1(Tiết 1, 2, 3)",
        "room": "Phòng TH Hóa học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Hóa học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-120",
        "name": "- Dụng cụ: ống nghiệm, kẹp sắt, đèn cồn.- Hóa chất: bột Fe, bột S, dd BaCl2, dd Na2SO4.- Video mô phỏng biến đổi liên kết nguyên tử trong phản ứng.",
        "lesson": "Bài 2. Phản ứng hoá học",
        "week": "Tuần 1(Tiết 4)Tuần 2(Tiết 5, 6)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-121",
        "name": "- Tranh ảnh về số Avogadro; mô hình lượng chất 1 mol các chất khác nhau (Fe, Cu, H2O).- Phiếu bài tập, máy tính cầm tay, máy chiếu.",
        "lesson": "Bài 3. Mol và tỉ khối chất khí",
        "week": "Tuần 2(Tiết 7, 8)Tuần 3(Tiết 9)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-122",
        "name": "- Dụng cụ: cốc thủy tinh, đũa khuấy, cân điện tử, ống đong.- Hóa chất: đường ăn, muối ăn, bột CuSO4, nước cất.- Video thí nghiệm ảo nồng độ dung dịch.",
        "lesson": "Bài 4: Dung dịch và nồng độ",
        "week": "Tuần 3(Tiết 10, 11, 12)Tuần 4(Tiết 13)",
        "room": "Phòng TH Hóa học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Hóa học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-123",
        "name": "- Cân điện tử, cốc thủy tinh, dung dịch BaCl2, dung dịch Na2SO4.- Tranh sơ đồ cân bằng nguyên tử; phần mềm PhET: Balancing Chemical",
        "lesson": "Bài 5. Định luật bảo toàn khối lượng và phương trình hoá học",
        "week": "Tuần 4(Tiết 14, 15, 16)",
        "room": "Phòng TH Hóa học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng TH Hóa học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-124",
        "name": "- Hệ thống bài tập tính theo PTHH, bài toán hiệu suất; phiếu học tập.- Tivi, máy tính.",
        "lesson": "Bài 6. Tính theo phương trình hoá học",
        "week": "Tuần 5(Tiết 17, 18, 19, 20)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-125",
        "name": "- Dụng cụ: ống nghiệm, đèn cồn, nhiệt kế, đồng hồ bấm giây.- Hóa chất: dd HCl loãng/đặc, kẽm hạt/bột, dd H2O2, bột MnO2.- Video thí nghiệm quay chậm.",
        "lesson": "Bài 7. Tốc độ phản ứng và chất xúc tác",
        "week": "Tuần 6(Tiết 21, 22, 23, 24)",
        "room": "Phòng TH Hóa học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Hóa học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-126",
        "name": "- Hóa chất: dung dịch HCl, H2SO4 loãng; quỳ tím, đinh sắt Fe, kẽm Zn, đá vôi CaCO3.- Dụng cụ: giá ống nghiệm, ống nhỏ giọt.- Video ứng dụng của acid và hình ảnh cảnh báo bỏng acid.",
        "lesson": "Bài 8. Acid",
        "week": "Tuần 7(Tiết 25, 26, 27, 28)",
        "room": "Phòng TH Hóa học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Hóa học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-127",
        "name": "- Hóa chất: dd NaOH, Ca(OH)2, quỳ tím, phenolphthalein, giấy đo pH; các mẫu nước chanh, giấm, xà phòng, nước máy.- Phần mềm PhET: pH Scale.",
        "lesson": "Bài 9. Base - Thang pHChủ đề STEM: Chế tạo bộ kit đo pH từ thiên nhiên",
        "week": "Tuần 8(Tiết 29, 30, 31, 32)Tuần 9(Tiết 33)",
        "room": "Phòng TH Hóa học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Hóa học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-128",
        "name": "- Hóa chất: CaO, CuO, P đỏ, khí CO2, dung dịch HCl.- Dụng cụ: muôi sắt, đèn cồn, bình tam giác, ống nghiệm.",
        "lesson": "Bài 10. Oxide",
        "week": "Tuần 9(Tiết 34, 35, 36)Tuần 10(Tiết 37)",
        "room": "Phòng TH Hóa học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Hóa học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-129",
        "name": "- Hóa chất: dd NaCl, CuSO4, BaCl2, AgNO3, H2SO4, NaOH; đinh sắt Fe.- Bảng tính tan các chất trong nước.",
        "lesson": "Bài 11. Muối",
        "week": "Tuần 10(Tiết 38, 39, 40)Tuần 11(Tiết 41)",
        "room": "Phòng TH Hóa học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Hóa học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-130",
        "name": "- Đề cương ôn tập giữa kì I; bộ câu hỏi trắc nghiệm và bài tập định lượng.- Nền tảng ôn tập trực tuyến (Quizizz / Azota).",
        "lesson": "ÔN TẬP GIỮA KÌ I",
        "week": "Tuần 11(Tiết 42)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-131",
        "name": "- Đề kiểm tra in giấy chuẩn ma trận, bảng đặc tả.",
        "lesson": "KIỂM TRA GIỮA KÌ I",
        "week": "Tuần 11(Tiết 43, 44)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-132",
        "name": "- Sơ đồ chuyển hóa kim loại, phi kim, oxide, acid, base, muối.- Phiếu học tập hoàn thành chuỗi phản ứng.",
        "lesson": "Bài 11. Muối",
        "week": "Tuần 12(Tiết 45)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-133",
        "name": "- Mẫu phân bón: đạm urê, lân supephotphat, kali clorua, NPK; tranh ảnh bao bì ghi hàm lượng dinh dưỡng.- Video sản xuất phân bón.",
        "lesson": "Bài 12. Phân bón hoá học",
        "week": "Tuần 12(Tiết 46, 47)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-134",
        "name": "- Các khối kim loại cùng thể tích khác chất liệu (Fe, Al, Cu); cân điện tử, bình chia độ, nước cất.- Bảng khối lượng riêng của một số chất.",
        "lesson": "Bài 13. Khối lượng riêng",
        "week": "Tuần 12(Tiết 48)Tuần 13(Tiết 49)",
        "room": "Phòng TH Vật lý",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Vật lý",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-135",
        "name": "- Cân điện tử/cân Ro-béc-van; bình chia độ; thước kẹp; các vật rắn không thấm nước (sỏi, bi sắt, khúc gỗ).",
        "lesson": "Bài 14: Thực hành xác định khối lượng riêng",
        "week": "Tuần 13(Tiết 50)",
        "room": "Phòng TH Vật lý",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Vật lý",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-136",
        "name": "- Khối kim loại hình hộp chữ nhật có diện tích các mặt khác nhau; chậu cát/miếng xốp mềm.- Tranh ảnh ứng dụng áp suất trong đời sống.",
        "lesson": "Bài 15. Áp suất trên một bề mặt",
        "week": "Tuần 13(Tiết 51, 52)Tuần 14(Tiết 53)",
        "room": "Phòng TH Vật lý",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng TH Vật lý",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-137",
        "name": "- Bình trụ có màng cao su, ống chữ U; giác hút chân không, cốc nước đậy giấy bìa cứng.- Phần mềm mô phỏng áp suất PhET (Under Pressure).",
        "lesson": "Bài 16. Áp suất chất lỏng. Áp suất khí quyển",
        "week": "Tuần 14(Tiết 54, 55, 56)",
        "room": "Phòng TH Vật lý",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Vật lý",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-138",
        "name": "- Lực kế lò xo, quả nặng kim loại, bình tràn, cốc chứa, nước, dầu ăn.- Phần mềm mô phỏng PhET (Buoyancy).",
        "lesson": "Bài 17. Lực đẩy Archimedes",
        "week": "Tuần 15(Tiết 57, 58, 59)",
        "room": "Phòng TH Vật lý",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Vật lý",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-139",
        "name": "- Thanh trục quay có gắn các lỗ treo quả nặng ở khoảng cách khác nhau; các quả nặng 50g.- Mô hình cánh cửa mở có tay nắm.",
        "lesson": "Bài 18. Tác dụng làm quay của lực. Moment lực.",
        "week": "Tuần 15(Tiết 60)Tuần 16(Tiết 61, 62, 63)",
        "room": "Phòng TH Vật lý",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Mô hình",
        "location": "Phòng TH Vật lý",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-140",
        "name": "- Các dụng cụ đòn bẩy thực tế: kìm cắt sắt, kéo, khui nắp chai, bập bênh, cân đòn.- Video ứng dụng đòn bẩy trong cơ học cơ thể người.",
        "lesson": "Bài 19. Đòn bẩy và ứng dụng",
        "week": "Tuần 16(Tiết 64)Tuần 17(Tiết 65, 66, 67)",
        "room": "Phòng TH Vật lý",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Vật lý",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-141",
        "name": "- Thanh thủy tinh, thanh nhựa, mảnh dạ, lụa, vụn giấy, điện nghiệm.- Phần mềm PhET: Balloons and Static Electricity.",
        "lesson": "Bài 20: Hiện tượng nhiễm điện do cọ xát",
        "week": "Tuần 17(Tiết 68)",
        "room": "Phòng TH Vật lý",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Vật lý",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-142",
        "name": "- Đề cương ôn tập toàn bộ HKI; bộ câu hỏi trắc nghiệm tổng hợp.- Nền tảng ôn tập trực tuyến Kahoot / Quizizz.",
        "lesson": "ÔN TẬP CUỐI KÌ I",
        "week": "Tuần 18(Tiết 69, 70)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-143",
        "name": "- Đề kiểm tra cuối kì I chuẩn ma trận, bảng đặc tả.",
        "lesson": "KIỂM TRA CUỐI KÌ I",
        "week": "Tuần 18(Tiết 71, 72)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-144",
        "name": "- Hai quả bóng bay tích điện treo gần nhau; đũa nhựa, đũa thủy tinh.- Video hiện tượng sét trong khí quyển và cột thu lôi.",
        "lesson": "Bài 20: Hiện tượng nhiễm điện do cọ xát",
        "week": "Tuần 19(Tiết 73)",
        "room": "Phòng TH Vật lý",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Vật lý",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-145",
        "name": "- Pin tròn 1.5V, pin vuông 9V, acquy; bóng đèn pin, dây nối, công tắc.- Video mô phỏng dòng chuyển dời có hướng của hạt mang điện.",
        "lesson": "Bài 21. Dòng điện. Nguồn điện",
        "week": "Tuần 19(Tiết 74, 75)",
        "room": "Phòng TH Vật lý",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Vật lý",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-146",
        "name": "- Bảng lắp mạch điện học sinh; pin, công tắc, bóng đèn, cầu chì, chuông điện.- Bảng kí hiệu các bộ phận sơ đồ mạch điện.",
        "lesson": "Bài 22. Mạch điện đơn giản",
        "week": "Tuần 19(Tiết 76)Tuần 20(Tiết 77)",
        "room": "Phòng TH Vật lý",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Vật lý",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-147",
        "name": "- Nguồn điện, dây mayso, đèn sợi đốt, nam châm điện hút đinh sắt, bình điện phân dd CuSO4.- Video ứng dụng mạ điện và an toàn điện.",
        "lesson": "Bài 23. Tác dụng của dòng điện",
        "week": "Tuần 20(Tiết 78, 79)",
        "room": "Phòng TH Vật lý",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Vật lý",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-148",
        "name": "- Ampe kế kim, vôn kế kim; ampe kế số (VOM điện tử); nguồn điện, bóng đèn pin, dây nối.",
        "lesson": "Bài 24. Cường độ dòng điện và hiệu điện thế",
        "week": "Tuần 20(Tiết 80)Tuần 21(Tiết 81)",
        "room": "Phòng TH Vật lý",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Vật lý",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-149",
        "name": "- Bộ thực hành điện học sinh: nguồn pin, công tắc, bóng đèn, ampe kế, vôn kế, dây nối.",
        "lesson": "Bài 25: Thực hành đo cường độ dòng điện và hiệu điện thế",
        "week": "Tuần 21(Tiết 82)",
        "room": "Phòng TH Vật lý",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Vật lý",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-150",
        "name": "- Quả bóng cao su rơi nảy giảm độ cao; miếng đồng cọ xát nóng lên; nước nóng/lạnh.- Video mô phỏng chuyển động nhiệt của phân tử.",
        "lesson": "Bài 26. Năng lượng nhiệt và nội năng",
        "week": "Tuần 21(Tiết 83, 84)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-151",
        "name": "- Nhiệt lượng kế có dây nung, nhiệt kế điện tử, biến áp nguồn, máy đo năng lượng nhiệt (Joulemeter), cân điện tử, nước cất.",
        "lesson": "Bài 27. Thực hành đo năng lượng nhiệt bằng Joulemeter",
        "week": "Tuần 22(Tiết 85)",
        "room": "Phòng TH Vật lý",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Vật lý",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-152",
        "name": "- Bộ thí nghiệm dẫn nhiệt (thanh kim loại gắn sáp nung); ống nghiệm nước đun nóng đáy/miệng (đối lưu); đèn hồng ngoại.- Phích nước giữ nhiệt.",
        "lesson": "Bài 28. Sự truyền nhiệt",
        "week": "Tuần 22(Tiết 86, 87, 88)",
        "room": "Phòng TH Vật lý",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Vật lý",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-153",
        "name": "- Quả cầu kim loại và vòng kim loại; bình cầu có ống thủy tinh đựng chất lỏng màu; băng kép.- Video khe hở nhiệt ở đường ray và cầu cống",
        "lesson": "Bài 29. Sự nở vì nhiệt",
        "week": "Tuần 23(Tiết 89, 90)",
        "room": "Phòng TH Vật lý",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Vật lý",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-154",
        "name": "- Mô hình giải phẫu cơ thể người tháo lắp được.- Tranh phóng to các hệ cơ quan; phần mềm 3D giải phẫu người",
        "lesson": "Bài 30. Khái quát về cơ thể người",
        "week": "Tuần 23(Tiết 91)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-155",
        "name": "- Mô hình bộ xương người; khớp động, bán động, bất động; băng nẹp sơ cứu gãy xương.- Phim chụp X-quang xương mẫu.",
        "lesson": "Bài 31. Hệ vận động ở người",
        "week": "Tuần 23(Tiết 92)Tuần 24(Tiết 93, 94)",
        "room": "Phòng TH Sinh học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Mô hình",
        "location": "Phòng TH Sinh học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-156",
        "name": "- Mô hình hệ tiêu hóa người; sơ đồ tiêu hóa cơ học và hóa học.- Tháp dinh dưỡng hợp lí lứa tuổi học sinh THCS.",
        "lesson": "Bài 32. Dinh dưỡng và tiêu hoá ở người",
        "week": "Tuần 24(Tiết 95, 96)Tuần 25(Tiết 97)",
        "room": "Phòng TH Sinh học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Mô hình",
        "location": "Phòng TH Sinh học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-157",
        "name": "- Tiêu bản giọt máu người; kính hiển vi; mô hình tim và van tim; sơ đồ 2 vòng tuần hoàn.- Máy đo huyết áp điện tử, ống nghe tim.",
        "lesson": "Bài 33. Máu và hệ hoàn của cơ thể người",
        "week": "Tuần 25(Tiết 98, 99, 100)",
        "room": "Phòng TH Sinh học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH Sinh học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-158",
        "name": "- Mô hình đường dẫn khí và phổi; mô hình cử động hô hấp (bình chuông gắn bóng bay).- Tranh tác hại khói thuốc lá và bụi mịn PM2.5.",
        "lesson": "Bài 34. Hệ hô hấp ở người",
        "week": "Tuần 26(Tiết 101, 102, 103)",
        "room": "Phòng TH Sinh học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng TH Sinh học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-159",
        "name": "- Đề cương ôn tập các chương Điện, Nhiệt và Hệ cơ quan người.- Nền tảng ôn tập số Azota / Quizizz.",
        "lesson": "ÔN TẬP KIỂM TRA GIỮA KÌ II",
        "week": "Tuần 26(Tiết 104)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-160",
        "name": "- Đề kiểm tra giữa kì II chuẩn ma trận và bảng đặc tả.",
        "lesson": "KIỂM TRA GIỮA KÌ II",
        "week": "Tuần 27(Tiết 105, 106)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-161",
        "name": "- Mô hình thận và đơn vị chức năng nephron; sơ đồ tạo thành nước tiểu.- Video quy trình chạy thận nhân tạo.",
        "lesson": "Bài 35: Hệ bài tiết ở người",
        "week": "Tuần 27(Tiết 107, 108)Tuần 28(Tiết 109)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Mô hình",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-162",
        "name": "- Sơ đồ cân bằng nội môi (đường huyết, áp suất thẩm thấu).- Phiếu phân tích kết quả xét nghiệm máu cơ bản mẫu.",
        "lesson": "Bài 36. Điều hòa môi trường trong của cơ thể người",
        "week": "Tuần 28(Tiết 110)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-163",
        "name": "- Mô hình bộ não người tháo lắp; tranh cung phản xạ; mô hình cầu mắt và tai; bảng đo thị lực Snellen.",
        "lesson": "Bài 37. Hệ thần kinh và các giác quan ở ngườiTich hợp NLS4.3TC2a, 4.3TC2b:Khảo sát thời gian dùng màn hình thiết bị số của bản thân và thảo luận biện pháp bảo vệ mắt tránh cận thị học đường.",
        "week": "Tuần 28(Tiết 111, 112)Tuần 29(Tiết 113)",
        "room": "Phòng TH Sinh học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Mô hình",
        "location": "Phòng TH Sinh học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-164",
        "name": "- Sơ đồ các tuyến nội tiết chính (tuyến yên, tuyến giáp, tuyến tụy, tuyến trên thận, sinh dục).- Tranh bệnh bướu cổ, tiểu đường.",
        "lesson": "Bài 38. Hệ nội tiết ở người",
        "week": "Tuần 29(Tiết 114, 115)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-165",
        "name": "- Mô hình cấu tạo da 3 lớp; sơ đồ điều hòa thân nhiệt khi nóng/lạnh; nhiệt kế y tế.",
        "lesson": "Bài 39. Da và điều hoà thân nhiệt ở người",
        "week": "Tuần 29(Tiết 116)Tuần 30(Tiết 117, 118)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Mô hình",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-166",
        "name": "- Tranh cơ quan sinh dục nam/nữ; sơ đồ thụ tinh và thụ thai; hình ảnh các biện pháp tránh thai an toàn.",
        "lesson": "Bài 40. Sinh sản ở người",
        "week": "Tuần 30(Tiết 119, 120)Tuần 31(Tiết 121)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-167",
        "name": "- Tranh ảnh các loại môi trường sống; đồ thị giới hạn sinh thái của cá rô phi đối với nhiệt độ.- Phiếu phân loại nhân tố vô sinh, hữu sinh.",
        "lesson": "Bài 41. Môi trường và các nhân tố sinh thái",
        "week": "Tuần 31(Tiết 122, 123)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-168",
        "name": "- Tranh ảnh quần thể rừng thông, đàn trâu rừng; sơ đồ các tháp tuổi và tỉ lệ giới tính.- Video về tập tính bầy đàn.",
        "lesson": "Bài 42. Quần thể sinh vật",
        "week": "Tuần 31(Tiết 124)Tuần 32(Tiết 125)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-169",
        "name": "- Tranh ảnh quần xã rừng mưa nhiệt đới, sa mạc; bảng mối quan hệ hỗ trợ và đối địch giữa các loài (cộng sinh, kí sinh...).",
        "lesson": "Bài 43. Quần xã sinh vật",
        "week": "Tuần 32(Tiết 126, 127)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-170",
        "name": "- Sơ đồ chuỗi và lưới thức ăn trong hệ sinh thái đồng cỏ, rừng nhiệt đới; tháp sinh thái.- Video chu trình vật chất và dòng năng lượng.",
        "lesson": "Bài 44. Hệ sinh thái",
        "week": "Tuần 32(Tiết 128)Tuần 33(Tiết 129, 130, 131)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-171",
        "name": "- Sơ đồ cấu trúc sinh quyển; quả địa cầu; bản đồ các khu sinh học trên Trái Đất (tundra, taiga, thảo nguyên, xavan).",
        "lesson": "Bài 45: Sinh quyển",
        "week": "Tuần 33(Tiết 132)Tuần 34(Tiết 133)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-172",
        "name": "- Sơ đồ khống chế sinh học; biểu đồ biến động số lượng thỏ và linh miêu.- Video về mất cân bằng sinh thái khi xuất hiện sinh vật ngoại lai.",
        "lesson": "Bài 46. Cân bằng tự nhiên.",
        "week": "Tuần 34(Tiết 134)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-173",
        "name": "- Tranh ảnh ô nhiễm nước, không khí, đất; suy giảm đa dạng sinh học.- Video kinh tế tuần hoàn, khu bảo tồn thiên nhiên.",
        "lesson": "Bài 47. Bảo vệ môi trường",
        "week": "Tuần 34(Tiết 135, 136)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-174",
        "name": "- Đề cương ôn tập toàn bộ kiến thức KHTN 8 cả năm học.- Ứng dụng thi trực tuyến Quizizz.",
        "lesson": "ÔN TẬP CUỐI KÌ II",
        "week": "Tuần 35(Tiết 137, 138)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K8-175",
        "name": "- Ma trận, bảng đặc tả và đề kiểm tra cuối học kì II chính thức.",
        "lesson": "KIỂM TRA CUỐI KÌ II",
        "week": "Tuần 35(Tiết 139, 140)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-176",
        "name": "Tranh ảnh hoặc dụng cụ (lăng kính, thấu kính, tiêu bản) như trong SGK về một số dụng cụ và hoá chất, bài giảng Powerpoint, video an toàn PTN",
        "lesson": "Bài 1. Nhận biết 1 số dụng cụ, hóa chất. Thuyết trình một vấn đề khoa học.",
        "week": "Tuần 1(tiết 1, 2, 3)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-177",
        "name": "- Tranh ảnh/video các cặp tính trạng ở đậu Hà Lan, chân dung G. Mendel.- Máy chiếu, máy tính, học liệu số.",
        "lesson": "Bài 36. Khái quát về di truyền học.",
        "week": "Tuần 1 (tiết 4)Tuần 2 (tiết 5)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-178",
        "name": "- Mô hình/hộp hạt đậu lai tính trạng; video mô phỏng quy luật phân li.- Phần mềm mô phỏng di truyền ảo (PhET / Virtual Mendel Lab).",
        "lesson": "Bài 37. Các quy luật luật di truyền của Mendel.",
        "week": "Tuần 2(tiết 6, 7, 8)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Mô hình",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-179",
        "name": "- Mô hình cấu trúc không gian phân tử DNA lắp ghép.- Video 3D tương tác mô phỏng chuỗi xoắn kép DNA và RNA.",
        "lesson": "Bài 38. Nucleic acid và gene. Tích hợp năng lực số 1.2.TC2a Thực hiện phân tích, so sánh và đánh giá được các nguồn dữ liệu, thông tin và nội dung số. (Quan sát mô hình số 3D cấu trúc DNA/RNA trên BioDigital Human / Sketchfab)",
        "week": "Tuần 3(tiết 9, 10)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Mô hình",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-180",
        "name": "- Sơ đồ cơ chế tái bản DNA và phiên mã mARN.- Video hoạt hình tương tác 3D cơ chế nhân đôi và phiên mã.",
        "lesson": "Bài 39. Tái bản DNA và phiên mã tạo RNA.(Dạy học trực tuyến)",
        "week": "Tuần 3(tiết 11, 12)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-181",
        "name": "- Sơ đồ cơ chế dịch mã tại ribosome; bảng mã di truyền.- Video mô phỏng dòng thông tin DNA → mARN → Protein → Tính trạng.",
        "lesson": "Bài 40. Dịch mã và mối quan hệ từ gene đến tính trạng.",
        "week": "Tuần 4(tiết 13, 14)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-182",
        "name": "- Tranh ảnh về thể đột biến ở người, động thực vật (bạch tạng, lúa đột biến...).- Video tư liệu các tác nhân gây đột biến gene.",
        "lesson": "Bài 41. Đột biến gene.(Dạy học trực tuyến)",
        "week": "Tuần 4(tiết 15, 16)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-183",
        "name": "- Kính hiển vi quang học, tiêu bản NST tế bào rễ hành/giao tử.- Tranh ảnh hiển vi điện tử về cấu trúc siêu vi của NST.",
        "lesson": "Bài 42. Nhiễm sắc thể và bộ nhiễm sắc thể.",
        "week": "Tuần 4 (tiết 17)Tuần 5(tiết 18)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-184",
        "name": "- Tiêu bản hiển vi phân bào nguyên phân, giảm phân.- Video mô phỏng sinh động diễn biến các kì phân bào.",
        "lesson": "Bài 43. Nguyên phân và giảm phân.(Dạy học trực tuyến)",
        "week": "Tuần 5(tiết 19, 20)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-185",
        "name": "- Tranh sơ đồ bộ NST người; sơ đồ cơ chế xác định giới tính ở người và động vật.- Video phóng sự về yếu tố môi trường ảnh hưởng giới tính.",
        "lesson": "Bài 44. Nhiễm sắc thể giới tính và cơ chế xác định giới tính.",
        "week": "Tuần 5(tiết 21, 22)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-186",
        "name": "- Sơ đồ thí nghiệm của Morgan trên ruồi giấm.- Phiếu học tập so sánh quy luật phân li độc lập và di truyền liên kết.",
        "lesson": "Bài 45. Di truyền liên kết.(Dạy học trực tuyến)",
        "week": "Tuần 6(tiết 23, 24)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-187",
        "name": "- Tranh ảnh các hội chứng đột biến NST (Down, Turner, Klinefelter, tam bội).- Video tư liệu y học về đột biến NST.",
        "lesson": "Bài 46. Đột biến nhiễm sắc thể.",
        "week": "Tuần 6(tiết 25, 26)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-188",
        "name": "- Sơ đồ phả hệ gia đình truyền bệnh máu khó đông, mù màu.- Hướng dẫn phương pháp nghiên cứu phả hệ.",
        "lesson": "Bài 47. Di truyền học với con người.",
        "week": "Tuần 7(tiết 27, 28)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-189",
        "name": "- Hình ảnh sinh vật biến đổi gene (GMO), cừu Dolly, liệu pháp gene.- Video về kỹ thuật chuyển gene và công nghệ sinh học hiện đại.",
        "lesson": "Bài 48. Ứng dụng công nghệ di truyền và đời sống.(Dạy học trực tuyến)",
        "week": "Tuần 7(tiết 29, 30)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-190",
        "name": "- Tranh ảnh giống cây trồng, vật nuôi chọn lọc nhân tạo; bằng chứng chọn lọc tự nhiên.- Phiếu học tập so sánh hai hình thức chọn lọc.",
        "lesson": "Bài 49: Khái niệm tiến hóa và các hình thức chọn lọc.(Dạy học trực tuyến)",
        "week": "Tuần 8(tiết 31, 32, 33)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-191",
        "name": "- Sơ đồ cơ chế chọn lọc tự nhiên theo Darwin; video biến dị thích nghi.- Phần mềm mô phỏng chọn lọc tự nhiên (PhET: Natural Selection).",
        "lesson": "Bài 50: Cơ chế tiến hóa",
        "week": "Tuần 8(tiết 34)Tuần 9(tiết 35, 36)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-192",
        "name": "- Bảng niên biểu địa chất và các sinh vật điển hình qua các đại địa chất.- Video 3D lịch sử phát triển của sinh giới.",
        "lesson": "Bài 51: Sự phát sinh và phát triển sự sống trên trái đất.(Dạy học trực tuyến)",
        "week": "Tuần 9(tiết 37, 38)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-193",
        "name": "- Đề cương ôn tập KTGK I; hệ thống câu hỏi trắc nghiệm và tự luận.- Nền tảng ôn tập tương tác (Quizizz).",
        "lesson": "Ôn tập KTGK I",
        "week": "Tuần 10(tiết 39)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-194",
        "name": "- Bộ thí nghiệm máng nghiêng, quả cầu kim loại, khúc gỗ; quả nặng rơi.- Phần mềm mô phỏng trượt ván năng lượng (PhET: Energy Skate Park).",
        "lesson": "Bài 2. Động năng. Thế năng.(Dạy học trực tuyến)",
        "week": "Tuần 10(tiết 42)Tuần 11(tiết 43)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-195",
        "name": "- Con lắc đơn, con lắc Maxwell minh họa bảo toàn cơ năng.- Video thí nghiệm chuyển hóa năng lượng trong thực tế.",
        "lesson": "Bài 3: Cơ năng",
        "week": "Tuần 11(tiết 44)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-196",
        "name": "- Lực kế, quả nặng, ròng rọc, thước đo; nhãn mác thông số công suất động cơ.- Máy tính, máy chiếu.",
        "lesson": "Bài 4. Công và công suất",
        "week": "Tuần 11(tiết 45, 46)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-197",
        "name": "- Hộp khúc xạ ánh sáng (bình bán trụ mica, đèn laser, thước chia độ góc, nguồn 12V).- Phần mềm PhET: Bending Light.",
        "lesson": "Bài 5: Khúc xạ ánh sáng(Dạy học trực tuyến)",
        "week": "Tuần 12(tiết 47, 48)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-198",
        "name": "- Khối bán trụ thủy tinh trong suốt, nguồn sáng laser hẹp.- Mẫu sợi cáp quang truyền dẫn internet demo.",
        "lesson": "Bài 6. Phản xạ toàn phần.",
        "week": "Tuần 12(tiết 49, 50)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-199",
        "name": "- Lăng kính thủy tinh tam giác, nguồn sáng trắng, khe hẹp, màn hứng chùm phổ tán sắc.- Video hiện tượng cầu vồng.",
        "lesson": "Bài 7. Lăng kính",
        "week": "Tuần 12(tiết 51)Tuần 13(tiết 52)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-200",
        "name": "- Thấu kính hội tụ, thấu kính phân kì, đèn chiếu ba chùm tia song song, giá quang học.- Phần mềm PhET: Geometric Optics.",
        "lesson": "Bài 8. Thấu kính.(Dạy học trực tuyến)",
        "week": "Tuần 13(tiết 53, 54, 55)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-201",
        "name": "- Giá quang học, thấu kính hội tụ cần đo tiêu cự, nguồn sáng chữ F, màn hứng ảnh, thước milimet.",
        "lesson": "Bài 9. Thực hành đo tiêu cực của thấu kính hội tụ.",
        "week": "Tuần 13(tiết 56)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-202",
        "name": "- Kính lúp cầm tay độ phóng đại khác nhau, vật mẫu nhỏ (vân tay, lá cây).- Phiếu bài tập vẽ hình và tính toán quang hình.",
        "lesson": "Bài 10. Kính lúp. Bài tập thấu kính.(Dạy học trực tuyến)",
        "week": "Tuần 14(tiết 57, 58, 59)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Cái",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-203",
        "name": "- Nguồn điện biến áp, ampe kế, vôn kế, đoạn dây dẫn điện trở mẫu, khóa K, dây nối.- Phần mềm PhET: Ohm's Law.",
        "lesson": "Bài 11: Điện trở. Định luật Ohm.",
        "week": "Tuần 14(60, 61)Tuần 15(tiết 62)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-204",
        "name": "- Điện trở R1, R2, ampe kế, vôn kế, nguồn điện, công tắc, bảng mạch điện.- Phần mềm lắp mạch điện ảo Tinkercad/ Circuit Simulator.",
        "lesson": "Bài 12: Đoạn mạch nối tiếp, song song(Dạy học trực tuyến)",
        "week": "Tuần 15(tiết 63, 64, 65, 66)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-205",
        "name": "- Bóng đèn, quạt điện mini ghi thông số V-W; oát kế đo công suất.- Mẫu hóa đơn tiền điện sinh hoạt.",
        "lesson": "Bài 13: Năng lượng của dòng điện và công suất điện",
        "week": "Tuần 16(tiết 67, 68, 69)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-206",
        "name": "- Cuộn dây dẫn có đèn LED, nam châm vĩnh cửu, nam châm điện, điện kế G.- Mô hình máy phát điện xoay chiều; phần mềm PhET: Faraday's Lab.",
        "lesson": "Bài 14: Cảm ứng điện từ. Nguyên tắc tạo ra dòng điện xoay chiều",
        "week": "Tuần 16(tiết 70, 71)Tuần 17(tiết 72)Tuần 18(tiết 77, 78)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Mô hình",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-207",
        "name": "- Đề cương ôn tập kiểm tra cuối học kì I; bộ câu hỏi trắc nghiệm tổng hợp.- Nền tảng Kahoot/ Quizizz.",
        "lesson": "Ôn tập KTCK ITích hợp năng lực số: 2.1.TC2aLựa chọn được nhiều công nghệ số để tương tác.(Ôn tập và kiểm tra đánh giá trên Quizizz)",
        "week": "Tuần 17(tiết 73, 74)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-208",
        "name": "- Nguồn điện xoay chiều biến áp, bóng đèn, nam châm điện, nhiệt kế thí nghiệm tác dụng quang/nhiệt/từ.- Video truyền tải điện.",
        "lesson": "Bài 15: Tác dụng của dòng điện xoay chiều",
        "week": "Tuần 18(tiết 79, 78)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-209",
        "name": "- Sơ đồ vòng chuyển hóa năng lượng mặt trời trên Trái Đất; tranh ảnh khai thác than, dầu mỏ.- Video về suy kiệt năng lượng hóa thạch.",
        "lesson": "Bài 16: Vòng năng lượng trên Trái Đất. Năng lượng hóa thạch(Dạy học trực tuyến)",
        "week": "Tuần 19(tiết 81, 82)",
        "room": "Lớp học(Thư viện)",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học(Thư viện)",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-210",
        "name": "- Mô hình tấm pin mặt trời thắp sáng LED; mô hình tuabin gió mini.- Video các nhà máy điện gió, điện mặt trời tại Việt Nam.",
        "lesson": "Bài 17: Một số dạng năng lượng tái tạo(Dạy học trực tuyến)",
        "week": "Tuần 19(tiết 83, 84)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Mô hình",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-211",
        "name": "- Dụng cụ: pin, đèn, búa nhỏ, kẹp sắt, đèn cồn, ống nghiệm.- Hóa chất: dây Cu, mẩu Al, đinh Fe, dung dịch CuSO4, dung dịch HCl.",
        "lesson": "Bài 18: Tính chất chung của kim loại",
        "week": "Tuần 19(tiết 85) Tuần 20(tiết 86, 87, 88)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-212",
        "name": "- Dụng cụ: giá ống nghiệm, ống nhỏ giọt.- Hóa chất: Na, Mg, Fe, Cu, Ag và dung dịch muối CuSO4, AgNO3, FeSO4, HCl.- Phần mềm thí nghiệm ảo ChemCollective.",
        "lesson": "Bài 19: Dãy hoạt động hóa học(Dạy học trực tuyến)",
        "week": "Tuần 20(tiết 89, 90)Tuần 21(tiết 91, 92, 93)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-213",
        "name": "- Tranh sơ đồ lò cao luyện gang, lò luyện thép; mẫu gang, thép, duralumin.- Video công nghệ luyện kim hiện đại.",
        "lesson": "Bài 20: Tách kim loại và sử dụng hợp kim",
        "week": "Tuần 21(tiết 94, 95)Tuần 22(tiết 96, 97)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-214",
        "name": "- Mẫu than (C), lưu huỳnh (S), dây đồng (Cu), đinh sắt (Fe).- Bộ thử tính dẫn điện, dẫn nhiệt; ống nghiệm, đèn cồn.",
        "lesson": "Bài 21: Sự khác nhau cơ bản giữa phi kim và kim loại",
        "week": "Tuần 22(tiết 98, 99, 100)Tuần 23(tiết 101)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-215",
        "name": "- Ống nghiệm, bát sứ, nước vôi trong, đường ăn, cồn, nến.- Bộ mô hình que nối phân tử hợp chất hữu cơ.",
        "lesson": "Bài 22: Giới thiệu về hợp chất hữu cơ(Dạy học trực tuyến)",
        "week": "Tuần 23(tiết 102, 103)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-216",
        "name": "- Bộ lắp ghép mô hình phân tử CH4 dạng đặc và rỗng.- Bình gas mini (chứa butane), bật lửa, ống nghiệm, nước vôi trong.- Ứng dụng web MolView.",
        "lesson": "Bài 23: Alkane",
        "week": "Tuần 23(tiết 104, 105)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-217",
        "name": "- Bộ mô hình phân tử C2H4.- Dụng cụ điều chế ethylene, ống nghiệm, đèn cồn, dung dịch brom (Br2).",
        "lesson": "Bài 24: Alkene(Dạy học trực tuyến)",
        "week": "Tuần 24(tiết 106, 107, 108)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-218",
        "name": "- Mẫu dầu mỏ thô, than đá; sơ đồ tháp chưng cất phân đoạn dầu mỏ.- Video về quy trình lọc hóa dầu.",
        "lesson": "Bài 25: Nguồn nhiên liệu",
        "week": "Tuần 24(tiết 109, 110)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-219",
        "name": "- Bộ mô hình phân tử C2H5OH.- Hóa chất: cồn 96 độ, cồn 70 độ, mẩu Na, nước cất, ống nghiệm, chén sứ, que đóm.",
        "lesson": "Bài 26: Ethylic Alcohol(Dạy học trực tuyến)",
        "week": "Tuần 25(tiết 111, 112, 113)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-220",
        "name": "- Bộ mô hình phân tử CH3COOH.- Hóa chất: giấm ăn, dd CH3COOH, giấy quỳ tím, dd NaOH, Na2CO3, CuO, ống nghiệm.",
        "lesson": "Bài 27: Acetic Acid Tích hợp năng lực số3.1.TC2aChỉ ra được cách tạo và chỉnh sửa nội dung ở các định dạng khác nhau. (Thiết kế infographic quy trình lên men giấm gạo an toàn)",
        "week": "Tuần 25(tiết 114)Tuần 26 (tiết 118, 119)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-221",
        "name": "- Đề cương ôn tập kim loại, phi kim và đại cương hữu cơ.- Hệ thống câu hỏi trắc nghiệm số trên Azota.",
        "lesson": "Ôn tập KTGK II",
        "week": "Tuần 25(tiết 115)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-222",
        "name": "- Dầu ăn, mỡ lợn, nước cất, cồn, benzen; ống nghiệm, cốc thủy tinh.- Tranh sơ đồ cấu tạo và vai trò sinh học của lipid.",
        "lesson": "Bài 28: Lipid(Dạy học trực tuyến)",
        "week": "Tuần 26(tiết 120)Tuần 27(tiết 121)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-223",
        "name": "- Glucose, saccharose, dung dịch AgNO3, dung dịch NH3, đèn cồn, ống nghiệm, cốc nước nóng.- Video phản ứng tráng gương.",
        "lesson": "Bài 29: Carbohydrate. Glucose và saccharose.",
        "week": "Tuần 27(tiết 122, 123)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-224",
        "name": "- Hồ tinh bột, bông nõn y tế, dung dịch cồn iodine (I2), đĩa thủy tinh đồng hồ, ống nhỏ giọt.",
        "lesson": "Bài 30: Tinh bột và Cellulose",
        "week": "Tuần 27(tiết 124)Tuần 28(tiết 125)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-225",
        "name": "- Lòng trắng trứng gà, cồn, đèn cồn, kẹp sắt, lông gà/vịt (đốt thử mùi khét), ống nghiệm, nước cất.",
        "lesson": "Bài 31: Protein",
        "week": "Tuần 28(tiết 126, 127)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-226",
        "name": "- Mẫu màng PE, ống PVC, cao su, sợi len, tơ nilon; kẹp sắt, đèn cồn thử tính cháy.- Video về tác hại rác thải nhựa và quy trình tái chế.",
        "lesson": "Bài 32: Polymer(Dạy học trực tuyến)",
        "week": "Tuần 28(tiết 128)Tuần 29(tiết 129, 130)",
        "room": "Phòng TH KHTN",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng TH KHTN",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-227",
        "name": "- Biểu đồ tỉ lệ nguyên tố trong vỏ Trái Đất; mẫu quặng sắt, bauxite.- Video khai thác khoáng sản an toàn và bảo vệ môi trường.",
        "lesson": "Bài 30: Sơ lược về hóa học vỏ Trái Đất và khai thác tài nguyên từ vỏ Trái Đất",
        "week": "Tuần 29(tiết 131, 132)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-228",
        "name": "- Mẫu đá vôi, vôi sống, đất sét, cát trắng; mẫu sản phẩm gốm sứ, thủy tinh, xi măng.- Sơ đồ lò nung vôi và lò quay sản xuất xi măng.",
        "lesson": "Bài 34: Khai thác đá vôi. Công nghiệp Silicate.(Dạy học trực tuyến)",
        "week": "Tuần 30(tiết 133, 134)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-229",
        "name": "- Sơ đồ chu trình carbon trong khí quyển; biểu đồ nhiệt độ toàn cầu qua các thế kỉ.- Video hiệu ứng nhà kính và biến đổi khí hậu.",
        "lesson": "Bài 35: Khai thác nhiên liệu hóa thạch. Nguồn carbon. Chu trình carbon và sự ấm lên toàn cầu.",
        "week": "Tuần 30(tiết 135, 136)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-KHTN-K9-230",
        "name": "- Đề cương ôn tập kiểm tra cuối học kì II; hệ thống câu hỏi tổng hợp kiến thức cả năm.- Nền tảng ôn tập Quizizz.",
        "lesson": "Ôn tập KTCK II",
        "week": "Tuần 31(tiết 137, 138)",
        "room": "Lớp học",
        "subject": "Khoa học tự nhiên",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K6-231",
        "name": "Tranh về vai trò và đặc điểm chung của nhà ởTranh kiến trúc nhà ở VN",
        "lesson": "Bài 1: Khái quát nhà ở.",
        "week": "Tuần 1,2(Tiết 1,2)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K6-232",
        "name": "Tranh quy trình Xây dựng nhà ở",
        "lesson": "Bài 2: Xây dựng nhà ở.",
        "week": "Tuần 3,4(Tiết 3,4)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K6-233",
        "name": "Tranh cấu tạo ngôi nhà thông minh",
        "lesson": "Bài 3: Ngôi nhà thông minh",
        "week": "Tuần 5(Tiết 5)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K6-234",
        "name": "Tranh về thực phẩm trong gia đình",
        "lesson": "Bài 4: Thực phẩm và dinh dưỡng(Dạy học trực tuyến)",
        "week": "Tuần 6,7(Tiết 6,7)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K6-235",
        "name": "- Đề cương ôn tập nhà ở, bảo quản chế biến thực phẩm- Hệ thống câu hỏi trắc nghiệm",
        "lesson": "Ôn tập KTGK I",
        "week": "Tuần 8(Tiết 8)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K6-236",
        "name": "Tranh ảnh:- Phương pháp bảo quản thực phẩm.- Phương pháp chế biến thực phẩm.Video:- Giới thiệu vệ sinh an toàn thực phẩm, những vẫn đề cần quan tâm để đảm bảo an toàn thực phẩm trong gia đình.Thiết bị thực hành:- Bộ dụng cụ sử dụng trong chế biến món ăn không sử dụng nhiệt.- Bộ dụng cụ tỉa hoa, trang trí món ăn không sử dụng nhiệt.",
        "lesson": "Bài 5: Bảo quản và chế biến thực phẩm.(Dạy học trực tuyến)Tích hợp năng lực số1.1.TC1c: Tìm kiếm các video/công thức hướng dẫn",
        "week": "Tuần 10, 11,12(Tiết 10,11,12)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K6-237",
        "name": "- Bảng nhu cầu dinh dưỡng- Tháp dinh dưỡng- Bộ dụng cụ nấu ăn- Thực phẩm chế biến món ăn",
        "lesson": "Bài 6: Dự án: Bữa ăn kết nối yêu thương.Tích hợp năng lực số2.4.TCla: Hợp tác nhóm qua công cụ số3.1.TCla: Làm bài trình chiếu/video báo cáo3.2.TCla: Tổng hợp, chỉnh sửa ảnh/video",
        "week": "Tuần 13,14(Tiết 13,14)",
        "room": "Lớp học, ở nhà",
        "subject": "Công nghệ",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học, ở nhà",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K6-238",
        "name": "Tranh về trang phục và đời sống",
        "lesson": "Bài 7: Trang phục trong đời sống.(Dạy học trực tuyến)",
        "week": "Tuần 15, 16(Tiết 15,16)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K6-239",
        "name": "- Đề cương ôn tập kiểm tra cuối học kì I; hệ thống câu hỏi tổng hợp kiến thức cả năm.",
        "lesson": "Ôn tập kiểm tra cuối kì I",
        "week": "Tuần 17(Tiết 17)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K6-240",
        "name": "Tranh về lựa chọn và sử dụng trang phục",
        "lesson": "Bài 8: Sử dụng và bảo quản trang phục.(Dạy học trực tuyến)",
        "week": "Tuần 19,20(Tiết 19,20)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K6-241",
        "name": "Tranh về thời trang trong cuộc sống",
        "lesson": "Bài 9: Thời trang",
        "week": "Tuần 21(Tiết 21)",
        "room": "Lớp học(Thư viện)",
        "subject": "Công nghệ",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học(Thư viện)",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K6-242",
        "name": "Tranh 1 số đồ dùng điện trong gia đìnhVideo:Giới thiệu về an toàn điện khi sử dụng đồ điện trong gia đình, cách sơ cứu khi người bị điện giật.",
        "lesson": "Bài 10: Khái quát về đồ dùng điện trong gia đình.(Dạy học trực tuyến)",
        "week": "Tuần 22, 23(Tiết 22,23)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K6-243",
        "name": "- Đề cương ôn tập trang phục, thời trang, đồ dùng điện- Hệ thống câu hỏi trắc nghiệm",
        "lesson": "Ôn tập KTGK II",
        "week": "Tuần 24(Tiết 24)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K6-244",
        "name": "Tranh cấu tạo Đèn điện",
        "lesson": "Bài 11: Đèn điện.",
        "week": "Tuần 26, 27(Tiết 26,27)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K6-245",
        "name": "Tranh cấu tạo Nồi cơm điệnThiết bị thực hành:- Nồi cơm điện.",
        "lesson": "Bài 12: Nồi cơm điện.",
        "week": "Tuần 28,29(Tiết 28,29)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K6-246",
        "name": "Tranh ảnh:- Bếp điện.Thiết bị thực hành:- Bếp điện.",
        "lesson": "Bài 13: Bếp hồng ngoại.",
        "week": "Tuần 30,31(Tiết 30,31)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K6-247",
        "name": "Video:Giới thiệu về năng lượng, năng lượng tái tạo, sử dụng năng lượng trong gia đình tiết kiệm, hiệu quả.",
        "lesson": "Bài 14: Dự án: An toàn và tiết kiệm điện năng trong gia đình.(Dạy học trực tuyến)Tích hợp năng lực số3.1.TCla: Thiết kế poster, hoặc video tuyên truyền",
        "week": "Tuần 32,33(Tiết 32,33)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K6-248",
        "name": "- Đề cương ôn tập kiểm tra cuối kì II; hệ thống câu hỏi tổng hợp kiến thức cả năm.",
        "lesson": "Ôn tập kiểm tra cuối kì II",
        "week": "Tuần 34(Tiết 34)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 6",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K7-249",
        "name": "Tranh minh họa Mô hình trồng trọt công nghệ cao.",
        "lesson": "Bài 1. Giới thiệu về trồng trọt",
        "week": "Tuần 1,2(Tiết 1,2)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K7-250",
        "name": "- Video Kĩ thuật làm đất trồng",
        "lesson": "Bài 2. Làm đất trồng cây",
        "week": "Tuần 3(Tiết 3)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K7-251",
        "name": "- Tranh các biện pháp phòng trừ sâu bệnh- Video KT chăm sóc cây trồng",
        "lesson": "Bài 3. Gieo trồng, chăm sóc và phòng trừ sâu bệnh cho cây trồng",
        "week": "Tuần 4,5,6(Tiết 4,5,6)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K7-252",
        "name": "Gv tự trang bị 1 số ảnh , Video về thu hoạch nông sản",
        "lesson": "Bài 4. Thu hoạch sản phẩm trồng trọt(Dạy học trực tuyến)",
        "week": "Tuần 7 (Tiết 7)",
        "room": "Lớp học(Thư viện)",
        "subject": "Công nghệ",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học(Thư viện)",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K7-253",
        "name": "- Video nhân giống cây trồng bằng phương pháp giâm cành- Ảnh 1 số loại cây dễ nhân giống cây trồng bằng phương pháp giâm cành",
        "lesson": "Bài 5. Nhân giống vô tính cây trồng",
        "week": "Tuần 10, 11(Tiết 10,11)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K7-254",
        "name": "- Video về trồng rau an toàn- Thiết bị: Chậu nhựa, thùng xốp trồng cây, dụng cụ trồng",
        "lesson": "Bài 6. Dự án trồng rau an toàn",
        "week": "Tuần 12,13(Tiết 12,13)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K7-255",
        "name": "Gv tự trang bị Video bảo vệ rừng",
        "lesson": "Bài 8. Trồng, chăm sóc và bảo vệ rừng(Dạy học trực tuyến)",
        "week": "Tuần 15,16(Tiết 15,16)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K7-256",
        "name": "Phiếu học tập",
        "lesson": "Ôn tập KTCK I",
        "week": "Tuần 17(Tiết 17)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K7-257",
        "name": "Đề kiểm tra",
        "lesson": "Kiểm tra cuối kì I",
        "week": "Tuần 18(Tiết 18)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K7-258",
        "name": "Tranh minh họa Một số vật nuôi đặc trưng theo vùng miền.",
        "lesson": "Bài 9. Giới thiệu về chăn nuôi(Dạy học trực tuyến)",
        "week": "Tuần 19,20(Tiết 19,20)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K7-259",
        "name": "Tranh: vai trò của nuôi dưỡng và chăm sóc phòng trị bệnh; Một số giống vật nuôi và yêu cầu vệ sinh trong chăn nuôi.",
        "lesson": "Bài 10. Nuôi dưỡng và chăm sóc vật nuôi(Dạy học trực tuyến)",
        "week": "Tuần 21,22,23(Tiết 21,22,23)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K7-260",
        "name": "Gv tự trang bị tranh ảnh video công tác phòng trị bệnh cho vật nuôi",
        "lesson": "Bài 11. Phòng và trị bệnh cho vật nuôi",
        "week": "Tuần 24,25 (Tiết 24,25)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K7-261",
        "name": "Gv tự trang bị tranh ảnh kĩ thuật nuôi dưỡng, chăm sóc và phòng, trị bệnh cho gà thịt.",
        "lesson": "Bài 12. Chăn nuôi gà thịt nông hộ",
        "week": "Tuần 26(Tuần 26)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K7-262",
        "name": "Phiếu học tập",
        "lesson": "Ôn tập KTGK II",
        "week": "Tuần 27(Tuân 27)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K7-263",
        "name": "Đề kiểm tra",
        "lesson": "Kiểm tra giữa kì II",
        "week": "Tuần 28(Tuần 28)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K7-264",
        "name": "Tranh: môi trường nước nuôi thuỷ sản; Thức ăn thuỷ sản; Quy trình nuôi tôm cá. Đĩa sếch xi, nhiệt kế",
        "lesson": "Bài 14. Giới thiệu về thủy sản(Dạy học trực tuyến)Tích hợp năng lực số3.1.TC1a – Thu thập thông tin về vai trò, các loài thủy sản có giá trị kinh tế.4.3.TC1a – Ứng xử an toàn/có trách nhiệm khi chia sẻ thông tin về bảo vệ nguồn lợi thủy sản.",
        "week": "Tuần 30(Tuần 30)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K7-265",
        "name": "Đĩa sếch xi, nhiệt kếGv tự trang bị tranh anh video liên quan kĩ thuật chăm sóc, phòng, trị bệnh và thu hoạch cá trong ao nuôi.",
        "lesson": "Bài 15. Nuôi cá ao",
        "week": "Tuần 31, 32 (Tiết 31,32)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K7-266",
        "name": "Quy trình công nghệ nuôi thuỷ sản; Mẫu báo cáo số 1 và 2.",
        "lesson": "Bài 16: Thực hành: lập kế hoạch nuôi cá cảnh",
        "week": "Tuần 33(Tuần 33)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K7-267",
        "name": "Phiếu học tập",
        "lesson": "Ôn tập kiểm tra cuối kì II",
        "week": "Tuần 34(Tuần 34)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K7-268",
        "name": "Đề kiểm tra",
        "lesson": "Kiểm tra cuối kì II",
        "week": "Tuần 35(Tuần 35)",
        "room": "Lớp học",
        "subject": "Công nghệ",
        "grade": "Khối 7",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Lớp học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-269",
        "name": "Tranh tiêu chuẩn khổ giấy, bộ dụng cụ vẽ.",
        "lesson": "Bài 1: Tiêu chuẩn trình bày bản vẽ kĩ thuật",
        "week": "Tuần 1(Tiết 1)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-270",
        "name": "- Tranh hình chiếu vuông góc- Mô hình các khối đa diện, khối tròn xoay",
        "lesson": "Bài 2: Hình chiếu vuông góc",
        "week": "Tuần 2(Tiết 2) Tuần 3(Tiết 3) Tuần 4(Tiết 4)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-271",
        "name": "Tranh bản vẽ chi tiết",
        "lesson": "Bài 3: Bản vẽ chi tiết",
        "week": "Tuần 5(Tiết 5) Tuần 6(Tiết 6)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-272",
        "name": "Tranh bản vẽ lắp",
        "lesson": "Bài 4: Bản vẽ lắp",
        "week": "Tuần 7(Tiết 7) Tuần 8(Tiết 8)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-273",
        "name": "Câu hỏi và sơ đồ tư duy",
        "lesson": "Ôn tập",
        "week": "Tuần 9(Tiết 9)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-274",
        "name": "Đề và đáp án",
        "lesson": "Kiểm tra giữa kì I",
        "week": "Tuần 10(Tiết 10)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-275",
        "name": "Tranh bản vẽ nhà",
        "lesson": "Bài 5: Bản vẽ nhà",
        "week": "Tuần 11(Tiết 11) Tuần 12(Tiết 12)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-276",
        "name": "Bộ tiêu bản vật liệu cơ khí",
        "lesson": "Bài 6: Vật liệu cơ khí(Dạy học trực tuyến)",
        "week": "Tuần 13(Tiết 13) Tuần 14(Tiết 14)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-277",
        "name": "Mô hình truyền và biến đổi chuyển động",
        "lesson": "Bài 7: Truyền và biến đổi chuyển động",
        "week": "Tuần 15(Tiết 15) Tuần 18(Tiết 18) Tuần 19(Tiết 19)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Mô hình",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-278",
        "name": "Câu hỏi và sơ đồ tư duy",
        "lesson": "Ôn tập cuối kì I",
        "week": "Tuần 16(Tiết 16)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-279",
        "name": "Đề và đáp án",
        "lesson": "Kiểm tra cuối kì I",
        "week": "Tuần 17(Tiết 17)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-280",
        "name": "Bộ dụng cụ cơ khí",
        "lesson": "Bài 8: Gia công cơ khí bằng tay",
        "week": "Tuần 19(Tiết 20)Tuần 20(Tiết 21)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-281",
        "name": "Tranh ảnh nghề nghiệp",
        "lesson": "Bài 9: Ngành nghề trong lĩnh vực cơ khí",
        "week": "Tuần 20(Tiết 22)Tuần 21(Tiết 23)",
        "room": "Thư ViệnPhòng học",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Thư ViệnPhòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-282",
        "name": "Kéo, thước, bút chì, ...Bộ dụng cụ cơ khí",
        "lesson": "Bài 10: Dự án: Gia công chi tiết bằng dụng cụ cầm tay",
        "week": "Tuần 21(Tiết 24)Tuần 22(Tiết 25)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-283",
        "name": "Tranh ảnh về các nguyên nhân gây tai nạn điện",
        "lesson": "Bài 11: Tai nạn điện",
        "week": "Tuần 22(Tiết 26)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-284",
        "name": "Một số trang bị bảo hộ, bút thử điện",
        "lesson": "Bài 12: Biện pháp an toàn điện(Dạy học trực tuyến)",
        "week": "Tuần 23(Tiết 27,28)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-285",
        "name": "Dụng cụ sơ cứu giả định",
        "lesson": "Bài 13: Sơ cứu người bị tai nạn điện",
        "week": "Tuần 24(Tiết 29,30)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-286",
        "name": "Tranh ảnh các thành phần mạch điện",
        "lesson": "Bài 14: Khái quát về mạch điện",
        "week": "Tuần 25(Tiết 31,32)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-287",
        "name": "Câu hỏi và sơ đồ tư duy",
        "lesson": "Ôn tập giữa kì II",
        "week": "Tuần 26(Tiết 33)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-288",
        "name": "Đề và đáp án",
        "lesson": "Kiểm tra giữa kì II",
        "week": "Tuần 26(Tiết 34)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-289",
        "name": "Mô đun cảm biến: ánh sáng, nhiệt độ, độ ẩm",
        "lesson": "Bài 15: Cảm biến và mô đun cảm biến",
        "week": "Tuần 27(Tiết 35,36)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-290",
        "name": "Bộ linh kiện lắp ráp mạch điện cảm biến",
        "lesson": "Bài 16: Mạch điện điều khiển sử dụng mô đun cảm biến",
        "week": "Tuần 28(Tiết 37,38)Tuần 29(Tiết 39,40)Tuần 30(Tiết 41)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-291",
        "name": "Phiếu học tập cá nhân",
        "lesson": "Bài 17: Ngành nghề trong lĩnh vực kĩ thuật điện(Dạy học trực tuyến)",
        "week": "Tuần 30(Tiết 42)Tuần 31(Tiết 43)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-292",
        "name": "Tranh ảnh sản phẩm thiết kế kĩ thuật",
        "lesson": "Bài 18: Giới thiệu về thiết kế kĩ thuật",
        "week": "Tuần 31(Tiết 44)Tuần 32(Tiết 45)",
        "room": "Thư Viện",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Thư Viện",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-293",
        "name": "Máy tính, video về quy trình thiết kế",
        "lesson": "Bài 19: Các bước cơ bản trong thiết kế kĩ thuật",
        "week": "Tuần 32(Tiết 46)Tuần 33(Tiết 47,48)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-294",
        "name": "Tranh ảnh (sưu tầm)",
        "lesson": "Ôn tập cuối kì II",
        "week": "Tuần 34(Tiết 49)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-295",
        "name": "Đề kiểm tra",
        "lesson": "Kiểm tra cuối kì II",
        "week": "Tuần 34(Tiết 50)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K8-296",
        "name": "Van nước, ống nhựa, cảm biến độ ẩm...",
        "lesson": "Bài 20: Dự án : thiết kế hệ thống tưới cây tự động",
        "week": "Tuần 35(Tiết 51,52)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 8",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K9-297",
        "name": "- Máy tính- Sưu tầm hình ảnh về một số ngành nghề thuộc lĩnh vực kỹ thuật và công nghệ.",
        "lesson": "Bài 1. Nghề nghiệp trong lĩnh vực kĩ thuật và công nghệ",
        "week": "Tuần 1(Tiết 1,2) Tuần 2(Tiết 3)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K9-298",
        "name": "Sơ đồ hệ thống giáo dục Việt Nam",
        "lesson": "Bài 2. Cơ cấu hệ thống giáo dục quốc dân",
        "week": "Tuần 2(Tiết 4) Tuần 3(Tiết 5,6)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K9-299",
        "name": "Số liệu thị trường lao động, máy tính",
        "lesson": "Bài 3. Thị trường lao động kĩ thuật, công nghệ tại Việt Nam",
        "week": "Tuần 4(Tiết 7,8) Tuần 5(Tiết 9)",
        "room": "Thư viện/Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Thư viện/Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K9-300",
        "name": "Phiếu trắc nghiệm Holland, máy tính",
        "lesson": "Bài 4. Quy trình lựa chọn nghề nghiệp",
        "week": "Tuần 5(Tiết 10) Tuần 6(Tiết 11,12)Tuần 7(Tiết 13)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K9-301",
        "name": "Máy tính, ti vi",
        "lesson": "Bài 5: Dự án: Tự đánh giá mức độ phù hợp của bản thân với một số ngành nghề thuộc lĩnh vực kĩ thuật, công nghệ",
        "week": "Tuần 7(Tiết 14)Tuần 8(Tiết 15)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K9-302",
        "name": "Câu hỏi và bài tập",
        "lesson": "ÔN TẬP",
        "week": "Tuần 8(Tiết 16)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K9-303",
        "name": "Đề và đáp án",
        "lesson": "Kiểm tra giữa kì I",
        "week": "Tuần 9(Tiết 17)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K9-304",
        "name": "- Các thiết bị đóng cắt: công tắc, cầu dao, aptomat.- Các thiết bị lấy điện: ổ cắm điện, phích cắm điện.",
        "lesson": "Bài 1. Thiết bị đóng, cắt và lấy điện trong gia đình(Dạy học trực tuyến)",
        "week": "Tuần 9(Tiết 18)Tuần 10(Tiết 19,20) Tuần 11(Tiết 21)",
        "room": "Phòng học/phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học/phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K9-305",
        "name": "Các dụng cụ đo điện: đồng hồ vạn năng, ampe kìm, công tơ điện.",
        "lesson": "Bài 2. Dụng cụ đo điện cơ bản",
        "week": "Tuần 11(Tiết 22)Tuần 12(Tiết 23,24) Tuần 13(Tiết 25)",
        "room": "Phòng học/phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học/phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K9-306",
        "name": "Dây điện, ống luồn, kìm, tua vít",
        "lesson": "Bài 3. Thiết kế mạng điện trong nhà",
        "week": "Tuần 13(Tiết 26)Tuần 14(Tiết 27,28) Tuần 15(Tiết 29)",
        "room": "Phòng học/phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học/phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K9-307",
        "name": "Aptomat, công tắc, ổ cắm, bẳng điện, băng keo cách điện, kìm, vít, búa,...",
        "lesson": "Bài 4. Vật liệu, thiết bị và dụng cụ dùng cho lắp đặt mạng điện trong nhà(Dạy học trực tuyến)",
        "week": "Tuần 15(Tiết 30)Tuần 16(Tiết 31)Tuần 18(Tiết 34,35)",
        "room": "Phòng học/phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học/phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K9-308",
        "name": "Câu hỏi và bài tập, sơ đồ tư duy.",
        "lesson": "Ôn tập",
        "week": "Tuần 16(Tiết 32)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K9-309",
        "name": "Đề kiểm tra",
        "lesson": "Kiểm tra cuối kì I",
        "week": "Tuần 17(Tiết 33)",
        "room": "Phòng học",
        "subject": "Công nghệ",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K9-310",
        "name": "Bảng báo giá vật tư, máy tính",
        "lesson": "Bài 5. Tính toán chi phí cho mạng điện trong nhà (Tăng tiết)",
        "week": "Tuần 19(Tiết 36,37)Tuần 20(Tiết 38)",
        "room": "Phòng họcPhòng họcPhòng học",
        "subject": "Công nghệ",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng họcPhòng họcPhòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K9-311",
        "name": "Bộ dụng cụ điện",
        "lesson": "Bài 6. Thực hành: Lắp đặt mạng điện trong nhà(Tăng tiết)",
        "week": "Tuần 20(Tiết 39)Tuần 21(Tiết 40,41) Tuần 22(Tiết 42,43)Tuần 23 (Tiết 44) Tuần 24(Tiết 45)Tuần 26(Tiết 47)Tuần 27(Tiết 48)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K9-312",
        "name": "- Đề kiểm tra - Các dụng cụ điện.",
        "lesson": "Kiểm tra giữa kì II (thực hành)",
        "week": "Tuần 25(Tiết 46)",
        "room": "phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K9-313",
        "name": "Tranh ảnh một số nghề liên quan đến lắp đặt mạng điện",
        "lesson": "Bài 7: Một số ngành nghề liên quan đến lắp đặt mạng điện trong nhà(Dạy học trực tuyến)",
        "week": "Tuần 28(Tiết 49)Tuần 29(Tiết 50)",
        "room": "Thư việnPhòng học",
        "subject": "Công nghệ",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Tranh",
        "location": "Thư việnPhòng học",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K9-314",
        "name": "Câu hỏi củng cố kiến thức",
        "lesson": "Ôn tập",
        "week": "Tuần 30(Tiết 51)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-CN-K9-315",
        "name": "Đề kiểm tra",
        "lesson": "Kiểm tra cuối kì II",
        "week": "Tuần 31(Tiết 52)",
        "room": "Phòng bộ môn",
        "subject": "Công nghệ",
        "grade": "Khối 9",
        "total": 10,
        "available": 10,
        "unit": "Bộ",
        "location": "Phòng bộ môn",
        "status": "Sẵn sàng sử dụng"
    },
    {
        "code": "TB-DC-001",
        "name": "Máy chiếu di động độ nét cao EPSON + Màn chiếu",
        "lesson": "Dùng chung cho tất cả các bài dạy",
        "week": "Tất cả các tuần",
        "room": "Phòng Thiết bị chung",
        "subject": "Dùng chung",
        "grade": "Toàn trường",
        "total": 6,
        "available": 6,
        "unit": "Bộ",
        "location": "Phòng Thiết bị chung",
        "status": "Hoạt động tốt"
    },
    {
        "code": "TB-DC-002",
        "name": "Loa kéo trợ giảng công suất lớn + 2 Micro không dây",
        "lesson": "Dùng chung cho tất cả các bài dạy",
        "week": "Tất cả các tuần",
        "room": "Phòng Thiết bị chung",
        "subject": "Dùng chung",
        "grade": "Toàn trường",
        "total": 8,
        "available": 8,
        "unit": "Bộ",
        "location": "Phòng Thiết bị chung",
        "status": "Hoạt động tốt"
    },
    {
        "code": "TB-DC-003",
        "name": "Bút trình chiếu Laser không dây Logi",
        "lesson": "Dùng chung cho tất cả các bài dạy",
        "week": "Tất cả các tuần",
        "room": "Phòng Thiết bị chung",
        "subject": "Dùng chung",
        "grade": "Toàn trường",
        "total": 15,
        "available": 15,
        "unit": "Cái",
        "location": "Phòng Thiết bị chung",
        "status": "Hoạt động tốt"
    }
];

  class EquipmentSyncManager {
    constructor() {
      this.dbUrl = DEFAULT_FIREBASE_DB_URL;
      this.dbRef = null;
      this.isConnected = false;
      this.isRemoteUpdating = false;
      this.lastCloudTimestamp = 0;
      this.equipments = [];
      this.borrowRecords = [];
      this.currentFilterWeek = 'ALL';
      this.currentFilterStatus = 'ALL';
      this.currentFilterTeacher = 'ALL';
      this.searchKeyword = '';

      // Trạng thái Phân hệ Danh mục 318 Thiết bị Dạy học (PL3)
      this.activeSubTab = 'catalog'; // 'catalog' | 'tracking'
      this.catalogSubject = 'ALL';
      this.catalogGrade = 'ALL';
      this.catalogKeyword = '';

      this.initLocalData();
      this.setupListeners();
      this.initFirebase();
    }

    initLocalData() {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          const hasKHTN = parsed.equipments && Array.isArray(parsed.equipments) && parsed.equipments.some(e => (e.code || '').startsWith('TB-KHTN'));
          if (hasKHTN && parsed.equipments.length >= 318) {
            this.equipments = parsed.equipments;
          } else {
            this.equipments = JSON.parse(JSON.stringify(FALLBACK_KHTN_EQUIPMENTS));
          }
          if (parsed.borrowRecords && Array.isArray(parsed.borrowRecords)) {
            this.borrowRecords = parsed.borrowRecords;
          }
        }
      } catch (e) {
        console.warn('Không thể đọc cache thiết bị từ LocalStorage:', e);
      }

      if (!this.equipments || this.equipments.length < 318 || !this.equipments.some(e => (e.code || '').startsWith('TB-KHTN'))) {
        this.equipments = JSON.parse(JSON.stringify(FALLBACK_KHTN_EQUIPMENTS));
      }
    }

    saveLocalData() {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
          equipments: this.equipments,
          borrowRecords: this.borrowRecords,
          updatedAt: new Date().toISOString()
        }));
      } catch (e) {}
    }

    setupListeners() {
      window.addEventListener('online', () => {
        this.updateBadge('connected', 'Đám Mây Trực Tuyến 🟢');
        this.pullFromCloud();
      });

      window.addEventListener('offline', () => {
        this.updateBadge('offline', 'Ngoại Tuyến (Lưu Nội Bộ) 📱');
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.pullFromCloud();
        }
      });

      if (localBroadcast) {
        localBroadcast.onmessage = (event) => {
          if (event.data && event.data.type === 'SYNC_DATA') {
            this.handleIncomingData(event.data.payload, true);
          }
        };
      }

      // Kiểm tra nhịp tim cloud mỗi 6 giây
      setInterval(() => {
        if (document.visibilityState === 'visible' && navigator.onLine && !this.isRemoteUpdating) {
          this.checkCloudPulse();
        }
      }, 6000);

      // Khởi tạo thanh thước trượt ngang cố định đáy màn hình
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initStickyScrollbar());
      } else {
        setTimeout(() => this.initStickyScrollbar(), 120);
      }

      // Tự động cập nhật giao diện phân quyền khi chuyển đổi tài khoản
      window.addEventListener('khbd:user-changed', () => {
        setTimeout(() => this.renderEquipmentView(), 80);
      });
    }

    initFirebase() {
      if (!window.firebase) {
        setTimeout(() => this.initFirebase(), 350);
        return;
      }

      try {
        let app;
        if (!window.firebase.apps || window.firebase.apps.length === 0) {
          app = window.firebase.initializeApp({ databaseURL: this.dbUrl });
        } else {
          app = window.firebase.app();
        }

        const database = window.firebase.database();
        this.dbRef = database.ref(FIREBASE_DB_PATH);

        // Lắng nghe trạng thái kết nối
        database.ref('.info/connected').on('value', (snap) => {
          if (snap.val() === true) {
            this.isConnected = true;
            this.updateBadge('connected', 'Đám Mây Trực Tuyến 🟢');
          } else {
            this.isConnected = false;
            this.updateBadge(navigator.onLine ? 'connecting' : 'offline', navigator.onLine ? 'Đang Kết Nối ⚡' : 'Ngoại Tuyến 📱');
          }
        });

        // Lắng nghe dữ liệu thời gian thực
        this.dbRef.on('value', (snapshot) => {
          const cloudData = snapshot.val();
          if (cloudData && typeof cloudData === 'object') {
            this.handleIncomingData(cloudData);
          } else if (cloudData === null) {
            this.pushToCloud(true);
          }
        }, (err) => {
          console.warn('Firebase WebSocket Fallback to REST:', err);
          this.pullFromCloud();
        });

      } catch (err) {
        console.warn('Khởi tạo Firebase SDK thất bại, dùng REST API:', err);
        this.pullFromCloud();
      }
    }

    async checkCloudPulse() {
      try {
        const pulseUrl = `${this.dbUrl}/${FIREBASE_DB_PATH}/timestamp.json?t=${Date.now()}`;
        const res = await fetch(pulseUrl, { cache: 'no-cache' });
        if (res.ok) {
          const remoteTs = await res.json();
          if (remoteTs && typeof remoteTs === 'number' && remoteTs > (this.lastCloudTimestamp || 0)) {
            this.pullFromCloud();
          }
        }
      } catch (e) {}
    }

    async pullFromCloud() {
      if (!navigator.onLine) return;
      try {
        const url = `${this.dbUrl}/${FIREBASE_DB_PATH}.json?t=${Date.now()}`;
        const res = await fetch(url, { cache: 'no-cache' });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            this.handleIncomingData(data);
          }
        }
      } catch (e) {}
    }

    handleIncomingData(cloudData, isCrossTab = false) {
      if (!cloudData) return;
      if (!isCrossTab && cloudData.lastSenderClientId === CLIENT_SESSION_ID) return;

      this.isRemoteUpdating = true;
      try {
        if (cloudData.equipments) {
          const incomingEqs = normalizeArray(cloudData.equipments);
          const hasKHTN = incomingEqs.some(e => (e.code || '').startsWith('TB-KHTN') || (e.subject || '').includes('Khoa học tự nhiên'));
          if (hasKHTN && incomingEqs.length >= 318) {
            this.equipments = incomingEqs;
          } else {
            console.warn('Dữ liệu cloud chưa đủ 318 TB KHTN-CN, giữ nguyên 318 TB chuẩn.');
            if (!this.equipments || this.equipments.length < 318 || !this.equipments.some(e => (e.code || '').startsWith('TB-KHTN'))) {
              this.equipments = JSON.parse(JSON.stringify(FALLBACK_KHTN_EQUIPMENTS));
            }
          }
        }
        if (cloudData.borrowRecords !== undefined) {
          this.borrowRecords = normalizeArray(cloudData.borrowRecords);
        }
        if (cloudData.timestamp) {
          this.lastCloudTimestamp = cloudData.timestamp;
        }

        this.saveLocalData();
        this.renderEquipmentView();

        const badgeText = cloudData.lastSenderUser ? `Đã đồng bộ (${cloudData.lastSenderUser}) ⚡` : 'Đám Mây Trực Tuyến 🟢';
        this.updateBadge('syncing', badgeText);
        setTimeout(() => {
          this.updateBadge('connected', 'Đám Mây Trực Tuyến 🟢');
        }, 2000);

      } finally {
        this.isRemoteUpdating = false;
      }
    }

    async pushToCloud(isInitial = false) {
      if (this.isRemoteUpdating && !isInitial) return;

      const user = window.AppStorage ? window.AppStorage.getCurrentUser() : null;
      const currentTs = Date.now();
      this.lastCloudTimestamp = currentTs;

      // Lưu trước vào local
      this.saveLocalData();

      // Cập nhật lên cloud bằng PATCH hoặc SET
      const payload = {
        equipments: this.equipments,
        borrowRecords: this.borrowRecords,
        lastSenderClientId: CLIENT_SESSION_ID,
        lastSenderUser: user ? user.name : 'Giáo viên THCS Tây Phú',
        lastUpdatedAt: new Date().toISOString(),
        timestamp: currentTs
      };

      if (localBroadcast) {
        try {
          localBroadcast.postMessage({ type: 'SYNC_DATA', payload });
        } catch (e) {}
      }

      this.updateBadge('syncing', 'Đang Lưu Đám Mây ⚡');

      // Gửi qua WebSocket nếu sẵn sàng
      if (this.dbRef) {
        try {
          await this.dbRef.update(payload);
          this.updateBadge('connected', 'Đã Lưu Đám Mây 🟢');
          return { success: true };
        } catch (e) {
          console.warn('Lỗi WebSocket update, chuyển sang REST:', e);
        }
      }

      // Gửi qua HTTP REST PATCH
      try {
        const restUrl = `${this.dbUrl}/${FIREBASE_DB_PATH}.json`;
        const res = await fetch(restUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          this.updateBadge('connected', 'Đã Lưu Đám Mây 🟢');
          return { success: true };
        }
      } catch (err) {
        console.error('Lỗi đẩy dữ liệu lên Firebase REST:', err);
        this.updateBadge('offline', 'Lưu Cục Bộ (Chờ mạng) 📱');
      }

      return { success: false };
    }

    updateBadge(status, text) {
      const badge = document.getElementById('equipment-cloud-badge');
      if (!badge) return;

      badge.innerHTML = text;
      badge.className = 'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition shadow-sm ';
      if (status === 'connected') {
        badge.className += 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      } else if (status === 'syncing') {
        badge.className += 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse';
      } else if (status === 'connecting') {
        badge.className += 'bg-amber-50 text-amber-700 border border-amber-200';
      } else {
        badge.className += 'bg-rose-50 text-rose-700 border border-rose-200';
      }
    }

    // Danh sách thiết bị phù hợp cho Tổ KHTN - CN và Dùng chung
    // Lọc thiết bị chính xác theo Môn và Khối lớp
    getEquipmentsBySubjectAndGrade(subject, grade) {
      if (!this.equipments || this.equipments.length === 0) {
        this.equipments = JSON.parse(JSON.stringify(FALLBACK_KHTN_EQUIPMENTS));
      }
      const subLower = (subject || '').toLowerCase().trim();
      const gradeLower = (grade || '').toLowerCase().trim();

      const matched = this.equipments.filter(eq => {
        const eqSub = (eq.subject || '').toLowerCase();
        const eqGrade = (eq.grade || '').toLowerCase();

        // Luôn cho phép thiết bị dùng chung
        if (eqSub.includes('dùng chung') || eqGrade.includes('toàn trường')) return true;

        let matchSub = false;
        if (subLower.includes('công nghệ')) {
          matchSub = eqSub.includes('công nghệ');
        } else if (subLower.includes('khoa học tự nhiên') || subLower.includes('khtn') || subLower.includes('vật') || subLower.includes('hóa') || subLower.includes('sinh')) {
          matchSub = eqSub.includes('khoa học tự nhiên');
        } else {
          matchSub = eqSub.includes(subLower);
        }

        const matchGrade = !gradeLower || eqGrade.includes(gradeLower) || eqGrade.includes('toàn trường');
        return matchSub && matchGrade;
      });

      return matched.length > 0 ? matched : this.getKHTNEquipments();
    }

    getKHTNEquipments() {
      return this.equipments.filter(eq => {
        const sub = (eq.subject || '').toLowerCase();
        const isKHTN = sub.includes('khoa học tự nhiên') ||
                       sub.includes('vật lí') || sub.includes('vật lý') ||
                       sub.includes('hóa học') || sub.includes('sinh học') ||
                       sub.includes('công nghệ') ||
                       sub.includes('dùng chung');
        return isKHTN;
      });
    }

    // Đăng ký mượn thiết bị tự động từ Form Nộp KHBD
    async borrowFromKHBD(planData, eqOptions) {
      if (!eqOptions || !eqOptions.equipmentCode) return null;

      const user = window.AppStorage.getCurrentUser();
      const eq = this.equipments.find(e => e.code === eqOptions.equipmentCode);
      if (!eq) {
        throw new Error(`Không tìm thấy thiết bị mã ${eqOptions.equipmentCode} trong danh mục!`);
      }

      const quantity = parseInt(eqOptions.quantity) || 1;
      if (eq.available < quantity) {
        throw new Error(`Thiết bị "${eq.name}" chỉ còn khả dụng ${eq.available} ${eq.unit} trong kho!`);
      }

      // Giảm tồn kho
      eq.available = Math.max(0, eq.available - quantity);

      const today = new Date().toISOString().split('T')[0];
      const newRecord = {
        id: `REC-2026-${String(this.borrowRecords.length + 1).padStart(3, '0')}`,
        teacherId: user ? user.id : 'GV_KHTN',
        teacherName: user ? user.name : 'Giáo viên KHTN - CN',
        deptName: 'Tổ Khoa học tự nhiên – Công nghệ',
        subject: planData.monHoc || eq.subject || 'Khoa học tự nhiên',
        grade: planData.khoi || eq.grade || 'Khối 9',
        className: planData.lop || '9A4',
        week: planData.tuan || 1,
        date: eqOptions.borrowDate || today,
        session: eqOptions.session || 'Sáng',
        period: `Tiết ${planData.tietPPCT || eqOptions.period || '1'}`,
        lessonTitle: planData.tieuDe || 'Bài dạy thực hành',
        equipmentCode: eq.code,
        equipmentName: eq.name,
        quantity: quantity,
        room: eqOptions.room || (eq.subject.includes('Công nghệ') ? 'Xưởng thực hành CN' : 'Phòng TH KHTN'),
        conditionBorrow: eqOptions.conditionBorrow || "Tốt",
        status: "Đang mượn",
        returnDate: "",
        conditionReturn: "",
        staffConfirm: "Nguyễn Sỹ Tuấn",
        planId: planData.id || '',
        createdAt: new Date().toISOString()
      };

      this.borrowRecords.unshift(newRecord);
      await this.pushToCloud();

      return newRecord;
    }

    // Đăng ký mượn nhanh trực tiếp từ Tab Thiết bị
    async borrowQuick(data) {
      let user = window.AppStorage ? window.AppStorage.getCurrentUser() : null;
      if (!user) {
        user = { id: 'u_ha_khtn', name: 'Võ Văn Hà', role: 'to_truong' };
      }

      if (!data || !data.equipmentCode) {
        throw new Error('Vui lòng chọn thiết bị dạy học cần mượn!');
      }

      if (!this.equipments || this.equipments.length < 318 || !this.equipments.some(e => (e.code || '').startsWith('TB-KHTN'))) {
        this.equipments = JSON.parse(JSON.stringify(FALLBACK_KHTN_EQUIPMENTS));
      }

      let eq = this.equipments.find(e => e.code === data.equipmentCode);
      if (!eq) {
        eq = FALLBACK_KHTN_EQUIPMENTS.find(e => e.code === data.equipmentCode);
        if (eq) {
          this.equipments.push({ ...eq });
        }
      }
      if (!eq) {
        throw new Error(`Không tìm thấy thiết bị [${data.equipmentCode}] trong hệ thống! Vui lòng chọn lại thiết bị.`);
      }

      const quantity = parseInt(data.quantity) || 1;
      if (eq.available < quantity) {
        throw new Error(`Chỉ còn ${eq.available} ${eq.unit} trong kho!`);
      }

      eq.available = Math.max(0, eq.available - quantity);

      const newRecord = {
        id: `REC-2026-${String(this.borrowRecords.length + 1).padStart(3, '0')}`,
        teacherId: user.id,
        teacherName: user.name,
        deptName: 'Tổ Khoa học tự nhiên – Công nghệ',
        subject: data.subject || eq.subject,
        grade: data.grade || eq.grade,
        className: data.className || '9A4',
        week: parseInt(data.week) || 1,
        date: data.date || new Date().toISOString().split('T')[0],
        session: data.session || 'Sáng',
        period: data.period || 'Tiết 1, 2',
        lessonTitle: data.lessonTitle || 'Dạy thực hành / Ứng dụng CNTT',
        equipmentCode: eq.code,
        equipmentName: eq.name,
        quantity: quantity,
        room: data.room || 'Phòng TH KHTN',
        conditionBorrow: data.conditionBorrow || "Tốt",
        status: "Đang mượn",
        returnDate: "",
        conditionReturn: "",
        staffConfirm: "Nguyễn Sỹ Tuấn",
        createdAt: new Date().toISOString()
      };

      this.borrowRecords.unshift(newRecord);
      await this.pushToCloud();
      this.renderEquipmentView();

      return newRecord;
    }

    // Giáo viên báo trả thiết bị
    async returnEquipment(recordId, returnData) {
      const record = this.borrowRecords.find(r => r.id === recordId);
      if (!record) throw new Error('Không tìm thấy phiếu mượn thiết bị này!');

      record.status = "Đã trả";
      record.returnDate = returnData.returnDate || new Date().toISOString().split('T')[0];
      record.conditionReturn = returnData.conditionReturn || "Tốt, hoạt động bình thường";
      record.returnNote = returnData.returnNote || "";

      // Trả lại số lượng khả dụng
      const eq = this.equipments.find(e => e.code === record.equipmentCode);
      if (eq) {
        eq.available = Math.min(eq.total, eq.available + (record.quantity || 1));
      }

      await this.pushToCloud();
      this.renderEquipmentView();
      return record;
    }

    // Cán bộ thiết bị / Tổ trưởng xác nhận đã nhận lại
    async confirmReturn(recordId, staffName) {
      const record = this.borrowRecords.find(r => r.id === recordId);
      if (!record) return;

      record.staffConfirm = staffName || "Nguyễn Sỹ Tuấn";
      if (record.status !== "Đã trả") {
        record.status = "Đã trả";
        record.returnDate = new Date().toISOString().split('T')[0];
        record.conditionReturn = "Tốt, đã kiểm tra";
        const eq = this.equipments.find(e => e.code === record.equipmentCode);
        if (eq) eq.available = Math.min(eq.total, eq.available + (record.quantity || 1));
      }

      await this.pushToCloud();
      this.renderEquipmentView();
    }

    // Lọc danh sách mượn trả theo Tổ KHTN - CN
    getFilteredRecords() {
      const user = window.AppStorage ? window.AppStorage.getCurrentUser() : null;
      let list = this.borrowRecords.filter(r => {
        const isKHTN = (r.deptName || '').includes('Tự nhiên') ||
                       (r.subject || '').includes('Khoa học tự nhiên') ||
                       (r.subject || '').includes('Vật lí') ||
                       (r.subject || '').includes('Hóa học') ||
                       (r.subject || '').includes('Sinh học') ||
                       (r.subject || '').includes('Công nghệ');
        return isKHTN;
      });

      // Nếu là Giáo viên thường: Chỉ lọc ra các lượt mượn của chính mình (không thấy các GV khác)
      if (!this.isAdminOrLeader() && user) {
        list = list.filter(r => {
          const matchName = r.teacherName && user.name && r.teacherName.trim().toLowerCase() === user.name.trim().toLowerCase();
          const matchId = r.teacherId && user.id && r.teacherId === user.id;
          const matchUsername = r.teacherUsername && user.username && r.teacherUsername === user.username;
          return matchName || matchId || matchUsername;
        });
      }

      if (this.currentFilterWeek !== 'ALL') {
        list = list.filter(r => String(r.week) === String(this.currentFilterWeek));
      }

      if (this.currentFilterStatus !== 'ALL') {
        list = list.filter(r => r.status === this.currentFilterStatus);
      }

      if (this.currentFilterTeacher !== 'ALL') {
        list = list.filter(r => r.teacherName === this.currentFilterTeacher);
      }

      if (this.searchKeyword) {
        const kw = this.searchKeyword.toLowerCase().trim();
        list = list.filter(r => 
          (r.equipmentName && r.equipmentName.toLowerCase().includes(kw)) ||
          (r.teacherName && r.teacherName.toLowerCase().includes(kw)) ||
          (r.lessonTitle && r.lessonTitle.toLowerCase().includes(kw)) ||
          (r.className && r.className.toLowerCase().includes(kw))
        );
      }

      return list;
    }

    // Chuyển đổi giữa 2 chế độ xem: Danh mục 318 thiết bị & Sổ theo dõi mượn trả
    switchSubTab(tabName) {
      this.activeSubTab = tabName;
      const btnCatalog = document.getElementById('btn-subtab-eq-catalog');
      const btnTracking = document.getElementById('btn-subtab-eq-tracking');
      const secCatalog = document.getElementById('eq-section-catalog');
      const secTracking = document.getElementById('eq-section-tracking');

      if (tabName === 'catalog') {
        if (btnCatalog) {
          btnCatalog.className = "px-4 py-2 rounded-xl bg-teal-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5";
        }
        if (btnTracking) {
          btnTracking.className = "px-4 py-2 rounded-xl bg-white text-slate-700 hover:bg-slate-100 font-semibold text-xs border border-slate-200 transition flex items-center gap-1.5";
        }
        if (secCatalog) secCatalog.style.display = 'block';
        if (secTracking) secTracking.style.display = 'none';
        this.renderEquipmentCatalogTable();
      } else {
        if (btnCatalog) {
          btnCatalog.className = "px-4 py-2 rounded-xl bg-white text-slate-700 hover:bg-slate-100 font-semibold text-xs border border-slate-200 transition flex items-center gap-1.5";
        }
        if (btnTracking) {
          btnTracking.className = "px-4 py-2 rounded-xl bg-teal-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5";
        }
        if (secCatalog) secCatalog.style.display = 'none';
        if (secTracking) secTracking.style.display = 'block';
      }

      // Cập nhật lại thanh thước trượt ngang cho tab mới
      setTimeout(() => this.updateStickyScrollbar(), 60);
    }

    // Lọc danh sách danh mục 318 thiết bị
    getFilteredCatalog() {
      const allEqs = (this.equipments && this.equipments.length >= 318) ? this.equipments : FALLBACK_KHTN_EQUIPMENTS;
      const sub = this.catalogSubject || 'ALL';
      const grade = this.catalogGrade || 'ALL';
      const kw = (this.catalogKeyword || '').toLowerCase().trim();

      return allEqs.filter(eq => {
        // Lọc môn
        if (sub !== 'ALL') {
          const eqSub = (eq.subject || '').toLowerCase();
          if (sub === 'KHTN' && !eqSub.includes('khoa học tự nhiên')) return false;
          if (sub === 'CN' && !eqSub.includes('công nghệ')) return false;
          if (sub === 'DC' && !eqSub.includes('dùng chung')) return false;
        }

        // Lọc khối
        if (grade !== 'ALL') {
          const eqGrade = (eq.grade || '');
          if (!eqGrade.includes(grade) && !eqGrade.includes('Toàn trường')) return false;
        }

        // Lọc từ khóa
        if (kw) {
          const matchCode = (eq.code || '').toLowerCase().includes(kw);
          const matchName = (eq.name || '').toLowerCase().includes(kw);
          const matchLesson = (eq.lesson || '').toLowerCase().includes(kw);
          const matchRoom = (eq.room || eq.location || '').toLowerCase().includes(kw);
          if (!matchCode && !matchName && !matchLesson && !matchRoom) return false;
        }

        return true;
      });
    }

    // Hiển thị bảng Danh Mục 318 Thiết Bị
    renderEquipmentCatalogTable() {
      const tbody = document.getElementById('eq-catalog-tbody');
      const counterEl = document.getElementById('eq-catalog-count');
      if (!tbody) return;

      const filtered = this.getFilteredCatalog();
      if (counterEl) counterEl.innerText = filtered.length;

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" class="px-6 py-12 text-center text-slate-400 text-xs">
              <div class="text-3xl mb-2">🔍</div>
              <div class="font-medium text-slate-600">Không tìm thấy thiết bị nào phù hợp với bộ lọc</div>
              <div class="text-[11px] text-slate-400 mt-1">Thầy/Cô hãy thử tìm từ khóa khác hoặc chuyển môn học/khối lớp</div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = filtered.map((eq, index) => {
        const isKHTN = (eq.subject || '').includes('Khoa học tự nhiên');
        const isCN = (eq.subject || '').includes('Công nghệ');
        const badgeSubjectColor = isKHTN ? 'bg-blue-50 text-blue-700 border-blue-200' : (isCN ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-purple-50 text-purple-700 border-purple-200');
        const isAvailable = (eq.available || 0) > 0;

        return `
          <tr class="hover:bg-teal-50/30 transition text-xs border-b border-slate-100">
            <td class="px-3 py-3 text-center font-bold text-slate-400 text-[11px]">${index + 1}</td>
            <td class="px-3 py-3">
              <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] font-bold border border-slate-200 whitespace-nowrap">
                ${eq.code}
              </span>
            </td>
            <td class="px-3 py-3">
              <div class="font-semibold text-slate-900 leading-snug max-w-md">${eq.name}</div>
            </td>
            <td class="px-3 py-3 whitespace-nowrap">
              <div class="flex flex-col gap-1 items-start">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeSubjectColor}">
                  ${eq.subject}
                </span>
                <span class="text-[11px] font-semibold text-slate-600 pl-1">
                  ${eq.grade}
                </span>
              </div>
            </td>
            <td class="px-3 py-3">
              <div class="font-medium text-slate-800 leading-snug">${eq.lesson || ''}</div>
              <div class="text-[11px] text-slate-400 font-mono mt-0.5">${eq.week || ''}</div>
            </td>
            <td class="px-3 py-3 whitespace-nowrap">
              <div class="text-slate-600 font-medium flex items-center gap-1 text-[11px]">
                <span class="text-teal-600">📍</span> ${eq.room || eq.location || 'Phòng bộ môn'}
              </div>
            </td>
            <td class="px-3 py-3 text-center whitespace-nowrap">
              <div class="font-bold text-slate-900 text-xs">${eq.available} / ${eq.total}</div>
              <div class="text-[10px] text-slate-500">${eq.unit || 'Bộ'}</div>
            </td>
            <td class="px-3 py-3 text-center whitespace-nowrap">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${isAvailable ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
                ${isAvailable ? '● Sẵn sàng' : '✕ Đã mượn hết'}
              </span>
            </td>
            <td class="px-3 py-3 text-right whitespace-nowrap">
              <div class="inline-flex items-center gap-1.5 justify-end">
                <button onclick="window.EquipmentSyncEngine.openQuickBorrowModal('${eq.code}')" ${!isAvailable ? 'disabled' : ''} class="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shadow-sm transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1" title="Đăng ký mượn thiết bị này">
                  <span>+ Mượn</span>
                </button>
                ${this.isAdminOrLeader() ? `
                  <button onclick="window.EquipmentSyncEngine.openEditEquipmentModal('${eq.code}')" class="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition shadow-xs" title="Chỉnh sửa thiết bị (Admin)">
                    <span>✏️</span>
                  </button>
                  <button onclick="window.EquipmentSyncEngine.deleteEquipment('${eq.code}')" class="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition border border-rose-200 shadow-xs" title="Xóa thiết bị khỏi kho (Admin)">
                    <span>🗑️</span>
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // Cập nhật thanh trượt ngang cho bảng danh mục
      setTimeout(() => this.updateStickyScrollbar(), 60);
    }

    // Cập nhật giao diện Tab Thiết bị
    renderEquipmentView() {
      const container = document.getElementById('view-equipment');
      if (!container) return;

      const user = window.AppStorage ? window.AppStorage.getCurrentUser() : null;
      const isManager = this.isAdminOrLeader();

      // Kiểm soát hiển thị vai trò Quản trị viên / Tổ trưởng vs Giáo viên bộ môn
      const heroBanner = document.getElementById('eq-hero-banner');
      const kpiContainer = document.getElementById('eq-kpi-container');
      const teacherHeader = document.getElementById('eq-teacher-header');
      const btnAdminAdd = document.getElementById('btn-admin-add-equipment');
      const teacherFilterEl = document.getElementById('eq-filter-teacher');
      const trackingTitle = document.getElementById('eq-tracking-title');
      const trackingSubtitle = document.getElementById('eq-tracking-subtitle');

      if (isManager) {
        if (heroBanner) heroBanner.style.display = 'flex';
        if (kpiContainer) kpiContainer.style.display = 'grid';
        if (teacherHeader) teacherHeader.style.display = 'none';
        if (btnAdminAdd) btnAdminAdd.style.display = 'inline-flex';
        if (teacherFilterEl) teacherFilterEl.style.display = '';
        if (trackingTitle) trackingTitle.innerHTML = `<span>📖 Sổ Theo Dõi Sử Dụng Thiết Bị Dạy Học</span><span class="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold border border-teal-200">Tổ KHTN - CN</span>`;
        if (trackingSubtitle) trackingSubtitle.innerText = 'Ghi nhận đầy đủ tiết dạy, lớp học, kế hoạch bài dạy và tình trạng hoàn trả của toàn trường';
      } else {
        // Tài khoản GV: ẨN trường thông tin và banner như hình đính kèm!
        if (heroBanner) heroBanner.style.display = 'none';
        if (kpiContainer) kpiContainer.style.display = 'none';
        if (teacherHeader) {
          teacherHeader.style.display = 'flex';
          const tName = document.getElementById('eq-teacher-welcome');
          if (tName && user) {
            tName.innerText = `Thầy/Cô: ${user.name || 'Giáo viên'}`;
          }
        }
        if (btnAdminAdd) btnAdminAdd.style.display = 'none';
        if (teacherFilterEl) teacherFilterEl.style.display = 'none';
        if (trackingTitle) trackingTitle.innerHTML = `<span>📖 Sổ Theo Dõi Mượn - Trả Cá Nhân</span><span class="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold border border-teal-200">${user ? user.name : 'Giáo viên'}</span>`;
        if (trackingSubtitle) trackingSubtitle.innerText = `Danh sách các thiết bị Thầy/Cô (${user ? user.name : ''}) đã đăng ký mượn phục vụ giảng dạy`;
      }

      // Luôn kết xuất Bảng Danh mục 318 thiết bị
      this.renderEquipmentCatalogTable();

      const allEquipments = (this.equipments && this.equipments.length >= 318) ? this.equipments : FALLBACK_KHTN_EQUIPMENTS;
      const records = this.getFilteredRecords();

      // Thống kê KPI trên toàn bộ 318 thiết bị KHTN-CN
      const totalEqCount = allEquipments.reduce((sum, e) => sum + (e.total || 0), 0);
      const availableEqCount = allEquipments.reduce((sum, e) => sum + (e.available || 0), 0);
      const activeBorrowRecords = this.borrowRecords.filter(r => r.status === 'Đang mượn');
      const myBorrowCount = user ? this.borrowRecords.filter(r => r.teacherName === user.name && r.status === 'Đang mượn').length : 0;

      const elTotal = document.getElementById('eq-kpi-total');
      const elAvailable = document.getElementById('eq-kpi-available');
      const elBorrowing = document.getElementById('eq-kpi-borrowing');
      const elMyBorrows = document.getElementById('eq-kpi-my-borrows');

      if (elTotal) elTotal.innerText = totalEqCount;
      if (elAvailable) elAvailable.innerText = availableEqCount;
      if (elBorrowing) elBorrowing.innerText = activeBorrowRecords.length;
      if (elMyBorrows) elMyBorrows.innerText = myBorrowCount;

      // Populate dropdown tuần
      const weekSelect = document.getElementById('eq-filter-week');
      if (weekSelect && weekSelect.children.length <= 1) {
        for (let i = 1; i <= 35; i++) {
          const opt = document.createElement('option');
          opt.value = i;
          opt.innerText = `Tuần ${i}`;
          weekSelect.appendChild(opt);
        }
      }

      // Populate dropdown giáo viên
      if (teacherFilterEl && isManager) {
        const currentVal = teacherFilterEl.value;
        const teacherNames = Array.from(new Set(this.borrowRecords.map(r => r.teacherName).filter(Boolean)));
        teacherFilterEl.innerHTML = `<option value="ALL">-- Tất cả giáo viên KHTN-CN --</option>` +
          teacherNames.map(name => `<option value="${name}" ${name === currentVal ? 'selected' : ''}>${name}</option>`).join('');
      }

      // Render bảng mượn trả
      const tbody = document.getElementById('eq-tracking-tbody');
      if (!tbody) return;

      if (records.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" class="px-6 py-12 text-center text-slate-400 text-xs">
              <div class="text-3xl mb-2">📦</div>
              <div class="font-medium text-slate-600">Chưa có lượt mượn thiết bị nào phù hợp với bộ lọc</div>
              <div class="text-[11px] text-slate-400 mt-1">Các lượt mượn khi nộp KHBD hoặc mượn bổ sung sẽ hiển thị tại đây</div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = records.map((r, index) => {
        const isBorrowed = r.status === 'Đang mượn';
        const isMine = user && (user.name === r.teacherName || user.id === r.teacherId);
        
        let statusBadge = '';
        if (r.status === 'Đang mượn') {
          statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>Đang mượn</span>`;
        } else if (r.status === 'Đã trả') {
          statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Đã trả (${r.returnDate || 'Hôm nay'})</span>`;
        } else {
          statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Quá hạn</span>`;
        }

        let actionHtml = '';
        if (isBorrowed) {
          if (isMine || isManager) {
            actionHtml += `
              <button onclick="window.EquipmentSyncEngine.openReturnModal('${r.id}')" class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition shadow-sm flex items-center gap-1">
                <span>↩ Báo trả</span>
              </button>
            `;
          }
          if (isManager) {
            actionHtml += `
              <button onclick="window.EquipmentSyncEngine.confirmReturn('${r.id}', '${user ? user.name : 'Võ Văn Hà'}')" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-sm flex items-center gap-1">
                <span>✓ Nhận đồ</span>
              </button>
            `;
          }
        } else {
          actionHtml = `<span class="text-[11px] text-slate-400">CB: ${r.staffConfirm || 'Nguyễn Sỹ Tuấn'}</span>`;
        }

        if (isManager) {
          actionHtml += `
            <button onclick="window.EquipmentSyncEngine.deleteBorrowRecord('${r.id}')" class="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold transition border border-rose-200 shadow-xs ml-1" title="Xóa phiếu mượn này (Chỉ dành cho Admin / Tổ trưởng)">
              <span>🗑️</span>
            </button>
          `;
        }

        const planLinkBadge = r.planId 
          ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 font-semibold border border-blue-100" title="Mượn tự động theo KHBD">KHBD 📄</span>`
          : `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600">Trực tiếp</span>`;

        return `
          <tr class="hover:bg-blue-50/40 transition border-b border-slate-100 text-xs">
            <td class="px-3 py-3 text-center font-mono text-slate-400">${index + 1}</td>
            <td class="px-3 py-3">
              <div class="font-bold text-slate-800">${r.date || '---'}</div>
              <div class="text-[11px] text-slate-500">${r.session || 'Sáng'} • ${r.period || ''}</div>
            </td>
            <td class="px-3 py-3">
              <span class="inline-block px-2 py-0.5 rounded font-bold bg-indigo-50 text-indigo-700 text-[11px] border border-indigo-100">${r.className || '9A4'}</span>
              <div class="text-[10px] text-slate-400 mt-0.5">Tuần ${r.week || 1}</div>
            </td>
            <td class="px-3 py-3 max-w-xs">
              <div class="font-semibold text-slate-800 truncate" title="${r.lessonTitle}">${r.lessonTitle}</div>
              <div class="flex items-center gap-1.5 mt-0.5">${planLinkBadge} <span class="text-[11px] text-slate-500">${r.subject}</span></div>
            </td>
            <td class="px-3 py-3">
              <div class="font-bold text-blue-900">${r.equipmentName}</div>
              <div class="text-[11px] font-mono text-slate-400">${r.equipmentCode} • ${r.room || 'Phòng TH'}</div>
            </td>
            <td class="px-3 py-3 text-center">
              <span class="inline-block px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 font-bold font-mono">${r.quantity || 1}</span>
            </td>
            <td class="px-3 py-3">
              <div class="font-medium text-slate-800">${r.teacherName}</div>
              <div class="text-[10px] text-slate-400">${r.conditionBorrow || 'Tốt'}</div>
            </td>
            <td class="px-3 py-3 text-center">${statusBadge}</td>
            <td class="px-3 py-3 text-right">
              <div class="flex items-center justify-end gap-1.5">${actionHtml}</div>
            </td>
          </tr>
        `;
      }).join('');

      // Cập nhật thanh trượt ngang cho bảng mượn trả
      setTimeout(() => this.updateStickyScrollbar(), 60);
    }

    // Mở modal báo trả
    openReturnModal(recordId) {
      const record = this.borrowRecords.find(r => r.id === recordId);
      if (!record) return;

      const modal = document.getElementById('modal-return-equipment');
      if (!modal) return;

      document.getElementById('return-record-id').value = record.id;
      document.getElementById('return-equipment-info').innerText = `${record.equipmentName} (SL: ${record.quantity}) - Mượn ngày ${record.date}`;
      document.getElementById('return-date-input').value = new Date().toISOString().split('T')[0];
      document.getElementById('return-condition-select').value = "Tốt, hoạt động bình thường";
      document.getElementById('return-note-input').value = "";

      modal.classList.add('active');
    }

    closeReturnModal() {
      const modal = document.getElementById('modal-return-equipment');
      if (modal) modal.classList.remove('active');
    }

    async handleReturnSubmit(e) {
      e.preventDefault();
      const recordId = document.getElementById('return-record-id').value;
      const returnDate = document.getElementById('return-date-input').value;
      const conditionReturn = document.getElementById('return-condition-select').value;
      const returnNote = document.getElementById('return-note-input').value;

      try {
        await this.returnEquipment(recordId, { returnDate, conditionReturn, returnNote });
        this.closeReturnModal();
        if (window.AppToast) {
          window.AppToast.show('Đã báo trả thiết bị thành công! Dữ liệu đã đồng bộ lên Cloud.', 'success');
        }
      } catch (err) {
        alert(err.message || 'Lỗi khi báo trả thiết bị!');
      }
    }

    // Lọc danh sách thiết bị trong modal mượn nhanh theo Môn, Khối, và Từ khóa
    filterQuickBorrowSelect(preferredCode = null) {
      const selectEl = document.getElementById('quick-borrow-equipment-select');
      if (!selectEl) return;

      const subFilter = document.getElementById('quick-borrow-filter-subject')?.value || 'ALL';
      const grdFilter = document.getElementById('quick-borrow-filter-grade')?.value || 'ALL';
      const searchFilter = (document.getElementById('quick-borrow-filter-search')?.value || '').trim().toLowerCase();
      const countEl = document.getElementById('quick-borrow-filtered-count');

      const allEqs = (this.equipments && this.equipments.length >= 318) ? this.equipments : FALLBACK_KHTN_EQUIPMENTS;

      const filtered = allEqs.filter(eq => {
        // Lọc môn
        if (subFilter !== 'ALL') {
          if (!(eq.subject || '').includes(subFilter)) return false;
        }
        // Lọc khối
        if (grdFilter !== 'ALL') {
          const gNum = grdFilter.replace(/[^0-9]/g, '');
          if (gNum) {
            if (!(eq.grade || '').includes(gNum)) return false;
          } else {
            if (!(eq.grade || '').includes(grdFilter)) return false;
          }
        }
        // Tìm kiếm nhanh tên, mã, bài dạy
        if (searchFilter) {
          const matchCode = (eq.code || '').toLowerCase().includes(searchFilter);
          const matchName = (eq.name || '').toLowerCase().includes(searchFilter);
          const matchLesson = (eq.lesson || '').toLowerCase().includes(searchFilter);
          if (!matchCode && !matchName && !matchLesson) return false;
        }
        return true;
      });

      if (countEl) {
        countEl.textContent = `${filtered.length} thiết bị`;
      }

      if (filtered.length === 0) {
        selectEl.innerHTML = '<option value="" disabled selected>-- Không có thiết bị nào phù hợp bộ lọc --</option>';
        return;
      }

      // Nhóm theo Môn & Khối để hiển thị có tổ chức
      const groupMap = new Map();
      filtered.forEach(eq => {
        const sub = eq.subject || 'Khác';
        const grd = eq.grade || 'Dùng chung';
        const key = `${sub} - ${grd}`;
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key).push(eq);
      });

      let html = '';
      for (const [groupName, items] of groupMap.entries()) {
        html += `<optgroup label="${groupName} (${items.length} thiết bị)">`;
        items.forEach(eq => {
          const avail = eq.available > 0 ? `(Còn ${eq.available} ${eq.unit})` : `(ĐÃ HẾT)`;
          const shortName = eq.name.length > 85 ? eq.name.substring(0, 85) + '...' : eq.name;
          html += `<option value="${eq.code}" ${eq.available <= 0 ? 'disabled' : ''}>[${eq.code}] ${shortName} ${avail}</option>`;
        });
        html += `</optgroup>`;
      }
      selectEl.innerHTML = html;

      // Chọn option: ưu tiên preferredCode, nếu không thì giữ giá trị hiện tại (nếu còn trong filtered), nếu không thì chọn option đầu tiên có sẵn
      if (preferredCode && filtered.some(e => e.code === preferredCode)) {
        selectEl.value = preferredCode;
      } else {
        const firstAvailable = filtered.find(e => e.available > 0) || filtered[0];
        if (firstAvailable) {
          selectEl.value = firstAvailable.code;
        }
      }

      this.onQuickBorrowSelectChange(selectEl.value);
    }

    // Tự động điền thông tin bài học, phòng học, tuần, lớp khi chọn thiết bị
    onQuickBorrowSelectChange(code) {
      if (!code) return;
      const allEqs = (this.equipments && this.equipments.length >= 318) ? this.equipments : FALLBACK_KHTN_EQUIPMENTS;
      const foundEq = allEqs.find(e => e.code === code);
      if (!foundEq) return;

      const lessonInput = document.getElementById('quick-borrow-lesson');
      const roomInput = document.getElementById('quick-borrow-room');
      const weekInput = document.getElementById('quick-borrow-week');
      const classInput = document.getElementById('quick-borrow-class');
      const quantityInput = document.getElementById('quick-borrow-quantity');

      if (lessonInput && foundEq.lesson) lessonInput.value = foundEq.lesson;
      if (roomInput) roomInput.value = foundEq.room || foundEq.location || 'Phòng TH KHTN';
      if (weekInput && foundEq.week) {
        const matchW = foundEq.week.match(/Tuần\s*(\d+)/i);
        if (matchW) weekInput.value = matchW[1];
      }
      if (classInput && foundEq.grade) {
        const gNum = foundEq.grade.match(/\d+/);
        if (gNum) {
          const currentClass = (classInput.value || '').trim();
          if (!currentClass.startsWith(gNum[0])) {
            classInput.value = gNum[0] === '9' ? '9A4' : `${gNum[0]}A1`;
          }
        }
      }
      if (quantityInput) {
        const maxAvail = Math.max(1, foundEq.available || 1);
        quantityInput.max = maxAvail;
        if (parseInt(quantityInput.value) > maxAvail) {
          quantityInput.value = 1;
        }
      }
    }

    // Mở modal mượn thiết bị nhanh (hỗ trợ truyền presetCode để tự động chọn thiết bị)
    openQuickBorrowModal(presetCode = null) {
      const modal = document.getElementById('modal-quick-borrow-equipment');
      if (!modal) return;

      const allEqs = (this.equipments && this.equipments.length >= 318) ? this.equipments : FALLBACK_KHTN_EQUIPMENTS;
      const subSelect = document.getElementById('quick-borrow-filter-subject');
      const grdSelect = document.getElementById('quick-borrow-filter-grade');
      const searchInput = document.getElementById('quick-borrow-filter-search');

      if (searchInput) searchInput.value = '';

      if (presetCode) {
        const found = allEqs.find(e => e.code === presetCode);
        if (found) {
          if (subSelect && found.subject) subSelect.value = found.subject;
          if (grdSelect && found.grade) subSelect ? (grdSelect.value = found.grade) : null;
        }
      } else {
        if (subSelect) subSelect.value = 'ALL';
        if (grdSelect) grdSelect.value = 'ALL';
      }

      this.filterQuickBorrowSelect(presetCode);

      const dateEl = document.getElementById('quick-borrow-date');
      if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
      modal.classList.add('active');
    }

    closeQuickBorrowModal() {
      const modal = document.getElementById('modal-quick-borrow-equipment');
      if (modal) modal.classList.remove('active');
    }

    async handleQuickBorrowSubmit(e) {
      e.preventDefault();
      const form = e.target;
      const data = {
        equipmentCode: document.getElementById('quick-borrow-equipment-select').value,
        quantity: parseInt(document.getElementById('quick-borrow-quantity').value) || 1,
        date: document.getElementById('quick-borrow-date').value,
        week: document.getElementById('quick-borrow-week').value,
        session: document.getElementById('quick-borrow-session').value,
        period: document.getElementById('quick-borrow-period').value,
        className: document.getElementById('quick-borrow-class').value,
        lessonTitle: document.getElementById('quick-borrow-lesson').value,
        room: document.getElementById('quick-borrow-room').value,
        conditionBorrow: "Tốt"
      };

      try {
        await this.borrowQuick(data);
        this.closeQuickBorrowModal();
        if (window.AppToast) {
          window.AppToast.show('🎉 Đã mượn thiết bị thành công và đồng bộ lên Hệ thống Thiết bị!', 'success');
        }
      } catch (err) {
        alert(err.message || 'Lỗi khi đăng ký mượn thiết bị!');
      }
    }

    // Kiểm tra quyền Quản trị viên (Admin) hoặc Tổ trưởng chuyên môn
    isAdminOrLeader() {
      const user = window.AppStorage ? window.AppStorage.getCurrentUser() : null;
      if (!user) return true;
      const r = (user.role || '').toUpperCase();
      const u = (user.username || '').toLowerCase();
      return r.includes('ADMIN') || r.includes('TO_TRUONG') || r.includes('TRUONG') || u === 'vovanha' || u === 'admin';
    }

    // Lọc bản ghi mượn trả theo thời gian (Tháng, Học kỳ, Cả năm)
    getRecordsByPeriod(period = 'ALL') {
      const records = this.borrowRecords || [];
      if (period === 'ALL') return records;

      return records.filter(r => {
        const d = r.date || '';
        if (!d) return false;
        const parts = d.split('-'); // YYYY-MM-DD
        const month = parseInt(parts[1], 10);

        if (period === 'HK1') {
          // Tháng 9 -> 12 hoặc Tháng 1
          return month >= 9 || month === 1;
        }
        if (period === 'HK2') {
          // Tháng 2 -> Tháng 5
          return month >= 2 && month <= 5;
        }
        if (period.startsWith('T')) {
          const targetMonth = parseInt(period.substring(1), 10);
          return month === targetMonth;
        }
        return true;
      });
    }

    // Thống kê tổng số lượt mượn theo từng giáo viên trong kỳ
    generateTeacherBorrowStats(records) {
      const statsMap = new Map();

      // Danh sách đầy đủ 10 giáo viên trong tổ KHTN - Công nghệ theo đúng môn phụ trách
      const defaultTeachers = [
        { name: 'Võ Văn Hà', subject: 'KHTN' },
        { name: 'Trương Thiện Tánh', subject: 'KHTN' },
        { name: 'Nguyễn Thị Phước Hoài', subject: 'KHTN' },
        { name: 'Châu Thị Cẩm Hồng', subject: 'KHTN' },
        { name: 'Nguyễn Thị Bích Tuyền', subject: 'KHTN' },
        { name: 'Trương Thị Thủy Tiên', subject: 'KHTN' },
        { name: 'Nguyễn Thị Thu Hà', subject: 'KHTN' },
        { name: 'Đặng Thị Ngọc Yến', subject: 'KHTN - Công nghệ' },
        { name: 'Lê Thị Ngọc Giàu', subject: 'Công nghệ' },
        { name: 'Võ Thị Út Thủy', subject: 'Công nghệ' }
      ];

      // Khởi tạo trước đúng thứ tự 10 giáo viên
      defaultTeachers.forEach(t => {
        statsMap.set(t.name, {
          teacherName: t.name,
          subject: t.subject,
          khtnCount: 0,
          cnCount: 0,
          totalCount: 0,
          returnedCount: 0,
          borrowingCount: 0
        });
      });

      // Thống kê chi tiết từ các bản ghi mượn
      records.forEach(r => {
        const teacherName = r.teacherName || 'Chưa xác định';
        let s = statsMap.get(teacherName);
        if (!s) {
          s = {
            teacherName: teacherName,
            subject: r.subject || 'KHTN',
            khtnCount: 0,
            cnCount: 0,
            totalCount: 0,
            returnedCount: 0,
            borrowingCount: 0
          };
          statsMap.set(teacherName, s);
        }
        s.totalCount += 1;
        const sub = (r.subject || '').toLowerCase();
        if (sub.includes('công nghệ')) {
          s.cnCount += 1;
        } else {
          s.khtnCount += 1;
        }
        if (r.status === 'Đã trả') {
          s.returnedCount += 1;
        } else {
          s.borrowingCount += 1;
        }
      });

      return Array.from(statsMap.values());
    }

    // Sự kiện khi thay đổi kỳ báo cáo in
    onPrintPeriodChange(period) {
      this.currentPrintPeriod = period;
      this.renderPrintReportContent();
    }

    // Kết xuất nội dung văn bản in và thống kê chuẩn Nghị định 30 (Times New Roman, A4 ngang)
    renderPrintReportContent() {
      const period = this.currentPrintPeriod || 'ALL';
      const records = this.getRecordsByPeriod(period);
      const tbody = document.getElementById('report-print-tbody');
      const statsTbody = document.getElementById('report-stats-tbody');
      const mainTitle = document.getElementById('print-report-main-title');
      const subTitle = document.getElementById('print-report-sub-title');
      const dateEl = document.getElementById('print-header-date');

      if (dateEl) {
        const now = new Date();
        dateEl.textContent = `Tây Phú, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
      }

      // Xác định tiêu đề báo cáo theo kỳ
      let periodLabel = 'NĂM HỌC 2026 - 2027';
      let periodSubLabel = 'Tổ Khoa học tự nhiên – Công nghệ • Năm học 2026 - 2027';
      if (period === 'HK1') {
        periodLabel = 'HỌC KỲ I (NĂM HỌC 2026 - 2027)';
        periodSubLabel = 'Kỳ báo cáo: Học kỳ I (Từ Tháng 9/2026 đến hết Tháng 1/2027)';
      } else if (period === 'HK2') {
        periodLabel = 'HỌC KỲ II (NĂM HỌC 2026 - 2027)';
        periodSubLabel = 'Kỳ báo cáo: Học kỳ II (Từ Tháng 2/2027 đến hết Tháng 5/2027)';
      } else if (period.startsWith('T')) {
        const m = period.substring(1);
        const y = parseInt(m) >= 9 ? 2026 : 2027;
        periodLabel = `THÁNG ${m}/${y}`;
        periodSubLabel = `Kỳ báo cáo: Tháng ${m} năm ${y} • Năm học 2026 - 2027`;
      }

      if (mainTitle) mainTitle.textContent = `SỔ THEO DÕI SỬ DỤNG THIẾT BỊ DẠY HỌC - ${periodLabel}`;
      if (subTitle) subTitle.textContent = periodSubLabel;

      // Render bảng mượn trả chi tiết
      if (tbody) {
        if (records.length === 0) {
          tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 12px; font-style: italic; color: #666; font-family: 'Times New Roman', Times, serif;">Chưa có lượt mượn thiết bị nào trong ${periodSubLabel.toLowerCase()}</td></tr>`;
        } else {
          tbody.innerHTML = records.map((r, i) => `
            <tr style="border-bottom: 1px solid black; text-align: center; font-family: 'Times New Roman', Times, serif;">
              <td style="padding: 4px; border: 1px solid black; font-weight: bold;">${i + 1}</td>
              <td style="padding: 4px; border: 1px solid black;">${r.date || ''}</td>
              <td style="padding: 4px; border: 1px solid black;">${r.session || 'Sáng'} (${r.period || ''})</td>
              <td style="padding: 4px; border: 1px solid black; font-weight: bold;">${r.className || ''}</td>
              <td style="padding: 4px; border: 1px solid black; text-align: left;">${r.lessonTitle || ''}</td>
              <td style="padding: 4px; border: 1px solid black; text-align: left; font-weight: 500;">${r.equipmentName || ''}</td>
              <td style="padding: 4px; border: 1px solid black; font-weight: bold;">${r.quantity || 1}</td>
              <td style="padding: 4px; border: 1px solid black; text-align: left;">${r.teacherName || ''}</td>
              <td style="padding: 4px; border: 1px solid black;">${r.status || 'Đang mượn'}</td>
              <td style="padding: 4px; border: 1px solid black;">${r.staffConfirm || 'Nguyễn Sỹ Tuấn'}</td>
            </tr>
          `).join('');
        }
      }

      // Render bảng thống kê lượt mượn theo giáo viên
      if (statsTbody) {
        const stats = this.generateTeacherBorrowStats(records);
        statsTbody.innerHTML = stats.map((s, i) => `
          <tr style="border-bottom: 1px solid black; text-align: center; font-family: 'Times New Roman', Times, serif;">
            <td style="padding: 5px; border: 1px solid black; font-weight: bold;">${i + 1}</td>
            <td style="padding: 5px; border: 1px solid black; text-align: left; font-weight: bold;">${s.teacherName}</td>
            <td style="padding: 5px; border: 1px solid black; text-align: left;">${s.subject}</td>
            <td style="padding: 5px; border: 1px solid black;">${s.khtnCount}</td>
            <td style="padding: 5px; border: 1px solid black;">${s.cnCount}</td>
            <td style="padding: 5px; border: 1px solid black; font-weight: bold; background-color: #f3f4f6;">${s.totalCount}</td>
            <td style="padding: 5px; border: 1px solid black; color: #047857; font-weight: bold;">${s.returnedCount}</td>
            <td style="padding: 5px; border: 1px solid black; color: #b45309; font-weight: bold;">${s.borrowingCount}</td>
          </tr>
        `).join('');
      }
    }

    // In Sổ Sư Phạm A4 Tổ KHTN - CN
    printEquipmentReport() {
      const modal = document.getElementById('modal-print-equipment-report');
      if (!modal) return;
      this.currentPrintPeriod = 'ALL';
      const periodSelect = document.getElementById('print-filter-period');
      if (periodSelect) periodSelect.value = 'ALL';

      this.renderPrintReportContent();
      modal.classList.add('active');
    }

    closePrintModal() {
      const modal = document.getElementById('modal-print-equipment-report');
      if (modal) modal.classList.remove('active');
    }

    triggerBrowserPrint() {
      window.print();
    }

    // Xuất file Microsoft Word (.doc) chuẩn Nghị định 30 (A4 Ngang, Times New Roman)
    exportEquipmentWord() {
      const period = this.currentPrintPeriod || 'ALL';
      const records = this.getRecordsByPeriod(period);
      const stats = this.generateTeacherBorrowStats(records);
      const now = new Date();
      const dateStr = `ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;

      let periodTitle = 'NĂM HỌC 2026 - 2027';
      if (period === 'HK1') periodTitle = 'HỌC KỲ I (NĂM HỌC 2026 - 2027)';
      else if (period === 'HK2') periodTitle = 'HỌC KỲ II (NĂM HỌC 2026 - 2027)';
      else if (period.startsWith('T')) {
        const m = period.substring(1);
        const y = parseInt(m) >= 9 ? 2026 : 2027;
        periodTitle = `THÁNG ${m} NĂM ${y}`;
      }

      const rowsDetailHtml = records.length === 0 
        ? `<tr><td colspan="10" align="center" style="padding: 10pt; font-style: italic;">Chưa có dữ liệu mượn thiết bị trong kỳ báo cáo</td></tr>`
        : records.map((r, i) => `
            <tr>
              <td align="center"><b>${i + 1}</b></td>
              <td align="center">${r.date || ''}</td>
              <td align="center">${r.session || 'Sáng'} (${r.period || ''})</td>
              <td align="center"><b>${r.className || ''}</b></td>
              <td>${r.lessonTitle || ''}</td>
              <td>${r.equipmentName || ''}</td>
              <td align="center"><b>${r.quantity || 1}</b></td>
              <td>${r.teacherName || ''}</td>
              <td align="center">${r.status || 'Đang mượn'}</td>
              <td align="center">${r.staffConfirm || 'Nguyễn Sỹ Tuấn'}</td>
            </tr>
          `).join('');

      const rowsStatsHtml = stats.map((s, i) => `
        <tr>
          <td align="center"><b>${i + 1}</b></td>
          <td><b>${s.teacherName}</b></td>
          <td>${s.subject}</td>
          <td align="center">${s.khtnCount}</td>
          <td align="center">${s.cnCount}</td>
          <td align="center" style="background-color:#e5e7eb;"><b>${s.totalCount}</b></td>
          <td align="center">${s.returnedCount}</td>
          <td align="center">${s.borrowingCount}</td>
        </tr>
      `).join('');

      const wordHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>Sổ Theo Dõi Thiết Bị Dạy Học</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            @page Section1 {
              size: 841.9pt 595.3pt; /* A4 Landscape */
              mso-page-orientation: landscape;
              margin: 36.0pt 36.0pt 36.0pt 36.0pt;
              mso-header-margin: 36.0pt;
              mso-footer-margin: 36.0pt;
            }
            div.Section1 { page: Section1; }
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 11pt;
              line-height: 1.35;
              color: #000;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15pt;
              font-family: 'Times New Roman', Times, serif;
            }
            th, td {
              border: 1px solid black;
              padding: 4pt 6pt;
              font-size: 10.5pt;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
              text-align: center;
            }
            .header-table td {
              border: none !important;
              padding: 2pt;
            }
            .sig-table td {
              border: none !important;
              padding: 4pt;
              text-align: center;
              vertical-align: top;
            }
            h2 {
              font-size: 15pt;
              text-align: center;
              margin: 12pt 0 4pt 0;
              text-transform: uppercase;
              font-weight: bold;
            }
            .sub-title {
              font-size: 11.5pt;
              font-style: italic;
              text-align: center;
              margin-bottom: 12pt;
            }
            .section-header {
              font-size: 12pt;
              font-weight: bold;
              text-transform: uppercase;
              margin: 14pt 0 6pt 0;
            }
          </style>
        </head>
        <body>
          <div class="Section1">
            <!-- Tiêu Ngữ Cơ Quan Chuẩn Nghị Định 30 -->
            <table class="header-table">
              <tr>
                <td width="50%" align="center" style="vertical-align: top;">
                  <div style="font-size: 12pt; text-transform: uppercase;">UBND XÃ TÂY PHÚ</div>
                  <div style="font-size: 12.5pt; font-weight: bold; text-transform: uppercase;">TRƯỜNG THCS TÂY PHÚ</div>
                  <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 2pt;">TỔ KHOA HỌC TỰ NHIÊN - CÔNG NGHỆ</div>
                  <div style="width: 120pt; border-bottom: 1pt solid black; margin: 4pt auto 0 auto;"></div>
                </td>
                <td width="50%" align="center" style="vertical-align: top;">
                  <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div style="font-size: 13pt; font-weight: bold; text-decoration: underline;">Độc lập - Tự do - Hạnh phúc</div>
                  <div style="font-size: 11pt; font-style: italic; margin-top: 4pt;">Tây Phú, ${dateStr}</div>
                </td>
              </tr>
            </table>

            <h2>SỔ THEO DÕI SỬ DỤNG THIẾT BỊ DẠY HỌC - ${periodTitle}</h2>
            <div class="sub-title">Tổ Khoa học tự nhiên – Công nghệ • Trường THCS Tây Phú • Năm học 2026 - 2027</div>

            <div class="section-header">I. NHẬT KÝ CHI TIẾT MƯỢN - TRẢ THIẾT BỊ DẠY HỌC</div>
            <table>
              <thead>
                <tr>
                  <th width="5%">STT</th>
                  <th width="10%">Ngày mượn</th>
                  <th width="11%">Buổi / Tiết</th>
                  <th width="6%">Lớp</th>
                  <th width="22%">Tên bài dạy / Chủ đề bài học</th>
                  <th width="22%">Tên thiết bị dạy học</th>
                  <th width="4%">SL</th>
                  <th width="10%">Giáo viên mượn</th>
                  <th width="8%">Tình trạng</th>
                  <th width="10%">Người xác nhận</th>
                </tr>
              </thead>
              <tbody>
                ${rowsDetailHtml}
              </tbody>
            </table>

            <div class="section-header">II. BẢNG THỐNG KÊ SỐ LƯỢT MƯỢN THIẾT BỊ THEO TỪNG GIÁO VIÊN</div>
            <table>
              <thead>
                <tr>
                  <th width="6%">STT</th>
                  <th width="24%" align="left">Họ và tên Giáo viên</th>
                  <th width="20%" align="left">Môn phụ trách</th>
                  <th width="12%">Lượt KHTN</th>
                  <th width="12%">Lượt Công nghệ</th>
                  <th width="14%">Tổng lượt mượn</th>
                  <th width="10%">Đã trả</th>
                  <th width="10%">Đang mượn</th>
                </tr>
              </thead>
              <tbody>
                ${rowsStatsHtml}
              </tbody>
            </table>

            <table class="sig-table" style="margin-top: 20pt;">
              <tr>
                <td width="33%">
                  <div style="font-weight: bold; text-transform: uppercase;">HIỆU TRƯỞNG</div>
                  <div style="font-style: italic; font-size: 10pt; color: #555; margin-bottom: 50pt;">(Ký và đóng dấu)</div>
                  <div style="font-weight: bold; text-transform: uppercase;">HỒ MINH TRIỀU</div>
                </td>
                <td width="34%">
                  <div style="font-weight: bold; text-transform: uppercase;">TỔ TRƯỞNG KHTN - CN</div>
                  <div style="font-style: italic; font-size: 10pt; color: #555; margin-bottom: 50pt;">(Ký và ghi rõ họ tên)</div>
                  <div style="font-weight: bold; text-transform: uppercase;">VÕ VĂN HÀ</div>
                </td>
                <td width="33%">
                  <div style="font-weight: bold; text-transform: uppercase;">CÁN BỘ THIẾT BỊ</div>
                  <div style="font-style: italic; font-size: 10pt; color: #555; margin-bottom: 50pt;">(Ký và ghi rõ họ tên)</div>
                  <div style="font-weight: bold; text-transform: uppercase;">NGUYỄN SỸ TUẤN</div>
                </td>
              </tr>
            </table>
          </div>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff' + wordHtml], { type: 'application/msword;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `So_Theo_Doi_Thiet_Bi_${period}_2026_2027.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (window.AppToast) {
        window.AppToast.show('Đã xuất file Word (.doc) chuẩn font Times New Roman, A4 ngang thành công!', 'success');
      }
    }

    // Mở modal Thêm Thiết Bị Mới (Admin / Tổ trưởng)
    openAddEquipmentModal() {
      if (!this.isAdminOrLeader()) {
        alert('Chỉ Quản trị viên (Admin) hoặc Tổ trưởng chuyên môn mới có quyền thêm thiết bị!');
        return;
      }
      const modal = document.getElementById('modal-manage-equipment');
      if (!modal) return;

      document.getElementById('modal-manage-equipment-title').innerHTML = '<span>➕ Thêm Thiết Bị Dạy Học Mới</span>';
      document.getElementById('manage-eq-is-edit').value = 'false';
      document.getElementById('manage-eq-original-code').value = '';

      // Tự sinh mã tiếp theo gợi ý
      const count = this.equipments.length + 1;
      document.getElementById('manage-eq-code').value = `TB-KHTN-K6-${String(count).padStart(3, '0')}`;
      document.getElementById('manage-eq-name').value = '';
      document.getElementById('manage-eq-subject').value = 'Khoa học tự nhiên';
      document.getElementById('manage-eq-grade').value = 'Khối 6';
      document.getElementById('manage-eq-lesson').value = '';
      document.getElementById('manage-eq-week').value = 'Tuần 1';
      document.getElementById('manage-eq-total').value = 10;
      document.getElementById('manage-eq-available').value = 10;
      document.getElementById('manage-eq-unit').value = 'Bộ';
      document.getElementById('manage-eq-room').value = 'Phòng bộ môn';
      document.getElementById('manage-eq-status').value = 'Sẵn sàng sử dụng';

      modal.classList.add('active');
    }

    // Mở modal Chỉnh Sửa Thiết Bị (Admin / Tổ trưởng)
    openEditEquipmentModal(code) {
      if (!this.isAdminOrLeader()) {
        alert('Chỉ Quản trị viên (Admin) hoặc Tổ trưởng chuyên môn mới có quyền chỉnh sửa thiết bị!');
        return;
      }
      const eq = this.equipments.find(e => e.code === code);
      if (!eq) return;

      const modal = document.getElementById('modal-manage-equipment');
      if (!modal) return;

      document.getElementById('modal-manage-equipment-title').innerHTML = '<span>✏️ Chỉnh Sửa Thiết Bị Dạy Học</span>';
      document.getElementById('manage-eq-is-edit').value = 'true';
      document.getElementById('manage-eq-original-code').value = eq.code;

      document.getElementById('manage-eq-code').value = eq.code;
      document.getElementById('manage-eq-name').value = eq.name || '';
      document.getElementById('manage-eq-subject').value = eq.subject || 'Khoa học tự nhiên';
      document.getElementById('manage-eq-grade').value = eq.grade || 'Khối 6';
      document.getElementById('manage-eq-lesson').value = eq.lesson || '';
      document.getElementById('manage-eq-week').value = eq.week || '';
      document.getElementById('manage-eq-total').value = eq.total || 10;
      document.getElementById('manage-eq-available').value = eq.available !== undefined ? eq.available : (eq.total || 10);
      document.getElementById('manage-eq-unit').value = eq.unit || 'Bộ';
      document.getElementById('manage-eq-room').value = eq.room || eq.location || 'Phòng bộ môn';
      document.getElementById('manage-eq-status').value = eq.status || 'Sẵn sàng sử dụng';

      modal.classList.add('active');
    }

    closeManageEquipmentModal() {
      const modal = document.getElementById('modal-manage-equipment');
      if (modal) modal.classList.remove('active');
    }

    // Xử lý lưu thiết bị (Thêm mới hoặc Cập nhật)
    async handleSaveEquipmentSubmit(e) {
      e.preventDefault();
      const isEdit = document.getElementById('manage-eq-is-edit').value === 'true';
      const origCode = document.getElementById('manage-eq-original-code').value;

      const newCode = document.getElementById('manage-eq-code').value.trim();
      const name = document.getElementById('manage-eq-name').value.trim();
      const subject = document.getElementById('manage-eq-subject').value;
      const grade = document.getElementById('manage-eq-grade').value;
      const lesson = document.getElementById('manage-eq-lesson').value.trim();
      const week = document.getElementById('manage-eq-week').value.trim();
      const total = parseInt(document.getElementById('manage-eq-total').value) || 1;
      const available = parseInt(document.getElementById('manage-eq-available').value) || 0;
      const unit = document.getElementById('manage-eq-unit').value.trim() || 'Bộ';
      const room = document.getElementById('manage-eq-room').value.trim() || 'Phòng bộ môn';
      const status = document.getElementById('manage-eq-status').value.trim() || 'Sẵn sàng sử dụng';

      const eqData = {
        code: newCode,
        name: name,
        subject: subject,
        grade: grade,
        lesson: lesson,
        week: week,
        total: total,
        available: Math.min(total, available),
        unit: unit,
        room: room,
        location: room,
        status: status
      };

      if (isEdit) {
        const index = this.equipments.findIndex(eq => eq.code === origCode);
        if (index !== -1) {
          this.equipments[index] = eqData;
        }
      } else {
        if (this.equipments.some(eq => eq.code === newCode)) {
          alert(`Mã thiết bị [${newCode}] đã tồn tại trong hệ thống! Vui lòng chọn mã khác.`);
          return;
        }
        this.equipments.unshift(eqData);
      }

      await this.pushToCloud();
      this.renderEquipmentView();
      this.closeManageEquipmentModal();

      if (window.AppToast) {
        window.AppToast.show(isEdit ? `Đã cập nhật thiết bị [${newCode}] thành công!` : `Đã thêm thiết bị mới [${newCode}] vào kho thành công!`, 'success');
      }
    }

    // Xóa thiết bị khỏi kho (Dành cho Admin / Tổ trưởng)
    async deleteEquipment(code) {
      if (!this.isAdminOrLeader()) {
        alert('Chỉ Quản trị viên (Admin) hoặc Tổ trưởng mới có quyền xóa thiết bị!');
        return;
      }
      const eq = this.equipments.find(e => e.code === code);
      if (!eq) return;

      const activeBorrow = this.borrowRecords.find(r => r.equipmentCode === code && r.status === 'Đang mượn');
      if (activeBorrow) {
        alert(`Thiết bị [${code}] đang được giáo viên ${activeBorrow.teacherName} mượn giảng dạy. Không thể xóa lúc này!`);
        return;
      }

      if (!confirm(`Thầy/Cô có chắc chắn muốn xóa thiết bị [${code} - ${eq.name}] khỏi danh mục không?`)) {
        return;
      }

      const index = this.equipments.findIndex(e => e.code === code);
      if (index !== -1) {
        this.equipments.splice(index, 1);
        await this.pushToCloud();
        this.renderEquipmentView();
        if (window.AppToast) {
          window.AppToast.show(`Đã xóa thiết bị [${code}] thành công!`, 'success');
        }
      }
    }

    // Xóa phiếu mượn thiết bị của giáo viên (Dành cho Admin / Tổ trưởng)
    async deleteBorrowRecord(recordId) {
      if (!this.isAdminOrLeader()) {
        alert('Chỉ Quản trị viên (Admin) hoặc Tổ trưởng mới có quyền xóa phiếu mượn!');
        return;
      }
      if (!confirm('Thầy/Cô có chắc chắn muốn xóa phiếu mượn này khỏi Sổ theo dõi không?')) {
        return;
      }

      const index = this.borrowRecords.findIndex(r => r.id === recordId);
      if (index === -1) return;

      const rec = this.borrowRecords[index];
      // Nếu phiếu đang mượn thì tự động hoàn trả lại số lượng khả dụng
      if (rec.status === 'Đang mượn') {
        const eq = this.equipments.find(e => e.code === rec.equipmentCode);
        if (eq) {
          eq.available = Math.min(eq.total, eq.available + (rec.quantity || 1));
        }
      }

      this.borrowRecords.splice(index, 1);
      await this.pushToCloud();
      this.renderEquipmentView();
      if (window.AppToast) {
        window.AppToast.show('Đã xóa phiếu mượn thiết bị thành công! Dữ liệu đã đồng bộ lên Cloud.', 'success');
      }
    }

    // Xuất file Excel bằng SheetJS
    exportEquipmentExcel() {
      if (!window.XLSX) {
        alert('Đang nạp thư viện Excel, vui lòng thử lại sau 2 giây!');
        return;
      }

      const records = this.getFilteredRecords();
      const rows = [
        ["TRƯỜNG THCS TÂY PHÚ", "", "", "", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"],
        ["TỔ KHOA HỌC TỰ NHIÊN - CÔNG NGHỆ", "", "", "", "Độc lập - Tự do - Hạnh phúc"],
        [""],
        ["SỔ THEO DÕI SỬ DỤNG THIẾT BỊ DẠY HỌC - TỔ KHTN & CÔNG NGHỆ"],
        ["Năm học: 2026 - 2027 (Trích xuất từ Hệ thống Quản lý Kế hoạch bài dạy)"],
        [""],
        ["STT", "Ngày mượn", "Buổi/Tiết", "Lớp", "Tên bài dạy / Chủ đề", "Tên thiết bị dạy học", "Số lượng", "Giáo viên mượn", "Tình trạng", "Người xác nhận"]
      ];

      records.forEach((r, i) => {
        rows.push([
          i + 1,
          r.date || '',
          `${r.session || 'Sáng'} (${r.period || ''})`,
          r.className || '',
          r.lessonTitle || '',
          r.equipmentName || '',
          r.quantity || 1,
          r.teacherName || '',
          r.status || '',
          r.staffConfirm || 'Nguyễn Sỹ Tuấn'
        ]);
      });

      rows.push([""]);
      rows.push(["", "", "", "", "", "Tây Phú, ngày " + new Date().getDate() + " tháng " + (new Date().getMonth() + 1) + " năm " + new Date().getFullYear()]);
      rows.push(["HIỆU TRƯỞNG", "", "", "TỔ TRƯỞNG KHTN - CN", "", "", "", "CÁN BỘ THIẾT BỊ"]);
      rows.push(["(Ký và ghi rõ họ tên)", "", "", "(Ký và ghi rõ họ tên)", "", "", "", "(Ký và ghi rõ họ tên)"]);
      rows.push([""]);
      rows.push([""]);
      rows.push(["HỒ MINH TRIỀU", "", "", "VÕ VĂN HÀ", "", "", "", "NGUYỄN SỸ TUẤN"]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "So_Theo_Doi_TB_KHTN_CN");
      XLSX.writeFile(wb, "So_Theo_Doi_Thiet_Bi_KHTN_CN_THCS_Tay_Phu_2026.xlsx");
    }

    // =========================================================================
    // THANH THƯỚC TRƯỢT NGANG CỐ ĐỊNH PHÍA DƯỚI MÀN HÌNH (STICKY HORIZONTAL SCROLL)
    // =========================================================================
    initStickyScrollbar() {
      const scrollBar = document.getElementById('sticky-horizontal-scrollbar');
      const track = document.getElementById('hscroll-track');
      if (!scrollBar || !track) return;

      this._isSyncingScroll = false;

      // Lắng nghe sự kiện trượt trên thanh cố định đáy màn hình
      track.addEventListener('scroll', () => {
        if (this._isSyncingScroll) return;
        const container = this.getActiveScrollContainer();
        if (container) {
          this._isSyncingScroll = true;
          container.scrollLeft = track.scrollLeft;
          this._isSyncingScroll = false;
          this.updateHScrollPercent(container);
        }
      });

      // Đồng bộ khi đổi kích thước cửa sổ hoặc cuộn trang
      window.addEventListener('resize', () => this.updateStickyScrollbar());
      window.addEventListener('scroll', () => this.updateStickyScrollbar(), { passive: true });

      // Lắng nghe cuộn ngang trên 2 container bảng
      const catContainer = document.getElementById('eq-catalog-table-container');
      const trkContainer = document.getElementById('eq-tracking-table-container');

      [catContainer, trkContainer].forEach(c => {
        if (c) {
          c.addEventListener('scroll', () => {
            if (this._isSyncingScroll) return;
            this._isSyncingScroll = true;
            track.scrollLeft = c.scrollLeft;
            this._isSyncingScroll = false;
            this.updateHScrollPercent(c);
          }, { passive: true });
        }
      });

      this.updateStickyScrollbar();
    }

    getActiveScrollContainer() {
      // 1. Kiểm tra modal Sổ Sư Phạm A4 nếu đang mở
      const printModal = document.getElementById('modal-print-equipment-report');
      if (printModal && printModal.classList.contains('active')) {
        const paper = document.getElementById('modal-print-report-paper');
        if (paper) return paper.parentElement || paper;
      }

      // 2. Tab Thiết Bị đang hiển thị
      const viewEq = document.getElementById('view-equipment');
      if (viewEq && !viewEq.classList.contains('hidden')) {
        if (this.activeSubTab === 'catalog') {
          return document.getElementById('eq-catalog-table-container');
        } else {
          return document.getElementById('eq-tracking-table-container');
        }
      }

      // 3. Fallback container
      return document.getElementById('eq-catalog-table-container') || document.getElementById('eq-tracking-table-container');
    }

    updateStickyScrollbar() {
      const scrollBar = document.getElementById('sticky-horizontal-scrollbar');
      const track = document.getElementById('hscroll-track');
      const dummy = document.getElementById('hscroll-dummy');
      if (!scrollBar || !track || !dummy) return;

      const container = this.getActiveScrollContainer();
      if (!container) {
        scrollBar.style.display = 'none';
        return;
      }

      // Chỉ hiển thị khi bảng rộng hơn chiều ngang hiển thị của màn hình
      const hasOverflow = container.scrollWidth > (container.clientWidth + 10);
      if (hasOverflow) {
        scrollBar.style.display = 'flex';
        dummy.style.width = container.scrollWidth + 'px';
        if (!this._isSyncingScroll) {
          this._isSyncingScroll = true;
          track.scrollLeft = container.scrollLeft;
          this._isSyncingScroll = false;
        }
        this.updateHScrollPercent(container);
      } else {
        scrollBar.style.display = 'none';
      }
    }

    updateHScrollPercent(container) {
      const pctEl = document.getElementById('hscroll-percent');
      if (!pctEl || !container) return;
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll <= 0) {
        pctEl.innerText = '100%';
        return;
      }
      const pct = Math.round((container.scrollLeft / maxScroll) * 100);
      pctEl.innerText = `${Math.min(100, Math.max(0, pct))}%`;
    }

    scrollActiveTable(direction) {
      const container = this.getActiveScrollContainer();
      if (!container) return;
      const step = 280;
      if (direction === 'left') {
        container.scrollBy({ left: -step, behavior: 'smooth' });
      } else if (direction === 'right') {
        container.scrollBy({ left: step, behavior: 'smooth' });
      } else if (direction === 'start') {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else if (direction === 'end') {
        container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
      }
    }
  }

  // Khởi tạo Singleton
  window.EquipmentSyncEngine = new EquipmentSyncManager();

})();
