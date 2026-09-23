# HƯỚNG DẪN TRIỂN KHAI & XUẤT BẢN HỆ THỐNG QUẢN LÝ KẾ HOẠCH BÀI DẠY LÊN INTERNET
## TRƯỜNG THCS TÂY PHÚ - TỔ KHOA HỌC TỰ NHIÊN - CÔNG NGHỆ

---

## 🌟 1. DANH SÁCH TÀI KHOẢN ĐĂNG NHẬP CHÍNH THỨC

Mỗi Thầy/Cô đăng nhập bằng **Tên đăng nhập** và **Mật khẩu** riêng:

| STT | Họ và Tên Giáo viên | Tên đăng nhập | Mật khẩu mặc định | Vai trò nhiệm vụ |
| :-: | :--- | :--- | :-: | :--- |
| 1 | **Thầy Võ Văn Hà** | `vovanha` | `123` | **Tổ trưởng chuyên môn** |
| 2 | **Thầy Trương Thiện Tánh** | `truongthientanh` | `123` | **Tổ phó chuyên môn** |
| 3 | **Cô Nguyễn Thị Phước Hoài** | `nguyenthiphuochoai` | `123` | **Giáo viên bộ môn** |
| 4 | **Cô Nguyễn Thị Thu Hà** | `nguyenthithuha` | `123` | **Giáo viên bộ môn** |
| 5 | **Cô Nguyễn Thị Bích Tuyền** | `nguyenthibichtuyen` | `123` | **Giáo viên bộ môn** |
| 6 | **Cô Lê Thị Ngọc Giàu** | `lethingocgiau` | `123` | **Giáo viên bộ môn** |
| 7 | **Cô Trương Thị Thủy Tiên** | `truongthithuytien` | `123` | **Giáo viên bộ môn** |
| 8 | **Cô Đặng Thị Ngọc Yến** | `dangthingocyen` | `123` | **Giáo viên bộ môn** |
| 9 | **Cô Võ Thị Út Thủy** | `vothiutthuy` | `123` | **Giáo viên bộ môn** |
| 10 | **Cô Châu Thị Cẩm Hồng** | `chauthicamhong` | `123` | **Giáo viên bộ môn** |
| 11 | **Ban Giám Hiệu** | `bgh` | `123` | **Ban Giám Hiệu** |

---

## 🔒 2. TÍNH NĂNG THAY ĐỔI MẬT KHẨU

### Cách 1: Giáo viên tự đổi mật khẩu cá nhân
1. Thầy/Cô đăng nhập vào tài khoản của mình.
2. Bấm vào nút **🔒 Đổi MK** ở góc trên bên phải (hoặc trong banner chào mừng).
3. Nhập:
   - **Mật khẩu hiện tại** (mặc định ban đầu là `123`).
   - **Mật khẩu mới** (tối thiểu 3 ký tự).
   - **Xác nhận mật khẩu mới**.
4. Bấm **"Cập Nhật Mật Khẩu"** ➔ Mật khẩu mới có hiệu lực ngay lập tức.

### Cách 2: Tổ trưởng / BGH đặt lại mật khẩu cho giáo viên
1. Đăng nhập tài khoản Tổ trưởng (`vovanha`), Tổ phó (`truongthientanh`) hoặc BGH (`bgh`).
2. Vào tab **📊 Báo cáo & Quản lý Giáo viên**.
3. Cuộn xuống bảng **"Quản lý Danh sách Giáo viên & Tài khoản"**.
4. Nhấn nút **🔑 Đổi MK** bên cạnh tên giáo viên cần đổi mật khẩu.
5. Nhập mật khẩu mới và nhấn **"Lưu Mật Khẩu Mới"**.

---

## 🌐 3. ĐỊA CHỈ TRUY CẬP TRỰC TUYẾN CHÍNH THỨC TRÊN INTERNET

Hệ thống hiện đã được triển khai trực tuyến thành công trên hạ tầng đám mây toàn cầu:

### 🌟 Địa chỉ chính thức của Trường THCS Tây Phú:
👉 **https://khbd-tayphu.netlify.app/**

*(Giáo viên, Tổ trưởng, Ban Giám Hiệu có thể truy cập link trên bất kỳ lúc nào từ điện thoại, máy tính bảng hoặc máy tính để bàn mà không cần cài đặt gì thêm).*

---

### 🔄 Cách cập nhật lên Netlify khi có chỉnh sửa tính năng mới:
Khi Thầy chỉnh sửa hoặc thêm tính năng mới ở máy tính, để cập nhật phiên bản mới lên Netlify:
1. Đăng nhập vào trang quản trị Netlify: [app.netlify.com](https://app.netlify.com)
2. Chọn trang **`khbd-tayphu`** ➔ Chọn tab **Deploys**.
3. Kéo thả thư mục **`khbd`** (hoặc thư mục **`KE HOACH BAI DAY`**) vào khu vực **"Need to update your site? Drag and drop your site output folder here"**.
4. Trong vòng 5 giây, toàn bộ trang web trực tuyến sẽ được cập nhật phiên bản mới nhất!

---

### 🛡️ Địa chỉ dự phòng (Google Firebase Hosting):
- 🌐 **https://thidua-lop-9a4-79dca.web.app/khbd**
- 🌐 **https://thidua-lop-9a4-79dca.firebaseapp.com/khbd**
*(Có thể cập nhật bằng cách nhấp đúp file `deploy_khbd.bat`)*

