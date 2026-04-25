# Script para levantar el entorno de desarrollo
# Ejecutar con: powershell -ExecutionPolicy Bypass -File .\start-dev.ps1

Write-Host "🚀 INICIANDO ENTORNO DE DESARROLLO - LO MÁS RICO" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Ejecuta este script desde la raíz del proyecto" -ForegroundColor Red
    exit 1
}

# Función para iniciar un proceso en una nueva ventana
function Start-DevServer {
    param(
        [string]$Name,
        [string]$Command,
        [string]$WorkingDir,
        [int]$Port
    )
    
    Write-Host "🔄 Iniciando $Name en puerto $Port..." -ForegroundColor Yellow
    
    $scriptBlock = "cd '$WorkingDir'; $Command; Read-Host 'Presiona Enter para cerrar'"
    
    Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", $scriptBlock
    
    Start-Sleep -Seconds 2
}

Write-Host "📦 Paso 1: Verificando dependencias..." -ForegroundColor Green
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules no encontrado. Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "🗄️  Paso 2: Configurando Prisma..." -ForegroundColor Green
cd packages\database
powershell -ExecutionPolicy Bypass -Command "npx prisma generate"
npm run build
cd ..\..

Write-Host ""
Write-Host "⚠️  NOTA IMPORTANTE SOBRE LA BASE DE DATOS:" -ForegroundColor Yellow
Write-Host "Docker no está disponible. Tienes dos opciones:" -ForegroundColor Yellow
Write-Host "1. Instalar Docker Desktop y ejecutar: docker-compose up -d en infra/local" -ForegroundColor White
Write-Host "2. Usar una base de datos PostgreSQL remota (Render/Supabase)" -ForegroundColor White
Write-Host ""
Write-Host "Presiona cualquier tecla para continuar (asegúrate de tener una DB configurada)..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

Write-Host ""
Write-Host "🚀 Paso 3: Iniciando servidores..." -ForegroundColor Green
Write-Host ""

# Iniciar API
Start-DevServer -Name "API (Backend)" -Command "npm run dev:api" -WorkingDir $PWD -Port 3001

# Esperar un poco para que la API inicie
Start-Sleep -Seconds 3

# Iniciar POS
Start-DevServer -Name "POS (Punto de Venta)" -Command "npm run dev:pos" -WorkingDir $PWD -Port 3002

# Iniciar Kitchen
Start-DevServer -Name "Kitchen (Cocina)" -Command "npm run dev:kitchen" -WorkingDir $PWD -Port 3003

# Iniciar Owner
Start-DevServer -Name "Owner (Dueño)" -Command "npm run dev:owner" -WorkingDir $PWD -Port 3000

# Iniciar Web
Start-DevServer -Name "Web (Clientes)" -Command "npm run dev:web" -WorkingDir $PWD -Port 3004

Write-Host ""
Write-Host "✅ SERVIDORES INICIADOS" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green
Write-Host ""
Write-Host "📍 URLs de acceso:" -ForegroundColor Cyan
Write-Host "   API:     http://localhost:3001" -ForegroundColor White
Write-Host "   POS:     http://localhost:3002" -ForegroundColor White
Write-Host "   Kitchen: http://localhost:3003" -ForegroundColor White
Write-Host "   Owner:   http://localhost:3000" -ForegroundColor White
Write-Host "   Web:     http://localhost:3004" -ForegroundColor White
Write-Host ""
Write-Host "💡 Cada servidor se abrió en una ventana separada" -ForegroundColor Yellow
Write-Host "💡 Para detener: Cierra cada ventana o presiona Ctrl+C" -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona cualquier tecla para salir de este script..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
