@echo off
echo ========================================
echo    Oto Parca Panel - Local Development
echo ========================================
echo.

echo Checking if .env file exists...
if not exist ".env" (
    echo .env file not found! Creating from .env.example...
    copy ".env.example" ".env"
    echo Please edit .env file with your database credentials and run this script again.
    pause
    exit /b 1
)

echo Starting Backend...
start "Backend" cmd /k "cd backend && npm run start:dev"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo    Services are starting...
echo ========================================
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:3001/api/docs
echo ========================================
echo.
echo Press any key to exit...
pause > nul