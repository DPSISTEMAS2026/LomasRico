# Script simplificado para levantar servidores
$root = Resolve-Path "$PSScriptRoot\..\.."
Set-Location $root
# Ejecutar con: powershell -ExecutionPolicy Bypass -File .\quick-start.ps1

Write-Host "🚀 INICIANDO SERVIDORES - LO MÁS RICO" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  IMPORTANTE: Asegúrate de tener una base de datos PostgreSQL configurada" -ForegroundColor Yellow
Write-Host "   DATABASE_URL en .env debe apuntar a una DB válida" -ForegroundColor Yellow
Write-Host ""

# Ir a packages/database y generar Prisma
Write-Host "📦 Generando Prisma Client..." -ForegroundColor Green
Set-Location packages\database
npx prisma generate | Out-Null
npm run build | Out-Null
Set-Location ..\..

Write-Host "✅ Prisma listo" -ForegroundColor Green
Write-Host ""

# Función para iniciar servidor en nueva ventana
function Start-Server {
    param([string]$Name, [string]$Command, [int]$Port)
    Write-Host "🔄 Iniciando $Name en puerto $Port..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "cd '$PWD'; $Command"
    Start-Sleep -Seconds 2
}

# Iniciar servidores
Start-Server -Name "API" -Command "npm run dev:api" -Port 3001
Start-Sleep -Seconds 5  # Esperar a que la API inicie

Start-Server -Name "POS" -Command "npm run dev:pos" -Port 3002
Start-Server -Name "Kitchen" -Command "npm run dev:kitchen" -Port 3003
Start-Server -Name "Owner" -Command "npm run dev:owner" -Port 3000
Start-Server -Name "Web" -Command "npm run dev:web" -Port 3004

Write-Host ""
Write-Host "✅ SERVIDORES INICIADOS EN VENTANAS SEPARADAS" -ForegroundColor Green
Write-Host ""
Write-Host "📍 URLs:" -ForegroundColor Cyan
Write-Host "   API:     http://localhost:3001" -ForegroundColor White
Write-Host "   POS:     http://localhost:3002" -ForegroundColor White
Write-Host "   Kitchen: http://localhost:3003" -ForegroundColor White
Write-Host "   Owner:   http://localhost:3000" -ForegroundColor White
Write-Host "   Web:     http://localhost:3004" -ForegroundColor White
Write-Host ""
Write-Host "💡 Cierra las ventanas individuales para detener cada servidor" -ForegroundColor Yellow
Write-Host ""
