@echo off
echo ========================================
echo    Checking System Requirements
echo ========================================
echo.

echo [1] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is NOT installed
    echo    Please install Python 3.8+ from: https://www.python.org/downloads/
) else (
    python --version
    echo ✅ Python is installed
)
echo.

echo [2] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is NOT installed
    echo    Please install Node.js 16+ from: https://nodejs.org/
) else (
    node --version
    echo ✅ Node.js is installed
)
echo.

echo [3] Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is NOT installed
    echo    Please install npm (comes with Node.js)
) else (
    npm --version
    echo ✅ npm is installed
)
echo.

echo [4] Checking MongoDB...
echo    Checking if MongoDB is running on port 27017...
netstat -an | findstr :27017 >nul 2>&1
if errorlevel 1 (
    echo ❌ MongoDB is NOT running
    echo    Please start MongoDB or run:
    echo    docker run -d -p 27017:27017 --name mongodb mongo:6.0
) else (
    echo ✅ MongoDB is running on port 27017
)
echo.

echo [5] Checking required ports...
echo    Checking port 8000 (Backend)...
netstat -an | findstr :8000 >nul 2>&1
if errorlevel 1 (
    echo ✅ Port 8000 is available
) else (
    echo ❌ Port 8000 is already in use
)

echo    Checking port 3000 (Admin Frontend)...
netstat -an | findstr :3000 >nul 2>&1
if errorlevel 1 (
    echo ✅ Port 3000 is available
) else (
    echo ❌ Port 3000 is already in use
)

echo    Checking port 3001 (Customer Frontend)...
netstat -an | findstr :3001 >nul 2>&1
if errorlevel 1 (
    echo ✅ Port 3001 is available
) else (
    echo ❌ Port 3001 is already in use
)
echo.

echo ========================================
echo    Summary
echo ========================================
echo.
echo If all checks show ✅, you can run: .\run.bat
echo If any check shows ❌, please install/start the required component first.
echo.
pause 