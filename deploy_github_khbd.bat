@echo off
setlocal enabledelayedexpansion
title Trien khai Du an Ke Hoach Bai Day len GitHub
cls

echo =========================================================================
echo    TRIEN KHAI HE THONG QUAN LY KE HOACH BAI DAY (KHBD) LEN GITHUB
echo    Truong THCS Tay Phu - To Khoa hoc Tu nhien - Cong nghe
echo =========================================================================
echo.

set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;C:\Program Files\Git\cmd;%PATH%"

where git >nul 2>nul
if errorlevel 1 goto :no_git

cd /d "%~dp0KE HOACH BAI DAY"

REM Kiem tra xem da khoi tao git chua
if not exist ".git" (
    echo [*] Dang khoi tao Git repository cho du an KHBD...
    git init
    echo.
)

REM Kiem tra thong tin nguoi dung git
git config user.name >nul 2>nul
if errorlevel 1 (
    git config user.name "Vo Van Ha"
    git config user.email "vovanha@users.noreply.github.com"
)

REM Kiem tra remote origin
git remote get-url origin >nul 2>nul
if errorlevel 1 goto :nhap_repo

for /f "tokens=*" %%i in ('git remote get-url origin') do set CURRENT_REMOTE=%%i
echo [*] Repository dang lien ket: !CURRENT_REMOTE!
echo.
goto :bat_dau_day

:nhap_repo
echo [BUOC 1] Thầy/Cô chua lien ket voi Repository GitHub nao.
echo.
echo Vui long dan link Repository GitHub cua Thầy/Cô vao day
echo (Vi du: https://github.com/vovanha/khbd-thcs-tayphu.git)
echo Lưu ý: Nên chọn chế độ Private (Riêng tư) khi tạo Repository trên GitHub.
echo.
set /p REPO_URL=">> Duong dan GitHub: "

if "!REPO_URL!"=="" goto :chua_nhap_link

git remote add origin !REPO_URL!
echo.
echo Da them lien ket den: !REPO_URL!
echo.

:bat_dau_day
echo [BUOC 2] Dang dong bo ma nguon sang thu muc khbd...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Copy-Item -Path '.\*' -Destination '..\khbd' -Recurse -Force" >nul 2>nul

echo.
echo [BUOC 3] Dang kiem tra va bao ve du lieu (Loai bo file tai lieu noi bo, .docx, PL3)...
git add .
git commit -m "Cap nhat He thong Quan ly Ke hoach bai day - THCS Tay Phu" >nul 2>nul
echo Da luu phien ban ma nguon an toan.
echo.

echo [BUOC 4] Dang tai ma nguon len nhanh 'main' tren GitHub...
echo (Luu y: Neu trinh duyet yeu cau dang nhap, Thay/Co hay bam Authorize/Sign in)...
echo.

git branch -M main
git push -u origin main

if errorlevel 1 goto :that_bai
goto :thanh_cong

:thanh_cong
echo.
echo =========================================================================
echo  DAY DU AN LEN GITHUB THANH CONG!
echo =========================================================================
echo.
echo  Toan bo file Giao an va tai lieu tren Google Drive van an toan 100%%.
echo  Cac file noi bo (.docx, PL3) da duoc tu dong loai bo khong day len mang.
echo.
echo  Cach bat web truc tuyen (GitHub Pages):
echo  1. Vao repository vua day tren trang web GitHub
echo  2. Vao muc Settings (Banh rang) -^> Chon muc Pages o cot trai
echo  3. Tai muc Build and deployment:
echo     - Source: Chon 'Deploy from a branch'
echo     - Branch: Chon 'main', thu muc '/ (root)', bam Save
echo  4. Sau 1-2 phut, trang web se chay tai dia chi:
echo     https://[ten-tai-khoan].github.io/[ten-repo]/
echo =========================================================================
goto :ket_thuc

:that_bai
echo.
echo =========================================================================
echo  [THONG BAO] Day ma nguon len GitHub chua thanh cong!
echo =========================================================================
echo  Nguyen nhan thuong gap:
echo  1. Nhap chua dung link Repository hoac chua tao Repository tren GitHub.
echo  2. Khi tao Repo tren GitHub da lo tich chon 'Add a README file'.
echo     (Cach sua: Xoa repo cu va tao lai KHONG tich chon Add a README).
echo  3. Trinh duyet can dang nhap xac thuc tai khoan GitHub.
echo =========================================================================
goto :ket_thuc

:chua_nhap_link
echo.
echo [THONG BAO] Thầy/Cô chua nhap duong dan. Vui long chay lai file sau.
goto :ket_thuc

:no_git
echo [LOI] Khong tim thay Git tren may tinh!
goto :ket_thuc

:ket_thuc
echo.
echo Nhan phim bat ky de dong cua so nay...
pause >nul
