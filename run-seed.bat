@echo off
echo ========================================
echo    OTO PARCA PANEL - DATABASE SEEDER
echo ========================================
echo.

echo [INFO] Starting database seeding process...
echo.

REM Change to backend directory
cd /d "%~dp0\backend"

REM Check if .env file exists
if not exist ".env" (
    echo [ERROR] .env file not found!
    echo [ERROR] Please make sure .env file exists in backend directory.
    pause
    exit /b 1
)

echo [INFO] .env file found, starting seed process...
echo.

REM Check node_modules
if not exist "node_modules" (
    echo [WARNING] node_modules not found, running npm install...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed!
        pause
        exit /b 1
    )
)

REM Run seed command
echo [INFO] Running seed command...
call npm run seed

if errorlevel 1 (
    echo.
    echo [ERROR] Seed process failed!
    echo [ERROR] Please check database connection settings.
    pause
    exit /b 1
) else (
    echo.
    echo [SUCCESS] Seed process completed successfully!
    echo [SUCCESS] Database populated with demo data.
)

echo.
echo Process completed.
pause