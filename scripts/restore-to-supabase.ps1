# Script PowerShell para restaurar backup en Supabase
# Uso: .\restore-to-supabase.ps1 backup_file.sql

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

Write-Host "🔄 Iniciando restauración en Supabase..." -ForegroundColor Cyan

# Verificar que el archivo existe
if (!(Test-Path $BackupFile)) {
    Write-Host "❌ Error: El archivo $BackupFile no existe" -ForegroundColor Red
    exit 1
}

# Configuración de Supabase (ACTUALIZAR CON TUS DATOS)
$SUPABASE_HOST = "db.xnwbrdnorjafwwyfhysx.supabase.co"
$SUPABASE_PORT = "5432"
$SUPABASE_DB = "postgres"
$SUPABASE_USER = "postgres"

Write-Host "📦 Restaurando desde: $BackupFile" -ForegroundColor Yellow
Write-Host "🎯 Destino: $SUPABASE_HOST" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  ADVERTENCIA: Esto sobrescribirá los datos existentes en Supabase" -ForegroundColor Red

$confirmation = Read-Host "¿Continuar? (y/n)"
if ($confirmation -ne 'y') {
    Write-Host "❌ Operación cancelada" -ForegroundColor Red
    exit 1
}

# Si el archivo está comprimido, descomprimirlo
if ($BackupFile -like "*.zip") {
    Write-Host "🗜️  Descomprimiendo archivo..." -ForegroundColor Yellow
    $extractPath = [System.IO.Path]::GetDirectoryName($BackupFile)
    Expand-Archive -Path $BackupFile -DestinationPath $extractPath -Force
    $BackupFile = $BackupFile -replace '\.zip$', ''
}

# Verificar que psql esté instalado
if (!(Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: psql no está instalado" -ForegroundColor Red
    Write-Host "Instala PostgreSQL desde: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host "📥 Importando datos..." -ForegroundColor Yellow
$env:PGPASSWORD = Read-Host "Ingresa la contraseña de Supabase" -AsSecureString | ConvertFrom-SecureString
psql -h $SUPABASE_HOST -p $SUPABASE_PORT -U $SUPABASE_USER -d $SUPABASE_DB -f $BackupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Restauración completada exitosamente!" -ForegroundColor Green
} else {
    Write-Host "❌ Error al restaurar el backup" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Proceso completado" -ForegroundColor Green
Write-Host "🔍 Verifica los datos en: https://supabase.com/dashboard/project/xnwbrdnorjafwwyfhysx" -ForegroundColor Cyan
