@echo off
REM P-Stream Web Installation Script (Windows)
REM This script sets up and runs the P-Stream web application via Docker

echo ==========================================
echo   P-Stream Web Installer (Windows)
echo ==========================================
echo.

REM Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    goto :check_docker
)

echo [INFO] Docker not found. Installing Docker Desktop...
echo.
echo Please download and install Docker Desktop:
echo   https://www.docker.com/products/docker-desktop/
echo.
echo After installation, make sure Docker Desktop is running.
echo.
pause
exit /b 1

:check_docker
echo [OK] Docker is installed

REM Check if Docker is running
docker info >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    goto :docker_ok
)

echo [INFO] Docker is not running. Starting Docker Desktop...
start "" "Docker Desktop"
echo Waiting for Docker to start...
timeout /t 15 /nobreak >nul

docker info >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to start Docker Desktop.
    echo Please start Docker Desktop manually and try again.
    pause
    exit /b 1
)

:docker_ok
echo [OK] Docker is running
echo.

REM Check Docker Compose
docker compose version >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Docker Compose is available
    goto :build
)

docker-compose --version >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Docker Compose is available
    goto :build
)

echo [ERROR] Docker Compose is not available.
pause
exit /b 1

:build
echo.
echo Step: Building and starting P-Stream services...
echo.

REM Navigate to project directory
cd /d "%~dp0\.."

REM Run Docker Compose
docker compose up --build -d
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to start P-Stream.
    pause
    exit /b 1
)

echo.
echo Waiting for services to start...
timeout /t 8 /nobreak >nul

echo.
echo ==========================================
echo   P-Stream is Ready!
echo ==========================================
echo.
echo Web App:        http://localhost
echo Backend API:    http://localhost:3001
echo Proxy:          http://localhost:3000
echo Database:       localhost:5432
echo.
echo To stop: docker compose down
echo To view logs: docker compose logs -f
echo.
echo [OK] Enjoy P-Stream!
pause
