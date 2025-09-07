@echo off
echo ========================================
echo    OTO PARCA PANEL - QUICK START
echo ========================================
echo.

echo Mevcut sunucular kapatiliyor...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im "npm.exe" >nul 2>&1
echo Mevcut sunucular kapatildi.
echo.

echo .env dosyalari kontrol ediliyor ve olusturuluyor...
echo.

echo Backend .env dosyasi kontrol ediliyor...
cd backend
if not exist .env (
    echo Backend .env dosyasi olusturuluyor...
    echo # Database Configuration (Remote Server) > .env
    echo DB_HOST=otoparca.isletmemdijitalde.com >> .env
    echo DB_PORT=5432 >> .env
    echo DB_USER=oto_user >> .env
    echo DB_PASS=password123 >> .env
    echo DB_NAME=oto_parca_panel >> .env
    echo. >> .env
    echo # JWT Configuration >> .env
    echo JWT_SECRET=your-super-secret-jwt-key-here-change-in-production >> .env
    echo JWT_EXPIRES_IN=24h >> .env
    echo. >> .env
    echo # Application Configuration >> .env
    echo PORT=3001 >> .env
    echo NODE_ENV=development >> .env
    echo. >> .env
    echo # WooCommerce API Configuration (moved to database settings) >> .env
    echo # Configure WooCommerce settings through the admin panel >> .env
    echo Backend .env dosyasi olusturuldu!
) else (
    echo Backend .env dosyasi mevcut.
)
echo.

echo Frontend .env dosyasi kontrol ediliyor...
cd ..
cd frontend
if not exist .env.local (
    echo Frontend .env dosyasi olusturuluyor...
    echo NEXT_PUBLIC_API_URL=http://localhost:3001 > .env.local
    echo Frontend .env dosyasi olusturuldu!
) else (
    echo Frontend .env dosyasi mevcut.
)
echo.

echo Sunucular baslatiliyor...
echo.

echo Backend sunucusu baslatiliyor...
cd ..
start "Backend Server" cmd /k "cd /d %~dp0backend && npm run start:dev"
echo Backend sunucusu baslatildi (http://localhost:3001)
echo.

echo Frontend sunucusu baslatiliyor...
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Frontend sunucusu baslatildi (http://localhost:3000)
echo.

echo ========================================
echo    SUNUCULAR BASLATILDI!
echo ========================================
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:3001
echo.
echo Sunucular ayri terminallerde calisiyor.
echo Bu pencereyi kapatabilirsiniz.
echo.
pause