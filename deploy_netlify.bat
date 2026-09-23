@echo off
title Xuat Ban KHBD len Netlify (khbd-tayphu.netlify.app)
cls
echo =========================================================================
echo    XUAT BAN HE THONG QUAN LY KE HOACH BAI DAY LEN NETLIFY
echo    Dia chi web: https://khbd-tayphu.netlify.app/
echo =========================================================================
echo.
echo [1/3] Dang dong bo ma nguon moi nhat sang thu muc 'khbd'...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Copy-Item -Path '..\KE HOACH BAI DAY\*' -Destination '..\khbd' -Recurse -Force"
echo [OK] Dong bo thanh cong!
echo.
echo [2/3] Chon phuong thuc cap nhat len Netlify:
echo.
echo    [1] Keo tha cuc nhanh (Khuyen nghi):
echo        - Tu dong mo thu muc 'khbd' va trang Netlify Deploys
echo        - Thay chi can keo thu muc 'khbd' vao o Dropzone tren Netlify (5 giay la xong)
echo.
echo    [2] Chay Netlify CLI tu dong:
echo        - Dung cong cu Netlify CLI de day truc tiep
echo.
set /p choice="Thay chon [1] hoac [2] (Mac dinh 1): "

if "%choice%"=="2" (
    echo.
    echo [3/3] Dang ket noi Netlify CLI...
    cd /d "%~dp0\..\khbd"
    call npx -y netlify-cli deploy --prod --dir="."
) else (
    echo.
    echo [3/3] Dang mo trang quan ly Netlify va thu muc 'khbd'...
    start https://app.netlify.com/sites/khbd-tayphu/deploys
    explorer "%~dp0\..\khbd"
    echo.
    echo =========================================================================
    echo HUONG DAN:
    echo 1. Tren trinh duyet (trang Netlify Deploys vua mo), cuon xuong o:
    echo    "Need to update your site? Drag and drop your site output folder here"
    echo 2. Keo ca thu muc 'khbd' (vua duoc mo trong Windows Explorer) tha vao o do.
    echo 3. Cho khoang 5 giay, trang web https://khbd-tayphu.netlify.app se cap nhat ngay!
    echo =========================================================================
)

echo.
pause
