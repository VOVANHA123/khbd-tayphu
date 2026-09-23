@echo off
title Xuat Ban He Thong Quan Ly Ke Hoach Bai Day
cls
echo =========================================================================
echo    XUAT BAN HE THONG QUAN LY KE HOACH BAI DAY LEN INTERNET
echo    Truong THCS Tay Phu - To Khoa hoc Tu nhien - Cong nghe
echo =========================================================================
echo.
echo [1/2] Dang dong bo ma nguon sang thu muc 'khbd'...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Copy-Item -Path '..\KE HOACH BAI DAY\*' -Destination '..\khbd' -Recurse -Force"

echo.
echo [2/2] Dang tai len Google Firebase Hosting...
cd /d "%~dp0\.."
call npx -y firebase-tools deploy --only hosting

if %ERRORLEVEL% equ 0 (
    echo.
    echo =========================================================================
    echo  XUAT BAN THANH CONG LEN INTERNET!
    echo.
    echo  Dia chi web chinh thuc danh cho Giao vien:
    echo  https://thidua-lop-9a4-79dca.web.app/khbd
    echo  https://thidua-lop-9a4-79dca.firebaseapp.com/khbd
    echo.
    echo  Giao vien co the truy cap bang dien thoai hoac may tinh!
    echo =========================================================================
) else (
    echo.
    echo [THONG BAO] Neu Firebase yeu cau dang nhap, vui long chay:
    echo   call npx -y firebase-tools login
    echo Sau do chay lai file nay de xuat ban!
)
echo.
pause
