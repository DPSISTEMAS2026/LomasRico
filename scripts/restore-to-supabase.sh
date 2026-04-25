#!/bin/bash

# Script para restaurar backup en Supabase
# Uso: ./restore-to-supabase.sh backup_file.sql

echo "🔄 Iniciando restauración en Supabase..."

# Verificar que se pasó un archivo
if [ -z "$1" ]; then
    echo "❌ Error: Debes especificar el archivo de backup"
    echo "Uso: ./restore-to-supabase.sh backup_file.sql"
    exit 1
fi

BACKUP_FILE=$1

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: El archivo $BACKUP_FILE no existe"
    exit 1
fi

# Configuración de Supabase (ACTUALIZAR CON TUS DATOS)
SUPABASE_HOST="db.xnwbrdnorjafwwyfhysx.supabase.co"
SUPABASE_PORT="5432"
SUPABASE_DB="postgres"
SUPABASE_USER="postgres"

echo "📦 Restaurando desde: $BACKUP_FILE"
echo "🎯 Destino: $SUPABASE_HOST"
echo ""
echo "⚠️  ADVERTENCIA: Esto sobrescribirá los datos existentes en Supabase"
read -p "¿Continuar? (y/n): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operación cancelada"
    exit 1
fi

# Si el archivo está comprimido, descomprimirlo
if [[ $BACKUP_FILE == *.gz ]]; then
    echo "🗜️  Descomprimiendo archivo..."
    gunzip -k $BACKUP_FILE
    BACKUP_FILE="${BACKUP_FILE%.gz}"
fi

echo "📥 Importando datos..."
psql -h $SUPABASE_HOST -p $SUPABASE_PORT -U $SUPABASE_USER -d $SUPABASE_DB < $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ Restauración completada exitosamente!"
else
    echo "❌ Error al restaurar el backup"
    exit 1
fi

echo ""
echo "✅ Proceso completado"
echo "🔍 Verifica los datos en: https://supabase.com/dashboard/project/xnwbrdnorjafwwyfhysx"
