@echo off
echo 🚀 Starting AI Customer Support System...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed. Please install Python 3.8+ first.
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo [INFO] Starting backend server...
cd backend

REM Check if virtual environment exists
if not exist "venv" (
    echo [INFO] Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo [INFO] Installing backend dependencies...
pip install -r requirements.txt

REM Start backend
echo [INFO] Starting FastAPI server...
start "Backend Server" cmd /k "python -m uvicorn app:socket_app --reload --host 0.0.0.0 --port 8000"

cd ..

REM Wait for backend to start
timeout /t 5 /nobreak >nul

echo [INFO] Starting admin frontend...
cd frontend\admin

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo [INFO] Installing admin frontend dependencies...
    npm install
)

REM Start admin frontend
echo [INFO] Starting admin React app...
start "Admin Frontend" cmd /k "npm start"

cd ..\..

timeout /t 3 /nobreak >nul

echo [INFO] Starting customer frontend...
cd frontend\customer

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo [INFO] Installing customer frontend dependencies...
    npm install
)

REM Start customer frontend
echo [INFO] Starting customer React app...
start "Customer Frontend" cmd /k "set PORT=3001 && npm start"

cd ..\..

echo.
echo 🎉 All services started successfully!
echo.
echo Access URLs:
echo - Admin Interface: http://localhost:3000
echo - Customer Interface: http://localhost:3001
echo - API Documentation: http://localhost:8000/docs
echo.
echo Press any key to close this window...
pause >nul 