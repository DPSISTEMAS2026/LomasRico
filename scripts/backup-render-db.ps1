# Script PowerShell para hacer backup de la base de datos de Render
# Uso: .\backup-render-db.ps1

Write-Host "🔄 Iniciando backup de base de datos de Render..." -ForegroundColor Cyan

# Configuración (ACTUALIZAR CON TUS DATOS)
$RENDER_HOST = "dpg-xxxxx.oregon-postgres.render.com"
$RENDER_USER = "lomasrico_user"
$RENDER_DB = "lomasrico"
$BACKUP_DIR = ".\backups"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "$BACKUP_DIR\render_backup_$TIMESTAMP.sql"

# Crear directorio de backups si no existe
if (!(Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
    Write-Host "📁 Directorio de backups creado: $BACKUP_DIR" -ForegroundColor Green
}

Write-Host "📦 Exportando datos..." -ForegroundColor Yellow
Write-Host "Host: $RENDER_HOST"
Write-Host "Database: $RENDER_DB"
Write-Host "Archivo: $BACKUP_FILE"
Write-Host ""

# Verificar que pg_dump esté instalado
if (!(Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: pg_dump no está instalado" -ForegroundColor Red
    Write-Host "Instala PostgreSQL desde: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# Hacer dump de la base de datos
$env:PGPASSWORD = Read-Host "Ingresa la contraseña de la base de datos" -AsSecureString | ConvertFrom-SecureString
pg_dump -h $RENDER_HOST -U $RENDER_USER -d $RENDER_DB -f $BACKUP_FILE

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup completado exitosamente!" -ForegroundColor Green
    Write-Host "📁 Archivo guardado en: $BACKUP_FILE" -ForegroundColor Green
    
    # Mostrar tamaño
    $fileInfo = Get-Item $BACKUP_FILE
    $sizeInMB = [math]::Round($fileInfo.Length / 1MB, 2)
    Write-Host "📊 Tamaño: $sizeInMB MB" -ForegroundColor Cyan
    
    # Comprimir el backup
    Write-Host "🗜️  Comprimiendo archivo..." -ForegroundColor Yellow
    Compress-Archive -Path $BACKUP_FILE -DestinationPath "$BACKUP_FILE.zip" -Force
    Write-Host "✅ Archivo comprimido: $BACKUP_FILE.zip" -ForegroundColor Green
    
    # Eliminar archivo sin comprimir
    Remove-Item $BACKUP_FILE
} else {
    Write-Host "❌ Error al hacer el backup" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Proceso completado" -ForegroundColor Green
Write-Host "📁 Backup guardado en: $BACKUP_FILE.zip" -ForegroundColor Cyan
