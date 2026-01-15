@echo off
REM Sentinel RFP - Docker Environment Initialization Script (Windows)
REM This script starts all Docker services and ensures they're healthy

echo ========================================
echo   Sentinel RFP - Docker Environment
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
  echo Error: Docker is not running
  echo Please start Docker Desktop and try again.
  exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
  echo Warning: .env file not found
  echo Copying .env.example to .env...
  copy .env.example .env >nul
  echo .env file created successfully
  echo.
  echo Please update .env with your actual credentials before proceeding.
  pause
)

echo Starting Docker services...
echo.

REM Start services in detached mode
docker-compose up -d

echo.
echo Waiting for services to be healthy...
echo.

REM Wait for PostgreSQL (timeout after 60s)
echo Waiting for PostgreSQL...
timeout /t 5 /nobreak >nul
docker-compose exec -T postgres pg_isready -U sentinel_user -d sentinel_rfp >nul 2>&1
if errorlevel 1 (
  echo PostgreSQL is taking longer than expected. Check logs with: docker-compose logs postgres
) else (
  echo PostgreSQL: OK
)

REM Wait for Redis
timeout /t 2 /nobreak >nul
docker-compose exec -T redis redis-cli ping >nul 2>&1
if errorlevel 1 (
  echo Redis: Check logs with: docker-compose logs redis
) else (
  echo Redis: OK
)

REM Wait for Meilisearch
timeout /t 2 /nobreak >nul
curl -s http://localhost:7700/health >nul 2>&1
if errorlevel 1 (
  echo Meilisearch: Check logs with: docker-compose logs meilisearch
) else (
  echo Meilisearch: OK
)

echo.
echo ========================================
echo   Services started!
echo ========================================
echo.
echo Service URLs:
echo   - PostgreSQL:   localhost:5432
echo   - Redis:        localhost:6379
echo   - Meilisearch:  http://localhost:7700
echo.
echo Useful commands:
echo   - View logs:     docker-compose logs -f
echo   - Stop services: docker-compose down
echo   - Restart:       docker-compose restart
echo.
echo Ready for development!
echo.
pause
