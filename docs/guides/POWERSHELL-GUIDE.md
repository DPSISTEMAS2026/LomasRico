# 🔧 Cómo Ejecutar los Scripts de PowerShell

## ⚠️ Problema: Ejecución de Scripts Deshabilitada

Si al intentar ejecutar un script de PowerShell recibes este error:

```
No se puede cargar el archivo porque la ejecución de scripts está deshabilitada en este sistema.
```

Es porque Windows tiene una política de seguridad que bloquea la ejecución de scripts.

---

## ✅ Solución: Habilitar Ejecución de Scripts

### Opción 1: Habilitar Temporalmente (Recomendado)

Abre PowerShell como **Administrador** y ejecuta:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Esto permitirá ejecutar scripts locales sin firma digital.

### Opción 2: Ejecutar un Script Específico Sin Cambiar la Política

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\pre-migration-check.ps1
```

### Opción 3: Desbloquear el Archivo Específico

```powershell
Unblock-File -Path .\scripts\pre-migration-check.ps1
```

Luego ejecutar normalmente:

```powershell
.\scripts\pre-migration-check.ps1
```

---

## 📋 Scripts Disponibles

### 1. Verificación Pre-Migración

**Propósito**: Verificar que todo esté listo antes de migrar

**Ejecutar**:
```powershell
# Opción A: Si habilitaste la ejecución de scripts
.\scripts\pre-migration-check.ps1

# Opción B: Sin cambiar la política
PowerShell -ExecutionPolicy Bypass -File .\scripts\pre-migration-check.ps1
```

**Qué hace**:
- ✅ Verifica que Node.js, npm, Git estén instalados
- ✅ Verifica que PostgreSQL tools (pg_dump, psql) estén instalados
- ✅ Verifica la estructura del proyecto
- ✅ Verifica que los archivos de configuración existan
- ✅ Verifica acceso a Render y Supabase

---

### 2. Backup de Base de Datos

**Propósito**: Hacer backup de la base de datos actual de Render

**IMPORTANTE**: Antes de ejecutar, edita el archivo y actualiza estas variables:

```powershell
# Abrir el archivo para editar
notepad .\scripts\backup-render-db.ps1

# Actualizar estas líneas con tus datos reales:
$RENDER_HOST = "dpg-xxxxx.oregon-postgres.render.com"  # Tu host de Render
$RENDER_USER = "lomasrico_user"                         # Tu usuario
$RENDER_DB = "lomasrico"                                # Tu base de datos
```

**Ejecutar**:
```powershell
# Opción A: Si habilitaste la ejecución de scripts
.\scripts\backup-render-db.ps1

# Opción B: Sin cambiar la política
PowerShell -ExecutionPolicy Bypass -File .\scripts\backup-render-db.ps1
```

**Qué hace**:
- 💾 Exporta toda la base de datos de Render
- 🗜️ Comprime el archivo en .zip
- 📁 Guarda en `./backups/render_backup_[fecha].sql.zip`

---

### 3. Restaurar en Supabase

**Propósito**: Importar el backup a Supabase

**IMPORTANTE**: Antes de ejecutar, edita el archivo y actualiza estas variables:

```powershell
# Abrir el archivo para editar
notepad .\scripts\restore-to-supabase.ps1

# Actualizar estas líneas con tus datos reales:
$SUPABASE_HOST = "db.xnwbrdnorjafwwyfhysx.supabase.co"
$SUPABASE_PORT = "5432"
$SUPABASE_DB = "postgres"
$SUPABASE_USER = "postgres"
```

**Ejecutar**:
```powershell
# Opción A: Si habilitaste la ejecución de scripts
.\scripts\restore-to-supabase.ps1 .\backups\render_backup_20260204.sql

# Opción B: Sin cambiar la política
PowerShell -ExecutionPolicy Bypass -File .\scripts\restore-to-supabase.ps1 -BackupFile .\backups\render_backup_20260204.sql
```

**Qué hace**:
- 📥 Importa el backup a Supabase
- ⚠️ Pregunta confirmación antes de sobrescribir datos
- ✅ Verifica que la importación sea exitosa

---

### 4. Desplegar en Vercel

**Propósito**: Desplegar todas las apps en Vercel automáticamente

**Ejecutar**:
```powershell
# Opción A: Si habilitaste la ejecución de scripts
.\scripts\deploy-to-vercel.ps1

# Opción B: Sin cambiar la política
PowerShell -ExecutionPolicy Bypass -File .\scripts\deploy-to-vercel.ps1
```

**Qué hace**:
- 🔐 Inicia sesión en Vercel (si no estás logueado)
- 🚀 Despliega Web App
- 🚀 Despliega Owner Panel
- 🚀 Despliega POS
- 🚀 Despliega Kitchen
- 🚀 Despliega Admin
- 📊 Muestra las URLs finales

---

## 🔒 Seguridad

### ¿Es Seguro Cambiar la Política de Ejecución?

**Sí**, siempre y cuando uses `RemoteSigned`:

- ✅ **RemoteSigned**: Permite ejecutar scripts locales, pero requiere firma digital para scripts descargados de internet
- ❌ **Unrestricted**: Permite ejecutar cualquier script (NO RECOMENDADO)
- ❌ **Bypass**: Omite todas las restricciones (solo usar temporalmente)

### Restaurar la Política Original

Si quieres volver a la configuración original:

```powershell
Set-ExecutionPolicy -ExecutionPolicy Restricted -Scope CurrentUser
```

---

## 🆘 Troubleshooting

### Error: "pg_dump no se reconoce como comando"

**Solución**: Instalar PostgreSQL

1. Descargar desde: https://www.postgresql.org/download/windows/
2. Durante la instalación, asegurarse de marcar "Command Line Tools"
3. Agregar a PATH: `C:\Program Files\PostgreSQL\16\bin`
4. Reiniciar PowerShell

### Error: "vercel no se reconoce como comando"

**Solución**: Instalar Vercel CLI

```powershell
npm install -g vercel
```

### Error: "Access denied" al conectar a la base de datos

**Solución**: Verificar credenciales

1. Ir a Render Dashboard → Database → Connection Info
2. Copiar el host, usuario y contraseña correctos
3. Actualizar el script con los valores correctos

---

## 📝 Notas Importantes

### Antes de Ejecutar Cualquier Script

1. **Leer el script** para entender qué hace
2. **Actualizar las variables** con tus datos reales
3. **Hacer backup** antes de modificar datos
4. **Probar en un entorno de prueba** si es posible

### Orden Recomendado de Ejecución

```
1. pre-migration-check.ps1      (Verificar que todo esté listo)
2. backup-render-db.ps1         (Hacer backup de DB)
3. restore-to-supabase.ps1      (Restaurar en Supabase)
4. deploy-to-vercel.ps1         (Desplegar frontends)
```

---

## 🎯 Alternativa: Ejecutar Manualmente

Si prefieres no usar scripts, puedes ejecutar los comandos manualmente:

### Backup Manual

```powershell
# Crear directorio
mkdir backups

# Hacer backup
pg_dump -h dpg-xxxxx.oregon-postgres.render.com -U lomasrico_user -d lomasrico > backups/backup.sql
```

### Restore Manual

```powershell
# Restaurar
psql -h db.xnwbrdnorjafwwyfhysx.supabase.co -p 5432 -U postgres -d postgres < backups/backup.sql
```

### Deploy Manual en Vercel

```powershell
# Instalar CLI
npm install -g vercel

# Login
vercel login

# Desplegar cada app
cd apps/web
vercel --prod

cd ../owner
vercel --prod

cd ../pos
vercel --prod

cd ../kitchen
vercel --prod

cd ../admin
vercel --prod
```

---

**Última actualización**: 4 de febrero de 2026
