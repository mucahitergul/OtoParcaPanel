@echo off
echo ========================================
echo    OTO PARCA PANEL - HIZLI KURULUM
echo ========================================
echo.

echo [1/5] Backend dependencies yukleniyor...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo HATA: Backend dependencies yuklenemedi!
    pause
    exit /b 1
)
echo Backend dependencies basariyla yuklendi!
echo.

echo [2/5] Frontend dependencies yukleniyor...
cd ..
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo HATA: Frontend dependencies yuklenemedi!
    pause
    exit /b 1
)
echo Frontend dependencies basariyla yuklendi!
echo.

echo [3/4] Backend sunucusu baslatiliyor...
cd ..
cd backend
start "Backend Server" cmd /k "cd /d %cd% && npm run start:dev"
echo Backend sunucusu baslatildi (http://localhost:3001)
echo.

echo [4/4] Frontend sunucusu baslatiliyor...
cd ..
cd frontend
start "Frontend Server" cmd /k "cd /d %cd% && npm run dev"
echo Frontend sunucusu baslatildi (http://localhost:3000)
echo.

echo ========================================
echo           KURULUM TAMAMLANDI!
echo ========================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Admin giris bilgileri:
echo Email: admin@admin.com
echo Sifre: admin123
echo.
echo Bu pencereyi kapatabilirsiniz.
echo Sunucular ayri pencerelerde calismaya devam edecek.
echo.
pause