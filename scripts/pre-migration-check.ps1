# Script PowerShell para verificar que todo esté listo para la migración
# Uso: .\pre-migration-check.ps1

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "   🔍 VERIFICACIÓN PRE-MIGRACIÓN - LO MÁS RICO" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$allChecks = @()
$passedChecks = 0
$totalChecks = 0

function Test-Check {
    param(
        [string]$Name,
        [scriptblock]$Test,
        [string]$SuccessMessage,
        [string]$FailureMessage,
        [string]$HelpUrl = ""
    )
    
    $script:totalChecks++
    Write-Host "Verificando: $Name..." -NoNewline
    
    try {
        $result = & $Test
        if ($result) {
            Write-Host " ✅" -ForegroundColor Green
            Write-Host "  → $SuccessMessage" -ForegroundColor Gray
            $script:passedChecks++
            return $true
        }
        else {
            Write-Host " ❌" -ForegroundColor Red
            Write-Host "  → $FailureMessage" -ForegroundColor Yellow
            if ($HelpUrl) {
                Write-Host "  → Ayuda: $HelpUrl" -ForegroundColor Cyan
            }
            return $false
        }
    }
    catch {
        Write-Host " ❌" -ForegroundColor Red
        Write-Host "  → Error: $($_.Exception.Message)" -ForegroundColor Yellow
        if ($HelpUrl) {
            Write-Host "  → Ayuda: $HelpUrl" -ForegroundColor Cyan
        }
        return $false
    }
}

Write-Host "1️⃣  VERIFICANDO HERRAMIENTAS INSTALADAS" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host ""

# Node.js
Test-Check -Name "Node.js" -Test {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if ($node) {
        $version = node --version
        return $version -match "v\d+\.\d+\.\d+"
    }
    return $false
} -SuccessMessage "Node.js instalado: $(node --version)" `
    -FailureMessage "Node.js no está instalado" `
    -HelpUrl "https://nodejs.org/download"

# npm
Test-Check -Name "npm" -Test {
    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if ($npm) {
        $version = npm --version
        return $version -match "\d+\.\d+\.\d+"
    }
    return $false
} -SuccessMessage "npm instalado: $(npm --version)" `
    -FailureMessage "npm no está instalado" `
    -HelpUrl "https://nodejs.org/download"

# Git
Test-Check -Name "Git" -Test {
    $git = Get-Command git -ErrorAction SilentlyContinue
    if ($git) {
        $version = git --version
        return $version -match "git version"
    }
    return $false
} -SuccessMessage "Git instalado: $(git --version)" `
    -FailureMessage "Git no está instalado" `
    -HelpUrl "https://git-scm.com/download/win"

# PostgreSQL (pg_dump y psql)
Test-Check -Name "PostgreSQL Tools (pg_dump)" -Test {
    $pgdump = Get-Command pg_dump -ErrorAction SilentlyContinue
    return $null -ne $pgdump
} -SuccessMessage "pg_dump disponible (necesario para backup)" `
    -FailureMessage "pg_dump no está instalado (necesario para backup de DB)" `
    -HelpUrl "https://www.postgresql.org/download/windows/"

Test-Check -Name "PostgreSQL Tools (psql)" -Test {
    $psql = Get-Command psql -ErrorAction SilentlyContinue
    return $null -ne $psql
} -SuccessMessage "psql disponible (necesario para restore)" `
    -FailureMessage "psql no está instalado (necesario para restore de DB)" `
    -HelpUrl "https://www.postgresql.org/download/windows/"

Write-Host ""
Write-Host "2️⃣  VERIFICANDO ESTRUCTURA DEL PROYECTO" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host ""

# Apps
$apps = @("web", "owner", "pos", "kitchen", "admin", "api")
foreach ($app in $apps) {
    Test-Check -Name "App: $app" -Test {
        return Test-Path "apps\$app"
    } -SuccessMessage "Directorio apps\$app existe" `
        -FailureMessage "Directorio apps\$app no encontrado"
}

# Package.json
Test-Check -Name "package.json raíz" -Test {
    return Test-Path "package.json"
} -SuccessMessage "package.json encontrado" `
    -FailureMessage "package.json no encontrado en la raíz"

# node_modules
Test-Check -Name "Dependencias instaladas" -Test {
    return Test-Path "node_modules"
} -SuccessMessage "node_modules existe (dependencias instaladas)" `
    -FailureMessage "node_modules no existe (ejecutar: npm install)"

Write-Host ""
Write-Host "3️⃣  VERIFICANDO ARCHIVOS DE CONFIGURACIÓN" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host ""

# Archivos de migración
$configFiles = @(
    "vercel.json",
    ".vercelignore",
    "DEPLOYMENT-GUIDE.md",
    "ENV_VARIABLES.md",
    "MIGRATION-CHECKLIST.md",
    "START-HERE.md",
    "ARCHITECTURE.md"
)

foreach ($file in $configFiles) {
    Test-Check -Name "Archivo: $file" -Test {
        return Test-Path $file
    } -SuccessMessage "$file existe" `
        -FailureMessage "$file no encontrado"
}

Write-Host ""
Write-Host "4️⃣  VERIFICANDO ACCESO A SERVICIOS" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host ""

# Render API
Test-Check -Name "Render API (Backend actual)" -Test {
    try {
        $response = Invoke-WebRequest -Uri "https://pro-lomasrico-api.onrender.com/health" -TimeoutSec 10 -ErrorAction SilentlyContinue
        return $response.StatusCode -eq 200
    }
    catch {
        return $false
    }
} -SuccessMessage "Backend en Render está respondiendo" `
    -FailureMessage "Backend en Render no responde (puede estar en sleep)" `
    -HelpUrl "https://dashboard.render.com"

# Supabase
Test-Check -Name "Supabase Storage" -Test {
    try {
        $response = Invoke-WebRequest -Uri "https://xnwbrdnorjafwwyfhysx.supabase.co/storage/v1/bucket/assets" -TimeoutSec 10 -ErrorAction SilentlyContinue
        return $response.StatusCode -eq 200 -or $response.StatusCode -eq 404
    }
    catch {
        return $false
    }
} -SuccessMessage "Supabase Storage está accesible" `
    -FailureMessage "Supabase Storage no responde" `
    -HelpUrl "https://supabase.com/dashboard/project/xnwbrdnorjafwwyfhysx"

Write-Host ""
Write-Host "5️⃣  VERIFICANDO CREDENCIALES" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host ""

Write-Host "⚠️  Verificación manual requerida:" -ForegroundColor Yellow
Write-Host ""

$credentials = @(
    @{Name = "Google Maps API Key"; Required = $true },
    @{Name = "MercadoPago Access Token"; Required = $true },
    @{Name = "PedidosYa Token"; Required = $true },
    @{Name = "Supabase Database Password"; Required = $true },
    @{Name = "Google OAuth Client ID"; Required = $false }
)

foreach ($cred in $credentials) {
    $required = if ($cred.Required) { "(REQUERIDO)" } else { "(OPCIONAL)" }
    $hasIt = Read-Host "  ¿Tienes $($cred.Name)? $required (y/n)"
    if ($hasIt -eq 'y') {
        Write-Host "    ✅ $($cred.Name)" -ForegroundColor Green
    }
    else {
        if ($cred.Required) {
            Write-Host "    ❌ $($cred.Name) - FALTA" -ForegroundColor Red
        }
        else {
            Write-Host "    ⚠️  $($cred.Name) - Opcional" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "   📊 RESUMEN DE VERIFICACIÓN" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$percentage = [math]::Round(($passedChecks / $totalChecks) * 100, 0)

Write-Host "Verificaciones automáticas: $passedChecks/$totalChecks ($percentage%)" -ForegroundColor Cyan

if ($percentage -eq 100) {
    Write-Host ""
    Write-Host "🎉 ¡EXCELENTE! Todo está listo para la migración" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos pasos:" -ForegroundColor Cyan
    Write-Host "  1. Leer DEPLOYMENT-GUIDE.md" -ForegroundColor White
    Write-Host "  2. Obtener las credenciales faltantes (ver ENV_VARIABLES.md)" -ForegroundColor White
    Write-Host "  3. Hacer backup de la DB: .\scripts\backup-render-db.ps1" -ForegroundColor White
    Write-Host "  4. Seguir MIGRATION-CHECKLIST.md" -ForegroundColor White
}
elseif ($percentage -ge 80) {
    Write-Host ""
    Write-Host "⚠️  CASI LISTO - Algunos items requieren atención" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Revisa los items marcados con ❌ arriba" -ForegroundColor Yellow
}
else {
    Write-Host ""
    Write-Host "❌ NO LISTO - Varios items requieren atención" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, resuelve los items marcados con ❌ antes de continuar" -ForegroundColor Red
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
