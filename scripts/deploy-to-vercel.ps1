# Script PowerShell para desplegar todas las apps en Vercel
# Uso: .\deploy-to-vercel.ps1

Write-Host "🚀 Iniciando despliegue en Vercel..." -ForegroundColor Cyan
Write-Host ""

# Verificar que Vercel CLI esté instalado
if (!(Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Vercel CLI no está instalado" -ForegroundColor Red
    Write-Host "Instalando Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al instalar Vercel CLI" -ForegroundColor Red
        exit 1
    }
}

# Login en Vercel
Write-Host "🔐 Iniciando sesión en Vercel..." -ForegroundColor Yellow
vercel login

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al iniciar sesión en Vercel" -ForegroundColor Red
    exit 1
}

# Lista de apps a desplegar
$apps = @(
    @{Name = "Web App (Cliente)"; Path = "apps/web"; Alias = "lomasrico" },
    @{Name = "Owner Panel"; Path = "apps/owner"; Alias = "owner" },
    @{Name = "POS"; Path = "apps/pos"; Alias = "pos" },
    @{Name = "Kitchen"; Path = "apps/kitchen"; Alias = "kitchen" },
    @{Name = "Admin"; Path = "apps/admin"; Alias = "admin" }
)

$currentDir = Get-Location

foreach ($app in $apps) {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "📦 Desplegando: $($app.Name)" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    
    $appPath = Join-Path $currentDir $app.Path
    
    if (!(Test-Path $appPath)) {
        Write-Host "⚠️  Advertencia: No se encontró $appPath" -ForegroundColor Yellow
        continue
    }
    
    Set-Location $appPath
    
    Write-Host "📍 Directorio: $appPath" -ForegroundColor Cyan
    Write-Host "🚀 Desplegando a producción..." -ForegroundColor Yellow
    
    # Desplegar a producción
    vercel --prod --yes
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $($app.Name) desplegado exitosamente!" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Error al desplegar $($app.Name)" -ForegroundColor Red
        Set-Location $currentDir
        exit 1
    }
    
    Set-Location $currentDir
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ TODAS LAS APPS DESPLEGADAS EXITOSAMENTE" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 URLs de las aplicaciones:" -ForegroundColor Cyan
Write-Host "   • Web App:    https://lomasrico.vercel.app" -ForegroundColor White
Write-Host "   • Owner:      https://owner.vercel.app" -ForegroundColor White
Write-Host "   • POS:        https://pos.vercel.app" -ForegroundColor White
Write-Host "   • Kitchen:    https://kitchen.vercel.app" -ForegroundColor White
Write-Host "   • Admin:      https://admin.vercel.app" -ForegroundColor White
Write-Host ""
Write-Host "📊 Verifica los despliegues en: https://vercel.com/dashboard" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANTE: No olvides configurar las variables de entorno en Vercel Dashboard" -ForegroundColor Yellow
Write-Host ""
