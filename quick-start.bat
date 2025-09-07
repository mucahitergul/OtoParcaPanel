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

echo Backend sunucusu baslatiliyor...
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