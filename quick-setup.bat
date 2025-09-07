@echo off
echo ========================================
echo    OTO PARCA PANEL - HIZLI KURULUM
echo ========================================
echo.

echo [1/6] Backend .env dosyasi olusturuluyor...
cd backend
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
echo.

echo [2/6] Backend dependencies yukleniyor...
call npm install
if %errorlevel% neq 0 (
    echo HATA: Backend dependencies yuklenemedi!
    pause
    exit /b 1
)
echo Backend dependencies basariyla yuklendi!
echo.

echo [3/6] Frontend .env dosyasi olusturuluyor...
cd ..
cd frontend
echo NEXT_PUBLIC_API_URL=http://localhost:3001 > .env.local
echo Frontend .env dosyasi olusturuldu!
echo.

echo [4/6] Frontend dependencies yukleniyor...
call npm install
if %errorlevel% neq 0 (
    echo HATA: Frontend dependencies yuklenemedi!
    pause
    exit /b 1
)
echo Frontend dependencies basariyla yuklendi!
echo.

echo [5/6] Backend sunucusu baslatiliyor...
cd ..
cd backend
start "Backend Server" cmd /k "cd /d %cd% && npm run start:dev"
echo Backend sunucusu baslatildi (http://localhost:3001)
echo.

echo [6/6] Frontend sunucusu baslatiliyor...
cd ..
cd frontend
start "Frontend Server" cmd /k "cd /d %cd% && npm run start:dev"
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