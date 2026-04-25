@echo off
cd /d "%~dp0..\.."
echo ========================================
echo SETUP Y START - LO MAS RICO V3
echo ========================================
echo.

echo [1/5] Verificando Docker...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker Desktop no esta corriendo!
    echo Por favor inicia Docker Desktop y ejecuta este script nuevamente.
    pause
    exit /b 1
)
echo ✓ Docker esta corriendo

echo.
echo [2/5] Iniciando PostgreSQL con Docker...
docker-compose -f infra/local/docker-compose.yml up -d postgres
timeout /t 5 /nobreak >nul
echo ✓ PostgreSQL iniciado

echo.
echo [3/5] Generando Prisma Client...
cd packages\database
call npx prisma generate
if %errorlevel% neq 0 (
    echo ERROR: Fallo al generar Prisma Client
    pause
    exit /b 1
)
echo ✓ Prisma Client generado

echo.
echo [4/5] Compilando package database...
call npm run build
cd ..\..
echo ✓ Database compilado

echo.
echo [5/5] Iniciando servidores...
echo.
echo Abriendo servidores en ventanas separadas...
echo - API en puerto 3001
echo - POS en puerto 3002
echo - Kitchen en puerto 3003
echo - Owner en puerto 3000
echo.

start "API Server" cmd /k "npm run dev:api"
timeout /t 3 /nobreak >nul

start "POS Server" cmd /k "npm run dev:pos"
timeout /t 2 /nobreak >nul

start "Kitchen Server" cmd /k "npm run dev:kitchen"
timeout /t 2 /nobreak >nul

start "Owner Server" cmd /k "npm run dev:owner"

echo.
echo ========================================
echo ✓ TODOS LOS SERVIDORES INICIADOS!
echo ========================================
echo.
echo URLs de acceso:
echo - API:     http://localhost:3001
echo - POS:     http://localhost:3002
echo - Kitchen: http://localhost:3003
echo - Owner:   http://localhost:3000
echo.
echo Para detener los servidores, cierra cada ventana CMD.
echo.
pause
