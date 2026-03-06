@echo off
REM P-Stream Desktop App Installation Script (Windows)
REM This script builds and runs the P-Stream Electron desktop application

echo ==========================================
echo   P-Stream Desktop App Installer (Windows)
echo ==========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js is installed
    node --version
) else (
    echo [ERROR] Node.js is not installed.
    echo.
    echo Please install Node.js LTS:
    echo   https://nodejs.org/
    pause
    exit /b 1
)

echo.

REM Install pnpm if not present
where pnpm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] pnpm is installed
) else (
    echo Installing pnpm globally...
    call npm install -g pnpm
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install pnpm.
        pause
        exit /b 1
    )
    echo [OK] pnpm installed
)

echo.
echo Step: Installing dependencies in p-stream-desktop...
echo.

REM Navigate to desktop folder
cd /d "%~dp0\..\p-stream-desktop"

if not exist "package.json" (
    echo [ERROR] p-stream-desktop folder not found!
    pause
    exit /b 1
)

call pnpm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)
echo [OK] Dependencies installed

echo.
echo Step: Building P-Stream Desktop app...
echo.

call pnpm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to build the app.
    pause
    exit /b 1
)
echo [OK] App built successfully!

echo.
echo Step: Launching P-Stream Desktop app...
echo.

call pnpm start

echo.
echo [OK] P-Stream Desktop app closed.
pause
