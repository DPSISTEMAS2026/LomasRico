# 🚀 Script de Inicio Rápido para Testing

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  LO MÁS RICO - TESTING SETUP  " -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Configurar política de ejecución para esta sesión
Write-Host "[1/5] Configurando permisos de PowerShell..." -ForegroundColor Yellow
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
Write-Host "✅ Permisos configurados" -ForegroundColor Green
Write-Host ""

# Verificar Node.js
Write-Host "[2/5] Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "✅ Node.js $nodeVersion instalado" -ForegroundColor Green
Write-Host ""

# Verificar npm
Write-Host "[3/5] Verificando npm..." -ForegroundColor Yellow
$npmVersion = npm --version
Write-Host "✅ npm $npmVersion instalado" -ForegroundColor Green
Write-Host ""

# Verificar dependencias
Write-Host "[4/5] Verificando dependencias..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✅ Dependencias ya instaladas" -ForegroundColor Green
}
else {
    Write-Host "⚠️  Instalando dependencias (esto puede tardar unos minutos)..." -ForegroundColor Yellow
    npm install
    Write-Host "✅ Dependencias instaladas" -ForegroundColor Green
}
Write-Host ""

# Verificar Prisma Client
Write-Host "[5/5] Verificando Prisma Client..." -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma\client") {
    Write-Host "✅ Prisma Client generado" -ForegroundColor Green
}
else {
    Write-Host "⚠️  Generando Prisma Client..." -ForegroundColor Yellow
    cd packages/database
    npx prisma generate
    cd ../..
    Write-Host "✅ Prisma Client generado" -ForegroundColor Green
}
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  ✅ SETUP COMPLETADO           " -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 SIGUIENTE PASO:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Abre 4 terminales y ejecuta:" -ForegroundColor White
Write-Host ""
Write-Host "Terminal 1 (API):" -ForegroundColor Cyan
Write-Host "  npm run dev:api" -ForegroundColor White
Write-Host ""
Write-Host "Terminal 2 (Owner Panel):" -ForegroundColor Cyan
Write-Host "  npm run dev:owner" -ForegroundColor White
Write-Host ""
Write-Host "Terminal 3 (Kitchen):" -ForegroundColor Cyan
Write-Host "  npm run dev:kitchen" -ForegroundColor White
Write-Host ""
Write-Host "Terminal 4 (POS - Opcional):" -ForegroundColor Cyan
Write-Host "  npm run dev:pos" -ForegroundColor White
Write-Host ""
Write-Host "📖 Luego sigue la guía:" -ForegroundColor Yellow
Write-Host "  docs\audit\TESTING-GUIDE.md" -ForegroundColor White
Write-Host ""

# Preguntar si quiere abrir la guía
$openGuide = Read-Host "¿Quieres abrir la guía de testing ahora? (s/n)"
if ($openGuide -eq "s" -or $openGuide -eq "S") {
    Start-Process "docs\audit\TESTING-GUIDE.md"
}

Write-Host ""
Write-Host "¡Listo para testing! 🧪" -ForegroundColor Green
