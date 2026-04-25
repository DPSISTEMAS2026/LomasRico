@echo off
cd /d "%~dp0..\.."
echo ========================================
echo   INICIANDO SERVIDORES - LO MAS RICO
echo ========================================
echo.

echo Generando Prisma Client...
cd packages\database
call npx prisma generate
call npm run build
cd ..\..
echo.

echo Iniciando servidores en ventanas separadas...
echo.

start "API - Puerto 3001" cmd /k "npm run dev:api"
ping localhost -n 6 > nul

start "POS - Puerto 3002" cmd /k "npm run dev:pos"
ping localhost -n 3 > nul

start "Kitchen - Puerto 3003" cmd /k "npm run dev:kitchen"
ping localhost -n 3 > nul

start "Owner - Puerto 3000" cmd /k "npm run dev:owner"

echo.
echo ========================================
echo   SERVIDORES INICIADOS
echo ========================================
echo.
echo URLs:
echo   API:     http://localhost:3001
echo   POS:     http://localhost:3002
echo   Kitchen: http://localhost:3003
echo   Owner:   http://localhost:3000
echo.
