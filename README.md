# HỆ THỐNG QUẢN LÝ & KIỂM TRA KẾ HOẠCH BÀI DẠY (GIÁO ÁN)
### TRƯỜNG THCS TÂY PHÚ - NIÊN KHÓA 2026 - 2027

Ứng dụng Web chuyên nghiệp hỗ trợ chuyển đổi số trong công tác quản lý chuyên môn nhà trường: nộp giáo án, kiểm tra tiến độ, nhận xét, ký duyệt điện tử và tự động phân cấp lưu trữ trên **Google Drive**.

---

## 🌟 CÁC TÍNH NĂNG NỔI BẬT

### 1. Đăng nhập Bảo mật & Phân quyền Hệ thống
- Mỗi thầy cô có **Tên đăng nhập (username)** và **Mật khẩu (password)** riêng biệt.
- Hộp thoại đăng nhập hiện đại, tự động phân quyền theo vai trò thực tế:
  - ⚙️ **Quản trị viên (Admin)**: `admin` / `123` (Toàn quyền quản lý: Cấu hình Google Drive, tạo & xóa Tổ chuyên môn, quản lý tài khoản GV & xem cấu trúc Drive).
  - 👨‍🏫 **Tổ trưởng chuyên môn**: Thầy **Võ Văn Hà** (`vovanha` / `123`)
  - 👨‍💼 **Tổ phó chuyên môn**: Thầy **Trương Thiện Tánh** (`truongthientanh` / `123`)
  - 🎓 **Ban Giám Hiệu**: Thầy **Phó Hiệu Trưởng** (`bgh` / `123`)
  - 👩‍🏫 **Giáo viên bộ môn**: Các thầy cô trong tổ (`nguyenthiphuochoai`, `nguyenthithuha`... / `123`)

### 2. Quản lý Tổ chuyên môn & Tài khoản Giáo viên (Dành riêng cho Admin)
- **Quản lý Tổ chuyên môn**: Tạo mới và xóa tổ chuyên môn linh hoạt, bảo vệ không xóa tổ khi còn giáo viên.
- **Quản lý Tài khoản Giáo viên**: Thêm mới, xóa tài khoản có xác nhận an toàn, xem và ẩn/hiện mật khẩu, đặt lại mật khẩu.
- **Cấu hình Google Drive**: Chỉ tài khoản Admin mới có quyền truy cập tab Cấu hình và đồng bộ thư mục.

### 3. Dành cho Giáo viên (Teacher Portal)
- Dashboard cá nhân thống kê trực quan số giáo án: Tổng đã nộp, Đã duyệt, Đang chờ, Cần chỉnh sửa.
- Nộp giáo án nhanh chóng: hỗ trợ kéo thả tệp Word (`.docx`), `.pdf` hoặc liên kết trực tiếp `Google Docs`.
- Tự động chuẩn hóa tên file theo quy chuẩn Bộ GD&ĐT: `KHBD_[Mon]_[Khoi]_[Tuan]_[HoTen].docx`.
- Xem nhận xét chi tiết, điểm đánh giá 5 tiêu chí của Tổ trưởng / Tổ phó và hỗ trợ "Nộp lại bản sửa đổi" (tự động đánh số phiên bản v2, v3).

### 4. Dành cho Tổ trưởng & Tổ phó Chuyên môn (Reviewer Portal)
- Bảng tổng hợp kế hoạch bài dạy của toàn bộ tổ viên trong tổ chuyên môn.
- Bộ lọc nâng cao: Lọc theo giáo viên, tuần dạy, khối lớp, trạng thái duyệt và tìm kiếm nhanh.
- Xem trước tài liệu trực tiếp (Preview) ngay trên giao diện web không cần tải về máy.
- Đánh giá chuyên môn theo **5 Tiêu chí chuẩn Công văn 5512/BGDĐT**:
  1. *Mục tiêu bài dạy (Phẩm chất, năng lực GDPT 2018)*
  2. *Thiết bị dạy học và học liệu*
  3. *Tiến trình dạy học (Chuỗi 4 hoạt động)*
  4. *Phương pháp và công cụ kiểm tra đánh giá*
  5. *Hình thức tổ chức & phân hóa học sinh*
- Khung **Ký duyệt điện tử** (vẽ chữ ký bằng cảm ứng/chuột) và đóng dấu mộc số phê duyệt kèm mã băm thời gian.

### 5. Dành cho Ban Giám Hiệu & Quản trị (Admin Dashboard)
- Thống kê toàn trường: Tỷ lệ hoàn thành nộp bài của từng tổ chuyên môn.
- Trực quan hóa cấu trúc cây thư mục Google Drive tự động phân cấp:
  ```text
  📁 KHBD_NamHoc_2026_2027
   ├── 📂 To_Khoa_Hoc_Tu_Nhien_Cong_Nghe
   │    ├── 👤 GV_Vo_Van_Ha
   │    │    ├── 📁 Tuan_01
   │    │    │    └── 📄 KHBD_KHTN9_Tuan1_VoVanHa.docx
   │    │    ├── 📁 Tuan_02
   │    │    └── 📁 Tuan_03
   │    ├── 👤 GV_Truong_Thien_Tanh
   │    └── 👤 GV_Nguyen_Thi_Lan
   └── 📂 To_Khoa_Hoc_Xa_Hoi
  ```
- Nút liên kết trực tiếp mở thư mục gốc Google Drive: [https://drive.google.com/drive/u/1/my-drive](https://drive.google.com/drive/u/1/my-drive).

---

## 🛠️ CẤU TRÚC THƯ MỤC DỰ ÁN

```text
KE HOACH BAI DAY/
├── index.html                  # Giao diện Web chính (SPA Responsive, Modal Đăng nhập & Thêm GV)
├── css/
│   └── style.css               # Thiết kế hiện đại, con dấu số, chữ ký canvas, badges
├── js/
│   ├── config.js               # Cấu hình môn, tổ, tài khoản (username, password), tiêu chí 5512
│   ├── storage.js              # Quản lý state, Đăng nhập, Đăng xuất, Thêm/Xóa GV, LocalStorage
│   ├── drive-api.js            # Giao tiếp API Google Apps Script (Base64 upload, POST/GET)
│   ├── signature.js            # Xử lý canvas chữ ký số & tạo con dấu phê duyệt điện tử
│   ├── ui-teacher.js           # Xử lý tương tác Giáo viên (Dashboard, Dropzone, nộp bài)
│   ├── ui-reviewer.js          # Xử lý Kiểm tra, chấm điểm 5512, ký duyệt của Tổ trưởng & Tổ phó
│   ├── ui-admin.js             # Xử lý Báo cáo toàn trường, Quản lý Thêm/Xóa tài khoản GV
│   └── app.js                  # Điều phối tab, xác thực đăng nhập, switch vai trò, Toast
├── gas/
│   └── Code.gs                 # Mã nguồn Backend Google Apps Script (Serverless, Miễn phí 100%)
├── HUONG_DAN_TRIEN_KHAI.md     # Hướng dẫn chi tiết từng bước triển khai Google Apps Script
└── README.md                   # Tài liệu giới thiệu dự án
```

---

## 🌐 ĐỊA CHỈ TRUY CẬP TRỰC TUYẾN CHÍNH THỨC
👉 **https://khbd-tayphu.netlify.app/**

*(Đường link dự phòng Firebase: https://thidua-lop-9a4-79dca.web.app/khbd)*

---

## 🚀 DANH SÁCH TÀI KHOẢN ĐĂNG NHẬP MẪU

Mở trực tiếp liên kết **https://khbd-tayphu.netlify.app/** trên điện thoại hoặc máy tính để đăng nhập:

| Họ và Tên | Tên đăng nhập | Mật khẩu mặc định | Vai trò | Tổ bộ môn |
| :--- | :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin` | `123` | **Quản trị viên hệ thống** | Toàn trường |
| **Thầy Võ Văn Hà** | `vovanha` | `123` | **Tổ trưởng chuyên môn** | Tổ Khoa học Tự nhiên - Công nghệ |
| **Thầy Trương Thiện Tánh** | `truongthientanh` | `123` | **Tổ phó chuyên môn** | Tổ Khoa học Tự nhiên - Công nghệ |
| **Cô Nguyễn Thị Phước Hoài** | `nguyenthiphuochoai` | `123` | **Giáo viên bộ môn** | Tổ Khoa học Tự nhiên - Công nghệ |
| **Cô Nguyễn Thị Thu Hà** | `nguyenthithuha` | `123` | **Giáo viên bộ môn** | Tổ Khoa học Tự nhiên - Công nghệ |
| **Cô Nguyễn Thị Bích Tuyền** | `nguyenthibichtuyen` | `123` | **Giáo viên bộ môn** | Tổ Khoa học Tự nhiên - Công nghệ |
| **Cô Lê Thị Ngọc Giàu** | `lethingocgiau` | `123` | **Giáo viên bộ môn** | Tổ Khoa học Tự nhiên - Công nghệ |
| **Cô Trương Thị Thủy Tiên** | `truongthithuytien` | `123` | **Giáo viên bộ môn** | Tổ Khoa học Tự nhiên - Công nghệ |
| **Cô Đặng Thị Ngọc Yến** | `dangthingocyen` | `123` | **Giáo viên bộ môn** | Tổ Khoa học Tự nhiên - Công nghệ |
| **Cô Võ Thị Út Thủy** | `vothiutthuy` | `123` | **Giáo viên bộ môn** | Tổ Khoa học Tự nhiên - Công nghệ |
| **Cô Châu Thị Cẩm Hồng** | `chauthicamhong` | `123` | **Giáo viên bộ môn** | Tổ Khoa học Tự nhiên - Công nghệ |
| **Ban Giám Hiệu** | `bgh` | `123` | **Ban Giám Hiệu** | Toàn trường |

*(Ghi chú: Thầy/Cô có thể đổi mật khẩu cá nhân bất kỳ lúc nào bằng nút 🔒 Đổi MK trên thanh tiêu đề).*

