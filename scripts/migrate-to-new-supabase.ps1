# ============================================================
# 🚀 MIGRAR BASE DE DATOS SUPABASE → OTRO PERFIL/PROYECTO
# ============================================================
# Uso: .\migrate-to-new-supabase.ps1
#
# Este script hace:
#   1. Backup (pg_dump) de la base de datos ORIGEN
#   2. Restauración (psql) en la base de datos DESTINO
# ============================================================

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "   🚀 MIGRACIÓN DE BASE DE DATOS SUPABASE" -ForegroundColor Cyan
Write-Host "   Lo Más Rico - Mover a nuevo perfil" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# CONFIGURACIÓN - ORIGEN (tu proyecto actual)
# ============================================================
$SOURCE_PROJECT_REF = "xnwbrdnorjafwwyfhysx"
$SOURCE_HOST = "db.$SOURCE_PROJECT_REF.supabase.co"
$SOURCE_PORT = "5432"
$SOURCE_DB = "postgres"
$SOURCE_USER = "postgres"

# ============================================================
# CONFIGURACIÓN - DESTINO (nuevo proyecto en otro perfil)
# ============================================================
Write-Host "📋 PASO 1: Configurar el proyecto DESTINO" -ForegroundColor Yellow
Write-Host ""
Write-Host "Necesitas el Project Ref del nuevo proyecto de Supabase." -ForegroundColor White
Write-Host "Lo encuentras en: Dashboard → Settings → General → Reference ID" -ForegroundColor Gray
Write-Host ""
$DEST_PROJECT_REF = Read-Host "Ingresa el Project Ref del DESTINO (ej: abcdefghijklmnop)"

if ([string]::IsNullOrWhiteSpace($DEST_PROJECT_REF)) {
    Write-Host "❌ Project Ref no puede estar vacío" -ForegroundColor Red
    exit 1
}

$DEST_HOST = "db.$DEST_PROJECT_REF.supabase.co"
$DEST_PORT = "5432"
$DEST_DB = "postgres"
$DEST_USER = "postgres"

# ============================================================
# VERIFICACIONES PREVIAS
# ============================================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host "   🔍 VERIFICACIONES PREVIAS" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host ""

# Verificar pg_dump
if (!(Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    Write-Host "❌ pg_dump no encontrado. Instala PostgreSQL:" -ForegroundColor Red
    Write-Host "   https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    Write-Host "   (Solo necesitas las 'Command Line Tools')" -ForegroundColor Gray
    exit 1
}
Write-Host "✅ pg_dump encontrado" -ForegroundColor Green

# Verificar psql
if (!(Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "❌ psql no encontrado. Instala PostgreSQL:" -ForegroundColor Red
    Write-Host "   https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    exit 1
}
Write-Host "✅ psql encontrado" -ForegroundColor Green

# ============================================================
# RESUMEN
# ============================================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "   📋 RESUMEN DE MIGRACIÓN" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""
Write-Host "  ORIGEN:  $SOURCE_HOST" -ForegroundColor White
Write-Host "           https://supabase.com/dashboard/project/$SOURCE_PROJECT_REF" -ForegroundColor Gray
Write-Host ""
Write-Host "  DESTINO: $DEST_HOST" -ForegroundColor White
Write-Host "           https://supabase.com/dashboard/project/$DEST_PROJECT_REF" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Red
Write-Host "  - Esto exportará TODA la estructura y datos del origen" -ForegroundColor Yellow
Write-Host "  - El proyecto destino debe estar VACÍO (recién creado)" -ForegroundColor Yellow
Write-Host "  - Las políticas RLS y funciones se migrarán también" -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "¿Continuar con la migración? (y/n)"
if ($confirmation -ne 'y') {
    Write-Host "❌ Migración cancelada" -ForegroundColor Red
    exit 0
}

# ============================================================
# PASO 2: BACKUP DEL ORIGEN
# ============================================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "   📦 PASO 2: Exportando base de datos ORIGEN" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Crear directorio de backups
$BACKUP_DIR = ".\backups"
if (!(Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$SCHEMA_FILE = "$BACKUP_DIR\migration_schema_$TIMESTAMP.sql"
$DATA_FILE = "$BACKUP_DIR\migration_data_$TIMESTAMP.sql"
$FULL_FILE = "$BACKUP_DIR\migration_full_$TIMESTAMP.sql"

Write-Host "🔑 Ingresa la contraseña del proyecto ORIGEN ($SOURCE_PROJECT_REF)" -ForegroundColor Yellow
Write-Host "   (La encuentras en: Dashboard → Settings → Database → Database password)" -ForegroundColor Gray
$SOURCE_PASSWORD = Read-Host "Contraseña ORIGEN"

$env:PGPASSWORD = $SOURCE_PASSWORD

# Exportar esquema (estructura + funciones + triggers + RLS)
Write-Host ""
Write-Host "📐 Exportando esquema (estructura, funciones, triggers)..." -ForegroundColor Yellow
pg_dump -h $SOURCE_HOST -p $SOURCE_PORT -U $SOURCE_USER -d $SOURCE_DB `
    --schema-only `
    --no-owner `
    --no-privileges `
    --no-comments `
    -N "_analytics" `
    -N "supabase_migrations" `
    -N "supabase_functions" `
    -N "extensions" `
    -N "graphql" `
    -N "graphql_public" `
    -N "realtime" `
    -N "storage" `
    -N "vault" `
    -N "pgsodium" `
    -N "pgsodium_masks" `
    -N "pgbouncer" `
    -N "auth" `
    -f $SCHEMA_FILE 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al exportar el esquema" -ForegroundColor Red
    exit 1
}
$schemaSize = [math]::Round((Get-Item $SCHEMA_FILE).Length / 1KB, 1)
Write-Host "✅ Esquema exportado ($schemaSize KB)" -ForegroundColor Green

# Exportar datos
Write-Host ""
Write-Host "📊 Exportando datos..." -ForegroundColor Yellow
pg_dump -h $SOURCE_HOST -p $SOURCE_PORT -U $SOURCE_USER -d $SOURCE_DB `
    --data-only `
    --no-owner `
    --no-privileges `
    --inserts `
    -N "_analytics" `
    -N "supabase_migrations" `
    -N "supabase_functions" `
    -N "extensions" `
    -N "graphql" `
    -N "graphql_public" `
    -N "realtime" `
    -N "storage" `
    -N "vault" `
    -N "pgsodium" `
    -N "pgsodium_masks" `
    -N "pgbouncer" `
    -N "auth" `
    -f $DATA_FILE 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al exportar los datos" -ForegroundColor Red
    exit 1
}
$dataSize = [math]::Round((Get-Item $DATA_FILE).Length / 1KB, 1)
Write-Host "✅ Datos exportados ($dataSize KB)" -ForegroundColor Green

# Exportar backup completo (para respaldo)
Write-Host ""
Write-Host "💾 Creando backup completo de respaldo..." -ForegroundColor Yellow
pg_dump -h $SOURCE_HOST -p $SOURCE_PORT -U $SOURCE_USER -d $SOURCE_DB `
    --no-owner `
    --no-privileges `
    -N "_analytics" `
    -N "supabase_migrations" `
    -N "supabase_functions" `
    -N "extensions" `
    -N "graphql" `
    -N "graphql_public" `
    -N "realtime" `
    -N "storage" `
    -N "vault" `
    -N "pgsodium" `
    -N "pgsodium_masks" `
    -N "pgbouncer" `
    -N "auth" `
    -f $FULL_FILE 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Warning: Backup completo falló, continuando..." -ForegroundColor Yellow
} else {
    $fullSize = [math]::Round((Get-Item $FULL_FILE).Length / 1KB, 1)
    Write-Host "✅ Backup completo guardado ($fullSize KB)" -ForegroundColor Green
}

# ============================================================
# PASO 3: RESTAURAR EN DESTINO
# ============================================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "   📥 PASO 3: Restaurando en proyecto DESTINO" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔑 Ingresa la contraseña del proyecto DESTINO ($DEST_PROJECT_REF)" -ForegroundColor Yellow
Write-Host "   (La configuraste al crear el proyecto en Supabase)" -ForegroundColor Gray
$DEST_PASSWORD = Read-Host "Contraseña DESTINO"

$env:PGPASSWORD = $DEST_PASSWORD

# Aplicar esquema
Write-Host ""
Write-Host "📐 Aplicando esquema en destino..." -ForegroundColor Yellow
psql -h $DEST_HOST -p $DEST_PORT -U $DEST_USER -d $DEST_DB -f $SCHEMA_FILE 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Hubo warnings al aplicar esquema (puede ser normal por objetos pre-existentes de Supabase)" -ForegroundColor Yellow
} else {
    Write-Host "✅ Esquema aplicado" -ForegroundColor Green
}

# Aplicar datos
Write-Host ""
Write-Host "📊 Importando datos en destino..." -ForegroundColor Yellow
psql -h $DEST_HOST -p $DEST_PORT -U $DEST_USER -d $DEST_DB -f $DATA_FILE 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Hubo warnings al importar datos" -ForegroundColor Yellow
} else {
    Write-Host "✅ Datos importados" -ForegroundColor Green
}

# Limpiar variable de entorno
$env:PGPASSWORD = ""

# ============================================================
# PASO 4: POST-MIGRACIÓN
# ============================================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "   ✅ MIGRACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Archivos generados:" -ForegroundColor Cyan
Write-Host "   Esquema: $SCHEMA_FILE" -ForegroundColor White
Write-Host "   Datos:   $DATA_FILE" -ForegroundColor White
Write-Host "   Full:    $FULL_FILE" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "   📋 PASOS PENDIENTES (MANUAL)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 🔍 Verificar datos en el nuevo dashboard:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/$DEST_PROJECT_REF/editor" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. 📝 Actualizar el archivo .env con las nuevas credenciales:" -ForegroundColor White
Write-Host "   DATABASE_URL=postgresql://postgres.$($DEST_PROJECT_REF):[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true" -ForegroundColor Gray
Write-Host "   NEXT_PUBLIC_SUPABASE_URL=https://$($DEST_PROJECT_REF).supabase.co" -ForegroundColor Gray
Write-Host "   NEXT_PUBLIC_SUPABASE_ANON_KEY=[NUEVA_ANON_KEY]" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 🗄️  Migrar Storage (imágenes):" -ForegroundColor White
Write-Host "   - Descargar archivos de: Dashboard ORIGEN → Storage" -ForegroundColor Gray
Write-Host "   - Subir archivos a:      Dashboard DESTINO → Storage" -ForegroundColor Gray
Write-Host ""
Write-Host "4. 🔐 Recrear usuarios de Auth:" -ForegroundColor White
Write-Host "   - Los usuarios de auth.users NO se migran automáticamente" -ForegroundColor Gray
Write-Host "   - Tendrás que recrearlos o exportar/importar manualmente" -ForegroundColor Gray
Write-Host ""
Write-Host "5. 🔄 Actualizar la configuración del MCP de Supabase:" -ForegroundColor White
Write-Host "   Archivo: C:\Users\ddiaz\.gemini\antigravity\mcp_config.json" -ForegroundColor Gray
Write-Host "   Cambiar --project-ref a: $DEST_PROJECT_REF" -ForegroundColor Gray
Write-Host "   Cambiar SUPABASE_ACCESS_TOKEN al token del nuevo perfil" -ForegroundColor Gray
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
