#!/bin/bash

# Script para hacer backup de la base de datos de Render
# Uso: ./backup-render-db.sh

echo "🔄 Iniciando backup de base de datos de Render..."

# Configuración (ACTUALIZAR CON TUS DATOS)
RENDER_HOST="dpg-xxxxx.oregon-postgres.render.com"
RENDER_USER="lomasrico_user"
RENDER_DB="lomasrico"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/render_backup_$TIMESTAMP.sql"

# Crear directorio de backups si no existe
mkdir -p $BACKUP_DIR

echo "📦 Exportando datos..."
echo "Host: $RENDER_HOST"
echo "Database: $RENDER_DB"
echo "Archivo: $BACKUP_FILE"

# Hacer dump de la base de datos
pg_dump -h $RENDER_HOST -U $RENDER_USER -d $RENDER_DB > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ Backup completado exitosamente!"
    echo "📁 Archivo guardado en: $BACKUP_FILE"
    
    # Comprimir el backup
    gzip $BACKUP_FILE
    echo "🗜️  Archivo comprimido: ${BACKUP_FILE}.gz"
    
    # Mostrar tamaño
    ls -lh ${BACKUP_FILE}.gz
else
    echo "❌ Error al hacer el backup"
    exit 1
fi

echo ""
echo "✅ Proceso completado"
